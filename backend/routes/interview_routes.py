"""
NewGenPrep - Interview Routes
Handles: upload-resume, start, respond, report, report download, history, stats, calendar
"""

import os
import uuid
import tempfile
import shutil
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Query
from fastapi.responses import Response, HTMLResponse
from pydantic import BaseModel

import pdfplumber
from services.db_service import get_db, get_session, save_session
from routes.auth_routes import get_authenticated_user
from ai_engine import (
    generate_ai_question, extract_resume_data, evaluate_response,
    generate_clarifying_question, transcribe_audio_whisper
)
from report_engine import generate_report_summary, generate_html_report
from security import validate_file_upload, check_nosql_injection, validate_session_id

router = APIRouter(prefix="/api", tags=["Interview"])

def _assert_session_owner(session: Dict[str, Any], user: Dict[str, Any]) -> None:
    user_id = user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user token")
    session_user_id = session.get("user_id")
    if not session_user_id:
        raise HTTPException(status_code=404, detail="Session not found")
    if session_user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized for this session")


# --- Models ---

class StartInterviewRequest(BaseModel):
    session_id: str
    target_company: Optional[str] = None

class RespondRequest(BaseModel):
    session_id: str
    response: str

class TerminateRequest(BaseModel):
    session_id: str
    reason: str
    violation_count: Optional[int] = 0


# --- Endpoints ---

@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...), user=Depends(get_authenticated_user)):
    """Transcribe audio using Azure OpenAI Whisper."""
    try:
        audio_bytes = await audio.read()
        if len(audio_bytes) < 100:
            return {"success": False, "error": "Audio file too small", "transcription": None}

        # Security: validate file type and size before passing to AI
        validate_file_upload(
            audio.filename or "audio.webm",
            audio_bytes,
            upload_type="audio",
            allowed_extensions={".webm"} # Only accepting webm currently
        )

        transcription = await transcribe_audio_whisper(audio_bytes, audio.filename or "audio.webm")

        if transcription:
            return {"success": True, "transcription": transcription, "source": "azure_whisper"}
        else:
            return {"success": False, "error": "Whisper transcription failed", "transcription": None}
    except Exception as e:
        return {"success": False, "error": str(e), "transcription": None}


