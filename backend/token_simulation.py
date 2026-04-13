"""
PikaBuddy 시나리오별 토큰 비용 시뮬레이션
==========================================
실제 API 실측 데이터 기반으로 다양한 상황의 비용을 산출한다.

Usage:
    cd backend
    python token_simulation.py
"""
import json

# ═══════════════════════════════════════════════════════
#  실측 토큰 데이터 (token_qa.py + 추가 측정 기반)
# ═══════════════════════════════════════════════════════

# 가격 (USD per 1M tokens)
PRICING = {
    "flash":      {"input": 0.30, "output": 2.50},   # gemini-2.5-flash
    "flash-lite": {"input": 0.10, "output": 0.40},   # gemini-2.5-flash-lite
}

KRW_RATE = 1380  # USD → KRW

# 실측 기반 토큰 프로필 (short = QA 샘플, long = 실제 사용에 가까운 값)
# 각 항목: (model_tier, input_tokens, output_tokens)
TOKEN_PROFILES = {
    # ── 학생 액션 ──
    "tutor_chat_simple":      ("flash",      189,   65),   # 개념 질문 (짧은 답변)
    "tutor_chat_with_code":   ("flash",      120,   61),   # 코드 맥락 + 대화 히스토리 있는 질문
    "tutor_chat_long":        ("flash",      300,  200),   # 긴 문맥, 상세 답변 (추정)
    "code_analysis_short":    ("flash",      365, 1612),   # 짧은 코드 (10줄)
    "code_analysis_long":     ("flash",      501, 1730),   # 긴 코드 (60줄+)
    "writing_analysis":       ("flash",      128,  952),   # 글쓰기 과제 분석 (500자 에세이)
    "note_ask":               ("flash",      175,  102),   # 노트 중 질문
    "note_polish":            ("flash",      263,  158),   # 노트 다듬기
    "note_analyze_short":     ("flash",      299,  527),   # 짧은 노트 분석
    "note_analyze_long":      ("flash",       94, 1212),   # 긴 노트 분석
    "weekly_report":          ("flash-lite", 110,  153),   # 주간 리포트
    "essay_grade":            ("flash",      137,  408),   # 퀴즈 서술형 채점

    # ── 교수 액션 ──
    "problem_outline":        ("flash",       97,  314),   # 문제 아웃라인 N개
    "problem_detail":         ("flash",       64,  613),   # 개별 문제 상세 생성
    "test_case_gen":          ("flash-lite", 183,  494),   # 랜덤 TC 생성 (문제당)
    "quiz_gen":               ("flash",      245,  957),   # 퀴즈 N개 생성
    "writing_prompt_gen":     ("flash",      100,  200),   # 글쓰기 지시문 생성 (추정)
    "dashboard_insights":     ("flash-lite", 141,  629),   # 대시보드 인사이트
}


def cost(tier: str, inp: int, out: int) -> float:
    p = PRICING[tier]
    return (inp / 1_000_000) * p["input"] + (out / 1_000_000) * p["output"]


def action_cost(profile_key: str, count: int = 1) -> dict:
    tier, inp, out = TOKEN_PROFILES[profile_key]
    inp_total = inp * count
    out_total = out * count
    c = cost(tier, inp_total, out_total)
    return {
        "profile": profile_key,
        "tier": tier,
        "count": count,
        "input_tokens": inp_total,
        "output_tokens": out_total,
        "cost_usd": c,
    }


# ═══════════════════════════════════════════════════════
#  시나리오 정의
# ═══════════════════════════════════════════════════════

