"""
NewGenPrep - HR Routes
Handles: candidates, analytics (REAL data), questions CRUD, settings, scheduling, rubrics
"""

import os
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, validator

from services.db_service import get_db, sessions, question_sets
from routes.auth_routes import require_hr, get_authenticated_user
from security import check_nosql_injection, sanitize_string, check_xss

router = APIRouter(prefix="/api", tags=["HR Management"])


# --- Models ---

class QuestionSetRequest(BaseModel):
    category: str
    domain: str
    questions: list

class UpdateQuestionSetRequest(BaseModel):
    id: str
    isActive: Optional[bool] = None
    questions: Optional[list] = None

class HRSettingsRequest(BaseModel):
    max_questions: int = 15
    adaptive_difficulty: bool = True
    voice_input: bool = True

class ScheduleCreate(BaseModel):
    candidateName: str
    candidateEmail: str
    date: str
    time: str
    type: str
    duration: int
    role: Optional[str] = None
    notes: Optional[str] = None

class RubricCreate(BaseModel):
    name: str
    description: str
    competencies: List[Dict[str, Any]]
    totalQuestions: int = 15
    active: bool = True

    @validator("totalQuestions")
    def validate_total_questions(cls, v):
        if v < 15:
            raise ValueError("totalQuestions must be at least 15")
        return v


# --- Endpoints ---

@router.get("/hr/candidates")
async def get_candidates(user=Depends(require_hr)):
    """Get all candidates for HR dashboard."""
    db = get_db()
    candidates = []

    if db is not None:
        async for session in db.sessions.find({"status": {"$in": ["completed", "in_progress"]}}):
            responses = session.get("responses", [])
            score = sum(r.get("quality_score", 0) for r in responses) / max(len(responses), 1) if responses else 0
            
            # Continuity: Extract rich profile from session
            resume_name = session.get("candidate_name")
            resume_email = session.get("candidate_email")
            resume_phone = session.get("candidate_phone", "")
            summary = session.get("professional_summary", "")

            name = "Candidate"
            email = ""
            user_id = session.get("user_id")
            if user_id:
                u = await db.users.find_one({"id": user_id})
                if u:
                    name = u.get("name", "Candidate")
                    email = u.get("email", "")

            # Prioritize extracted resume details as per continuity strategy
            final_name = resume_name if resume_name and resume_name != "Candidate" else name
            final_email = resume_email if resume_email else (email if email else f"candidate_{session.get('session_id', '')[:8]}@example.com")

            candidates.append({
                "id": session.get("session_id"),
                "name": final_name,
                "email": final_email,
                "phone": resume_phone,
                "professional_summary": summary,
                "status": session.get("status", "pending").replace("_", "-"),
                "score": score,
                "date": session.get("created_at"),
                "sessionId": session.get("session_id"),
                "totalInterviews": 1,
            })
    else:
        for sid, session in sessions.items():
            if session.get("status") in ["completed", "in_progress"]:
                responses = session.get("responses", [])
                score = sum(r.get("quality_score", 0) for r in responses) / max(len(responses), 1) if responses else 0
                resume_name = session.get("candidate_name")
                resume_email = session.get("candidate_email")
                resume_phone = session.get("candidate_phone", "")
                summary = session.get("professional_summary", "")
                
                final_name = resume_name if resume_name and resume_name != "Candidate" else "Candidate"
                final_email = resume_email if resume_email else f"candidate_{sid[:8]}@example.com"
                
                candidates.append({
                    "id": sid, "name": final_name,
                    "email": final_email,
                    "phone": resume_phone,
                    "professional_summary": summary,
                    "status": session.get("status", "pending").replace("_", "-"),
                    "score": score, "date": session.get("created_at"),
                    "sessionId": sid, "totalInterviews": 1,
                })

    return candidates


