"""
Helper functions for refined question selection logic.
Implements 5-5-5 pattern:
- Q1-5: Resume-based technical (AI)
- Q6-10: Role-based non-technical (AI)  
- Q11-15: HR behavioral (from sets + AI fallback)
"""

import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime


async def generate_resume_based_question(session: dict, db, question_number: int) -> dict:
    """
    Generate AI-powered technical question based on resume content.
    Goal: Verify authenticity of claimed skills/projects/experience.
    
    Security: Uses sanitized resume data, no direct user input
    Rate Limiting: Controlled by Azure OpenAI API limits
    """
    from ai_engine import generate_resume_question
    
    resume_analysis = session.get("resume_analysis", {})
    skills = resume_analysis.get("skills", [])
    projects = resume_analysis.get("projects", [])
    experience = resume_analysis.get("experience", [])
    
    # Sanitize and limit data size for AI calls (security best practice)
    skills_str = ", ".join(skills[:10]) if skills else "general programming"
    projects_str = ", ".join([p.get("name", "") for p in projects[:5]]) if projects else "various projects"
    experience_str = ", ".join([e.get("role", "") for e in experience[:3]]) if experience else "software development"
    
    prompt = f"""Based on this candidate's resume:
- Skills: {skills_str}
- Projects: {projects_str}
- Experience: {experience_str}

Generate a technical question (Question {question_number}) that:
1. Probes the authenticity of their claimed skills/projects
2. Asks for specific examples or implementation details
3. Cannot be answered with surface-level knowledge

Examples:
- "I see you worked on [Project X]. Can you explain the architecture you implemented?"
- "You mentioned proficiency in [Technology Y]. Walk me through how you used it in a recent project."

Question:"""
    
    try:
        question_text = await generate_resume_question(prompt, resume_analysis)
        
        if not question_text:
            # Fallback to generic technical question
            fallback = [
                "Tell me about your most significant technical project and your specific contributions.",
                "Describe a complex technical problem you solved and your approach.",
                "What technologies are you most proficient in and how have you applied them?",
                "Walk me through a challenging bug you debugged and how you resolved it.",
                "Explain a project where you had to learn a new technology quickly."
            ]
            question_text = fallback[min(question_number - 1, len(fallback) - 1)]
            
    except Exception as e:
        print(f"⚠️ Error generating resume question: {e}")
        question_text = f"Tell me about your experience with {skills[0] if skills else 'software development'}."
    
    return {
        "text": question_text,
        "type": "resume_based",
        "section": "technical_verification",
        "source": "ai_resume_analysis",
        "question_number": question_number
    }


async def generate_role_based_question(session: dict, db, question_number: int) -> dict:
    """
    Generate AI-powered role-based non-technical question.
    Role comes from schedule (if HR specified) or AI inference from resume.
    
    Security: Uses validated role string, sanitized inputs
    Rate Limiting: Controlled by Azure OpenAI API limits
    """
    from ai_engine import infer_role_from_resume, generate_role_question
    
    # 1. Try to get role from schedule
    role = None
    if session.get("schedule_id") and db is not None:
        try:
            schedule = await db.schedules.find_one({"id": session["schedule_id"]})
            role = schedule.get("role") if schedule else None
            if role:
                print(f"   📋 Using role from schedule: {role}")
        except Exception as e:
            print(f"   ⚠️ Error fetching schedule: {e}")
    
    # 2. Fallback: AI infers role from resume
    if not role:
        resume_analysis = session.get("resume_analysis", {})
        try:
            role = await infer_role_from_resume(resume_analysis)
            print(f"   🤖 AI inferred role: {role}")
            
            # Save inferred role to session for consistency
            if db is not None:
                await db.sessions.update_one(
                    {"session_id": session["session_id"]},
                    {"$set": {"inferred_role": role}}
                )
        except Exception as e:
            print(f"   ⚠️ Error inferring role: {e}")
            role = "Software Developer"  # Safe default
    
    # Sanitize role (security best practice)
    role = role[:100] if role else "Software Developer"
    
    # 3. Generate role-specific non-technical question
    prompt = f"""The candidate is applying for: {role}

Generate a non-technical question (Question {question_number}) that assesses:
- Their understanding of the role
- Their motivation and alignment with role expectations
- Situational judgment relevant to this role

Examples for a "{role}":
- "What do you think are the top 3 challenges for a {role} in our industry?"
- "How would you prioritize tasks if given multiple conflicting deadlines?"
- "What aspects of the {role} role excite you the most?"

Question:"""
    
    try:
        question_text = await generate_role_question(prompt, role)
        
        if not question_text:
            # Fallback to generic role question
            fallback = [
                f"What do you think are the key responsibilities of a {role}?",
                f"How would you approach learning new skills required for the {role} role?",
                f"Describe your ideal work environment as a {role}.",
                f"What motivates you to excel in the {role} position?",
                f"How do you stay updated with trends in your field as a {role}?"
            ]
            question_text = fallback[min(question_number - 6, len(fallback) - 1)]
            
    except Exception as e:
        print(f"⚠️ Error generating role question: {e}")
        question_text = f"What interests you most about the {role} position?"
    
    return {
        "text": question_text,
        "type": "role_based",
        "section": "role_alignment",
        "source": "ai_role_analysis",
        "role": role,
        "question_number": question_number
    }


