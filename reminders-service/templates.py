"""
Plantillas de mensajes WhatsApp para el sistema de recordatorios.

IMPORTANTE: Estos textos deben ser idénticos a los aprobados en Meta Business Manager
y a los que se muestran en el dashboard (/plantillas).

Variables:
  {{nombre}}      → Nombre del paciente
  {{tratamiento}} → Nombre del tratamiento
  {{fecha}}       → Fecha de vencimiento formateada

Si se modifica un texto, hay que:
  1. Actualizar este archivo
  2. Actualizar el dashboard (src/app/(dashboard)/plantillas/page.tsx)
  3. Re-someter la plantilla a Meta Business Manager y esperar re-aprobación
"""
from datetime import date
from typing import Optional

from config import Config

# Botón Quick Reply — debe coincidir con el registrado en Meta Business Manager
BOTON_QR = {"type": "QUICK_REPLY", "text": "¡Agendemos! 📅"}


def _format_fecha(fecha_iso: Optional[str]) -> str:
    if not fecha_iso:
        return "próximamente"
    try:
        d = date.fromisoformat(str(fecha_iso)[:10])
        meses = [
            "", "enero", "febrero", "marzo", "abril", "mayo", "junio",
            "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
        ]
        return f"{d.day} de {meses[d.month]} de {d.year}"
    except (ValueError, IndexError):
        return str(fecha_iso)[:10]


# ─── 30 DÍAS ──────────────────────────────────────────────────────────────────
def build_template_30d(
    cfg: Config,
    nombre: str,
    tratamiento: str,
    fecha_vencimiento: Optional[str],
) -> dict:
    fecha = _format_fecha(fecha_vencimiento)
    content = (
        f"Hola {nombre} 😊\n\n"
        f"En la Clínica Dra. Dennisse Arroyo nos encanta acompañarte en cada etapa "
        f"de tu tratamiento.\n\n"
        f"En 30 días será el momento ideal para tu próxima sesión de {tratamiento}. "
        f"Agendarlo con anticipación te asegura el horario que más te acomoda.\n\n"
        f"¿Cuándo te viene bien? Con gusto te reservamos 🌟\n\n"
        f"Responde STOP para dejar de recibir recordatorios."
    )
    return {
        "content": content,
        "template_name": cfg.wa_template_30d,
        "template_language": cfg.wa_template_30d_language,
        "params": {"nombre": nombre, "tratamiento": tratamiento, "fecha": fecha},
        "boton": BOTON_QR,
    }


# ─── 7 DÍAS ───────────────────────────────────────────────────────────────────
def build_template_7d(
    cfg: Config,
    nombre: str,
    tratamiento: str,
    fecha_vencimiento: Optional[str],
) -> dict:
    fecha = _format_fecha(fecha_vencimiento)
    content = (
        f"Hola {nombre} 💫\n\n"
        f"Es el momento perfecto para agendar tu próxima sesión de {tratamiento} "
        f"en la Clínica Dra. Dennisse Arroyo.\n\n"
        f"Quedan pocos días para aprovechar la disponibilidad que tenemos esta semana. "
        f"¿Te agendamos?\n\n"
        f"Escríbenos y con gusto te atendemos 🌟\n\n"
        f"Responde STOP para dejar de recibir recordatorios."
    )
    return {
        "content": content,
        "template_name": cfg.wa_template_7d,
        "template_language": cfg.wa_template_7d_language,
        "params": {"nombre": nombre, "tratamiento": tratamiento, "fecha": fecha},
        "boton": BOTON_QR,
    }


# ─── VENCIMIENTO ──────────────────────────────────────────────────────────────
def build_template_vencimiento(
    cfg: Config,
    nombre: str,
    tratamiento: str,
    fecha_vencimiento: Optional[str],
) -> dict:
    fecha = _format_fecha(fecha_vencimiento)
    content = (
        f"Hola {nombre} ✨\n\n"
        f"¡Hoy es tu día! En la Clínica Dra. Dennisse Arroyo te recordamos que es "
        f"el momento de tu sesión de {tratamiento}.\n\n"
        f"Agenda ahora y sigue invirtiendo en ti. Mereces seguir viéndote y "
        f"sintiéndote increíble.\n\n"
        f"Escríbenos y te atendemos hoy mismo 💛\n\n"
        f"Responde STOP para dejar de recibir recordatorios."
    )
    return {
        "content": content,
        "template_name": cfg.wa_template_vencimiento,
        "template_language": cfg.wa_template_vencimiento_language,
        "params": {"nombre": nombre, "tratamiento": tratamiento, "fecha": fecha},
        "boton": BOTON_QR,
    }


# ─── Router ───────────────────────────────────────────────────────────────────
_BUILDERS = {
    "30_dias":     build_template_30d,
    "7_dias":      build_template_7d,
    "vencimiento": build_template_vencimiento,
}


def get_message(
    cfg: Config,
    tipo_recordatorio: str,
    nombre: str,
    tratamiento: str,
    fecha_vencimiento: Optional[str],
) -> dict:
    builder = _BUILDERS.get(tipo_recordatorio, build_template_vencimiento)
    return builder(cfg, nombre, tratamiento, fecha_vencimiento)
