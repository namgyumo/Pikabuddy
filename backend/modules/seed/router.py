"""
Seed / Reset endpoint for test accounts.
Wipes all data belonging to the teacher and student test accounts,
then re-inserts the demo seed data defined in seed_data.py.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException
from common.supabase_client import get_supabase
from middleware.auth import get_current_user

from .seed_data import (
    COURSES, ASSIGNMENTS, NOTES, SUBMISSIONS, AI_ANALYSES,
    MESSAGES, NOTE_COMMENTS, GAMIFICATION, BADGES,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/seed", tags=["시드 데이터"])

TEACHER_EMAIL_SUFFIX = "@pikabuddy.admin"


def _is_test_account(user: dict) -> bool:
    return (user.get("email") or "").endswith(TEACHER_EMAIL_SUFFIX)


def _get_test_users(supabase) -> tuple[dict | None, dict | None]:
    """Find teacher and student test account records."""
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


@router.post("/reset")
async def reset_test_accounts(user: dict = Depends(get_current_user)):
    """
    테스트 계정의 모든 데이터를 삭제하고 시드 데이터로 초기화합니다.
    테스트 계정(@pikabuddy.admin)으로만 호출 가능합니다.
    """
    if not _is_test_account(user):
        raise HTTPException(status_code=403, detail="테스트 계정만 초기화할 수 있습니다.")

    supabase = get_supabase()

    # Find both test accounts
    teacher, student = _get_test_users(supabase)

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
async def seed_status(user: dict = Depends(get_current_user)):
    """테스트 계정 상태 확인"""
    if not _is_test_account(user):
        raise HTTPException(status_code=403, detail="테스트 계정만 확인 가능합니다.")

    supabase = get_supabase()
    teacher, student = _get_test_users(supabase)

    result = {
        "teacher": None,
        "student": None,
    }

    if teacher:
        courses = supabase.table("courses").select("id").eq("professor_id", teacher["id"]).execute()
        result["teacher"] = {
            "id": teacher["id"],
            "name": teacher.get("name"),
            "courses": len(courses.data or []),
        }

    if student:
        enrollments = supabase.table("enrollments").select("id").eq("student_id", student["id"]).execute()
        notes = supabase.table("notes").select("id").eq("student_id", student["id"]).execute()
        result["student"] = {
            "id": student["id"],
            "name": student.get("name"),
            "enrollments": len(enrollments.data or []),
            "notes": len(notes.data or []),
        }

    return result
