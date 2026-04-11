import json
import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, Depends
from common.supabase_client import get_supabase
from common.gemini_client import get_gemini_model, MODEL_LIGHT
from middleware.auth import require_professor_or_personal

_executor = ThreadPoolExecutor(max_workers=8)

router = APIRouter(tags=["대시보드"])


def _safe_avg_score(submissions: list) -> float:
    """ai_analyses가 dict 또는 list일 수 있으므로 안전하게 score를 추출."""
    scores = []
    for s in submissions:
        analysis = s.get("ai_analyses")
        if isinstance(analysis, list):
            for a in analysis:
                if a and a.get("score") is not None:
                    scores.append(a["score"])
        elif isinstance(analysis, dict) and analysis.get("score") is not None:
            scores.append(analysis["score"])
    return sum(scores) / len(scores) if scores else 0


@router.get("/courses/{course_id}/dashboard")
async def get_dashboard(course_id: str, user: dict = Depends(require_professor_or_personal)):
    """클래스 대시보드"""
    supabase = get_supabase()
    loop = asyncio.get_running_loop()

    enrollments = (
        supabase.table("enrollments")
        .select("student_id, users(id, name, email, avatar_url)")
        .eq("course_id", course_id)
        .execute()
    )

    student_list = []
    for enrollment in enrollments.data:
        student = enrollment.get("users", {})
        sid = student.get("id")
        if sid:
            student_list.append((sid, student))

    if not student_list:
        return {"course_id": course_id, "student_count": 0, "avg_class_score": 0, "at_risk_count": 0, "students": []}

    # Fetch all student data in parallel
    def fetch_student_data(sid: str):
        sb = get_supabase()
        submissions = sb.table("submissions").select("*, ai_analyses(*)").eq("student_id", sid).execute()
        paste_count = sb.table("snapshots").select("id", count="exact").eq("student_id", sid).eq("is_paste", True).execute()
        notes = sb.table("notes").select("understanding_score").eq("student_id", sid).eq("course_id", course_id).execute()
        return submissions, paste_count, notes

    results = await asyncio.gather(
        *[loop.run_in_executor(_executor, fetch_student_data, sid) for sid, _ in student_list]
    )

    students = []
    for (sid, student), (submissions, paste_count, notes) in zip(student_list, results):
        note_scores = [n["understanding_score"] for n in notes.data if n.get("understanding_score")]

        avg_score = _safe_avg_score(submissions.data)
        avg_understanding = sum(note_scores) / len(note_scores) if note_scores else 0
        gap = abs(avg_score - avg_understanding) if note_scores else 0

        students.append({
            "student": student,
            "avg_score": round(avg_score),
            "avg_understanding": round(avg_understanding),
            "paste_count": getattr(paste_count, "count", 0) or 0,
            "gap_level": "high" if gap > 30 else "medium" if gap > 15 else "low",
            "submission_count": len(submissions.data),
            "status": "warning" if avg_understanding < 60 or gap > 30 else "ok",
        })

    return {
        "course_id": course_id,
        "student_count": len(students),
        "avg_class_score": round(sum(s["avg_score"] for s in students) / len(students)) if students else 0,
        "at_risk_count": sum(1 for s in students if s["status"] == "warning"),
        "students": students,
    }


@router.get("/courses/{course_id}/dashboard/students/{student_id}")
async def get_student_detail(
    course_id: str, student_id: str, user: dict = Depends(require_professor_or_personal)
):
    """학생별 상세 대시보드"""
    supabase = get_supabase()
    loop = asyncio.get_running_loop()

    # Run all queries in parallel
    def q_student():
        return supabase.table("users").select("*").eq("id", student_id).single().execute()

    def q_submissions():
        return (
            supabase.table("submissions")
            .select("*, ai_analyses(*), assignments(title, topic, problems)")
            .eq("student_id", student_id)
            .order("submitted_at")
            .execute()
        )

    def q_notes():
        return (
            supabase.table("notes")
            .select("*")
            .eq("student_id", student_id)
            .eq("course_id", course_id)
            .order("updated_at", desc=True)
            .execute()
        )

    def q_snapshot_count():
        return (
            supabase.table("snapshots")
            .select("id", count="exact")
            .eq("student_id", student_id)
            .execute()
        )

    def q_paste_logs():
        return (
            supabase.table("snapshots")
            .select("id, assignment_id, code_diff, created_at")
            .eq("student_id", student_id)
            .eq("is_paste", True)
            .order("created_at")
            .execute()
        )

    student, submissions, notes, snap_count, pastes = await asyncio.gather(
        loop.run_in_executor(_executor, q_student),
        loop.run_in_executor(_executor, q_submissions),
        loop.run_in_executor(_executor, q_notes),
        loop.run_in_executor(_executor, q_snapshot_count),
        loop.run_in_executor(_executor, q_paste_logs),
    )

    paste_logs = [
        {
            "id": s["id"],
            "assignment_id": s.get("assignment_id"),
            "content": (s.get("code_diff") or {}).get("pasted_content", ""),
            "problem_index": (s.get("code_diff") or {}).get("problem_index", 0),
            "timestamp": s.get("created_at"),
        }
        for s in pastes.data
    ]

    return {
        "student": student.data,
        "submissions": submissions.data,
        "notes": notes.data,
        "snapshot_count": getattr(snap_count, "count", 0) or 0,
        "paste_count": len(paste_logs),
        "paste_logs": paste_logs,
    }


@router.get("/courses/{course_id}/insights")
async def get_insights(course_id: str, user: dict = Depends(require_professor_or_personal)):
    """AI 기반 클래스 인사이트"""
    supabase = get_supabase()

    course = supabase.table("courses").select("*").eq("id", course_id).single().execute()
    # Get assignments for this course to filter submissions
    assignments = (
        supabase.table("assignments")
        .select("id")
        .eq("course_id", course_id)
        .execute()
    )
    assignment_ids = [a["id"] for a in assignments.data]

    if assignment_ids:
        submissions = (
            supabase.table("submissions")
            .select("*, ai_analyses(*)")
            .in_("assignment_id", assignment_ids)
            .execute()
        )
    else:
        submissions = type("Result", (), {"data": []})()
    notes = (
        supabase.table("notes")
        .select("understanding_score, gap_analysis")
        .eq("course_id", course_id)
        .execute()
    )

    prompt = f"""You are an educational data analyst.
Analyze the following class data and provide actionable insights for the professor.

Course: {course.data.get('title', '')}
Objectives: {json.dumps(course.data.get('objectives', []), ensure_ascii=False)}
Submissions: {len(submissions.data)}
Average score: {round(_safe_avg_score(submissions.data))}
Average note understanding: {round(sum(n.get('understanding_score', 0) for n in notes.data if n.get('understanding_score')) / max(len(notes.data), 1))}

Write each item in Markdown format. Use **bold**, lists (-), and highlight key numbers.
IMPORTANT: Write the entire output in Korean.

JSON format:
{{"insights": ["markdown insight1", "markdown insight2"], "common_struggles": ["markdown struggle1"], "recommendations": ["markdown rec1", "markdown rec2"]}}
"""
    loop = asyncio.get_running_loop()
    response = await loop.run_in_executor(None, lambda: get_gemini_model(MODEL_LIGHT).generate_content(prompt))
    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"insights": [text], "common_struggles": [], "recommendations": []}
