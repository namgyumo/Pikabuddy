"""
Demo seed data for test accounts.
Defines courses, assignments, notes, submissions, AI analyses,
messages, note comments, and gamification data
that get inserted when the reset endpoint is called.
"""

# ── Courses ──────────────────────────────────────────────

COURSES = [
    {
        "_key": "python_intro",
        "title": "파이썬 프로그래밍 입문",
        "description": "프로그래밍을 처음 배우는 학생을 위한 파이썬 기초 강좌입니다. 변수, 조건문, 반복문, 함수, 리스트 등 핵심 문법을 학습합니다.",
        "objectives": ["파이썬 기본 문법 이해", "조건문과 반복문 활용", "함수 정의 및 호출", "리스트/딕셔너리 데이터 처리"],
        "invite_code": "PYTH1234",
    },
    {
        "_key": "data_structure",
        "title": "데이터구조와 알고리즘",
        "description": "효율적인 문제 해결을 위한 자료구조와 알고리즘을 학습합니다. 스택, 큐, 트리, 그래프 등의 자료구조와 정렬, 탐색 알고리즘을 다룹니다.",
        "objectives": ["기본 자료구조 이해 및 구현", "시간/공간 복잡도 분석", "정렬과 탐색 알고리즘", "그래프 알고리즘 활용"],
        "invite_code": "ALGO5678",
    },
]

# ── Assignments ──────────────────────────────────────────