SCENARIOS = {
    # ──────────────────────────────────────────────
    # 시나리오 1: 평상시 수업일
    # ──────────────────────────────────────────────
    "weekday_normal": {
        "name": "평상시 수업일",
        "description": "일반적인 수업이 있는 평일. 학생은 수업 듣고 과제 1개 수행.",
        "env": {
            "student_count": 30,
            "active_rate": 0.7,          # 70%만 실제 접속
            "study_hours": 1.5,          # 평균 사용 시간
            "courses": 1,               # 하루 수업 수
            "retry_rate": 1.1,           # 10% 재시도 오버헤드
        },
        "student_actions": [
            # (profile_key, count, description)
            ("tutor_chat_simple",    2,  "튜터 질문 2회 (개념 질문)"),
            ("code_analysis_short",  1,  "코드 제출 분석 1회 (짧은 코드)"),
            ("note_ask",             1,  "노트 중 질문 1회"),
            ("note_analyze_short",   1,  "노트 분석 1회"),
        ],
        "professor_actions": [
            ("problem_outline",      1,  "문제 아웃라인 5개 생성"),
            ("problem_detail",       5,  "문제 상세 5개 병렬 생성"),
            ("test_case_gen",        5,  "랜덤 TC 5문제분 생성"),
            ("dashboard_insights",   1,  "대시보드 확인"),
        ],
    },

    # ──────────────────────────────────────────────
    # 시나리오 2: 과제 마감일
    # ──────────────────────────────────────────────
    "assignment_deadline": {
        "name": "과제 마감일",
        "description": "과제 마감 당일. 학생들이 몰려서 튜터 질문과 코드 제출이 급증.",
        "env": {
            "student_count": 30,
            "active_rate": 0.95,         # 95% 접속 (마감일이라)
            "study_hours": 3.0,          # 마감 직전 집중
            "courses": 1,
            "retry_rate": 1.2,           # 트래픽 몰림 → 503 재시도 20%
        },
        "student_actions": [
            ("tutor_chat_with_code", 5,  "튜터 질문 5회 (코드 맥락 포함)"),
            ("tutor_chat_simple",    3,  "튜터 개념 질문 3회"),
            ("code_analysis_long",   2,  "코드 제출 분석 2회 (긴 코드, 재제출)"),
            ("note_ask",             2,  "노트 중 질문 2회"),
            ("note_polish",          1,  "노트 다듬기 1회"),
            ("note_analyze_short",   1,  "노트 분석 1회"),
        ],
        "professor_actions": [
            ("dashboard_insights",   2,  "대시보드 확인 2회 (제출 현황 모니터링)"),
        ],
    },

    # ──────────────────────────────────────────────
    # 시나리오 3: 시험 기간 (5시간 집중 학습)
    # ──────────────────────────────────────────────
    "exam_period": {
        "name": "시험 기간 (5시간 집중 학습)",
        "description": "중간/기말고사 1주 전. 모든 학생이 평균 5시간 PikaBuddy로 복습.",
        "env": {
            "student_count": 30,
            "active_rate": 1.0,          # 전원 접속
            "study_hours": 5.0,          # 5시간 집중
            "courses": 3,               # 3과목 시험 대비
            "retry_rate": 1.3,           # 동시 접속 폭증 → 503 빈번 30%
        },
        "student_actions": [
            # 5시간 동안 3과목 복습
            ("tutor_chat_with_code", 8,  "튜터 코드 질문 8회 (3과목)"),
            ("tutor_chat_simple",   12,  "튜터 개념 질문 12회 (시험 범위 복습)"),
            ("note_ask",             6,  "노트 중 질문 6회"),
            ("note_analyze_long",    3,  "노트 심층 분석 3회 (과목별 1회)"),
            ("note_polish",          2,  "노트 다듬기 2회"),
            ("weekly_report",        3,  "주간 리포트 3과목 확인"),
        ],
        "professor_actions": [
            # 시험 출제
            ("quiz_gen",             3,  "퀴즈/시험 문제 생성 3과목"),
            ("problem_outline",      2,  "코딩 시험 문제 아웃라인"),
            ("problem_detail",      10,  "코딩 시험 문제 상세 10개"),
            ("test_case_gen",       10,  "시험 문제 TC 10개분"),
            ("dashboard_insights",   3,  "대시보드 3과목 확인"),
        ],
    },

    # ──────────────────────────────────────────────
    # 시나리오 4: 시험 당일 (실시간 시험)
    # ──────────────────────────────────────────────
    "exam_day": {
        "name": "시험 당일",
        "description": "온라인 코딩 시험. 학생 전원이 2시간 동안 시험 + AI 채점.",
        "env": {
            "student_count": 30,
            "active_rate": 1.0,          # 전원 응시
            "study_hours": 2.0,          # 시험 시간
            "courses": 1,
            "retry_rate": 1.15,          # 약간의 재시도
        },
        "student_actions": [
            # 시험 중에는 튜터 사용 불가 (exam mode)
            # AI는 채점에만 사용
            ("code_analysis_long",   3,  "코딩 문제 3개 AI 채점"),
            ("essay_grade",          2,  "서술형 문제 2개 AI 채점"),
        ],
        "professor_actions": [
            ("dashboard_insights",   1,  "시험 후 대시보드 확인"),
        ],
    },

    # ──────────────────────────────────────────────
    # 시나리오 5: 대규모 강의
    # ──────────────────────────────────────────────
    "large_class": {
        "name": "대규모 강의 (100명)",
        "description": "수강생 100명인 교양 프로그래밍 수업. 평상시 수업일.",
        "env": {
            "student_count": 100,
            "active_rate": 0.6,          # 60% 접속 (교양이라 낮음)
            "study_hours": 1.0,
            "courses": 1,
            "retry_rate": 1.15,
        },
        "student_actions": [
            ("tutor_chat_simple",    2,  "튜터 질문 2회"),
            ("code_analysis_short",  1,  "코드 제출 분석 1회"),
            ("note_ask",             1,  "노트 질문 1회"),
        ],
        "professor_actions": [
            ("problem_outline",      1,  "문제 아웃라인"),
            ("problem_detail",       5,  "문제 상세 5개"),
            ("test_case_gen",        5,  "TC 5문제분"),
            ("dashboard_insights",   1,  "대시보드"),
        ],
    },

    # ──────────────────────────────────────────────
    # 시나리오 6: 글쓰기 과제 수업
    # ──────────────────────────────────────────────
    "writing_class": {
        "name": "글쓰기 과제 수업",
        "description": "코딩이 아닌 서술형/글쓰기 위주 과제. 에세이 제출 + AI 피드백.",
        "env": {
            "student_count": 30,
            "active_rate": 0.8,
            "study_hours": 2.0,
            "courses": 1,
            "retry_rate": 1.1,
        },
        "student_actions": [
            ("tutor_chat_simple",    3,  "튜터 질문 3회 (개념)"),
            ("writing_analysis",     1,  "글쓰기 과제 AI 분석"),
            ("note_ask",             2,  "노트 질문 2회"),
            ("note_polish",          2,  "노트 다듬기 2회"),
            ("note_analyze_short",   1,  "노트 분석 1회"),
        ],
        "professor_actions": [
            ("writing_prompt_gen",   1,  "글쓰기 지시문 생성"),
            ("dashboard_insights",   1,  "대시보드 확인"),
        ],
    },

    # ──────────────────────────────────────────────
    # 시나리오 7: 주말 자율 학습
    # ──────────────────────────────────────────────
    "weekend_study": {
        "name": "주말 자율 학습",
        "description": "주말에 자발적으로 접속하는 학생들. 소수만 접속하지만 오래 사용.",
        "env": {
            "student_count": 30,
            "active_rate": 0.25,         # 25%만 접속
            "study_hours": 3.0,          # 접속한 학생은 오래 사용
            "courses": 2,
            "retry_rate": 1.05,          # 트래픽 적어 재시도 거의 없음
        },
        "student_actions": [
            ("tutor_chat_with_code", 4,  "튜터 코드 질문 4회"),
            ("tutor_chat_simple",    4,  "튜터 개념 질문 4회"),
            ("code_analysis_short",  2,  "코드 제출 분석 2회"),
            ("note_ask",             3,  "노트 질문 3회"),
            ("note_polish",          1,  "노트 다듬기"),
            ("note_analyze_short",   2,  "노트 분석 2회"),
            ("weekly_report",        2,  "주간 리포트 2과목"),
        ],
        "professor_actions": [
            # 교수는 주말에 미접속
        ],
    },
}


