import logging
from fastapi import APIRouter, Depends
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
    # 다음 티어 EXP 계산
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


def award_exp(user_id: str, amount: int, reason: str = ""):
    """EXP 부여 + 티어 갱신. 다른 라우터에서 호출 가능."""
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


def check_and_award_badges(user_id: str, event_type: str, event_value: int = 1):
    """이벤트 기반 뱃지 체크 및 부여"""
    supabase = get_supabase()
    # 해당 이벤트 타입의 뱃지 목록 조회
    badges = supabase.table("badges").select("*").eq("condition_type", event_type).execute()
    if not badges.data:
        return []

    # 이미 보유한 뱃지
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
        # 초기화
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


@router.get("/me/badges")
async def get_my_badges(user: dict = Depends(get_current_user)):
    """내 뱃지 목록"""
    supabase = get_supabase()
    result = supabase.table("user_badges").select("*, badges(*)").eq("user_id", user["id"]).execute()
    return result.data


@router.get("/tiers")
async def list_tiers():
    """전체 티어 목록"""
    return [{"id": tid, "min_exp": exp, **_tier_display(tid)} for tid, exp in TIERS]
