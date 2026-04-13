"""Badge definitions and auto-checking logic for the gamification system."""

import logging
from datetime import date, timedelta

logger = logging.getLogger(__name__)

# ── Categories ──
CATEGORIES = {
    "onboarding": {"name": "시작/온보딩", "icon": "🚀", "order": 0},
    "attendance": {"name": "출석/꾸준함", "icon": "📅", "order": 1},
    "assignment": {"name": "과제/챌린지", "icon": "📝", "order": 2},
    "score": {"name": "성과/점수", "icon": "🏆", "order": 3},
    "code": {"name": "코드 에디터", "icon": "💻", "order": 4},
    "writing": {"name": "글쓰기", "icon": "✍️", "order": 5},
    "quiz": {"name": "퀴즈", "icon": "❓", "order": 6},
    "note": {"name": "노트", "icon": "📒", "order": 7},
    "ai": {"name": "AI 분석/튜터", "icon": "🤖", "order": 8},
    "graph": {"name": "지식 그래프", "icon": "🕸️", "order": 9},
    "team": {"name": "팀 협업", "icon": "👥", "order": 10},
    "social": {"name": "소통", "icon": "💬", "order": 11},
    "exam": {"name": "시험", "icon": "📋", "order": 12},
    "profile": {"name": "프로필/테마", "icon": "🎨", "order": 13},
    "hidden": {"name": "숨김", "icon": "❓", "order": 14},
}

RARITIES = {
    "common": {"name": "일반", "color": "#9CA3AF"},
    "rare": {"name": "희귀", "color": "#3B82F6"},
    "legendary": {"name": "전설", "color": "#F59E0B"},
    "hidden": {"name": "숨김", "color": "#8B5CF6"},
}

