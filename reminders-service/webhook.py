"""
Webhook bot para Chatwoot.

Escucha eventos de mensajes entrantes y responde automáticamente cuando
un paciente hace clic en el botón Quick Reply del template de recordatorio.

Flujo:
  1. Chatwoot envía webhook → POST /webhook/chatwoot
  2. Bot detecta mensaje "Quiero agendar mi cita" (botón QR del template)
  3. Responde con mensaje amigable + link directo al WhatsApp de la clínica
  4. Opcionalmente asigna la conversación a un agente humano

Seguridad:
  - Valida que el evento sea message_created e incoming
  - Ignora mensajes propios (outgoing) para evitar loops
  - Rate limit básico por conversación (1 respuesta por conv)
"""
import logging
import os
import urllib.parse
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# Número oficial de la clínica para agendar citas
CLINICA_WA_NUMBER = os.getenv("CLINICA_WA_NUMBER", "51961847489")

# Textos que disparan la respuesta automática del bot
TRIGGER_TEXTS = {
    "quiero agendar mi cita",
    "¡agendemos! 📅",
    "agendemos",
}

# Conversaciones ya respondidas (en memoria — se resetea con cada deploy)
_responded_conversations: set[int] = set()


def _build_wa_link(nombre: Optional[str] = None) -> str:
    """Construye el link de WhatsApp de la clínica con mensaje pre-armado."""
    texto = "¡Hola! Vi el recordatorio de mi tratamiento y me gustaría agendar mi próxima cita"
    if nombre:
        texto = f"¡Hola! Soy {nombre}, vi el recordatorio de mi tratamiento y me gustaría agendar mi próxima cita"
    return f"https://api.whatsapp.com/send?phone={CLINICA_WA_NUMBER}&text={urllib.parse.quote(texto)}"


def _send_reply(
    base_url: str,
    account_id: int,
    api_token: str,
    conversation_id: int,
    message: str,
) -> bool:
    """Envía un mensaje de respuesta en la conversación de Chatwoot."""
    url = f"{base_url}/api/v1/accounts/{account_id}/conversations/{conversation_id}/messages"
    try:
        resp = httpx.post(
            url,
            headers={
                "api_access_token": api_token,
                "Content-Type": "application/json",
            },
            json={
                "content": message,
                "message_type": "outgoing",
                "private": False,
            },
            timeout=15.0,
        )
        resp.raise_for_status()
        logger.info("Bot respondió en conv=%d", conversation_id)
        return True
    except Exception as exc:
        logger.error("Error enviando respuesta en conv=%d: %s", conversation_id, exc)
        return False


def handle_webhook(payload: dict) -> dict:
    """
    Procesa un evento webhook de Chatwoot.
    Retorna {"status": "ok"|"ignored"|"error", "reason": "..."}.
    """
    event = payload.get("event")

    # Solo nos interesa message_created
    if event != "message_created":
        return {"status": "ignored", "reason": f"event={event}"}

    message_type = payload.get("message_type")
    # Solo mensajes entrantes (incoming = 0), ignorar outgoing (1) y activity (2)
    if message_type != "incoming":
        return {"status": "ignored", "reason": f"message_type={message_type}"}

    content = (payload.get("content") or "").strip().lower()
    conversation = payload.get("conversation", {})
    conv_id = conversation.get("id")
    account_id = payload.get("account", {}).get("id")
    inbox = payload.get("inbox", {})

    if not conv_id or not account_id:
        return {"status": "ignored", "reason": "missing conv_id or account_id"}

    # Verificar si el mensaje coincide con algún trigger
    is_trigger = any(trigger in content for trigger in TRIGGER_TEXTS)

    if not is_trigger:
        return {"status": "ignored", "reason": "no trigger match"}

    # Evitar responder dos veces a la misma conversación
    if conv_id in _responded_conversations:
        return {"status": "ignored", "reason": "already responded"}

    # Extraer nombre del contacto
    sender = payload.get("sender", {})
    contact_name = sender.get("name") or sender.get("available_name")

    # Construir respuesta
    wa_link = _build_wa_link(contact_name)

    nombre_display = contact_name.split()[0] if contact_name else ""
    saludo = f"¡Hola {nombre_display}!" if nombre_display else "¡Hola!"

    reply = (
        f"{saludo} 😊\n\n"
        f"Para agendar tu cita, escríbenos directamente aquí 👇\n\n"
        f"{wa_link}"
    )

    # Enviar respuesta
    base_url = os.getenv("CHATWOOT_BASE_URL", "https://chats.alef.company")
    api_token = os.getenv("CHATWOOT_API_TOKEN", "")

    success = _send_reply(base_url, account_id, api_token, conv_id, reply)

    if success:
        _responded_conversations.add(conv_id)
        return {"status": "ok", "conversation_id": conv_id}

    return {"status": "error", "reason": "failed to send reply"}
