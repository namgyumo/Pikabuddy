"""알림 센터 API — 안 읽은 메시지 + 미해결 코멘트 통합"""

from fastapi import APIRouter, Depends
from middleware.auth import get_current_user
from common.supabase_client import get_supabase

router = APIRouter(tags=["알림"])


@router.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    """안 읽은 메시지, 미해결 코멘트, 최근 알림 항목을 반환."""
    sb = get_supabase()
    uid = user["id"]
    role = user["role"]

    # ── 1) 안 읽은 메시지 수 (전체 코스) ──
    unread_msgs = sb.table("messages") \
        .select("id, course_id, sender_id, content, created_at, courses(title), users!messages_sender_id_fkey(name, avatar_url)", count="exact") \
        .eq("receiver_id", uid) \
        .eq("is_read", False) \
        .order("created_at", desc=True) \
        .limit(10) \
        .execute()

    # ── 2) 미해결 코멘트 수 (본인 노트에 달린) ──
    # 교수 → 본인이 담당하는 코스의 노트에 달린 미해결 코멘트 (학생 답글 등)
    # 학생 → 본인 노트에 달린 미해결 코멘트 (교수 피드백 등)
    if role == "professor":
        # 교수 코스 조회
        courses = sb.table("courses").select("id").eq("professor_id", uid).execute()
        course_ids = [c["id"] for c in (courses.data or [])]
        if course_ids:
            # 교수 코스 노트에 달린 남의 코멘트 (본인 제외)
            comment_result = sb.table("note_comments") \
                .select("id, note_id, content, created_at, block_index, users(name, avatar_url), notes!inner(title, course_id)", count="exact") \
                .in_("notes.course_id", course_ids) \
                .neq("user_id", uid) \
                .eq("is_resolved", False) \
                .order("created_at", desc=True) \
                .limit(10) \
                .execute()
        else:
            comment_result = type("R", (), {"data": [], "count": 0})()
    else:
        # 학생: 본인 노트에 달린 남의 코멘트
        my_notes = sb.table("notes").select("id").eq("student_id", uid).execute()
        note_ids = [n["id"] for n in (my_notes.data or [])]
        if note_ids:
            comment_result = sb.table("note_comments") \
                .select("id, note_id, content, created_at, block_index, users(name, avatar_url), notes!inner(title)") \
                .in_("note_id", note_ids) \
                .neq("user_id", uid) \
                .eq("is_resolved", False) \
                .order("created_at", desc=True) \
                .limit(10) \
                .execute()
        else:
            comment_result = type("R", (), {"data": [], "count": 0})()

    # ── 알림 항목 조합 ──
    items = []

    for msg in (unread_msgs.data or []):
        sender = msg.pop("users", {}) or {}
        course = msg.pop("courses", {}) or {}
        items.append({
            "type": "message",
            "id": msg["id"],
            "course_id": msg["course_id"],
            "course_title": course.get("title", ""),
            "sender_id": msg["sender_id"],
            "sender_name": sender.get("name", ""),
            "sender_avatar": sender.get("avatar_url"),
            "preview": msg["content"][:80],
            "created_at": msg["created_at"],
        })

    for cmt in (comment_result.data or []):
        commenter = cmt.pop("users", {}) or {}
        note = cmt.pop("notes", {}) or {}
        items.append({
            "type": "comment",
            "id": cmt["id"],
            "note_id": cmt["note_id"],
            "note_title": note.get("title", ""),
            "commenter_name": commenter.get("name", ""),
            "commenter_avatar": commenter.get("avatar_url"),
            "block_index": cmt["block_index"],
            "preview": cmt["content"][:80],
            "created_at": cmt["created_at"],
        })

    # 최신순 정렬
    items.sort(key=lambda x: x["created_at"], reverse=True)

    return {
        "unread_messages": unread_msgs.count or 0,
        "unresolved_comments": getattr(comment_result, "count", None) or len(comment_result.data or []),
        "total": (unread_msgs.count or 0) + (getattr(comment_result, "count", None) or len(comment_result.data or [])),
        "items": items[:20],
    }


@router.get("/messenger/total-unread")
async def get_total_unread(user: dict = Depends(get_current_user)):
    """전체 코스 안 읽은 메시지 수 (사이드바 뱃지용)."""
    sb = get_supabase()
    result = sb.table("messages") \
        .select("id", count="exact") \
        .eq("receiver_id", user["id"]) \
        .eq("is_read", False) \
        .execute()
    return {"count": result.count or 0}


@router.get("/messenger/recent-course")
async def get_recent_messenger_course(user: dict = Depends(get_current_user)):
    """가장 최근 메시지가 있는 코스 ID 반환 (메신저 바로가기용)."""
    sb = get_supabase()
    uid = user["id"]

    # 최근 메시지가 있는 코스
    result = sb.table("messages") \
        .select("course_id, created_at") \
        .or_(f"sender_id.eq.{uid},receiver_id.eq.{uid}") \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()

    if result.data:
        return {"course_id": result.data[0]["course_id"]}

    # 메시지가 없으면 첫 번째 등록 코스
    if user["role"] == "professor":
        courses = sb.table("courses").select("id").eq("professor_id", uid).limit(1).execute()
    else:
        enrollments = sb.table("enrollments").select("course_id").eq("student_id", uid).limit(1).execute()
        courses = type("R", (), {"data": [{"id": e["course_id"]} for e in (enrollments.data or [])]})()

    if courses.data:
        return {"course_id": courses.data[0]["id"]}

    return {"course_id": None}
