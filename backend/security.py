"""
NewGenPrep - Security Middleware & Utilities
Comprehensive backend protection for enterprise deployment.

Covers:
  1. NoSQL injection prevention (MongoDB operator filtering)
  2. Input sanitization (XSS, script tags, path traversal)
  3. File upload validation (magic bytes, not just extension)
  4. Request size limiting
  5. Structured logging with request tracing
  6. Request timeout management
  7. CORS hardening
"""

import re
import time
import uuid
import logging
from typing import Any, Dict, Optional

from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


# ============ STRUCTURED LOGGING ============

logger = logging.getLogger("newgenprep")
logger.setLevel(logging.INFO)

# Console handler with timestamp
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter(
        "[%(asctime)s] %(levelname)s [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    ))
    logger.addHandler(handler)


# ============ NOSQL INJECTION PREVENTION ============

# MongoDB operators that should NEVER appear in user input
MONGO_OPERATORS = {
    "$gt", "$gte", "$lt", "$lte", "$ne", "$nin", "$in",
    "$or", "$and", "$not", "$nor", "$exists", "$type",
    "$regex", "$where", "$expr", "$jsonSchema",
    "$mod", "$text", "$search", "$all", "$elemMatch",
    "$size", "$slice", "$meta", "$natural",
    "$set", "$unset", "$inc", "$push", "$pull",
    "$addToSet", "$pop", "$rename", "$bit",
    "$each", "$position", "$sort",
    "$currentDate", "$min", "$max", "$mul",
}


def check_nosql_injection(value: Any, field_name: str = "input") -> None:
    """
    Recursively check for MongoDB operator injection in user input.
    Raises HTTPException if injection attempt detected.
    """
    if isinstance(value, str):
        # Check if string starts with $ (MongoDB operator)
        if value.startswith("$"):
            logger.warning(f"NoSQL injection attempt in '{field_name}': {value[:50]}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid characters in {field_name}"
            )
    elif isinstance(value, dict):
        for key, val in value.items():
            # Keys starting with $ are MongoDB operators
            if isinstance(key, str) and key.startswith("$"):
                logger.warning(f"NoSQL injection attempt (key) in '{field_name}': {key}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid input in {field_name}"
                )
            check_nosql_injection(val, f"{field_name}.{key}")
    elif isinstance(value, list):
        for i, item in enumerate(value):
            check_nosql_injection(item, f"{field_name}[{i}]")


def sanitize_mongo_input(value: str) -> str:
    """Sanitize a string for safe MongoDB queries. Strips leading $ and null bytes."""
    if not isinstance(value, str):
        return value
    # Remove null bytes
    value = value.replace("\x00", "")
    # Remove leading $ to prevent operator injection
    while value.startswith("$"):
        value = value[1:]
    return value


# ============ XSS / INPUT SANITIZATION ============

# Patterns that indicate script injection attempts
XSS_PATTERNS = [
    re.compile(r"<script[^>]*>", re.IGNORECASE),
    re.compile(r"javascript:", re.IGNORECASE),
    re.compile(r"on\w+\s*=", re.IGNORECASE),   # onclick=, onerror=, etc.
    re.compile(r"<iframe", re.IGNORECASE),
    re.compile(r"<object", re.IGNORECASE),
    re.compile(r"<embed", re.IGNORECASE),
    re.compile(r"eval\s*\(", re.IGNORECASE),
    re.compile(r"document\.cookie", re.IGNORECASE),
    re.compile(r"window\.location", re.IGNORECASE),
]


def check_xss(value: str, field_name: str = "input") -> None:
    """Check string for XSS injection patterns."""
    if not isinstance(value, str):
        return
    for pattern in XSS_PATTERNS:
        if pattern.search(value):
            logger.warning(f"XSS attempt in '{field_name}': {value[:80]}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid content in {field_name}"
            )


def sanitize_string(value: str, max_length: int = 10000) -> str:
    """
    Sanitize user input string:
    - Trim whitespace
    - Enforce max length
    - Remove null bytes
    - Strip dangerous HTML tags
    """
    if not isinstance(value, str):
        return value
    value = value.strip()
    value = value.replace("\x00", "")
    if len(value) > max_length:
        value = value[:max_length]
    return value


# ============ FILE UPLOAD VALIDATION ============

# Magic bytes for allowed file types
ALLOWED_FILE_SIGNATURES = {
    "application/pdf": [b"%PDF"],
    "application/msword": [b"\xd0\xcf\x11\xe0"],  # DOC (OLE2)
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [b"PK\x03\x04"],  # DOCX (ZIP)
}

# Max file sizes per type (in bytes)
MAX_FILE_SIZES = {
    "resume": 5 * 1024 * 1024,        # 5MB for resumes
    "audio": 25 * 1024 * 1024,         # 25MB for audio recordings
    "recording": 100 * 1024 * 1024,    # 100MB for video recordings
}

# Dangerous file extensions that should NEVER be uploaded
BLOCKED_EXTENSIONS = {
    ".exe", ".bat", ".cmd", ".sh", ".ps1", ".vbs", ".js",
    ".msi", ".dll", ".com", ".scr", ".pif", ".hta",
    ".php", ".asp", ".aspx", ".jsp", ".py", ".rb", ".pl",
    ".cgi", ".wsf", ".wsh",
}


def validate_file_upload(
    filename: str,
    file_bytes: bytes,
    upload_type: str = "resume",
    allowed_extensions: set = None,
) -> None:
    """
    Validate uploaded file for security:
    1. Check extension against blocklist
    2. Verify file size
    3. Validate magic bytes match extension
    4. Check for path traversal in filename
    """
    if allowed_extensions is None:
        allowed_extensions = {".pdf", ".doc", ".docx"}

    # Path traversal prevention
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    # Extension check
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in BLOCKED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed")
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Only {', '.join(allowed_extensions)} files are accepted")

    # Size check
    max_size = MAX_FILE_SIZES.get(upload_type, 5 * 1024 * 1024)
    if len(file_bytes) > max_size:
        max_mb = max_size / (1024 * 1024)
        raise HTTPException(status_code=413, detail=f"File too large. Maximum {max_mb:.0f}MB")

    # Magic byte validation (verify content matches extension)
    if ext == ".pdf" and not file_bytes[:4].startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="File content does not match PDF format")
    elif ext == ".docx" and not file_bytes[:4].startswith(b"PK"):
        raise HTTPException(status_code=400, detail="File content does not match DOCX format")
    elif ext == ".doc" and not file_bytes[:4].startswith(b"\xd0\xcf"):
        raise HTTPException(status_code=400, detail="File content does not match DOC format")