# ── Badge Definitions ──
# id, name, desc, cat (category), rarity, icon
BADGES: list[dict] = [
    # ── 시작/온보딩 ──
    {"id": "first_step", "name": "첫 발걸음", "desc": "첫 로그인 완료", "cat": "onboarding", "rarity": "common", "icon": "👣"},
    {"id": "first_classroom", "name": "첫 강의실 입장", "desc": "첫 강의 참가 또는 개설", "cat": "onboarding", "rarity": "common", "icon": "🏫"},
    {"id": "first_note_save", "name": "처음 쓰는 한 줄", "desc": "첫 노트 저장", "cat": "onboarding", "rarity": "common", "icon": "✏️"},
    {"id": "first_submit", "name": "첫 제출", "desc": "첫 과제/챌린지 제출", "cat": "onboarding", "rarity": "common", "icon": "📤"},
    {"id": "first_analysis", "name": "첫 분석 완료", "desc": "첫 AI 분석 실행", "cat": "onboarding", "rarity": "common", "icon": "🔬"},

    # ── 출석/꾸준함 ──
    {"id": "streak_1", "name": "하루 한 걸음", "desc": "1일 접속", "cat": "attendance", "rarity": "common", "icon": "👟"},
    {"id": "streak_3", "name": "삼일의 의지", "desc": "3일 연속 접속", "cat": "attendance", "rarity": "common", "icon": "🔥"},
    {"id": "streak_7", "name": "일주일 루틴", "desc": "7일 연속 접속", "cat": "attendance", "rarity": "rare", "icon": "📆"},
    {"id": "streak_14", "name": "반달 루틴", "desc": "14일 연속 접속", "cat": "attendance", "rarity": "rare", "icon": "🌗"},
    {"id": "streak_30", "name": "한 달 루틴", "desc": "30일 연속 접속", "cat": "attendance", "rarity": "legendary", "icon": "🗓️"},
    {"id": "streak_50", "name": "끈질긴 학습자", "desc": "50일 연속 접속", "cat": "attendance", "rarity": "legendary", "icon": "💪"},
    {"id": "streak_100", "name": "생활화 완료", "desc": "100일 연속 접속", "cat": "attendance", "rarity": "legendary", "icon": "🏅"},
    {"id": "weekend_study", "name": "주말도 공부함", "desc": "토·일 모두 학습 활동", "cat": "attendance", "rarity": "rare", "icon": "📚"},

    # ── 과제/챌린지 ──
    {"id": "submit_1", "name": "제출의 시작", "desc": "과제 1회 제출", "cat": "assignment", "rarity": "common", "icon": "📋"},
    {"id": "submit_5", "name": "성실 제출자", "desc": "과제 5회 제출", "cat": "assignment", "rarity": "common", "icon": "📑"},
    {"id": "submit_10", "name": "꾸준 제출자", "desc": "과제 10회 제출", "cat": "assignment", "rarity": "rare", "icon": "📊"},
    {"id": "submit_30", "name": "숙련 제출자", "desc": "과제 30회 제출", "cat": "assignment", "rarity": "rare", "icon": "📦"},
    {"id": "submit_50", "name": "과제 헌터", "desc": "과제 50회 제출", "cat": "assignment", "rarity": "legendary", "icon": "🎯"},
    {"id": "multi_track", "name": "멀티 트랙", "desc": "코딩/글쓰기/퀴즈 유형 전부 제출", "cat": "assignment", "rarity": "rare", "icon": "🔀"},

    # ── 성과/점수 ──
    {"id": "score_80", "name": "첫 80점", "desc": "추천 점수 80점 이상 1회", "cat": "score", "rarity": "common", "icon": "⭐"},
    {"id": "score_90", "name": "첫 90점", "desc": "90점 이상 1회", "cat": "score", "rarity": "rare", "icon": "🌟"},
    {"id": "score_100", "name": "만점의 맛", "desc": "100점 1회", "cat": "score", "rarity": "legendary", "icon": "💯"},
    {"id": "score_80_10", "name": "흔들림 없음", "desc": "80점 이상 10회", "cat": "score", "rarity": "rare", "icon": "🛡️"},
    {"id": "score_90_streak3", "name": "정확한 손", "desc": "90점 이상 3연속", "cat": "score", "rarity": "rare", "icon": "✨"},
    {"id": "comeback", "name": "역전의 명수", "desc": "이전 제출보다 20점 이상 향상", "cat": "score", "rarity": "rare", "icon": "🔄"},
    {"id": "rising_curve", "name": "상승 곡선", "desc": "3회 연속 점수 상승", "cat": "score", "rarity": "rare", "icon": "📈"},
    {"id": "high_collector", "name": "고득점 수집가", "desc": "95점 이상 10회", "cat": "score", "rarity": "legendary", "icon": "💎"},

    # ── 코드 에디터 ──
    {"id": "first_pass", "name": "첫 통과", "desc": "테스트 1개 이상 통과", "cat": "code", "rarity": "common", "icon": "✅"},
    {"id": "all_pass", "name": "전부 통과", "desc": "한 문제의 테스트 전부 통과", "cat": "code", "rarity": "rare", "icon": "🎖️"},
    {"id": "debugger", "name": "디버거 정신", "desc": "실행 10회 후 통과 달성", "cat": "code", "rarity": "rare", "icon": "🔧"},
    {"id": "one_shot", "name": "한 번에 해결", "desc": "첫 제출로 통과", "cat": "code", "rarity": "rare", "icon": "🎯"},
    {"id": "lang_explorer", "name": "언어 탐험가", "desc": "서로 다른 언어 3종으로 제출", "cat": "code", "rarity": "rare", "icon": "🌐"},

    # ── 글쓰기 ──
    {"id": "first_writing", "name": "한 문단의 용기", "desc": "글쓰기 과제 첫 제출", "cat": "writing", "rarity": "common", "icon": "📝"},
    {"id": "writing_5", "name": "문장 장인 초입", "desc": "글쓰기 과제 5회 제출", "cat": "writing", "rarity": "rare", "icon": "🖊️"},
    {"id": "long_writing", "name": "장문의 결심", "desc": "1000자 이상 작성 3회", "cat": "writing", "rarity": "rare", "icon": "📜"},

    # ── 퀴즈 ──
    {"id": "first_quiz", "name": "첫 정답", "desc": "퀴즈 첫 정답", "cat": "quiz", "rarity": "common", "icon": "❓"},
    {"id": "quiz_runner", "name": "퀴즈 러너", "desc": "퀴즈 20세트 완료", "cat": "quiz", "rarity": "rare", "icon": "🏃"},

    # ── 노트 ──
    {"id": "note_1", "name": "필기의 시작", "desc": "노트 첫 저장", "cat": "note", "rarity": "common", "icon": "📓"},
    {"id": "note_5", "name": "기록자", "desc": "노트 5개 작성", "cat": "note", "rarity": "common", "icon": "📝"},
    {"id": "note_20", "name": "정리광", "desc": "노트 20개 작성", "cat": "note", "rarity": "rare", "icon": "📚"},
    {"id": "block_master", "name": "블록 장인", "desc": "5종 이상의 블록 사용", "cat": "note", "rarity": "rare", "icon": "🧱"},
    {"id": "sub_notes", "name": "깊이 파는 사람", "desc": "하위 노트 3개 이상 생성", "cat": "note", "rarity": "rare", "icon": "🔍"},
    {"id": "note_architect", "name": "문서 건축가", "desc": "한 노트에 블록 30개 이상", "cat": "note", "rarity": "rare", "icon": "🏛️"},

    # ── AI 분석/튜터 ──
    {"id": "first_ai", "name": "AI와 첫 대화", "desc": "AI 분석 첫 실행", "cat": "ai", "rarity": "common", "icon": "🤖"},
    {"id": "understanding_first", "name": "이해도 점수 획득", "desc": "노트 첫 이해도 점수 확인", "cat": "ai", "rarity": "common", "icon": "📊"},
    {"id": "precise_reviser", "name": "정교한 수정자", "desc": "재분석 후 점수 10점 상승", "cat": "ai", "rarity": "rare", "icon": "🎯"},
    {"id": "analysis_10", "name": "분석 습관", "desc": "AI 분석 10회 실행", "cat": "ai", "rarity": "rare", "icon": "🔬"},
    {"id": "analysis_30", "name": "분석 중독자", "desc": "AI 분석 30회 실행", "cat": "ai", "rarity": "legendary", "icon": "🧪"},
    {"id": "tutor_first", "name": "질문의 시작", "desc": "AI 튜터 첫 질문", "cat": "ai", "rarity": "common", "icon": "💡"},
    {"id": "tutor_10", "name": "힌트 수집가", "desc": "AI 튜터와 10일 대화", "cat": "ai", "rarity": "rare", "icon": "🎓"},

    # ── 지식 그래프 ──
    {"id": "first_link", "name": "첫 연결", "desc": "노트 링크 1개 생성", "cat": "graph", "rarity": "common", "icon": "🔗"},
    {"id": "link_10", "name": "연결가", "desc": "노트 링크 10개 생성", "cat": "graph", "rarity": "rare", "icon": "��️"},
    {"id": "graph_explorer", "name": "그래프 탐험가", "desc": "Graph 첫 열람", "cat": "graph", "rarity": "common", "icon": "🗺️"},
    {"id": "link_forest", "name": "연결의 숲", "desc": "연결된 노트 30개 달성", "cat": "graph", "rarity": "legendary", "icon": "🌳"},

    # ── 팀 협업 ──
    {"id": "team_join", "name": "팀 결성", "desc": "첫 팀 생성 또는 소속", "cat": "team", "rarity": "common", "icon": "👥"},
    {"id": "team_note", "name": "함께 쓰는 노트", "desc": "팀 노트 공동 편집 첫 경험", "cat": "team", "rarity": "common", "icon": "📝"},
    {"id": "team_vote", "name": "투표 개시자", "desc": "제출 투표 첫 시작", "cat": "team", "rarity": "rare", "icon": "🗳️"},
    {"id": "unanimous", "name": "만장일치", "desc": "전원 찬성 제출 3회", "cat": "team", "rarity": "legendary", "icon": "🤝"},
    {"id": "team_center", "name": "팀의 중심", "desc": "동일 팀에서 코멘트/수정/제출 모두 수행", "cat": "team", "rarity": "rare", "icon": "⭐"},

    # ── 소통 ──
    {"id": "first_message", "name": "첫 메시지", "desc": "첫 메시지 전송", "cat": "social", "rarity": "common", "icon": "💬"},
    {"id": "chat_5_users", "name": "대화 개척자", "desc": "서로 다른 사용자 5명과 대화", "cat": "social", "rarity": "rare", "icon": "🌍"},
    {"id": "first_comment", "name": "친절한 피드백러", "desc": "코멘트 첫 작성", "cat": "social", "rarity": "common", "icon": "💭"},
    {"id": "comment_resolver", "name": "코멘트 해결사", "desc": "해결 처리 5회", "cat": "social", "rarity": "rare", "icon": "✅"},
    {"id": "social_learner", "name": "소통형 학습자", "desc": "메시지와 코멘트를 모두 활발히 사용", "cat": "social", "rarity": "rare", "icon": "🤗"},

    # ── 시험 ──
    {"id": "first_exam", "name": "첫 응시", "desc": "시험 모드 첫 시작", "cat": "exam", "rarity": "common", "icon": "📋"},
    {"id": "exam_focus", "name": "끝까지 집중", "desc": "위반 없이 시험 종료", "cat": "exam", "rarity": "rare", "icon": "🎯"},
    {"id": "exam_3_clean", "name": "철통 집중력", "desc": "3회 연속 무위반 시험", "cat": "exam", "rarity": "legendary", "icon": "🛡️"},
    {"id": "honest_learner", "name": "정직한 학습자", "desc": "부정 기록 없이 시험 5회 완료", "cat": "exam", "rarity": "rare", "icon": "🤞"},

    # ── 프로필/테마 ──
    {"id": "avatar_set", "name": "내 방 꾸미기", "desc": "프로필 이미지 설정", "cat": "profile", "rarity": "common", "icon": "🖼️"},
    {"id": "banner_set", "name": "배너 아티스트", "desc": "배너 설정", "cat": "profile", "rarity": "common", "icon": "🎨"},
    {"id": "theme_3", "name": "테마 체험가", "desc": "내장 테마 3개 사용", "cat": "profile", "rarity": "rare", "icon": "🎭"},
    {"id": "full_profile", "name": "분위기 메이커", "desc": "배너, 테마, 프로필 모두 완성", "cat": "profile", "rarity": "rare", "icon": "✨"},

    # ── 교수 전용 ──
    {"id": "first_course", "name": "첫 강의 개설자", "desc": "강의 첫 생성", "cat": "onboarding", "rarity": "common", "icon": "🏫"},
    {"id": "curriculum_designer", "name": "커리큘럼 설계자", "desc": "과제 5개 발행", "cat": "assignment", "rarity": "rare", "icon": "📐"},
    {"id": "feedback_master", "name": "피드백 마스터", "desc": "최종 점수 확정 10회", "cat": "score", "rarity": "rare", "icon": "📊"},
    {"id": "note_reviewer", "name": "노트 리뷰어", "desc": "학생 노트 리뷰 10회", "cat": "note", "rarity": "rare", "icon": "👁️"},
    {"id": "team_builder", "name": "팀 빌더", "desc": "팀 3개 이상 구성", "cat": "team", "rarity": "rare", "icon": "🏗️"},

    # ── 숨김/희귀 ──
    {"id": "perfect_day", "name": "완벽한 하루", "desc": "하루에 과제 제출+노트 분석+메시지 달성", "cat": "hidden", "rarity": "hidden", "icon": "🌈"},
    {"id": "dawn_sage", "name": "새벽의 현자", "desc": "오전 4~5시에 활동", "cat": "hidden", "rarity": "hidden", "icon": "🌠"},
    {"id": "deadline_survivor", "name": "마감 1분 전 생존자", "desc": "마감 1분 내 제출 성공", "cat": "hidden", "rarity": "hidden", "icon": "⏱️"},
    {"id": "phoenix", "name": "피닉스", "desc": "3회 실패 후 최종 통과", "cat": "hidden", "rarity": "hidden", "icon": "🔥"},
    {"id": "forest_premonition", "name": "숲의 예감", "desc": "숲 티어 직전 EXP 1 남기기", "cat": "hidden", "rarity": "hidden", "icon": "🌲"},
    {"id": "all_rounder", "name": "전천후 학습자", "desc": "코드/글쓰기/노트/그래프/메신저를 하루에 전부 사용", "cat": "hidden", "rarity": "hidden", "icon": "🦸"},
]

