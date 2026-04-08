import asyncio
import json
import traceback
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from common.supabase_client import get_supabase
from common.gemini_client import get_gemini_model
from middleware.auth import get_current_user, require_professor

router = APIRouter(prefix="/courses/{course_id}/assignments", tags=["과제"])


class AssignmentCreateRequest(BaseModel):
    title: str
    topic: str
    type: str = "coding"  # coding / writing / both
    difficulty: str = "medium"  # easy / medium / hard
    problem_count: int = 5
    ai_policy: str = "normal"  # free / normal / strict / exam
    language: str = "python"
    writing_prompt: str | None = None  # 글쓰기 지시문
    due_date: str | None = None  # ISO 8601
    grading_strictness: str = "normal"  # mild / normal / strict
    grading_note: str | None = None  # 교수 유의사항


class PolicyUpdateRequest(BaseModel):
    ai_policy: str


class ProblemAddRequest(BaseModel):
    title: str
    description: str
    starter_code: str = ""
    expected_output: str = ""
    hints: list[str] = []


class ProblemUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    starter_code: str | None = None
    expected_output: str | None = None
    hints: list[str] | None = None


class WritingPromptUpdateRequest(BaseModel):
    writing_prompt: str


class AssignmentUpdateRequest(BaseModel):
    title: str | None = None
    topic: str | None = None
    due_date: str | None = None
    language: str | None = None
    show_score_to_student: bool | None = None
    grading_strictness: str | None = None
    grading_note: str | None = None


def _generate_writing_prompt(topic: str, difficulty: str) -> str:
    """Gemini로 글쓰기 지시문을 생성한다."""
    model = get_gemini_model()
    prompt = f"""당신은 대학교 교수입니다. 다음 주제로 글쓰기 과제 지시문을 작성하세요.
주제: {topic}
난이도: {difficulty}

학생에게 명확한 글쓰기 방향, 분량 가이드(최소 글자수), 평가 기준을 포함해서
3~5문장으로 작성하세요. JSON 없이 텍스트만 출력하세요."""
    response = model.generate_content(prompt)
    return response.text.strip()


def _generate_problems(topic: str, difficulty: str, count: int, language: str) -> dict:
    """Gemini로 문제와 루브릭을 생성한다."""
    model = get_gemini_model()
    prompt = f"""당신은 대학교 프로그래밍 교수입니다.
다음 조건에 맞는 실습 문제 {count}개와 채점 루브릭을 JSON으로 생성하세요.

주제: {topic}
난이도: {difficulty}
프로그래밍 언어: {language}

응답 형식 (JSON만 출력):
{{
  "problems": [
    {{
      "id": 1,
      "title": "문제 제목",
      "description": "문제 설명",
      "starter_code": "시작 코드",
      "expected_output": "예상 출력",
      "hints": ["힌트1", "힌트2"]
    }}
  ],
  "rubric": {{
    "criteria": [
      {{"name": "정확성", "weight": 40, "description": "코드가 올바르게 동작하는가"}},
      {{"name": "코드 품질", "weight": 30, "description": "코드 스타일과 가독성"}},
      {{"name": "개념 이해", "weight": 30, "description": "핵심 개념을 올바르게 사용했는가"}}
    ]
  }}
}}"""

    response = model.generate_content(prompt)
    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    return json.loads(text)


