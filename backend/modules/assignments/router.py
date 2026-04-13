import asyncio
import json
import logging
import re
import time
import traceback
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from common.supabase_client import get_supabase
from common.gemini_client import get_gemini_model, FALLBACK_MODELS, MODEL_LIGHT
from google.generativeai.types import RequestOptions
from middleware.auth import get_current_user, require_professor_or_personal, verify_course_ownership


def _extract_json(text: str) -> dict | list:
    """Gemini 응답에서 JSON을 안전하게 추출한다. 코드블록, 불필요 텍스트 등을 처리."""
    if not text or not text.strip():
        raise json.JSONDecodeError("Empty response from AI", "", 0)
    text = text.strip()
    # 코드블록 제거
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    # 이미 유효한 JSON이면 바로 반환
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # JSON 객체/배열 패턴 찾기
    for pattern in [r'\{[\s\S]*\}', r'\[[\s\S]*\]']:
        match = re.search(pattern, text)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                continue
    raise json.JSONDecodeError("No valid JSON found", text[:200], 0)


def _is_retriable_error(err_str: str) -> bool:
    """폴백 대상이 되는 에러인지 판별한다."""
    retriable = ["503", "429", "overloaded", "quota", "rate limit", "resource exhausted", "unavailable"]
    lower = err_str.lower()
    return any(code in lower for code in retriable)


def _generate_with_retry(generate_fn, *args, max_retries: int = 3) -> dict:
    """Gemini 생성 함수를 재시도 로직으로 감싼다. 실패 시 폴백 모델 순차 시도."""
    fn_name = generate_fn.__name__
    last_error = None

    for model_name in FALLBACK_MODELS:
        for attempt in range(max_retries):
            try:
                t0 = time.time()
                result = generate_fn(*args, _model_name=model_name)
                elapsed = time.time() - t0
                print(f"  ✓ {fn_name} 완료 ({elapsed:.1f}초, {model_name})")
                return result
            except Exception as e:
                elapsed = time.time() - t0
                last_error = e
                err_str = str(e)
                print(f"  ✗ {fn_name} [{model_name}] 시도 {attempt + 1}/{max_retries} 실패 ({elapsed:.1f}초): {e}")
                # 504/서버 타임아웃은 재시도해도 같은 결과 → 즉시 다음 모델로
                if "504" in err_str or "timed out" in err_str.lower():
                    print(f"  ⏹ 서버 타임아웃 — 다음 모델로 전환...")
                    break
                if attempt < max_retries - 1:
                    if _is_retriable_error(err_str):
                        wait = 2 * (attempt + 1)
                        print(f"  ⏳ 재시도 가능 에러 — {wait}초 대기...")
                        time.sleep(wait)
                    else:
                        time.sleep(1)
        # 이 모델 전부 실패 → retriable 에러면 다음 폴백 모델로
        if last_error and _is_retriable_error(str(last_error)):
            print(f"  🔄 {model_name} 실패 → 다음 모델로 전환...")
            continue
        # non-retriable도 다음 모델 시도 (모델 이름 오류 등 대비)
        if last_error:
            err_lower = str(last_error).lower()
            if "not found" in err_lower or "invalid" in err_lower or "404" in err_lower:
                print(f"  🔄 {model_name} 모델 사용 불가 → 다음 모델로 전환...")
                continue
            break
        break

    raise last_error

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/courses/{course_id}/assignments", tags=["과제"])

_COUNT_FIELD_MAX = 30


class AssignmentCreateRequest(BaseModel):
    title: str
    topic: str
    type: str = "coding"  # coding / writing / both / quiz
    difficulty: str = "medium"  # easy / medium / hard
    problem_count: int = 5
    baekjoon_count: int = 0  # 표준 입출력형 알고리즘 문제 수
    programmers_count: int = 0  # 함수 구현형 알고리즘 문제 수
    quiz_count: int = 0  # 퀴즈 문제 수 (총합, 레거시 호환)
    block_count: int = 0  # 블록 코딩 문제 수
    quiz_types: list[str] = []  # ["multiple_choice", "short_answer", "essay"]
    mc_count: int = 0  # 객관식 문제 수
    sa_count: int = 0  # 주관식 문제 수
    essay_count: int = 0  # 서술형 문제 수
    ai_policy: str = "normal"  # free / normal / strict / exam
    language: str = "python"
    writing_prompt: str | None = None  # 글쓰기 지시문
    due_date: str | None = None  # ISO 8601
    grading_strictness: str = "normal"  # mild / normal / strict
    grading_note: str | None = None  # 교수 유의사항
    is_team_assignment: bool = False  # 조별과제 여부

    @field_validator(
        "problem_count", "quiz_count", "mc_count", "sa_count",
        "essay_count", "baekjoon_count", "programmers_count", "block_count",
    )
    @classmethod
    def validate_count_range(cls, v, info):
        if info.field_name == "problem_count":
            if v < 1 or v > _COUNT_FIELD_MAX:
                raise ValueError(f"problem_count는 1~{_COUNT_FIELD_MAX} 범위여야 합니다.")
        else:
            if v < 0 or v > _COUNT_FIELD_MAX:
                raise ValueError(f"{info.field_name}은(는) 0~{_COUNT_FIELD_MAX} 범위여야 합니다.")
        return v


class PolicyUpdateRequest(BaseModel):
    ai_policy: str


class ProblemAddRequest(BaseModel):
    title: str
    description: str
    starter_code: str = ""
    expected_output: str = ""
    hints: list[str] = []
    format: str = "regular"  # regular / baekjoon / programmers
    # Algorithm fields (baekjoon / programmers)
    input_description: str | None = None
    output_description: str | None = None
    constraints: str | None = None
    time_limit_ms: int = 1000
    memory_limit_mb: int = 256
    examples: list[dict] | None = None
    test_cases: list[dict] | None = None
    # Programmers-specific
    function_name: str | None = None
    parameters: list[dict] | None = None
    return_type: str | None = None
    return_description: str | None = None


class ProblemUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    starter_code: str | None = None
    expected_output: str | None = None
    hints: list[str] | None = None


class WritingPromptUpdateRequest(BaseModel):
    writing_prompt: str


class AssignmentUpdateRequest(BaseModel):
    title: str | None = None
    topic: str | None = None
    due_date: str | None = None
    language: str | None = None
    show_score_to_student: bool | None = None
    grading_strictness: str | None = None
    grading_note: str | None = None
    rubric: dict | None = None


def _generate_writing_prompt(topic: str, difficulty: str) -> str:
    """Gemini로 글쓰기 지시문을 생성한다."""
    model = get_gemini_model()
    prompt = f"""You are a university professor. Create a writing assignment prompt for the following topic.
Topic: {topic}
Difficulty: {difficulty}

Include clear writing direction, length guide (minimum character count), and grading criteria.
Write 3-5 sentences. Output plain text only, no JSON.
IMPORTANT: Write the entire output in Korean."""
    response = model.generate_content(prompt, request_options=RequestOptions(timeout=60))
    return (response.text or "").strip()


