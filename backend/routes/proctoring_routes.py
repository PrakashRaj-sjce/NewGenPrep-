"""
NewGenPrep - Proctoring Routes
Handles: warning reporting and interview termination due to integrity violations
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from services.db_service import get_db, sessions, get_session
from routes.auth_routes import get_authenticated_user

router = APIRouter(prefix="/api/interview", tags=["Proctoring"])


class WarningRequest(BaseModel):
    type: str  # tab_switch, fullscreen_exit, copy_paste, multiple_faces
    timestamp: Optional[str] = None
    details: Optional[str] = None


@router.post("/terminate")
async def terminate_interview(
    session_id: str,
    reason: str,
    violation_count: int = 0,
    user=Depends(get_authenticated_user),
):
    """Terminate interview due to proctoring violations."""
    db = get_db()
    user_id = user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user token")

    if db is not None:
        session = await db.sessions.find_one({"session_id": session_id})
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        if session.get("user_id") and session["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized for this session")

        await db.sessions.update_one(
            {"session_id": session_id},
            {"$set": {
                "status": "terminated", "termination_reason": reason,
                "violation_count": violation_count, "terminated_at": datetime.utcnow().isoformat(),
            }},
        )
    else:
        if session_id not in sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        session = sessions[session_id]
        if session.get("user_id") and session["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        session.update({
            "status": "terminated", "termination_reason": reason,
            "violation_count": violation_count, "terminated_at": datetime.utcnow().isoformat(),
        })

    return {"success": True, "message": "Interview terminated due to integrity violations", "reason": reason}


@router.post("/{session_id}/warning")
async def report_warning(session_id: str, warning: WarningRequest, user=Depends(get_authenticated_user)):
    """Report a proctoring warning/incident for a session."""
    db = get_db()
    user_id = user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user token")

    incident = {
        "type": warning.type,
        "timestamp": warning.timestamp or datetime.utcnow().isoformat(),
        "details": warning.details,
    }

    if db is not None:
        session = await db.sessions.find_one({"session_id": session_id})
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        if session.get("user_id") and session["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized for this session")

        await db.sessions.update_one(
            {"session_id": session_id},
            {"$inc": {"warning_count": 1}, "$push": {"incidents": incident}},
        )
    else:
        if session_id not in sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        session = sessions[session_id]
        session.setdefault("warning_count", 0)
        session.setdefault("incidents", [])
        session["warning_count"] += 1
        session["incidents"].append(incident)

    return {"success": True, "message": "Warning logged"}
