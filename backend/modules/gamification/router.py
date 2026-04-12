import logging
from fastapi import APIRouter, Depends, Query
from common.supabase_client import get_supabase
from middleware.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/gamification", tags=["게임화"])

# 티어 정의: (이름, 최소 EXP)
TIERS = [
    ("seed_iv", 0), ("seed_iii", 100), ("seed_ii", 200), ("seed_i", 300),
    ("sprout_iv", 400), ("sprout_iii", 550), ("sprout_ii", 700), ("sprout_i", 850),
    ("tree_iv", 1000), ("tree_iii", 1375), ("tree_ii", 1750), ("tree_i", 2125),
    ("bloom_iv", 2500), ("bloom_iii", 3125), ("bloom_ii", 3750), ("bloom_i", 4375),
    ("fruit_iv", 5000), ("fruit_iii", 6250), ("fruit_ii", 7500), ("fruit_i", 8750),
    ("forest_iv", 10000), ("forest_iii", 12500), ("forest_ii", 15000), ("forest_i", 20000),
]

TIER_INFO = {
    "seed": {"nameKo": "씨앗", "color": "#8B7355"},
    "sprout": {"nameKo": "새싹", "color": "#4ADE80"},
    "tree": {"nameKo": "나무", "color": "#22C55E"},
    "bloom": {"nameKo": "꽃", "color": "#F472B6"},
    "fruit": {"nameKo": "열매", "color": "#FBBF24"},
    "forest": {"nameKo": "숲", "color": "#8B5CF6"},
}

GRADE_NAMES = {"iv": "IV", "iii": "III", "ii": "II", "i": "I"}

# EXP 이벤트별 기본 보상 정의
EXP_REWARDS = {
    "note_create": 20,
    "note_analyze": 15,
    "assignment_submit": 30,
    "assignment_score_bonus": 20,  # 점수 80+ 보너스
    "comment": 5,
    "tutor_chat": 5,
}

EVENT_LABELS = {
    "note_create": "노트 작성",
    "note_analyze": "노트 분석",
    "assignment_submit": "과제 제출",
    "assignment_score_bonus": "과제 고득점 보너스",
    "comment": "코멘트 작성",
    "tutor_chat": "AI 튜터 질문",
    "daily_login": "일일 접속",
}


def _compute_tier(exp: int) -> str:
    """EXP에 해당하는 티어 문자열 반환"""
    result = "seed_iv"
    for tier_id, min_exp in TIERS:
        if exp >= min_exp:
            result = tier_id
    return result


def _tier_display(tier_id: str) -> dict:
    """티어 ID → 표시 정보"""
    parts = tier_id.split("_")
    base = parts[0]
    grade = parts[1] if len(parts) > 1 else "iv"
    info = TIER_INFO.get(base, TIER_INFO["seed"])
    current_idx = next((i for i, (t, _) in enumerate(TIERS) if t == tier_id), 0)
    next_exp = TIERS[current_idx + 1][1] if current_idx + 1 < len(TIERS) else None
    current_exp = TIERS[current_idx][1]
    return {
        "id": tier_id,
        "base": base,
        "grade": GRADE_NAMES.get(grade, "IV"),
        "nameKo": info["nameKo"],
        "color": info["color"],
        "display": f"{info['nameKo']} {GRADE_NAMES.get(grade, 'IV')}",
        "current_min_exp": current_exp,
        "next_min_exp": next_exp,
    }


def _award_exp_raw(user_id: str, amount: int, reason: str = ""):
    """내부: user_exp 테이블에 EXP 증감 반영."""
    if amount <= 0:
        return None
    supabase = get_supabase()
    existing = supabase.table("user_exp").select("*").eq("user_id", user_id).execute()

    if not existing.data:
        new_exp = amount
        tier = _compute_tier(new_exp)
        supabase.table("user_exp").insert({
            "user_id": user_id, "total_exp": new_exp, "tier": tier,
        }).execute()
    else:
        current = existing.data[0]
        new_exp = current["total_exp"] + amount
        tier = _compute_tier(new_exp)
        supabase.table("user_exp").update({
            "total_exp": new_exp, "tier": tier,
        }).eq("user_id", user_id).execute()

    logger.info(f"[Gamification] user={user_id}, +{amount} EXP ({reason}), total={new_exp}, tier={tier}")
    return {"total_exp": new_exp, "tier": tier}


