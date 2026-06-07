FROM node:20-bookworm AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app
COPY backend/ ./backend/
COPY frontend/public/ ./frontend/public/
RUN python backend/validate_seed.py
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY --from=frontend-build /app/frontend/build ./frontend/build
EXPOSE 8000
CMD ["sh", "-c", "cd backend && uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}"]
