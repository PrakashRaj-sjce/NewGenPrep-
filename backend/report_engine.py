"""
NewGenPrep - Report Engine (V2.0 Upgraded)
Generates structured interview reports with per-question breakdown,
stage-level averages, competency radar, proctoring summary,
and downloadable HTML report.
"""

from datetime import datetime
from typing import Dict, Any, List, Optional


def generate_report_summary(session: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate a comprehensive interview report from session data.
    Includes per-question breakdown, stage averages, competency scores,
    and proctoring integrity summary.
    """
    responses = session.get("responses", [])
    questions = session.get("questions_asked", [])
    total_questions = session.get("total_questions", 15)

    if not responses:
        return {
            "overall_score": 0,
            "rating": "No Data",
            "total_questions": total_questions,
            "total_responses": 0,
            "per_question": [],
            "stage_breakdown": {},
            "competency_summary": {},
            "proctoring_summary": {"warning_count": 0, "incidents": [], "integrity_score": 100},
            "skills_detected": {},
            "generated_at": datetime.utcnow().isoformat(),
        }

    # Per-question breakdown
    per_question = []
    for i, resp in enumerate(responses):
        question = questions[i] if i < len(questions) else {}
        per_question.append({
            "question_number": resp.get("question_number", i + 1),
            "question_text": question.get("text", "Unknown Question"),
            "question_type": question.get("type", "unknown"),
            "stage": question.get("stage", 0),
            "source": question.get("source", "unknown"),
            "answer_text": resp.get("text", ""),
            "quality_score": resp.get("quality_score", 0),
            "relevance_score": resp.get("relevance_score", 0),
            "detected_skills": resp.get("detected_skills", []),
            "competency_scores": resp.get("competency_scores", {}),
            "confidence_level": resp.get("confidence_level", "low"),
        })

    # Stage-level averages
    stage_data = {}  # stage -> {quality_scores: [], relevance_scores: []}
    for pq in per_question:
        stage = pq.get("stage", 0)
        stage_name = {1: "Resume-Based Technical", 2: "Role Alignment", 3: "HR Behavioral"}.get(stage, f"Stage {stage}")
        if stage_name not in stage_data:
            stage_data[stage_name] = {"quality_scores": [], "relevance_scores": [], "questions": 0}
        stage_data[stage_name]["quality_scores"].append(pq["quality_score"])
        stage_data[stage_name]["relevance_scores"].append(pq["relevance_score"])
        stage_data[stage_name]["questions"] += 1

    stage_breakdown = {}
    for name, data in stage_data.items():
        q_scores = data["quality_scores"]
        r_scores = data["relevance_scores"]
        stage_breakdown[name] = {
            "questions_count": data["questions"],
            "avg_quality": round(sum(q_scores) / len(q_scores), 1) if q_scores else 0,
            "avg_relevance": round(sum(r_scores) / len(r_scores), 1) if r_scores else 0,
            "highest_score": max(q_scores) if q_scores else 0,
            "lowest_score": min(q_scores) if q_scores else 0,
        }

    # Overall score
    all_quality = [r.get("quality_score", 0) for r in responses]
    overall_score = round(sum(all_quality) / len(all_quality), 1) if all_quality else 0

    # Rating
    if overall_score >= 8:
        rating = "Excellent"
    elif overall_score >= 6:
        rating = "Good"
    elif overall_score >= 4:
        rating = "Average"
    else:
        rating = "Needs Improvement"

    # Competency aggregation
    competency_totals = {}  # comp_name -> {total: float, count: int}
    for resp in responses:
        for comp_name, comp_score in resp.get("competency_scores", {}).items():
            if comp_name not in competency_totals:
                competency_totals[comp_name] = {"total": 0, "count": 0}
            competency_totals[comp_name]["total"] += comp_score
            competency_totals[comp_name]["count"] += 1

    competency_summary = {
        name: round(data["total"] / max(data["count"], 1), 1)
        for name, data in competency_totals.items()
    }

    # Skills aggregation
    all_skills = [s for r in responses for s in r.get("detected_skills", [])]
    skills_detected = {}
    for skill in all_skills:
        skills_detected[skill] = skills_detected.get(skill, 0) + 1

    # Proctoring summary
    warning_count = session.get("warning_count", 0)
    incidents = session.get("incidents", [])
    integrity_score = max(0, 100 - (warning_count * 15))

    return {
        "overall_score": overall_score,
        "rating": rating,
        "total_questions": total_questions,
        "total_responses": len(responses),
        "per_question": per_question,
        "stage_breakdown": stage_breakdown,
        "competency_summary": competency_summary,
        "proctoring_summary": {
            "warning_count": warning_count,
            "incidents": incidents,
            "integrity_score": integrity_score,
        },
        "skills_detected": skills_detected,
        "generated_at": datetime.utcnow().isoformat(),
    }


def generate_html_report(session: Dict[str, Any], candidate_name: str = "Candidate") -> str:
    """Generate a downloadable HTML interview report."""
    report = session.get("report") or generate_report_summary(session)
    per_question = report.get("per_question", [])
    stage_breakdown = report.get("stage_breakdown", {})
    competency_summary = report.get("competency_summary", {})
    proctoring = report.get("proctoring_summary", {})
    skills = report.get("skills_detected", {})

    # Build per-question rows
    question_rows = ""
    for pq in per_question:
        q_color = "#22c55e" if pq["quality_score"] >= 7 else "#eab308" if pq["quality_score"] >= 4 else "#ef4444"
        question_rows += f"""
        <tr>
            <td style="padding:10px;border-bottom:1px solid #333;">Q{pq['question_number']}</td>
            <td style="padding:10px;border-bottom:1px solid #333;">{pq['question_text'][:100]}...</td>
            <td style="padding:10px;border-bottom:1px solid #333;">{pq['question_type']}</td>
            <td style="padding:10px;border-bottom:1px solid #333;color:{q_color};font-weight:bold;">{pq['quality_score']}/10</td>
            <td style="padding:10px;border-bottom:1px solid #333;">{pq['relevance_score']}/10</td>
        </tr>"""

    # Build stage summary rows
    stage_rows = ""
    for name, data in stage_breakdown.items():
        stage_rows += f"""
        <tr>
            <td style="padding:10px;border-bottom:1px solid #333;">{name}</td>
            <td style="padding:10px;border-bottom:1px solid #333;">{data['questions_count']}</td>
            <td style="padding:10px;border-bottom:1px solid #333;">{data['avg_quality']}/10</td>
            <td style="padding:10px;border-bottom:1px solid #333;">{data['avg_relevance']}/10</td>
        </tr>"""

    # Build competency rows
    competency_rows = ""
    for comp_name, comp_score in competency_summary.items():
        bar_width = comp_score * 10
        bar_color = "#22c55e" if comp_score >= 7 else "#eab308" if comp_score >= 4 else "#ef4444"
        competency_rows += f"""
        <div style="margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
                <span>{comp_name}</span><span>{comp_score}/10</span>
            </div>
            <div style="background:#1a1a2e;border-radius:4px;overflow:hidden;">
                <div style="width:{bar_width}%;height:12px;background:{bar_color};border-radius:4px;"></div>
            </div>
        </div>"""

    # Build skills tags
    skill_tags = ""
    for skill, count in sorted(skills.items(), key=lambda x: x[1], reverse=True)[:15]:
        skill_tags += f'<span style="display:inline-block;background:#667eea33;color:#667eea;padding:4px 12px;border-radius:20px;margin:4px;font-size:13px;">{skill} ({count})</span>'

    # Rating color
    overall_score = report.get("overall_score", 0)
    rating = report.get("rating", "N/A")
    rating_color = "#22c55e" if overall_score >= 7 else "#eab308" if overall_score >= 4 else "#ef4444"

    integrity = proctoring.get("integrity_score", 100)
    integrity_color = "#22c55e" if integrity >= 80 else "#eab308" if integrity >= 50 else "#ef4444"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NewGenPrep - Interview Report - {candidate_name}</title>
    <style>
        * {{ margin:0; padding:0; box-sizing:border-box; }}
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background:#0a0a1a; color:#e0e0e0; padding:40px; }}
        .container {{ max-width:900px; margin:0 auto; }}
        .header {{ text-align:center; padding:30px; background:linear-gradient(135deg,#667eea,#764ba2); border-radius:12px; margin-bottom:30px; }}
        .header h1 {{ color:white; font-size:28px; }}
        .header p {{ color:rgba(255,255,255,0.8); margin-top:8px; }}
        .card {{ background:#12122a; border:1px solid #222; border-radius:12px; padding:24px; margin-bottom:20px; }}
        .card h2 {{ color:#667eea; font-size:18px; margin-bottom:16px; border-bottom:1px solid #333; padding-bottom:8px; }}
        .metrics {{ display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:20px; }}
        .metric {{ background:#1a1a2e; padding:20px; border-radius:8px; text-align:center; }}
        .metric .value {{ font-size:32px; font-weight:bold; }}
        .metric .label {{ font-size:12px; color:#888; margin-top:4px; }}
        table {{ width:100%; border-collapse:collapse; font-size:14px; }}
        th {{ text-align:left; padding:10px; border-bottom:2px solid #333; color:#667eea; }}
        .footer {{ text-align:center; padding:20px; color:#555; font-size:12px; }}
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>NewGenPrep Interview Report</h1>
        <p>{candidate_name} | Generated: {report.get('generated_at', '')[:10]}</p>
    </div>

    <div class="metrics">
        <div class="metric">
            <div class="value" style="color:{rating_color};">{overall_score}</div>
            <div class="label">Overall Score (out of 10)</div>
        </div>
        <div class="metric">
            <div class="value" style="color:{rating_color};">{rating}</div>
            <div class="label">Performance Rating</div>
        </div>
        <div class="metric">
            <div class="value" style="color:{integrity_color};">{integrity}%</div>
            <div class="label">Integrity Score</div>
        </div>
    </div>

    <div class="card">
        <h2>Stage Performance</h2>
        <table>
            <thead><tr><th>Stage</th><th>Questions</th><th>Avg Quality</th><th>Avg Relevance</th></tr></thead>
            <tbody>{stage_rows}</tbody>
        </table>
    </div>

    <div class="card">
        <h2>Per-Question Breakdown</h2>
        <table>
            <thead><tr><th>#</th><th>Question</th><th>Type</th><th>Quality</th><th>Relevance</th></tr></thead>
            <tbody>{question_rows}</tbody>
        </table>
    </div>

    {"<div class='card'><h2>Competency Scores</h2>" + competency_rows + "</div>" if competency_rows else ""}

    <div class="card">
        <h2>Skills Detected</h2>
        <div>{skill_tags if skill_tags else '<p style="color:#666;">No skills detected in responses.</p>'}</div>
    </div>

    <div class="card">
        <h2>Proctoring Summary</h2>
        <p>Warnings: <strong>{proctoring.get('warning_count', 0)}</strong> | 
           Integrity: <strong style="color:{integrity_color};">{integrity}%</strong></p>
    </div>

    <div class="footer">
        <p>NewGenPrep AI Interview Platform | Confidential Report</p>
    </div>
</div>
</body>
</html>"""