ASSIGNMENTS = [
    # ── python_intro 과제 ──
    {
        "_course_key": "python_intro",
        "_key": "py_coding1",
        "title": "변수와 연산자 실습",
        "topic": "파이썬 변수 선언, 산술/비교 연산자 활용",
        "type": "coding",
        "status": "published",
        "language": "python",
        "ai_policy": "normal",
        "generation_status": "completed",
        "problems": [
            {
                "id": 1,
                "title": "두 수의 합",
                "description": "두 정수를 입력받아 합을 출력하는 프로그램을 작성하세요.",
                "input_description": "공백으로 구분된 두 정수 a, b (-1000 ≤ a, b ≤ 1000)",
                "output_description": "두 수의 합을 출력",
                "constraints": "-1000 ≤ a, b ≤ 1000",
                "examples": [
                    {"input": "3 5", "output": "8"},
                    {"input": "-2 7", "output": "5"},
                ],
                "test_cases": [
                    {"input": "0 0", "output": "0"},
                    {"input": "100 -100", "output": "0"},
                    {"input": "-500 -500", "output": "-1000"},
                    {"input": "999 1", "output": "1000"},
                ],
                "starter_code": "# 두 정수를 입력받아 합을 출력하세요\n",
                "hints": ["input().split()을 사용하면 공백으로 나눌 수 있어요", "int()로 문자열을 정수로 변환하세요"],
                "format": "baekjoon",
                "difficulty_level": "easy",
                "tags": ["입출력", "변수"],
                "time_limit_ms": 1000,
                "memory_limit_mb": 256,
            },
            {
                "id": 2,
                "title": "짝수 홀수 판별",
                "description": "정수를 입력받아 짝수이면 'Even', 홀수이면 'Odd'를 출력하세요.",
                "input_description": "정수 n (-10000 ≤ n ≤ 10000)",
                "output_description": "'Even' 또는 'Odd'",
                "constraints": "-10000 ≤ n ≤ 10000",
                "examples": [
                    {"input": "4", "output": "Even"},
                    {"input": "7", "output": "Odd"},
                ],
                "test_cases": [
                    {"input": "0", "output": "Even"},
                    {"input": "-3", "output": "Odd"},
                    {"input": "-8", "output": "Even"},
                    {"input": "1", "output": "Odd"},
                ],
                "starter_code": "n = int(input())\n# 짝수/홀수를 판별하세요\n",
                "hints": ["나머지 연산자 %를 사용하세요"],
                "format": "baekjoon",
                "difficulty_level": "easy",
                "tags": ["조건문"],
                "time_limit_ms": 1000,
                "memory_limit_mb": 256,
            },
            {
                "id": 3,
                "title": "구구단 출력",
                "description": "정수 N을 입력받아 N단을 출력하세요. 각 줄에 'N * i = 결과' 형식으로 출력합니다.",
                "input_description": "정수 N (2 ≤ N ≤ 9)",
                "output_description": "N * 1 = N부터 N * 9 = N*9까지 각 줄에 출력",
                "constraints": "2 ≤ N ≤ 9",
                "examples": [
                    {"input": "2", "output": "2 * 1 = 2\n2 * 2 = 4\n2 * 3 = 6\n2 * 4 = 8\n2 * 5 = 10\n2 * 6 = 12\n2 * 7 = 14\n2 * 8 = 16\n2 * 9 = 18"},
                ],
                "test_cases": [
                    {"input": "5", "output": "5 * 1 = 5\n5 * 2 = 10\n5 * 3 = 15\n5 * 4 = 20\n5 * 5 = 25\n5 * 6 = 30\n5 * 7 = 35\n5 * 8 = 40\n5 * 9 = 45"},
                ],
                "starter_code": "n = int(input())\n# n단을 출력하세요\n",
                "hints": ["for i in range(1, 10)를 사용하세요", "f-string으로 포맷팅: f'{n} * {i} = {n*i}'"],
                "format": "baekjoon",
                "difficulty_level": "easy",
                "tags": ["반복문", "출력"],
                "time_limit_ms": 1000,
                "memory_limit_mb": 256,
            },
        ],
    },
    {
        "_course_key": "python_intro",
        "_key": "py_writing1",
        "title": "프로그래밍 학습 회고",
        "topic": "파이썬 학습 과정 돌아보기",
        "type": "writing",
        "status": "published",
        "language": "python",
        "ai_policy": "normal",
        "generation_status": "completed",
        "writing_prompt": "지금까지 파이썬을 학습하면서 느낀 점을 자유롭게 작성해주세요.\n\n다음 내용을 포함하면 좋습니다:\n1. 가장 어려웠던 개념과 그것을 어떻게 이해했는지\n2. 가장 재미있었던 실습이나 프로젝트\n3. 앞으로 만들어보고 싶은 프로그램\n\n최소 500자 이상 작성해주세요.",
        "problems": [],
    },
    {
        "_course_key": "python_intro",
        "_key": "py_quiz1",
        "title": "파이썬 기초 문법 퀴즈",
        "topic": "변수, 자료형, 조건문, 반복문 개념 확인",
        "type": "quiz",
        "status": "published",
        "language": "python",
        "ai_policy": "normal",
        "generation_status": "completed",
        "problems": [
            {
                "id": 1, "format": "quiz", "type": "multiple_choice",
                "question": "다음 중 파이썬에서 변수를 선언하는 올바른 방법은?",
                "options": ["int x = 5", "x = 5", "var x = 5", "let x = 5"],
                "correct_answer": 1,
                "explanation": "파이썬은 동적 타이핑 언어로, 'x = 5'처럼 타입 선언 없이 바로 값을 할당합니다.",
                "points": 10, "difficulty_level": "easy",
            },
            {
                "id": 2, "format": "quiz", "type": "multiple_choice",
                "question": "print(type(3.14))의 출력 결과는?",
                "options": ["<class 'int'>", "<class 'float'>", "<class 'str'>", "<class 'double'>"],
                "correct_answer": 1,
                "explanation": "3.14는 소수점이 있는 숫자이므로 float 타입입니다.",
                "points": 10, "difficulty_level": "easy",
            },
            {
                "id": 3, "format": "quiz", "type": "short_answer",
                "question": "파이썬에서 리스트의 길이를 구하는 내장 함수의 이름은?",
                "correct_answer": "len",
                "explanation": "len() 함수는 리스트, 문자열, 튜플 등의 길이를 반환합니다.",
                "points": 10, "difficulty_level": "easy",
            },
            {
                "id": 4, "format": "quiz", "type": "multiple_choice",
                "question": "for i in range(5)에서 i가 가질 수 있는 값의 범위는?",
                "options": ["1부터 5까지", "0부터 5까지", "0부터 4까지", "1부터 4까지"],
                "correct_answer": 2,
                "explanation": "range(5)는 0, 1, 2, 3, 4를 생성합니다. 시작은 0, 끝 값(5)은 포함되지 않습니다.",
                "points": 10, "difficulty_level": "easy",
            },
            {
                "id": 5, "format": "quiz", "type": "essay",
                "question": "파이썬의 리스트(list)와 튜플(tuple)의 차이점을 설명하고, 각각 언제 사용하면 좋은지 예시와 함께 서술하세요.",
                "correct_answer": "리스트는 변경 가능(mutable)하고 대괄호[]로 생성하며, 튜플은 변경 불가능(immutable)하고 소괄호()로 생성합니다. 리스트는 데이터를 추가/삭제해야 할 때, 튜플은 좌표나 RGB 값처럼 변경되면 안 되는 데이터에 사용합니다.",
                "explanation": "",
                "points": 20, "difficulty_level": "medium",
            },
        ],
    },
    # ── data_structure 과제 ──
    {
        "_course_key": "data_structure",
        "_key": "ds_coding1",
        "title": "스택과 큐 구현",
        "topic": "스택과 큐 자료구조를 직접 구현하고 활용",
        "type": "coding",
        "status": "published",
        "language": "python",
        "ai_policy": "strict",
        "generation_status": "completed",
        "problems": [
            {
                "id": 1,
                "title": "괄호 짝 맞추기",
                "description": "괄호로 이루어진 문자열이 주어졌을 때, 올바른 괄호 문자열인지 판단하세요. '('와 ')'로만 이루어져 있으며, 모든 여는 괄호에 대응하는 닫는 괄호가 있어야 합니다.",
                "input_description": "괄호 문자열 (길이 ≤ 100,000)",
                "output_description": "'YES' 또는 'NO'",
                "constraints": "문자열 길이 ≤ 100,000",
                "examples": [
                    {"input": "(())()", "output": "YES"},
                    {"input": "(()", "output": "NO"},
                    {"input": ")(", "output": "NO"},
                ],
                "test_cases": [
                    {"input": "", "output": "YES"},
                    {"input": "()", "output": "YES"},
                    {"input": "((()))", "output": "YES"},
                    {"input": "(()))(", "output": "NO"},
                ],
                "starter_code": "s = input()\n# 스택을 활용하여 괄호 짝을 검사하세요\n",
                "hints": ["스택에 여는 괄호를 push하고, 닫는 괄호를 만나면 pop하세요", "마지막에 스택이 비어있으면 올바른 괄호입니다"],
                "format": "baekjoon",
                "difficulty_level": "medium",
                "tags": ["스택", "문자열"],
                "time_limit_ms": 1000,
                "memory_limit_mb": 256,
            },
            {
                "id": 2,
                "title": "큐를 이용한 프린터",
                "description": "프린터 큐에 문서가 들어있습니다. 각 문서는 중요도를 가지며, 현재 큐에서 가장 중요도가 높은 문서부터 인쇄합니다. 내가 인쇄를 요청한 문서가 몇 번째로 인쇄되는지 구하세요.",
                "input_description": "첫 줄: 문서 수 N, 요청 문서 위치 M (0-indexed)\n둘째 줄: N개 문서의 중요도 (1~9)",
                "output_description": "요청 문서가 인쇄되는 순서",
                "constraints": "1 ≤ N ≤ 100, 0 ≤ M < N",
                "examples": [
                    {"input": "6 0\n1 1 9 1 1 1", "output": "5"},
                    {"input": "4 2\n1 2 3 4", "output": "2"},
                ],
                "test_cases": [
                    {"input": "1 0\n5", "output": "1"},
                    {"input": "3 1\n3 3 3", "output": "2"},
                ],
                "starter_code": "from collections import deque\n\n# 입력 처리\nn, m = map(int, input().split())\npriorities = list(map(int, input().split()))\n\n# 큐를 이용해 인쇄 순서를 구하세요\n",
                "hints": ["deque를 사용하세요", "max()로 현재 큐에서 가장 높은 중요도를 확인하세요"],
                "format": "baekjoon",
                "difficulty_level": "medium",
                "tags": ["큐", "시뮬레이션"],
                "time_limit_ms": 1000,
                "memory_limit_mb": 256,
            },
        ],
    },
    {
        "_course_key": "data_structure",
        "_key": "ds_algo1",
        "title": "정렬 알고리즘 비교",
        "topic": "다양한 정렬 알고리즘 구현 및 성능 비교",
        "type": "coding",
        "status": "draft",
        "language": "python",
        "ai_policy": "normal",
        "generation_status": "completed",
        "problems": [
            {
                "id": 1,
                "title": "버블 정렬 구현",
                "description": "N개의 정수가 주어졌을 때, 버블 정렬을 이용하여 오름차순으로 정렬한 결과를 출력하세요.",
                "input_description": "첫 줄: 정수 N (1 ≤ N ≤ 1000)\n둘째 줄: N개의 정수",
                "output_description": "정렬된 정수를 공백으로 구분하여 출력",
                "constraints": "1 ≤ N ≤ 1000, -10000 ≤ 각 정수 ≤ 10000",
                "examples": [
                    {"input": "5\n5 3 8 1 2", "output": "1 2 3 5 8"},
                ],
                "test_cases": [
                    {"input": "1\n42", "output": "42"},
                    {"input": "3\n3 2 1", "output": "1 2 3"},
                ],
                "starter_code": "n = int(input())\narr = list(map(int, input().split()))\n\n# 버블 정렬을 구현하세요\n",
                "hints": ["이중 for문을 사용하세요", "인접한 두 원소를 비교하여 교환합니다"],
                "format": "baekjoon",
                "difficulty_level": "easy",
                "tags": ["정렬"],
                "time_limit_ms": 2000,
                "memory_limit_mb": 256,
            },
        ],
    },
]

