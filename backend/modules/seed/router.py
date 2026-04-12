"""
Seed / Reset endpoint for test accounts.
Wipes all data belonging to the teacher and student test accounts,
then re-inserts the demo seed data defined in seed_data.py.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from common.supabase_client import get_supabase
from middleware.auth import get_current_user

from .seed_data import (
    COURSES, ASSIGNMENTS, NOTES, SUBMISSIONS, AI_ANALYSES,
    MESSAGES, NOTE_COMMENTS, GAMIFICATION, BADGES,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/seed", tags=["시드 데이터"])

TEACHER_EMAIL_SUFFIX = "@pikabuddy.admin"


def _get_test_users(
    supabase,
    teacher_id: str | None = None,
    student_id: str | None = None,
) -> tuple[dict | None, dict | None]:
    """Find teacher and student test account records.
    If explicit IDs are provided, fetch those users directly.
    Otherwise fall back to @pikabuddy.admin email search.
    """
    if teacher_id or student_id:
        teacher = None
        student = None
        if teacher_id:
            try:
                r = supabase.table("users").select("*").eq("id", teacher_id).single().execute()
                teacher = r.data
            except Exception:
                pass
        if student_id:
            try:
                r = supabase.table("users").select("*").eq("id", student_id).single().execute()
                student = r.data
            except Exception:
                pass
        return teacher, student

    # Fallback: email-based search
    rows = (
        supabase.table("users")
        .select("*")
        .like("email", "%@pikabuddy.admin")
        .execute()
    ).data or []

    teacher = None
    student = None
    for u in rows:
        if u.get("role") == "professor":
            teacher = u
        elif u.get("role") == "student":
            student = u
    return teacher, student


def _delete_user_data(supabase, teacher: dict | None, student: dict | None):
    """Delete all data belonging to test accounts."""
    teacher_id = teacher["id"] if teacher else None
    student_id = student["id"] if student else None

    # Collect course IDs created by teacher
    course_ids = []
    if teacher_id:
        courses = supabase.table("courses").select("id").eq("professor_id", teacher_id).execute()
        course_ids = [c["id"] for c in (courses.data or [])]

    # Delete in dependency order
    if course_ids:
        for cid in course_ids:
            # ai_analyses via submissions
            subs = supabase.table("submissions").select("id").eq("assignment_id", cid).execute()
            # Actually, submissions reference assignment_id, and assignments reference course_id
            # So get assignments first
            assignments = supabase.table("assignments").select("id").eq("course_id", cid).execute()
            a_ids = [a["id"] for a in (assignments.data or [])]

            for aid in a_ids:
                # Delete ai_analyses for submissions of this assignment
                sub_rows = supabase.table("submissions").select("id").eq("assignment_id", aid).execute()
                sub_ids = [s["id"] for s in (sub_rows.data or [])]
                for sid in sub_ids:
                    supabase.table("ai_analyses").delete().eq("submission_id", sid).execute()
                # Delete submissions
                supabase.table("submissions").delete().eq("assignment_id", aid).execute()
                # Delete snapshots
                try:
                    supabase.table("snapshots").delete().eq("assignment_id", aid).execute()
                except Exception:
                    pass

            # Delete assignments
            supabase.table("assignments").delete().eq("course_id", cid).execute()

            # Delete note_comments (before notes due to FK)
            try:
                notes_in_course = supabase.table("notes").select("id").eq("course_id", cid).execute()
                for n in (notes_in_course.data or []):
                    supabase.table("note_comments").delete().eq("note_id", n["id"]).execute()
            except Exception:
                pass

            # Delete notes
            supabase.table("notes").delete().eq("course_id", cid).execute()

            # Delete note_snapshots
            try:
                supabase.table("note_snapshots").delete().eq("course_id", cid).execute()
            except Exception:
                pass

            # Delete enrollments
            supabase.table("enrollments").delete().eq("course_id", cid).execute()

            # Delete teams/team_members
            try:
                teams = supabase.table("teams").select("id").eq("course_id", cid).execute()
                for t in (teams.data or []):
                    supabase.table("team_members").delete().eq("team_id", t["id"]).execute()
                supabase.table("teams").delete().eq("course_id", cid).execute()
            except Exception:
                pass

            # Delete messages
            try:
                supabase.table("messages").delete().eq("course_id", cid).execute()
            except Exception:
                pass

            # Delete course_materials
            try:
                supabase.table("course_materials").delete().eq("course_id", cid).execute()
            except Exception:
                pass

        # Delete courses
        supabase.table("courses").delete().eq("professor_id", teacher_id).execute()

    # Also delete any notes the student created in other courses (shouldn't exist but safety)
    if student_id:
        supabase.table("notes").delete().eq("student_id", student_id).execute()
        # Delete any enrollments
        supabase.table("enrollments").delete().eq("student_id", student_id).execute()
        # Delete any submissions
        sub_rows = supabase.table("submissions").select("id").eq("student_id", student_id).execute()
        for s in (sub_rows.data or []):
            supabase.table("ai_analyses").delete().eq("submission_id", s["id"]).execute()
        supabase.table("submissions").delete().eq("student_id", student_id).execute()

    # Delete gamification data
    for uid in [teacher_id, student_id]:
        if uid:
            try:
                supabase.table("user_badges").delete().eq("user_id", uid).execute()
            except Exception:
                pass
            try:
                supabase.table("user_exp").delete().eq("user_id", uid).execute()
            except Exception:
                pass

    # Clean up seeded badges (they'll be re-inserted)
    for badge in BADGES:
        try:
            supabase.table("badges").delete().eq("id", badge["id"]).execute()
        except Exception:
            pass

    # Update user profiles to defaults
    default_profile = {
        "bio": None,
        "social_links": None,
        "profile_color": None,
        "school": "피카버디대학교",
        "department": "컴퓨터공학과",
        "student_id": None,
        "banner_url": None,
        "preferences": None,
    }
    if teacher_id:
        supabase.table("users").update({
            **default_profile,
            "name": "김교수 (테스트)",
        }).eq("id", teacher_id).execute()
    if student_id:
        supabase.table("users").update({
            **default_profile,
            "name": "이학생 (테스트)",
            "student_id": "2024001234",
        }).eq("id", student_id).execute()


def _insert_seed_data(supabase, teacher: dict, student: dict):
    """Insert all seed data."""
    teacher_id = teacher["id"]
    student_id = student["id"]

    # ── Create courses ──
    course_map = {}  # _key -> course_id
    for c in COURSES:
        row = {
            "professor_id": teacher_id,
            "title": c["title"],
            "description": c["description"],
            "objectives": c["objectives"],
            "invite_code": c["invite_code"],
        }
        result = supabase.table("courses").insert(row).execute()
        course_map[c["_key"]] = result.data[0]["id"]
        logger.info(f"Created course: {c['title']} -> {result.data[0]['id']}")

    # ── Enroll student in all courses ──
    for key, cid in course_map.items():
        supabase.table("enrollments").insert({
            "student_id": student_id,
            "course_id": cid,
        }).execute()

    # ── Create assignments ──
    assignment_map = {}  # _key -> assignment record
    for a in ASSIGNMENTS:
        course_id = course_map[a["_course_key"]]
        row = {
            "course_id": course_id,
            "title": a["title"],
            "topic": a["topic"],
            "type": a["type"],
            "status": a.get("status", "published"),
            "language": a.get("language", "python"),
            "ai_policy": a.get("ai_policy", "normal"),
            "generation_status": a.get("generation_status", "completed"),
            "problems": a.get("problems", []),
        }
        if a.get("writing_prompt"):
            row["writing_prompt"] = a["writing_prompt"]

        result = supabase.table("assignments").insert(row).execute()
        assignment_map[a["_key"]] = result.data[0]
        logger.info(f"Created assignment: {a['title']} -> {result.data[0]['id']}")

    # ── Create notes ──
    note_map = {}  # _key -> note_id
    for n in NOTES:
        course_id = course_map[n["_course_key"]]
        row = {
            "student_id": student_id,
            "course_id": course_id,
            "title": n["title"],
            "content": n["content"],
        }
        result = supabase.table("notes").insert(row).execute()
        note_map[n["_key"]] = result.data[0]["id"]
        logger.info(f"Created note: {n['title']} -> {result.data[0]['id']}")

    # ── Create submissions ──
    submission_map = {}  # (_assignment_key, _problem_index) -> submission_id
    for s in SUBMISSIONS:
        a_key = s["_assignment_key"]
        assignment = assignment_map.get(a_key)
        if not assignment:
            continue
        row = {
            "assignment_id": assignment["id"],
            "student_id": student_id,
            "code": s.get("code", ""),
            "status": s.get("status", "submitted"),
            "problem_index": s["_problem_index"],
        }
        if s.get("content"):
            row["content"] = s["content"]
        if s.get("char_count"):
            row["char_count"] = s["char_count"]

        result = supabase.table("submissions").insert(row).execute()
        submission_map[(a_key, s["_problem_index"])] = result.data[0]["id"]
        logger.info(f"Created submission for {a_key} problem {s['_problem_index']}")

    # ── Create AI analyses ──
    for analysis in AI_ANALYSES:
        a_key = analysis["_assignment_key"]
        p_idx = analysis["_problem_index"]
        sub_id = submission_map.get((a_key, p_idx))
        if not sub_id:
            continue
        row = {
            "submission_id": sub_id,
            "score": analysis["score"],
            "feedback": analysis["feedback"],
        }
        supabase.table("ai_analyses").insert(row).execute()

        # Also update submission status to 'completed'
        supabase.table("submissions").update({"status": "completed"}).eq("id", sub_id).execute()
        logger.info(f"Created AI analysis for {a_key} problem {p_idx}")

    # ── Create messages ──
    user_map = {"teacher": teacher_id, "student": student_id}
    for msg in MESSAGES:
        course_id = course_map.get(msg["_course_key"])
        if not course_id:
            continue
        row = {
            "course_id": course_id,
            "sender_id": user_map[msg["_sender"]],
            "receiver_id": user_map[msg["_receiver"]],
            "content": msg["content"],
            "is_read": msg.get("is_read", False),
        }
        supabase.table("messages").insert(row).execute()
    logger.info(f"Created {len(MESSAGES)} messages")

    # ── Create note comments ──
    comment_ids = []  # track inserted comment IDs by index
    for idx, nc in enumerate(NOTE_COMMENTS):
        note_key = nc["_note_key"]
        note_id = note_map.get(note_key)
        if not note_id:
            comment_ids.append(None)
            continue
        row = {
            "note_id": note_id,
            "user_id": user_map[nc["_user"]],
            "block_index": nc.get("block_index"),
            "content": nc["content"],
            "is_resolved": nc.get("is_resolved", False),
        }
        # Handle parent reference
        parent_idx = nc.get("_parent_index")
        if parent_idx is not None and parent_idx < len(comment_ids) and comment_ids[parent_idx]:
            row["parent_id"] = comment_ids[parent_idx]
        result = supabase.table("note_comments").insert(row).execute()
        comment_ids.append(result.data[0]["id"])
    logger.info(f"Created {len(NOTE_COMMENTS)} note comments")

    # ── Ensure badges exist ──
    for badge in BADGES:
        try:
            supabase.table("badges").upsert(badge).execute()
        except Exception:
            pass
    logger.info(f"Ensured {len(BADGES)} badges exist")

    # ── Create gamification data ──
    from modules.gamification.router import _compute_tier
    # Student EXP
    s_exp = GAMIFICATION["student_exp"]
    supabase.table("user_exp").insert({
        "user_id": student_id,
        "total_exp": s_exp["total_exp"],
        "tier": _compute_tier(s_exp["total_exp"]),
    }).execute()
    # Teacher EXP
    t_exp = GAMIFICATION["teacher_exp"]
    supabase.table("user_exp").insert({
        "user_id": teacher_id,
        "total_exp": t_exp["total_exp"],
        "tier": _compute_tier(t_exp["total_exp"]),
    }).execute()
    # Student badges
    for badge_id in GAMIFICATION["student_badges"]:
        try:
            supabase.table("user_badges").insert({
                "user_id": student_id, "badge_id": badge_id,
            }).execute()
        except Exception:
            pass
    # Teacher badges
    for badge_id in GAMIFICATION["teacher_badges"]:
        try:
            supabase.table("user_badges").insert({
                "user_id": teacher_id, "badge_id": badge_id,
            }).execute()
        except Exception:
            pass
    logger.info("Created gamification data")


@router.get("/users")
async def list_users(user: dict = Depends(get_current_user)):
    """관리 대상으로 지정할 수 있는 유저 목록."""
    sb = get_supabase()
    rows = (sb.table("users").select("id, name, email, role").order("created_at").execute()).data or []
    return rows


@router.post("/reset")
async def reset_test_accounts(
    user: dict = Depends(get_current_user),
    teacher_id: str | None = Query(None),
    student_id: str | None = Query(None),
):
    """테스트 계정의 모든 데이터를 삭제하고 시드 데이터로 초기화합니다."""
    supabase = get_supabase()
    teacher, student = _get_test_users(supabase, teacher_id, student_id)

    if not teacher or not student:
        raise HTTPException(
            status_code=400,
            detail="교수 테스트 계정과 학생 테스트 계정이 모두 필요합니다. 두 계정 모두 한 번 이상 로그인해주세요.",
        )

    logger.info("=== Starting test account reset ===")

    # Step 1: Delete all existing data
    logger.info("Deleting existing data...")
    _delete_user_data(supabase, teacher, student)

    # Step 2: Insert seed data
    logger.info("Inserting seed data...")
    _insert_seed_data(supabase, teacher, student)

    logger.info("=== Test account reset complete ===")

    return {
        "message": "테스트 계정이 초기화되었습니다.",
        "teacher": {"id": teacher["id"], "name": "김교수 (테스트)"},
        "student": {"id": student["id"], "name": "이학생 (테스트)"},
        "data": {
            "courses": len(COURSES),
            "assignments": len(ASSIGNMENTS),
            "notes": len(NOTES),
            "submissions": len(SUBMISSIONS),
            "analyses": len(AI_ANALYSES),
            "messages": len(MESSAGES),
            "note_comments": len(NOTE_COMMENTS),
            "badges": len(BADGES),
        },
    }


@router.get("/status")
async def seed_status(
    user: dict = Depends(get_current_user),
    teacher_id: str | None = Query(None),
    student_id: str | None = Query(None),
):
    """테스트 계정 상��� 확인 (상세)"""
    sb = get_supabase()
    teacher, student = _get_test_users(sb, teacher_id, student_id)

    result: dict = {"teacher": None, "student": None, "counts": {}}

    if teacher:
        tid = teacher["id"]
        courses = sb.table("courses").select("id").eq("professor_id", tid).execute()
        course_ids = [c["id"] for c in (courses.data or [])]
        a_count = 0
        sub_count = 0
        msg_count = 0
        for cid in course_ids:
            a_count += len((sb.table("assignments").select("id").eq("course_id", cid).execute()).data or [])
            msg_count += len((sb.table("messages").select("id").eq("course_id", cid).execute()).data or [])
        result["teacher"] = {"id": tid, "name": teacher.get("name"), "courses": len(course_ids)}
        result["counts"]["assignments"] = a_count
        result["counts"]["messages"] = msg_count

    if student:
        sid = student["id"]
        enrollments = sb.table("enrollments").select("id").eq("student_id", sid).execute()
        notes = sb.table("notes").select("id").eq("student_id", sid).execute()
        submissions = sb.table("submissions").select("id").eq("student_id", sid).execute()
        result["student"] = {
            "id": sid, "name": student.get("name"),
            "enrollments": len(enrollments.data or []),
        }
        result["counts"]["notes"] = len(notes.data or [])
        result["counts"]["submissions"] = len(submissions.data or [])

    # EXP & tier info
    result["exp"] = {"teacher": None, "student": None}
    for role_key, uid in [("teacher", teacher["id"] if teacher else None), ("student", student["id"] if student else None)]:
        if uid:
            try:
                exp_row = sb.table("user_exp").select("*").eq("user_id", uid).single().execute()
                if exp_row.data:
                    result["exp"][role_key] = {
                        "total_exp": exp_row.data.get("total_exp", 0),
                        "tier": exp_row.data.get("tier", "bronze"),
                    }
            except Exception:
                pass

    # Badge counts
    result["counts"]["badges"] = {"teacher": 0, "student": 0}
    for role_key, uid in [("teacher", teacher["id"] if teacher else None), ("student", student["id"] if student else None)]:
        if uid:
            try:
                badges = sb.table("user_badges").select("id").eq("user_id", uid).execute()
                result["counts"]["badges"][role_key] = len(badges.data or [])
            except Exception:
                pass

    return result


@router.post("/clean")
async def clean_test_accounts(
    user: dict = Depends(get_current_user),
    teacher_id: str | None = Query(None),
    student_id: str | None = Query(None),
):
    """테스트 계정 데이터를 전부 삭제 (시드 데이터 재삽입 없이 빈 상태로 만듦)."""
    sb = get_supabase()
    teacher, student = _get_test_users(sb, teacher_id, student_id)
    if not teacher or not student:
        raise HTTPException(status_code=400, detail="두 테스트 계정이 모두 필요합니다.")

    logger.info("=== Clean wipe test accounts ===")
    _delete_user_data(sb, teacher, student)
    return {"message": "테스트 계정 데이터가 전부 삭제되었습니다."}


# ── Snapshot helpers ──

def _export_snapshot(sb, teacher: dict, student: dict) -> dict:
    """현재 테스트 계정 데이터를 JSON으로 내보내기."""
    tid = teacher["id"]
    sid = student["id"]
    data: dict = {"teacher_profile": teacher, "student_profile": student}

    # Courses
    courses = (sb.table("courses").select("*").eq("professor_id", tid).execute()).data or []
    data["courses"] = courses
    course_ids = [c["id"] for c in courses]

    # Enrollments
    enrollments = (sb.table("enrollments").select("*").eq("student_id", sid).execute()).data or []
    data["enrollments"] = enrollments

    # Assignments, submissions, analyses, notes, comments, messages per course
    data["assignments"] = []
    data["submissions"] = []
    data["ai_analyses"] = []
    data["notes"] = []
    data["note_comments"] = []
    data["messages"] = []

    for cid in course_ids:
        assignments = (sb.table("assignments").select("*").eq("course_id", cid).execute()).data or []
        data["assignments"].extend(assignments)
        for a in assignments:
            subs = (sb.table("submissions").select("*").eq("assignment_id", a["id"]).execute()).data or []
            data["submissions"].extend(subs)
            for s in subs:
                analyses = (sb.table("ai_analyses").select("*").eq("submission_id", s["id"]).execute()).data or []
                data["ai_analyses"].extend(analyses)

        notes = (sb.table("notes").select("*").eq("course_id", cid).execute()).data or []
        data["notes"].extend(notes)
        for n in notes:
            try:
                comments = (sb.table("note_comments").select("*").eq("note_id", n["id"]).execute()).data or []
                data["note_comments"].extend(comments)
            except Exception:
                pass

        try:
            msgs = (sb.table("messages").select("*").eq("course_id", cid).execute()).data or []
            data["messages"].extend(msgs)
        except Exception:
            pass

    # Gamification
    try:
        data["user_exp"] = []
        for uid in [tid, sid]:
            exp = (sb.table("user_exp").select("*").eq("user_id", uid).execute()).data or []
            data["user_exp"].extend(exp)
        data["user_badges"] = []
        for uid in [tid, sid]:
            badges = (sb.table("user_badges").select("*").eq("user_id", uid).execute()).data or []
            data["user_badges"].extend(badges)
    except Exception:
        pass

    return data


def _import_snapshot(sb, snapshot_data: dict, teacher: dict, student: dict):
    """스냅샷 데이터를 복원. 기존 데이터는 먼저 삭제됨."""
    tid = teacher["id"]
    sid = student["id"]
    old_tid = snapshot_data.get("teacher_profile", {}).get("id")
    old_sid = snapshot_data.get("student_profile", {}).get("id")

    # Restore user profiles
    tp = snapshot_data.get("teacher_profile", {})
    sp = snapshot_data.get("student_profile", {})
    for key in ["id", "email", "auth_id", "created_at", "updated_at"]:
        tp.pop(key, None)
        sp.pop(key, None)
    if tp:
        sb.table("users").update(tp).eq("id", tid).execute()
    if sp:
        sb.table("users").update(sp).eq("id", sid).execute()

    # ID mapping: old snapshot IDs → new IDs
    course_map = {}
    for c in snapshot_data.get("courses", []):
        old_id = c.pop("id", None)
        c.pop("created_at", None)
        c.pop("updated_at", None)
        c["professor_id"] = tid
        result = sb.table("courses").insert(c).execute()
        if result.data:
            course_map[old_id] = result.data[0]["id"]

    # Enrollments
    for e in snapshot_data.get("enrollments", []):
        new_cid = course_map.get(e.get("course_id"))
        if not new_cid:
            continue
        sb.table("enrollments").insert({"student_id": sid, "course_id": new_cid}).execute()

    # Assignments
    assignment_map = {}
    for a in snapshot_data.get("assignments", []):
        old_id = a.pop("id", None)
        a.pop("created_at", None)
        a.pop("updated_at", None)
        new_cid = course_map.get(a.get("course_id"))
        if not new_cid:
            continue
        a["course_id"] = new_cid
        result = sb.table("assignments").insert(a).execute()
        if result.data:
            assignment_map[old_id] = result.data[0]["id"]

    # Submissions
    submission_map = {}
    for s in snapshot_data.get("submissions", []):
        old_id = s.pop("id", None)
        s.pop("created_at", None)
        s.pop("updated_at", None)
        new_aid = assignment_map.get(s.get("assignment_id"))
        if not new_aid:
            continue
        s["assignment_id"] = new_aid
        s["student_id"] = sid
        result = sb.table("submissions").insert(s).execute()
        if result.data:
            submission_map[old_id] = result.data[0]["id"]

    # AI analyses
    for an in snapshot_data.get("ai_analyses", []):
        an.pop("id", None)
        an.pop("created_at", None)
        new_sub = submission_map.get(an.get("submission_id"))
        if not new_sub:
            continue
        an["submission_id"] = new_sub
        sb.table("ai_analyses").insert(an).execute()

    # Notes
    note_map = {}
    for n in snapshot_data.get("notes", []):
        old_id = n.pop("id", None)
        n.pop("created_at", None)
        n.pop("updated_at", None)
        new_cid = course_map.get(n.get("course_id"))
        if not new_cid:
            continue
        n["course_id"] = new_cid
        n["student_id"] = sid
        result = sb.table("notes").insert(n).execute()
        if result.data:
            note_map[old_id] = result.data[0]["id"]

    # Note comments
    comment_map = {}
    for nc in snapshot_data.get("note_comments", []):
        old_id = nc.pop("id", None)
        nc.pop("created_at", None)
        nc.pop("updated_at", None)
        new_nid = note_map.get(nc.get("note_id"))
        if not new_nid:
            continue
        nc["note_id"] = new_nid
        # Remap user_id
        if nc.get("user_id") == old_tid:
            nc["user_id"] = tid
        elif nc.get("user_id") == old_sid:
            nc["user_id"] = sid
        # Remap parent_id
        if nc.get("parent_id"):
            nc["parent_id"] = comment_map.get(nc["parent_id"])
            if not nc["parent_id"]:
                nc.pop("parent_id", None)
        result = sb.table("note_comments").insert(nc).execute()
        if result.data:
            comment_map[old_id] = result.data[0]["id"]

    # Messages
    for m in snapshot_data.get("messages", []):
        m.pop("id", None)
        m.pop("created_at", None)
        new_cid = course_map.get(m.get("course_id"))
        if not new_cid:
            continue
        m["course_id"] = new_cid
        if m.get("sender_id") == old_tid:
            m["sender_id"] = tid
        elif m.get("sender_id") == old_sid:
            m["sender_id"] = sid
        if m.get("receiver_id") == old_tid:
            m["receiver_id"] = tid
        elif m.get("receiver_id") == old_sid:
            m["receiver_id"] = sid
        sb.table("messages").insert(m).execute()

    # Gamification
    for exp in snapshot_data.get("user_exp", []):
        exp.pop("id", None)
        exp.pop("created_at", None)
        exp.pop("updated_at", None)
        if exp.get("user_id") == old_tid:
            exp["user_id"] = tid
        elif exp.get("user_id") == old_sid:
            exp["user_id"] = sid
        try:
            sb.table("user_exp").insert(exp).execute()
        except Exception:
            pass

    for b in snapshot_data.get("user_badges", []):
        b.pop("id", None)
        b.pop("created_at", None)
        if b.get("user_id") == old_tid:
            b["user_id"] = tid
        elif b.get("user_id") == old_sid:
            b["user_id"] = sid
        try:
            sb.table("user_badges").insert(b).execute()
        except Exception:
            pass


class SnapshotRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class PartialResetRequest(BaseModel):
    targets: list[str] = Field(..., min_length=1)
    # Valid targets: assignments, submissions, notes, messages, exp, badges, enrollments


class SetExpRequest(BaseModel):
    teacher_exp: int | None = None
    student_exp: int | None = None


@router.post("/snapshot")
async def save_snapshot(
    body: SnapshotRequest,
    user: dict = Depends(get_current_user),
    teacher_id: str | None = Query(None),
    student_id: str | None = Query(None),
):
    """현재 테스트 데이터를 스냅샷으로 저장."""
    sb = get_supabase()
    teacher, student = _get_test_users(sb, teacher_id, student_id)
    if not teacher or not student:
        raise HTTPException(status_code=400, detail="두 테스트 계정이 모두 필요합니다.")

    data = _export_snapshot(sb, teacher, student)
    result = sb.table("test_snapshots").insert({
        "name": body.name,
        "data": data,
    }).execute()

    snap = result.data[0]
    return {"id": snap["id"], "name": snap["name"], "created_at": snap["created_at"]}


@router.get("/snapshots")
async def list_snapshots(user: dict = Depends(get_current_user)):
    """저장된 스냅샷 목록."""
    # All authenticated users can manage test accounts

    sb = get_supabase()
    result = sb.table("test_snapshots").select("id, name, created_at").order("created_at", desc=True).execute()
    return result.data or []


@router.post("/snapshot/{snapshot_id}/restore")
async def restore_snapshot(
    snapshot_id: str,
    user: dict = Depends(get_current_user),
    teacher_id: str | None = Query(None),
    student_id: str | None = Query(None),
):
    """스냅샷으로 복원 (기존 데이터 삭제 후 스냅샷 데이터 삽입)."""
    sb = get_supabase()
    teacher, student = _get_test_users(sb, teacher_id, student_id)
    if not teacher or not student:
        raise HTTPException(status_code=400, detail="두 테스트 계정이 모두 필요합니다.")

    snap = sb.table("test_snapshots").select("*").eq("id", snapshot_id).single().execute()
    if not snap.data:
        raise HTTPException(status_code=404, detail="스냅샷을 찾을 수 없습니다.")

    logger.info(f"=== Restoring snapshot: {snap.data['name']} ===")
    _delete_user_data(sb, teacher, student)
    _import_snapshot(sb, snap.data["data"], teacher, student)

    return {"message": f"스냅샷 '{snap.data['name']}'(으)로 복원되었습니다."}


@router.delete("/snapshot/{snapshot_id}")
async def delete_snapshot(snapshot_id: str, user: dict = Depends(get_current_user)):
    """스냅샷 삭제."""
    # All authenticated users can manage test accounts

    sb = get_supabase()
    sb.table("test_snapshots").delete().eq("id", snapshot_id).execute()
    return {"message": "스냅샷이 삭제되었습니다."}


# ── Default state (현재 상태로 초기화 기준점) ──

DEFAULT_SNAPSHOT_NAME = "__default_reset_state__"


@router.post("/save-default")
async def save_default_state(
    user: dict = Depends(get_current_user),
    teacher_id: str | None = Query(None),
    student_id: str | None = Query(None),
):
    """현재 상태를 '��본 초기화 상태'로 저장."""
    sb = get_supabase()
    teacher, student = _get_test_users(sb, teacher_id, student_id)
    if not teacher or not student:
        raise HTTPException(status_code=400, detail="두 테스트 계정이 모두 필요합니다.")

    data = _export_snapshot(sb, teacher, student)

    # Delete existing default if any
    try:
        sb.table("test_snapshots").delete().eq("name", DEFAULT_SNAPSHOT_NAME).execute()
    except Exception:
        pass

    sb.table("test_snapshots").insert({
        "name": DEFAULT_SNAPSHOT_NAME,
        "data": data,
    }).execute()

    return {"message": "현재 상태가 기본 초기화 상태로 저장되었습니다."}


@router.get("/has-default")
async def has_default_state(user: dict = Depends(get_current_user)):
    """기본 초기화 상태가 저장되어 있는지 확인."""
    # All authenticated users can manage test accounts

    sb = get_supabase()
    result = sb.table("test_snapshots").select("id, created_at").eq("name", DEFAULT_SNAPSHOT_NAME).execute()
    exists = len(result.data or []) > 0
    return {
        "exists": exists,
        "saved_at": result.data[0]["created_at"] if exists else None,
    }


@router.post("/reset-to-default")
async def reset_to_default(
    user: dict = Depends(get_current_user),
    teacher_id: str | None = Query(None),
    student_id: str | None = Query(None),
):
    """저장된 기본 상태로 초기화."""
    sb = get_supabase()
    teacher, student = _get_test_users(sb, teacher_id, student_id)
    if not teacher or not student:
        raise HTTPException(status_code=400, detail="두 테스트 계정이 모두 필요합니다.")

    snap = sb.table("test_snapshots").select("*").eq("name", DEFAULT_SNAPSHOT_NAME).execute()
    if not (snap.data or []):
        raise HTTPException(status_code=404, detail="저장된 기본 상태가 없습니다. 먼저 '현재 상태 저장'을 해주세요.")

    logger.info("=== Resetting to default state ===")
    _delete_user_data(sb, teacher, student)
    _import_snapshot(sb, snap.data[0]["data"], teacher, student)

    return {"message": "저장된 기본 상태로 초기화되었습니다."}


# ── Partial reset (부분 초기화) ──

def _partial_delete(sb, teacher, student, targets: list[str]):
    """선택된 카테고리만 삭제."""
    tid = teacher["id"] if teacher else None
    sid = student["id"] if student else None

    course_ids = []
    if tid:
        courses = sb.table("courses").select("id").eq("professor_id", tid).execute()
        course_ids = [c["id"] for c in (courses.data or [])]

    if "submissions" in targets or "assignments" in targets:
        # submissions depends on assignments, so delete submissions first
        for cid in course_ids:
            assignments = sb.table("assignments").select("id").eq("course_id", cid).execute()
            for a in (assignments.data or []):
                subs = sb.table("submissions").select("id").eq("assignment_id", a["id"]).execute()
                for s in (subs.data or []):
                    sb.table("ai_analyses").delete().eq("submission_id", s["id"]).execute()
                sb.table("submissions").delete().eq("assignment_id", a["id"]).execute()
        if sid:
            sub_rows = sb.table("submissions").select("id").eq("student_id", sid).execute()
            for s in (sub_rows.data or []):
                sb.table("ai_analyses").delete().eq("submission_id", s["id"]).execute()
            sb.table("submissions").delete().eq("student_id", sid).execute()

    if "assignments" in targets:
        for cid in course_ids:
            sb.table("assignments").delete().eq("course_id", cid).execute()

    if "notes" in targets:
        for cid in course_ids:
            try:
                notes = sb.table("notes").select("id").eq("course_id", cid).execute()
                for n in (notes.data or []):
                    sb.table("note_comments").delete().eq("note_id", n["id"]).execute()
            except Exception:
                pass
            sb.table("notes").delete().eq("course_id", cid).execute()
            try:
                sb.table("note_snapshots").delete().eq("course_id", cid).execute()
            except Exception:
                pass
        if sid:
            sb.table("notes").delete().eq("student_id", sid).execute()

    if "messages" in targets:
        for cid in course_ids:
            try:
                sb.table("messages").delete().eq("course_id", cid).execute()
            except Exception:
                pass

    if "exp" in targets:
        for uid in [tid, sid]:
            if uid:
                try:
                    sb.table("user_exp").delete().eq("user_id", uid).execute()
                except Exception:
                    pass

    if "badges" in targets:
        for uid in [tid, sid]:
            if uid:
                try:
                    sb.table("user_badges").delete().eq("user_id", uid).execute()
                except Exception:
                    pass

    if "enrollments" in targets:
        if sid:
            sb.table("enrollments").delete().eq("student_id", sid).execute()


@router.post("/partial-reset")
async def partial_reset(
    body: PartialResetRequest,
    user: dict = Depends(get_current_user),
    teacher_id: str | None = Query(None),
    student_id: str | None = Query(None),
):
    """선택한 카테고리만 초기화 (삭제)."""
    valid = {"assignments", "submissions", "notes", "messages", "exp", "badges", "enrollments"}
    invalid = set(body.targets) - valid
    if invalid:
        raise HTTPException(status_code=400, detail=f"잘못된 대상: {', '.join(invalid)}. 사용 가능: {', '.join(sorted(valid))}")

    sb = get_supabase()
    teacher, student = _get_test_users(sb, teacher_id, student_id)
    if not teacher or not student:
        raise HTTPException(status_code=400, detail="두 테스트 계정이 모두 필요합니다.")

    logger.info(f"=== Partial reset: {body.targets} ===")
    _partial_delete(sb, teacher, student, body.targets)

    return {"message": f"선택 항목 초기화 완료: {', '.join(body.targets)}"}


# ── EXP/Tier 직접 설정 ──

@router.post("/set-exp")
async def set_exp(
    body: SetExpRequest,
    user: dict = Depends(get_current_user),
    teacher_id: str | None = Query(None),
    student_id: str | None = Query(None),
):
    """테스트 계정의 EXP를 직접 설정."""
    sb = get_supabase()
    teacher, student = _get_test_users(sb, teacher_id, student_id)
    if not teacher or not student:
        raise HTTPException(status_code=400, detail="두 테스트 계정이 모두 필요합니다.")

    from modules.gamification.router import _compute_tier

    results = {}

    if body.teacher_exp is not None:
        tid = teacher["id"]
        tier = _compute_tier(body.teacher_exp)
        try:
            sb.table("user_exp").upsert({
                "user_id": tid,
                "total_exp": body.teacher_exp,
                "tier": tier,
            }).execute()
            results["teacher"] = {"exp": body.teacher_exp, "tier": tier}
        except Exception as e:
            results["teacher"] = {"error": str(e)}

    if body.student_exp is not None:
        sid = student["id"]
        tier = _compute_tier(body.student_exp)
        try:
            sb.table("user_exp").upsert({
                "user_id": sid,
                "total_exp": body.student_exp,
                "tier": tier,
            }).execute()
            results["student"] = {"exp": body.student_exp, "tier": tier}
        except Exception as e:
            results["student"] = {"error": str(e)}

    return {"message": "EXP 설정 완료", "results": results}
