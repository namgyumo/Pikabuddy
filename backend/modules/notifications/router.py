"""알림 센터 API — 안 읽은 메시지 + 미해결 코멘트 + 마감 임박 과제 통합"""

import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from middleware.auth import get_current_user
from common.supabase_client import get_supabase

logger = logging.getLogger(__name__)

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
                .select("id, note_id, content, created_at, block_index, users(name, avatar_url), notes!inner(title, course_id, student_id)", count="exact") \
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
                .select("id, note_id, content, created_at, block_index, users(name, avatar_url), notes!inner(title, course_id, student_id)") \
                .in_("note_id", note_ids) \
                .neq("user_id", uid) \
                .eq("is_resolved", False) \
                .order("created_at", desc=True) \
                .limit(10) \
                .execute()
        else:
            comment_result = type("R", (), {"data": [], "count": 0})()

    # ── 3) 마감 임박 과제 (24시간 이내) ──
    deadline_items = []
    now = datetime.now(timezone.utc)
    deadline_cutoff = (now + timedelta(hours=24)).isoformat()

    enrolled_course_ids = []
    if role == "student":
        # 학생이 등록된 코스의 과제 중 마감 임박한 것
        enrollments = sb.table("enrollments").select("course_id").eq("student_id", uid).execute()
        enrolled_course_ids = [e["course_id"] for e in (enrollments.data or []) if e.get("course_id")]
        if enrolled_course_ids:
            try:
                deadlines = sb.table("assignments").select(
                    "id, title, course_id, due_date, courses(title)"
                ).in_("course_id", enrolled_course_ids) \
                 .not_.is_("due_date", "null") \
                 .gt("due_date", now.isoformat()) \
                 .lt("due_date", deadline_cutoff) \
                 .eq("status", "published") \
                 .order("due_date") \
                 .limit(5) \
                 .execute()
                for a in (deadlines.data or []):
                    course_info = a.pop("courses", {}) or {}
                    if a.get("due_date"):
                        deadline_items.append({
                            "type": "deadline",
                            "id": a["id"],
                            "course_id": a["course_id"],
                            "course_title": course_info.get("title", ""),
                            "assignment_title": a["title"],
                            "due_date": a["due_date"],
                            "preview": f"'{a['title']}' 마감이 임박했습니다",
                            "created_at": a["due_date"],
                        })
            except Exception as e:
                logger.warning(f"[Notifications] 마감 알림 조회 실패: {e}")
    elif role == "personal":
        # 개인 모드 — 본인이 만든 과제
        personal_courses = sb.table("courses").select("id").eq("professor_id", uid).eq("is_personal", True).execute()
        p_cids = [c["id"] for c in (personal_courses.data or []) if c.get("id")]
        if p_cids:
            try:
                deadlines = sb.table("assignments").select(
                    "id, title, course_id, due_date"
                ).in_("course_id", p_cids) \
                 .not_.is_("due_date", "null") \
                 .gt("due_date", now.isoformat()) \
                 .lt("due_date", deadline_cutoff) \
                 .order("due_date") \
                 .limit(5) \
                 .execute()
                for a in (deadlines.data or []):
                    if a.get("due_date"):
                        deadline_items.append({
                            "type": "deadline",
                            "id": a["id"],
                            "course_id": a["course_id"],
                            "course_title": "",
                            "assignment_title": a["title"],
                            "due_date": a["due_date"],
                            "preview": f"'{a['title']}' 마감이 임박했습니다",
                            "created_at": a["due_date"],
                        })
            except Exception as e:
                logger.warning(f"[Notifications] 마감 알림 조회 실패: {e}")

    # ── 4) 새 과제/자료 알림 (학생용, 최근 24시간 이내 등록된 것) ──
    new_material_items = []
    if role == "student":
        recent_cutoff = (now - timedelta(hours=24)).isoformat()
        # enrolled_course_ids already computed in section 3
        if enrolled_course_ids:
            # 새 과제
            new_assignments = sb.table("assignments").select(
                "id, title, course_id, created_at, courses(title)"
            ).in_("course_id", enrolled_course_ids) \
             .eq("status", "published") \
             .gt("created_at", recent_cutoff) \
             .order("created_at", desc=True) \
             .limit(5) \
             .execute()
            for a in (new_assignments.data or []):
                course_info = a.pop("courses", {}) or {}
                new_material_items.append({
                    "type": "new_material",
                    "id": a["id"],
                    "course_id": a["course_id"],
                    "course_title": course_info.get("title", ""),
                    "assignment_title": a["title"],
                    "preview": f"새 과제: '{a['title']}'",
                    "created_at": a["created_at"],
                })
            # 새 자료
            new_materials = sb.table("course_materials").select(
                "id, title, course_id, created_at, courses(title)"
            ).in_("course_id", enrolled_course_ids) \
             .gt("created_at", recent_cutoff) \
             .order("created_at", desc=True) \
             .limit(5) \
             .execute()
            for m in (new_materials.data or []):
                course_info = m.pop("courses", {}) or {}
                new_material_items.append({
                    "type": "new_material",
                    "id": m["id"],
                    "course_id": m["course_id"],
                    "course_title": course_info.get("title", ""),
                    "assignment_title": m["title"],
                    "preview": f"새 자료: '{m['title']}'",
                    "created_at": m["created_at"],
                })

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
            "course_id": note.get("course_id", ""),
            "student_id": note.get("student_id", ""),
            "note_title": note.get("title", ""),
            "commenter_name": commenter.get("name", ""),
            "commenter_avatar": commenter.get("avatar_url"),
            "block_index": cmt["block_index"],
            "preview": cmt["content"][:80],
            "created_at": cmt["created_at"],
        })

    # 마감 알림 추가
    items.extend(deadline_items)
    # 새 과제/자료 알림 추가
    items.extend(new_material_items)

    # 최신순 정렬
    items.sort(key=lambda x: x.get("created_at") or "", reverse=True)

    deadline_count = len(deadline_items)
    new_material_count = len(new_material_items)
    return {
        "unread_messages": unread_msgs.count or 0,
        "unresolved_comments": getattr(comment_result, "count", None) or len(comment_result.data or []),
        "upcoming_deadlines": deadline_count,
        "new_materials": new_material_count,
        "total": (unread_msgs.count or 0) + (getattr(comment_result, "count", None) or len(comment_result.data or [])) + deadline_count + new_material_count,
        "items": items[:20],
    }


