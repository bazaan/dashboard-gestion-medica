"""
Cliente HTTP para la API de Chatwoot.

Flujo por paciente:
  1. Normalizar número de teléfono a E.164 (+51XXXXXXXXX)
  2. Buscar contacto en Chatwoot por teléfono
  3. Crear contacto si no existe
  4. Crear conversación de WhatsApp con el template (outbound proactivo)

Seguridad:
  - Timeout en todas las llamadas HTTP
  - SSL verify siempre activo
  - Retry automático con backoff exponencial en errores 5xx / 429
  - API token se pasa por header, nunca en URL
  - Números de teléfono validados antes de enviar (phonenumbers lib)
"""
import logging
import time
from typing import Optional

import httpx
import phonenumbers
from tenacity import (
    retry,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential,
    before_sleep_log,
)

from config import Config

logger = logging.getLogger(__name__)

# Errores que vale la pena reintentar
_RETRYABLE_STATUS = {429, 500, 502, 503, 504}


def _is_retryable(exc: BaseException) -> bool:
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code in _RETRYABLE_STATUS
    if isinstance(exc, (httpx.TimeoutException, httpx.ConnectError)):
        return True
    return False


def _build_http_client(cfg: Config) -> httpx.Client:
    return httpx.Client(
        base_url=f"{cfg.chatwoot_base_url}/api/v1/accounts/{cfg.chatwoot_account_id}",
        headers={
            "api_access_token": cfg.chatwoot_api_token,
            "Content-Type": "application/json",
        },
        timeout=httpx.Timeout(connect=10.0, read=30.0, write=30.0, pool=5.0),
        verify=True,   # SSL siempre activo
    )


# ─── Normalización de teléfono ────────────────────────────────────────────────

def normalize_phone(raw: str, default_region: str = "PE") -> str:
    """
    Convierte cualquier formato a E.164 (+51XXXXXXXXX).
    Lanza ValueError si el número no es válido.
    """
    raw = raw.strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    try:
        parsed = phonenumbers.parse(raw, default_region)
    except phonenumbers.NumberParseException as exc:
        raise ValueError(f"Número no parseable: {raw!r}") from exc

    if not phonenumbers.is_valid_number(parsed):
        raise ValueError(f"Número inválido: {raw!r}")

    return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)


# ─── Operaciones Chatwoot ─────────────────────────────────────────────────────

@retry(
    retry=retry_if_exception(_is_retryable),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
def _post(client: httpx.Client, path: str, payload: dict) -> dict:
    resp = client.post(path, json=payload)
    resp.raise_for_status()
    return resp.json()


@retry(
    retry=retry_if_exception(_is_retryable),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
def _get(client: httpx.Client, path: str, params: Optional[dict] = None) -> dict:
    resp = client.get(path, params=params or {})
    resp.raise_for_status()
    return resp.json()


def _find_contact(client: httpx.Client, phone_e164: str) -> Optional[int]:
    """Busca un contacto por teléfono. Retorna contact_id o None."""
    data = _get(client, "/contacts/search", {"q": phone_e164, "include_contacts": "true"})
    payload = data.get("payload", {})
    contacts = payload.get("contacts") if isinstance(payload, dict) else payload
    if contacts:
        return contacts[0]["id"]
    return None


def _create_contact(client: httpx.Client, phone_e164: str, nombre: str, apellido: str) -> int:
    """Crea contacto y retorna su contact_id."""
    data = _post(client, "/contacts", {
        "phone_number": phone_e164,
        "name": f"{nombre} {apellido}".strip(),
    })
    # Chatwoot v3+ devuelve {"payload": {"contact": {...}, "contact_inbox": {...}}}
    # Versiones anteriores devuelven {"payload": {...}} o directamente el contacto
    payload = data.get("payload", data)
    if isinstance(payload, dict):
        contact = payload.get("contact", payload)
        if isinstance(contact, dict) and "id" in contact:
            return contact["id"]
    raise RuntimeError(f"Respuesta inesperada al crear contacto: {data}")


def _get_or_create_contact(
    client: httpx.Client,
    phone_e164: str,
    nombre: str,
    apellido: str,
) -> int:
    contact_id = _find_contact(client, phone_e164)
    if contact_id:
        logger.debug("Contacto existente id=%d", contact_id)
        return contact_id
    contact_id = _create_contact(client, phone_e164, nombre, apellido)
    logger.debug("Contacto creado id=%d", contact_id)
    return contact_id


def _create_conversation_with_template(
    client: httpx.Client,
    cfg: Config,
    contact_id: int,
    message: dict,
) -> int:
    """
    Crea conversación outbound de WhatsApp con template message.
    Retorna el conversation_id creado.

    Estructura de 'message':
      {
        content:           str   — texto plano (fallback)
        template_name:     str   — nombre del template en Meta
        template_language: str   — código de idioma ("es")
        params:            dict  — {"nombre": "Juan", "tratamiento": "Hilos Delta", "fecha": "15 de marzo"}
      }
    """
    body: dict = {
        "inbox_id": cfg.chatwoot_wa_inbox_id,
        "contact_id": contact_id,
    }

    if cfg.use_wa_templates:
        # Template message (obligatorio para outreach frío, fuera de ventana 24h)
        # Botones QUICK_REPLY estáticos no llevan parámetros en la API de Meta —
        # el texto del botón ya está registrado en el template aprobado.
        # Incluir "buttons" en template_params causa #132000 en Chatwoot v3+.
        body["message"] = {
            "content": message["content"],
            "template_params": {
                "name": message["template_name"],
                "category": "UTILITY",
                "language": message["template_language"],
                "processed_params": message["params"],
            },
        }
    else:
        # Texto plano — solo funciona dentro de ventana de sesión de 24h
        body["message"] = {"content": message["content"]}

    data = _post(client, "/conversations", body)
    conv = data.get("payload", data)
    if isinstance(conv, dict) and "id" in conv:
        return conv["id"]
    raise RuntimeError(f"Respuesta inesperada al crear conversación: {data}")


# ─── Punto de entrada público ─────────────────────────────────────────────────

def send_reminder(
    cfg: Config,
    paciente_id: str,
    nombres: str,
    apellidos: str,
    celular_raw: str,
    message: dict,
    dry_run: bool = False,
) -> None:
    """
    Envía un recordatorio de WhatsApp a un paciente.

    Lanza excepción si algo falla (el caller decide si marca fallido).
    En dry_run solo loguea sin hacer ninguna llamada HTTP.
    """
    # Validar y normalizar teléfono ANTES de abrir la conexión
    phone_e164 = normalize_phone(celular_raw)

    if dry_run:
        logger.info(
            "[DRY RUN] Paciente=%s | Phone=%s | Template=%s",
            paciente_id,
            # Ofuscar los últimos 4 dígitos en logs
            phone_e164[:-4] + "****",
            message.get("template_name"),
        )
        return

    with _build_http_client(cfg) as client:
        contact_id = _get_or_create_contact(client, phone_e164, nombres, apellidos)
        conv_id = _create_conversation_with_template(client, cfg, contact_id, message)

    logger.info(
        "Enviado | paciente=%s | conv=%d | template=%s",
        paciente_id,
        conv_id,
        message.get("template_name"),
    )
