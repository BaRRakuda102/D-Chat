# ==========================================
# D-Chat - Unified Production Dockerfile
# ==========================================

# Stage 1: Build React frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json ./
RUN npm install --prefer-offline --no-audit --no-fund

COPY frontend/ ./
RUN npm run build

# Stage 2: Python backend + serve static
FROM python:3.11-slim AS production
WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Backend code
COPY backend/app/ ./app/

# Frontend static files
COPY --from=frontend-builder /app/frontend/dist ./static

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV STATIC_DIR=/app/static

# Railway provides PORT env var
ENV PORT=8000

EXPOSE 8000

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}