@router.get("/notifications/history")
async def get_notification_history(user: dict = Depends(get_current_user)):
    """이때까지 받은 메시지 + 코멘트 전체 히스토리 (읽은 것 포함)."""
    sb = get_supabase()
    uid = user["id"]
    role = user["role"]

    items = []

    # ── 1) 전체 수신 메시지 (읽은 것 포함) ──
    msgs = sb.table("messages") \
        .select("id, course_id, sender_id, content, created_at, is_read, courses(title), users!messages_sender_id_fkey(name, avatar_url)") \
        .eq("receiver_id", uid) \
        .order("created_at", desc=True) \
        .limit(50) \
        .execute()

    for msg in (msgs.data or []):
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
            "is_read": msg.get("is_read", True),
        })

    # ── 2) 전체 코멘트 (해결된 것 포함) ──
    if role == "professor":
        courses = sb.table("courses").select("id").eq("professor_id", uid).execute()
        course_ids = [c["id"] for c in (courses.data or [])]
        if course_ids:
            cmts = sb.table("note_comments") \
                .select("id, note_id, content, created_at, block_index, is_resolved, users(name, avatar_url), notes!inner(title, course_id, student_id)") \
                .in_("notes.course_id", course_ids) \
                .neq("user_id", uid) \
                .order("created_at", desc=True) \
                .limit(50) \
                .execute()
        else:
            cmts = type("R", (), {"data": []})()
    else:
        my_notes = sb.table("notes").select("id").eq("student_id", uid).execute()
        note_ids = [n["id"] for n in (my_notes.data or [])]
        if note_ids:
            cmts = sb.table("note_comments") \
                .select("id, note_id, content, created_at, block_index, is_resolved, users(name, avatar_url), notes!inner(title, course_id, student_id)") \
                .in_("note_id", note_ids) \
                .neq("user_id", uid) \
                .order("created_at", desc=True) \
                .limit(50) \
                .execute()
        else:
            cmts = type("R", (), {"data": []})()

    for cmt in (cmts.data or []):
        commenter = cmt.pop("users", {}) or {}
        note = cmt.pop("notes", {}) or {}
        items.append({
            "type": "comment",
            "id": cmt["id"],
            "note_id": cmt["note_id"],
            "course_id": note.get("course_id", ""),
            "student_id": note.get("student_id", ""),
            "note_title": note.get("title", ""),
            "commenter_name": commenter.get("name", ""),
            "commenter_avatar": commenter.get("avatar_url"),
            "block_index": cmt["block_index"],
            "preview": cmt["content"][:80],
            "created_at": cmt["created_at"],
            "is_read": cmt.get("is_resolved", True),
        })

    # ── 3) 시스템 알림: 과제/자료 (최근 7일) ──
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()

    if role == "student":
        enrollments = sb.table("enrollments").select("course_id").eq("student_id", uid).execute()
        enrolled_ids = [e["course_id"] for e in (enrollments.data or [])]
        if enrolled_ids:
            # 새 과제
            new_assigns = sb.table("assignments").select(
                "id, title, course_id, created_at, due_date, courses(title)"
            ).in_("course_id", enrolled_ids) \
             .eq("status", "published") \
             .gt("created_at", week_ago) \
             .order("created_at", desc=True) \
             .limit(30) \
             .execute()
            for a in (new_assigns.data or []):
                ci = a.pop("courses", {}) or {}
                items.append({
                    "type": "system",
                    "id": a["id"],
                    "course_id": a["course_id"],
                    "course_title": ci.get("title", ""),
                    "preview": f"새 과제: '{a['title']}'",
                    "created_at": a["created_at"],
                    "is_read": True,
                    "system_kind": "new_assignment",
                })
                # 마감 임박 알림
                if a.get("due_date"):
                    due = datetime.fromisoformat(a["due_date"].replace("Z", "+00:00"))
                    if now < due < now + timedelta(hours=48):
                        items.append({
                            "type": "system",
                            "id": f"deadline-{a['id']}",
                            "course_id": a["course_id"],
                            "course_title": ci.get("title", ""),
                            "preview": f"'{a['title']}' 마감이 임박했습니다",
                            "created_at": a["due_date"],
                            "is_read": True,
                            "system_kind": "deadline",
                        })
            # 새 자료
            new_mats = sb.table("course_materials").select(
                "id, title, course_id, created_at, courses(title)"
            ).in_("course_id", enrolled_ids) \
             .gt("created_at", week_ago) \
             .order("created_at", desc=True) \
             .limit(20) \
             .execute()
            for m in (new_mats.data or []):
                ci = m.pop("courses", {}) or {}
                items.append({
                    "type": "system",
                    "id": m["id"],
                    "course_id": m["course_id"],
                    "course_title": ci.get("title", ""),
                    "preview": f"새 자료: '{m['title']}'",
                    "created_at": m["created_at"],
                    "is_read": True,
                    "system_kind": "new_material",
                })

    items.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return {"items": items[:100]}


