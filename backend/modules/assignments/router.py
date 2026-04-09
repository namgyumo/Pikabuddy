import asyncio
import json
import re
import time
import traceback
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from common.supabase_client import get_supabase
from common.gemini_client import get_gemini_model, FALLBACK_MODELS
from google.generativeai.types import RequestOptions
from middleware.auth import get_current_user, require_professor_or_personal


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


def _generate_with_retry(generate_fn, *args, max_retries: int = 3) -> dict:
    """Gemini 생성 함수를 재시도 로직으로 감싼다. 503 시 폴백 모델 순차 시도."""
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
                # 504/서버 타임아웃은 재시도해도 같은 결과 → 즉시 실패
                if "504" in err_str or "timed out" in err_str.lower():
                    print(f"  ⏹ 서버 타임아웃 — 재시도 건너뜀")
                    break
                if attempt < max_retries - 1:
                    if "503" in err_str:
                        wait = 2 * (attempt + 1)
                        print(f"  ⏳ 과부하 — {wait}초 대기...")
                        time.sleep(wait)
                    else:
                        time.sleep(1)
        # 이 모델 전부 실패 → 다음 폴백 모델로
        if last_error and "503" in str(last_error):
            print(f"  🔄 {model_name} 과부하 → 다음 모델로 전환...")
            continue
        else:
            break

    raise last_error

router = APIRouter(prefix="/courses/{course_id}/assignments", tags=["과제"])


class AssignmentCreateRequest(BaseModel):
    title: str
    topic: str
    type: str = "coding"  # coding / writing / both
    difficulty: str = "medium"  # easy / medium / hard
    problem_count: int = 5
    baekjoon_count: int = 0  # 백준 형식 알고리즘 문제 수
    programmers_count: int = 0  # 프로그래머스 형식 알고리즘 문제 수
    ai_policy: str = "normal"  # free / normal / strict / exam
    language: str = "python"
    writing_prompt: str | None = None  # 글쓰기 지시문
    due_date: str | None = None  # ISO 8601
    grading_strictness: str = "normal"  # mild / normal / strict
    grading_note: str | None = None  # 교수 유의사항


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
    prompt = f"""당신은 대학교 교수입니다. 다음 주제로 글쓰기 과제 지시문을 작성하세요.
주제: {topic}
난이도: {difficulty}

학생에게 명확한 글쓰기 방향, 분량 가이드(최소 글자수), 평가 기준을 포함해서
3~5문장으로 작성하세요. JSON 없이 텍스트만 출력하세요."""
    response = model.generate_content(prompt, request_options=RequestOptions(timeout=60))
    return (response.text or "").strip()


def _generate_bulk_test_cases_baekjoon(problem: dict) -> list[dict]:
    """Flash Lite로 백준 형식 문제의 랜덤 테스트케이스를 추가 생성한다."""
    model = get_gemini_model(model_name="gemini-2.5-flash-lite", json_mode=True)
    prompt = f"""다음 알고리즘 문제에 대한 랜덤 테스트케이스 8개를 생성하세요.
기존 엣지 케이스와 겹치지 않는 다양한 일반적인 입력을 만드세요.

문제: {problem.get('title', '')}
설명: {problem.get('description', '')[:300]}
입력 형식: {problem.get('input_description', '')}
출력 형식: {problem.get('output_description', '')}
제약 조건: {problem.get('constraints', '')}

응답 형식 (JSON 배열만):
[
  {{"input": "테스트 입력", "expected_output": "기대 출력", "is_hidden": true}}
]

모든 테스트케이스는 is_hidden: true로 설정하세요. 제약 조건 범위 내에서 다양한 크기의 입력을 생성하세요."""

    response = model.generate_content(prompt, request_options=RequestOptions(timeout=60))
    cases = _extract_json(response.text or "")
    if isinstance(cases, dict):
        cases = cases.get("test_cases", cases.get("cases", []))
    return cases if isinstance(cases, list) else []


