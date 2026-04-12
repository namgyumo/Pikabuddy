import secrets
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import BaseModel
from common.supabase_client import get_supabase
from middleware.auth import get_current_user, require_professor_or_personal, require_student_or_personal

router = APIRouter(prefix="/courses", tags=["강의"])


class CourseCreateRequest(BaseModel):
    title: str
    description: str | None = None
    objectives: list[str] | None = None
    banner_url: str | None = None


class JoinCourseRequest(BaseModel):
    invite_code: str


@router.post("", status_code=201)
async def create_course(body: CourseCreateRequest, user: dict = Depends(require_professor_or_personal)):
    """교수가 강의를 생성한다."""
    supabase = get_supabase()
    invite_code = secrets.token_urlsafe(6)[:8].upper()

    row = {
        "professor_id": user["id"],
        "title": body.title,
        "description": body.description,
        "objectives": body.objectives,
        "invite_code": invite_code,
    }
    if body.banner_url:
        row["banner_url"] = body.banner_url

    result = supabase.table("courses").insert(row).execute()
    return result.data[0]


@router.get("")
async def list_courses(user: dict = Depends(get_current_user)):
    """내 강의 목록 조회 — 역할과 관계없이 관련된 모든 강의를 반환"""
    supabase = get_supabase()
    uid = user["id"]
    role = user["role"]

    all_courses: dict = {}  # id → course dict

    # 1) 교수로서 소유한 강의
    owned = supabase.table("courses").select("*").eq("professor_id", uid).execute()
    for c in (owned.data or []):
        c["_relation"] = "owner"
        all_courses[c["id"]] = c

    # 2) 수강 등록된 강의
    enrollment_result = (
        supabase.table("enrollments")
        .select("course_id, custom_banner_url")
        .eq("student_id", uid)
        .execute()
    )
    custom_banners = {}
    if enrollment_result.data:
        course_ids = [e["course_id"] for e in enrollment_result.data if e["course_id"] not in all_courses]
        custom_banners = {e["course_id"]: e.get("custom_banner_url") for e in enrollment_result.data}
        if course_ids:
            enrolled = supabase.table("courses").select("*").in_("id", course_ids).execute()
            for c in (enrolled.data or []):
                c["_relation"] = "enrolled"
                all_courses[c["id"]] = c

    # 커스텀 배너 적용
    for cid, banner in custom_banners.items():
        if cid in all_courses and banner:
            all_courses[cid]["custom_banner_url"] = banner

    # 3) 역할 기반 필터링
    # 개인 모드: 본인 소유 개인 코스만
    # 교수/학생 모드: 비개인 코스 + 타인의 개인 코스에 수강 등록된 경우도 표시
    if role == "personal":
        return [c for c in all_courses.values() if c.get("is_personal")]
    else:
        return [c for c in all_courses.values()
                if not c.get("is_personal") or c.get("_relation") == "enrolled"]


@router.get("/by-invite/{invite_code}")
async def get_course_by_invite(invite_code: str):
    """초대 코드로 강의 정보 조회 (인증 불필요, QR 가입 전 미리보기용)"""
    supabase = get_supabase()
    result = (
        supabase.table("courses")
        .select("id, title, description, objectives")
        .eq("invite_code", invite_code.upper())
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="유효하지 않은 초대 코드입니다.")
    return result.data


# /join MUST come before /{course_id} to avoid "join" being treated as a course_id
@router.post("/join")
async def join_course_by_code(
    body: JoinCourseRequest, user: dict = Depends(require_student_or_personal)
):
    """초대 코드만으로 강의 참여"""
    supabase = get_supabase()

    course = (
        supabase.table("courses")
        .select("*")
        .eq("invite_code", body.invite_code)
        .single()
        .execute()
    )
    if not course.data:
        raise HTTPException(status_code=404, detail="초대 코드가 유효하지 않습니다.")

    course_id = course.data["id"]

    existing = (
        supabase.table("enrollments")
        .select("id")
        .eq("student_id", user["id"])
        .eq("course_id", course_id)
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=400, detail="이미 참여한 강의입니다.")

    supabase.table("enrollments").insert(
        {"student_id": user["id"], "course_id": course_id}
    ).execute()

    return {"message": "강의에 참여했습니다.", "course": course.data}


class CourseUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    banner_url: str | None = None