def award_exp(user_id: str, event_type: str, ref_id: str, new_amount: int | None = None):
    """차액 기반 EXP 부여. 같은 (event_type, ref_id)에 대해 이전에 받은 EXP와 비교해 차이만 부여."""
    if new_amount is None:
        new_amount = EXP_REWARDS.get(event_type, 0)
    if new_amount <= 0:
        return

    supabase = get_supabase()

    # 기존 로그 확인
    existing = supabase.table("exp_logs") \
        .select("id, exp_amount") \
        .eq("user_id", user_id) \
        .eq("event_type", event_type) \
        .eq("ref_id", ref_id) \
        .maybe_single().execute()

    if existing.data:
        prev_amount = existing.data["exp_amount"]
        delta = new_amount - prev_amount
        if delta <= 0:
            return  # 이전보다 같거나 적으면 무시
        # 로그 업데이트
        supabase.table("exp_logs").update({"exp_amount": new_amount}) \
            .eq("id", existing.data["id"]).execute()
        _award_exp_raw(user_id, delta, f"{event_type}:{ref_id} delta={delta}")
    else:
        # 신규 로그 삽입
        try:
            supabase.table("exp_logs").insert({
                "user_id": user_id,
                "event_type": event_type,
                "ref_id": ref_id,
                "exp_amount": new_amount,
            }).execute()
        except Exception:
            return  # unique 충돌 시 무시
        _award_exp_raw(user_id, new_amount, f"{event_type}:{ref_id}")


def check_and_award_badges(user_id: str, event_type: str, event_value: int = 1):
    """이벤트 기반 뱃지 체크 및 부여"""
    supabase = get_supabase()
    badges = supabase.table("badges").select("*").eq("condition_type", event_type).execute()
    if not badges.data:
        return []

    owned = supabase.table("user_badges").select("badge_id").eq("user_id", user_id).execute()
    owned_ids = {b["badge_id"] for b in owned.data}

    earned = []
    for badge in badges.data:
        if badge["id"] in owned_ids:
            continue
        if event_value >= badge["condition_value"]:
            supabase.table("user_badges").insert({
                "user_id": user_id, "badge_id": badge["id"],
            }).execute()
            earned.append(badge)
            logger.info(f"[Badge] user={user_id} earned '{badge['name']}'")

    return earned


@router.get("/me/tier")
async def get_my_tier(user: dict = Depends(get_current_user)):
    """내 티어/EXP 조회"""
    supabase = get_supabase()
    result = supabase.table("user_exp").select("*").eq("user_id", user["id"]).execute()

    if not result.data:
        supabase.table("user_exp").insert({
            "user_id": user["id"], "total_exp": 0, "tier": "seed_iv",
        }).execute()
        return {
            "total_exp": 0,
            "tier": _tier_display("seed_iv"),
        }

    data = result.data[0]
    return {
        "total_exp": data["total_exp"],
        "tier": _tier_display(data["tier"]),
    }


