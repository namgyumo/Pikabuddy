import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from common.supabase_client import get_supabase
from middleware.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(tags=["투표"])

VOTE_DEADLINE_MINUTES = 10


# ── Pydantic models ────────────────────────────────────

class VoteInitRequest(BaseModel):
    code: str = ""
    content: dict | None = None
    problem_index: int = 0


class VoteRespondRequest(BaseModel):
    response: str  # "approve" | "reject"


# ── Helpers ─────────────────────────────────────────────

def _get_team_for_assignment(supabase, user_id: str, assignment_id: str) -> tuple[dict, str]:
    """과제의 course_id를 가져오고, 해당 과목에서 유저의 팀 ID를 반환."""
    try:
        assignment = (
            supabase.table("assignments")
            .select("course_id, is_team_assignment")
            .eq("id", assignment_id)
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="과제를 찾을 수 없습니다.")
    if not assignment.data:
        raise HTTPException(status_code=404, detail="과제를 찾을 수 없습니다.")
    if not assignment.data.get("is_team_assignment"):
        raise HTTPException(status_code=400, detail="조별과제가 아닙니다.")

    from modules.teams.router import get_user_team_ids
    course_id = assignment.data["course_id"]
    team_ids = get_user_team_ids(supabase, user_id, course_id)
    if not team_ids:
        raise HTTPException(status_code=400, detail="배정된 팀이 없습니다.")
    return assignment.data, team_ids[0]


def _get_team_member_count(supabase, team_id: str) -> int:
    result = (
        supabase.table("team_members")
        .select("student_id", count="exact")
        .eq("team_id", team_id)
        .execute()
    )
    return getattr(result, "count", None) or len(result.data or [])


def _get_team_members(supabase, team_id: str) -> list[dict]:
    result = (
        supabase.table("team_members")
        .select("student_id, users!student_id(name, avatar_url)")
        .eq("team_id", team_id)
        .execute()
    )
    members = []
    for m in (result.data or []):
        u = m.get("users") or {}
        members.append({
            "student_id": m["student_id"],
            "name": u.get("name", ""),
            "avatar_url": u.get("avatar_url"),
        })
    return members


def _check_and_resolve(supabase, vote_id: str) -> dict:
    """투표 상태를 확인하고, 조건 충족 시 resolve."""
    vote = (
        supabase.table("team_submission_votes")
        .select("*")
        .eq("id", vote_id)
        .single()
        .execute()
    ).data
    if not vote or vote["status"] != "pending":
        return vote or {}

    responses = (
        supabase.table("team_vote_responses")
        .select("*")
        .eq("vote_id", vote_id)
        .execute()
    ).data or []

    total = _get_team_member_count(supabase, vote["team_id"])
    approves = sum(1 for r in responses if r["response"] == "approve")
    rejects = sum(1 for r in responses if r["response"] == "reject")

    now = datetime.now(timezone.utc)
    deadline = datetime.fromisoformat(vote["deadline"].replace("Z", "+00:00"))
    deadline_passed = now >= deadline

    new_status = None

    # 만장일치
    if approves == total:
        new_status = "approved"
    elif rejects == total:
        new_status = "rejected"
    # 전원 투표 완료
    elif len(responses) == total:
        new_status = "approved" if approves > rejects else "rejected"
    # 기한 만료
    elif deadline_passed:
        new_status = "approved" if approves > rejects else "rejected"

    if new_status:
        supabase.table("team_submission_votes").update({
            "status": new_status,
            "resolved_at": now.isoformat(),
        }).eq("id", vote_id).execute()
        vote["status"] = new_status

        if new_status == "approved":
            _execute_team_submission(supabase, vote)

    return vote


def _execute_team_submission(supabase, vote: dict):
    """투표 승인 시 팀원 전원의 제출 레코드 생성."""
    payload = vote.get("submission_payload") or {}
    members = (
        supabase.table("team_members")
        .select("student_id")
        .eq("team_id", vote["team_id"])
        .execute()
    ).data or []

    for member in members:
        insert_data = {
            "assignment_id": vote["assignment_id"],
            "student_id": member["student_id"],
            "code": payload.get("code", ""),
            "status": "submitted",
            "problem_index": payload.get("problem_index", 0),
        }
        if payload.get("content"):
            insert_data["content"] = payload["content"]
        try:
            supabase.table("submissions").insert(insert_data).execute()
        except Exception as e:
            logger.warning(f"[Vote] 팀원 제출 실패 ({member['student_id']}): {e}")


def _build_vote_status(supabase, vote: dict, user_id: str) -> dict:
    """투표 상태 응답 객체 생성."""
    responses = (
        supabase.table("team_vote_responses")
        .select("student_id, response, created_at")
        .eq("vote_id", vote["id"])
        .execute()
    ).data or []

    members = _get_team_members(supabase, vote["team_id"])
    my_response = next((r["response"] for r in responses if r["student_id"] == user_id), None)

    # initiated_by 이름
    initiator = supabase.table("users").select("name").eq("id", vote["initiated_by"]).single().execute()
    initiator_name = (initiator.data or {}).get("name", "")

    return {
        "vote": {
            "id": vote["id"],
            "status": vote["status"],
            "initiated_by": vote["initiated_by"],
            "initiated_by_name": initiator_name,
            "deadline": vote["deadline"],
            "created_at": vote["created_at"],
            "resolved_at": vote.get("resolved_at"),
        },
        "team_id": vote["team_id"],
        "responses": responses,
        "team_members": members,
        "my_response": my_response,
    }


# ── Endpoints ───────────────────────────────────────────