# ── Notes (Tiptap JSON format) ───────────────────────────

def _p(text: str) -> dict:
    """Tiptap paragraph node helper."""
    return {"type": "paragraph", "content": [{"type": "text", "text": text}]}

def _h(text: str, level: int = 2) -> dict:
    """Tiptap heading node helper."""
    return {"type": "heading", "attrs": {"level": level}, "content": [{"type": "text", "text": text}]}

def _bold_text(text: str) -> dict:
    return {"type": "text", "text": text, "marks": [{"type": "bold"}]}

def _code(text: str) -> dict:
    return {"type": "text", "text": text, "marks": [{"type": "code"}]}

def _bullet_list(items: list[str]) -> dict:
    return {
        "type": "bulletList",
        "content": [
            {"type": "listItem", "content": [_p(item)]}
            for item in items
        ],
    }

def _code_block(code: str, language: str = "python") -> dict:
    return {
        "type": "codeBlock",
        "attrs": {"language": language},
        "content": [{"type": "text", "text": code}],
    }

NOTES = [
    {
        "_course_key": "python_intro",
        "_key": "note_py_basics",
        "title": "파이썬 기초 문법 정리",
        "content": {
            "type": "doc",
            "content": [
                _h("파이썬 기초 문법 정리", 1),
                _p("이번 주에 배운 파이썬 기본 문법을 정리합니다."),
                _h("1. 변수와 자료형"),
                _p("파이썬은 동적 타이핑 언어로, 변수를 선언할 때 타입을 명시하지 않아도 됩니다."),
                _code_block("# 변수 선언\nname = '피카버디'\nage = 20\nheight = 175.5\nis_student = True\n\nprint(type(name))    # <class 'str'>\nprint(type(age))     # <class 'int'>\nprint(type(height))  # <class 'float'>"),
                _h("2. 조건문"),
                _p("if, elif, else를 사용하여 분기를 처리합니다."),
                _code_block("score = 85\n\nif score >= 90:\n    grade = 'A'\nelif score >= 80:\n    grade = 'B'\nelif score >= 70:\n    grade = 'C'\nelse:\n    grade = 'F'\n\nprint(f'학점: {grade}')  # B"),
                _h("3. 반복문"),
                _bullet_list([
                    "for: 정해진 횟수만큼 반복",
                    "while: 조건이 참인 동안 반복",
                    "break: 반복 즉시 종료",
                    "continue: 현재 반복 건너뛰기",
                ]),
                _code_block("# 1부터 10까지 합 구하기\ntotal = 0\nfor i in range(1, 11):\n    total += i\nprint(f'합계: {total}')  # 55"),
                _h("4. 함수"),
                _p("def 키워드로 함수를 정의합니다. 재사용 가능한 코드 블록을 만들 수 있습니다."),
                _code_block("def greet(name, greeting='안녕하세요'):\n    return f'{greeting}, {name}님!'\n\nprint(greet('피카버디'))         # 안녕하세요, 피카버디님!\nprint(greet('피카버디', '반갑습니다'))  # 반갑습니다, 피카버디님!"),
            ],
        },
    },
    {
        "_course_key": "python_intro",
        "_key": "note_py_list",
        "title": "리스트와 딕셔너리 활용법",
        "content": {
            "type": "doc",
            "content": [
                _h("리스트와 딕셔너리", 1),
                _h("리스트 (List)"),
                _p("순서가 있는 변경 가능한 시퀀스입니다."),
                _code_block("fruits = ['사과', '바나나', '딸기']\nfruits.append('포도')\nfruits.insert(1, '오렌지')\nprint(fruits)  # ['사과', '오렌지', '바나나', '딸기', '포도']\n\n# 리스트 컴프리헨션\nsquares = [x**2 for x in range(1, 6)]\nprint(squares)  # [1, 4, 9, 16, 25]"),
                _h("딕셔너리 (Dictionary)"),
                _p("키-값 쌍으로 데이터를 저장합니다."),
                _code_block("student = {\n    'name': '피카버디',\n    'age': 20,\n    'courses': ['파이썬', '알고리즘']\n}\n\nprint(student['name'])  # 피카버디\nstudent['grade'] = 'A'  # 새 키 추가\n\n# 딕셔너리 순회\nfor key, value in student.items():\n    print(f'{key}: {value}')"),
                _h("실전 팁"),
                _bullet_list([
                    "리스트는 인덱스로 접근, 딕셔너리는 키로 접근",
                    "in 연산자로 포함 여부 확인 가능",
                    "리스트의 슬라이싱: fruits[1:3]",
                    "딕셔너리의 .get() 메서드로 안전하게 값 접근",
                ]),
            ],
        },
    },
    {
        "_course_key": "python_intro",
        "_key": "note_py_tips",
        "title": "코딩 실습 중 배운 꿀팁",
        "content": {
            "type": "doc",
            "content": [
                _h("코딩 꿀팁 모음", 1),
                _p("과제하면서 알게 된 유용한 팁들을 정리합니다."),
                _h("입출력 빠르게 하기"),
                _code_block("import sys\ninput = sys.stdin.readline  # 대량 입력 시 훨씬 빠름"),
                _h("f-string 포맷팅"),
                _code_block("name = 'World'\nprint(f'Hello, {name}!')      # Hello, World!\nprint(f'{3.14159:.2f}')        # 3.14\nprint(f'{42:05d}')             # 00042"),
                _h("유용한 내장 함수"),
                _bullet_list([
                    "enumerate(): 인덱스와 값을 동시에",
                    "zip(): 여러 리스트를 동시에 순회",
                    "sorted(): 원본 변경 없이 정렬된 새 리스트",
                    "map(): 모든 요소에 함수 적용",
                ]),
                _p("다음 시간에는 파일 입출력과 예외처리를 배울 예정!"),
            ],
        },
    },
    {
        "_course_key": "data_structure",
        "_key": "note_ds_stack",
        "title": "스택(Stack) 개념 정리",
        "content": {
            "type": "doc",
            "content": [
                _h("스택 (Stack)", 1),
                _p("LIFO (Last In, First Out) — 마지막에 들어간 것이 먼저 나옴"),
                _h("주요 연산"),
                _bullet_list([
                    "push(item): 스택 맨 위에 추가",
                    "pop(): 스택 맨 위 제거 및 반환",
                    "peek()/top(): 맨 위 요소 확인 (제거하지 않음)",
                    "isEmpty(): 비어있는지 확인",
                ]),
                _h("파이썬 구현"),
                _code_block("# 리스트로 스택 구현\nstack = []\nstack.append(1)  # push\nstack.append(2)\nstack.append(3)\nprint(stack.pop())  # 3 (LIFO)\nprint(stack[-1])    # 2 (peek)"),
                _h("활용 사례"),
                _bullet_list([
                    "괄호 짝 맞추기",
                    "브라우저 뒤로가기",
                    "함수 호출 스택",
                    "DFS (깊이 우선 탐색)",
                ]),
                _p("시간 복잡도: push/pop 모두 O(1)"),
            ],
        },
    },
    {
        "_course_key": "data_structure",
        "_key": "note_ds_complexity",
        "title": "시간 복잡도 Big-O 정리",
        "content": {
            "type": "doc",
            "content": [
                _h("시간 복잡도 (Big-O Notation)", 1),
                _p("알고리즘의 효율성을 표현하는 방법입니다."),
                _h("주요 복잡도 순서"),
                _p("O(1) < O(log n) < O(n) < O(n log n) < O(n^2) < O(2^n)"),
                _h("예시"),
                _code_block("# O(1) - 상수 시간\ndef get_first(arr):\n    return arr[0]\n\n# O(n) - 선형 시간\ndef find_max(arr):\n    max_val = arr[0]\n    for x in arr:\n        if x > max_val:\n            max_val = x\n    return max_val\n\n# O(n^2) - 이차 시간\ndef bubble_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        for j in range(n - 1 - i):\n            if arr[j] > arr[j+1]:\n                arr[j], arr[j+1] = arr[j+1], arr[j]"),
                _h("정렬 알고리즘 복잡도"),
                _bullet_list([
                    "버블 정렬: O(n^2)",
                    "삽입 정렬: O(n^2), 거의 정렬된 경우 O(n)",
                    "병합 정렬: O(n log n) - 항상 일정",
                    "퀵 정렬: 평균 O(n log n), 최악 O(n^2)",
                    "파이썬 내장 sorted(): O(n log n) - Tim sort",
                ]),
            ],
        },
    },
]

