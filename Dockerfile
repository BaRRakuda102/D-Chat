# ========= FRONTEND =========
FROM node:18-alpine AS frontend-builder

WORKDIR /app

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build


# ========= BACKEND =========
FROM python:3.11-slim

WORKDIR /app

# зависимости
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# копируем backend (всё кроме frontend)
COPY . .

# копируем фронт билд
COPY --from=frontend-builder /app/dist ./dist

ENV PORT=8000
EXPOSE 8000

CMD ["python", "main.py"]