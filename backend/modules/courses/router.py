import secrets
from fastapi import APIRouter, Depends, HTTPException, status
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
    if role == "personal":
        # 개인 모드: 개인 코스만
        return [c for c in all_courses.values() if c.get("is_personal")]
    elif role == "professor":
        # 교수 모드: 소유 강의 (개인 코스 포함)
        return [c for c in all_courses.values() if c.get("_relation") == "owner"]
    else:
        # 학생 모드: 수강 등록 강의 + 개인 코스 제외
        return [c for c in all_courses.values()
                if not c.get("is_personal") and (c.get("_relation") == "enrolled" or c["id"] in custom_banners)]


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

    # 역할별 접근 권한 검증
    is_admin = user.get("email", "").endswith("@pikabuddy.admin")
    if not is_admin:
        role = user.get("role")
        if role == "personal":
            course_check = (
                supabase.table("courses")
                .select("id")
                .eq("id", course_id)
                .eq("professor_id", user["id"])
                .eq("is_personal", True)
                .execute()
            )
            if not course_check.data:
                raise HTTPException(status_code=403, detail="접근 권한이 없습니다.")
        elif role == "professor":
            # 교수는 본인 소유 강의만 접근 가능
            course_check = (
                supabase.table("courses")
                .select("id")
                .eq("id", course_id)
                .eq("professor_id", user["id"])
                .execute()
            )
            if not course_check.data:
                raise HTTPException(status_code=403, detail="본인 소유의 강의가 아닙니다.")
        elif role == "student":
            enrollment = (
                supabase.table("enrollments")
                .select("id, custom_banner_url")
                .eq("student_id", user["id"])
                .eq("course_id", course_id)
                .execute()
            )
            if not enrollment.data:
                raise HTTPException(status_code=403, detail="수강하지 않은 강의입니다.")
        else:
            raise HTTPException(status_code=403, detail="접근 권한이 없습니다.")

    result = (
        supabase.table("courses")
        .select("*")
        .eq("id", course_id)
        .single()
        .execute()
    )
    data = result.data
    # 학생이면 커스텀 배너 포함
    if not is_admin and user.get("role") == "student" and enrollment.data:
        data["custom_banner_url"] = enrollment.data[0].get("custom_banner_url")
    return data


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