@router.post("/assignments/{assignment_id}/vote", status_code=201)
async def initiate_vote(
    assignment_id: str,
    body: VoteInitRequest,
    user: dict = Depends(get_current_user),
):
    """조별과제 제출 투표 시작."""
    supabase = get_supabase()
    _, team_id = _get_team_for_assignment(supabase, user["id"], assignment_id)

    deadline = datetime.now(timezone.utc) + timedelta(minutes=VOTE_DEADLINE_MINUTES)
    payload = {"code": body.code, "problem_index": body.problem_index}
    if body.content:
        payload["content"] = body.content

    # 이미 pending 투표가 있는지 확인 → 만료/완료 가능한 건 자동 resolve
    existing = (
        supabase.table("team_submission_votes")
        .select("*")
        .eq("assignment_id", assignment_id)
        .eq("team_id", team_id)
        .eq("status", "pending")
        .execute()
    )
    for stale_vote in (existing.data or []):
        # 만료 여부와 무관하게 resolve 시도 (전원 투표 완료 등)
        _check_and_resolve(supabase, stale_vote["id"])

    # resolve 후 아직 pending이 남아있는지 재확인
    still_pending = (
        supabase.table("team_submission_votes")
        .select("id")
        .eq("assignment_id", assignment_id)
        .eq("team_id", team_id)
        .eq("status", "pending")
        .execute()
    )
    if still_pending.data:
        raise HTTPException(status_code=409, detail="이미 진행 중인 투표가 있습니다.")

    # 투표 생성
    try:
        vote_result = supabase.table("team_submission_votes").insert({
            "assignment_id": assignment_id,
            "team_id": team_id,
            "initiated_by": user["id"],
            "status": "pending",
            "submission_payload": payload,
            "deadline": deadline.isoformat(),
        }).execute()
    except Exception as e:
        logger.error(f"[Vote] 투표 생성 실패: {e}")
        raise HTTPException(status_code=500, detail="투표 생성 중 오류가 발생했습니다.")

    if not vote_result.data:
        raise HTTPException(status_code=500, detail="투표 생성 실패")

    vote = vote_result.data[0]

    # 발의자 자동 approve
    try:
        supabase.table("team_vote_responses").insert({
            "vote_id": vote["id"],
            "student_id": user["id"],
            "response": "approve",
        }).execute()
    except Exception as e:
        logger.warning(f"[Vote] 발의자 자동 승인 실패: {e}")

    # 1인 팀이면 즉시 resolve
    total = _get_team_member_count(supabase, team_id)
    if total <= 1:
        vote = _check_and_resolve(supabase, vote["id"])

    return _build_vote_status(supabase, vote, user["id"])


@router.post("/assignments/{assignment_id}/vote/{vote_id}/respond")
async def respond_to_vote(
    assignment_id: str,
    vote_id: str,
    body: VoteRespondRequest,
    user: dict = Depends(get_current_user),
):
    """투표 응답 (approve/reject). 기한 내 변경 가능."""
    if body.response not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="approve 또는 reject만 가능합니다.")

    supabase = get_supabase()
    _, team_id = _get_team_for_assignment(supabase, user["id"], assignment_id)

    # 투표 존재 확인
    try:
        vote = (
            supabase.table("team_submission_votes")
            .select("*")
            .eq("id", vote_id)
            .eq("team_id", team_id)
            .single()
            .execute()
        ).data
    except Exception:
        vote = None
    if not vote:
        raise HTTPException(status_code=404, detail="투표를 찾을 수 없습니다.")

    # 이미 resolve된 투표
    if vote["status"] != "pending":
        return _build_vote_status(supabase, vote, user["id"])

    # deadline 체크 → 만료되었으면 먼저 resolve
    now = datetime.now(timezone.utc)
    deadline = datetime.fromisoformat(vote["deadline"].replace("Z", "+00:00"))
    if now >= deadline:
        vote = _check_and_resolve(supabase, vote["id"])
        return _build_vote_status(supabase, vote, user["id"])

    # UPSERT 응답
    try:
        supabase.table("team_vote_responses").upsert({
            "vote_id": vote_id,
            "student_id": user["id"],
            "response": body.response,
        }, on_conflict="vote_id,student_id").execute()
    except Exception as e:
        logger.warning(f"[Vote] upsert 실패, delete+insert 폴백: {e}")
        try:
            supabase.table("team_vote_responses").delete().eq("vote_id", vote_id).eq("student_id", user["id"]).execute()
            supabase.table("team_vote_responses").insert({
                "vote_id": vote_id,
                "student_id": user["id"],
                "response": body.response,
            }).execute()
        except Exception as e2:
            logger.error(f"[Vote] 응답 저장 실패: {e2}")
            raise HTTPException(status_code=500, detail="투표 응답 저장 중 오류가 발생했습니다.")

    # resolve 체크
    vote = _check_and_resolve(supabase, vote["id"])
    return _build_vote_status(supabase, vote, user["id"])


@router.get("/assignments/{assignment_id}/vote/status")
async def get_vote_status(
    assignment_id: str,
    user: dict = Depends(get_current_user),
):
    """현재 투표 상태 조회. deadline 지났으면 자동 resolve."""
    supabase = get_supabase()
    _, team_id = _get_team_for_assignment(supabase, user["id"], assignment_id)

    # 최신 투표 조회 (pending 우선, 없으면 최신)
    result = (
        supabase.table("team_submission_votes")
        .select("*")
        .eq("assignment_id", assignment_id)
        .eq("team_id", team_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if not result.data:
        return {"vote": None, "team_id": team_id, "responses": [], "team_members": _get_team_members(supabase, team_id), "my_response": None}

    vote = result.data[0]

    # pending인데 deadline 지남 → 자동 resolve
    if vote["status"] == "pending":
        vote = _check_and_resolve(supabase, vote["id"])

    return _build_vote_status(supabase, vote, user["id"])
