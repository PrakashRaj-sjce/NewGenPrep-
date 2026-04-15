"""
NewGenPrep - Auth Routes
Handles: register, login, logout, me, forgot-password, reset-password
"""

import uuid
import secrets
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from services.db_service import get_db, save_session, users
from services.auth_service import (
    hash_password, verify_password, create_access_token, verify_token, pwd_context
)
from security import (
    validate_email, validate_password, validate_name, validate_role,
    check_nosql_injection
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
security = HTTPBearer()


# --- Models ---

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str = "candidate"

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str


# --- Auth Dependencies ---

def get_authenticated_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    """Validate JWT token and return user payload."""
    try:
        payload = verify_token(creds.credentials)
        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def require_hr(user=Depends(get_authenticated_user)):
    """Require HR role."""
    if user.get("role") != "hr":
        raise HTTPException(status_code=403, detail="Forbidden")
    return user


# --- Endpoints ---

@router.post("/register")
async def register(request: RegisterRequest):
    """Register a new user."""
    # Security Validation
    check_nosql_injection(request.model_dump(), "register_request")
    email = validate_email(request.email)
    password = validate_password(request.password)
    name = validate_name(request.name)
    role = validate_role(request.role)

    db = get_db()
    user_id = None

    if db is not None:
        try:
            existing = await db.users.find_one({"email": request.email})
            if existing:
                raise HTTPException(status_code=400, detail="Email already registered")

            hashed = hash_password(password)
            user_id = str(uuid.uuid4())
            user = {
                "id": user_id,
                "email": email,
                "password": hashed,
                "name": name,
                "role": role,
                "created_at": datetime.utcnow().isoformat(),
            }
            await db.users.insert_one(user)
            user_id = user["id"]
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ Register error: {e}")
            raise HTTPException(status_code=500, detail=f"Server Error: {str(e)}")
    else:
        if email in users:
            raise HTTPException(status_code=400, detail="Email already registered")
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id,
            "email": email,
            "password": hash_password(password),
            "name": name,
            "role": role,
            "created_at": datetime.utcnow().isoformat(),
        }
        users[email] = user

    if not user_id:
        raise HTTPException(status_code=500, detail="Failed to create user")

    # Create initial session
    session_id = str(uuid.uuid4())
    session = {
        "session_id": session_id,
        "user_id": user_id,
        "status": "new",
        "questions_asked": [],
        "conversation_history": [],
        "responses": [],
        "answers": [],
        "question_count": 0,
        "current_stage": 0,
        "total_questions": 15,
        "created_at": datetime.utcnow().isoformat(),
    }
    await save_session(session_id, session)

    return {
        "success": True,
        "user": {
            "id": user_id,
            "email": request.email,
            "name": request.name,
            "role": request.role,
        },
        "session_id": session_id,
    }


@router.post("/login")
async def login(request: LoginRequest):
    """Login user and return JWT token."""
    # Security Validation
    check_nosql_injection(request.model_dump(), "login_request")
    email = validate_email(request.email)

    db = get_db()
    user = None

    if db is not None:
        user = await db.users.find_one({"email": email})
        if user and "_id" in user and "id" not in user:
            user["id"] = str(user["_id"])
    else:
        user = users.get(email)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Validate password
    if "password" not in user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    stored_password = user["password"]
    try:
        is_valid = pwd_context.verify(request.password, stored_password)
    except Exception:
        is_valid = False

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id = user.get("id") or str(user.get("_id", ""))
    token = create_access_token({
        "sub": user_id,
        "email": user.get("email"),
        "role": user.get("role"),
    })

    return {
        "success": True,
        "user": {
            "id": user_id,
            "email": user.get("email"),
            "name": user.get("name"),
            "role": user.get("role"),
        },
        "token": token,
    }


@router.get("/me")
async def auth_me(user=Depends(get_authenticated_user)):
    """Get current user profile."""
    db = get_db()
    if db is not None:
        db_user = await db.users.find_one({"id": user.get("sub")})
        if db_user:
            return {
                "user": {
                    "id": db_user.get("id"),
                    "email": db_user.get("email"),
                    "name": db_user.get("name"),
                    "role": db_user.get("role"),
                }
            }

    return {
        "user": {
            "id": user.get("sub"),
            "email": user.get("email"),
            "role": user.get("role"),
        }
    }


@router.post("/logout")
async def logout():
    """Logout - client should remove token from localStorage."""
    return {"success": True, "message": "Logged out"}


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Generate OTP and send password reset email."""
    # Security Validation
    check_nosql_injection(request.model_dump(), "forgot_password")
    email = validate_email(request.email)

    db = get_db()
    if db is None:
        return {"success": True, "message": "If an account exists, a reset code has been sent."}

    # Always return success (no email enumeration)
    user = await db.users.find_one({"email": email})
    if not user:
        return {"success": True, "message": "If an account exists, a reset code has been sent."}

    # Generate 6-digit OTP
    otp_code = f"{secrets.randbelow(900000) + 100000}"

    # Store OTP with 15-minute expiry
    await db.password_resets.delete_many({"email": email})  # Remove old OTPs
    await db.password_resets.insert_one({
        "email": email,
        "otp_code": hash_password(otp_code),  # Store hashed
        "expires_at": datetime.utcnow() + timedelta(minutes=15),
        "created_at": datetime.utcnow(),
    })

    # Send OTP via email
    try:
        from notification_service import notification_service
        if notification_service.is_configured:
            await notification_service._send_email(
                to_email=email,
                to_name=user.get("name", "User"),
                subject="NewGenPrep - Password Reset Code",
                html_body=f"""
                <div style="font-family: Arial; max-width: 500px; margin: 0 auto; padding: 30px; background: #f9f9f9; border-radius: 10px;">
                    <h2 style="color: #667eea;">Password Reset</h2>
                    <p>Your verification code is:</p>
                    <div style="background: #667eea; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; letter-spacing: 8px;">{otp_code}</div>
                    <p style="margin-top: 20px; color: #666;">This code expires in 15 minutes. If you did not request this, ignore this email.</p>
                </div>
                """,
            )
        else:
            print(f"📧 [MOCK] Password reset OTP for {request.email}: {otp_code}")
    except Exception as e:
        print(f"⚠️ Email send failed (OTP still stored): {e}")
        print(f"📧 [FALLBACK] Password reset OTP for {request.email}: {otp_code}")

    return {"success": True, "message": "If an account exists, a reset code has been sent."}


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password using OTP code."""
    # Security Validation
    check_nosql_injection(request.model_dump(), "reset_password")
    email = validate_email(request.email)
    new_password = validate_password(request.new_password)

    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    # Find the reset record
    reset_record = await db.password_resets.find_one({"email": email})
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    # Check expiry
    if datetime.utcnow() > reset_record.get("expires_at", datetime.utcnow()):
        await db.password_resets.delete_many({"email": email})
        raise HTTPException(status_code=400, detail="Reset code has expired")

    # Verify OTP
    stored_hash = reset_record.get("otp_code", "")
    try:
        is_valid = pwd_context.verify(request.otp, stored_hash)
    except Exception:
        is_valid = False

    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid reset code")

    # Update password
    new_hash = hash_password(new_password)
    result = await db.users.update_one(
        {"email": email},
        {"$set": {"password": new_hash}},
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    # Clean up used OTP
    await db.password_resets.delete_many({"email": email})

    return {"success": True, "message": "Password reset successfully"}