# ═══════════════════════════════════════════════════════
#  시뮬레이션 실행
# ═══════════════════════════════════════════════════════

def run_scenario(scenario: dict) -> dict:
    env = scenario["env"]
    active_students = int(env["student_count"] * env["active_rate"])
    retry = env["retry_rate"]

    # 학생 비용
    student_actions = []
    student_total = 0.0
    for profile, count, desc in scenario["student_actions"]:
        a = action_cost(profile, count)
        a["description"] = desc
        a["cost_usd"] *= retry  # 재시도 오버헤드 적용
        student_actions.append(a)
        student_total += a["cost_usd"]

    # 교수 비용
    prof_actions = []
    prof_total = 0.0
    for profile, count, desc in scenario["professor_actions"]:
        a = action_cost(profile, count)
        a["description"] = desc
        a["cost_usd"] *= retry
        prof_actions.append(a)
        prof_total += a["cost_usd"]

    # 합계
    daily_total = student_total * active_students + prof_total

    return {
        "name": scenario["name"],
        "description": scenario["description"],
        "env": env,
        "active_students": active_students,
        "per_student": {
            "actions": student_actions,
            "cost_usd": round(student_total, 8),
            "cost_krw": round(student_total * KRW_RATE, 2),
        },
        "professor": {
            "actions": prof_actions,
            "cost_usd": round(prof_total, 8),
            "cost_krw": round(prof_total * KRW_RATE, 2),
        },
        "daily_total": {
            "cost_usd": round(daily_total, 6),
            "cost_krw": round(daily_total * KRW_RATE, 0),
        },
    }


