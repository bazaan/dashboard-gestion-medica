"""
Orquestador principal: trae recordatorios pendientes, envía y actualiza estado.

Diseño de resiliencia:
  - Cada envío es independiente: si uno falla, los demás siguen
  - Estado actualizado inmediatamente después de cada intento
  - Si el proceso muere entre send y mark_enviado, el recordatorio queda
    "pendiente" y se reintentará al día siguiente (riesgo de duplicado bajo,
    asumible para un cron diario de una clínica pequeña)
  - Estadísticas al final para monitoreo
"""
import logging
import time

from config import Config
import db
import chatwoot
import templates

logger = logging.getLogger(__name__)


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

    logger.info("Iniciando envío de %d recordatorio(s)...", len(recordatorios))

    for rec in recordatorios:
        nombre_display = f"{rec.nombres} {rec.apellidos}".strip() or "Paciente"

        # Construir mensaje según tipo de recordatorio
        message = templates.get_message(
            cfg=cfg,
            tipo_recordatorio=rec.tipo_recordatorio,
            nombre=rec.nombres or nombre_display,
            tratamiento=rec.tratamiento_nombre,
            fecha_vencimiento=rec.fecha_vencimiento,
        )

        try:
            chatwoot.send_reminder(
                cfg=cfg,
                paciente_id=rec.paciente_id,
                nombres=rec.nombres,
                apellidos=rec.apellidos,
                celular_raw=rec.telefono,
                message=message,
                dry_run=cfg.dry_run,
            )

            if not cfg.dry_run:
                db.mark_enviado(cfg, rec.id)

            stats["enviados"] += 1

        except ValueError as exc:
            # Error de validación (ej. teléfono inválido) — no tiene sentido reintentar
            logger.warning(
                "Recordatorio %s omitido — datos inválidos: %s", rec.id, exc
            )
            if not cfg.dry_run:
                db.mark_fallido(cfg, rec.id, str(exc))
            stats["omitidos"] += 1

        except Exception as exc:
            # Error de red, API, etc. — marcar fallido para revisión manual
            logger.error(
                "Error enviando recordatorio %s: %s", rec.id, exc, exc_info=True
            )
            if not cfg.dry_run:
                db.mark_fallido(cfg, rec.id, str(exc))
            stats["fallidos"] += 1

        # Pausa entre envíos para respetar rate limits de Meta (80 msg/s permitidos,
        # pero con delay somos buenos vecinos y evitamos bloqueos de Chatwoot)
        if cfg.delay_between_sends > 0:
            time.sleep(cfg.delay_between_sends)

    logger.info(
        "Ciclo completado — enviados: %d | fallidos: %d | omitidos: %d | total: %d",
        stats["enviados"], stats["fallidos"], stats["omitidos"], stats["total"],
    )
    return stats