# ── Submissions (student's work on assignments) ─────────

SUBMISSIONS = [
    {
        "_assignment_key": "py_coding1",
        "_problem_index": 0,
        "code": "a, b = map(int, input().split())\nprint(a + b)",
        "status": "completed",
    },
    {
        "_assignment_key": "py_coding1",
        "_problem_index": 1,
        "code": "n = int(input())\nif n % 2 == 0:\n    print('Even')\nelse:\n    print('Odd')",
        "status": "completed",
    },
    {
        "_assignment_key": "py_writing1",
        "_problem_index": 0,
        "code": "",
        "content": {
            "type": "doc",
            "content": [
                _h("파이썬 학습 회고", 1),
                _p("파이썬을 배우기 시작한 지 벌써 한 달이 지났습니다. 처음에는 프로그래밍이라는 것 자체가 낯설었지만, 점점 코드를 작성하는 것이 재미있어지고 있습니다."),
                _p("가장 어려웠던 개념은 반복문이었습니다. 특히 for문에서 range()의 동작 방식이 헷갈렸는데, range(5)가 0부터 4까지라는 것을 이해하고 나서는 훨씬 수월해졌습니다. while문은 조건을 잘못 설정하면 무한 루프에 빠지기도 해서 조심해야 한다는 것도 배웠습니다."),
                _p("가장 재미있었던 실습은 구구단 출력 프로그램이었습니다. 이중 for문을 사용해서 전체 구구단을 예쁘게 출력하는 것이 뿌듯했습니다. f-string을 활용하면 출력 형식을 깔끔하게 만들 수 있다는 것도 알게 되었습니다."),
                _p("앞으로는 간단한 텍스트 기반 게임을 만들어보고 싶습니다. 숫자 맞추기 게임이나 가위바위보 같은 것부터 시작해서, 나중에는 할일 관리 프로그램도 만들어보고 싶습니다."),
            ],
        },
        "status": "completed",
        "char_count": 520,
    },
    {
        "_assignment_key": "py_coding1",
        "_problem_index": 2,
        "code": "n = int(input())\nfor i in range(1, 10):\n    print(f'{n} * {i} = {n*i}')",
        "status": "completed",
    },
    {
        "_assignment_key": "py_quiz1",
        "_problem_index": 0,
        "code": "",
        "content": {
            "type": "doc",
            "content": [
                _p("1번: x = 5 (정답: 1번 선택)"),
                _p("2번: <class 'float'> (정답: 1번 선택)"),
                _p("3번: len"),
                _p("4번: 0부터 4까지 (정답: 2번 선택)"),
                _p("5번: 리스트는 변경 가능(mutable)하며 대괄호[]로 생성합니다. 데이터의 추가나 삭제가 필요한 경우에 사용합니다. 예를 들어 학생 명단처럼 계속 변경되는 데이터에 적합합니다. 튜플은 변경 불가능(immutable)하며 소괄호()로 생성합니다. 좌표 (x, y)나 RGB 값 (255, 0, 0)처럼 한번 정하면 바뀌면 안 되는 데이터에 사용합니다."),
            ],
        },
        "status": "completed",
        "char_count": 350,
    },
    {
        "_assignment_key": "ds_coding1",
        "_problem_index": 0,
        "code": "s = input()\nstack = []\nresult = 'YES'\nfor c in s:\n    if c == '(':\n        stack.append(c)\n    else:\n        if not stack:\n            result = 'NO'\n            break\n        stack.pop()\nif stack:\n    result = 'NO'\nprint(result)",
        "status": "completed",
    },
]

