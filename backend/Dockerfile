# ============================================
# AI Interview Bot - Backend Dockerfile
# Multi-stage build for production
# ============================================

# --- Stage 1: Build ---
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# --- Stage 2: Production ---
FROM python:3.11-slim AS production

LABEL maintainer="Xcelisor Plugins"
LABEL description="AI Interview Bot - FastAPI Backend"

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Copy application code
COPY interview_api.py .
COPY ai_engine.py .
COPY auth.py .
COPY report_engine.py .
COPY notification_service.py .
COPY scheduler_service.py .
COPY question_helpers.py .
COPY security.py .
COPY mock_questions.json .

# Copy route and service modules
COPY routes/ ./routes/
COPY services/ ./services/

# Create directories for uploads and recordings
RUN mkdir -p /app/recordings /app/uploads /app/temp \
    && chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose API port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import httpx; r=httpx.get('http://localhost:8000/health'); exit(0 if r.status_code==200 else 1)" || exit 1

# Environment defaults (override via docker-compose or -e flags)
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Run with uvicorn (production workers)
CMD ["python", "-m", "uvicorn", "interview_api:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "2", \
     "--log-level", "info"]