def print_scenario(result: dict):
    env = result["env"]
    print(f"\n{'='*80}")
    print(f"  {result['name']}")
    print(f"  {result['description']}")
    print(f"{'='*80}")
    print(f"  환경 변수:")
    print(f"    - 수강생: {env['student_count']}명")
    print(f"    - 접속률: {env['active_rate']*100:.0f}% → 실접속: {result['active_students']}명")
    print(f"    - 평균 사용 시간: {env['study_hours']}시간")
    print(f"    - 수업/과목 수: {env['courses']}개")
    print(f"    - 503 재시도 배율: x{env['retry_rate']}")
    print()

    # 학생 액션
    print(f"  [학생 1인 액션]")
    print(f"  {'Action':<35} {'Tier':<12} {'x':>3} {'In':>6} {'Out':>6} {'Cost':>12}")
    print(f"  {'-'*78}")
    for a in result["per_student"]["actions"]:
        print(f"  {a['description']:<35} {a['tier']:<12} {a['count']:>3} {a['input_tokens']:>6} {a['output_tokens']:>6} ${a['cost_usd']:.6f}")
    ps = result["per_student"]
    print(f"  {'-'*78}")
    print(f"  {'학생 1인 합계':<50} ${ps['cost_usd']:.6f} = {ps['cost_krw']:.1f}원")

    # 교수 액션
    if result["professor"]["actions"]:
        print(f"\n  [교수 액션 (1회성)]")
        print(f"  {'Action':<35} {'Tier':<12} {'x':>3} {'In':>6} {'Out':>6} {'Cost':>12}")
        print(f"  {'-'*78}")
        for a in result["professor"]["actions"]:
            print(f"  {a['description']:<35} {a['tier']:<12} {a['count']:>3} {a['input_tokens']:>6} {a['output_tokens']:>6} ${a['cost_usd']:.6f}")
        pp = result["professor"]
        print(f"  {'-'*78}")
        print(f"  {'교수 합계':<50} ${pp['cost_usd']:.6f} = {pp['cost_krw']:.1f}원")

    # 일일 합계
    dt = result["daily_total"]
    print(f"\n  ┌─────────────────────────────────────────────────┐")
    print(f"  │ 일일 합계: ${dt['cost_usd']:.6f} = {dt['cost_krw']:.0f}원              │")
    print(f"  │ (학생 {result['active_students']}명 x ${ps['cost_usd']:.6f} + 교수 ${result['professor']['cost_usd']:.6f})│")
    print(f"  └─────────────────────────────────────────────────┘")