@router.post("", status_code=201)
async def create_assignment(
    course_id: str,
    body: AssignmentCreateRequest,
    user: dict = Depends(require_professor),
):
    """과제를 생성하고, AI가 문제를 자동 생성한다. (초안 상태로 생성)"""
    supabase = get_supabase()

    insert_data = {
        "course_id": course_id,
        "title": body.title,
        "topic": body.topic,
        "type": body.type,
        "status": "draft",
        "problems": [],
        "rubric": {},
        "ai_policy": body.ai_policy,
        "language": body.language,
        "grading_strictness": body.grading_strictness,
    }
    if body.due_date:
        insert_data["due_date"] = body.due_date
    if body.grading_note:
        insert_data["grading_note"] = body.grading_note

    # 글쓰기 과제: 지시문 생성
    if body.type in ("writing", "both"):
        if body.writing_prompt:
            insert_data["writing_prompt"] = body.writing_prompt
        else:
            try:
                loop = asyncio.get_running_loop()
                wp_text = await loop.run_in_executor(
                    None, _generate_writing_prompt, body.topic, body.difficulty
                )
                insert_data["writing_prompt"] = wp_text
            except Exception as e:
                print(f"[ERROR] 글쓰기 지시문 생성 실패: {e}")
                insert_data["writing_prompt"] = f"{body.topic}에 대해 자유롭게 글을 작성하세요."

    result = supabase.table("assignments").insert(insert_data).execute()
    assignment = result.data[0]

    # 코딩 과제: 문제 생성
    if body.type in ("coding", "both"):
        try:
            loop = asyncio.get_running_loop()
            data = await loop.run_in_executor(
                None, _generate_problems, body.topic, body.difficulty, body.problem_count, body.language
            )
            supabase.table("assignments").update(
                {"problems": data["problems"], "rubric": data["rubric"]}
            ).eq("id", assignment["id"]).execute()
            assignment["problems"] = data["problems"]
            assignment["rubric"] = data["rubric"]
        except Exception as e:
            print(f"[ERROR] 문제 생성 실패: {e}")
            traceback.print_exc()

    return assignment


@router.get("")
async def list_assignments(course_id: str, user: dict = Depends(get_current_user)):
    """과제 목록 조회 (학생은 published만)"""
    supabase = get_supabase()
    query = (
        supabase.table("assignments")
        .select("*")
        .eq("course_id", course_id)
        .order("created_at", desc=True)
    )
    # 학생은 published 과제만 볼 수 있음 (어드민 제외)
    is_admin = user.get("email", "").endswith("@pikabuddy.admin")
    if user.get("role") == "student" and not is_admin:
        query = query.eq("status", "published")

    result = query.execute()
    return result.data


@router.delete("/{assignment_id}")
async def delete_assignment(
    course_id: str,
    assignment_id: str,
    user: dict = Depends(require_professor),
):
    """과제 삭제 (관련 제출물, 스냅샷, 분석 모두 cascade 삭제)"""
    supabase = get_supabase()
    supabase.table("assignments").delete().eq("id", assignment_id).execute()
    return {"message": "과제가 삭제되었습니다."}


@router.delete("/{assignment_id}/submissions/{submission_id}")
async def delete_submission(
    course_id: str,
    assignment_id: str,
    submission_id: str,
    user: dict = Depends(require_professor),
):
    """제출물 삭제 (관련 AI 분석도 cascade 삭제)"""
    supabase = get_supabase()
    supabase.table("submissions").delete().eq("id", submission_id).execute()
    return {"message": "제출물이 삭제되었습니다."}


@router.get("/{assignment_id}")
async def get_assignment(course_id: str, assignment_id: str, user: dict = Depends(get_current_user)):
    """과제 상세 조회"""
    supabase = get_supabase()
    result = (
        supabase.table("assignments")
        .select("*")
        .eq("id", assignment_id)
        .eq("course_id", course_id)
        .single()
        .execute()
    )
    return result.data


@router.patch("/{assignment_id}")
async def update_assignment(
    course_id: str,
    assignment_id: str,
    body: AssignmentUpdateRequest,
    user: dict = Depends(require_professor),
):
    """과제 기본 정보 수정"""
    supabase = get_supabase()
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="변경할 내용이 없습니다.")

    supabase.table("assignments").update(update_data).eq("id", assignment_id).execute()
    result = supabase.table("assignments").select("*").eq("id", assignment_id).single().execute()
    return result.data


@router.post("/{assignment_id}/publish")
async def publish_assignment(
    course_id: str,
    assignment_id: str,
    user: dict = Depends(require_professor),
):
    """과제를 학생에게 공개"""
    supabase = get_supabase()
    supabase.table("assignments").update(
        {"status": "published"}
    ).eq("id", assignment_id).execute()
    return {"message": "과제가 공개되었습니다.", "status": "published"}