# Quick lookup
BADGE_MAP = {b["id"]: b for b in BADGES}

# ── Event → Badge mapping ──
EVENT_BADGES: dict[str, list[str]] = {
    "note_create": ["first_note_save", "note_1", "note_5", "note_20", "sub_notes", "block_master", "note_architect"],
    "note_analyze": ["first_analysis", "first_ai", "understanding_first", "analysis_10", "analysis_30", "precise_reviser"],
    "assignment_submit": ["first_submit", "submit_1", "submit_5", "submit_10", "submit_30", "submit_50",
                          "multi_track", "first_writing", "writing_5", "long_writing"],
    "score_received": ["score_80", "score_90", "score_100", "score_80_10", "score_90_streak3",
                        "comeback", "rising_curve", "high_collector"],
    "code_judge": ["first_pass", "all_pass", "debugger", "one_shot", "lang_explorer"],
    "comment_create": ["first_comment", "comment_resolver"],
    "message_send": ["first_message", "chat_5_users", "social_learner"],
    "team_join": ["team_join"],
    "team_note_edit": ["team_note"],
    "team_create": ["team_builder"],
    "vote_start": ["team_vote"],
    "vote_complete": ["unanimous"],
    "tutor_chat": ["tutor_first", "tutor_10"],
    "note_link": ["first_link", "link_10", "link_forest"],
    "graph_view": ["graph_explorer"],
    "exam_start": ["first_exam"],
    "exam_end": ["exam_focus", "exam_3_clean", "honest_learner"],
    "login": ["first_step", "streak_1", "streak_3", "streak_7", "streak_14",
              "streak_30", "streak_50", "streak_100", "weekend_study",
              "perfect_day", "dawn_sage", "all_rounder"],
    "enrollment": ["first_classroom"],
    "course_create": ["first_course"],
    "score_finalize": ["curriculum_designer", "feedback_master"],
    "note_review": ["note_reviewer"],
}


