import os
import json
import pathlib
from typing import List, Dict, Any, Optional

import httpx
from dotenv import load_dotenv

# Ensure env vars are loaded even if this module is imported before interview_api.py loads .env
env_paths = [
    pathlib.Path(__file__).parent / ".env",  # scripts/backend/.env
    pathlib.Path(__file__).parent.parent.parent / ".env",  # repo root .env
    pathlib.Path.cwd() / ".env",  # current working directory
]
for env_path in env_paths:
    if env_path.exists():
        load_dotenv(dotenv_path=env_path, override=True)
        break
else:
    load_dotenv()

AZURE_OPENAI_KEY = os.getenv("AZURE_OPENAI_KEY")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT") or os.getenv("AZURE_OPENAI_BASE")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT") or os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT", "o4-mini")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2025-01-01-preview")

# Whisper deployment for Speech-to-Text
AZURE_WHISPER_DEPLOYMENT = os.getenv("AZURE_WHISPER_DEPLOYMENT", "whisper")
AZURE_WHISPER_API_VERSION = os.getenv("AZURE_WHISPER_API_VERSION", "2024-06-01")

# Debug: Show Azure OpenAI configuration status (ASCII-only for Windows consoles)
print("[ai] Azure OpenAI Configuration:")
print(f"[ai] KEY: {'SET' if AZURE_OPENAI_KEY else 'MISSING'}")
print(
    f"[ai] ENDPOINT: {'SET' if AZURE_OPENAI_ENDPOINT else 'MISSING'} "
    "(checked: AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_BASE)"
)
print(f"[ai] DEPLOYMENT: {AZURE_OPENAI_DEPLOYMENT}")
print(f"[ai] WHISPER_DEPLOYMENT: {AZURE_WHISPER_DEPLOYMENT}")
print(f"[ai] API_VERSION: {AZURE_OPENAI_API_VERSION}")
if AZURE_OPENAI_KEY and AZURE_OPENAI_ENDPOINT:
    print("[ai] Azure OpenAI is CONFIGURED and ready to use")
else:
    print("[ai] Azure OpenAI will use FALLBACK (static questions)")


async def transcribe_audio_whisper(audio_bytes: bytes, filename: str = "audio.webm") -> Optional[str]:
    """
    Transcribe audio using Azure OpenAI Whisper deployment.
    Returns transcribed text or None if failed.
    """
    if not AZURE_OPENAI_KEY or not AZURE_OPENAI_ENDPOINT:
        print("[whisper] Azure OpenAI not configured, cannot transcribe")
        return None
    
    url = (
        f"{AZURE_OPENAI_ENDPOINT.rstrip('/')}/openai/deployments/"
        f"{AZURE_WHISPER_DEPLOYMENT}/audio/transcriptions?api-version={AZURE_WHISPER_API_VERSION}"
    )
    
    headers = {
        "api-key": AZURE_OPENAI_KEY,
    }
    
    # Prepare multipart form data
    files = {
        "file": (filename, audio_bytes, "audio/webm"),
    }
    data = {
        "response_format": "text",
        "language": "en",
    }
    
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(url, headers=headers, files=files, data=data)
            
            if resp.status_code == 200:
                transcription = resp.text.strip()
                print(f"[whisper] ✅ Transcribed: {transcription[:100]}...")
                return transcription
            else:
                print(f"[whisper] ❌ Error {resp.status_code}: {resp.text[:200]}")
                return None
    except Exception as e:
        print(f"[whisper] ❌ Exception: {e}")
        return None



def _is_configured() -> bool:
    ok = bool(AZURE_OPENAI_KEY and AZURE_OPENAI_ENDPOINT)
    if not ok:
        print("[ai] Azure OpenAI config missing: ",
              f"KEY={'set' if AZURE_OPENAI_KEY else 'missing'}, ",
              f"ENDPOINT={'set' if AZURE_OPENAI_ENDPOINT else 'missing'}")
    return ok