@router.post("/{assignment_id}/unpublish")
async def unpublish_assignment(
    course_id: str,
    assignment_id: str,
    user: dict = Depends(require_professor),
):
    """과제를 비공개로 전환"""
    supabase = get_supabase()
    supabase.table("assignments").update(
        {"status": "draft"}
    ).eq("id", assignment_id).execute()
    return {"message": "과제가 비공개로 전환되었습니다.", "status": "draft"}


@router.patch("/{assignment_id}/policy")
async def update_policy(
    course_id: str,
    assignment_id: str,
    body: PolicyUpdateRequest,
    user: dict = Depends(require_professor),
):
    """AI 정책 설정 변경"""
    if body.ai_policy not in ("free", "normal", "strict", "exam"):
        raise HTTPException(status_code=400, detail="유효하지 않은 AI 정책입니다.")

    supabase = get_supabase()
    supabase.table("assignments").update(
        {"ai_policy": body.ai_policy}
    ).eq("id", assignment_id).execute()

    return {"message": "AI 정책이 변경되었습니다.", "ai_policy": body.ai_policy}


@router.patch("/{assignment_id}/writing-prompt")
async def update_writing_prompt(
    course_id: str,
    assignment_id: str,
    body: WritingPromptUpdateRequest,
    user: dict = Depends(require_professor),
):
    """글쓰기 지시문 수정"""
    supabase = get_supabase()
    supabase.table("assignments").update(
        {"writing_prompt": body.writing_prompt}
    ).eq("id", assignment_id).execute()
    return {"message": "글쓰기 지시문이 수정되었습니다."}


# ===== 문제 관리 =====

@router.post("/{assignment_id}/problems", status_code=201)
async def add_problem(
    course_id: str,
    assignment_id: str,
    body: ProblemAddRequest,
    user: dict = Depends(require_professor),
):
    """문제 추가"""
    supabase = get_supabase()
    assignment = (
        supabase.table("assignments")
        .select("problems")
        .eq("id", assignment_id)
        .single()
        .execute()
    )
    problems = assignment.data.get("problems", []) or []

    new_id = max((p.get("id", 0) for p in problems), default=0) + 1
    new_problem = {
        "id": new_id,
        "title": body.title,
        "description": body.description,
        "starter_code": body.starter_code,
        "expected_output": body.expected_output,
        "hints": body.hints,
    }
    problems.append(new_problem)

    supabase.table("assignments").update(
        {"problems": problems}
    ).eq("id", assignment_id).execute()

    return new_problem


@router.patch("/{assignment_id}/problems/{problem_id}")
async def update_problem(
    course_id: str,
    assignment_id: str,
    problem_id: int,
    body: ProblemUpdateRequest,
    user: dict = Depends(require_professor),
):
    """문제 수정"""
    supabase = get_supabase()
    assignment = (
        supabase.table("assignments")
        .select("problems")
        .eq("id", assignment_id)
        .single()
        .execute()
    )
    problems = assignment.data.get("problems", []) or []

    found = False
    for p in problems:
        if p.get("id") == problem_id:
            if body.title is not None:
                p["title"] = body.title
            if body.description is not None:
                p["description"] = body.description
            if body.starter_code is not None:
                p["starter_code"] = body.starter_code
            if body.expected_output is not None:
                p["expected_output"] = body.expected_output
            if body.hints is not None:
                p["hints"] = body.hints
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail="문제를 찾을 수 없습니다.")

    supabase.table("assignments").update(
        {"problems": problems}
    ).eq("id", assignment_id).execute()

    return {"message": "문제가 수정되었습니다."}


@router.delete("/{assignment_id}/problems/{problem_id}")
async def delete_problem(
    course_id: str,
    assignment_id: str,
    problem_id: int,
    user: dict = Depends(require_professor),
):
    """문제 삭제"""
    supabase = get_supabase()
    assignment = (
        supabase.table("assignments")
        .select("problems")
        .eq("id", assignment_id)
        .single()
        .execute()
    )
    problems = assignment.data.get("problems", []) or []
    new_problems = [p for p in problems if p.get("id") != problem_id]

    if len(new_problems) == len(problems):
        raise HTTPException(status_code=404, detail="문제를 찾을 수 없습니다.")

    supabase.table("assignments").update(
        {"problems": new_problems}
    ).eq("id", assignment_id).execute()

    return {"message": "문제가 삭제되었습니다."}


