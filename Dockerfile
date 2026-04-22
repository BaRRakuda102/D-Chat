# Stage 2: Python backend
FROM python:3.11-slim AS production
WORKDIR /app

# Python deps
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Backend code ← ВАЖНО: копируем в /app/app/
COPY backend/app/ ./app/

# Frontend static
COPY --from=frontend-builder /app/frontend/dist ./static

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}