# ── Checker Functions ──

def _count_notes(sb, user_id: str) -> int:
    r = sb.table("notes").select("id", count="exact").eq("student_id", user_id).execute()
    return r.count or 0


def _count_submissions(sb, user_id: str) -> int:
    r = sb.table("submissions").select("id", count="exact").eq("student_id", user_id).execute()
    return r.count or 0


def _count_note_links(sb, user_id: str) -> int:
    # Count links from user's notes
    notes = sb.table("notes").select("id").eq("student_id", user_id).execute()
    if not notes.data:
        return 0
    ids = [n["id"] for n in notes.data]
    r = sb.table("note_links").select("source_note_id", count="exact").in_("source_note_id", ids).execute()
    return r.count or 0


def _get_scores(sb, user_id: str) -> list[int]:
    """Get all AI analysis scores for user, ordered by creation."""
    subs = sb.table("submissions").select("id").eq("student_id", user_id).execute()
    if not subs.data:
        return []
    sub_ids = [s["id"] for s in subs.data]
    analyses = sb.table("ai_analyses").select("score, created_at") \
        .in_("submission_id", sub_ids).order("created_at").execute()
    return [a["score"] for a in (analyses.data or []) if a.get("score") is not None]


def _count_exp_log_days(sb, user_id: str, event_type: str = None) -> list[str]:
    """Get distinct dates from exp_logs for streak calculation."""
    q = sb.table("exp_logs").select("created_at").eq("user_id", user_id)
    if event_type:
        q = q.eq("event_type", event_type)
    result = q.order("created_at").execute()
    dates = set()
    for r in (result.data or []):
        d = r["created_at"][:10]  # YYYY-MM-DD
        dates.add(d)
    return sorted(dates)


