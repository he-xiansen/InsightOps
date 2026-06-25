# ===== Stage 1: Build Frontend =====
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ===== Stage 2: Application =====
FROM python:3.11-slim

ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app/backend

RUN python -m pip install --upgrade pip && \
    python -m pip install \
        fastapi==0.115.0 \
        uvicorn==0.30.6 \
        sqlalchemy==2.0.36 \
        pydantic-settings==2.5.2 \
        pymysql==1.1.1 \
        cryptography==43.0.1 \
        python-multipart==0.0.12

COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist /app/frontend

RUN useradd --create-home --uid 10001 insightops && \
    mkdir -p /app/backend/uploads && \
    chown -R insightops:insightops /app

USER insightops

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
