"""
NewGenPrep - Practice Routes
Handles: generate practice questions, evaluate answers, mock presets, mock questions
"""

import json
import os
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from routes.auth_routes import get_authenticated_user

router = APIRouter(prefix="/api/practice", tags=["Practice"])


class PracticeGenerateRequest(BaseModel):
    category: str
    company: Optional[str] = None
    role: Optional[str] = None
    skills: Optional[List[str]] = None
    count: int = 5

class PracticeEvaluateRequest(BaseModel):
    question: str
    answer: str
    category: Optional[str] = "general"


@router.post("/generate")
async def generate_practice_questions(request: PracticeGenerateRequest, user=Depends(get_authenticated_user)):
    """Generate dynamic practice questions."""
    try:
        from ai_engine import generate_practice_questions as gen
        questions = await gen(
            category=request.category, company=request.company,
            role=request.role, skills=request.skills, count=request.count,
        )
        return {"questions": questions}
    except Exception as e:
        print(f"Practice generation error: {e}")
        return {"questions": [], "error": str(e)}


@router.post("/evaluate")
async def evaluate_practice_answer(request: PracticeEvaluateRequest, user=Depends(get_authenticated_user)):
    """Evaluate a single practice answer."""
    try:
        from ai_engine import evaluate_response
        evaluation = await evaluate_response(
            request.question, request.answer,
            stage=3 if request.category == "behavioral" else 1,
        )
        return evaluation
    except Exception as e:
        return {"error": str(e), "quality_score": 5, "relevance_score": 5, "feedback": "Evaluation unavailable."}


@router.get("/mock/presets")
async def get_mock_presets(user=Depends(get_authenticated_user)):
    """Get available role-company combinations for mock interviews."""
    try:
        mock_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "mock_questions.json")
        if not os.path.exists(mock_file):
            return {"presets": []}

        with open(mock_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        presets = [
            {
                "role": qs["role"], "company": qs["company"],
                "difficulty": qs.get("difficulty", "Hard"),
                "question_count": len(qs.get("questions", [])),
            }
            for qs in data.get("question_sets", [])
        ]
        return {"presets": presets}
    except Exception as e:
        return {"presets": []}


@router.post("/mock/questions")
async def get_mock_questions(request: dict, user=Depends(get_authenticated_user)):
    """Get mock questions for a specific role and company."""
    try:
        role = request.get("role")
        company = request.get("company")
        if not role or not company:
            raise HTTPException(status_code=400, detail="Role and company required")

        mock_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "mock_questions.json")
        if not os.path.exists(mock_file):
            return {"questions": []}

        with open(mock_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        for qs in data.get("question_sets", []):
            if qs["role"] == role and qs["company"] == company:
                return {"questions": qs.get("questions", [])}

        return {"questions": []}
    except Exception as e:
        return {"questions": []}
