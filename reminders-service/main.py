"""
Entry point del servicio de recordatorios.

Modos de ejecución:
  python main.py              → inicia scheduler (corre todos los días a la hora configurada)
  python main.py --now        → ejecuta el batch inmediatamente y sale
  python main.py --dry-run    → simula sin enviar nada (ignora DRY_RUN del .env)

En producción (Railway / Render / VPS) usar: python main.py
"""
import argparse
import logging
import sys
from datetime import datetime

from dotenv import load_dotenv

load_dotenv()  # Carga .env si existe (dev). En prod las vars vienen del entorno.

from config import Config
from sender import run_batch


def setup_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level, logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout)],
    )
    # Silenciar logs verbosos de librerías de terceros
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("apscheduler").setLevel(logging.INFO)


def main() -> None:
    parser = argparse.ArgumentParser(description="Servicio de recordatorios WhatsApp")
    parser.add_argument("--now",     action="store_true", help="Ejecutar batch ahora y salir")
    parser.add_argument("--dry-run", action="store_true", help="Simular sin enviar ni escribir")
    args = parser.parse_args()

    # Cargar config (falla fuerte si falta variable requerida)
    try:
        cfg = Config.from_env()
    except EnvironmentError as exc:
        # Log a stderr antes de tener logging configurado
        print(f"[ERROR] Configuración inválida:\n{exc}", file=sys.stderr)
        sys.exit(1)

    # Dry run por CLI tiene prioridad sobre el .env
    if args.dry_run:
        cfg = Config(**{**cfg.__dict__, "dry_run": True})

    setup_logging(cfg.log_level)
    logger = logging.getLogger(__name__)

    if cfg.dry_run:
        logger.warning("⚠️  MODO DRY RUN — no se enviará nada ni se actualizará la DB")

    logger.info(
        "Servicio iniciado | cron=%02d:%02d | dry_run=%s",
        cfg.cron_hour, cfg.cron_minute, cfg.dry_run,
    )

    if args.now:
        # Ejecutar una sola vez y salir (útil para Railway one-off o testing)
        logger.info("Ejecución inmediata solicitada.")
        run_batch(cfg)
        return

    # ─── Modo scheduler (producción) ─────────────────────────────────────────
    from apscheduler.schedulers.blocking import BlockingScheduler
    from apscheduler.triggers.cron import CronTrigger

    scheduler = BlockingScheduler(timezone="America/Lima")

    scheduler.add_job(
        func=run_batch,
        trigger=CronTrigger(hour=cfg.cron_hour, minute=cfg.cron_minute),
        args=[cfg],
        id="recordatorios_diarios",
        name="Envío diario de recordatorios WhatsApp",
        misfire_grace_time=3600,   # tolerar hasta 1h de retraso si el proceso estuvo caído
        coalesce=True,             # si se perdieron N ejecuciones, correr solo 1
        max_instances=1,           # nunca ejecutar en paralelo
    )

    next_run = scheduler.get_job("recordatorios_diarios").next_run_time
    logger.info("Próxima ejecución: %s", next_run.strftime("%Y-%m-%d %H:%M %Z") if next_run else "N/A")

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Servicio detenido.")


if __name__ == "__main__":
    main()
