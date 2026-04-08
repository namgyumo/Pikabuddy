from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from common.supabase_client import get_supabase
from middleware.auth import get_current_user

router = APIRouter(tags=["에디터"])


@router.get("/assignments/{assignment_id}")
async def get_assignment_standalone(assignment_id: str, user: dict = Depends(get_current_user)):
    """과제 상세 조회 (courseId 없이)"""
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


@router.post("/assignments/{assignment_id}/snapshots", status_code=201)
async def save_snapshot(
    assignment_id: str,
    body: SnapshotRequest,
    user: dict = Depends(get_current_user),
):
    """코드 스냅샷 저장 (디바운싱 2~3초)"""
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

    result = supabase.table("submissions").insert(insert_data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="제출 저장 실패")
    return result.data[0]
