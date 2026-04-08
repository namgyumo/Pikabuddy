import base64
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from common.supabase_client import get_supabase
from middleware.auth import get_current_user, require_professor

router = APIRouter(tags=["강의자료"])


class MaterialResponse(BaseModel):
    id: str
    course_id: str
    uploaded_by: str
    title: str
    file_name: str
    file_url: str
    file_size: int
    mime_type: str | None
    created_at: str


@router.get("/courses/{course_id}/materials")
async def list_materials(course_id: str, user: dict = Depends(get_current_user)):
    """강의자료 목록 조회 (교수/학생 모두)"""
    supabase = get_supabase()
    result = (
        supabase.table("course_materials")
        .select("*")
        .eq("course_id", course_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.post("/courses/{course_id}/materials", status_code=201)
async def upload_material(
    course_id: str,
    title: str = Form(...),
    file: UploadFile = File(...),
    user: dict = Depends(require_professor),
):
    """교수가 강의자료 업로드 (Supabase Storage 사용)"""
    supabase = get_supabase()

    # Read file
    content = await file.read()
    file_size = len(content)
    if file_size > 50 * 1024 * 1024:  # 50MB limit
        raise HTTPException(status_code=400, detail="파일 크기는 50MB 이하여야 합니다.")

    # Upload to Supabase Storage
    ext = file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "bin"
    storage_path = f"materials/{course_id}/{uuid.uuid4().hex}.{ext}"

    try:
        supabase.storage.from_("course-files").upload(
            storage_path, content,
            file_options={"content-type": file.content_type or "application/octet-stream"},
        )
    except Exception:
        # If bucket doesn't exist or upload fails, store as base64 data URL fallback
        b64 = base64.b64encode(content).decode()
        file_url = f"data:{file.content_type or 'application/octet-stream'};base64,{b64[:100]}..."
        # For real deployment, ensure bucket exists
        raise HTTPException(status_code=500, detail="파일 업로드에 실패했습니다. Storage 버킷을 확인하세요.")

    # Get public URL
    file_url = supabase.storage.from_("course-files").get_public_url(storage_path)

    # Save metadata to DB
    result = (
        supabase.table("course_materials")
        .insert({
            "course_id": course_id,
            "uploaded_by": user["id"],
            "title": title,
            "file_name": file.filename or "unknown",
            "file_url": file_url,
            "file_size": file_size,
            "mime_type": file.content_type,
        })
        .execute()
    )
    return result.data[0]


@router.delete("/courses/{course_id}/materials/{material_id}", status_code=204)
async def delete_material(
    course_id: str, material_id: str, user: dict = Depends(require_professor)
):
    """교수가 강의자료 삭제"""
    supabase = get_supabase()

    mat = (
        supabase.table("course_materials")
        .select("*")
        .eq("id", material_id)
        .eq("course_id", course_id)
        .single()
        .execute()
    )
    if not mat.data:
        raise HTTPException(status_code=404, detail="자료를 찾을 수 없습니다.")

    supabase.table("course_materials").delete().eq("id", material_id).execute()
