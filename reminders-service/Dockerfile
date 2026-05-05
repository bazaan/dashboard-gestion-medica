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

# Exponer puerto para webhook
EXPOSE 8080

# Healthcheck via HTTP
HEALTHCHECK --interval=60s --timeout=10s --start-period=15s --retries=3 \
  CMD python -c "import httpx; httpx.get('http://localhost:8080/health', timeout=5).raise_for_status()" || exit 1

CMD ["python", "main.py"]