@router.get("/me/detail")
async def get_my_detail(user: dict = Depends(get_current_user)):
    """내 티어 상세: 현재 티어, 다음 티어, EXP 이력, 전체 티어 로드맵"""
    supabase = get_supabase()

    # EXP 조회
    result = supabase.table("user_exp").select("*").eq("user_id", user["id"]).execute()
    if not result.data:
        supabase.table("user_exp").insert({
            "user_id": user["id"], "total_exp": 0, "tier": "seed_iv",
        }).execute()
        total_exp = 0
        tier_id = "seed_iv"
    else:
        total_exp = result.data[0]["total_exp"]
        tier_id = result.data[0]["tier"]

    tier = _tier_display(tier_id)

    # 최근 EXP 로그 (최근 30개)
    logs = supabase.table("exp_logs") \
        .select("event_type, ref_id, exp_amount, created_at") \
        .eq("user_id", user["id"]) \
        .order("created_at", desc=True) \
        .limit(30).execute()

    log_items = []
    for log in (logs.data or []):
        log_items.append({
            "event_type": log["event_type"],
            "label": EVENT_LABELS.get(log["event_type"], log["event_type"]),
            "exp": log["exp_amount"],
            "created_at": log["created_at"],
        })

    # 이벤트별 누적 EXP
    all_logs = supabase.table("exp_logs") \
        .select("event_type, exp_amount") \
        .eq("user_id", user["id"]).execute()

    breakdown: dict[str, int] = {}
    for log in (all_logs.data or []):
        et = log["event_type"]
        breakdown[et] = breakdown.get(et, 0) + log["exp_amount"]
    breakdown_list = [
        {"event_type": k, "label": EVENT_LABELS.get(k, k), "total_exp": v}
        for k, v in sorted(breakdown.items(), key=lambda x: -x[1])
    ]

    # 티어 로드맵
    roadmap = []
    for tid, min_exp in TIERS:
        info = _tier_display(tid)
        roadmap.append({
            **info,
            "min_exp": min_exp,
            "achieved": total_exp >= min_exp,
        })

    return {
        "total_exp": total_exp,
        "tier": tier,
        "recent_logs": log_items,
        "breakdown": breakdown_list,
        "roadmap": roadmap,
    }


@router.get("/me/badges")
async def get_my_badges(user: dict = Depends(get_current_user)):
    """내 뱃지 목록 (legacy)"""
    supabase = get_supabase()
    result = supabase.table("user_badges").select("*, badges(*)").eq("user_id", user["id"]).execute()
    return result.data


@router.get("/me/achievements")
async def get_my_achievements(user: dict = Depends(get_current_user)):
    """내 도전과제/배지 현황 — 전체 배지 + 달성 여부"""
    from modules.gamification.badge_defs import BADGES, CATEGORIES, RARITIES

    supabase = get_supabase()
    earned_result = supabase.table("user_achievements").select("badge_id, earned_at") \
        .eq("user_id", user["id"]).execute()
    earned_map = {b["badge_id"]: b["earned_at"] for b in (earned_result.data or [])}

    badges = []
    for b in BADGES:
        is_hidden_unearned = b["rarity"] == "hidden" and b["id"] not in earned_map
        badges.append({
            "id": b["id"],
            "name": "???" if is_hidden_unearned else b["name"],
            "desc": "숨겨진 도전과제" if is_hidden_unearned else b["desc"],
            "category": b["cat"],
            "rarity": b["rarity"],
            "icon": "❓" if is_hidden_unearned else b["icon"],
            "earned": b["id"] in earned_map,
            "earned_at": earned_map.get(b["id"]),
        })

    categories = [
        {"id": k, **v} for k, v in sorted(CATEGORIES.items(), key=lambda x: x[1]["order"])
    ]
    rarities = RARITIES

    total = len([b for b in badges if b["rarity"] != "hidden" or b["earned"]])
    earned_count = len([b for b in badges if b["earned"]])

    return {
        "badges": badges,
        "categories": categories,
        "rarities": rarities,
        "total": total,
        "earned_count": earned_count,
    }


@router.get("/me/new-badges")
async def get_new_badges(after: str | None = None, user: dict = Depends(get_current_user)):
    """최근 획득 배지 조회. after=ISO timestamp로 그 이후 획득한 배지만 반환."""
    from modules.gamification.badge_defs import BADGE_MAP

    supabase = get_supabase()
    query = supabase.table("user_achievements").select("badge_id, earned_at") \
        .eq("user_id", user["id"]).order("earned_at", desc=True)

    if after:
        query = query.gt("earned_at", after)
    else:
        query = query.limit(5)

    result = query.execute()
    badges = []
    for row in (result.data or []):
        b = BADGE_MAP.get(row["badge_id"])
        if b:
            badges.append({
                "id": b["id"], "name": b["name"], "icon": b["icon"],
                "desc": b["desc"], "rarity": b["rarity"],
                "earned_at": row["earned_at"],
            })
    return badges


@router.get("/tiers")
async def list_tiers():
    """전체 티어 목록"""
    return [{"id": tid, "min_exp": exp, **_tier_display(tid)} for tid, exp in TIERS]