async def _call_azure_openai(messages: List[Dict[str, str]], max_tokens: int = 300) -> Optional[str]:
    if not _is_configured():
        return None

    url = (
        f"{AZURE_OPENAI_ENDPOINT.rstrip('/')}/openai/deployments/"
        f"{AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version={AZURE_OPENAI_API_VERSION}"
    )
    headers = {
        "Content-Type": "application/json",
        "api-key": AZURE_OPENAI_KEY,
    }
    payload = {
        "messages": messages,
        "max_completion_tokens": max_tokens,  # o-series models use this instead of max_tokens
        #"temperature": 0.6, # o-series models usually don't support temperature (fixed at 1)
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(url, headers=headers, json=payload)
        if resp.status_code != 200:
            try:
                err = resp.text
            except Exception:
                err = str(resp.status_code)
            print(f"[ai] Azure OpenAI error: {err}")
            return None
        data = resp.json()
        return data.get("choices", [{}])[0].get("message", {}).get("content")


def _flatten_skills(resume_analysis: Dict[str, Any]) -> List[str]:
    # Try all common keys
    tech = (resume_analysis.get("technical_skills") or 
            resume_analysis.get("technicalSkills") or 
            resume_analysis.get("skills") or 
            {})
    
    if isinstance(tech, list):
        return [str(s) for s in tech]
    
    if isinstance(tech, dict):
        all_values = []
        for k, v in tech.items():
            if isinstance(v, list):
                all_values.extend([str(x) for x in v])
            elif isinstance(v, str):
                all_values.append(v)
            else:
                all_values.append(str(v))
        return all_values
    
    return []

def _projects(resume_analysis: Dict[str, Any]) -> List[str]:
    projects = resume_analysis.get("projects") or []
    return projects if isinstance(projects, list) else []

async def generate_ai_question(
    resume_analysis: Dict[str, Any],
    question_type: str,
    question_number: int,
    previous_questions: List[str],
    hr_questions: Optional[List[str]] = None,
    company: Optional[str] = None,
) -> Optional[Dict[str, str]]:
    """
    Returns {"question": str, "source": str} or None if AI not available.
    """
    skills = _flatten_skills(resume_analysis)
    projects = _projects(resume_analysis)
    experience = resume_analysis.get("experience_level") or resume_analysis.get("experienceLevel") or resume_analysis.get("experience") or ""

    if not skills and question_type != "hr":
        print(f"[ai] ⚠️ WARNING: No skills detected in resume analysis. AI questions may be generic.")

    print(f"[ai] Generating {question_type} question #{question_number} (Skills count: {len(skills)}) for {company or 'General'}")

    # Prioritize uploaded HR questions ONLY for the HR stage
    if question_type == "hr" and hr_questions:
        unused = [q for q in hr_questions if all(q.lower() not in pq.lower() for pq in previous_questions)]
        if unused:
            print(f"[ai] Using uploaded HR question for stage 3")
            return {"question": unused[0], "source": "hr_uploaded"}

    # Define Company Personas
    company_style = ""
    if company:
        c_lower = company.lower()
        if "google" in c_lower:
            company_style = "GOOGLE STYLE: Focus on General Cognitive Ability (GCA), data structures, algorithmic efficiency (Big O), and large-scale distributed systems. Be highly analytical."
        elif "amazon" in c_lower:
            company_style = "AMAZON STYLE: Heavily emphasize the 16 Leadership Principles (LPs). Every question should probe for Ownership, Bias for Action, or Insisting on Highest Standards. Use 'Working Backwards' methodology."
        elif "meta" in c_lower or "facebook" in c_lower:
            company_style = "META STYLE: Focus on 'Move Fast' philosophy, rapid iteration, product engineering at massive scale, and horizontal scalability. Be pragmatic and product-focused."
        elif "netflix" in c_lower:
            company_style = "NETFLIX STYLE: Focus on 'Freedom & Responsibility', Chaos Engineering, extreme ownership, and performance-based culture. Probing for context rather than control."
        else:
            company_style = f"{company.upper()} STYLE: Adopt the professional hiring bar and engineering culture of {company}."

    if question_type == "resume":
        system_prompt = (
            f"You are a Senior Technical Interviewer at a top-tier tech company. {company_style} "
            "Generate one deep technical question based on their resume. "
            "Avoid basic definitions. Focus on architectural decisions, trade-offs, and challenges. "
            "Ask 'Why' and 'How' regarding their specific projects and skills. "
            "Challenge their knowledge deeply. If they mention a tool, ask about its internal workings or trade-offs."
        )
        user_prompt = (
            f"Skills: {', '.join(skills[:15])}\n"
            f"Projects: {', '.join(projects[:5])}\n"
            f"Experience: {experience}\n"
            f"Previous questions: {' | '.join(previous_questions[-3:])}\n"
            f"Generate technical question #{question_number}."
        )
    elif question_type == "general":
        system_prompt = (
            f"You are a Senior Architect assessing a candidate's alignment with their target role. {company_style} "
            "Generate one technical question that tests their understanding of the broader ecosystem of the tools they use. "
            "Focus on 'Role Alignment' and 'System Design'. How do they approach performance, observability, and scalability in their domain? "
            "Do NOT ask basic definitions. Ask a scenario-based question. "
        )
        user_prompt = (
            f"Skills: {', '.join(skills[:15])}\n"
            f"Experience: {experience}\n"
            f"Previous questions: {' | '.join(previous_questions[-3:])}\n"
            f"Generate a Role-Alignment/System-Design question #{question_number}."
        )
    else: # behavioral / hr
        system_prompt = (
            f"You are a High-Tier Hiring Manager. {company_style} "
            "Generate one sharp Behavioral question using the STAR method format. "
            "Focus on conflict resolution, failure analysis, extreme ownership, or ambition. "
            "Avoid generic cliches. Ask for a specific time they had to make a hard trade-off or handle a crisis. "
        )
        user_prompt = (
            f"Previous HR questions: {' | '.join(previous_questions[-3:])}\n"
            f"Generate a high-stakes behavioral question #{question_number}."
        )

    response = await _call_azure_openai(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=250,
    )

    if not response:
        print(f"[ai] ⚠️ AI returned no response for {question_type} question")
        return None

    return {"question": response.strip(), "source": f"{company or question_type}_ai"}

async def extract_resume_data(text: str) -> Dict[str, Any]:
    # ... (start of function logic unchanged) ...
    if not _is_configured():
        # Fallback Mock Data if AI is not configured
        return {
            "candidate_name": "Demo Candidate",
            "email": "demo@example.com",
            "phone": "+1-555-0000",
            "professional_summary": "Enthusiastic software engineer with a strong work ethic and a passion for scalable systems and continuous learning.",
            "technical_skills": {
                "programming": ["Python (Mock)", "JavaScript (Mock)"],
                "frameworks": ["Django", "React"],
                "tools": ["Git", "Docker"],
                "databases": ["PostgreSQL"]
            },
            "experience_level": "intermediate",
            "education": {"mentions": ["University Degree"], "level": "bachelor"},
            "projects": ["Mock Project 1", "Mock Project 2"],
            "soft_skills": ["Communication", "Teamwork"],
            "certifications": [],
            "completeness_score": 75
        }

    system_prompt = (
        "You are an expert resume parser and HR profiler. Extract structured data from the resume text. "
        "Return ONLY a valid JSON object. Ensure the following keys exist: "
        "- 'candidate_name': (string) Ex: 'Jane Doe' "
        "- 'email': (string) "
        "- 'phone': (string) "
        "- 'professional_summary': (string) Extract their objective, behavioral traits, work ethos and 'good thoughts'. Keep it brief (2-3 sentences). "
        "- 'technical_skills': (dict of arrays) "
        "- 'experience_level': (string) "
        "- 'education': (dict) "
        "- 'projects': (array) "
        "- 'soft_skills': (array) "
        "Do not include markdown formatting or explanations."
    )
    user_prompt = f"Resume Text:\n{text[:4000]}\n\nExtract data as JSON matching the requested schema."

    response = await _call_azure_openai(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=1000,
    )

    if response:
        try:
            # Clean up potential markdown formatting in response (e.g. ```json ... ```)
            cleaned = response.replace("```json", "").replace("```", "").strip()
            # Try to find JSON start/end if extra text exists
            start = cleaned.find("{")
            end = cleaned.rfind("}") + 1
            if start >= 0 and end > start:
                cleaned = cleaned[start:end]
            
            data = json.loads(cleaned)
            return data
        except Exception as e:
            print(f"[ai] JSON parse error in resume analysis: {e}")
            print(f"[ai] Raw response was: {response[:200]}...") # Log beginning of failed response
            
    return {}



async def generate_clarifying_question(
    original_question: str,
    candidate_answer: str,
    resume_context: Dict[str, Any]
) -> Optional[str]:
    """
    Generates a follow-up question when the candidate's answer is poor.
    """
    if not _is_configured():
        return "I'd like more specific details. Could you tell me: 1) What exact technologies/tools you used, 2) What specific challenges you faced, and 3) How you solved them with measurable results?"

    skills = _flatten_skills(resume_context)
    
    system_prompt = (
        "You are a professional technical interviewer. The candidate gave an answer that lacks specific details. "
        "Your job is to ask a SPECIFIC follow-up question that tells them EXACTLY what information is missing. "
        "DO NOT ask generic questions like 'Can you elaborate?' or 'Please provide more details.' "
        "Instead, ask targeted questions that guide them on what to include. For example:\n"
        "- 'What specific React hooks or libraries did you use in this project?'\n"
        "- 'What technical challenges did you encounter and how did you debug them?'\n"
        "- 'Can you walk me through your exact workflow - from receiving the requirement to deployment?'\n"
        "- 'What was the measurable outcome or impact of this project?'\n\n"
        "Be encouraging but direct. Tell them what you want to hear."
    )
    
    user_prompt = (
        f"Original Question: {original_question}\n"
        f"Candidate Answer: {candidate_answer}\n"
        f"Candidate Skills: {', '.join(skills[:10])}\n\n"
        f"The answer is too vague. Generate a SPECIFIC follow-up question that tells the candidate "
        f"exactly what information they should include (e.g., specific technologies, challenges faced, "
        f"solutions implemented, measurable outcomes)."
    )

    return await _call_azure_openai(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=150,
    )


async def evaluate_response(question: str, answer: str, rubric_competencies: Optional[List[Dict[str, Any]]] = None, stage: int = 1) -> Dict[str, Any]:
    """
    Evaluates the answer and returns:
    - quality_score (1-10): How detailed/complete the answer is
    - relevance_score (1-10): How relevant the answer is to the question
    - feedback: Constructive feedback
    - detected_skills: List of skills mentioned
    - competency_scores: Dictionary of scores for each competency (if rubric provided)
    """
    if not _is_configured():
        # Fallback Mock Logic
        wc = len(answer.split())
        return {
            "quality_score": min(10, max(1, wc // 5)),
            "relevance_score": min(10, max(1, wc // 3)),  # Mock relevance
            "feedback": "Thank you for sharing that.",
            "detected_skills": [],
            "competency_scores": {},
            "confidence": "low"
        }

    # RATE LIMIT OPTIMIZATION: Short-circuit for trivial/skip answers
    cleaned_answer = answer.strip().lower()
    skip_phrases = ["skip", "pass", "next", "i don't know", "idk", "no idea", "unsure", "not sure"]
    word_count = len(cleaned_answer.split())
    
    if len(cleaned_answer) < 3 or (word_count < 3 and any(s in cleaned_answer for s in skip_phrases)):
        print(f"[ai] Optimization: Catching trivial/skip answer: '{cleaned_answer}'")
        return {
            "quality_score": 1,
            "relevance_score": 1,
            "feedback": "No problem, we'll move to the next question.",
            "detected_skills": [],
            "competency_scores": {},
            "confidence": "high"
        }

    # Construct the Prompt based on Stage and Rubric
    is_hr_stage = (stage >= 3)
    
    eval_criteria = ""
    if is_hr_stage:
        eval_criteria = (
            "This is the HR/Behavioral stage. Evaluate the candidate like a human-centric HR professional:\n"
            "- RELEVANCE: Does this answer the specific question asked? Even if the question is about hobbies, anime, or personal interests, if the candidate answers it sincerely, give a HIGH Relevance score.\n"
            "- QUALITY: Look for communication skills, passion, clarity of thought, and professional tone. For behavioral questions, look for the STAR method.\n"
            "- HUMAN TOUCH: Assess if the candidate is articulate, likable, and genuine. Acknowledge their perspective in the feedback."
        )
    else:
        eval_criteria = (
            "This is a TECHNICAL stage. Evaluate with high rigor:\n"
            "- RELEVANCE: strictly address the technical question. If they pivot to unrelated casual topics, they get a LOW Relevance score.\n"
            "- QUALITY: Look for technical depth, specific implementation details, architectural awareness, and 'why' decisions. Vague answers get low scores."
        )

    if rubric_competencies:
        # Dynamic Rubric Evaluation
        competency_instructions = ""
        for comp in rubric_competencies:
            name = comp.get("name", "Unknown")
            desc = comp.get("description", "")
            competency_instructions += f"   - {name}: {desc} (Score 1-10)\n"
            
        system_prompt = (
            f"You are an expert Interview Evaluator. {eval_criteria}\n\n"
            "1. STANDARD CRITERIA:\n"
            "   - RELEVANCE SCORE (1-10): Context-aware relevance to the question.\n"
            "   - QUALITY SCORE (1-10): Depth, clarity, and completeness.\n\n"
            "2. RUBRIC COMPETENCIES (Score 1-10 for each):\n"
            f"{competency_instructions}\n"
            "Return ONLY JSON: { \"quality_score\": number, \"relevance_score\": number, \"feedback\": string, \"detected_skills\": [string], \"competency_scores\": { \"Competency Name\": number, ... } }\n"
            "Feedback should be professional and brief (2 sentences max)."
        )
    else:
        system_prompt = (
            f"You are a Senior Technical Recruiter and Engineer. {eval_criteria}\n\n"
            "1. RELEVANCE SCORE (1-10): How accurately does the answer address the question? If the question asked about a casual topic (like anime), and they answered it, give a high score.\n"
            "2. QUALITY SCORE (1-10): The depth and completeness of the content. Look for STAR method in behavioral or specific tech in technical.\n"
            "3. FEEDBACK: Provide 1-2 sentences of professional advice. Acknowledge their points and suggest improvements if needed.\n\n"
            "Return ONLY JSON: { \"quality_score\": number, \"relevance_score\": number, \"feedback\": string, \"detected_skills\": [string] }"
        )
    
    user_prompt = f"Question: {question}\nCandidate Answer: {answer}"

    response = await _call_azure_openai(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=500,
    )

    if response:
        try:
            cleaned = response.replace("```json", "").replace("```", "").strip()
            # Try to find JSON start/end if extra text exists
            start = cleaned.find("{")
            end = cleaned.rfind("}") + 1
            if start >= 0 and end > start:
                cleaned = cleaned[start:end]
            
            result = json.loads(cleaned)
            # Ensure relevance_score is present
            if "relevance_score" not in result:
                result["relevance_score"] = result.get("quality_score", 5)
            
            # Ensure competency_scores is present if rubric used
            if rubric_competencies and "competency_scores" not in result:
                result["competency_scores"] = {}
                
            return result
        except Exception as e:
            print(f"[ai] JSON parse error in evaluation: {e}")
            print(f"[ai] Raw response was: {response[:200]}...")

    # Default fallback on failure - Neutral message instead of error
    return {
        "quality_score": 5, 
        "relevance_score": 5,  # Default to neutral relevance
        "feedback": "Thank you for your response.",
        "detected_skills": [],
        "competency_scores": {},
        "confidence": "low"
    }


# ========== NEW: REFINED QUESTION GENERATION METHODS ==========
# These methods support the 5-5-5 question pattern:
# - Resume-based technical verification
# - Role-based alignment assessment
# - HR behavioral evaluation

async def generate_resume_question(prompt: str, resume_analysis: dict) -> str:
    """
    Generate AI-powered technical question based on resume content.
    Verifies authenticity of claimed skills/projects/experience.
    
    Security: Uses sanitized prompt, rate-limited by Azure OpenAI
    Production: Includes fallback and error handling
    """
    if not _is_configured():
        print("⚠️ Azure OpenAI not configured, using fallback")
        return None
    
    try:
        messages = [
            {
                "role": "system",
                "content": "You are an expert technical interviewer. Generate penetrating questions that verify if candidates truly have the experience they claim. Focus on implementation details that only someone who actually did the work would know."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
        
        response = await _call_azure_openai(messages, max_tokens=200)
        
        if response and isinstance(response, str):
            # Clean up response (remove quotes, extra whitespace)
            question = response.strip().strip('"\'')
            
            # Security: Limit length
            question = question[:500]
            
            print(f"✅ Generated resume-based question: {question[:80]}...")
            return question
        
        return None
        
    except Exception as e:
        print(f"❌ Error generating resume question: {e}")
        return None


async def infer_role_from_resume(resume_analysis: dict) -> str:
    """
    Infer the role candidate is applying for based on resume content.
    Fallback when HR doesn't specify role in schedule.
    
    Security: Uses sanitized resume data, limited output
    Production: Always returns a valid role string
    """
    if not _is_configured():
        return "Software Developer"  # Safe default
    
    try:
        skills = resume_analysis.get("skills", [])
        experience = resume_analysis.get("experience", [])
        
        # Limit data size for API call (security + cost optimization)
        skills_str = ", ".join(skills[:10]) if skills else "programming"
        recent_roles = [e.get("role", "") for e in experience[:3]] if experience else []
        roles_str = ", ".join(recent_roles) if recent_roles else "various positions"
        
        prompt = f"""Based on this candidate's profile:
- Technical skills: {skills_str}
- Recent roles: {roles_str}

What role are they most likely applying for? Respond with ONLY the job title in 2-4 words.

Examples: "Backend Engineer", "Full Stack Developer", "Data Scientist", "Product Manager"

Role:"""
        
        messages = [
            {
                "role": "system",
                "content": "You are an HR specialist who categorizes candidates into appropriate job roles."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
        
        response = await _call_azure_openai(messages, max_tokens=50)
        
        if response and isinstance(response, str):
            role = response.strip().strip('"\'')
            
            # Security: Limit length and validate
            role = role[:100]
            
            # If response is too vague, use default
            if len(role) < 3 or len(role.split()) > 5:
                role = "Software Developer"
            
            print(f"✅ Inferred role from resume: {role}")
            return role
        
        return "Software Developer"
        
    except Exception as e:
        print(f"❌ Error inferring role: {e}")
        return "Software Developer"


async def generate_role_question(prompt: str, role: str) -> str:
    """
    Generate AI-powered non-technical question based on role.
    Assesses alignment, motivation, and understanding of role.
    
    Security: Uses sanitized role string, rate-limited
    Production: Includes fallback and error handling
    """
    if not _is_configured():
        print("⚠️ Azure OpenAI not configured, using fallback")
        return None
    
    try:
        # Security: Sanitize role (already done in caller, but double-check)
        safe_role = role[:100] if role else "Software Developer"
        
        messages = [
            {
                "role": "system",
                "content": f"You are interviewing for a {safe_role} position. Generate insightful non-technical questions that assess the candidate's understanding of the role, their motivation, and their cultural fit."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
        
        response = await _call_azure_openai(messages, max_tokens=200)
        
        if response and isinstance(response, str):
            question = response.strip().strip('"\'')
            question = question[:500]  # Security limit
            
            print(f"✅ Generated role-based question: {question[:80]}...")
            return question
        
        return None
        
    except Exception as e:
        print(f"❌ Error generating role question: {e}")
        return None


async def generate_behavioral_question(prompt: str) -> str:
    """
    Generate AI-powered HR/behavioral question using STAR method.
    Fallback when no HR question sets are available.
    
    Security: Rate-limited by Azure, sanitized output
    Production: Professional HR-standard questions
    """
    if not _is_configured():
        print("⚠️ Azure OpenAI not configured, using fallback")
        return None
    
    try:
        messages = [
            {
                "role": "system",
                "content": "You are an experienced HR interviewer. Generate professional behavioral interview questions using the STAR method (Situation, Task, Action, Result). Focus on soft skills, teamwork, conflict resolution, and work ethic."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
        
        response = await _call_azure_openai(messages, max_tokens=200)
        
        if response and isinstance(response, str):
            question = response.strip().strip('"\'')
            question = question[:500]  # Security limit
            
            print(f"✅ Generated behavioral question: {question[:80]}...")
            return question
        
        return None
        
    except Exception as e:
        print(f"❌ Error generating behavioral question: {e}")
        return None

async def generate_practice_questions(
    category: str, 
    company: Optional[str] = None, 
    role: Optional[str] = None,
    skills: Optional[List[str]] = None,
    count: int = 5
) -> List[str]:
    """
    Generates a set of practice questions for a specific category and company.
    """
    if not _is_configured():
        return []

    persona = "Senior Technical Recruiter"
    if company:
        persona = f"Senior Interviewer at {company}"
    
    context = ""
    if role:
        context += f"Target Role: {role}\n"
    if skills:
        context += f"Candidate Skills: {', '.join(skills)}\n"

    system_prompt = (
        f"You are a {persona}. Generate {count} realistic, challenging practice interview questions for a candidate. "
        "Avoid basic 'definition' questions. Focus on scenarios, architectural trade-offs, and professional methodology. "
        f"Category: {category}. "
        "Ensure the questions match the high hiring bar of modern tech companies."
    )

    user_prompt = (
        f"{context}\n"
        f"Generate {count} unique questions. Return as a JSON list of strings: [\"question 1\", \"question 2\", ...]"
    )

    response = await _call_azure_openai(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=1000,
    )

    if response:
        try:
            cleaned = response.replace("```json", "").replace("```", "").strip()
            start = cleaned.find("[")
            end = cleaned.rfind("]") + 1
            if start >= 0 and end > start:
                cleaned = cleaned[start:end]
            return json.loads(cleaned)
        except Exception as e:
            print(f"[ai] Error parsing practice questions: {e}")
            # Fallback to line split if JSON fails
            return [line.strip().strip('"').strip('1234567890. ') for line in response.split('\n') if len(line.strip()) > 10][:count]

    return []


async def evaluate_technical_pairing(
    challenge_title: str,
    language: str,
    current_code: str,
    output: str,
    candidate_message: str
) -> Dict[str, Any]:
    """
    Evaluates a candidate's progress and thought process during the Technical Round (Round 2).
    Acts as an AI Pair Programmer.
    """
    if not _is_configured():
        return {
            "feedback": "I'm monitoring your progress. Keep going, you're on the right track!",
            "hint": None,
            "is_fixed": False
        }

    system_prompt = (
        "You are an Elite AI Pair Programmer and Technical Interviewer. "
        "Your goal is to guide the candidate through a coding/debugging challenge without giving them the solution directly. "
        "If they are stuck, provide a subtle nudge. If they explain their logic, validate it or point out flaws. "
        "If they fix the bug, congratulate them and ask a follow-up about edge cases or optimization.\\n\\n"
        "STATUS CHECK:\\n"
        "- If the code is fixed and output matches expectations, set is_fixed: true.\\n"
        "- Otherwise, set is_fixed: false."
    )
    
    user_prompt = (
        f"Challenge: {challenge_title}\\n"
        f"Language: {language}\\n"
        f"Current Code:\\n```{language}\\n{current_code}\\n```\\n"
        f"Execution Output: {output}\\n"
        f"Candidate Message: {candidate_message}\\n\\n"
        "Return ONLY JSON: { \"feedback\": \"...\", \"hint\": \"...\", \"is_fixed\": boolean }"
    )

    response = await _call_azure_openai(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=400,
    )

    if response:
        try:
            cleaned = response.replace("```json", "").replace("```", "").strip()
            start = cleaned.find("{")
            end = cleaned.rfind("}") + 1
            if start >= 0 and end > start:
                cleaned = cleaned[start:end]
            return json.loads(cleaned)
        except:
            pass
            
    return {
        "feedback": "I'm following your logic. How do you plan to address the current output?",
        "hint": None,
        "is_fixed": False
    }