def _calc_streak(dates: list[str]) -> int:
    """Calculate current consecutive day streak from sorted date strings."""
    if not dates:
        return 0
    today = date.today().isoformat()
    yesterday = (date.today() - timedelta(days=1)).isoformat()

    # Must include today or yesterday
    if dates[-1] != today and dates[-1] != yesterday:
        return 0

    streak = 1
    for i in range(len(dates) - 1, 0, -1):
        curr = date.fromisoformat(dates[i])
        prev = date.fromisoformat(dates[i - 1])
        if (curr - prev).days == 1:
            streak += 1
        elif (curr - prev).days == 0:
            continue
        else:
            break
    return streak


def _count_tutor_days(sb, user_id: str) -> int:
    """Count distinct tutor chat days."""
    r = sb.table("exp_logs").select("ref_id").eq("user_id", user_id).eq("event_type", "tutor_chat").execute()
    # ref_id 형식: "daily_2026-04-10" → 날짜 부분 추출하여 고유 일수 계산
    days = set()
    for row in (r.data or []):
        ref = row.get("ref_id", "")
        if ref.startswith("daily_"):
            days.add(ref[6:])  # "daily_" 이후 날짜 부분
        else:
            days.add(ref)
    return len(days)


def _count_analyses(sb, user_id: str) -> int:
    """Count note analysis exp logs."""
    r = sb.table("exp_logs").select("id", count="exact") \
        .eq("user_id", user_id).eq("event_type", "note_analyze").execute()
    return r.count or 0


def _count_messages(sb, user_id: str) -> int:
    r = sb.table("messages").select("id", count="exact").eq("sender_id", user_id).execute()
    return r.count or 0


def _count_distinct_chat_partners(sb, user_id: str) -> int:
    r = sb.table("messages").select("receiver_id").eq("sender_id", user_id).execute()
    return len({m["receiver_id"] for m in (r.data or [])})


def _count_comments(sb, user_id: str) -> int:
    r = sb.table("note_comments").select("id", count="exact").eq("user_id", user_id).execute()
    return r.count or 0


def _count_resolved_comments(sb, user_id: str) -> int:
    """Count comments authored by user that are resolved."""
    r = sb.table("note_comments").select("id", count="exact") \
        .eq("user_id", user_id).eq("is_resolved", True).execute()
    return r.count or 0


def _has_team(sb, user_id: str) -> bool:
    r = sb.table("team_members").select("id").eq("student_id", user_id).limit(1).execute()
    return bool(r.data)


def _count_sub_notes(sb, user_id: str) -> int:
    r = sb.table("notes").select("id", count="exact") \
        .eq("student_id", user_id).not_.is_("parent_id", "null").execute()
    return r.count or 0


def _check_multi_track(sb, user_id: str) -> bool:
    """Check if user submitted coding, writing, and quiz types."""
    subs = sb.table("submissions").select("assignment_id").eq("student_id", user_id).execute()
    if not subs.data:
        return False
    a_ids = list({s["assignment_id"] for s in subs.data})
    assignments = sb.table("assignments").select("type").in_("id", a_ids).execute()
    types = {a["type"] for a in (assignments.data or [])}
    # both counts as coding+writing
    has_coding = "coding" in types or "both" in types or "algorithm" in types
    has_writing = "writing" in types or "both" in types
    has_quiz = "quiz" in types
    return has_coding and has_writing and has_quiz


