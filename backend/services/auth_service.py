"""
NewGenPrep - Auth Service
Handles password hashing (Argon2) and JWT token management.
"""

import os
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext

# Password hashing using Argon2 (memory-hard, GPU-resistant)
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# JWT configuration
SECRET_KEY = os.getenv("JWT_SECRET", "")
ALGORITHM = "HS256"
TOKEN_EXPIRY_MINUTES = 60 * 24 * 7  # 7 days

ENV = os.getenv("ENV", os.getenv("ENVIRONMENT", "development")).lower()

if not SECRET_KEY:
    if ENV in {"production", "prod"}:
        raise RuntimeError("JWT_SECRET must be set in production")
    print("WARNING: JWT_SECRET not found in environment! Using an insecure dev default.")
    SECRET_KEY = "change-me-dev-only"
else:
    print(f"INFO: JWT_SECRET loaded successfully (length: {len(SECRET_KEY)})")


def hash_password(password: str) -> str:
    """Hash a password using Argon2."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        print(f"ERROR: Password verification error: {e}")
        return False


def create_access_token(data: dict, expires_minutes: int = TOKEN_EXPIRY_MINUTES) -> str:
    """Create a JWT access token."""
    payload = data.copy()
    now = datetime.utcnow()
    payload["exp"] = now + timedelta(minutes=expires_minutes)
    payload["iat"] = now
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> dict:
    """Verify and decode a JWT token."""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
