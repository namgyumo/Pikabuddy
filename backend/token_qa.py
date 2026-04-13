"""
PikaBuddy Token QA & Cost Simulation
=====================================
각 프롬프트 패턴별 토큰 사용량 측정 + 가상 학생 하루 시뮬레이션 비용 산출

Usage:
    cd backend
    python token_qa.py
"""
import json
import time
import sys
import os

# backend 디렉토리 기준 import
sys.path.insert(0, os.path.dirname(__file__))

from common.gemini_client import get_gemini_model, MODEL_HEAVY, MODEL_LIGHT, PRICING

# ── Pricing ──
def calc_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    p = PRICING.get(model, {"input": 0.30, "output": 2.50})
    return (input_tokens / 1_000_000) * p["input"] + (output_tokens / 1_000_000) * p["output"]


def measure(model_name: str, prompt: str, label: str, json_mode: bool = False) -> dict:
    """단일 프롬프트의 토큰 사용량을 측정한다."""
    model = get_gemini_model(model_name, json_mode=json_mode)
    t0 = time.time()
    resp = model.generate_content(prompt)
    elapsed = time.time() - t0

    meta = resp.usage_metadata
    inp = meta.prompt_token_count or 0
    out = meta.candidates_token_count or 0
    cost = calc_cost(model_name, inp, out)

    return {
        "label": label,
        "model": model_name,
        "input_tokens": inp,
        "output_tokens": out,
        "total_tokens": inp + out,
        "cost_usd": cost,
        "elapsed_sec": round(elapsed, 2),
    }


# ═══════════════════════════════════════════════════════
#  PART B: 프롬프트 패턴별 토큰 QA
# ═══════════════════════════════════════════════════════

