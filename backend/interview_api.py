"""
NewGenPrep - Main Application Entry Point
FastAPI application with middleware, rate limiting, and router configuration.
Designed for 1000-3000+ concurrent users.

This file is the SLIM entry point. All route logic lives in routes/ modules.
"""

import os
import pathlib
from contextlib import asynccontextmanager

from dotenv import load_dotenv

# Load environment variables
env_paths = [
    pathlib.Path(__file__).parent / ".env",
    pathlib.Path(__file__).parent.parent / ".env",
    pathlib.Path.cwd() / ".env",
]
for env_path in env_paths:
    if env_path.exists():
        load_dotenv(dotenv_path=env_path, override=True)
        break
else:
    load_dotenv()

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Services
from services.db_service import connect_db, create_indexes, close_db, get_db
from scheduler_service import scheduler_service
from notification_service import notification_service

# Route Modules
from routes.auth_routes import router as auth_router
from routes.interview_routes import router as interview_router
from routes.hr_routes import router as hr_router
from routes.proctoring_routes import router as proctoring_router
from routes.practice_routes import router as practice_router
from routes.recording_routes import router as recording_router
from routes.code_execution_routes import router as execution_router

# Security Middleware
from security import RequestLoggingMiddleware, RequestSizeLimitMiddleware


# ============ RATE LIMITER SETUP ============

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["120/minute"],   # Global default: 120 req/min per IP
    storage_uri="memory://",         # In-memory store (use Redis for multi-instance)
)


# ============ APP LIFESPAN ============

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic."""
    print("\n" + "=" * 60)
    print("  NewGenPrep AI Interview Platform v2.0")
    print("  Starting up...")
    print("=" * 60)

    # 1. Connect to MongoDB with pooling
    await connect_db()

    # 2. Create database indexes
    await create_indexes()

    # 3. Start background scheduler
    db = get_db()
    if db is not None:
        scheduler_service.configure(db, notification_service)
        try:
            await scheduler_service.start()
        except Exception as e:
            print(f"WARNING: Scheduler failed to start (non-fatal): {e}")

    print("\nNewGenPrep is READY")
    print(f"   Backend: http://localhost:8000")
    print(f"   Health:  http://localhost:8000/health")
    print("=" * 60 + "\n")

    yield  # App runs here

    # Shutdown
    print("\nShutting down...")
    await scheduler_service.stop()
    await close_db()
    print("Clean shutdown complete\n")


# ============ APP CREATION ============

app = FastAPI(
    title="NewGenPrep API",
    description="AI-Powered Interview Platform - Enterprise Edition",
    version="2.0.0",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ============ MIDDLEWARE ============

# CORS
EXTENSION_ID = os.getenv("EXTENSION_ID", "")
EXTENSION_ORIGIN = f"chrome-extension://{EXTENSION_ID}" if EXTENSION_ID and EXTENSION_ID != "your-extension-id-here" else ""
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
PRODUCTION_URL = os.getenv("PRODUCTION_FRONTEND_URL", "")

allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    FRONTEND_URL,
]
if EXTENSION_ORIGIN:
    allowed_origins.append(EXTENSION_ORIGIN)
if PRODUCTION_URL:
    allowed_origins.append(PRODUCTION_URL)

# Remove empty strings and duplicates
allowed_origins = list(set(o for o in allowed_origins if o))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Apply global security middlewares (evaluated bottom-up in Starlette)
app.add_middleware(RequestSizeLimitMiddleware, max_size_mb=50)
app.add_middleware(RequestLoggingMiddleware)

# ============ RATE-LIMITED GLOBAL MIDDLEWARE ============

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["X-Powered-By"] = "NewGenPrep"
    return response


# ============ INCLUDE ROUTERS ============

app.include_router(auth_router)
app.include_router(interview_router)
app.include_router(hr_router)
app.include_router(proctoring_router)
app.include_router(practice_router)
app.include_router(recording_router)
app.include_router(execution_router)


# ============ ROOT ENDPOINTS ============

@app.get("/")
async def root():
    return {
        "name": "NewGenPrep API",
        "version": "2.0.0",
        "status": "running",
    }


@app.get("/health")
async def health_check():
    db = get_db()
    return {
        "status": "healthy",
        "mongodb": "connected" if db is not None else "in-memory",
        "version": "2.0.0",
    }


# ============ ENTRY POINT ============

if __name__ == "__main__":
    import uvicorn

    print("\n----- REGISTERED ROUTES -----")
    for route in app.routes:
        if hasattr(route, "path") and hasattr(route, "methods"):
            print(f"  {route.methods} {route.path}")
    print("----- END ROUTES -----\n")

    uvicorn.run(app, host="0.0.0.0", port=8000)