def _generate_bulk_test_cases_baekjoon(problem: dict) -> list[dict]:
    """Flash Lite로 표준 입출력형 문제의 랜덤 테스트케이스를 추가 생성한다."""
    model = get_gemini_model(model_name=MODEL_LIGHT, json_mode=True)
    prompt = f"""Generate 8 random test cases for the following algorithm problem.
Create diverse general inputs that do NOT overlap with existing edge cases.

Problem: {problem.get('title', '')}
Description: {problem.get('description', '')[:300]}
Input format: {problem.get('input_description', '')}
Output format: {problem.get('output_description', '')}
Constraints: {problem.get('constraints', '')}

Response format (JSON array only):
[
  {{"input": "test input", "expected_output": "expected output", "is_hidden": true}}
]

Set all test cases to is_hidden: true. Generate inputs of various sizes within the constraints."""

    response = model.generate_content(prompt, request_options=RequestOptions(timeout=60))
    cases = _extract_json(response.text or "")
    if isinstance(cases, dict):
        cases = cases.get("test_cases", cases.get("cases", []))
    return cases if isinstance(cases, list) else []


def _generate_bulk_test_cases_programmers(problem: dict) -> list[dict]:
    """Flash Lite로 함수 구현형 문제의 랜덤 테스트케이스를 추가 생성한다."""
    model = get_gemini_model(model_name=MODEL_LIGHT, json_mode=True)
    params_desc = ", ".join(f"{p['name']}: {p.get('type','')}" for p in problem.get("parameters", []))
    prompt = f"""Generate 8 random test cases for the following function-based algorithm problem.
Create diverse general inputs that do NOT overlap with existing edge cases.

Problem: {problem.get('title', '')}
Description: {problem.get('description', '')[:300]}
Function signature: {problem.get('function_name', 'solution')}({params_desc}) -> {problem.get('return_type', '')}
Constraints: {problem.get('constraints', '')}

Response format (JSON array only):
[
  {{"input": {{"param1": value1, "param2": value2}}, "expected_output": value, "is_hidden": true}}
]

Set all test cases to is_hidden: true. Generate inputs of various sizes within the constraints."""

    response = model.generate_content(prompt, request_options=RequestOptions(timeout=60))
    cases = _extract_json(response.text or "")
    if isinstance(cases, dict):
        cases = cases.get("test_cases", cases.get("cases", []))
    return cases if isinstance(cases, list) else []


def _generate_algorithm_problems(topic: str, difficulty: str, count: int, language: str, _model_name: str = "gemini-2.5-flash") -> dict:
    """Gemini로 표준 입출력형 알고리즘 문제를 생성한다. (엣지 케이스만 flash, 랜덤은 lite)"""
    model = get_gemini_model(_model_name, json_mode=True)
    prompt = f"""Generate {count} standard I/O (Baekjoon-style) algorithm problems in JSON.
Progressive difficulty (problem 1 = easiest → last = hardest).

Topic: {topic} | Difficulty: {difficulty} | Language: {language}

Rules: starter_code="" (empty string), student writes entire code. Only 3 edge test cases (1 public + 2 hidden).
IMPORTANT: All text content (title, description, hints, etc.) must be written in Korean.

JSON format:
{{"problems":[{{"id":1,"title":"","description":"markdown","input_description":"","output_description":"","constraints":"","examples":[{{"input":"","output":"","explanation":""}}],"test_cases":[{{"input":"","expected_output":"","is_hidden":false}}],"time_limit_ms":1000,"memory_limit_mb":256,"difficulty_level":3,"tags":[],"starter_code":"","hints":[]}}],"rubric":{{"criteria":[{{"name":"정확성","weight":50,"description":"테스트케이스 통과"}},{{"name":"효율성","weight":30,"description":"복잡도 최적화"}},{{"name":"코드 품질","weight":20,"description":"가독성"}}]}}}}"""

    response = model.generate_content(prompt, request_options=RequestOptions(timeout=60))
    result = _extract_json(response.text or "")

    problems = result.get("problems", [])
    for p in problems:
        p["format"] = "baekjoon"
        p["starter_code"] = ""

    # Flash Lite로 랜덤 테스트케이스 병렬 생성
    if problems:
        t0 = time.time()
        def _add_bulk_baekjoon(p):
            try:
                bulk_cases = _generate_bulk_test_cases_baekjoon(p)
                existing = p.get("test_cases", [])
                p["test_cases"] = existing + bulk_cases
                print(f"    + 표준 입출력 랜덤TC: {p.get('title','?')} ({len(bulk_cases)}개)")
            except Exception as e:
                print(f"    ✗ 표준 입출력 랜덤TC 실패: {p.get('title','?')} — {e}")

        with ThreadPoolExecutor(max_workers=min(len(problems), 10)) as executor:
            list(executor.map(_add_bulk_baekjoon, problems))
        print(f"  ✓ 표준 입출력 랜덤TC 전체 완료 ({time.time()-t0:.1f}초, {len(problems)}개 문제)")

    return result


def _generate_programmers_problems(topic: str, difficulty: str, count: int, language: str, _model_name: str = "gemini-2.5-flash") -> dict:
    """Gemini로 함수 구현형 문제를 생성한다. (엣지 케이스만 flash, 랜덤은 lite)"""
    model = get_gemini_model(_model_name, json_mode=True)

    prompt = f"""You are a function-based (Programmers-style) algorithm problem creator.
Generate {count} function-based algorithm problems in JSON with progressive difficulty.

Topic: {topic}
Base difficulty: {difficulty}
Language: {language}

★ Function-based core rules:
1. starter_code must include the full code structure (imports, I/O handling, helpers).
2. Only leave the core solution function body empty (pass or return 0).
3. Student fills in only the solution function body.
4. Input via function parameters, output via return value.

★ Test case requirements:
- Exactly 3 edge test cases per problem (1 public + 2 hidden).
- Must be extreme edge cases:
  * Minimum inputs (n=0, n=1, empty array, etc.)
  * Zero or no-answer cases (-1 return, etc.)
  * Special cases (all elements same, negatives only, sorted input, etc.)
- Random test cases will be generated separately. Only create edges here.

★ Exception handling:
- Problem description must specify edge case behavior (empty input, no answer, etc.).

IMPORTANT: All text content (title, description, hints, explanations, tags) must be in Korean.

Response format (JSON only):
{{
  "problems": [
    {{
      "id": 1,
      "title": "Problem title",
      "description": "Problem description (markdown). Include exception cases and return values",
      "function_name": "solution",
      "parameters": [
        {{"name": "n", "type": "int", "description": "array size"}},
        {{"name": "arr", "type": "list[int]", "description": "integer array"}}
      ],
      "return_type": "int",
      "return_description": "Result description. Specify exception returns like -1",
      "constraints": "Constraints (e.g., 0 <= n <= 100000, -10^9 <= arr[i] <= 10^9)",
      "examples": [
        {{
          "input": {{"n": 5, "arr": [1,2,3,4,5]}},
          "output": 15,
          "explanation": "Sum of all elements"
        }}
      ],
      "test_cases": [
        {{"input": {{"n": 0, "arr": []}}, "expected_output": 0, "is_hidden": false}},
        {{"input": {{"n": 1, "arr": [-5]}}, "expected_output": -5, "is_hidden": true}},
        {{"input": {{"n": 3, "arr": [7,7,7]}}, "expected_output": 21, "is_hidden": true}}
      ],
      "time_limit_ms": 1000,
      "memory_limit_mb": 256,
      "difficulty_level": 3,
      "tags": ["tag1"],
      "starter_code": "Full code structure (solution function body left empty)",
      "hints": ["hint1"]
    }}
  ],
  "rubric": {{
    "criteria": [
      {{"name": "정확성", "weight": 40, "description": "모든 테스트케이스 통과 (엣지케이스 포함)"}},
      {{"name": "예외 처리", "weight": 20, "description": "예외 상황을 올바르게 처리"}},
      {{"name": "효율성", "weight": 25, "description": "시간/공간 복잡도 최적화"}},
      {{"name": "코드 품질", "weight": 15, "description": "가독성과 구조"}}
    ]
  }}
}}

starter_code must be in {language}, providing the full code scaffold with only the solution function body left empty.
Difficulty level scale: 1 (very easy) ~ 10 (very hard)."""

    response = model.generate_content(prompt, request_options=RequestOptions(timeout=60))
    result = _extract_json(response.text or "")

    problems = result.get("problems", [])
    for p in problems:
        p["format"] = "programmers"

    # Flash Lite로 랜덤 테스트케이스 병렬 생성
    if problems:
        t0 = time.time()
        def _add_bulk_programmers(p):
            try:
                bulk_cases = _generate_bulk_test_cases_programmers(p)
                existing = p.get("test_cases", [])
                p["test_cases"] = existing + bulk_cases
                print(f"    + PG 랜덤TC: {p.get('title','?')} ({len(bulk_cases)}개)")
            except Exception as e:
                print(f"    ✗ PG 랜덤TC 실패: {p.get('title','?')} — {e}")

        with ThreadPoolExecutor(max_workers=min(len(problems), 10)) as executor:
            list(executor.map(_add_bulk_programmers, problems))
        print(f"  ✓ PG 랜덤TC 전체 완료 ({time.time()-t0:.1f}초, {len(problems)}개 문제)")

    return result