def _check_weekend_study(sb, user_id: str) -> bool:
    """Check if user had activity on both Sat and Sun of the SAME week."""
    dates = _count_exp_log_days(sb, user_id)
    # 주차별로 토요일/일요일 활동 여부 추적
    sat_weeks: set[str] = set()
    sun_weeks: set[str] = set()
    for d_str in dates:
        d = date.fromisoformat(d_str)
        # ISO 주차 번호 (year-week 형태로 키 생성)
        iso_year, iso_week, _ = d.isocalendar()
        week_key = f"{iso_year}-W{iso_week}"
        if d.weekday() == 5:
            sat_weeks.add(week_key)
        elif d.weekday() == 6:
            sun_weeks.add(week_key)
    # 같은 주에 토/일 모두 활동이 있는지 확인
    return bool(sat_weeks & sun_weeks)


def _count_languages(sb, user_id: str) -> int:
    """Count distinct programming languages used in submissions."""
    subs = sb.table("submissions").select("content").eq("student_id", user_id).limit(200).execute()
    langs = set()
    for s in (subs.data or []):
        c = s.get("content")
        if isinstance(c, dict) and c.get("language"):
            langs.add(c["language"].lower())
    return len(langs)


def _count_writing_submissions(sb, user_id: str) -> int:
    """Count writing-type assignment submissions."""
    subs = sb.table("submissions").select("assignment_id").eq("student_id", user_id).execute()
    if not subs.data:
        return 0
    a_ids = list({s["assignment_id"] for s in subs.data})
    assignments = sb.table("assignments").select("id, type").in_("id", a_ids).execute()
    writing_ids = {a["id"] for a in (assignments.data or []) if a.get("type") in ("writing", "both")}
    return sum(1 for s in subs.data if s["assignment_id"] in writing_ids)


def _count_long_writings(sb, user_id: str) -> int:
    """Count submissions with 1000+ chars of writing content."""
    subs = sb.table("submissions").select("content").eq("student_id", user_id).limit(200).execute()
    count = 0
    for s in (subs.data or []):
        c = s.get("content")
        if isinstance(c, dict):
            text = c.get("writing", "") or c.get("text", "") or ""
            if len(text) >= 1000:
                count += 1
    return count


def _count_clean_exams(sb, user_id: str) -> int:
    """Count exams completed without violations."""
    # Get all assignments where student submitted (exam type)
    subs = sb.table("submissions").select("assignment_id").eq("student_id", user_id).execute()
    if not subs.data:
        return 0
    a_ids = list({s["assignment_id"] for s in subs.data})
    # Check which had violations
    violations = sb.table("exam_violations").select("assignment_id") \
        .eq("student_id", user_id).in_("assignment_id", a_ids).execute()
    violated_aids = {v["assignment_id"] for v in (violations.data or [])}
    return len([aid for aid in a_ids if aid not in violated_aids])


def _check_all_rounder(sb, user_id: str) -> bool:
    """Check if user used code/writing/notes/graph/messenger in a single day."""
    logs = sb.table("exp_logs").select("event_type, created_at") \
        .eq("user_id", user_id).execute()
    day_events: dict[str, set] = {}
    for log in (logs.data or []):
        d = log["created_at"][:10]
        day_events.setdefault(d, set()).add(log["event_type"])

    msgs = sb.table("messages").select("created_at").eq("sender_id", user_id).limit(200).execute()
    for m in (msgs.data or []):
        d = m["created_at"][:10]
        day_events.setdefault(d, set()).add("message_send")

    for events in day_events.values():
        has_code = "assignment_submit" in events
        has_note = "note_create" in events or "note_analyze" in events
        has_msg = "message_send" in events
        has_tutor = "tutor_chat" in events
        if has_code and has_note and has_msg and has_tutor:
            return True
    return False


def _check_perfect_day(sb, user_id: str) -> bool:
    """Check if any day had assignment_submit + note_analyze + message."""
    logs = sb.table("exp_logs").select("event_type, created_at") \
        .eq("user_id", user_id).execute()
    day_events: dict[str, set] = {}
    for log in (logs.data or []):
        d = log["created_at"][:10]
        day_events.setdefault(d, set()).add(log["event_type"])

    # Also check messages
    msgs = sb.table("messages").select("created_at").eq("sender_id", user_id).limit(100).execute()
    for m in (msgs.data or []):
        d = m["created_at"][:10]
        day_events.setdefault(d, set()).add("message_send")

    for day, events in day_events.items():
        if "assignment_submit" in events and "note_analyze" in events and "message_send" in events:
            return True
    return False