# ===== 교수 점수 확정 =====

@router.get("/{assignment_id}/submissions")
async def list_submissions(
    course_id: str,
    assignment_id: str,
    user: dict = Depends(require_professor),
):
    """과제의 모든 제출물 조회 (교수용)"""
    supabase = get_supabase()
    result = (
        supabase.table("submissions")
        .select("*, users(name, email), ai_analyses(*)")
        .eq("assignment_id", assignment_id)
        .order("submitted_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/{assignment_id}/paste-logs")
async def get_paste_logs(
    course_id: str,
    assignment_id: str,
    user: dict = Depends(require_professor),
):
    """과제의 모든 복붙 로그 조회 (교수용)"""
    supabase = get_supabase()
    result = (
        supabase.table("snapshots")
        .select("id, student_id, code_diff, paste_source, created_at")
        .eq("assignment_id", assignment_id)
        .eq("is_paste", True)
        .order("created_at")
        .execute()
    )
    return result.data


class FinalScoreRequest(BaseModel):
    final_score: int


@router.patch("/{assignment_id}/analyses/{analysis_id}/score")
async def set_final_score(
    course_id: str,
    assignment_id: str,
    analysis_id: str,
    body: FinalScoreRequest,
    user: dict = Depends(require_professor),
):
    """교수가 최종 점수를 확정"""
    if body.final_score < 0 or body.final_score > 100:
        raise HTTPException(status_code=400, detail="점수는 0~100 사이여야 합니다.")

    supabase = get_supabase()
    supabase.table("ai_analyses").update(
        {"final_score": body.final_score}
    ).eq("id", analysis_id).execute()

    return {"message": "점수가 확정되었습니다.", "final_score": body.final_score}


# ===== QA/테스트 도구 (어드민 전용) =====

def _require_admin(user: dict):
    """어드민(@pikabuddy.admin) 여부 확인"""
    if not user.get("email", "").endswith("@pikabuddy.admin"):
        raise HTTPException(status_code=403, detail="어드민 권한이 필요합니다.")


@router.delete("/{assignment_id}/qa/paste-logs")
async def qa_reset_paste_logs(
    course_id: str, assignment_id: str,
    user: dict = Depends(get_current_user),
):
    """[QA] 과제의 모든 복붙 로그 초기화"""
    _require_admin(user)
    supabase = get_supabase()
    supabase.table("snapshots").delete().eq("assignment_id", assignment_id).eq("is_paste", True).execute()
    return {"message": "복붙 로그가 초기화되었습니다."}


@router.delete("/{assignment_id}/qa/snapshots")
async def qa_reset_snapshots(
    course_id: str, assignment_id: str,
    user: dict = Depends(get_current_user),
):
    """[QA] 과제의 모든 스냅샷 초기화"""
    _require_admin(user)
    supabase = get_supabase()
    supabase.table("snapshots").delete().eq("assignment_id", assignment_id).execute()
    return {"message": "스냅샷이 초기화되었습니다."}


@router.delete("/{assignment_id}/qa/submissions")
async def qa_reset_submissions(
    course_id: str, assignment_id: str,
    user: dict = Depends(get_current_user),
):
    """[QA] 과제의 모든 제출물 + AI 분석 초기화"""
    _require_admin(user)
    supabase = get_supabase()
    supabase.table("submissions").delete().eq("assignment_id", assignment_id).execute()
    return {"message": "제출물이 초기화되었습니다."}


@router.delete("/{assignment_id}/qa/all")
async def qa_reset_all(
    course_id: str, assignment_id: str,
    user: dict = Depends(get_current_user),
):
    """[QA] 과제의 모든 데이터(스냅샷+복붙+제출물) 일괄 초기화"""
    _require_admin(user)
    supabase = get_supabase()
    supabase.table("snapshots").delete().eq("assignment_id", assignment_id).execute()
    supabase.table("submissions").delete().eq("assignment_id", assignment_id).execute()
    return {"message": "모든 데이터가 초기화되었습니다."}
