"""교수↔학생 1:1 메신저 API"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from middleware.auth import get_current_user
from common.supabase_client import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(tags=["메신저"])


# ── Request / Response Models ──

class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)


# ── Helpers ──

def _get_course(course_id: str):
    """코스 정보를 가져온다."""
    sb = get_supabase()
    result = sb.table("courses").select("id, professor_id, is_personal").eq("id", course_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="코스를 찾을 수 없습니다.")
    return result.data


def _validate_messenger_access(user: dict, course: dict, partner_id: str):
    """메신저 접근 권한을 검증한다. 교수↔수강생 관계만 허용."""
    sb = get_supabase()
    course_id = course["id"]

    if course.get("is_personal"):
        raise HTTPException(status_code=403, detail="개인 모드에서는 메신저를 사용할 수 없습니다.")

    is_admin = user.get("email", "").endswith("@pikabuddy.admin")

    if user["role"] == "professor":
        # 교수: 자기 코스인지 + 상대가 수강생인지
        if course["professor_id"] != user["id"] and not is_admin:
            raise HTTPException(status_code=403, detail="본인 코스가 아닙니다.")
        enrolled = sb.table("enrollments").select("id").eq("course_id", course_id).eq("student_id", partner_id).execute()
        if not enrolled.data:
            raise HTTPException(status_code=403, detail="해당 학생은 이 코스에 등록되어 있지 않습니다.")

    elif user["role"] == "student":
        # 학생: 수강 중인 코스인지 + 상대가 교수 또는 같은 코스 수강생인지
        enrolled = sb.table("enrollments").select("id").eq("course_id", course_id).eq("student_id", user["id"]).execute()
        if not enrolled.data:
            raise HTTPException(status_code=403, detail="수강 중인 코스가 아닙니다.")
        if course["professor_id"] != partner_id:
            # 상대가 교수가 아니면 같은 코스 수강생인지 확인
            partner_enrolled = sb.table("enrollments").select("id").eq("course_id", course_id).eq("student_id", partner_id).execute()
            if not partner_enrolled.data:
                raise HTTPException(status_code=403, detail="같은 강의 수강생 또는 교수에게만 메시지를 보낼 수 있습니다.")

    else:
        raise HTTPException(status_code=403, detail="메신저는 교수/학생만 사용할 수 있습니다.")


# ── Endpoints ──

@router.get("/messenger/total-unread")
async def get_total_unread(user: dict = Depends(get_current_user)):
    """전체 코스에서 안 읽은 메시지 총 수."""
    sb = get_supabase()
    result = sb.table("messages") \
        .select("id", count="exact") \
        .eq("receiver_id", user["id"]) \
        .eq("is_read", False) \
        .execute()
    return {"count": result.count or 0}


@router.get("/messenger/recent-course")
async def get_recent_course(user: dict = Depends(get_current_user)):
    """가장 최근 메시지가 있는 코스 ID 반환 (메신저 바로가기용)."""
    sb = get_supabase()
    result = sb.table("messages") \
        .select("course_id") \
        .or_(f"sender_id.eq.{user['id']},receiver_id.eq.{user['id']}") \
        .order("created_at", desc=True) \
        .limit(1).execute()
    if result.data:
        return {"course_id": result.data[0]["course_id"]}
    # 메시지가 없으면 첫 번째 코스 반환
    role = user.get("role")
    if role == "professor":
        courses = sb.table("courses").select("id").eq("professor_id", user["id"]).limit(1).execute()
    else:
        enrollments = sb.table("enrollments").select("course_id").eq("student_id", user["id"]).limit(1).execute()
        course_ids = [e["course_id"] for e in (enrollments.data or [])]
        if course_ids:
            return {"course_id": course_ids[0]}
        return {"course_id": None}
    if courses.data:
        return {"course_id": courses.data[0]["id"]}
    return {"course_id": None}


@router.get("/courses/{course_id}/messenger/unread-count")
async def get_unread_count(course_id: str, user: dict = Depends(get_current_user)):
    """코스 내 안 읽은 메시지 수."""
    sb = get_supabase()
    result = sb.table("messages") \
        .select("id", count="exact") \
        .eq("course_id", course_id) \
        .eq("receiver_id", user["id"]) \
        .eq("is_read", False) \
        .execute()
    return {"count": result.count or 0}


@router.get("/courses/{course_id}/messenger/conversations")
async def list_conversations(course_id: str, user: dict = Depends(get_current_user)):
    """대화 상대 목록 + 마지막 메시지 + 안 읽은 수."""
    sb = get_supabase()
    course = _get_course(course_id)

    if course.get("is_personal"):
        return []

    user_id = user["id"]
    role = user.get("role")

    # 대화 상대 결정
    if role == "professor":
        is_admin = user.get("email", "").endswith("@pikabuddy.admin")
        if course["professor_id"] != user_id and not is_admin:
            raise HTTPException(status_code=403, detail="본인 코스가 아닙니다.")
        # 수강생 전체가 잠재 대화 상대
        enrollments = sb.table("enrollments") \
            .select("student_id") \
            .eq("course_id", course_id).execute()
        partner_ids = [e["student_id"] for e in (enrollments.data or [])]
    elif role == "student":
        # 수강 중인 코스인지 확인
        enrolled = sb.table("enrollments").select("id") \
            .eq("course_id", course_id).eq("student_id", user_id).execute()
        if not enrolled.data:
            logger.warning(f"[Messenger] Student {user_id} not enrolled in course {course_id}")
            return []
        # 교수 + 같은 코스 수강생 전부 대화 상대
        partner_ids = []
        prof_id = course.get("professor_id")
        if prof_id:
            partner_ids.append(prof_id)
        # 같은 코스 수강생
        peer_enrollments = sb.table("enrollments") \
            .select("student_id") \
            .eq("course_id", course_id).execute()
        for e in (peer_enrollments.data or []):
            if e["student_id"] != user_id and e["student_id"] not in partner_ids:
                partner_ids.append(e["student_id"])
    else:
        logger.info(f"[Messenger] User {user_id} role={role} cannot use messenger")
        return []

    if not partner_ids:
        logger.warning(f"[Messenger] No partner_ids found for user {user_id} (role={role}) in course {course_id}")
        return []

    # None 값 제거 (안전 처리)
    partner_ids = [pid for pid in partner_ids if pid is not None]
    if not partner_ids:
        logger.warning(f"[Messenger] All partner_ids were None for user {user_id} in course {course_id}")
        return []

    logger.info(f"[Messenger] Found {len(partner_ids)} partners for user {user_id} in course {course_id}")

    # 상대 정보 가져오기
    partners = sb.table("users") \
        .select("id, name, avatar_url, role") \
        .in_("id", partner_ids).execute()
    partner_map = {p["id"]: p for p in (partners.data or [])}

    conversations = []
    for pid in partner_ids:
        partner = partner_map.get(pid)
        if not partner:
            continue

        # 마지막 메시지
        last_msg = sb.table("messages") \
            .select("id, sender_id, receiver_id, content, is_read, created_at") \
            .eq("course_id", course_id) \
            .or_(
                f"and(sender_id.eq.{user_id},receiver_id.eq.{pid}),"
                f"and(sender_id.eq.{pid},receiver_id.eq.{user_id})"
            ) \
            .order("created_at", desc=True) \
            .limit(1).execute()

        # 안 읽은 수
        unread = sb.table("messages") \
            .select("id", count="exact") \
            .eq("course_id", course_id) \
            .eq("sender_id", pid) \
            .eq("receiver_id", user_id) \
            .eq("is_read", False).execute()

        conversations.append({
            "partner": partner,
            "last_message": last_msg.data[0] if last_msg.data else None,
            "unread_count": unread.count or 0,
        })

    # 최근 메시지순 정렬 (메시지 없는 사람은 뒤로), 안 읽은 수 내림차순
    def _sort_key(c):
        ts = c["last_message"]["created_at"] if c["last_message"] else ""
        return (-c["unread_count"], ts)

    # 2-pass: 먼저 최신순 desc, 그 다음 unread desc
    conversations.sort(key=lambda c: c["last_message"]["created_at"] if c["last_message"] else "", reverse=True)
    conversations.sort(key=lambda c: c["unread_count"], reverse=True)

    return conversations


@router.get("/courses/{course_id}/messenger/{partner_id}")
async def get_messages(
    course_id: str,
    partner_id: str,
    before: str | None = Query(None, description="ISO timestamp for pagination cursor"),
    limit: int = Query(50, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    """특정 상대와의 메시지 히스토리. 읽지 않은 메시지를 읽음 처리."""
    course = _get_course(course_id)
    _validate_messenger_access(user, course, partner_id)

    sb = get_supabase()
    user_id = user["id"]

    query = sb.table("messages") \
        .select("id, sender_id, receiver_id, content, is_read, created_at") \
        .eq("course_id", course_id) \
        .or_(
            f"and(sender_id.eq.{user_id},receiver_id.eq.{partner_id}),"
            f"and(sender_id.eq.{partner_id},receiver_id.eq.{user_id})"
        ) \
        .order("created_at", desc=True) \
        .limit(limit)

    if before:
        query = query.lt("created_at", before)

    result = query.execute()
    messages = list(reversed(result.data or []))

    # 상대방이 보낸 메시지 읽음 처리
    sb.table("messages") \
        .update({"is_read": True}) \
        .eq("course_id", course_id) \
        .eq("sender_id", partner_id) \
        .eq("receiver_id", user_id) \
        .eq("is_read", False) \
        .execute()

    return messages


@router.post("/courses/{course_id}/messenger/{partner_id}", status_code=201)
async def send_message(
    course_id: str,
    partner_id: str,
    body: SendMessageRequest,
    user: dict = Depends(get_current_user),
):
    """메시지 전송."""
    course = _get_course(course_id)
    _validate_messenger_access(user, course, partner_id)

    sb = get_supabase()
    row = {
        "course_id": course_id,
        "sender_id": user["id"],
        "receiver_id": partner_id,
        "content": body.content.strip(),
    }
    result = sb.table("messages").insert(row).execute()
    return result.data[0]
