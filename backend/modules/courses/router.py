import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from common.supabase_client import get_supabase
from middleware.auth import get_current_user, require_professor, require_student

router = APIRouter(prefix="/courses", tags=["강의"])


class CourseCreateRequest(BaseModel):
    title: str
    description: str | None = None
    objectives: list[str] | None = None


class JoinCourseRequest(BaseModel):
    invite_code: str


@router.post("", status_code=201)
async def create_course(body: CourseCreateRequest, user: dict = Depends(require_professor)):
    """교수가 강의를 생성한다."""
    supabase = get_supabase()
    invite_code = secrets.token_urlsafe(6)[:8].upper()

    result = (
        supabase.table("courses")
        .insert(
            {
                "professor_id": user["id"],
                "title": body.title,
                "description": body.description,
                "objectives": body.objectives,
                "invite_code": invite_code,
            }
        )
        .execute()
    )
    return result.data[0]


@router.get("")
async def list_courses(user: dict = Depends(get_current_user)):
    """내 강의 목록 조회"""
    supabase = get_supabase()

    if user["role"] == "professor":
        result = (
            supabase.table("courses")
            .select("*")
            .eq("professor_id", user["id"])
            .execute()
        )
    else:
        enrollment_result = (
            supabase.table("enrollments")
            .select("course_id")
            .eq("student_id", user["id"])
            .execute()
        )
        course_ids = [e["course_id"] for e in enrollment_result.data]
        if not course_ids:
            return []
        result = (
            supabase.table("courses")
            .select("*")
            .in_("id", course_ids)
            .execute()
        )

    return result.data


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
    body: JoinCourseRequest, user: dict = Depends(require_student)
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


@router.get("/{course_id}")
async def get_course(course_id: str, user: dict = Depends(get_current_user)):
    """강의 상세 조회"""
    supabase = get_supabase()

    # 학생은 수강 등록된 강의만 접근 가능
    is_admin = user.get("email", "").endswith("@pikabuddy.admin")
    if user.get("role") == "student" and not is_admin:
        enrollment = (
            supabase.table("enrollments")
            .select("id")
            .eq("student_id", user["id"])
            .eq("course_id", course_id)
            .execute()
        )
        if not enrollment.data:
            raise HTTPException(status_code=403, detail="수강하지 않은 강의입니다.")

    result = (
        supabase.table("courses")
        .select("*")
        .eq("id", course_id)
        .single()
        .execute()
    )
    return result.data
