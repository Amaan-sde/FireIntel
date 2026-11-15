# ==============================================================================
# FIREINTEL Backend — FastAPI & DuckDB Telemetry Engine
# Python 3.11 Slim Production Image (Built from fireIntel/ context)
# ==============================================================================
FROM python:3.11-slim AS runner

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY . /app/fireIntel/api
COPY ../data/processed/boundary_validated /app/fireIntel/data/processed/boundary_validated
COPY ../data/environmental/metadata /app/fireIntel/data/environmental/metadata
COPY ../data/environmental/processed /app/fireIntel/data/environmental/processed
COPY ../data/boundaries /app/fireIntel/data/boundaries

RUN groupadd -r fireintel && useradd -r -g fireintel -d /app fireintel \
    && chown -R fireintel:fireintel /app

USER fireintel

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["uvicorn", "fireIntel.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
