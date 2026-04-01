"""
Configuración centralizada. Todas las variables se leen de env vars.
Falla fuerte al inicio si falta algo requerido — mejor que fallar a media noche.
"""
import os
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Config:
    # Supabase
    supabase_url: str
    supabase_service_role_key: str

    # Chatwoot
    chatwoot_base_url: str
    chatwoot_account_id: int
    chatwoot_api_token: str
    chatwoot_wa_inbox_id: int

    # Plantillas WA
    wa_template_30d: str
    wa_template_7d: str
    wa_template_vencimiento: str
    wa_template_30d_language: str
    wa_template_7d_language: str
    wa_template_vencimiento_language: str

    # Comportamiento
    use_wa_templates: bool
    max_messages_per_run: int
    delay_between_sends: float
    dry_run: bool
    cron_hour: int
    cron_minute: int
    log_level: str

    @classmethod
    def from_env(cls) -> "Config":
        missing: list[str] = []

        def require(key: str) -> str:
            val = os.getenv(key, "").strip()
            if not val:
                missing.append(key)
            return val

        def optional(key: str, default: str) -> str:
            return os.getenv(key, default).strip()

        supabase_url             = require("SUPABASE_URL")
        supabase_service_role    = require("SUPABASE_SERVICE_ROLE_KEY")
        chatwoot_base_url        = require("CHATWOOT_BASE_URL")
        chatwoot_account_id_raw  = require("CHATWOOT_ACCOUNT_ID")
        chatwoot_api_token       = require("CHATWOOT_API_TOKEN")
        chatwoot_wa_inbox_id_raw = require("CHATWOOT_WA_INBOX_ID")

        if missing:
            raise EnvironmentError(
                f"Variables de entorno requeridas no encontradas: {', '.join(missing)}\n"
                "Copia .env.example a .env y completa los valores."
            )

        # Parsear enteros con mensaje claro
        try:
            chatwoot_account_id = int(chatwoot_account_id_raw)
            chatwoot_wa_inbox_id = int(chatwoot_wa_inbox_id_raw)
        except ValueError as exc:
            raise EnvironmentError(
                "CHATWOOT_ACCOUNT_ID y CHATWOOT_WA_INBOX_ID deben ser enteros."
            ) from exc

        return cls(
            supabase_url=supabase_url.rstrip("/"),
            supabase_service_role_key=supabase_service_role,
            chatwoot_base_url=chatwoot_base_url.rstrip("/"),
            chatwoot_account_id=chatwoot_account_id,
            chatwoot_api_token=chatwoot_api_token,
            chatwoot_wa_inbox_id=chatwoot_wa_inbox_id,
            wa_template_30d=optional("WA_TEMPLATE_30D", "30d"),
            wa_template_7d=optional("WA_TEMPLATE_7D", "7d"),
            wa_template_vencimiento=optional("WA_TEMPLATE_VENCIMIENTO", "0d"),
            wa_template_30d_language=optional("WA_TEMPLATE_30D_LANGUAGE", "en_US"),
            wa_template_7d_language=optional("WA_TEMPLATE_7D_LANGUAGE", "es_PE"),
            wa_template_vencimiento_language=optional("WA_TEMPLATE_VENCIMIENTO_LANGUAGE", "es_PE"),
            use_wa_templates=optional("USE_WA_TEMPLATES", "true").lower() == "true",
            max_messages_per_run=int(optional("MAX_MESSAGES_PER_RUN", "100")),
            delay_between_sends=float(optional("DELAY_BETWEEN_SENDS", "0.8")),
            dry_run=optional("DRY_RUN", "false").lower() == "true",
            cron_hour=int(optional("CRON_HOUR", "9")),
            cron_minute=int(optional("CRON_MINUTE", "0")),
            log_level=optional("LOG_LEVEL", "INFO").upper(),
        )
