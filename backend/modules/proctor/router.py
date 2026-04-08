import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File
from pydantic import BaseModel
from common.supabase_client import get_supabase
from middleware.auth import require_student

router = APIRouter(tags=["프록터링"])


class TabLogRequest(BaseModel):
    event_type: str  # "tab_switch" | "tab_hidden" | "tab_visible"
    timestamp: str


@router.post("/assignments/{assignment_id}/proctor/capture", status_code=201)
async def upload_capture(
    assignment_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(require_student),
):
    """시험 화면 캡쳐 업로드"""
    supabase = get_supabase()

    file_bytes = await file.read()
    ext = os.path.splitext(file.filename or "")[1].lstrip(".")
    safe_name = f"{uuid.uuid4()}.{ext}" if ext else str(uuid.uuid4())
    path = f"proctor/{user['id']}/{assignment_id}/{safe_name}"

    supabase.storage.from_("proctor-captures").upload(path, file_bytes)

    return {"message": "캡쳐가 업로드되었습니다.", "path": path}


@router.post("/assignments/{assignment_id}/proctor/tab-log", status_code=201)
async def log_tab_event(
    assignment_id: str,
    body: TabLogRequest,
    user: dict = Depends(require_student),
):
    """탭 이동 로그 기록"""
    supabase = get_supabase()

    supabase.table("snapshots").insert({
        "assignment_id": assignment_id,
        "student_id": user["id"],
        "code_diff": {"event": body.event_type, "timestamp": body.timestamp},
        "is_paste": False,
    }).execute()

    return {"message": "탭 로그가 기록되었습니다."}