@router.get("/hr/analytics")
async def get_analytics(user=Depends(require_hr)):
    """Get HR analytics dashboard data - ALL REAL DATA, no hardcoded values."""
    db = get_db()
    total_sessions = 0
    completed = 0
    in_progress = 0
    all_scores = []
    all_skill_data = {}        # skill -> {mentions: int, total_score: float}
    monthly_data = {}          # YYYY-MM -> {count: int, total_score: float}

    if db is not None:
        total_sessions = await db.sessions.count_documents({})
        completed = await db.sessions.count_documents({"status": "completed"})
        in_progress = await db.sessions.count_documents({"status": "in_progress"})

        async for session in db.sessions.find({"status": "completed"}):
            responses = session.get("responses", [])
            if responses:
                avg = sum(r.get("quality_score", 0) for r in responses) / len(responses)
                all_scores.append(avg)

                # Aggregate real skill data
                for r in responses:
                    for skill in r.get("detected_skills", []):
                        if skill not in all_skill_data:
                            all_skill_data[skill] = {"mentions": 0, "total_score": 0}
                        all_skill_data[skill]["mentions"] += 1
                        all_skill_data[skill]["total_score"] += r.get("quality_score", 5)

                # Aggregate real monthly trend
                created_at = session.get("created_at", "")
                month_key = ""
                if isinstance(created_at, str) and len(created_at) >= 7:
                    month_key = created_at[:7]  # YYYY-MM
                elif isinstance(created_at, datetime):
                    month_key = created_at.strftime("%Y-%m")

                if month_key:
                    if month_key not in monthly_data:
                        monthly_data[month_key] = {"count": 0, "total_score": 0}
                    monthly_data[month_key]["count"] += 1
                    monthly_data[month_key]["total_score"] += avg
    else:
        total_sessions = len(sessions)
        for session in sessions.values():
            if session.get("status") == "completed":
                completed += 1
                responses = session.get("responses", [])
                if responses:
                    avg = sum(r.get("quality_score", 0) for r in responses) / len(responses)
                    all_scores.append(avg)
            elif session.get("status") == "in_progress":
                in_progress += 1

    avg_score = sum(all_scores) / len(all_scores) if all_scores else 0

    # Build real skill analysis (top 10 by mentions)
    skill_analysis = sorted(
        [
            {
                "skill": skill,
                "mentions": data["mentions"],
                "avgScore": round(data["total_score"] / max(data["mentions"], 1), 1),
            }
            for skill, data in all_skill_data.items()
        ],
        key=lambda x: x["mentions"],
        reverse=True,
    )[:10]

    # Build real performance trend (last 6 months)
    performance_trend = sorted(
        [
            {
                "date": month,
                "interviews": data["count"],
                "avgScore": round(data["total_score"] / max(data["count"], 1), 1),
            }
            for month, data in monthly_data.items()
        ],
        key=lambda x: x["date"],
    )[-6:]

    return {
        "overview": {
            "totalCandidates": total_sessions,
            "totalInterviews": total_sessions,
            "inProgress": in_progress,
            "completed": completed,
            "averageScore": round(avg_score, 1),
        },
        "scoreDistribution": {
            "excellent": sum(1 for s in all_scores if s >= 8),
            "good": sum(1 for s in all_scores if 6 <= s < 8),
            "average": sum(1 for s in all_scores if 4 <= s < 6),
            "needsImprovement": sum(1 for s in all_scores if s < 4),
        },
        "skillAnalysis": skill_analysis,
        "performanceTrend": performance_trend,
    }


# --- Question Sets ---

@router.get("/hr/questions")
async def get_question_sets(user=Depends(require_hr)):
    db = get_db()
    sets = []
    if db is not None:
        async for qs in db.question_sets.find():
            if "_id" in qs:
                qs.pop("_id")
            sets.append(qs)
    else:
        sets = list(question_sets.values())
    return sets


@router.post("/hr/questions")
async def create_question_set(request: QuestionSetRequest, user=Depends(require_hr)):
    check_nosql_injection(request.model_dump(), "create_question_set")
    category = sanitize_string(request.category)
    check_xss(category, "category")
    
    db = get_db()
    set_id = str(uuid.uuid4())
    new_set = {
        "id": set_id, "category": request.category, "domain": request.domain,
        "questionCount": len(request.questions), "questions": request.questions,
        "isActive": True, "uploadedBy": "hr",
        "createdAt": datetime.utcnow().isoformat(), "updatedAt": datetime.utcnow().isoformat(),
    }
    if db is not None:
        await db.question_sets.insert_one(new_set)
    else:
        question_sets[set_id] = new_set
    return {"success": True, "id": set_id}