def _generate_bulk_test_cases_programmers(problem: dict) -> list[dict]:
    """Flash Lite로 프로그래머스 형식 문제의 랜덤 테스트케이스를 추가 생성한다."""
    model = get_gemini_model(model_name="gemini-2.5-flash-lite", json_mode=True)
    params_desc = ", ".join(f"{p['name']}: {p.get('type','')}" for p in problem.get("parameters", []))
    prompt = f"""다음 함수 기반 알고리즘 문제에 대한 랜덤 테스트케이스 8개를 생성하세요.
기존 엣지 케이스와 겹치지 않는 다양한 일반적인 입력을 만드세요.

문제: {problem.get('title', '')}
설명: {problem.get('description', '')[:300]}
함수 시그니처: {problem.get('function_name', 'solution')}({params_desc}) -> {problem.get('return_type', '')}
제약 조건: {problem.get('constraints', '')}

응답 형식 (JSON 배열만):
[
  {{"input": {{"param1": value1, "param2": value2}}, "expected_output": value, "is_hidden": true}}
]

모든 테스트케이스는 is_hidden: true로 설정하세요. 제약 조건 범위 내에서 다양한 크기의 입력을 생성하세요."""

    response = model.generate_content(prompt, request_options=RequestOptions(timeout=60))
    cases = _extract_json(response.text or "")
    if isinstance(cases, dict):
        cases = cases.get("test_cases", cases.get("cases", []))
    return cases if isinstance(cases, list) else []


def _generate_algorithm_problems(topic: str, difficulty: str, count: int, language: str, _model_name: str = "gemini-2.5-flash") -> dict:
    """Gemini로 백준 형식 알고리즘 문제를 생성한다. (엣지 케이스만 flash, 랜덤은 lite)"""
    model = get_gemini_model(_model_name, json_mode=True)
    prompt = f"""백준 스타일 표준입출력 알고리즘 문제 {count}개를 JSON으로 생성하세요.
점진적 난이도 (1번=쉬움 → 마지막=어려움).

주제: {topic} | 난이도: {difficulty} | 언어: {language}

규칙: starter_code=""(빈 문자열), 학생이 전체 코드 작성. 엣지 테스트케이스 3개만(공개1+히든2).

JSON 형식:
{{"problems":[{{"id":1,"title":"","description":"마크다운","input_description":"","output_description":"","constraints":"","examples":[{{"input":"","output":"","explanation":""}}],"test_cases":[{{"input":"","expected_output":"","is_hidden":false}}],"time_limit_ms":1000,"memory_limit_mb":256,"difficulty_level":3,"tags":[],"starter_code":"","hints":[]}}],"rubric":{{"criteria":[{{"name":"정확성","weight":50,"description":"테스트케이스 통과"}},{{"name":"효율성","weight":30,"description":"복잡도 최적화"}},{{"name":"코드 품질","weight":20,"description":"가독성"}}]}}}}"""

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
                print(f"    + 백준 랜덤TC: {p.get('title','?')} ({len(bulk_cases)}개)")
            except Exception as e:
                print(f"    ✗ 백준 랜덤TC 실패: {p.get('title','?')} — {e}")

        with ThreadPoolExecutor(max_workers=len(problems)) as executor:
            list(executor.map(_add_bulk_baekjoon, problems))
        print(f"  ✓ 백준 랜덤TC 전체 완료 ({time.time()-t0:.1f}초, {len(problems)}개 문제)")

    return result