# ── AI Analyses (pre-made for submissions) ───────────────

AI_ANALYSES = [
    {
        "_assignment_key": "py_coding1",
        "_problem_index": 0,
        "score": 100,
        "feedback": "정확한 풀이입니다! map()과 split()을 적절히 활용하여 간결하게 작성했습니다. 입력 처리와 출력 모두 올바릅니다.",
    },
    {
        "_assignment_key": "py_coding1",
        "_problem_index": 1,
        "score": 100,
        "feedback": "나머지 연산자(%)를 활용한 정확한 풀이입니다. 조건문 구조가 깔끔하고, 음수에 대해서도 올바르게 동작합니다.",
    },
    {
        "_assignment_key": "py_writing1",
        "_problem_index": 0,
        "score": 85,
        "feedback": "학습 과정을 잘 돌아보고 진솔하게 작성했습니다. 어려웠던 점과 재미있었던 점을 구체적으로 서술한 점이 좋습니다. 앞으로의 계획도 현실적입니다. 다만, 코드 예시를 포함하여 설명하면 더 풍부한 회고가 될 수 있습니다.",
    },
    {
        "_assignment_key": "ds_coding1",
        "_problem_index": 0,
        "score": 95,
        "feedback": "스택을 활용한 올바른 풀이입니다. 빈 스택에서 pop하는 예외 상황도 잘 처리했습니다. 개선 제안: break 후 남은 문자를 처리하지 않아도 되므로 효율적입니다. 변수명을 'is_valid' 같은 의미 있는 이름으로 바꾸면 가독성이 더 좋아집니다.",
    },
    {
        "_assignment_key": "py_coding1",
        "_problem_index": 2,
        "score": 100,
        "feedback": "for 반복문과 f-string을 정확히 활용하여 구구단을 깔끔하게 출력했습니다. range(1, 10)의 범위 설정도 올바릅니다.",
    },
    {
        "_assignment_key": "py_quiz1",
        "_problem_index": 0,
        "score": 90,
        "feedback": "5문제 중 4문제를 맞혔습니다. 객관식 문제를 잘 풀었고, 단답형(len)도 정확히 답했습니다. 서술형 답변에서 리스트와 튜플의 차이를 설명했으나, 불변성의 의미를 조금 더 구체적으로 서술하면 더 좋겠습니다.",
    },
]


