from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from common.supabase_client import get_supabase
from middleware.auth import get_current_user

router = APIRouter(tags=["events"])


def _validate_iso8601(value: str) -> str:
    """ISO 8601 날짜 형식 검증."""
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        raise ValueError(f"유효하지 않은 ISO 8601 날짜 형식입니다: {value}")
    return value


class EventCreate(BaseModel):
    title: str
    description: str | None = None
    event_date: str  # ISO 8601
    end_date: str | None = None  # ISO 8601, 기간 일정용
    color: str = "primary"

    @field_validator("event_date")
    @classmethod
    def validate_event_date(cls, v: str) -> str:
        return _validate_iso8601(v)

    @field_validator("end_date")
    @classmethod
    def validate_end_date(cls, v: str | None) -> str | None:
        if v is not None:
            return _validate_iso8601(v)
        return v


class EventUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    event_date: str | None = None
    end_date: str | None = None
    color: str | None = None

    @field_validator("event_date")
    @classmethod
    def validate_event_date(cls, v: str | None) -> str | None:
        if v is not None:
            return _validate_iso8601(v)
        return v

    @field_validator("end_date")
    @classmethod
    def validate_end_date(cls, v: str | None) -> str | None:
        if v is not None:
            return _validate_iso8601(v)
        return v


@router.get("/events")
async def list_events(user: dict = Depends(get_current_user)):
    """사용자의 일정 목록"""
    supabase = get_supabase()
    result = supabase.table("user_events").select("*").eq(
        "user_id", user["id"]
    ).order("event_date").execute()
    return result.data or []


@router.post("/events", status_code=201)
async def create_event(body: EventCreate, user: dict = Depends(get_current_user)):
    """일정 생성"""
    supabase = get_supabase()
    row = {
        "user_id": user["id"],
        "title": body.title,
        "description": body.description,
        "event_date": body.event_date,
        "color": body.color,
    }
    if body.end_date:
        row["end_date"] = body.end_date
    result = supabase.table("user_events").insert(row).execute()
    return result.data[0] if result.data else {}


@router.patch("/events/{event_id}")
async def update_event(event_id: str, body: EventUpdate, user: dict = Depends(get_current_user)):
    """일정 수정"""
    supabase = get_supabase()
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="수정할 항목이 없습니다.")
    result = supabase.table("user_events").update(updates).eq(
        "id", event_id
    ).eq("user_id", user["id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="일정을 찾을 수 없습니다.")
    return {"message": "일정이 수정되었습니다."}


@router.delete("/events/{event_id}")
async def delete_event(event_id: str, user: dict = Depends(get_current_user)):
    """일정 삭제"""
    supabase = get_supabase()
    result = supabase.table("user_events").delete().eq(
        "id", event_id
    ).eq("user_id", user["id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="일정을 찾을 수 없습니다.")
    return {"message": "일정이 삭제되었습니다."}


@router.get("/calendar")
async def get_calendar(user: dict = Depends(get_current_user)):
    """캘린더 데이터: 참여 중인 모든 강의의 과제 마감일 + 개인 일정"""
    supabase = get_supabase()
    uid = user["id"]
    role = user.get("role", "student")

    # 참여 중인 코스의 과제 (due_date가 있는 것만)
    if role == "professor":
        courses = supabase.table("courses").select("id, title").eq("professor_id", uid).execute()
    else:
        enrollments = supabase.table("enrollments").select("course_id").eq("student_id", uid).execute()
        course_ids = [e["course_id"] for e in (enrollments.data or [])]
        if course_ids:
            courses = supabase.table("courses").select("id, title").in_("id", course_ids).execute()
        else:
            courses = type("R", (), {"data": []})()

    course_map = {c["id"]: c["title"] for c in (courses.data or [])}

    assignments = []
    course_ids_list = list(course_map.keys())
    if course_ids_list:
        # 단일 쿼리로 모든 코스의 과제를 한 번에 조회 (N+1 쿼리 방지)
        query = supabase.table("assignments").select(
            "id, title, type, due_date, status, course_id"
        ).in_("course_id", course_ids_list).not_.is_("due_date", "null")
        if role != "professor":
            query = query.eq("status", "published")
        result = query.execute()
        for a in (result.data or []):
            assignments.append({
                "id": a["id"],
                "title": a["title"],
                "type": a["type"],
                "due_date": a["due_date"],
                "course_id": a["course_id"],
                "course_title": course_map.get(a["course_id"], ""),
                "kind": "assignment",
            })

    # 개인 일정
    events_result = supabase.table("user_events").select("*").eq("user_id", uid).execute()
    events = []
    for e in (events_result.data or []):
        events.append({
            "id": e["id"],
            "title": e["title"],
            "description": e.get("description"),
            "event_date": e["event_date"],
            "end_date": e.get("end_date"),
            "color": e.get("color", "primary"),
            "kind": "event",
        })

    return {"assignments": assignments, "events": events}


@router.get("/todos")
async def get_todos(user: dict = Depends(get_current_user)):
    """할 일 목록: 미제출 과제 + 최근 미정리 노트"""
    supabase = get_supabase()
    uid = user["id"]
    role = user.get("role", "student")

    # 참여 중인 코스
    if role == "professor":
        courses = supabase.table("courses").select("id, title").eq("professor_id", uid).execute()
    else:
        enrollments = supabase.table("enrollments").select("course_id").eq("student_id", uid).execute()
        course_ids = [e["course_id"] for e in (enrollments.data or [])]
        if course_ids:
            courses = supabase.table("courses").select("id, title").in_("id", course_ids).execute()
        else:
            courses = type("R", (), {"data": []})()

    course_map = {c["id"]: c["title"] for c in (courses.data or [])}
    todos = []

    # 미제출 과제
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    for cid in course_map:
        result = supabase.table("assignments").select(
            "id, title, type, due_date, course_id, language, ai_policy, problems"
        ).eq("course_id", cid).eq("status", "published").execute()
        for a in (result.data or []):
            # 마감된 과제 제외
            if a.get("due_date"):
                try:
                    due = datetime.fromisoformat(a["due_date"].replace("Z", "+00:00"))
                    if due < now:
                        continue
                except (ValueError, TypeError):
                    pass
            # 제출 여부 확인
            sub = supabase.table("submissions").select("id").eq(
                "assignment_id", a["id"]
            ).eq("student_id", uid).limit(1).execute()
            if not (sub.data or []):
                problems = a.get("problems") or []
                todos.append({
                    "id": a["id"],
                    "title": a["title"],
                    "kind": "assignment",
                    "type": a.get("type"),
                    "due_date": a.get("due_date"),
                    "course_id": a["course_id"],
                    "course_title": course_map.get(a["course_id"], ""),
                    "language": a.get("language"),
                    "ai_policy": a.get("ai_policy"),
                    "problem_count": len(problems),
                })

    # 정렬: 마감 가까운 순
    def sort_key(t):
        if t.get("due_date"):
            return t["due_date"]
        return "9999"
    todos.sort(key=sort_key)

    return todos
