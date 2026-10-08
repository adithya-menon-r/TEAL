# backend/Dockerfile
# Build from the REPO ROOT so we can copy templates/catalog.json.
#
# gcloud builds submit --config infra/cloudbuild.yaml \
#   --substitutions=_IMAGE=api,_TAG=v1,_DOCKERFILE=backend/Dockerfile .

FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (layer cache)
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY backend/app ./app

# Copy the lab catalog (§10 — backend reads it at startup)
COPY templates/catalog.json ./catalog.json

# Non-root user for defence in depth
RUN useradd -m appuser
USER appuser

ENV PYTHONUNBUFFERED=1

# uvicorn serves on $PORT (Cloud Run sets this to 8080)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