async def generate_hr_behavioral_question(session: dict, db, question_number: int, previous_questions: List[str]) -> dict:
    """
    Get HR behavioral question from question sets with AI fallback.
    Priority: Mandatory sets > Optional sets > AI generation
    
    Security: Uses DB queries with proper sanitization
    Rate Limiting: DB access is limited, AI fallback controlled by Azure
    """
    from ai_engine import generate_behavioral_question
    
    # 1. Try to fetch from HR question sets (Stage 3: HR/Behavioral)
    if db is not None:
        try:
            hr_question_sets = await db.question_sets.find({
                "isActive": True,
                "$or": [
                    {"category": {"$regex": "hr", "$options": "i"}},
                    {"category": {"$regex": "behavioral", "$options": "i"}},
                    {"category": {"$regex": "soft", "$options": "i"}},
                    {"category": {"$regex": "culture", "$options": "i"}}
                ]
            }).to_list(length=50)  # Limit results for performance
            
            if hr_question_sets:
                # Separate mandatory and optional
                mandatory_sets = [qs for qs in hr_question_sets if qs.get("isMandatory", False)]
                optional_sets = [qs for qs in hr_question_sets if not qs.get("isMandatory", False)]
                
                # Try mandatory first
                for qset in mandatory_sets:
                    questions = qset.get("questions", [])
                    for q in questions:
                        q_data = q if isinstance(q, dict) else {"text": str(q), "id": str(uuid.uuid4())}
                        q_text = q_data.get("text", "")
                        
                        if q_text and q_text not in previous_questions:
                            # Found unique mandatory question - update usage stats
                            await update_question_usage(db, qset, q_data)
                            
                            return {
                                "text": q_text,
                                "type": "hr_behavioral",
                                "section": "behavioral",
                                "source": "hr_mandatory",
                                "set_id": qset.get("id"),
                                "set_category": qset.get("category"),
                                "question_number": question_number
                            }
                
                # Try optional sets
                for qset in optional_sets:
                    questions = qset.get("questions", [])
                    for q in questions:
                        q_data = q if isinstance(q, dict) else {"text": str(q), "id": str(uuid.uuid4())}
                        q_text = q_data.get("text", "")
                        
                        if q_text and q_text not in previous_questions:
                            await update_question_usage(db, qset, q_data)
                            
                            return {
                                "text": q_text,
                                "type": "hr_behavioral",
                                "section": "behavioral",
                                "source": "hr_optional",
                                "set_id": qset.get("id"),
                                "set_category": qset.get("category"),
                                "question_number": question_number
                            }
        except Exception as e:
            print(f"⚠️ Error fetching HR questions: {e}")
    
    # 2. AI Fallback: Generate HR/behavioral question
    print(f"   🤖 No HR questions available, using AI fallback for Q{question_number}")
    
    prompt = f"""Generate a professional HR/behavioral interview question (Question {question_number}).

Focus areas:
- Teamwork and collaboration
- Conflict resolution  
- Work ethic and motivation
- Handling pressure and stress
- Communication skills

Use STAR method format (Situation, Task, Action, Result).

Examples:
- "Tell me about a time when you had to work with a difficult team member. How did you handle it?"
- "Describe a situation where you faced a tight deadline. What was your approach?"

Question:"""
    
    try:
        question_text = await generate_behavioral_question(prompt)
        
        if not question_text:
            # Final static fallback
            fallback = [
                "Tell me about a conflict you resolved with a colleague.",
                "Where do you see your career in 5 years?",
                "What motivates you in your professional life?",
                "Describe a time you worked under pressure.",
                "How do you handle constructive criticism?"
            ]
            question_text = fallback[min(question_number - 11, len(fallback) - 1)]
            
    except Exception as e:
        print(f"⚠️ Error generating behavioral question: {e}")
        question_text = "Tell me about a challenging team situation you navigated successfully."
    
    return {
        "text": question_text,
        "type": "hr_behavioral",
        "section": "behavioral",
        "source": "ai_fallback",
        "question_number": question_number
    }


async def update_question_usage(db, question_set: dict, question_data: dict):
    """
    Update usage statistics for a question and its set.
    
    Security: Uses parameterized queries to prevent injection
    """
    try:
        question_id = question_data.get("id", str(uuid.uuid4()))
        set_id = question_set.get("id")
        
        # Update individual question usage
        await db.question_sets.update_one(
            {"id": set_id, "questions.id": question_id},
            {
                "$inc": {"questions.$.usageCount": 1},
                "$set": {"questions.$.lastUsedAt": datetime.utcnow()}
            }
        )
        
        # Update set-level usage
        await db.question_sets.update_one(
            {"id": set_id},
            {
                "$inc": {"totalUsageCount": 1},
                "$set": {"lastUsedAt": datetime.utcnow()}
            }
        )
        
        print(f"   📈 Updated usage stats for question set: {question_set.get('category')}")
    except Exception as e:
        print(f"   ⚠️ Failed to update usage stats: {e}")