def run_prompt_qa() -> list[dict]:
    """각 프롬프트 패턴의 실제 토큰 사용량을 측정한다."""
    results = []

    # 1) 주간 리포트 (MODEL_LIGHT)
    results.append(measure(MODEL_LIGHT, """Write a short weekly study report (3-4 sentences) for a student.

Total notes: 8 (Python basics, loops, functions, OOP, algorithms, data structures, recursion, sorting)
New notes this week: 3 (recursion, sorting, data structures)
Average understanding: 65%
Weakest areas: recursion(35%), data structures(48%), sorting(52%)

Use an encouraging tone and include 1 specific study tip.
IMPORTANT: Write the entire output in Korean.""", "weekly_report"))

    # 2) 노트 AI 도우미 (MODEL_HEAVY)
    results.append(measure(MODEL_HEAVY, """You are a friendly AI study helper. A student asked a question while writing notes.

Rules:
1. Answer ONLY the asked question. Do not analyze or summarize the entire note.
2. Explain the core concept concisely in 2-4 sentences.
3. Provide at most 1 short example if needed.
4. Use Markdown freely (**bold**, - lists, etc.).
5. Answer the question directly without referencing the note context.

[Student note context]
# 파이썬 자료구조
## 리스트
- 순서가 있는 자료형
- append, pop, insert 등의 메서드
## 딕셔너리
- 키-값 쌍으로 저장

Student question: 딕셔너리의 시간복잡도가 어떻게 되나요?

IMPORTANT: Write the entire output in Korean.
Answer:""", "note_ask"))

    # 3) 노트 다듬기 (MODEL_HEAVY)
    results.append(measure(MODEL_HEAVY, """Below is a student's draft note. Improve ONLY the formatting and structure — do NOT change any content.

Tasks (apply all):
1. **Structure**: Use `#` for main topics, `##` for sub-sections, `###` for details.
2. **Lists**: Convert enumerable content to `- bullet` or `1. numbered` lists.
3. **Emphasis**: Bold key concepts with **bold**, use `code` for code/commands/technical terms.
4. Do NOT fix errors, add, or remove any content.

Output rules:
- Output ONLY the Markdown result. No explanations or preamble.
- Do NOT wrap in code blocks (```).
- Keep the output language exactly as the original note (Korean).

--- Original note ---
파이썬에서 반복문은 for와 while이 있다. for문은 range 함수와 자주 쓰인다. 예를 들어 for i in range(10)은 0부터 9까지 반복한다. while은 조건이 참인 동안 반복한다. break는 반복을 중단하고 continue는 다음 반복으로 넘어간다. 중첩 반복문은 반복 안에 반복을 넣는 것이다. 시간복잡도는 O(n^2)가 된다.
--- End ---""", "note_polish"))

    # 4) 노트 갭 분석 (MODEL_HEAVY)
    results.append(measure(MODEL_HEAVY, """You are a friendly study tutor. Analyze the student's note and provide feedback.

Course objectives: ["파이썬 기초 문법 이해", "반복문과 조건문 활용", "함수 작성 능력"]
Student note: # 파이썬 기초
## 변수와 자료형
파이썬에서 변수는 값을 저장하는 공간이다. 정수(int), 실수(float), 문자열(str), 불리언(bool)이 있다.
## 조건문
if, elif, else로 조건 분기를 할 수 있다.
## 반복문
for문과 while문이 있다. for i in range(n)으로 n번 반복.
Code submissions: 3

Use EXACTLY this format:

📊 이해도 점수: [0~100]점 / 100점

📝 종합 평가
(2-3 sentences)

✅ 잘 이해한 부분
(correctly understood concepts)

⚠️ 보완이 필요한 부분
(misunderstood or missing concepts)

💡 학습 추천
(2-3 specific suggestions, numbered)

🏷️ 카테고리
Pick 3-8 matching category slugs from the list below, comma-separated.
Category list: variables, data-types, conditionals, loops, functions, oop, algorithms

Use a warm, encouraging tone. Always mention what the student did well.
IMPORTANT: Write the entire output in Korean.""", "note_analyze"))

    # 5) 튜터 채팅 (MODEL_HEAVY)
    results.append(measure(MODEL_HEAVY, """You are a Socratic AI tutor. Guide the student to discover answers through questions.

Rules:
1. Do not give direct answers — ask thought-provoking questions instead.
2. Ask only ONE question at a time.
3. Match the student's current understanding level.
4. Use a warm, encouraging tone.
5. When the student is stuck, give hints but NEVER provide the solution code.
6. Assess the student's progress by comparing their code against the starter code.

Exception — Pure concept/theory questions:
If the student asks about a concept or term, explain clearly WITHOUT Socratic questioning.

[Current code]
```python
def solution(n, arr):
    # 아직 구현 안 함
    pass
```

Student's question: 이 문제에서 투 포인터를 써야 하나요?

IMPORTANT: Write the entire output in Korean.""", "tutor_chat"))

    # 6) 코드 분석 피드백 (MODEL_HEAVY)
    results.append(measure(MODEL_HEAVY, """You are a friendly coding tutor. Analyze the student's code and provide feedback.

Assignment: 리스트 정렬 구현 / Topic: sorting algorithms
Rubric: {"criteria": [{"name": "정확성", "weight": 40}, {"name": "효율성", "weight": 30}, {"name": "코드 품질", "weight": 30}]}

=== AI Policy ===
Normal mode - Pastes are detected; excessive pasting is a deduction factor.

=== Grading Criteria ===
Normal grading - Balanced grading. Praise strengths but also clearly point out weaknesses.

=== Paste Analysis ===
외부 복붙: 없음

Student submitted code:
```python
def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n-i-1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
    return arr

result = bubble_sort([64, 34, 25, 12, 22, 11, 90])
print(result)
```

Coding snapshots: 12

Write in Markdown. Use ## for sections, ### for subsections, **bold** for keywords, - for lists.

## 🤖 피카버디의 추천 점수는 **[0~100점]점**이에요!
## 📝 종합 피드백
## 🔍 로직 분석
## ✨ 코드 품질
## 📋 복붙 분석
## 💡 개선 제안

IMPORTANT: Write the entire output in Korean.""", "code_analysis"))

    # 7) 대시보드 인사이트 (MODEL_LIGHT)
    results.append(measure(MODEL_LIGHT, """You are an educational data analyst.
Analyze the following class data and provide actionable insights for the professor.

Course: Python Programming Fundamentals
Objectives: ["파이썬 기초 문법", "반복문/조건문", "함수와 모듈"]
Submissions: 87
Average score: 72
Average note understanding: 61

Write each item in Markdown format. Use **bold**, lists (-), and highlight key numbers.
IMPORTANT: Write the entire output in Korean.

JSON format:
{"insights": ["markdown insight1"], "common_struggles": ["markdown struggle1"], "recommendations": ["markdown rec1"]}
""", "dashboard_insights"))

    # 8) 문제 생성 — 아웃라인 (MODEL_HEAVY)
    results.append(measure(MODEL_HEAVY, """You are a programming professor.
Generate a JSON array with only titles and key concepts for 5 problems.
Problems must have progressive difficulty.

Topic: Python lists and dictionaries, Language: python

IMPORTANT: title and key_concept must be in Korean.

Response format (JSON array only):
[{"id": 1, "title": "Problem title", "key_concept": "One-line key concept", "difficulty_level": 3}]""",
        "problem_outline", json_mode=True))

    # 9) 테스트케이스 생성 (MODEL_LIGHT)
    results.append(measure(MODEL_LIGHT, """Generate 8 random test cases for the following algorithm problem.
Create diverse general inputs that do NOT overlap with existing edge cases.

Problem: 두 수의 합
Description: 주어진 배열에서 합이 target이 되는 두 수의 인덱스를 반환하세요.
Input format: 첫 줄에 배열 크기 n, 둘째 줄에 n개의 정수, 셋째 줄에 target
Output format: 두 인덱스를 공백으로 구분
Constraints: 2 <= n <= 10000, -10^9 <= arr[i] <= 10^9

Response format (JSON array only):
[
  {"input": "test input", "expected_output": "expected output", "is_hidden": true}
]

Set all test cases to is_hidden: true. Generate inputs of various sizes within the constraints.""",
        "test_case_gen", json_mode=True))

    # 10) 퀴즈 생성 (MODEL_HEAVY)
    results.append(measure(MODEL_HEAVY, """You are a university professor. Generate 3 quiz problems in JSON.
Progressive difficulty (problem 1 = easiest → last = hardest).

Topic: Python basics | Difficulty: medium
Type distribution: multiple_choice: 1개, short_answer: 1개, essay: 1개

Types to include:
- Multiple choice (4 options, correct_answer is index 0~3)
- Short answer (correct_answer + acceptable_answers array)
- Essay (rubric_criteria array for grading criteria)

IMPORTANT: All text content (questions, options, answers, explanations) must be in Korean.

JSON format:
{
  "problems": [
    {"id": 1, "type": "multiple_choice", "question": "q", "options": ["a","b","c","d"], "correct_answer": 0, "explanation": "e", "points": 10, "difficulty_level": 3}
  ],
  "rubric": {"criteria": [{"name": "정확성", "weight": 60, "description": "d"}]}
}""", "quiz_gen", json_mode=True))

    return results