# ── Messages (teacher ↔ student conversations) ──────────

MESSAGES = [
    # ── python_intro 강의 메시지 ──
    {
        "_course_key": "python_intro",
        "_sender": "teacher",
        "_receiver": "student",
        "content": "이학생님, 파이썬 프로그래밍 입문 수업에 오신 것을 환영합니다! 궁금한 점이 있으면 언제든 메시지 보내주세요 😊",
        "is_read": True,
    },
    {
        "_course_key": "python_intro",
        "_sender": "student",
        "_receiver": "teacher",
        "content": "안녕하세요 교수님! 반갑습니다. 프로그래밍은 처음이라 열심히 해보겠습니다!",
        "is_read": True,
    },
    {
        "_course_key": "python_intro",
        "_sender": "teacher",
        "_receiver": "student",
        "content": "첫 번째 과제 '변수와 연산자 실습'을 올렸습니다. 세 문제인데, 어렵지 않으니 천천히 풀어보세요. 힌트도 제공되니 참고하시고요!",
        "is_read": True,
    },
    {
        "_course_key": "python_intro",
        "_sender": "student",
        "_receiver": "teacher",
        "content": "교수님, 두 수의 합 문제는 풀었는데 구구단 출력에서 f-string 사용법이 좀 헷갈립니다. 혹시 힌트 좀 주실 수 있을까요?",
        "is_read": True,
    },
    {
        "_course_key": "python_intro",
        "_sender": "teacher",
        "_receiver": "student",
        "content": "f-string은 f'{변수}' 형태로 사용하면 됩니다. 예를 들어 n=3, i=2라면 f'{n} * {i} = {n*i}'는 '3 * 2 = 6'이 됩니다. 한번 해보세요!",
        "is_read": True,
    },
    {
        "_course_key": "python_intro",
        "_sender": "student",
        "_receiver": "teacher",
        "content": "아, 이해됐습니다! 감사합니다 교수님. 세 문제 다 풀어서 제출했어요!",
        "is_read": True,
    },
    {
        "_course_key": "python_intro",
        "_sender": "teacher",
        "_receiver": "student",
        "content": "잘 하셨네요! AI 분석 결과도 확인해보세요. 다음 주 퀴즈도 잘 준비하세요 💪",
        "is_read": False,
    },
    # ── data_structure 강의 메시지 ──
    {
        "_course_key": "data_structure",
        "_sender": "teacher",
        "_receiver": "student",
        "content": "데이터구조와 알고리즘 수업 시작합니다. 이번 학기에는 스택, 큐, 트리, 그래프를 다룰 예정입니다.",
        "is_read": True,
    },
    {
        "_course_key": "data_structure",
        "_sender": "student",
        "_receiver": "teacher",
        "content": "교수님, 스택과 큐 과제 중 '괄호 짝 맞추기' 문제를 풀었습니다. 빈 문자열 케이스도 처리해야 하는 건가요?",
        "is_read": True,
    },
    {
        "_course_key": "data_structure",
        "_sender": "teacher",
        "_receiver": "student",
        "content": "네, 빈 문자열은 올바른 괄호 문자열로 처리합니다 (YES 출력). 잘 생각하셨네요! 엣지 케이스를 고려하는 습관이 중요합니다.",
        "is_read": True,
    },
    {
        "_course_key": "data_structure",
        "_sender": "student",
        "_receiver": "teacher",
        "content": "프린터 큐 문제가 좀 어렵습니다... deque를 어떻게 활용해야 할지 감이 안 잡혀요.",
        "is_read": False,
    },
]