def _generate_programmers_problems(topic: str, difficulty: str, count: int, language: str, _model_name: str = "gemini-2.5-flash") -> dict:
    """Gemini로 프로그래머스 형식 문제를 생성한다. (엣지 케이스만 flash, 랜덤은 lite)"""
    model = get_gemini_model(_model_name, json_mode=True)

    prompt = f"""당신은 프로그래머스(Programmers) 스타일의 알고리즘 문제 출제자입니다.
다음 조건에 맞는 함수 기반 알고리즘 문제 {count}개를 JSON으로 생성하세요.
문제는 점진적으로 난이도가 올라가야 합니다.

주제: {topic}
기본 난이도: {difficulty}
프로그래밍 언어: {language}

★ 프로그래머스 형식 핵심 규칙:
1. starter_code에는 전체 코드 구조(import, 입출력 처리, 헬퍼 함수 등)가 다 포함되어야 합니다.
2. 단, 핵심 solution 함수의 내부(body)만 비워두세요 (pass 또는 return 0 등).
3. 학생은 solution 함수 내부만 채우면 됩니다.
4. 입력은 함수 매개변수로, 출력은 return 값으로.

★ 테스트케이스 요구사항:
- 각 문제당 정확히 3개의 핵심 엣지 케이스만 생성하세요 (공개 1개 + 히든 2개).
- 반드시 극단적인 엣지케이스로 구성하세요:
  * 최솟값 입력 (n=0, n=1, 빈 배열 등)
  * 답이 0이거나 없는 경우 (-1 반환 등)
  * 특수한 경우 (모든 원소 동일, 음수만, 정렬된 입력 등)
- 나머지 랜덤 테스트케이스는 별도로 생성됩니다. 여기서는 엣지만 만드세요.

★ 예외 처리:
- 문제 설명에 예외 상황을 명시하세요 (입력이 비어있을 때, 답이 없을 때 등의 반환값).

응답 형식 (JSON만 출력):
{{
  "problems": [
    {{
      "id": 1,
      "title": "문제 제목",
      "description": "문제 설명 (마크다운). 예외 상황과 반환값 명시 포함",
      "function_name": "solution",
      "parameters": [
        {{"name": "n", "type": "int", "description": "배열 크기"}},
        {{"name": "arr", "type": "list[int]", "description": "정수 배열"}}
      ],
      "return_type": "int",
      "return_description": "결과값 설명. 답이 없으면 -1 반환 등 예외 명시",
      "constraints": "제약 조건 (예: 0 <= n <= 100000, -10^9 <= arr[i] <= 10^9)",
      "examples": [
        {{
          "input": {{"n": 5, "arr": [1,2,3,4,5]}},
          "output": 15,
          "explanation": "모든 원소의 합"
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
      "tags": ["태그1"],
      "starter_code": "전체 코드 구조 (solution 함수 내부만 비워둠)",
      "hints": ["힌트1"]
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

starter_code는 반드시 {language}로, 전체 코드 틀을 제공하되 solution 함수 body만 비워두세요.
난이도 레벨은 1(매우 쉬움)~10(매우 어려움) 스케일입니다."""

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

        with ThreadPoolExecutor(max_workers=len(problems)) as executor:
            list(executor.map(_add_bulk_programmers, problems))
        print(f"  ✓ PG 랜덤TC 전체 완료 ({time.time()-t0:.1f}초, {len(problems)}개 문제)")

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
    prompt = f"""당신은 프로그래밍 교수입니다.
다음 조건으로 문제 {count}개의 제목과 핵심 개념만 간략히 JSON 배열로 생성하세요.
문제는 점진적으로 난이도가 올라가야 합니다.

주제: {topic}, 언어: {language}

응답 형식 (JSON 배열만):
[{{"id": 1, "title": "문제 제목", "key_concept": "핵심 개념 한줄", "difficulty_level": 3}}]"""

    response = model.generate_content(prompt, request_options=RequestOptions(timeout=60))
    outlines = _extract_json(response.text or "")

    # 강제 난이도 레벨 적용
    for i, outline in enumerate(outlines):
        outline["difficulty_level"] = curve(i, count)
    return outlines


def _generate_single_problem(outline: dict, language: str, _model_name: str = "gemini-2.5-flash") -> dict:
    """Phase 2: 개별 문제 상세 생성"""
    model = get_gemini_model(_model_name, json_mode=True)
    prompt = f"""당신은 프로그래밍 교수입니다.
다음 문제 아웃라인을 기반으로 완전한 문제를 JSON으로 생성하세요.

제목: {outline['title']}
핵심 개념: {outline.get('key_concept', '')}
난이도 레벨: {outline['difficulty_level']}/10
프로그래밍 언어: {language}

응답 형식 (JSON만):
{{
  "id": {outline['id']},
  "title": "{outline['title']}",
  "description": "상세한 문제 설명",
  "starter_code": "시작 코드",
  "expected_output": "예상 출력",
  "hints": ["힌트1", "힌트2"]
}}"""

    response = model.generate_content(prompt, request_options=RequestOptions(timeout=60))
    return _extract_json(response.text or "")


