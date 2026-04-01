"""
Capa de acceso a Supabase.
Usa service role key para bypasear RLS (este servicio corre server-side, nunca en browser).
"""
import logging
from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Optional

from supabase import Client, create_client

from config import Config

logger = logging.getLogger(__name__)


@dataclass
class Recordatorio:
    id: str
    tipo_recordatorio: str           # "30_dias" | "7_dias" | "vencimiento"
    paciente_id: str
    nombres: str
    apellidos: str
    telefono: str                    # columna: pacientes.telefono
    tratamiento_nombre: str
    fecha_vencimiento: Optional[str] # ISO date string o None si es permanente


def _build_client(cfg: Config) -> Client:
    return create_client(cfg.supabase_url, cfg.supabase_service_role_key)


def get_pending_recordatorios(cfg: Config) -> list[Recordatorio]:
    """
    Trae recordatorios pendientes cuya fecha_programada ya llegó.

    Join:
      recordatorios_log
        → pacientes          (via paciente_id)
        → seguimientos_renovacion (via seguimiento_id)
            → tratamientos_catalogo (via tratamiento_id)
    """
    client = _build_client(cfg)
    today = date.today().isoformat()

    try:
        result = (
            client.table("recordatorios_log")
            .select(
                "id, tipo, fecha_programada, paciente_id, "
                "pacientes!paciente_id(nombres, apellidos, telefono), "
                "seguimientos_renovacion!seguimiento_id("
                "  fecha_vencimiento, "
                "  tratamientos_catalogo!tratamiento_id(nombre)"
                ")"
            )
            .eq("estado", "pendiente")
            .lte("fecha_programada", today)
            .order("fecha_programada", desc=False)
            .limit(cfg.max_messages_per_run)
            .execute()
        )
    except Exception as exc:
        logger.error("Error consultando recordatorios: %s", exc)
        raise

    recordatorios: list[Recordatorio] = []
    for row in result.data or []:
        try:
            seg  = row["seguimientos_renovacion"]
            pac  = row["pacientes"]
            trat = seg["tratamientos_catalogo"]

            telefono = (pac.get("telefono") or "").strip()
            if not telefono:
                logger.warning("Recordatorio %s sin teléfono — omitido", row["id"])
                continue

            recordatorios.append(Recordatorio(
                id=row["id"],
                tipo_recordatorio=row["tipo"],
                paciente_id=row["paciente_id"],
                nombres=(pac.get("nombres") or "").strip(),
                apellidos=(pac.get("apellidos") or "").strip(),
                telefono=telefono,
                tratamiento_nombre=(trat.get("nombre") or "").strip(),
                fecha_vencimiento=seg.get("fecha_vencimiento"),
            ))
        except (KeyError, TypeError) as exc:
            logger.error("Error parseando fila %s: %s", row.get("id"), exc)
            continue

    logger.info("Recordatorios pendientes encontrados: %d", len(recordatorios))
    return recordatorios


def mark_enviado(cfg: Config, recordatorio_id: str) -> None:
    client = _build_client(cfg)
    now_iso = datetime.now(timezone.utc).isoformat()
    client.table("recordatorios_log").update(
        {"estado": "enviado", "fecha_enviada": now_iso}
    ).eq("id", recordatorio_id).execute()


def mark_fallido(cfg: Config, recordatorio_id: str, error: str) -> None:
    client = _build_client(cfg)
    client.table("recordatorios_log").update(
        {"estado": "fallido", "error_msg": error[:500]}
    ).eq("id", recordatorio_id).execute()