# ── Note Comments (teacher comments on student notes) ────

NOTE_COMMENTS = [
    # ── note_py_basics 댓글 ──
    {
        "_note_key": "note_py_basics",
        "_user": "teacher",
        "block_index": 0,
        "content": "문법 정리를 잘 해두셨네요! 복습할 때 아주 유용할 겁니다.",
    },
    {
        "_note_key": "note_py_basics",
        "_user": "teacher",
        "block_index": 4,
        "content": "코드 예시가 깔끔합니다. 각 타입별로 예시를 넣은 점이 좋아요.",
    },
    {
        "_note_key": "note_py_basics",
        "_user": "student",
        "block_index": 4,
        "content": "감사합니다! 나중에 bool 타입도 추가해야겠어요.",
        "_parent_index": 1,  # index in this list (0-based) to reference parent
    },
    # ── note_py_list 댓글 ──
    {
        "_note_key": "note_py_list",
        "_user": "teacher",
        "block_index": 2,
        "content": "리스트 컴프리헨션을 잘 이해하고 있네요. 조건부 컴프리헨션도 정리해두면 좋겠습니다: [x for x in range(10) if x % 2 == 0]",
    },
    # ── note_ds_stack 댓글 ──
    {
        "_note_key": "note_ds_stack",
        "_user": "teacher",
        "block_index": 0,
        "content": "LIFO 개념을 정확히 이해했습니다. 실제 메모리의 콜 스택과 연관지어 생각해보면 더 좋습니다.",
    },
    {
        "_note_key": "note_ds_stack",
        "_user": "teacher",
        "block_index": 5,
        "content": "리스트로 스택을 구현할 때 append/pop의 시간 복잡도가 O(1)인 이유도 함께 정리해보세요.",
        "is_resolved": True,
    },
    {
        "_note_key": "note_ds_stack",
        "_user": "student",
        "block_index": 5,
        "content": "내부적으로 동적 배열이라서 끝에 추가/삭제는 O(1)이 맞죠? 정리해두겠습니다!",
        "_parent_index": 5,
    },
    # ── note_ds_complexity 댓글 ──
    {
        "_note_key": "note_ds_complexity",
        "_user": "teacher",
        "block_index": 3,
        "content": "Big-O 표기법 정리가 잘 되어있습니다. 공간 복잡도도 함께 정리하면 완벽할 거예요!",
    },
]