@router.delete("/hr/questions")
async def delete_question_set(id: str = Query(..., alias="id"), user=Depends(require_hr)):
    db = get_db()
    if db is not None:
        result = await db.question_sets.delete_one({"id": id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Question set not found")
    else:
        if id not in question_sets:
            raise HTTPException(status_code=404, detail="Question set not found")
        del question_sets[id]
    return {"success": True, "message": "Question set deleted"}


@router.patch("/hr/questions")
async def update_question_set(request: UpdateQuestionSetRequest, user=Depends(require_hr)):
    check_nosql_injection(request.model_dump(), "update_question_set")
    
    db = get_db()
    update_data = {"updatedAt": datetime.utcnow().isoformat()}
    if request.isActive is not None:
        update_data["isActive"] = request.isActive
    if request.questions is not None:
        update_data["questions"] = request.questions
        update_data["questionCount"] = len(request.questions)

    if db is not None:
        result = await db.question_sets.update_one({"id": request.id}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Question set not found")
    else:
        if request.id not in question_sets:
            raise HTTPException(status_code=404, detail="Question set not found")
        question_sets[request.id].update(update_data)
    return {"success": True, "message": "Question set updated"}


# --- Settings ---

@router.get("/hr/settings")
async def get_hr_settings(user=Depends(require_hr)):
    db = get_db()
    if db is not None:
        settings = await db.settings.find_one({"type": "hr_config"})
        if settings:
            return {
                "max_questions": settings.get("max_questions", 15),
                "adaptive_difficulty": settings.get("adaptive_difficulty", True),
                "voice_input": settings.get("voice_input", True),
            }
    return {"max_questions": 15, "adaptive_difficulty": True, "voice_input": True}


@router.post("/hr/settings")
async def save_hr_settings(request: HRSettingsRequest, user=Depends(require_hr)):
    check_nosql_injection(request.model_dump(), "save_hr_settings")
    db = get_db()
    settings_data = {
        "type": "hr_config", "max_questions": request.max_questions,
        "adaptive_difficulty": request.adaptive_difficulty, "voice_input": request.voice_input,
        "updated_at": datetime.utcnow().isoformat(), "updated_by": user.get("sub"),
    }
    if db is not None:
        await db.settings.update_one({"type": "hr_config"}, {"$set": settings_data}, upsert=True)
    return {"success": True, "message": "Settings saved"}


# --- Scheduling ---

@router.get("/hr/schedule")
async def get_schedule(user=Depends(require_hr)):
    db = get_db()
    schedules = []
    if db is not None:
        async for s in db.schedules.find():
            s["id"] = s.get("id") or str(s["_id"])
            if "_id" in s:
                del s["_id"]
            schedules.append(s)
    return schedules


@router.get("/candidate/schedule")
async def get_my_schedule(user=Depends(get_authenticated_user)):
    db = get_db()
    schedules = []
    if db is not None:
        email = user.get("email")
        if email:
            async for s in db.schedules.find({"candidateEmail": email}):
                s["id"] = s.get("id") or str(s["_id"])
                if "_id" in s:
                    del s["_id"]
                schedules.append(s)
    return schedules


@router.post("/hr/schedule")
async def create_schedule(schedule: ScheduleCreate, user=Depends(require_hr)):
    check_nosql_injection(schedule.model_dump(), "create_schedule")
    # Basic XSS check for candidate name
    check_xss(schedule.candidateName, "candidateName")
    
    db = get_db()
    new_schedule = schedule.dict()
    new_schedule["id"] = str(uuid.uuid4())
    new_schedule["status"] = "scheduled"
    new_schedule["created_at"] = datetime.utcnow().isoformat()
    new_schedule["createdBy"] = user.get("email", "unknown")
    new_schedule["reminderSent24hr"] = False
    new_schedule["reminderSent1hr"] = False
    new_schedule["notificationsSent"] = []
    if "timezone" not in new_schedule:
        new_schedule["timezone"] = "UTC"

    if db is not None:
        await db.schedules.insert_one(new_schedule)
        new_schedule.pop("_id", None)

    # Send invitation email
    try:
        from notification_service import notification_service
        email_result = await notification_service.send_interview_invitation(new_schedule)
        notification_record = {
            "type": "invitation", "sentAt": datetime.utcnow().isoformat(),
            "status": email_result["status"], "message": email_result["message"],
        }
        if db is not None:
            await db.schedules.update_one({"id": new_schedule["id"]}, {"$push": {"notificationsSent": notification_record}})
        if email_result["status"] == "sent":
            new_schedule["status"] = "sent"
            if db is not None:
                await db.schedules.update_one({"id": new_schedule["id"]}, {"$set": {"status": "sent"}})
    except Exception as e:
        print(f"⚠️ Failed to send invitation: {e}")

    return new_schedule


@router.post("/hr/schedule/{schedule_id}/status")
async def update_schedule_status(schedule_id: str, status: str = Query(...), user=Depends(require_hr)):
    db = get_db()
    if db is not None:
        result = await db.schedules.update_one({"id": schedule_id}, {"$set": {"status": status}})
        if result.modified_count == 1:
            return {"success": True}
    return {"success": False}


# --- Rubrics ---

@router.get("/hr/rubrics")
async def get_rubrics(user=Depends(require_hr)):
    db = get_db()
    rubrics = []
    if db is not None:
        async for r in db.rubrics.find():
            r["id"] = r.get("id") or str(r["_id"])
            if "_id" in r:
                del r["_id"]
            rubrics.append(r)
    return rubrics


@router.post("/hr/rubrics")
async def create_rubric(rubric: RubricCreate, user=Depends(require_hr)):
    check_nosql_injection(rubric.model_dump(), "create_rubric")
    check_xss(rubric.name, "rubric_name")
    
    db = get_db()
    new_rubric = rubric.dict()
    new_rubric["id"] = str(uuid.uuid4())
    new_rubric["created_at"] = datetime.utcnow().isoformat()
    if db is not None:
        await db.rubrics.insert_one(new_rubric)
        new_rubric.pop("_id", None)
    return new_rubric


@router.delete("/hr/rubrics/{rubric_id}")
async def delete_rubric(rubric_id: str, user=Depends(require_hr)):
    db = get_db()
    if db is not None:
        await db.rubrics.delete_one({"id": rubric_id})
    return {"success": True}
