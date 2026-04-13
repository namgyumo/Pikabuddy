import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from common.supabase_client import get_supabase
from middleware.auth import get_current_user, require_professor

logger = logging.getLogger(__name__)

router = APIRouter(tags=["팀"])


# ── Pydantic models ────────────────────────────────────

class TeamCreateRequest(BaseModel):
    name: str
    member_ids: list[str]


class TeamUpdateRequest(BaseModel):
    name: str | None = None
    member_ids: list[str] | None = None


# ── Helpers ─────────────────────────────────────────────

def get_user_team_ids(supabase, user_id: str, course_id: str) -> list[str]:
    """해당 과목에서 유저가 속한 팀 ID 목록 반환."""
    result = (
        supabase.table("team_members")
        .select("team_id, teams!inner(course_id)")
        .eq("student_id", user_id)
        .eq("teams.course_id", course_id)
        .execute()
    )
    return [r["team_id"] for r in (result.data or [])]


def _validate_course_professor(supabase, course_id: str, user: dict):
    """과목의 교수인지 검증."""
    course = (
        supabase.table("courses")
        .select("professor_id")
        .eq("id", course_id)
        .single()
        .execute()
    )
    if not course.data:
        raise HTTPException(status_code=404, detail="과목을 찾을 수 없습니다.")
    is_admin = user.get("email", "").endswith("@pikabuddy.admin")
    if course.data["professor_id"] != user["id"] and not is_admin:
        raise HTTPException(status_code=403, detail="해당 과목의 교수만 팀을 관리할 수 있습니다.")


def _fetch_team_with_members(supabase, team_id: str) -> dict:
    """팀 + 멤버 정보 조회."""
    team = supabase.table("teams").select("*").eq("id", team_id).single().execute()
    if not team.data:
        raise HTTPException(status_code=404, detail="팀을 찾을 수 없습니다.")
    members_result = (
        supabase.table("team_members")
        .select("id, student_id, joined_at, users!student_id(name, avatar_url)")
        .eq("team_id", team_id)
        .execute()
    )
    members = []
    for m in (members_result.data or []):
        u = m.get("users") or {}
        members.append({
            "id": m["id"],
            "student_id": m["student_id"],
            "name": u.get("name", ""),
            "avatar_url": u.get("avatar_url"),
            "joined_at": m["joined_at"],
        })
    return {**team.data, "members": members}


# ── Endpoints ───────────────────────────────────────────

@router.post("/courses/{course_id}/teams", status_code=201)
async def create_team(
    course_id: str, body: TeamCreateRequest, user: dict = Depends(require_professor)
):
    """팀 생성. 멤버는 해당 과목 수강생이어야 한다."""
    supabase = get_supabase()
    _validate_course_professor(supabase, course_id, user)

    if not body.name.strip():
        raise HTTPException(status_code=400, detail="팀 이름을 입력하세요.")
    if not body.member_ids:
        raise HTTPException(status_code=400, detail="팀 멤버를 1명 이상 선택하세요.")

    # 수강생 검증
    enrollments = (
        supabase.table("enrollments")
        .select("student_id")
        .eq("course_id", course_id)
        .in_("student_id", body.member_ids)
        .execute()
    )
    enrolled_ids = {e["student_id"] for e in (enrollments.data or [])}
    invalid = set(body.member_ids) - enrolled_ids
    if invalid:
        raise HTTPException(status_code=400, detail=f"수강생이 아닌 사용자가 포함되어 있습니다: {len(invalid)}명")

    # 팀 생성
    team = (
        supabase.table("teams")
        .insert({"course_id": course_id, "name": body.name.strip(), "created_by": user["id"]})
        .execute()
    )
    team_id = team.data[0]["id"]

    # 멤버 등록
    member_rows = [{"team_id": team_id, "student_id": sid} for sid in body.member_ids]
    supabase.table("team_members").insert(member_rows).execute()

    # ── Gamification: team join badges for all members ──
    try:
        from modules.gamification.badge_defs import check_badges
        for sid in body.member_ids:
            check_badges(sid, "team_join")
        check_badges(user["id"], "team_create")
    except Exception:
        pass

    return _fetch_team_with_members(supabase, team_id)