async def _generate_problems_progressive(topic: str, difficulty: str, count: int, language: str) -> dict:
    """2단계 점진적 문제 생성: 아웃라인 → 병렬 상세"""
    loop = asyncio.get_running_loop()
    executor = ThreadPoolExecutor(max_workers=count + 2)

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
        executor.shutdown(wait=False)

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
    prompt = f"""당신은 대학교 프로그래밍 교수입니다.
다음 조건에 맞는 실습 문제 {count}개와 채점 루브릭을 JSON으로 생성하세요.
문제는 점진적으로 난이도가 올라가야 합니다 (1번이 가장 쉽고 마지막이 가장 어려움).

주제: {topic}
난이도: {difficulty}
프로그래밍 언어: {language}

응답 형식 (JSON만 출력):
{{
  "problems": [
    {{
      "id": 1,
      "title": "문제 제목",
      "description": "문제 설명",
      "starter_code": "시작 코드",
      "expected_output": "예상 출력",
      "hints": ["힌트1", "힌트2"]
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
):
    """백그라운드에서 문제를 병렬 생성하고 DB를 업데이트한다."""
    short_id = assignment_id[:8]
    t_start = time.time()
    counts = []
    if regular_count > 0: counts.append(f"일반 {regular_count}")
    if bj_count > 0: counts.append(f"백준 {bj_count}")
    if pg_count > 0: counts.append(f"PG {pg_count}")
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
        executor = ThreadPoolExecutor(max_workers=4)

        async def gen_baekjoon():
            if bj_count <= 0:
                return None
            print(f"  ▶ 백준 문제 {bj_count}개 생성 중...")
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
            print(f"  ▶ 프로그래머스 문제 {pg_count}개 생성 중...")
            return await asyncio.wait_for(
                loop.run_in_executor(
                    executor, _generate_with_retry, _generate_programmers_problems,
                    topic, difficulty, pg_count, language,
                ),
                timeout=120,
            )

        try:
            results = await asyncio.gather(
                gen_regular(), gen_baekjoon(), gen_programmers(),
                return_exceptions=True,
            )
        finally:
            executor.shutdown(wait=False)

        for i, result in enumerate(results):
            label = ["일반", "백준", "프로그래머스"][i]
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

        # 실패 원인 수집 (503 등)
        fail_reasons = [str(r) for r in results if isinstance(r, Exception)]
        has_503 = any("503" in r for r in fail_reasons)

        elapsed = time.time() - t_start
        if all_problems:
            _safe_update_status(supabase, assignment_id, "completed", {
                "problems": all_problems, "rubric": rubric,
            })
            print(f"\n✅ 생성 완료 [{short_id}] — {len(all_problems)}개 문제, {elapsed:.1f}초")
        else:
            fail_detail = "ai_overloaded" if has_503 else "generation_error"
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
            fail_detail = "ai_overloaded" if "503" in str(e) else "generation_error"
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
    supabase = get_supabase()

    # 코딩 과제 여부에 따라 generation_status 설정
    needs_generation = body.type in ("coding", "both", "algorithm")

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

    # INSERT — generation_status 컬럼이 없으면 제외 후 재시도
    try:
        result = supabase.table("assignments").insert(insert_data).execute()
    except Exception:
        insert_data.pop("generation_status", None)
        result = supabase.table("assignments").insert(insert_data).execute()
    assignment = result.data[0]

    # 코딩 과제: 백그라운드에서 문제 생성 (즉시 반환)
    if needs_generation:
        # 하위 호환: type이 "algorithm"이면 전부 백준 형식
        if body.type == "algorithm":
            regular_count = 0
            bj_count = body.problem_count
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
        ))
        # 백그라운드 태스크 예외가 서버를 죽이지 않도록 방어
        task.add_done_callback(lambda t: t.exception() if not t.cancelled() and t.exception() else None)

    return assignment


@router.get("")
async def list_assignments(course_id: str, user: dict = Depends(get_current_user)):
    """과제 목록 조회 (학생은 published만)"""
    supabase = get_supabase()
    query = (
        supabase.table("assignments")
        .select("*")
        .eq("course_id", course_id)
        .order("created_at", desc=True)
    )
    # 학생은 published 과제만 볼 수 있음 (어드민 제외)
    is_admin = user.get("email", "").endswith("@pikabuddy.admin")
    if user.get("role") == "student" and not is_admin:
        query = query.eq("status", "published")

    result = query.execute()
    return result.data


@router.delete("/{assignment_id}")
async def delete_assignment(
    course_id: str,
    assignment_id: str,
    user: dict = Depends(require_professor_or_personal),
):
    """과제 삭제 (관련 제출물, 스냅샷, 분석 모두 cascade 삭제)"""
    supabase = get_supabase()
    supabase.table("assignments").delete().eq("id", assignment_id).execute()
    return {"message": "과제가 삭제되었습니다."}


@router.delete("/{assignment_id}/submissions/{submission_id}")
async def delete_submission(
    course_id: str,
    assignment_id: str,
    submission_id: str,
    user: dict = Depends(require_professor_or_personal),
):
    """제출물 삭제 (관련 AI 분석도 cascade 삭제)"""
    supabase = get_supabase()
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
    return result.data


@router.patch("/{assignment_id}")
async def update_assignment(
    course_id: str,
    assignment_id: str,
    body: AssignmentUpdateRequest,
    user: dict = Depends(require_professor_or_personal),
):
    """과제 기본 정보 수정"""
    supabase = get_supabase()
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="변경할 내용이 없습니다.")

    supabase.table("assignments").update(update_data).eq("id", assignment_id).execute()
    result = supabase.table("assignments").select("*").eq("id", assignment_id).single().execute()
    return result.data


@router.post("/{assignment_id}/publish")
async def publish_assignment(
    course_id: str,
    assignment_id: str,
    user: dict = Depends(require_professor_or_personal),
):
    """과제를 학생에게 공개"""
    supabase = get_supabase()
    supabase.table("assignments").update(
        {"status": "published"}
    ).eq("id", assignment_id).execute()
    return {"message": "과제가 공개되었습니다.", "status": "published"}


@router.post("/{assignment_id}/unpublish")
async def unpublish_assignment(
    course_id: str,
    assignment_id: str,
    user: dict = Depends(require_professor_or_personal),
):
    """과제를 비공개로 전환"""
    supabase = get_supabase()
    supabase.table("assignments").update(
        {"status": "draft"}
    ).eq("id", assignment_id).execute()
    return {"message": "과제가 비공개로 전환되었습니다.", "status": "draft"}


@router.patch("/{assignment_id}/policy")
async def update_policy(
    course_id: str,
    assignment_id: str,
    body: PolicyUpdateRequest,
    user: dict = Depends(require_professor_or_personal),
):
    """AI 정책 설정 변경"""
    if body.ai_policy not in ("free", "normal", "strict", "exam"):
        raise HTTPException(status_code=400, detail="유효하지 않은 AI 정책입니다.")

    supabase = get_supabase()
    supabase.table("assignments").update(
        {"ai_policy": body.ai_policy}
    ).eq("id", assignment_id).execute()

    return {"message": "AI 정책이 변경되었습니다.", "ai_policy": body.ai_policy}


@router.patch("/{assignment_id}/writing-prompt")
async def update_writing_prompt(
    course_id: str,
    assignment_id: str,
    body: WritingPromptUpdateRequest,
    user: dict = Depends(require_professor_or_personal),
):
    """글쓰기 지시문 수정"""
    supabase = get_supabase()
    supabase.table("assignments").update(
        {"writing_prompt": body.writing_prompt}
    ).eq("id", assignment_id).execute()
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
    supabase = get_supabase()
    assignment = (
        supabase.table("assignments")
        .select("problems")
        .eq("id", assignment_id)
        .single()
        .execute()
    )
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
    ).eq("id", assignment_id).execute()

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
    supabase = get_supabase()
    assignment = (
        supabase.table("assignments")
        .select("problems")
        .eq("id", assignment_id)
        .single()
        .execute()
    )
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
    ).eq("id", assignment_id).execute()

    return {"message": "문제가 수정되었습니다."}


@router.delete("/{assignment_id}/problems/{problem_id}")
async def delete_problem(
    course_id: str,
    assignment_id: str,
    problem_id: int,
    user: dict = Depends(require_professor_or_personal),
):
    """문제 삭제"""
    supabase = get_supabase()
    assignment = (
        supabase.table("assignments")
        .select("problems")
        .eq("id", assignment_id)
        .single()
        .execute()
    )
    problems = assignment.data.get("problems", []) or []
    new_problems = [p for p in problems if p.get("id") != problem_id]

    if len(new_problems) == len(problems):
        raise HTTPException(status_code=404, detail="문제를 찾을 수 없습니다.")

    supabase.table("assignments").update(
        {"problems": new_problems}
    ).eq("id", assignment_id).execute()

    return {"message": "문제가 삭제되었습니다."}


# ===== 교수 점수 확정 =====

@router.get("/{assignment_id}/submissions")
async def list_submissions(
    course_id: str,
    assignment_id: str,
    user: dict = Depends(require_professor_or_personal),
):
    """과제의 모든 제출물 조회 (교수용)"""
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
    if body.final_score < 0 or body.final_score > 100:
        raise HTTPException(status_code=400, detail="점수는 0~100 사이여야 합니다.")

    supabase = get_supabase()
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
    supabase.table("snapshots").delete().eq("assignment_id", assignment_id).execute()
    supabase.table("submissions").delete().eq("assignment_id", assignment_id).execute()
    return {"message": "모든 데이터가 초기화되었습니다."}