# ── Gamification Data ────────────────────────────────────

GAMIFICATION = {
    "student_exp": {
        "total_exp": 1250,
        "tier": "tree_iii",
    },
    "teacher_exp": {
        "total_exp": 800,
        "tier": "sprout_ii",
    },
    "student_badges": [
        "first_submission",
        "first_perfect",
        "note_taker",
        "streak_3",
        "fast_learner",
    ],
    "teacher_badges": [
        "first_course",
        "first_feedback",
    ],
}

# Badges to ensure exist in DB before assigning them
BADGES = [
    {
        "id": "first_submission",
        "name": "첫 제출",
        "description": "처음으로 과제를 제출했습니다",
        "condition_type": "submission_count",
        "condition_value": 1,
    },
    {
        "id": "first_perfect",
        "name": "만점!",
        "description": "AI 분석에서 100점을 받았습니다",
        "condition_type": "perfect_score_count",
        "condition_value": 1,
    },
    {
        "id": "note_taker",
        "name": "노트 작성자",
        "description": "노트를 3개 이상 작성했습니다",
        "condition_type": "note_count",
        "condition_value": 3,
    },
    {
        "id": "streak_3",
        "name": "3일 연속 학습",
        "description": "3일 연속으로 활동했습니다",
        "condition_type": "streak_days",
        "condition_value": 3,
    },
    {
        "id": "fast_learner",
        "name": "빠른 학습자",
        "description": "하루에 과제 3개를 제출했습니다",
        "condition_type": "daily_submission_count",
        "condition_value": 3,
    },
    {
        "id": "first_course",
        "name": "첫 강의 개설",
        "description": "처음으로 강의를 개설했습니다",
        "condition_type": "course_created_count",
        "condition_value": 1,
    },
    {
        "id": "first_feedback",
        "name": "첫 피드백",
        "description": "학생 노트에 첫 코멘트를 작성했습니다",
        "condition_type": "comment_count",
        "condition_value": 1,
    },
]