# ═══════════════════════════════════════════════════════
#  PART C: 가상 학생 하루 시뮬레이션
# ═══════════════════════════════════════════════════════

def simulate_daily_usage(qa_results: list[dict]) -> dict:
    """
    가상 학생 '김피카' 하루 사용 시나리오:

    08:30 - 로그인, 대시보드 확인
    09:00 - 1교시: 과제 확인 (교수가 문제 5개 생성 → 학생 입장에서는 무료)
    09:30 - 코딩 과제 시작, 튜터에 3번 질문
    10:30 - 코드 제출 → AI 분석
    11:00 - 2교시: 노트 작성 중 AI 도우미 2번 질문
    11:30 - 노트 다듬기 1회
    12:00 - 노트 갭 분석 1회
    14:00 - 3교시: 퀴즈 과제 (교수가 퀴즈 5개 생성 → 비용은 교수 측)
    15:00 - 주간 리포트 확인
    """

    # qa_results에서 패턴별 토큰 데이터 가져오기
    by_label = {r["label"]: r for r in qa_results}

    # ── 학생 활동 시나리오 ──
    student_scenario = [
        ("tutor_chat",       3,  "튜터에 질문 3회"),
        ("code_analysis",    1,  "코드 제출 AI 분석 1회"),
        ("note_ask",         2,  "노트 작성 중 질문 2회"),
        ("note_polish",      1,  "노트 다듬기 1회"),
        ("note_analyze",     1,  "노트 갭 분석 1회"),
        ("weekly_report",    1,  "주간 리포트 확인"),
    ]

    # ── 교수 활동 (학생 30명 기준, 한 번 만들면 전체 공유) ──
    professor_scenario = [
        ("problem_outline",    1, "일반 문제 5개 아웃라인 생성"),
        ("test_case_gen",      5, "문제당 랜덤 TC 생성 x5"),
        ("quiz_gen",           1, "퀴즈 3문제 생성"),
        ("dashboard_insights", 1, "대시보드 인사이트"),
    ]

    def calc_scenario(scenario, label_prefix):
        rows = []
        total_inp = 0
        total_out = 0
        total_cost = 0.0
        for label, count, desc in scenario:
            data = by_label.get(label)
            if not data:
                continue
            inp = data["input_tokens"] * count
            out = data["output_tokens"] * count
            cost = data["cost_usd"] * count
            total_inp += inp
            total_out += out
            total_cost += cost
            rows.append({
                "action": desc,
                "model": data["model"],
                "count": count,
                "input_tokens": inp,
                "output_tokens": out,
                "total_tokens": inp + out,
                "cost_usd": round(cost, 6),
            })
        return rows, total_inp, total_out, total_cost

    stu_rows, stu_inp, stu_out, stu_cost = calc_scenario(student_scenario, "student")
    prof_rows, prof_inp, prof_out, prof_cost = calc_scenario(professor_scenario, "professor")

    # ── 스케일링 ──
    students_30 = stu_cost * 30
    students_100 = stu_cost * 100
    prof_daily = prof_cost  # 교수 비용은 학생 수에 무관 (한 번 생성)

    return {
        "student_name": "김피카 (가상 학생)",
        "student_daily": {
            "actions": stu_rows,
            "total_input_tokens": stu_inp,
            "total_output_tokens": stu_out,
            "total_tokens": stu_inp + stu_out,
            "cost_usd": round(stu_cost, 6),
            "cost_krw": round(stu_cost * 1380, 2),  # ~1380 KRW/USD
        },
        "professor_daily": {
            "actions": prof_rows,
            "total_input_tokens": prof_inp,
            "total_output_tokens": prof_out,
            "total_tokens": prof_inp + prof_out,
            "cost_usd": round(prof_cost, 6),
            "cost_krw": round(prof_cost * 1380, 2),
        },
        "scaling": {
            "30_students_daily_usd": round(students_30 + prof_daily, 4),
            "30_students_daily_krw": round((students_30 + prof_daily) * 1380, 0),
            "30_students_monthly_usd": round((students_30 + prof_daily) * 22, 4),  # 22 수업일
            "30_students_monthly_krw": round((students_30 + prof_daily) * 22 * 1380, 0),
            "100_students_daily_usd": round(students_100 + prof_daily, 4),
            "100_students_daily_krw": round((students_100 + prof_daily) * 1380, 0),
            "100_students_monthly_usd": round((students_100 + prof_daily) * 22, 4),
            "100_students_monthly_krw": round((students_100 + prof_daily) * 22 * 1380, 0),
        },
    }