@router.post("/interview/upload-resume")
async def upload_resume(resume: UploadFile = File(...), user=Depends(get_authenticated_user)):
    """Upload and analyze resume (Max 5MB)."""
    file_bytes = await resume.read()
    await resume.seek(0) # Reset before saving/forwarding
    
    # Security: validate magic bytes, path traversal, extension, and size
    validate_file_upload(
        resume.filename or "resume.pdf",
        file_bytes,
        upload_type="resume",
        allowed_extensions={".pdf"} # Limiting to PDF for now based on pdfplumber usage
    )

    session_id = str(uuid.uuid4())
    temp_dir = tempfile.mkdtemp()
    file_path = os.path.join(temp_dir, resume.filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(resume.file, buffer)

        text = ""
        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    text += (page.extract_text() or "") + "\n"
        except Exception as e:
            print(f"PDF extract error: {e}")
            text = "Error extracting text."

        analysis = await extract_resume_data(text)

        user_id = user.get("sub")
        
        # Enriched Continuity Data mapping
        candidate_name = analysis.get("candidate_name") or "Candidate"
        candidate_email = analysis.get("email") or ""
        candidate_phone = analysis.get("phone") or ""
        professional_summary = analysis.get("professional_summary") or ""
        
        session_data = {
            "session_id": session_id,
            "user_id": user_id,
            "candidate_name": candidate_name,
            "candidate_email": candidate_email,
            "candidate_phone": candidate_phone,
            "professional_summary": professional_summary,
            "resume_filename": resume.filename,
            "resume_analysis": analysis,
            "status": "resume_uploaded",
            "question_count": 0,
            "total_questions": 15,
            "current_stage": 0,
            "conversation_history": [],
            "questions_asked": [],
            "responses": [],
            "answers": [],
            "created_at": datetime.utcnow().isoformat(),
        }
        await save_session(session_id, session_data)

        return {"session_id": session_id, "analysis": analysis}
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


@router.post("/interview/start")
async def start_interview(request: StartInterviewRequest, user=Depends(get_authenticated_user)):
    """Start interview session."""
    # Security validation
    check_nosql_injection(request.model_dump(), "start_interview")
    session_id = validate_session_id(request.session_id)

    session = await get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    _assert_session_owner(session, user)

    if request.target_company:
        session["target_company"] = request.target_company

    session.setdefault("questions_asked", [])
    session.setdefault("conversation_history", [])
    session.setdefault("responses", [])
    session.setdefault("answers", [])
    session.setdefault("total_questions", 15)
    session["clarification_count"] = 0

    analysis = session.get("resume_analysis", {})
    skills = list(analysis.get("technical_skills", {}).keys())
    
    # Continuity: Greet the candidate by name for professional feel
    candidate_name = session.get("candidate_name", "there")
    # If the user has a registered name that differs from 'there', prefer it if we want to, 
    # but based on requirements we use what's on the resume via candidate_name.
    
    opening_question = (
        f"Hello {candidate_name}! I'm your AI interviewer today. I've reviewed your resume and I can see you have "
        f"experience with {', '.join(skills[:3]) if skills else 'various technologies'}. "
        "Let's start with an easy one - can you tell me about yourself and what excites you most "
        "about your career?"
    )

    session["status"] = "in_progress"
    session["question_count"] = 1
    session["current_stage"] = 1
    session["questions_asked"].append({
        "number": 1, "text": opening_question, "type": "intro",
        "stage": 1, "source": "resume", "asked_at": datetime.utcnow().isoformat(),
    })
    session["conversation_history"].append({"role": "assistant", "content": opening_question})

    await save_session(request.session_id, session)

    return {
        "question": opening_question,
        "question_number": 1,
        "stage": 1,
        "total_questions": 15,
        "stage_info": {
            "current": "Resume-Based Questions",
            "stages": [
                {"name": "Resume-Based", "questions": "1-5", "description": "Questions from your resume skills and projects"},
                {"name": "General Technical", "questions": "6-10", "description": "General technical questions based on your skill set"},
                {"name": "HR & Behavioral", "questions": "11-15", "description": "HR and behavioral interview questions"},
            ],
        },
    }


@router.post("/interview/respond")
async def respond_to_question(request: RespondRequest, user=Depends(get_authenticated_user)):
    """Process response and get next question."""
    # Security validation
    check_nosql_injection(request.model_dump(), "respond_request")
    session_id = validate_session_id(request.session_id)

    db = get_db()
    session = await get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    _assert_session_owner(session, user)

    session.setdefault("responses", [])
    session.setdefault("questions_asked", [])
    session.setdefault("conversation_history", [])
    session.setdefault("question_count", 0)
    session.setdefault("total_questions", 15)
    session.setdefault("current_stage", 0)
    session.setdefault("answers", [])

    current_q = session.get("question_count", 0)
    total_q = session.get("total_questions", 15)
    response_text = request.response

    current_question_text = "Unknown Question"
    if session.get("questions_asked"):
        current_question_text = session["questions_asked"][-1].get("text", "")

    # Fetch rubric competencies if assigned
    rubric_competencies = None
    if session.get("assigned_rubric_id") and db is not None:
        try:
            rubric = await db.rubrics.find_one({"id": session["assigned_rubric_id"]})
            if rubric and rubric.get("competencies"):
                rubric_competencies = rubric["competencies"]
        except Exception:
            pass

    # AI Evaluation
    evaluation = await evaluate_response(
        current_question_text, response_text, rubric_competencies,
        stage=session.get("current_stage", 1)
    )

    quality_score = evaluation.get("quality_score", 5)
    relevance_score = evaluation.get("relevance_score", 5)
    feedback_text = evaluation.get("feedback", "")
    detected_skills = evaluation.get("detected_skills", [])
    competency_scores = evaluation.get("competency_scores", {})

    session["responses"].append({
        "question_number": current_q,
        "text": response_text,
        "quality_score": quality_score,
        "relevance_score": relevance_score,
        "competency_scores": competency_scores,
        "detected_skills": detected_skills,
        "confidence_level": "high" if quality_score > 7 else "medium" if quality_score > 4 else "low",
        "responded_at": datetime.utcnow().isoformat(),
    })
    session["conversation_history"].append({"role": "user", "content": response_text})

    # Check if interview is complete
    if current_q + 1 > total_q:
        session["status"] = "completed"
        session["completed_at"] = datetime.utcnow().isoformat()
        session["report"] = generate_report_summary(session)
        await save_session(request.session_id, session)
        return {
            "is_complete": True,
            "message": "Interview completed! Thank you for your time.",
            "question_number": current_q,
            "stage": 3,
            "total_questions": total_q,
            "report": session["report"],
        }

    # Determine total questions and distribution
    total_questions = 15
    assigned_rubric_id = session.get("assigned_rubric_id")
    if assigned_rubric_id and db is not None:
        try:
            rubric = await db.rubrics.find_one({"id": assigned_rubric_id})
            if rubric:
                total_questions = max(15, rubric.get("totalQuestions", 15))
        except Exception:
            pass

    resume_count = total_questions // 3 + (1 if total_questions % 3 > 0 else 0)
    role_count = total_questions // 3 + (1 if total_questions % 3 > 1 else 0)

    next_q_num = current_q + 1
    stage = 1 if next_q_num <= resume_count else 2 if next_q_num <= (resume_count + role_count) else 3

    # Clarification logic
    clarification_count = session.get("clarification_count", 0)
    max_clarification_attempts = int(os.getenv("MAX_CLARIFICATION_ATTEMPTS", "2"))
    clarification_threshold = int(os.getenv("CLARIFICATION_QUALITY_THRESHOLD", "3"))

    next_question = ""
    source = ""
    q_type = "technical" if stage in [1, 2] else "behavioral"

    if quality_score <= clarification_threshold and relevance_score > 3 and clarification_count < max_clarification_attempts:
        analysis = session.get("resume_analysis", {})
        clarifying_q = await generate_clarifying_question(current_question_text, response_text, analysis)
        if not clarifying_q:
            clarifying_q = "Could you please elaborate more on that answer? Providing specific details would really help."

        next_question = clarifying_q
        next_q_num = current_q
        source = "ai_clarification"
        q_type = "clarification"
        feedback_text = f"{feedback_text} Let's dig a little deeper."
        session["clarification_count"] = clarification_count + 1
    else:
        session["clarification_count"] = 0
        previous_texts = [q.get("text", "") for q in session.get("questions_asked", [])]

        q_pool_type = "resume" if stage == 1 else "general" if stage == 2 else "hr"
        hr_pool = []
        if db is not None and stage >= 2:
            try:
                async for qs in db.question_sets.find({"isActive": True}):
                    cat = qs.get("category", "").lower()
                    if any(k in cat for k in ["hr", "behavioral", "soft", "culture"]):
                        hr_pool.extend([q["text"] if isinstance(q, dict) else q for q in qs.get("questions", [])])
            except Exception:
                pass

        target_company = session.get("target_company")
        ai_res = await generate_ai_question(
            resume_analysis=session.get("resume_analysis", {}),
            question_type=q_pool_type,
            question_number=next_q_num,
            previous_questions=previous_texts,
            hr_questions=hr_pool,
            company=target_company,
        )

        if ai_res:
            next_question = ai_res["question"]
            source = ai_res["source"]
        else:
            resume_fallbacks = [
                "Can you walk me through the most technically challenging project on your resume?",
                "What was the most difficult bug you encountered and how did you resolve it?",
                "Tell me about a time you had to learn a new technology quickly.",
                "How do you ensure the quality and reliability of the code you write?",
                "What architectural decisions are you most proud of?",
            ]
            general_fallbacks = [
                "How do you approach designing a scalable system from scratch?",
                "What are your strategies for debugging complex production issues?",
                "Can you explain trade-offs between database technologies you've used?",
                "How do you handle technical debt while meeting tight deadlines?",
                "Tell me about your experience with CI/CD and automated testing.",
            ]
            hr_fallbacks = [
                "Tell me about a time you had a significant disagreement with a teammate.",
                "Where do you see yourself professionally in five years?",
                "What kind of work environment allows you to be most productive?",
                "Tell me about a time you failed. What did you learn?",
                "How do you prioritize tasks with multiple competing deadlines?",
            ]
            pool = resume_fallbacks if stage == 1 else general_fallbacks if stage == 2 else hr_fallbacks
            next_question = next(
                (q for q in pool if q.lower() not in [pq.lower() for pq in previous_texts]),
                pool[next_q_num % len(pool)],
            )
            source = "static_fallback"

    # Stage transition feedback
    feedback = feedback_text or ("Great answer!" if quality_score > 7 else "Good response." if quality_score > 4 else "Thank you.")
    current_q_stage = session.get("current_stage", 1)
    if stage > current_q_stage:
        if stage == 2:
            feedback = f"Great, we've covered your experience. Now let's dive into some technical alignment questions. {feedback}"
        elif stage == 3:
            feedback = f"Excellent. To wrap up, I'd like to ask a few behavioral questions. {feedback}"

    session["question_count"] = next_q_num
    session["current_stage"] = stage
    session["questions_asked"].append({
        "number": next_q_num, "text": next_question, "type": q_type,
        "stage": stage, "source": source, "asked_at": datetime.utcnow().isoformat(),
    })
    session["conversation_history"].append({"role": "assistant", "content": f"{feedback} {next_question}"})

    await save_session(request.session_id, session)

    return {
        "question": next_question,
        "question_number": next_q_num,
        "stage": stage,
        "feedback": feedback,
        "analysis": evaluation,
    }


@router.get("/interview/report/{session_id}")
async def get_report(session_id: str, user=Depends(get_authenticated_user)):
    """Get detailed interview report."""
    db = get_db()
    session = await get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    _assert_session_owner(session, user)

    responses = session.get("responses", [])
    questions = session.get("questions_asked", [])
    analysis = session.get("resume_analysis", {})

    avg_score = sum(r.get("quality_score", 0) for r in responses) / len(responses) if responses else 0
    all_skills = [s for r in responses for s in r.get("detected_skills", [])]
    skill_counts = {}
    for skill in all_skills:
        skill_counts[skill] = skill_counts.get(skill, 0) + 1

    conversation_log = []
    for i, q in enumerate(questions):
        response = responses[i] if i < len(responses) else None
        conversation_log.append({"question": q, "response": response})

    candidate_name = "Candidate"
    candidate_email = ""
    if db is not None:
        user_id = session.get("user_id")
        if user_id:
            user_doc = await db.users.find_one({"id": user_id})
            if user_doc:
                candidate_name = user_doc.get("name", "Candidate")
                candidate_email = user_doc.get("email", "")

    return {
        "interview_summary": {
            "session_id": session_id,
            "candidate_name": candidate_name,
            "candidate_email": candidate_email,
            "total_questions": len(questions),
            "total_responses": len(responses),
            "average_quality_score": round(avg_score, 1),
            "coverage_percentage": (len(responses) / 15) * 100,
            "status": session.get("status", "unknown"),
            "started_at": session.get("created_at"),
            "completed_at": session.get("completed_at"),
        },
        "skills_assessment": {
            "detected_skills": skill_counts,
            "strongest_skills": sorted(skill_counts.keys(), key=lambda x: skill_counts[x], reverse=True)[:5],
            "strength_scores": {skill: min(10, count * 2) for skill, count in skill_counts.items()},
        },
        "performance_rating": {
            "rating": "Excellent" if avg_score > 8 else "Good" if avg_score > 6 else "Average",
            "score": round(avg_score, 1),
        },
        "conversation_log": conversation_log,
        "resume_analysis": analysis,
    }


@router.get("/interview/report/{session_id}/download")
async def download_report(session_id: str, user=Depends(get_authenticated_user)):
    """Download interview report as HTML file."""
    db = get_db()
    session = await get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    _assert_session_owner(session, user)

    candidate_name = "Candidate"
    if db is not None:
        user_id = session.get("user_id")
        if user_id:
            user_doc = await db.users.find_one({"id": user_id})
            if user_doc:
                candidate_name = user_doc.get("name", "Candidate")

    html_content = generate_html_report(session, candidate_name)
    return Response(
        content=html_content,
        media_type="text/html",
        headers={"Content-Disposition": f"attachment; filename=NewGenPrep_Report_{session_id[:8]}.html"},
    )


@router.get("/interview/history")
async def get_interview_history(user=Depends(get_authenticated_user)):
    """Get interview history for current user."""
    db = get_db()
    history = []
    user_id = user.get("sub")

    if db is not None:
        async for session in db.sessions.find({"user_id": user_id}).sort("created_at", -1).limit(10):
            responses = session.get("responses", [])
            avg_score = sum(r.get("quality_score", 0) for r in responses) / len(responses) if responses else None
            history.append({
                "sessionId": session.get("session_id"),
                "status": session.get("status"),
                "questionsAnswered": len(responses),
                "totalQuestions": session.get("total_questions", 15),
                "averageScore": round(avg_score, 1) if avg_score else None,
                "performanceRating": "Good" if avg_score and avg_score > 6 else "Average" if avg_score else None,
                "startedAt": session.get("created_at"),
                "completedAt": session.get("completed_at"),
                "resumeFileName": session.get("resume_filename", "resume.pdf"),
                "strongestSkills": list(set([s for r in responses for s in r.get("detected_skills", [])]))[:3],
            })

    return history


@router.get("/interview/stats")
async def get_user_stats(user=Depends(get_authenticated_user)):
    """Get user statistics."""
    db = get_db()
    user_id = user.get("sub")
    total = completed = in_progress = 0
    all_scores = []
    all_skills = []

    if db is not None:
        total = await db.sessions.count_documents({"user_id": user_id})
        completed = await db.sessions.count_documents({"user_id": user_id, "status": "completed"})
        in_progress = await db.sessions.count_documents({"user_id": user_id, "status": "in_progress"})

        async for session in db.sessions.find({"user_id": user_id, "status": "completed"}):
            responses = session.get("responses", [])
            if responses:
                avg = sum(r.get("quality_score", 0) for r in responses) / len(responses)
                all_scores.append(avg)
                for r in responses:
                    all_skills.extend(r.get("detected_skills", []))

    skill_counts = {}
    for skill in all_skills:
        skill_counts[skill] = skill_counts.get(skill, 0) + 1
    top_skills = sorted(skill_counts.keys(), key=lambda x: skill_counts[x], reverse=True)[:5]

    return {
        "totalInterviews": total,
        "completedInterviews": completed,
        "inProgress": in_progress,
        "averageScore": round(sum(all_scores) / len(all_scores), 1) if all_scores else 0,
        "topSkills": top_skills,
        "skillsImproved": len(set(all_skills)),
        "recentScores": [{"date": f"Interview {i+1}", "score": round(s, 1)} for i, s in enumerate(all_scores[-5:])],
    }


@router.get("/interview/{session_id}/calendar")
async def get_interview_calendar(session_id: str, user=Depends(get_authenticated_user)):
    """Generate .ics calendar file for the interview."""
    db = get_db()
    session = await get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    _assert_session_owner(session, user)

    event_date = session.get("date")
    event_time = session.get("time")

    if not event_date and db is not None:
        schedule = await db.schedules.find_one({"id": session_id})
        if schedule:
            event_date = schedule.get("date")
            event_time = schedule.get("time")

    if not event_date:
        event_date = datetime.utcnow().strftime("%Y-%m-%d")
        event_time = "10:00"

    try:
        start_dt = datetime.strptime(f"{event_date} {event_time}", "%Y-%m-%d %H:%M")
        end_dt = start_dt + timedelta(hours=1)

        ics_content = (
            "BEGIN:VCALENDAR\r\n"
            "VERSION:2.0\r\n"
            "PRODID:-//NewGenPrep//EN\r\n"
            "BEGIN:VEVENT\r\n"
            f"UID:{session_id}@newgenprep.com\r\n"
            f"DTSTAMP:{datetime.utcnow().strftime('%Y%m%dT%H%M%S')}Z\r\n"
            f"DTSTART:{start_dt.strftime('%Y%m%dT%H%M%S')}\r\n"
            f"DTEND:{end_dt.strftime('%Y%m%dT%H%M%S')}\r\n"
            "SUMMARY:NewGenPrep Interview Session\r\n"
            f"DESCRIPTION:Interview for {session.get('candidate_name', 'Candidate')}.\r\n"
            "END:VEVENT\r\n"
            "END:VCALENDAR\r\n"
        )

        return Response(
            content=ics_content, media_type="text/calendar",
            headers={"Content-Disposition": f"attachment; filename=interview_{session_id}.ics"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate calendar: {str(e)}")

@router.post("/interview/terminate")
async def terminate_interview(request: TerminateRequest, user=Depends(get_authenticated_user)):
    """Early termination of an interview."""
    session_id = validate_session_id(request.session_id)
    session = await get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    _assert_session_owner(session, user)

    session["status"] = "completed"
    session["completed_at"] = datetime.utcnow().isoformat()
    session["termination_reason"] = request.reason
    session["violation_count"] = request.violation_count

    # Generate final report capturing what was done so far
    session["report"] = generate_report_summary(session)
    await save_session(session_id, session)

    return {
        "success": True,
        "message": "Interview terminated successfully",
        "report": session["report"]
    }
