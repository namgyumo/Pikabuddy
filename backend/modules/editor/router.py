from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from common.supabase_client import get_supabase
from middleware.auth import get_current_user

router = APIRouter(tags=["에디터"])


def _verify_assignment_access(user: dict, assignment_id: str) -> dict:
    """과제에 대한 접근 권한을 검증한다. 수강생 또는 교수만 접근 가능.
    반환: assignment 데이터"""
    supabase = get_supabase()
    result = (
        supabase.table("assignments")
        .select("*")
        .eq("id", assignment_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="과제를 찾을 수 없습니다.")
    assignment = result.data[0]
    course_id = assignment.get("course_id")

    # 어드민은 통과
    is_admin = user.get("email", "").endswith("@pikabuddy.admin")
    if is_admin:
        return assignment

    # 교수: 과제 소유 코스의 교수인지 확인
    if user.get("role") in ("professor", "personal"):
        course = (
            supabase.table("courses")
            .select("professor_id")
            .eq("id", course_id)
            .single()
            .execute()
        )
        if course.data and course.data["professor_id"] == user["id"]:
            return assignment
        # 교수지만 이 코스의 교수가 아니면 거부
        raise HTTPException(status_code=403, detail="해당 과제에 접근 권한이 없습니다.")

    # 학생: 해당 코스에 수강 등록되어 있는지 확인
    enrollment = (
        supabase.table("enrollments")
        .select("id")
        .eq("student_id", user["id"])
        .eq("course_id", course_id)
        .execute()
    )
    if not enrollment.data:
        raise HTTPException(status_code=403, detail="해당 과제에 접근 권한이 없습니다.")

    return assignment


@router.get("/assignments/{assignment_id}")
async def get_assignment_standalone(assignment_id: str, user: dict = Depends(get_current_user)):
    """과제 상세 조회 (courseId 없이)"""
    assignment = _verify_assignment_access(user, assignment_id)
    # 학생은 공개된 과제만 접근 가능
    if user.get("role") == "student" and assignment.get("status") != "published":
        raise HTTPException(status_code=403, detail="아직 공개되지 않은 과제입니다.")
    return assignment


class SnapshotRequest(BaseModel):
    code: str
    cursor_position: dict | None = None  # {"line": int, "col": int}
    timestamp: str | None = None
    problem_index: int = 0


class PasteLogRequest(BaseModel):
    content: str
    paste_source: str  # "internal" | "external"
    timestamp: str | None = None
    problem_index: int = 0


class SubmitRequest(BaseModel):
    code: str = ""
    content: dict | None = None  # Tiptap JSON for writing
    problem_index: int = 0
    char_count: int | None = None
    quiz_answers: list[dict] | None = None  # [{question_id, answer}]


@router.post("/assignments/{assignment_id}/snapshots", status_code=201)
async def save_snapshot(
    assignment_id: str,
    body: SnapshotRequest,
    user: dict = Depends(get_current_user),
):
    """코드 스냅샷 저장 (디바운싱 2~3초)"""
    _verify_assignment_access(user, assignment_id)
    supabase = get_supabase()

    result = (
        supabase.table("snapshots")
        .insert(
            {
                "assignment_id": assignment_id,
                "student_id": user["id"],
                "code_diff": {"code": body.code, "problem_index": body.problem_index},
                "cursor_position": body.cursor_position,
                "is_paste": False,
                "paste_source": None,
            }
        )
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="스냅샷 저장 실패")
    return result.data[0]


@router.get("/assignments/{assignment_id}/snapshots")
async def get_snapshots(assignment_id: str, user: dict = Depends(get_current_user)):
    """스냅샷 히스토리 조회"""
    _verify_assignment_access(user, assignment_id)
    supabase = get_supabase()
    result = (
        supabase.table("snapshots")
        .select("*")
        .eq("assignment_id", assignment_id)
        .eq("student_id", user["id"])
        .order("created_at")
        .execute()
    )
    return result.data


@router.post("/assignments/{assignment_id}/paste-log", status_code=201)
async def log_paste(
    assignment_id: str,
    body: PasteLogRequest,
    user: dict = Depends(get_current_user),
):
    """복붙 이벤트 기록"""
    _verify_assignment_access(user, assignment_id)
    supabase = get_supabase()

    result = (
        supabase.table("snapshots")
        .insert(
            {
                "assignment_id": assignment_id,
                "student_id": user["id"],
                "code_diff": {"pasted_content": body.content, "problem_index": body.problem_index},
                "is_paste": True,
                "paste_source": body.paste_source,
            }
        )
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="복붙 로그 저장 실패")
    return result.data[0]


@router.get("/assignments/{assignment_id}/my-submission")
async def get_my_submission(assignment_id: str, user: dict = Depends(get_current_user)):
    """내 최신 제출물 + AI 분석 조회"""
    _verify_assignment_access(user, assignment_id)
    supabase = get_supabase()
    result = (
        supabase.table("submissions")
        .select("*, ai_analyses(*)")
        .eq("assignment_id", assignment_id)
        .eq("student_id", user["id"])
        .order("submitted_at", desc=True)
        .limit(1)
        .execute()
    )
    if result.data:
        return result.data[0]
    return None


@router.post("/assignments/{assignment_id}/submit", status_code=201)
async def submit_assignment(
    assignment_id: str,
    body: SubmitRequest,
    user: dict = Depends(get_current_user),
):
    """과제 제출"""
    _verify_assignment_access(user, assignment_id)
    supabase = get_supabase()

    insert_data = {
        "assignment_id": assignment_id,
        "student_id": user["id"],
        "code": body.code or "",
        "status": "submitted",
        "problem_index": body.problem_index,
    }
    if body.content:
        insert_data["content"] = body.content
    if body.char_count is not None:
        insert_data["char_count"] = body.char_count
    if body.quiz_answers:
        insert_data["content"] = {"quiz_answers": body.quiz_answers}

    result = supabase.table("submissions").insert(insert_data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="제출 저장 실패")

    # EXP + 배지 체크: 과제 제출
    try:
        from modules.gamification.router import award_exp
        from modules.gamification.badge_defs import check_badges
        award_exp(user["id"], "assignment_submit", assignment_id)
        check_badges(user["id"], "assignment_submit")
    except Exception:
        pass

    return result.data[0]


class SubmitAllProblem(BaseModel):
    problem_index: int = 0
    code: str = ""
    content: dict | None = None
    char_count: int | None = None


class SubmitAllRequest(BaseModel):
    problems: list[SubmitAllProblem]


@router.post("/assignments/{assignment_id}/submit-all", status_code=201)
async def submit_all(
    assignment_id: str,
    body: SubmitAllRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """전체 문제 일괄 제출 + 비동기 AI 분석"""
    _verify_assignment_access(user, assignment_id)
    supabase = get_supabase()

    submissions = []
    for p in body.problems:
        insert_data = {
            "assignment_id": assignment_id,
            "student_id": user["id"],
            "code": p.code or "",
            "status": "submitted",
            "problem_index": p.problem_index,
        }
        if p.content:
            insert_data["content"] = p.content
        if p.char_count is not None:
            insert_data["char_count"] = p.char_count

        result = supabase.table("submissions").insert(insert_data).execute()
        if result.data:
            submissions.append(result.data[0])

    # EXP + 배지 체크 (한 번만)
    try:
        from modules.gamification.router import award_exp
        from modules.gamification.badge_defs import check_badges
        award_exp(user["id"], "assignment_submit", assignment_id)
        check_badges(user["id"], "assignment_submit")
    except Exception:
        pass

    # 비동기 AI 분석 트리거
    from modules.analysis.router import run_ai_analysis_sync
    for sub in submissions:
        background_tasks.add_task(run_ai_analysis_sync, sub["id"])

    return {
        "submitted": len(submissions),
        "submission_ids": [s["id"] for s in submissions],
    }


class QuizGradeRequest(BaseModel):
    answers: list[dict]  # [{question_id: int, answer: str|int}]


@router.post("/assignments/{assignment_id}/quiz-grade")
async def grade_quiz(
    assignment_id: str,
    body: QuizGradeRequest,
    user: dict = Depends(get_current_user),
):
    """퀴즈 자동 채점 — 객관식/주관식은 즉시, 서술형은 모범답안 비교"""
    assignment = _verify_assignment_access(user, assignment_id)
    supabase = get_supabase()

    problems = assignment.get("problems", [])
    quiz_problems = {p["id"]: p for p in problems if p.get("format") == "quiz"}

    results = []
    total_score = 0
    total_possible = 0

    for ans in body.answers:
        qid = ans.get("question_id")
        user_answer = ans.get("answer")
        problem = quiz_problems.get(qid)
        if not problem:
            continue

        points = problem.get("points", 10)
        total_possible += points
        qtype = problem.get("type")

        if qtype == "multiple_choice":
            correct = problem.get("correct_answer")
            is_correct = user_answer == correct
            earned = points if is_correct else 0
            total_score += earned
            results.append({
                "question_id": qid,
                "correct": is_correct,
                "points_earned": earned,
                "points_possible": points,
                "correct_answer": correct,
                "explanation": problem.get("explanation", ""),
            })

        elif qtype == "short_answer":
            acceptable = problem.get("acceptable_answers", [])
            correct = problem.get("correct_answer", "")
            if correct and correct not in acceptable:
                acceptable.append(correct)
            user_str = str(user_answer).strip().lower()
            is_correct = any(user_str == str(a).strip().lower() for a in acceptable)
            earned = points if is_correct else 0
            total_score += earned
            results.append({
                "question_id": qid,
                "correct": is_correct,
                "points_earned": earned,
                "points_possible": points,
                "correct_answer": correct,
                "explanation": problem.get("explanation", ""),
            })

        elif qtype == "essay":
            # 서술형: 간단한 길이 기반 + 키워드 매칭 채점
            correct = problem.get("correct_answer", "")
            user_str = str(user_answer).strip()
            if not user_str:
                earned = 0
            else:
                # 기본 점수: 작성 길이 기반 (최대 50%)
                length_ratio = min(len(user_str) / max(len(correct), 50), 1.0)
                # 키워드 매칭 (최대 50%)
                keywords = set(correct.lower().split())
                user_words = set(user_str.lower().split())
                overlap = len(keywords & user_words) / max(len(keywords), 1)
                earned = int(points * (length_ratio * 0.5 + overlap * 0.5))
            total_score += earned
            results.append({
                "question_id": qid,
                "correct": earned >= points * 0.7,
                "points_earned": earned,
                "points_possible": points,
                "correct_answer": correct,
                "explanation": problem.get("explanation", ""),
            })

    # 제출물에 채점 결과 저장
    submission_data = {
        "assignment_id": assignment_id,
        "student_id": user["id"],
        "code": "",
        "content": {"quiz_answers": body.answers, "quiz_results": results},
        "status": "submitted",
        "problem_index": 0,
    }
    sub_result = supabase.table("submissions").insert(submission_data).execute()

    # EXP + 배지 체크: 퀴즈 제출
    try:
        from modules.gamification.router import award_exp
        from modules.gamification.badge_defs import check_badges
        award_exp(user["id"], "assignment_submit", assignment_id)
        check_badges(user["id"], "assignment_submit")
    except Exception:
        pass

    # AI 분석 테이블에도 점수 저장
    if sub_result.data:
        try:
            score_percent = int(total_score / max(total_possible, 1) * 100)
            supabase.table("ai_analyses").insert({
                "submission_id": sub_result.data[0]["id"],
                "score": score_percent,
                "final_score": score_percent,
                "feedback": f"퀴즈 채점 완료: {total_score}/{total_possible}점 ({score_percent}%)",
            }).execute()
        except Exception:
            pass

    return {
        "score": total_score,
        "total": total_possible,
        "percent": int(total_score / max(total_possible, 1) * 100),
        "results": results,
    }