def main():
    print("=" * 80)
    print("  PikaBuddy 시나리오별 토큰 비용 시뮬레이션")
    print("  실측 데이터 기반 | Gemini 2.5 Flash + Flash-Lite")
    print("=" * 80)

    all_results = {}
    for key, scenario in SCENARIOS.items():
        result = run_scenario(scenario)
        all_results[key] = result
        print_scenario(result)

    # ── 월간 종합 ──
    print("\n" + "=" * 80)
    print("  월간 비용 종합표 (한 달 = 4주 기준)")
    print("=" * 80)

    # 한 달 구성: 평상시 12일 + 과제마감 4일 + 주말자율 8일 = 24일
    # 시험기간 월: 평상시 6일 + 과제마감 2일 + 시험공부 4일 + 시험당일 2일 + 주말 4일 + 글쓰기 2일 = 20일
    month_normal = {
        "name": "일반 월 (30명 강의 1개)",
        "composition": [
            ("weekday_normal",       12, "평상시 수업일 x12"),
            ("assignment_deadline",   4, "과제 마감일 x4"),
            ("writing_class",         2, "글쓰기 수업 x2"),
            ("weekend_study",         8, "주말 자율학습 x8"),
        ],
    }
    month_exam = {
        "name": "시험 기간 월 (30명 강의 1개)",
        "composition": [
            ("weekday_normal",        6, "평상시 수업일 x6"),
            ("assignment_deadline",   2, "과제 마감일 x2"),
            ("exam_period",           4, "시험 대비 학습 x4"),
            ("exam_day",              2, "시험 당일 x2"),
            ("weekend_study",         4, "주말 자율학습 x4"),
            ("writing_class",         2, "글쓰기 수업 x2"),
        ],
    }
    month_large = {
        "name": "대규모 강의 월 (100명)",
        "composition": [
            ("large_class",          16, "수업일 x16"),
            ("weekend_study",         8, "주말 자율 x8 (active_rate 25%)"),
        ],
    }

    for month in [month_normal, month_exam, month_large]:
        total_usd = 0.0
        print(f"\n  --- {month['name']} ---")
        print(f"  {'Day Type':<35} {'Days':>5} {'Daily($)':>12} {'Subtotal($)':>14}")
        print(f"  {'-'*70}")
        for scenario_key, days, desc in month["composition"]:
            daily = all_results[scenario_key]["daily_total"]["cost_usd"]
            subtotal = daily * days
            total_usd += subtotal
            print(f"  {desc:<35} {days:>5} ${daily:>10.4f} ${subtotal:>12.4f}")
        print(f"  {'-'*70}")
        print(f"  {'TOTAL':<41} ${total_usd:>12.4f} = {total_usd * KRW_RATE:,.0f}원")

    # ── 연간 추산 ──
    print(f"\n{'='*80}")
    print(f"  연간 비용 추산 (2학기 = 8개월)")
    print(f"{'='*80}")

    # 1학기 = 일반월 3개 + 시험월 1개 = 4개월
    normal_monthly = sum(all_results[k]["daily_total"]["cost_usd"] * d for k, d, _ in month_normal["composition"])
    exam_monthly = sum(all_results[k]["daily_total"]["cost_usd"] * d for k, d, _ in month_exam["composition"])
    large_monthly = sum(all_results[k]["daily_total"]["cost_usd"] * d for k, d, _ in month_large["composition"])

    sem_30 = normal_monthly * 3 + exam_monthly * 1  # 1학기
    year_30 = sem_30 * 2
    year_100 = large_monthly * 8

    print(f"  30명 강의 1개  - 학기: ${sem_30:.2f} ({sem_30*KRW_RATE:,.0f}원) | 연간: ${year_30:.2f} ({year_30*KRW_RATE:,.0f}원)")
    print(f"  100명 강의 1개 - 연간: ${year_100:.2f} ({year_100*KRW_RATE:,.0f}원)")
    print(f"  30명 x 5강의   - 연간: ${year_30*5:.2f} ({year_30*5*KRW_RATE:,.0f}원)")
    print(f"  100명 x 3강의  - 연간: ${year_100*3:.2f} ({year_100*3*KRW_RATE:,.0f}원)")
    print()

    # JSON 저장
    output = {
        "scenarios": {k: {
            "name": v["name"],
            "env": v["env"],
            "active_students": v["active_students"],
            "per_student_cost_usd": v["per_student"]["cost_usd"],
            "professor_cost_usd": v["professor"]["cost_usd"],
            "daily_total_usd": v["daily_total"]["cost_usd"],
            "daily_total_krw": v["daily_total"]["cost_krw"],
        } for k, v in all_results.items()},
        "monthly": {
            "normal_30": {"usd": round(normal_monthly, 4), "krw": round(normal_monthly * KRW_RATE)},
            "exam_30":   {"usd": round(exam_monthly, 4), "krw": round(exam_monthly * KRW_RATE)},
            "large_100": {"usd": round(large_monthly, 4), "krw": round(large_monthly * KRW_RATE)},
        },
        "annual": {
            "30_students_1_class":   {"usd": round(year_30, 2), "krw": round(year_30 * KRW_RATE)},
            "100_students_1_class":  {"usd": round(year_100, 2), "krw": round(year_100 * KRW_RATE)},
            "30_students_5_classes": {"usd": round(year_30*5, 2), "krw": round(year_30*5 * KRW_RATE)},
            "100_students_3_classes":{"usd": round(year_100*3, 2), "krw": round(year_100*3 * KRW_RATE)},
        },
        "token_profiles": {k: {"tier": v[0], "input": v[1], "output": v[2]} for k, v in TOKEN_PROFILES.items()},
        "pricing_per_1m_tokens": PRICING,
    }
    with open("token_simulation_result.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print("Results saved to token_simulation_result.json")


if __name__ == "__main__":
    main()