def _generate_quiz_problems(
    topic: str, difficulty: str, count: int, quiz_types: list[str],
    mc_count: int = 0, sa_count: int = 0, essay_count: int = 0,
    _model_name: str = "gemini-2.5-flash",
) -> dict:
    """Gemini로 퀴즈 문제를 생성한다."""
    # 개별 개수가 지정되면 그걸 사용, 아니면 quiz_types + count로 균등 분배
    if mc_count > 0 or sa_count > 0 or essay_count > 0:
        distribution = []
        quiz_types = []
        if mc_count > 0:
            distribution.append(f"multiple_choice: {mc_count}개")
            quiz_types.append("multiple_choice")
        if sa_count > 0:
            distribution.append(f"short_answer: {sa_count}개")
            quiz_types.append("short_answer")
        if essay_count > 0:
            distribution.append(f"essay: {essay_count}개")
            quiz_types.append("essay")
        count = mc_count + sa_count + essay_count
    else:
        if not quiz_types:
            quiz_types = ["multiple_choice", "short_answer", "essay"]
        per_type = max(1, count // len(quiz_types))
        distribution = []
        for i, t in enumerate(quiz_types):
            n = per_type if i < len(quiz_types) - 1 else count - per_type * (len(quiz_types) - 1)
            distribution.append(f"{t}: {n}개")

    type_desc = {
        "multiple_choice": "Multiple choice (4 options, correct_answer is index 0~3)",
        "short_answer": "Short answer (correct_answer + acceptable_answers array)",
        "essay": "Essay (rubric_criteria array for grading criteria)",
    }
    types_prompt = "\n".join(f"- {type_desc[t]}" for t in quiz_types if t in type_desc)

    model = get_gemini_model(_model_name, json_mode=True)
    prompt = f"""You are a university professor. Generate {count} quiz problems in JSON.
Progressive difficulty (problem 1 = easiest → last = hardest).

Topic: {topic} | Difficulty: {difficulty}
Type distribution: {', '.join(distribution)}

Types to include:
{types_prompt}

IMPORTANT: All text content (questions, options, answers, explanations) must be in Korean.

JSON format:
{{
  "problems": [
    {{
      "id": 1,
      "type": "multiple_choice",
      "question": "Question content",
      "options": ["Option1", "Option2", "Option3", "Option4"],
      "correct_answer": 0,
      "explanation": "Answer explanation",
      "points": 10,
      "difficulty_level": 3
    }},
    {{
      "id": 2,
      "type": "short_answer",
      "question": "Question content",
      "correct_answer": "Answer",
      "acceptable_answers": ["Answer", "Alternative"],
      "explanation": "Answer explanation",
      "points": 10,
      "difficulty_level": 5
    }},
    {{
      "id": 3,
      "type": "essay",
      "question": "Essay question content",
      "correct_answer": "Model answer summary",
      "rubric_criteria": [
        {{"name": "핵심 개념", "weight": 40, "description": "핵심 개념을 정확히 설명했는가"}},
        {{"name": "논리성", "weight": 30, "description": "논리적으로 서술했는가"}},
        {{"name": "완성도", "weight": 30, "description": "충분한 분량과 구체적 예시"}}
      ],
      "explanation": "Answer explanation",
      "points": 20,
      "difficulty_level": 7
    }}
  ],
  "rubric": {{
    "criteria": [
      {{"name": "정확성", "weight": 60, "description": "정답을 맞혔는가"}},
      {{"name": "이해도", "weight": 40, "description": "개념을 이해했는가"}}
    ]
  }}
}}"""

    response = model.generate_content(prompt, request_options=RequestOptions(timeout=60))
    result = _extract_json(response.text or "")
    problems = result.get("problems", [])

    for i, p in enumerate(problems):
        p["id"] = i + 1
        p["format"] = "quiz"

    return {"problems": problems, "rubric": result.get("rubric", {
        "criteria": [
            {"name": "정확성", "weight": 60, "description": "정답을 맞혔는가"},
            {"name": "이해도", "weight": 40, "description": "개념을 이해했는가"},
        ]
    })}


def _generate_block_problems(topic: str, difficulty: str, count: int, language: str, _model_name: str = "gemini-2.5-flash") -> dict:
    """Gemini로 블록 코딩용 문제를 생성한다. 초급자 친화적."""
    model = get_gemini_model(_model_name, json_mode=True)
    prompt = f"""You are a programming professor. Generate {count} beginner-friendly block coding (Blockly) problems in JSON.
Progressive difficulty (problem 1 = easiest → last = hardest).

Topic: {topic} | Difficulty: {difficulty} | Language: {language}

Rules:
- Problems must be solvable with visual blocks (loops, conditionals, variables, simple functions)
- Do NOT use complex data structures (trees, graphs, etc.)
- starter_code must be empty (start from blocks)
- expected_output must be clearly specified

IMPORTANT: All text content (title, description, hints) must be in Korean.

JSON format:
{{
  "problems": [
    {{
      "id": 1,
      "title": "Problem title",
      "description": "Problem description (markdown)",
      "starter_code": "",
      "expected_output": "Expected output",
      "hints": ["hint1"],
      "difficulty_level": 2
    }}
  ],
  "rubric": {{
    "criteria": [
      {{"name": "정확성", "weight": 50, "description": "올바른 출력"}},
      {{"name": "블록 구조", "weight": 30, "description": "논리적 블록 배치"}},
      {{"name": "효율성", "weight": 20, "description": "불필요한 블록 없음"}}
    ]
  }}
}}"""

    response = model.generate_content(prompt, request_options=RequestOptions(timeout=60))
    result = _extract_json(response.text or "")
    for p in result.get("problems", []):
        p["format"] = "block"
        p["starter_code"] = ""
    return result


def _generate_problem_outlines(topic: str, difficulty: str, count: int, language: str, _model_name: str = "gemini-2.5-flash") -> list[dict]:
    """Phase 1: 점진적 난이도 문제 아웃라인 생성 (빠른 단일 호출)"""
    difficulty_curves = {
        "easy": lambda i, n: max(1, min(5, 1 + int(4 * i / max(n - 1, 1)))),
        "medium": lambda i, n: max(2, min(8, 2 + int(6 * i / max(n - 1, 1)))),
        "hard": lambda i, n: max(4, min(10, 4 + int(6 * i / max(n - 1, 1)))),
    }
    curve = difficulty_curves.get(difficulty, difficulty_curves["medium"])
    model = get_gemini_model(_model_name, json_mode=True)
    prompt = f"""You are a programming professor.
Generate a JSON array with only titles and key concepts for {count} problems.
Problems must have progressive difficulty.

Topic: {topic}, Language: {language}

IMPORTANT: title and key_concept must be in Korean.

Response format (JSON array only):
[{{"id": 1, "title": "Problem title", "key_concept": "One-line key concept", "difficulty_level": 3}}]"""

    response = model.generate_content(prompt, request_options=RequestOptions(timeout=60))
    outlines = _extract_json(response.text or "")

    # 강제 난이도 레벨 적용
    for i, outline in enumerate(outlines):
        outline["difficulty_level"] = curve(i, count)
    return outlines


def _generate_single_problem(outline: dict, language: str, _model_name: str = "gemini-2.5-flash") -> dict:
    """Phase 2: 개별 문제 상세 생성"""
    model = get_gemini_model(_model_name, json_mode=True)
    prompt = f"""You are a programming professor.
Generate a complete problem in JSON based on the following outline.

Title: {outline['title']}
Key concept: {outline.get('key_concept', '')}
Difficulty level: {outline['difficulty_level']}/10
Language: {language}

IMPORTANT: All text content (description, hints) must be in Korean.

Response format (JSON only):
{{
  "id": {outline['id']},
  "title": "{outline['title']}",
  "description": "Detailed problem description",
  "starter_code": "Starter code",
  "expected_output": "Expected output",
  "hints": ["hint1", "hint2"]
}}"""

    response = model.generate_content(prompt, request_options=RequestOptions(timeout=60))
    return _extract_json(response.text or "")


async def _generate_problems_progressive(topic: str, difficulty: str, count: int, language: str) -> dict:
    """2단계 점진적 문제 생성: 아웃라인 → 병렬 상세"""
    loop = asyncio.get_running_loop()
    executor = ThreadPoolExecutor(max_workers=min(count + 2, 10))

    try:
        # Phase 1: 아웃라인
        try:
            print(f"    [일반] 아웃라인 생성 중 ({count}개)...")
            outlines = await loop.run_in_executor(
                executor, _generate_with_retry, _generate_problem_outlines,
                topic, difficulty, count, language,
            )
            print(f"    [일반] 아웃라인 {len(outlines)}개 완료")
        except Exception as e:
            print(f"    [일반] 아웃라인 실패 → 폴백: {e}")
            return await loop.run_in_executor(
                executor, _generate_with_retry, _generate_problems, topic, difficulty, count, language
            )

        # Phase 2: 병렬 상세 생성
        print(f"    [일반] 상세 문제 병렬 생성 중 ({len(outlines)}개)...")
        tasks = [
            loop.run_in_executor(executor, _generate_with_retry, _generate_single_problem, outline, language)
            for outline in outlines
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        problems = [r for r in results if not isinstance(r, Exception)]
        failed = sum(1 for r in results if isinstance(r, Exception))
        if failed:
            print(f"    [일반] 상세 생성: {len(problems)}개 성공, {failed}개 실패")
        if not problems:
            print(f"    [일반] 전체 실패 → 폴백")
            return await loop.run_in_executor(
                executor, _generate_with_retry, _generate_problems, topic, difficulty, count, language
            )
    finally:
        executor.shutdown(wait=True)

    rubric = {
        "criteria": [
            {"name": "정확성", "weight": 40, "description": "코드가 올바르게 동작하는가"},
            {"name": "코드 품질", "weight": 30, "description": "코드 스타일과 가독성"},
            {"name": "개념 이해", "weight": 30, "description": "핵심 개념을 올바르게 사용했는가"},
        ]
    }
    return {"problems": problems, "rubric": rubric}


def _generate_problems(topic: str, difficulty: str, count: int, language: str, _model_name: str = "gemini-2.5-flash") -> dict:
    """Gemini로 문제와 루브릭을 생성한다. (폴백용 단일 호출)"""
    model = get_gemini_model(_model_name, json_mode=True)
    prompt = f"""You are a university programming professor.
Generate {count} practice problems and a grading rubric in JSON.
Problems must have progressive difficulty (problem 1 = easiest, last = hardest).

Topic: {topic}
Difficulty: {difficulty}
Language: {language}

IMPORTANT: All text content (title, description, hints) must be in Korean.

Response format (JSON only):
{{
  "problems": [
    {{
      "id": 1,
      "title": "Problem title",
      "description": "Problem description",
      "starter_code": "Starter code",
      "expected_output": "Expected output",
      "hints": ["hint1", "hint2"]
    }}
  ],
  "rubric": {{
    "criteria": [
      {{"name": "정확성", "weight": 40, "description": "코드가 올바르게 동작하는가"}},
      {{"name": "코드 품질", "weight": 30, "description": "코드 스타일과 가독성"}},
      {{"name": "개념 이해", "weight": 30, "description": "핵심 개념을 올바르게 사용했는가"}}
    ]
  }}
}}"""

    response = model.generate_content(prompt, request_options=RequestOptions(timeout=60))
    return _extract_json(response.text or "")


def _safe_update_status(supabase, assignment_id: str, status: str, extra: dict | None = None):
    """generation_status 컬럼이 없어도 안전하게 업데이트한다."""
    short_id = assignment_id[:8]
    update_data = {"generation_status": status}
    if extra:
        update_data.update(extra)
    prob_count = len(extra.get("problems", [])) if extra else 0
    try:
        supabase.table("assignments").update(update_data).eq("id", assignment_id).execute()
        print(f"  💾 DB 저장 완료 [{short_id}] status={status}, problems={prob_count}개")
    except Exception as e1:
        print(f"  ⚠️ DB 저장 실패 (generation_status 포함): {e1}")
        # generation_status 컬럼이 없는 경우 — 컬럼 없이 재시도
        if extra:
            try:
                supabase.table("assignments").update(extra).eq("id", assignment_id).execute()
                print(f"  💾 DB 저장 완료 [{short_id}] (generation_status 제외), problems={prob_count}개")
            except Exception as e2:
                print(f"  ❌ DB 저장 완전 실패 [{short_id}]: {e2}")


async def _background_generate_problems(
    assignment_id: str,
    topic: str,
    difficulty: str,
    language: str,
    assign_type: str,
    regular_count: int,
    bj_count: int,
    pg_count: int,
    quiz_count: int = 0,
    quiz_types: list[str] | None = None,
    block_count: int = 0,
    mc_count: int = 0,
    sa_count: int = 0,
    essay_count: int = 0,
):
    """백그라운드에서 문제를 병렬 생성하고 DB를 업데이트한다."""
    short_id = assignment_id[:8]
    t_start = time.time()
    counts = []
    if regular_count > 0: counts.append(f"일반 {regular_count}")
    if bj_count > 0: counts.append(f"표준 입출력 {bj_count}")
    if pg_count > 0: counts.append(f"함수 구현 {pg_count}")
    if quiz_count > 0: counts.append(f"퀴즈 {quiz_count}")
    if block_count > 0: counts.append(f"블록 {block_count}")
    print(f"\n{'='*50}")
    print(f"📝 문제 생성 시작 [{short_id}]")
    print(f"   주제: {topic} | 난이도: {difficulty} | {', '.join(counts)}")
    print(f"{'='*50}")

    try:
        supabase = get_supabase()
        loop = asyncio.get_running_loop()
        all_problems = []
        rubric = {}

        async def gen_regular():
            if regular_count <= 0:
                return None
            print(f"  ▶ 일반 문제 {regular_count}개 생성 중...")
            data = await _generate_problems_progressive(topic, difficulty, regular_count, language)
            for p in data.get("problems", []):
                p["format"] = "regular"
            return data

        # 전용 executor — 기본 executor 워커 고갈로 인한 데드락 방지
        executor = ThreadPoolExecutor(max_workers=6)

        async def gen_baekjoon():
            if bj_count <= 0:
                return None
            print(f"  ▶ 표준 입출력형 문제 {bj_count}개 생성 중...")
            return await asyncio.wait_for(
                loop.run_in_executor(
                    executor, _generate_with_retry, _generate_algorithm_problems,
                    topic, difficulty, bj_count, language,
                ),
                timeout=120,
            )

        async def gen_programmers():
            if pg_count <= 0:
                return None
            print(f"  ▶ 함수 구현형 문제 {pg_count}개 생성 중...")
            return await asyncio.wait_for(
                loop.run_in_executor(
                    executor, _generate_with_retry, _generate_programmers_problems,
                    topic, difficulty, pg_count, language,
                ),
                timeout=120,
            )

        async def gen_quiz():
            total_quiz = mc_count + sa_count + essay_count if (mc_count + sa_count + essay_count) > 0 else quiz_count
            if total_quiz <= 0:
                return None
            print(f"  ▶ 퀴즈 문제 {total_quiz}개 생성 중 (객관식{mc_count} 주관식{sa_count} 서술형{essay_count})...")
            def _gen_quiz_wrapper(_model_name="gemini-2.5-flash"):
                return _generate_quiz_problems(
                    topic, difficulty, total_quiz, quiz_types or [],
                    mc_count=mc_count, sa_count=sa_count, essay_count=essay_count,
                    _model_name=_model_name,
                )
            return await asyncio.wait_for(
                loop.run_in_executor(
                    executor, _generate_with_retry, _gen_quiz_wrapper,
                ),
                timeout=120,
            )

        async def gen_block():
            if block_count <= 0:
                return None
            print(f"  ▶ 블록 코딩 문제 {block_count}개 생성 중...")
            return await asyncio.wait_for(
                loop.run_in_executor(
                    executor, _generate_with_retry, _generate_block_problems,
                    topic, difficulty, block_count, language,
                ),
                timeout=120,
            )

        try:
            results = await asyncio.gather(
                gen_regular(), gen_baekjoon(), gen_programmers(),
                gen_quiz(), gen_block(),
                return_exceptions=True,
            )
        finally:
            executor.shutdown(wait=True)

        for i, result in enumerate(results):
            label = ["일반", "표준 입출력", "함수 구현", "퀴즈", "블록"][i]
            if isinstance(result, Exception):
                print(f"  ✗ {label} 실패: {result}")
                continue
            if result is None:
                continue
            probs = result.get("problems", [])
            all_problems.extend(probs)
            if not rubric:
                rubric = result.get("rubric", rubric)
            print(f"  ✓ {label} {len(probs)}개 완료")

        for i, p in enumerate(all_problems):
            p["id"] = i + 1

        # 실패 원인 수집 (503, 429 등)
        fail_reasons = [str(r) for r in results if isinstance(r, Exception)]
        has_overload = any(_is_retriable_error(r) for r in fail_reasons)

        elapsed = time.time() - t_start
        if all_problems:
            _safe_update_status(supabase, assignment_id, "completed", {
                "problems": all_problems, "rubric": rubric,
            })
            print(f"\n✅ 생성 완료 [{short_id}] — {len(all_problems)}개 문제, {elapsed:.1f}초")
        else:
            fail_detail = "ai_overloaded" if has_overload else "generation_error"
            _safe_update_status(supabase, assignment_id, "failed", {
                "rubric": {"fail_reason": fail_detail},
            })
            print(f"\n❌ 생성 실패 [{short_id}] — 0개 문제, {elapsed:.1f}초 (reason={fail_detail})")
        print(f"{'='*50}\n")

    except Exception as e:
        elapsed = time.time() - t_start
        print(f"\n❌ 생성 오류 [{short_id}] — {elapsed:.1f}초: {e}")
        print(f"{'='*50}\n")
        traceback.print_exc()
        try:
            fail_detail = "ai_overloaded" if _is_retriable_error(str(e)) else "generation_error"
            _safe_update_status(get_supabase(), assignment_id, "failed", {
                "rubric": {"fail_reason": fail_detail},
            })
        except Exception:
            pass


@router.post("", status_code=201)
async def create_assignment(
    course_id: str,
    body: AssignmentCreateRequest,
    user: dict = Depends(get_current_user),
):
    """과제를 생성하고, AI가 문제를 백그라운드에서 자동 생성한다."""
    # 교수 또는 개인 모드만 과제 생성 가능
    is_admin = user.get("email", "").endswith("@pikabuddy.admin")
    if user.get("role") not in ("professor", "personal") and not is_admin:
        raise HTTPException(status_code=403, detail="과제 생성 권한이 없습니다.")
    verify_course_ownership(user, course_id)
    supabase = get_supabase()

    # 코딩/퀴즈 과제 여부에 따라 generation_status 설정
    needs_generation = body.type in ("coding", "both", "algorithm", "quiz")

    insert_data = {
        "course_id": course_id,
        "title": body.title,
        "topic": body.topic,
        "type": body.type,
        "status": "draft",
        "problems": [],
        "rubric": {},
        "ai_policy": body.ai_policy,
        "language": body.language,
        "grading_strictness": body.grading_strictness,
        "generation_status": "generating" if needs_generation else "completed",
    }
    if body.due_date:
        insert_data["due_date"] = body.due_date
    if body.grading_note:
        insert_data["grading_note"] = body.grading_note
    if body.is_team_assignment:
        insert_data["is_team_assignment"] = True

    # 글쓰기 과제: 지시문 생성 (빠르므로 동기로 처리)
    if body.type in ("writing", "both"):
        if body.writing_prompt:
            insert_data["writing_prompt"] = body.writing_prompt
        else:
            try:
                loop = asyncio.get_running_loop()
                wp_text = await loop.run_in_executor(
                    None, _generate_writing_prompt, body.topic, body.difficulty
                )
                insert_data["writing_prompt"] = wp_text
            except Exception as e:
                print(f"[ERROR] 글쓰기 지시문 생성 실패: {e}")
                insert_data["writing_prompt"] = f"{body.topic}에 대해 자유롭게 글을 작성하세요."

    # INSERT — 신규 컬럼이 없으면 제외 후 재시도
    try:
        result = supabase.table("assignments").insert(insert_data).execute()
    except Exception:
        insert_data.pop("generation_status", None)
        insert_data.pop("is_team_assignment", None)
        result = supabase.table("assignments").insert(insert_data).execute()
    assignment = result.data[0]

    # 코딩/퀴즈 과제: 백그라운드에서 문제 생성 (즉시 반환)
    if needs_generation:
        # 하위 호환: type이 "algorithm"이면 전부 표준 입출력형
        if body.type == "algorithm":
            regular_count = 0
            bj_count = body.problem_count
            pg_count = 0
        elif body.type == "quiz":
            regular_count = 0
            bj_count = 0
            pg_count = 0
        else:
            regular_count = body.problem_count
            bj_count = body.baekjoon_count
            pg_count = body.programmers_count

        task = asyncio.create_task(_background_generate_problems(
            assignment_id=assignment["id"],
            topic=body.topic,
            difficulty=body.difficulty,
            language=body.language,
            assign_type=body.type,
            regular_count=regular_count,
            bj_count=bj_count,
            pg_count=pg_count,
            quiz_count=body.quiz_count if body.type == "quiz" else 0,
            quiz_types=body.quiz_types if body.type == "quiz" else None,
            block_count=body.block_count,
            mc_count=body.mc_count if body.type == "quiz" else 0,
            sa_count=body.sa_count if body.type == "quiz" else 0,
            essay_count=body.essay_count if body.type == "quiz" else 0,
        ))
        # 백그라운드 태스크 예외가 서버를 죽이지 않도록 방어 + 로깅
        def _on_task_done(t):
            if not t.cancelled() and t.exception():
                logger.error(f"[Assignment] 백그라운드 문제 생성 오류: {t.exception()}")
        task.add_done_callback(_on_task_done)

    return assignment


@router.get("")
async def list_assignments(course_id: str, user: dict = Depends(get_current_user)):
    """과제 목록 조회 (학생은 published만, 제출 여부 포함)"""
    supabase = get_supabase()
    query = (
        supabase.table("assignments")
        .select("*")
        .eq("course_id", course_id)
        .order("created_at", desc=True)
    )
    # 학생은 published 과제만 볼 수 있음 (어드민 제외)
    is_admin = user.get("email", "").endswith("@pikabuddy.admin")
    role = user.get("role", "student")
    if role == "student" and not is_admin:
        query = query.eq("status", "published")

    result = query.execute()
    assignments = result.data or []

    # 학생/개인은 제출 여부 표시
    if role in ("student", "personal") and assignments:
        aid_list = [a["id"] for a in assignments]
        subs = supabase.table("submissions").select("assignment_id").eq(
            "student_id", user["id"]
        ).in_("assignment_id", aid_list).execute()
        submitted_ids = {s["assignment_id"] for s in (subs.data or [])}
        for a in assignments:
            a["has_submitted"] = a["id"] in submitted_ids

    return assignments


@router.get("/problem-bank")
async def get_problem_bank(
    course_id: str,
    user: dict = Depends(require_professor_or_personal),
):
    """교수의 모든 과제에서 문제를 검색 (문제 은행)"""
    verify_course_ownership(user, course_id)
    supabase = get_supabase()
    result = supabase.table("assignments").select(
        "id, title, topic, type, problems, created_at"
    ).eq("course_id", course_id).order("created_at", desc=True).execute()

    bank = []
    for a in result.data or []:
        problems = a.get("problems") or []
        for idx, p in enumerate(problems):
            bank.append({
                "assignment_id": a["id"],
                "assignment_title": a["title"],
                "problem_index": idx,
                "problem": p,
            })
    return bank


class ProblemImportRequest(BaseModel):
    source_assignment_id: str
    problem_indices: list[int]


@router.delete("/{assignment_id}")
async def delete_assignment(
    course_id: str,
    assignment_id: str,
    user: dict = Depends(require_professor_or_personal),
):
    """과제 삭제 (관련 제출물, 스냅샷, 분석 모두 cascade 삭제)"""
    verify_course_ownership(user, course_id)
    supabase = get_supabase()
    supabase.table("assignments").delete().eq("id", assignment_id).eq("course_id", course_id).execute()
    return {"message": "과제가 삭제되었습니다."}


@router.delete("/{assignment_id}/submissions/{submission_id}")
async def delete_submission(
    course_id: str,
    assignment_id: str,
    submission_id: str,
    user: dict = Depends(require_professor_or_personal),
):
    """제출물 삭제 (관련 AI 분석도 cascade 삭제)"""
    verify_course_ownership(user, course_id)
    supabase = get_supabase()
    # 제출물이 해당 과제에 속하는지 확인
    sub = supabase.table("submissions").select("id").eq("id", submission_id).eq("assignment_id", assignment_id).execute()
    if not sub.data:
        raise HTTPException(status_code=404, detail="제출물을 찾을 수 없습니다.")
    # 과제가 해당 코스에 속하는지 확인
    asgn = supabase.table("assignments").select("id").eq("id", assignment_id).eq("course_id", course_id).execute()
    if not asgn.data:
        raise HTTPException(status_code=404, detail="과제를 찾을 수 없습니다.")
    supabase.table("submissions").delete().eq("id", submission_id).execute()
    return {"message": "제출물이 삭제되었습니다."}


@router.get("/{assignment_id}")
async def get_assignment(course_id: str, assignment_id: str, user: dict = Depends(get_current_user)):
    """과제 상세 조회"""
    supabase = get_supabase()
    result = (
        supabase.table("assignments")
        .select("*")
        .eq("id", assignment_id)
        .eq("course_id", course_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="과제를 찾을 수 없습니다.")

    # 학생은 수강 등록 확인 + published 과제만 접근
    is_admin = user.get("email", "").endswith("@pikabuddy.admin")
    if user.get("role") == "student" and not is_admin:
        enrollment = (
            supabase.table("enrollments")
            .select("id")
            .eq("student_id", user["id"])
            .eq("course_id", course_id)
            .execute()
        )
        if not enrollment.data:
            raise HTTPException(status_code=403, detail="해당 과제에 접근 권한이 없습니다.")
        if result.data.get("status") != "published":
            raise HTTPException(status_code=403, detail="아직 공개되지 않은 과제입니다.")

    return result.data


@router.patch("/{assignment_id}")
async def update_assignment(
    course_id: str,
    assignment_id: str,
    body: AssignmentUpdateRequest,
    user: dict = Depends(require_professor_or_personal),
):
    """과제 기본 정보 수정"""
    verify_course_ownership(user, course_id)
    supabase = get_supabase()
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="변경할 내용이 없습니다.")

    supabase.table("assignments").update(update_data).eq("id", assignment_id).eq("course_id", course_id).execute()
    result = supabase.table("assignments").select("*").eq("id", assignment_id).eq("course_id", course_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="과제를 찾을 수 없습니다.")
    return result.data


@router.post("/{assignment_id}/publish")
async def publish_assignment(
    course_id: str,
    assignment_id: str,
    user: dict = Depends(require_professor_or_personal),
):
    """과제를 학생에게 공개"""
    verify_course_ownership(user, course_id)
    supabase = get_supabase()
    supabase.table("assignments").update(
        {"status": "published"}
    ).eq("id", assignment_id).eq("course_id", course_id).execute()
    return {"message": "과제가 공개되었습니다.", "status": "published"}


@router.post("/{assignment_id}/unpublish")
async def unpublish_assignment(
    course_id: str,
    assignment_id: str,
    user: dict = Depends(require_professor_or_personal),
):
    """과제를 비공개로 전환"""
    verify_course_ownership(user, course_id)
    supabase = get_supabase()
    supabase.table("assignments").update(
        {"status": "draft"}
    ).eq("id", assignment_id).eq("course_id", course_id).execute()
    return {"message": "과제가 비공개로 전환되었습니다.", "status": "draft"}


@router.post("/{assignment_id}/import-problems", status_code=201)
async def import_problems(
    course_id: str,
    assignment_id: str,
    body: ProblemImportRequest,
    user: dict = Depends(require_professor_or_personal),
):
    """다른 과제에서 문제를 복사해서 현재 과제에 추가"""
    verify_course_ownership(user, course_id)
    supabase = get_supabase()

    # 소스 과제 가져오기 + 소스 과제의 코스 소유권 확인
    source = supabase.table("assignments").select(
        "problems, course_id"
    ).eq("id", body.source_assignment_id).single().execute()
    if not source.data:
        raise HTTPException(status_code=404, detail="소스 과제를 찾을 수 없습니다.")
    # 소스 과제의 코스도 본인 소유인지 확인
    source_course_id = source.data.get("course_id")
    if source_course_id != course_id:
        # 다른 코스의 과제라면 해당 코스도 소유해야 함
        verify_course_ownership(user, source_course_id)

    source_problems = source.data.get("problems") or []

    # 대상 과제 가져오기 (course_id 검증 포함)
    target = supabase.table("assignments").select(
        "problems"
    ).eq("id", assignment_id).eq("course_id", course_id).single().execute()
    if not target.data:
        raise HTTPException(status_code=404, detail="대상 과제를 찾을 수 없습니다.")

    target_problems = list(target.data.get("problems") or [])
    next_id = max((p.get("id", 0) for p in target_problems), default=0) + 1

    imported = []
    for idx in body.problem_indices:
        if 0 <= idx < len(source_problems):
            p = dict(source_problems[idx])
            p["id"] = next_id
            next_id += 1
            target_problems.append(p)
            imported.append(p)

    supabase.table("assignments").update(
        {"problems": target_problems}
    ).eq("id", assignment_id).eq("course_id", course_id).execute()

    return {"message": f"{len(imported)}개 문제가 추가되었습니다.", "imported_count": len(imported)}


@router.patch("/{assignment_id}/policy")
async def update_policy(
    course_id: str,
    assignment_id: str,
    body: PolicyUpdateRequest,
    user: dict = Depends(require_professor_or_personal),
):
    """AI 정책 설정 변경"""
    verify_course_ownership(user, course_id)
    if body.ai_policy not in ("free", "normal", "strict", "exam"):
        raise HTTPException(status_code=400, detail="유효하지 않은 AI 정책입니다.")

    supabase = get_supabase()
    supabase.table("assignments").update(
        {"ai_policy": body.ai_policy}
    ).eq("id", assignment_id).eq("course_id", course_id).execute()

    return {"message": "AI 정책이 변경되었습니다.", "ai_policy": body.ai_policy}


@router.patch("/{assignment_id}/writing-prompt")
async def update_writing_prompt(
    course_id: str,
    assignment_id: str,
    body: WritingPromptUpdateRequest,
    user: dict = Depends(require_professor_or_personal),
):
    """글쓰기 지시문 수정"""
    verify_course_ownership(user, course_id)
    supabase = get_supabase()
    supabase.table("assignments").update(
        {"writing_prompt": body.writing_prompt}
    ).eq("id", assignment_id).eq("course_id", course_id).execute()
    return {"message": "글쓰기 지시문이 수정되었습니다."}


# ===== 문제 관리 =====

@router.post("/{assignment_id}/problems", status_code=201)
async def add_problem(
    course_id: str,
    assignment_id: str,
    body: ProblemAddRequest,
    user: dict = Depends(require_professor_or_personal),
):
    """문제 추가"""
    verify_course_ownership(user, course_id)
    supabase = get_supabase()
    assignment = (
        supabase.table("assignments")
        .select("problems")
        .eq("id", assignment_id)
        .eq("course_id", course_id)
        .single()
        .execute()
    )
    if not assignment.data:
        raise HTTPException(status_code=404, detail="과제를 찾을 수 없습니다.")
    problems = assignment.data.get("problems", []) or []

    new_id = max((p.get("id", 0) for p in problems), default=0) + 1
    new_problem = {
        "id": new_id,
        "title": body.title,
        "description": body.description,
        "starter_code": body.starter_code,
        "expected_output": body.expected_output,
        "hints": body.hints,
        "format": body.format,
    }
    # Baekjoon: force empty starter_code
    if body.format == "baekjoon":
        new_problem["starter_code"] = ""
    # Algorithm fields
    if body.format in ("baekjoon", "programmers"):
        if body.input_description:
            new_problem["input_description"] = body.input_description
        if body.output_description:
            new_problem["output_description"] = body.output_description
        if body.constraints:
            new_problem["constraints"] = body.constraints
        new_problem["time_limit_ms"] = body.time_limit_ms
        new_problem["memory_limit_mb"] = body.memory_limit_mb
        if body.examples:
            new_problem["examples"] = body.examples
        if body.test_cases:
            new_problem["test_cases"] = body.test_cases
    # Programmers-specific
    if body.format == "programmers":
        if body.function_name:
            new_problem["function_name"] = body.function_name
        if body.parameters:
            new_problem["parameters"] = body.parameters
        if body.return_type:
            new_problem["return_type"] = body.return_type
        if body.return_description:
            new_problem["return_description"] = body.return_description
    problems.append(new_problem)

    supabase.table("assignments").update(
        {"problems": problems}
    ).eq("id", assignment_id).eq("course_id", course_id).execute()

    return new_problem


@router.patch("/{assignment_id}/problems/{problem_id}")
async def update_problem(
    course_id: str,
    assignment_id: str,
    problem_id: int,
    body: ProblemUpdateRequest,
    user: dict = Depends(require_professor_or_personal),
):
    """문제 수정"""
    verify_course_ownership(user, course_id)
    supabase = get_supabase()
    assignment = (
        supabase.table("assignments")
        .select("problems")
        .eq("id", assignment_id)
        .eq("course_id", course_id)
        .single()
        .execute()
    )
    if not assignment.data:
        raise HTTPException(status_code=404, detail="과제를 찾을 수 없습니다.")
    problems = assignment.data.get("problems", []) or []

    found = False
    for p in problems:
        if p.get("id") == problem_id:
            if body.title is not None:
                p["title"] = body.title
            if body.description is not None:
                p["description"] = body.description
            if body.starter_code is not None:
                p["starter_code"] = body.starter_code
            if body.expected_output is not None:
                p["expected_output"] = body.expected_output
            if body.hints is not None:
                p["hints"] = body.hints
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail="문제를 찾을 수 없습니다.")

    supabase.table("assignments").update(
        {"problems": problems}
    ).eq("id", assignment_id).eq("course_id", course_id).execute()

    return {"message": "문제가 수정되었습니다."}


@router.delete("/{assignment_id}/problems/{problem_id}")
async def delete_problem(
    course_id: str,
    assignment_id: str,
    problem_id: int,
    user: dict = Depends(require_professor_or_personal),
):
    """문제 삭제"""
    verify_course_ownership(user, course_id)
    supabase = get_supabase()
    assignment = (
        supabase.table("assignments")
        .select("problems")
        .eq("id", assignment_id)
        .eq("course_id", course_id)
        .single()
        .execute()
    )
    if not assignment.data:
        raise HTTPException(status_code=404, detail="과제를 찾을 수 없습니다.")
    problems = assignment.data.get("problems", []) or []
    new_problems = [p for p in problems if p.get("id") != problem_id]

    if len(new_problems) == len(problems):
        raise HTTPException(status_code=404, detail="문제를 찾을 수 없습니다.")

    supabase.table("assignments").update(
        {"problems": new_problems}
    ).eq("id", assignment_id).eq("course_id", course_id).execute()

    return {"message": "문제가 삭제되었습니다."}


# ===== 교수 점수 확정 =====

@router.get("/{assignment_id}/submissions")
async def list_submissions(
    course_id: str,
    assignment_id: str,
    user: dict = Depends(require_professor_or_personal),
):
    """과제의 모든 제출물 조회 (교수용)"""
    verify_course_ownership(user, course_id)
    supabase = get_supabase()
    result = (
        supabase.table("submissions")
        .select("*, users(name, email), ai_analyses(*)")
        .eq("assignment_id", assignment_id)
        .order("submitted_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/{assignment_id}/paste-logs")
async def get_paste_logs(
    course_id: str,
    assignment_id: str,
    user: dict = Depends(require_professor_or_personal),
):
    """과제의 모든 복붙 로그 조회 (교수용)"""
    verify_course_ownership(user, course_id)
    supabase = get_supabase()
    result = (
        supabase.table("snapshots")
        .select("id, student_id, code_diff, paste_source, created_at")
        .eq("assignment_id", assignment_id)
        .eq("is_paste", True)
        .order("created_at")
        .execute()
    )
    return result.data


@router.get("/{assignment_id}/submissions/{student_id}/snapshots")
async def get_student_snapshots(
    course_id: str,
    assignment_id: str,
    student_id: str,
    user: dict = Depends(require_professor_or_personal),
):
    """교수용 — 특정 학생의 글쓰기 스냅샷 조회 (paste 제외, 시간순)"""
    verify_course_ownership(user, course_id)
    supabase = get_supabase()
    result = (
        supabase.table("snapshots")
        .select("id, student_id, code_diff, created_at")
        .eq("assignment_id", assignment_id)
        .eq("student_id", student_id)
        .eq("is_paste", False)
        .order("created_at")
        .execute()
    )
    return result.data or []


class FinalScoreRequest(BaseModel):
    final_score: int


@router.patch("/{assignment_id}/analyses/{analysis_id}/score")
async def set_final_score(
    course_id: str,
    assignment_id: str,
    analysis_id: str,
    body: FinalScoreRequest,
    user: dict = Depends(require_professor_or_personal),
):
    """교수가 최종 점수를 확정"""
    verify_course_ownership(user, course_id)
    if body.final_score < 0 or body.final_score > 100:
        raise HTTPException(status_code=400, detail="점수는 0~100 사이여야 합니다.")

    supabase = get_supabase()
    # 과제가 해당 코스에 속하는지 확인
    asgn = supabase.table("assignments").select("id").eq("id", assignment_id).eq("course_id", course_id).execute()
    if not asgn.data:
        raise HTTPException(status_code=404, detail="과제를 찾을 수 없습니다.")
    supabase.table("ai_analyses").update(
        {"final_score": body.final_score}
    ).eq("id", analysis_id).execute()

    return {"message": "점수가 확정되었습니다.", "final_score": body.final_score}


# ===== QA/테스트 도구 (어드민 전용) =====

def _require_admin(user: dict):
    """어드민(@pikabuddy.admin) 여부 확인"""
    if not user.get("email", "").endswith("@pikabuddy.admin"):
        raise HTTPException(status_code=403, detail="어드민 권한이 필요합니다.")


@router.delete("/{assignment_id}/qa/paste-logs")
async def qa_reset_paste_logs(
    course_id: str, assignment_id: str,
    user: dict = Depends(get_current_user),
):
    """[QA] 과제의 모든 복붙 로그 초기화"""
    _require_admin(user)
    supabase = get_supabase()
    # 과제가 해당 코스에 속하는지 확인
    asgn = supabase.table("assignments").select("id").eq("id", assignment_id).eq("course_id", course_id).execute()
    if not asgn.data:
        raise HTTPException(status_code=404, detail="과제를 찾을 수 없습니다.")
    supabase.table("snapshots").delete().eq("assignment_id", assignment_id).eq("is_paste", True).execute()
    return {"message": "복붙 로그가 초기화되었습니다."}


@router.delete("/{assignment_id}/qa/snapshots")
async def qa_reset_snapshots(
    course_id: str, assignment_id: str,
    user: dict = Depends(get_current_user),
):
    """[QA] 과제의 모든 스냅샷 초기화"""
    _require_admin(user)
    supabase = get_supabase()
    # 과제가 해당 코스에 속하는지 확인
    asgn = supabase.table("assignments").select("id").eq("id", assignment_id).eq("course_id", course_id).execute()
    if not asgn.data:
        raise HTTPException(status_code=404, detail="과제를 찾을 수 없습니다.")
    supabase.table("snapshots").delete().eq("assignment_id", assignment_id).execute()
    return {"message": "스냅샷이 초기화되었습니다."}


@router.delete("/{assignment_id}/qa/submissions")
async def qa_reset_submissions(
    course_id: str, assignment_id: str,
    user: dict = Depends(get_current_user),
):
    """[QA] 과제의 모든 제출물 + AI 분석 초기화"""
    _require_admin(user)
    supabase = get_supabase()
    # 과제가 해당 코스에 속하는지 확인
    asgn = supabase.table("assignments").select("id").eq("id", assignment_id).eq("course_id", course_id).execute()
    if not asgn.data:
        raise HTTPException(status_code=404, detail="과제를 찾을 수 없습니다.")
    supabase.table("submissions").delete().eq("assignment_id", assignment_id).execute()
    return {"message": "제출물이 초기화되었습니다."}


@router.delete("/{assignment_id}/qa/all")
async def qa_reset_all(
    course_id: str, assignment_id: str,
    user: dict = Depends(get_current_user),
):
    """[QA] 과제의 모든 데이터(스냅샷+복붙+제출물) 일괄 초기화"""
    _require_admin(user)
    supabase = get_supabase()
    # 과제가 해당 코스에 속하는지 확인
    asgn = supabase.table("assignments").select("id").eq("id", assignment_id).eq("course_id", course_id).execute()
    if not asgn.data:
        raise HTTPException(status_code=404, detail="과제를 찾을 수 없습니다.")
    supabase.table("snapshots").delete().eq("assignment_id", assignment_id).execute()
    supabase.table("submissions").delete().eq("assignment_id", assignment_id).execute()
    return {"message": "모든 데이터가 초기화되었습니다."}