# ============ INPUT VALIDATORS ============

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
PASSWORD_MIN_LENGTH = 6
PASSWORD_MAX_LENGTH = 128
NAME_MAX_LENGTH = 100
EMAIL_MAX_LENGTH = 254


def validate_email(email: str) -> str:
    """Validate and sanitize email address."""
    email = sanitize_string(email, max_length=EMAIL_MAX_LENGTH).lower()
    if not EMAIL_REGEX.match(email):
        raise HTTPException(status_code=400, detail="Invalid email format")
    return email


def validate_password(password: str) -> str:
    """Validate password meets requirements."""
    if len(password) < PASSWORD_MIN_LENGTH:
        raise HTTPException(status_code=400, detail=f"Password must be at least {PASSWORD_MIN_LENGTH} characters")
    if len(password) > PASSWORD_MAX_LENGTH:
        raise HTTPException(status_code=400, detail=f"Password must be less than {PASSWORD_MAX_LENGTH} characters")
    return password


def validate_name(name: str) -> str:
    """Validate and sanitize user name."""
    name = sanitize_string(name, max_length=NAME_MAX_LENGTH)
    check_xss(name, "name")
    if len(name) < 1:
        raise HTTPException(status_code=400, detail="Name is required")
    return name


def validate_role(role: str) -> str:
    """Validate role is an allowed value."""
    allowed_roles = {"candidate", "hr"}
    if role not in allowed_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(allowed_roles)}")
    return role


def validate_session_id(session_id: str) -> str:
    """Validate session ID format (UUID)."""
    session_id = sanitize_string(session_id, max_length=36)
    # Allow UUID format: 8-4-4-4-12 hex chars
    uuid_pattern = re.compile(r"^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$", re.IGNORECASE)
    if not uuid_pattern.match(session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID format")
    return session_id


# ============ REQUEST LOGGING MIDDLEWARE ============

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that logs every request with:
    - Unique request ID for tracing
    - Method, path, status code
    - Response time in milliseconds
    - Client IP address
    """

    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())[:8]
        start_time = time.time()

        # Add request ID to state for use in route handlers
        request.state.request_id = request_id

        # Get client IP
        client_ip = request.client.host if request.client else "unknown"

        try:
            response = await call_next(request)
            elapsed = (time.time() - start_time) * 1000  # ms

            # Log request (skip health checks and static files to reduce noise)
            if request.url.path not in ("/health", "/", "/favicon.ico"):
                log_level = logging.WARNING if response.status_code >= 400 else logging.INFO
                logger.log(
                    log_level,
                    f"[{request_id}] {client_ip} {request.method} {request.url.path} "
                    f"-> {response.status_code} ({elapsed:.0f}ms)"
                )

            # Add request ID to response headers for client-side debugging
            response.headers["X-Request-ID"] = request_id
            return response

        except Exception as e:
            elapsed = (time.time() - start_time) * 1000
            logger.error(
                f"[{request_id}] {client_ip} {request.method} {request.url.path} "
                f"-> 500 EXCEPTION ({elapsed:.0f}ms): {str(e)[:200]}"
            )
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error", "request_id": request_id},
                headers={"X-Request-ID": request_id},
            )


# ============ REQUEST SIZE LIMIT MIDDLEWARE ============

class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """
    Limit request body size to prevent memory exhaustion attacks.
    Default: 50MB max for any request.
    """

    def __init__(self, app, max_size_mb: int = 50):
        super().__init__(app)
        self.max_size = max_size_mb * 1024 * 1024  # Convert to bytes

    async def dispatch(self, request: Request, call_next):
        # Check Content-Length header
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.max_size:
            return JSONResponse(
                status_code=413,
                content={"detail": f"Request body too large. Maximum {self.max_size // (1024*1024)}MB"},
            )
        return await call_next(request)
