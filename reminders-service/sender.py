"""
Orquestador principal: trae recordatorios pendientes, envía y actualiza estado.

Diseño de resiliencia:
  - Cada envío es independiente: si uno falla, los demás siguen
  - Estado actualizado inmediatamente después de cada intento
  - Si el proceso muere entre send y mark_enviado, el recordatorio queda
    "pendiente" y se reintentará al día siguiente (riesgo de duplicado bajo,
    asumible para un cron diario de una clínica pequeña)
  - Estadísticas al final para monitoreo

Agrupación:
  - Recordatorios del mismo paciente + mismo tipo + misma fecha se agrupan
    en un solo mensaje de WhatsApp (ej: "Neauvia hidrodeluxe y Rejuran")
  - Evita que un paciente reciba múltiples mensajes idénticos el mismo día
"""
import logging
import time
from collections import defaultdict

from config import Config
import db
import chatwoot
import templates

logger = logging.getLogger(__name__)


def _group_recordatorios(recordatorios: list[db.Recordatorio]) -> list[tuple[list[db.Recordatorio], str]]:
    """
    Agrupa recordatorios por (paciente_id, tipo, fecha_vencimiento).
    Retorna lista de (recordatorios_del_grupo, tratamientos_combinados).
    """
    groups: dict[tuple, list[db.Recordatorio]] = defaultdict(list)
    for rec in recordatorios:
        key = (rec.paciente_id, rec.tipo_recordatorio, rec.fecha_vencimiento)
        groups[key].append(rec)

    result = []
    for recs in groups.values():
        nombres_tratamiento = list(dict.fromkeys(r.tratamiento_nombre for r in recs))
        if len(nombres_tratamiento) == 1:
            combinado = nombres_tratamiento[0]
        elif len(nombres_tratamiento) == 2:
            combinado = f"{nombres_tratamiento[0]} y {nombres_tratamiento[1]}"
        else:
            combinado = ", ".join(nombres_tratamiento[:-1]) + f" y {nombres_tratamiento[-1]}"
        result.append((recs, combinado))

    return result


def run_batch(cfg: Config) -> dict:
    """
    Ejecuta un ciclo completo de envío de recordatorios.
    Retorna stats: {"total": n, "enviados": n, "fallidos": n, "omitidos": n}
    """
    stats = {"total": 0, "enviados": 0, "fallidos": 0, "omitidos": 0}

    recordatorios = db.get_pending_recordatorios(cfg)
    stats["total"] = len(recordatorios)

    if not recordatorios:
        logger.info("Sin recordatorios pendientes para hoy.")
        return stats

    grouped = _group_recordatorios(recordatorios)
    logger.info(
        "Iniciando envío: %d recordatorio(s) agrupados en %d mensaje(s)...",
        len(recordatorios), len(grouped),
    )

    for recs, tratamiento_combinado in grouped:
        rep = recs[0]  # representante del grupo
        nombre_display = f"{rep.nombres} {rep.apellidos}".strip() or "Paciente"

        message = templates.get_message(
            cfg=cfg,
            tipo_recordatorio=rep.tipo_recordatorio,
            nombre=rep.nombres or nombre_display,
            tratamiento=tratamiento_combinado,
            fecha_vencimiento=rep.fecha_vencimiento,
        )

        try:
            chatwoot.send_reminder(
                cfg=cfg,
                paciente_id=rep.paciente_id,
                nombres=rep.nombres,
                apellidos=rep.apellidos,
                celular_raw=rep.telefono,
                message=message,
                dry_run=cfg.dry_run,
            )

            if not cfg.dry_run:
                for r in recs:
                    db.mark_enviado(cfg, r.id)

            stats["enviados"] += len(recs)

        except ValueError as exc:
            logger.warning(
                "Recordatorio(s) %s omitido(s) — datos inválidos: %s",
                [r.id for r in recs], exc,
            )
            if not cfg.dry_run:
                for r in recs:
                    db.mark_fallido(cfg, r.id, str(exc))
            stats["omitidos"] += len(recs)

        except Exception as exc:
            logger.error(
                "Error enviando recordatorio(s) %s: %s",
                [r.id for r in recs], exc, exc_info=True,
            )
            if not cfg.dry_run:
                for r in recs:
                    db.mark_fallido(cfg, r.id, str(exc))
            stats["fallidos"] += len(recs)

        if cfg.delay_between_sends > 0:
            time.sleep(cfg.delay_between_sends)

    logger.info(
        "Ciclo completado — enviados: %d | fallidos: %d | omitidos: %d | total: %d | mensajes: %d",
        stats["enviados"], stats["fallidos"], stats["omitidos"], stats["total"], len(grouped),
    )
    return stats