@router.get("/courses/{course_id}/teams")
async def list_teams(course_id: str, user: dict = Depends(get_current_user)):
    """팀 목록. 교수=전체, 학생=본인 팀만."""
    supabase = get_supabase()

    teams_result = (
        supabase.table("teams")
        .select("*")
        .eq("course_id", course_id)
        .order("created_at")
        .execute()
    )
    teams = teams_result.data or []

    if user["role"] == "student":
        my_team_ids = set(get_user_team_ids(supabase, user["id"], course_id))
        teams = [t for t in teams if t["id"] in my_team_ids]

    # 각 팀에 멤버 정보 추가
    team_ids = [t["id"] for t in teams]
    if not team_ids:
        return []

    all_members = (
        supabase.table("team_members")
        .select("id, team_id, student_id, joined_at, users!student_id(name, avatar_url)")
        .in_("team_id", team_ids)
        .execute()
    )
    members_by_team: dict[str, list] = {}
    for m in (all_members.data or []):
        u = m.get("users") or {}
        entry = {
            "id": m["id"],
            "student_id": m["student_id"],
            "name": u.get("name", ""),
            "avatar_url": u.get("avatar_url"),
        }
        members_by_team.setdefault(m["team_id"], []).append(entry)

    for t in teams:
        t["members"] = members_by_team.get(t["id"], [])

    return teams


@router.get("/courses/{course_id}/teams/{team_id}")
async def get_team(course_id: str, team_id: str, user: dict = Depends(get_current_user)):
    """팀 상세. 교수 또는 해당 팀 멤버만 접근 가능."""
    supabase = get_supabase()
    team_data = _fetch_team_with_members(supabase, team_id)

    if team_data["course_id"] != course_id:
        raise HTTPException(status_code=404, detail="팀을 찾을 수 없습니다.")

    if user["role"] == "student":
        member_ids = {m["student_id"] for m in team_data["members"]}
        if user["id"] not in member_ids:
            raise HTTPException(status_code=403, detail="해당 팀의 멤버가 아닙니다.")

    return team_data


@router.patch("/courses/{course_id}/teams/{team_id}")
async def update_team(
    course_id: str, team_id: str, body: TeamUpdateRequest,
    user: dict = Depends(require_professor),
):
    """팀 수정. 이름 및/또는 멤버 변경."""
    supabase = get_supabase()
    _validate_course_professor(supabase, course_id, user)

    # 팀 존재 확인
    team = supabase.table("teams").select("id").eq("id", team_id).eq("course_id", course_id).single().execute()
    if not team.data:
        raise HTTPException(status_code=404, detail="팀을 찾을 수 없습니다.")

    # 이름 변경
    if body.name is not None:
        supabase.table("teams").update({"name": body.name.strip()}).eq("id", team_id).execute()

    # 멤버 변경
    if body.member_ids is not None:
        if not body.member_ids:
            raise HTTPException(status_code=400, detail="팀 멤버를 1명 이상 선택하세요.")

        # 수강생 검증
        enrollments = (
            supabase.table("enrollments")
            .select("student_id")
            .eq("course_id", course_id)
            .in_("student_id", body.member_ids)
            .execute()
        )
        enrolled_ids = {e["student_id"] for e in (enrollments.data or [])}
        invalid = set(body.member_ids) - enrolled_ids
        if invalid:
            raise HTTPException(status_code=400, detail=f"수강생이 아닌 사용자: {len(invalid)}명")

        # 기존 멤버 삭제 후 재삽입
        supabase.table("team_members").delete().eq("team_id", team_id).execute()
        member_rows = [{"team_id": team_id, "student_id": sid} for sid in body.member_ids]
        supabase.table("team_members").insert(member_rows).execute()

    return _fetch_team_with_members(supabase, team_id)


@router.delete("/courses/{course_id}/teams/{team_id}", status_code=204)
async def delete_team(
    course_id: str, team_id: str, user: dict = Depends(require_professor)
):
    """팀 삭제. 연관된 team_members는 CASCADE, notes의 team_id는 SET NULL."""
    supabase = get_supabase()
    _validate_course_professor(supabase, course_id, user)

    team = supabase.table("teams").select("id").eq("id", team_id).eq("course_id", course_id).single().execute()
    if not team.data:
        raise HTTPException(status_code=404, detail="팀을 찾을 수 없습니다.")

    supabase.table("teams").delete().eq("id", team_id).execute()