@router.post("/notifications/mark-read")
async def mark_notifications_read(user: dict = Depends(get_current_user)):
    """알림 패널을 열었을 때 메시지 읽음 처리 + 코멘트 해결 처리."""
    sb = get_supabase()
    uid = user["id"]

    # 1) 안 읽은 메시지 → 읽음 처리
    sb.table("messages") \
        .update({"is_read": True}) \
        .eq("receiver_id", uid) \
        .eq("is_read", False) \
        .execute()

    # 2) 미해결 코멘트 → 해결 처리 (본인 노트에 달린 것만)
    if user["role"] == "professor":
        courses = sb.table("courses").select("id").eq("professor_id", uid).execute()
        course_ids = [c["id"] for c in (courses.data or [])]
        if course_ids:
            notes = sb.table("notes").select("id").in_("course_id", course_ids).execute()
            note_ids = [n["id"] for n in (notes.data or [])]
            if note_ids:
                sb.table("note_comments") \
                    .update({"is_resolved": True}) \
                    .in_("note_id", note_ids) \
                    .neq("user_id", uid) \
                    .eq("is_resolved", False) \
                    .execute()
    else:
        my_notes = sb.table("notes").select("id").eq("student_id", uid).execute()
        note_ids = [n["id"] for n in (my_notes.data or [])]
        if note_ids:
            sb.table("note_comments") \
                .update({"is_resolved": True}) \
                .in_("note_id", note_ids) \
                .neq("user_id", uid) \
                .eq("is_resolved", False) \
                .execute()

    return {"ok": True}


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

    # 메시지가 없으면 첫 번째 등록 코스 (개인 코스 제외)
    if user["role"] == "professor":
        courses = sb.table("courses").select("id, is_personal").eq("professor_id", uid).execute()
        non_personal = [c for c in (courses.data or []) if not c.get("is_personal")]
        if non_personal:
            return {"course_id": non_personal[0]["id"]}
    else:
        enrollments = sb.table("enrollments").select("course_id").eq("student_id", uid).limit(1).execute()
        if enrollments.data:
            return {"course_id": enrollments.data[0]["course_id"]}

    return {"course_id": None}