# ── Main check function ──

def check_badges(user_id: str, event: str, context: dict | None = None):
    """Check and award badges triggered by an event. Returns list of newly earned badge defs."""
    from common.supabase_client import get_supabase

    badge_ids = EVENT_BADGES.get(event, [])
    if not badge_ids:
        return []

    sb = get_supabase()

    # Get already earned
    earned_result = sb.table("user_achievements").select("badge_id") \
        .eq("user_id", user_id).execute()
    earned_ids = {b["badge_id"] for b in (earned_result.data or [])}

    # Filter to unearned only
    to_check = [bid for bid in badge_ids if bid not in earned_ids]
    if not to_check:
        return []

    newly_earned = []
    ctx = context or {}

    try:
        for bid in to_check:
            earned = _check_single(bid, user_id, sb, ctx)
            if earned:
                try:
                    sb.table("user_achievements").insert({
                        "user_id": user_id, "badge_id": bid,
                    }).execute()
                    newly_earned.append(BADGE_MAP[bid])
                    logger.info(f"[Badge] user={user_id} earned '{bid}'")
                except Exception:
                    pass  # unique constraint
    except Exception as e:
        logger.error(f"[Badge] check error user={user_id} event={event}: {e}")

    return newly_earned


def _check_single(badge_id: str, user_id: str, sb, ctx: dict) -> bool:
    """Check if a single badge condition is met."""
    try:
        # ── Onboarding ──
        if badge_id == "first_step":
            return True  # login event itself means first step
        if badge_id == "first_classroom":
            e = sb.table("enrollments").select("id", count="exact").eq("student_id", user_id).execute()
            c = sb.table("courses").select("id", count="exact").eq("professor_id", user_id).execute()
            return (e.count or 0) > 0 or (c.count or 0) > 0
        if badge_id in ("first_note_save", "note_1"):
            return _count_notes(sb, user_id) >= 1
        if badge_id in ("first_submit", "submit_1"):
            return _count_submissions(sb, user_id) >= 1
        if badge_id in ("first_analysis", "first_ai", "understanding_first"):
            return _count_analyses(sb, user_id) >= 1

        # ── Notes ──
        if badge_id == "note_5":
            return _count_notes(sb, user_id) >= 5
        if badge_id == "note_20":
            return _count_notes(sb, user_id) >= 20
        if badge_id == "sub_notes":
            return _count_sub_notes(sb, user_id) >= 3

        # ── Submissions ──
        if badge_id == "submit_5":
            return _count_submissions(sb, user_id) >= 5
        if badge_id == "submit_10":
            return _count_submissions(sb, user_id) >= 10
        if badge_id == "submit_30":
            return _count_submissions(sb, user_id) >= 30
        if badge_id == "submit_50":
            return _count_submissions(sb, user_id) >= 50
        if badge_id == "multi_track":
            return _check_multi_track(sb, user_id)

        # ── Scores ──
        if badge_id in ("score_80", "score_90", "score_100", "score_80_10",
                         "score_90_streak3", "comeback", "rising_curve", "high_collector"):
            scores = _get_scores(sb, user_id)
            if badge_id == "score_80":
                return any(s >= 80 for s in scores)
            if badge_id == "score_90":
                return any(s >= 90 for s in scores)
            if badge_id == "score_100":
                return any(s >= 100 for s in scores)
            if badge_id == "score_80_10":
                return sum(1 for s in scores if s >= 80) >= 10
            if badge_id == "high_collector":
                return sum(1 for s in scores if s >= 95) >= 10
            if badge_id == "score_90_streak3":
                streak = 0
                for s in scores:
                    streak = streak + 1 if s >= 90 else 0
                    if streak >= 3:
                        return True
                return False
            if badge_id == "comeback":
                for i in range(1, len(scores)):
                    if scores[i] - scores[i - 1] >= 20:
                        return True
                return False
            if badge_id == "rising_curve":
                for i in range(2, len(scores)):
                    if scores[i] > scores[i - 1] > scores[i - 2]:
                        return True
                return False

        # ── Attendance / Streaks ──
        if badge_id.startswith("streak_"):
            target = int(badge_id.split("_")[1])
            days = _count_exp_log_days(sb, user_id)
            if target == 1:
                return len(days) >= 1
            return _calc_streak(days) >= target
        if badge_id == "weekend_study":
            return _check_weekend_study(sb, user_id)

        # ── AI / Tutor ──
        if badge_id == "analysis_10":
            return _count_analyses(sb, user_id) >= 10
        if badge_id == "analysis_30":
            return _count_analyses(sb, user_id) >= 30
        if badge_id == "tutor_first":
            return _count_tutor_days(sb, user_id) >= 1
        if badge_id == "tutor_10":
            return _count_tutor_days(sb, user_id) >= 10
        if badge_id == "precise_reviser":
            # Check if any note had score increase >= 10 via context
            score_before = ctx.get("score_before")
            score_after = ctx.get("score_after")
            if score_before is not None and score_after is not None:
                return (score_after - score_before) >= 10
            return False

        # ── Social ──
        if badge_id == "first_message":
            return _count_messages(sb, user_id) >= 1
        if badge_id == "chat_5_users":
            return _count_distinct_chat_partners(sb, user_id) >= 5
        if badge_id == "first_comment":
            return _count_comments(sb, user_id) >= 1
        if badge_id == "comment_resolver":
            return _count_resolved_comments(sb, user_id) >= 5
        if badge_id == "social_learner":
            return _count_messages(sb, user_id) >= 5 and _count_comments(sb, user_id) >= 5

        # ── Graph ──
        if badge_id == "first_link":
            return _count_note_links(sb, user_id) >= 1
        if badge_id == "link_10":
            return _count_note_links(sb, user_id) >= 10
        if badge_id == "link_forest":
            return _count_note_links(sb, user_id) >= 30
        if badge_id == "graph_explorer":
            return True  # triggered by graph view event

        # ── Team ──
        if badge_id == "team_join":
            return _has_team(sb, user_id)
        if badge_id == "team_note":
            r = sb.table("note_snapshots").select("id", count="exact").eq("saved_by", user_id).execute()
            return (r.count or 0) >= 1
        if badge_id == "team_builder":
            r = sb.table("teams").select("id", count="exact").eq("created_by", user_id).execute()
            return (r.count or 0) >= 3
        if badge_id == "team_vote":
            return True  # triggered by vote_start event
        if badge_id == "unanimous":
            # Check context for unanimous vote
            return ctx.get("unanimous", False)

        # ── Code execution ──
        if badge_id == "first_pass":
            return ctx.get("passed", 0) >= 1
        if badge_id == "all_pass":
            return ctx.get("passed", 0) > 0 and ctx.get("passed", 0) == ctx.get("total", 0)
        if badge_id == "one_shot":
            # Check if first judge for this assignment got all pass
            return ctx.get("first_attempt", False) and ctx.get("passed", 0) == ctx.get("total", 0)
        if badge_id == "debugger":
            return ctx.get("attempt_count", 0) >= 10 and ctx.get("passed", 0) == ctx.get("total", 0)
        if badge_id == "lang_explorer":
            return _count_languages(sb, user_id) >= 3

        # ── Writing ──
        if badge_id == "first_writing":
            return _count_writing_submissions(sb, user_id) >= 1
        if badge_id == "writing_5":
            return _count_writing_submissions(sb, user_id) >= 5
        if badge_id == "long_writing":
            return ctx.get("long_writing_count", 0) >= 3 or _count_long_writings(sb, user_id) >= 3

        # ── Note extras ──
        if badge_id == "block_master":
            return ctx.get("block_types", 0) >= 5
        if badge_id == "note_architect":
            return ctx.get("block_count", 0) >= 30

        # ── Exam ──
        if badge_id == "first_exam":
            return True  # triggered by exam_start event
        if badge_id == "exam_focus":
            return ctx.get("violation_count", 0) == 0
        if badge_id == "exam_3_clean":
            return _count_clean_exams(sb, user_id) >= 3
        if badge_id == "honest_learner":
            return _count_clean_exams(sb, user_id) >= 5

        # ── Enrollment / Course ──
        if badge_id == "first_course":
            c = sb.table("courses").select("id", count="exact").eq("professor_id", user_id).execute()
            return (c.count or 0) >= 1

        # ── Professor ──
        if badge_id == "curriculum_designer":
            # Check assignments in courses owned by this professor
            courses = sb.table("courses").select("id").eq("professor_id", user_id).execute()
            if not courses.data:
                return False
            cids = [c["id"] for c in courses.data]
            r = sb.table("assignments").select("id", count="exact").in_("course_id", cids).eq("status", "published").execute()
            return (r.count or 0) >= 5
        if badge_id == "feedback_master":
            return ctx.get("finalize_count", 0) >= 10
        if badge_id == "note_reviewer":
            return ctx.get("review_count", 0) >= 10

        # ── Hidden ──
        if badge_id == "perfect_day":
            return _check_perfect_day(sb, user_id)
        if badge_id == "dawn_sage":
            return ctx.get("is_dawn", False)
        if badge_id == "all_rounder":
            return _check_all_rounder(sb, user_id)

    except Exception as e:
        logger.warning(f"[Badge] check '{badge_id}' failed: {e}")

    return False
