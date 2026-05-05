"""
Entry point del servicio de recordatorios + webhook bot.

Modos de ejecución:
  python main.py              → inicia webhook server + scheduler (producción)
  python main.py --now        → ejecuta el batch inmediatamente y sale
  python main.py --dry-run    → simula sin enviar nada (ignora DRY_RUN del .env)

El servidor web (FastAPI/uvicorn) expone:
  POST /webhook/chatwoot  → recibe eventos de Chatwoot y responde automáticamente
  GET  /health            → healthcheck para Railway

En producción (Railway) usar: python main.py
"""
import argparse
import logging
import sys
import threading
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from config import Config
from sender import run_batch
from webhook import handle_webhook


def setup_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level, logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout)],
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("apscheduler").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


# ─── Scheduler en background thread ──────────────────────────────────────────

_scheduler = None


def _start_scheduler(cfg: Config) -> None:
    """Inicia APScheduler en un thread separado."""
    global _scheduler
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger

    _scheduler = BackgroundScheduler(timezone="America/Lima")
    _scheduler.add_job(
        func=run_batch,
        trigger=CronTrigger(hour=cfg.cron_hour, minute=cfg.cron_minute),
        args=[cfg],
        id="recordatorios_diarios",
        name="Envío diario de recordatorios WhatsApp",
        misfire_grace_time=3600,
        coalesce=True,
        max_instances=1,
    )
    _scheduler.start()

    next_run = _scheduler.get_job("recordatorios_diarios").next_run_time
    logger = logging.getLogger(__name__)
    logger.info("Scheduler iniciado — próxima ejecución: %s",
                next_run.strftime("%Y-%m-%d %H:%M %Z") if next_run else "N/A")


# ─── FastAPI app ──────────────────────────────────────────────────────────────

def create_app(cfg: Config):
    from fastapi import FastAPI, Request
    from fastapi.responses import JSONResponse

    @asynccontextmanager
    async def lifespan(app):
        _start_scheduler(cfg)
        yield
        if _scheduler:
            _scheduler.shutdown(wait=False)

    app = FastAPI(
        title="Recordatorios & Bot WhatsApp",
        docs_url=None,
        redoc_url=None,
        lifespan=lifespan,
    )

    @app.get("/health")
    async def health():
        return {"status": "ok", "scheduler": _scheduler is not None}

    @app.post("/webhook/chatwoot")
    async def chatwoot_webhook(request: Request):
        try:
            payload = await request.json()
        except Exception:
            return JSONResponse({"error": "invalid json"}, status_code=400)
        result = handle_webhook(payload)
        return result

    return app


def main() -> None:
    parser = argparse.ArgumentParser(description="Servicio de recordatorios + webhook bot")
    parser.add_argument("--now",     action="store_true", help="Ejecutar batch ahora y salir")
    parser.add_argument("--dry-run", action="store_true", help="Simular sin enviar ni escribir")
    args = parser.parse_args()

    try:
        cfg = Config.from_env()
    except EnvironmentError as exc:
        print(f"[ERROR] Configuración inválida:\n{exc}", file=sys.stderr)
        sys.exit(1)

    if args.dry_run:
        cfg = Config(**{**cfg.__dict__, "dry_run": True})

    setup_logging(cfg.log_level)
    logger = logging.getLogger(__name__)

    if cfg.dry_run:
        logger.warning("⚠️  MODO DRY RUN — no se enviará nada ni se actualizará la DB")

    # Modo batch inmediato
    if args.now:
        logger.info("Ejecución inmediata solicitada.")
        run_batch(cfg)
        return

    # Modo producción: webhook server + scheduler
    import uvicorn

    port = int(cfg.__dict__.get("port", 0)) or int(__import__("os").getenv("PORT", "8080"))
    logger.info("Iniciando servidor en puerto %d + scheduler cron=%02d:%02d",
                port, cfg.cron_hour, cfg.cron_minute)

    app = create_app(cfg)
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")


if __name__ == "__main__":
    main()
