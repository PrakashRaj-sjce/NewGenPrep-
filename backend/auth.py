import os
from datetime import datetime, timedelta
from jose import jwt

SECRET_KEY = os.getenv("JWT_SECRET", "")
ALGORITHM = "HS256"

ENV = os.getenv("ENV", os.getenv("ENVIRONMENT", "development")).lower()
if not SECRET_KEY:
    if ENV in {"production", "prod"}:
        raise RuntimeError("JWT_SECRET must be set in production")
    SECRET_KEY = "change-me-dev-only"


def create_access_token(data: dict, expires_minutes: int = 60 * 24 * 7) -> str:
    payload = data.copy()
    now = datetime.utcnow()
    payload["exp"] = now + timedelta(minutes=expires_minutes)
    payload["iat"] = now
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