# ═══════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════

def main():
    print("=" * 70)
    print("  PikaBuddy Token QA & Cost Simulation")
    print("=" * 70)

    # ── PART B: 프롬프트별 토큰 측정 ──
    print("\n[PART B] Measuring token usage per prompt pattern...\n")
    qa_results = run_prompt_qa()

    # 테이블 출력
    print(f"{'Pattern':<22} {'Model':<24} {'Input':>7} {'Output':>7} {'Total':>7} {'Cost($)':>10} {'Time':>6}")
    print("-" * 90)
    total_cost = 0.0
    for r in qa_results:
        total_cost += r["cost_usd"]
        print(f"{r['label']:<22} {r['model']:<24} {r['input_tokens']:>7} {r['output_tokens']:>7} {r['total_tokens']:>7} ${r['cost_usd']:<9.6f} {r['elapsed_sec']:>5.1f}s")
    print("-" * 90)
    print(f"{'TOTAL (1 round)':<47} {sum(r['input_tokens'] for r in qa_results):>7} {sum(r['output_tokens'] for r in qa_results):>7} {sum(r['total_tokens'] for r in qa_results):>7} ${total_cost:<9.6f}")

    # ── PART C: 가상 학생 시뮬레이션 ──
    print("\n" + "=" * 70)
    print("[PART C] Virtual Student Daily Simulation")
    print("=" * 70)

    sim = simulate_daily_usage(qa_results)

    print(f"\n--- {sim['student_name']} 하루 사용량 ---")
    print(f"{'Action':<30} {'Model':<24} {'x':>2} {'Input':>7} {'Output':>7} {'Cost($)':>10}")
    print("-" * 85)
    for a in sim["student_daily"]["actions"]:
        print(f"{a['action']:<30} {a['model']:<24} {a['count']:>2} {a['input_tokens']:>7} {a['output_tokens']:>7} ${a['cost_usd']:<9.6f}")
    sd = sim["student_daily"]
    print("-" * 85)
    print(f"{'Student Total':<57} {sd['total_input_tokens']:>7} {sd['total_output_tokens']:>7} ${sd['cost_usd']:<9.6f}")
    print(f"  = {sd['cost_krw']} KRW")

    print(f"\n--- 교수 하루 사용량 (1회성, 학생 수 무관) ---")
    print(f"{'Action':<30} {'Model':<24} {'x':>2} {'Input':>7} {'Output':>7} {'Cost($)':>10}")
    print("-" * 85)
    for a in sim["professor_daily"]["actions"]:
        print(f"{a['action']:<30} {a['model']:<24} {a['count']:>2} {a['input_tokens']:>7} {a['output_tokens']:>7} ${a['cost_usd']:<9.6f}")
    pd = sim["professor_daily"]
    print("-" * 85)
    print(f"{'Professor Total':<57} {pd['total_input_tokens']:>7} {pd['total_output_tokens']:>7} ${pd['cost_usd']:<9.6f}")
    print(f"  = {pd['cost_krw']} KRW")

    # ── 스케일링 ──
    sc = sim["scaling"]
    print("\n" + "=" * 70)
    print("  Cost Projection (daily = per class day, monthly = 22 class days)")
    print("=" * 70)
    print(f"  {'Scale':<35} {'Daily':>14} {'Monthly':>14}")
    print(f"  {'-'*63}")
    print(f"  {'30 students + 1 prof (USD)':<35} ${sc['30_students_daily_usd']:>12.4f} ${sc['30_students_monthly_usd']:>12.4f}")
    print(f"  {'30 students + 1 prof (KRW)':<35} {sc['30_students_daily_krw']:>12,.0f}  {sc['30_students_monthly_krw']:>12,.0f}")
    print(f"  {'100 students + 1 prof (USD)':<35} ${sc['100_students_daily_usd']:>12.4f} ${sc['100_students_monthly_usd']:>12.4f}")
    print(f"  {'100 students + 1 prof (KRW)':<35} {sc['100_students_daily_krw']:>12,.0f}  {sc['100_students_monthly_krw']:>12,.0f}")
    print()

    # JSON 결과 저장
    output = {
        "prompt_qa": qa_results,
        "simulation": sim,
        "pricing_reference": PRICING,
    }
    with open("token_qa_result.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print("Results saved to token_qa_result.json")


if __name__ == "__main__":
    main()