@router.patch("/{course_id}")
async def update_course(course_id: str, body: CourseUpdateRequest, user: dict = Depends(require_professor_or_personal)):
    """강의 정보 수정 (배너 등)"""
    supabase = get_supabase()
    # 소유권 확인
    course = supabase.table("courses").select("id, professor_id").eq("id", course_id).single().execute()
    if not course.data or course.data["professor_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="본인 강의만 수정할 수 있습니다.")

    updates = {}
    if body.title is not None:
        updates["title"] = body.title
    if body.description is not None:
        updates["description"] = body.description
    if body.banner_url is not None:
        updates["banner_url"] = body.banner_url

    if not updates:
        raise HTTPException(status_code=400, detail="수정할 내용이 없습니다.")

    result = supabase.table("courses").update(updates).eq("id", course_id).execute()
    return result.data[0]


@router.get("/{course_id}")
async def get_course(course_id: str, user: dict = Depends(get_current_user)):
    """강의 상세 조회"""
    supabase = get_supabase()

    # 접근 권한 검증: 소유 OR 수강 등록이면 허용 (역할 무관)
    is_admin = user.get("email", "").endswith("@pikabuddy.admin")
    enrollment = None
    if not is_admin:
        uid = user["id"]
        # 소유자인지 확인
        owned = supabase.table("courses").select("id").eq("id", course_id).eq("professor_id", uid).execute()
        if not owned.data:
            # 수강 등록 확인
            enrollment = (
                supabase.table("enrollments")
                .select("id, custom_banner_url")
                .eq("student_id", uid)
                .eq("course_id", course_id)
                .execute()
            )
            if not enrollment.data:
                raise HTTPException(status_code=403, detail="접근 권한이 없습니다.")

    result = (
        supabase.table("courses")
        .select("*")
        .eq("id", course_id)
        .single()
        .execute()
    )
    data = result.data
    # 수강 등록된 경우 커스텀 배너 포함
    if enrollment and enrollment.data:
        data["custom_banner_url"] = enrollment.data[0].get("custom_banner_url")
    return data


@router.get("/{course_id}/info")
async def get_course_info(course_id: str, user: dict = Depends(get_current_user)):
    """강의 정보 요약 (수강생 수, 교수 이름, 생성일 등) — 병렬 쿼리"""
    import asyncio
    from concurrent.futures import ThreadPoolExecutor

    supabase = get_supabase()

    def q_course():
        return supabase.table("courses").select("*").eq("id", course_id).single().execute()
    def q_enroll():
        return supabase.table("enrollments").select("id", count="exact").eq("course_id", course_id).execute()
    def q_assign():
        return supabase.table("assignments").select("id", count="exact").eq("course_id", course_id).execute()
    def q_notes():
        return supabase.table("notes").select("id", count="exact").eq("course_id", course_id).execute()

    loop = asyncio.get_running_loop()
    with ThreadPoolExecutor(max_workers=4) as pool:
        course_f, enroll_f, assign_f, notes_f = await asyncio.gather(
            loop.run_in_executor(pool, q_course),
            loop.run_in_executor(pool, q_enroll),
            loop.run_in_executor(pool, q_assign),
            loop.run_in_executor(pool, q_notes),
        )

    if not course_f.data:
        raise HTTPException(status_code=404, detail="강의를 찾을 수 없습니다.")

    # 교수 이름 — 추가 1회 쿼리 (course 결과 필요)
    prof = supabase.table("users").select("name").eq("id", course_f.data["professor_id"]).single().execute()
    prof_name = (prof.data or {}).get("name", "알 수 없음")

    return {
        "id": course_f.data["id"],
        "title": course_f.data["title"],
        "description": course_f.data.get("description"),
        "objectives": course_f.data.get("objectives"),
        "invite_code": course_f.data.get("invite_code"),
        "professor_name": prof_name,
        "student_count": enroll_f.count or 0,
        "assignment_count": assign_f.count or 0,
        "note_count": notes_f.count or 0,
        "created_at": course_f.data.get("created_at"),
    }


class CustomBannerRequest(BaseModel):
    banner_url: str | None = None


@router.patch("/{course_id}/my-banner")
async def set_custom_banner(course_id: str, body: CustomBannerRequest, user: dict = Depends(get_current_user)):
    """학생이 자기만 보이는 커스텀 배너를 설정한다. null이면 교수 기본 배너로 복원."""
    supabase = get_supabase()
    enrollment = (
        supabase.table("enrollments")
        .select("id")
        .eq("student_id", user["id"])
        .eq("course_id", course_id)
        .execute()
    )
    if not enrollment.data:
        raise HTTPException(status_code=403, detail="수강 중인 강의가 아닙니다.")

    supabase.table("enrollments") \
        .update({"custom_banner_url": body.banner_url}) \
        .eq("student_id", user["id"]) \
        .eq("course_id", course_id) \
        .execute()

    return {"custom_banner_url": body.banner_url}


ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_IMAGE_EXTS = {"jpg", "jpeg", "png", "gif", "webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/{course_id}/banner-image")
async def upload_course_banner_image(
    course_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """강의 배너 이미지 업로드 (유저 프로필은 변경하지 않음)"""
    ext = (file.filename.split(".")[-1] if file.filename else "png").lower()
    if ext not in ALLOWED_IMAGE_EXTS:
        raise HTTPException(status_code=400, detail="허용되지 않는 파일 형식입니다. (jpg, png, gif, webp)")
    if file.content_type and file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="허용되지 않는 이미지 형식입니다.")
    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="파일 크기가 5MB를 초과합니다.")

    supabase = get_supabase()
    path = f"banners/course_{course_id}/{uuid.uuid4().hex}.{ext}"
    supabase.storage.from_("banners").upload(path, content, {"content-type": file.content_type or "image/png"})
    url = supabase.storage.from_("banners").get_public_url(path)

    return {"banner_url": url}
