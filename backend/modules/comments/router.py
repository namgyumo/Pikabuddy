"""노트 코멘트 API — 블록별/전체 코멘트, 답글, 교수 학생노트 브라우저"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from middleware.auth import get_current_user, require_professor
from common.supabase_client import get_supabase

router = APIRouter(tags=["노트 코멘트"])


# ── Request Models ──

class CommentCreateRequest(BaseModel):
    block_index: int | None = None  # null = 노트 전체 코멘트
    parent_id: str | None = None    # null = 최상위 코멘트
    content: str = Field(..., min_length=1, max_length=5000)

class CommentUpdateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)

class ResolveRequest(BaseModel):
    is_resolved: bool


# ── Helpers ──

def _get_note_with_access(note_id: str, user: dict):
    """노트 조회 + 접근 권한 검증. 본인 노트이거나 교수가 해당 코스 담당일 때 허용."""
    sb = get_supabase()
    note = sb.table("notes").select("id, student_id, course_id").eq("id", note_id).single().execute()
    if not note.data:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")

    n = note.data
    # 본인 노트
    if n["student_id"] == user["id"]:
        return n

    # 교수가 해당 코스 담당
    if user["role"] == "professor":
        course = sb.table("courses").select("professor_id").eq("id", n["course_id"]).single().execute()
        if course.data and course.data["professor_id"] == user["id"]:
            return n

    # personal은 본인 노트만
    if user["role"] == "personal" and n["student_id"] == user["id"]:
        return n

    raise HTTPException(status_code=403, detail="이 노트에 접근할 수 없습니다.")


def _get_comment(comment_id: str):
    sb = get_supabase()
    result = sb.table("note_comments").select("*").eq("id", comment_id).maybe_single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="코멘트를 찾을 수 없습니다.")
    return result.data


# ── Note Comments Endpoints ──

@router.get("/notes/{note_id}/comments")
async def list_comments(note_id: str, user: dict = Depends(get_current_user)):
    """노트의 모든 코멘트 조회 (user_name, user_role 포함)."""
    _get_note_with_access(note_id, user)

    sb = get_supabase()
    result = sb.table("note_comments") \
        .select("*, users(name, role, avatar_url)") \
        .eq("note_id", note_id) \
        .order("created_at").execute()

    comments = []
    for row in (result.data or []):
        u = row.pop("users", {}) or {}
        row["user_name"] = u.get("name", "")
        row["user_role"] = u.get("role", "")
        row["user_avatar_url"] = u.get("avatar_url")
        comments.append(row)

    return comments


@router.post("/notes/{note_id}/comments", status_code=201)
async def create_comment(
    note_id: str,
    body: CommentCreateRequest,
    user: dict = Depends(get_current_user),
):
    """코멘트 작성. 교수는 학생 노트에 코멘트 가능, 학생은 본인 노트에 답글 가능."""
    note = _get_note_with_access(note_id, user)

    # 학생이 최상위 코멘트를 달 수 있는 건 본인 노트에서만
    # (교수는 어떤 노트든 코멘트 가능)
    if user["role"] == "student" and note["student_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="본인 노트에만 코멘트할 수 있습니다.")

    sb = get_supabase()

    # parent_id가 있으면 유효한지 확인
    if body.parent_id:
        parent = sb.table("note_comments").select("id, note_id").eq("id", body.parent_id).single().execute()
        if not parent.data or parent.data["note_id"] != note_id:
            raise HTTPException(status_code=400, detail="유효하지 않은 부모 코멘트입니다.")

    row = {
        "note_id": note_id,
        "user_id": user["id"],
        "block_index": body.block_index,
        "parent_id": body.parent_id,
        "content": body.content.strip(),
    }
    result = sb.table("note_comments").insert(row).execute()

    # EXP + 배지 체크: 코멘트 작성
    try:
        from modules.gamification.router import award_exp
        from modules.gamification.badge_defs import check_badges
        award_exp(user["id"], "comment", result.data[0]["id"])
        check_badges(user["id"], "comment_create")
    except Exception:
        pass

    # user info 붙여서 반환
    comment = result.data[0]
    comment["user_name"] = user.get("name", "")
    comment["user_role"] = user.get("role", "")
    comment["user_avatar_url"] = user.get("avatar_url")
    return comment


@router.patch("/comments/{comment_id}")
async def update_comment(
    comment_id: str,
    body: CommentUpdateRequest,
    user: dict = Depends(get_current_user),
):
    """코멘트 수정 (본인만)."""
    comment = _get_comment(comment_id)
    if comment["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="본인 코멘트만 수정할 수 있습니다.")

    sb = get_supabase()
    result = sb.table("note_comments") \
        .update({"content": body.content.strip()}) \
        .eq("id", comment_id).execute()
    return result.data[0]


@router.delete("/comments/{comment_id}", status_code=204)
async def delete_comment(
    comment_id: str,
    user: dict = Depends(get_current_user),
):
    """코멘트 삭제 (본인 또는 코스 담당 교수)."""
    comment = _get_comment(comment_id)
    sb = get_supabase()

    is_author = comment["user_id"] == user["id"]

    # 교수인 경우: 해당 노트의 코스 담당인지 확인
    is_course_prof = False
    if user["role"] == "professor" and not is_author:
        note = sb.table("notes").select("course_id").eq("id", comment["note_id"]).single().execute()
        if note.data:
            course = sb.table("courses").select("professor_id").eq("id", note.data["course_id"]).single().execute()
            if course.data and course.data["professor_id"] == user["id"]:
                is_course_prof = True

    if not is_author and not is_course_prof:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

    sb.table("note_comments").delete().eq("id", comment_id).execute()


@router.patch("/comments/{comment_id}/resolve")
async def toggle_resolve(
    comment_id: str,
    body: ResolveRequest,
    user: dict = Depends(get_current_user),
):
    """코멘트 해결/미해결 토글 (교수 또는 노트 작성자)."""
    comment = _get_comment(comment_id)
    sb = get_supabase()

    note = sb.table("notes").select("student_id, course_id").eq("id", comment["note_id"]).single().execute()
    if not note.data:
        raise HTTPException(status_code=404)

    is_note_owner = note.data["student_id"] == user["id"]
    is_course_prof = False
    if user["role"] == "professor":
        course = sb.table("courses").select("professor_id").eq("id", note.data["course_id"]).single().execute()
        if course.data and course.data["professor_id"] == user["id"]:
            is_course_prof = True

    if not is_note_owner and not is_course_prof:
        raise HTTPException(status_code=403, detail="해결 상태를 변경할 수 없습니다.")

    result = sb.table("note_comments") \
        .update({"is_resolved": body.is_resolved}) \
        .eq("id", comment_id).execute()
    return result.data[0]


@router.get("/notes/{note_id}/comment-counts")
async def get_comment_counts(note_id: str, user: dict = Depends(get_current_user)):
    """블록별 코멘트 수 (거터 표시용)."""
    _get_note_with_access(note_id, user)

    sb = get_supabase()
    result = sb.table("note_comments") \
        .select("block_index, is_resolved") \
        .eq("note_id", note_id) \
        .is_("parent_id", "null") \
        .execute()

    block_counts: dict[int, int] = {}
    total = 0
    unresolved = 0
    for row in (result.data or []):
        total += 1
        if not row["is_resolved"]:
            unresolved += 1
        bi = row["block_index"]
        if bi is not None:
            block_counts[bi] = block_counts.get(bi, 0) + 1

    return {"block_counts": block_counts, "total": total, "unresolved": unresolved}


@router.get("/courses/{course_id}/notes/comment-summary")
async def notes_comment_summary(course_id: str, user: dict = Depends(get_current_user)):
    """코스 내 사용자 노트별 미해결 코멘트 수 (노트 목록 뱃지용)."""
    sb = get_supabase()
    # 본인 노트만
    notes = sb.table("notes").select("id").eq("course_id", course_id).eq("student_id", user["id"]).execute()
    if not notes.data:
        return {}
    note_ids = [n["id"] for n in notes.data]
    comments = sb.table("note_comments") \
        .select("note_id, is_resolved") \
        .in_("note_id", note_ids) \
        .is_("parent_id", "null") \
        .execute()

    summary: dict[str, dict] = {}
    for row in (comments.data or []):
        nid = row["note_id"]
        if nid not in summary:
            summary[nid] = {"total": 0, "unresolved": 0}
        summary[nid]["total"] += 1
        if not row["is_resolved"]:
            summary[nid]["unresolved"] += 1
    return summary


# ── Professor: Student Notes Browser ──

@router.get("/courses/{course_id}/student-notes")
async def list_student_notes(
    course_id: str,
    student_id: str | None = Query(None, description="특정 학생 필터"),
    user: dict = Depends(require_professor),
):
    """교수용: 코스의 학생별 노트 목록."""
    sb = get_supabase()

    # 코스 소유권 확인
    course = sb.table("courses").select("professor_id").eq("id", course_id).single().execute()
    if not course.data or course.data["professor_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="본인 코스가 아닙니다.")

    # 수강생 목록
    eq_filter = {"course_id": course_id}
    enrollment_query = sb.table("enrollments").select("student_id, users(id, name, avatar_url)").eq("course_id", course_id)
    if student_id:
        enrollment_query = enrollment_query.eq("student_id", student_id)
    enrollments = enrollment_query.execute()

    result = []
    for enrollment in (enrollments.data or []):
        student = enrollment.get("users")
        if not student:
            continue
        sid = student["id"]

        # 해당 학생의 노트 목록
        notes = sb.table("notes") \
            .select("id, title, updated_at, understanding_score") \
            .eq("student_id", sid) \
            .eq("course_id", course_id) \
            .order("updated_at", desc=True).execute()

        note_list = []
        for note in (notes.data or []):
            # 코멘트 수
            cc = sb.table("note_comments") \
                .select("id", count="exact") \
                .eq("note_id", note["id"]).execute()
            note["comment_count"] = cc.count or 0
            note_list.append(note)

        result.append({
            "student": student,
            "notes": note_list,
        })

    return result
