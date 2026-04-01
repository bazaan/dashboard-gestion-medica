# ── Build stage ────────────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app
COPY requirements.txt .

# Instalar dependencias en directorio separado para imagen final más limpia
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Runtime stage ───────────────────────────────────────────────────────────────
FROM python:3.12-slim

# No correr como root
RUN useradd --create-home --shell /bin/bash appuser

WORKDIR /app

# Copiar deps instaladas
COPY --from=builder /install /usr/local

# Copiar código
COPY --chown=appuser:appuser . .

USER appuser

# Healthcheck básico: verificar que el proceso Python sigue corriendo
HEALTHCHECK --interval=60s --timeout=10s --start-period=10s --retries=3 \
  CMD pgrep -f "python main.py" || exit 1

CMD ["python", "main.py"]
