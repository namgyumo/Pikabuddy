"""
PikaBuddy Token QA v2 — 4-variant measurement
===============================================
각 기능별로 사용자 입력 품질 x 길이 4가지 변형을 측정한다.

  A) 짧고 구조화된 입력 (short_clean)
  B) 길고 구조화된 입력 (long_clean)
  C) 짧고 엉망인 입력  (short_messy)
  D) 길고 엉망인 입력  (long_messy)

Usage:
    cd backend
    PYTHONIOENCODING=utf-8 python token_qa_v2.py
"""
import json, time, sys, os
sys.path.insert(0, os.path.dirname(__file__))

from common.gemini_client import get_gemini_model, MODEL_HEAVY, MODEL_LIGHT, PRICING

def calc_cost(model: str, inp: int, out: int) -> float:
    p = PRICING.get(model, {"input": 0.30, "output": 2.50})
    return (inp / 1_000_000) * p["input"] + (out / 1_000_000) * p["output"]

def measure(model_name: str, prompt: str, label: str, json_mode: bool = False) -> dict:
    model = get_gemini_model(model_name, json_mode=json_mode)
    t0 = time.time()
    resp = model.generate_content(prompt)
    elapsed = time.time() - t0
    meta = resp.usage_metadata
    inp = meta.prompt_token_count or 0
    out = meta.candidates_token_count or 0
    cost = calc_cost(model_name, inp, out)
    return {
        "label": label, "model": model_name,
        "input_tokens": inp, "output_tokens": out, "total_tokens": inp + out,
        "cost_usd": round(cost, 8), "elapsed_sec": round(elapsed, 2),
    }

# ════════════════════════════════════════════
#  테스트 데이터 정의
# ════════════════════════════════════════════

# ── 튜터 질문 ──────────────────────────────

TUTOR_BASE = """You are a Socratic AI tutor. Guide the student to discover answers through questions.

Rules:
1. Do not give direct answers — ask thought-provoking questions instead.
2. Ask only ONE question at a time.
3. Match the student's current understanding level.
4. Use a warm, encouraging tone.
5. When the student is stuck, give hints but NEVER provide the solution code.
6. Assess the student's progress by comparing their code against the starter code.

Exception — Pure concept/theory questions:
If the student asks about a concept or term, explain clearly WITHOUT Socratic questioning.

IMPORTANT: Write the entire output in Korean."""

TUTOR_VARIANTS = {
    "short_clean": {
        "desc": "짧고 명확한 질문, 깔끔한 코드",
        "code": """```python
def two_sum(nums, target):
    for i in range(len(nums)):
        for j in range(i+1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
```""",
        "question": "이 코드가 O(n^2)인데, 해시맵을 쓰면 O(n)으로 줄일 수 있다고 들었어요. 어떤 원리인가요?"
    },
    "long_clean": {
        "desc": "긴 코드 + 상세한 맥락 설명이 포함된 질문",
        "code": """```python
import sys
from collections import deque

def bfs_shortest_path(graph, start, end):
    \"\"\"BFS를 사용하여 최단 경로를 찾는 함수\"\"\"
    if start == end:
        return [start]

    visited = set()
    queue = deque([(start, [start])])
    visited.add(start)

    while queue:
        current, path = queue.popleft()

        for neighbor in graph.get(current, []):
            if neighbor == end:
                return path + [neighbor]
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, path + [neighbor]))

    return None  # 경로 없음

def dfs_all_paths(graph, start, end, path=None):
    \"\"\"DFS를 사용하여 모든 가능한 경로를 찾는 함수\"\"\"
    if path is None:
        path = []
    path = path + [start]

    if start == end:
        return [path]

    if start not in graph:
        return []

    paths = []
    for neighbor in graph[start]:
        if neighbor not in path:  # 사이클 방지
            new_paths = dfs_all_paths(graph, neighbor, end, path)
            paths.extend(new_paths)
    return paths

def dijkstra(graph, start):
    \"\"\"다익스트라 알고리즘으로 최단 거리 계산\"\"\"
    distances = {node: float('inf') for node in graph}
    distances[start] = 0
    visited = set()

    while len(visited) < len(graph):
        # 방문하지 않은 노드 중 최소 거리 노드 선택
        current = None
        for node in graph:
            if node not in visited:
                if current is None or distances[node] < distances[current]:
                    current = node

        if current is None or distances[current] == float('inf'):
            break

        visited.add(current)

        for neighbor, weight in graph[current].items():
            new_dist = distances[current] + weight
            if new_dist < distances[neighbor]:
                distances[neighbor] = new_dist

    return distances

# 테스트
graph_unweighted = {
    'A': ['B', 'C'],
    'B': ['A', 'D', 'E'],
    'C': ['A', 'F'],
    'D': ['B'],
    'E': ['B', 'F'],
    'F': ['C', 'E']
}

graph_weighted = {
    'A': {'B': 4, 'C': 2},
    'B': {'A': 4, 'D': 3, 'E': 1},
    'C': {'A': 2, 'F': 5},
    'D': {'B': 3},
    'E': {'B': 1, 'F': 2},
    'F': {'C': 5, 'E': 2}
}

print("BFS 최단경로:", bfs_shortest_path(graph_unweighted, 'A', 'F'))
print("DFS 모든경로:", dfs_all_paths(graph_unweighted, 'A', 'F'))
print("다익스트라:", dijkstra(graph_weighted, 'A'))
```""",
        "question": """저는 지금 그래프 탐색 알고리즘을 공부하고 있는데요, BFS, DFS, 다익스트라 세 가지를 구현했습니다.
궁금한 점이 있어요:
1. BFS에서 deque 대신 일반 리스트를 쓰면 시간복잡도가 어떻게 달라지나요?
2. 다익스트라 함수에서 우선순위 큐(heapq)를 쓰지 않고 매번 최소값을 찾고 있는데, 이러면 O(V^2)이 맞나요?
3. 음의 가중치가 있으면 다익스트라가 안 된다고 하는데, 왜 안 되는지 예시를 들어서 설명해주실 수 있나요?"""
    },
    "short_messy": {
        "desc": "짧고 두루뭉술한 질문, 코드 없음",
        "code": """```python
a = [3,1,2]
a.sort()
print(a)
```""",
        "question": "이거 왜 됨?? sort가 뭔데 그냥 되는거임??"
    },
    "long_messy": {
        "desc": "긴 스파게티 코드 + 두루뭉술하고 장황한 질문",
        "code": """```python
n = int(input())
a = list(map(int, input().split()))
t = int(input())
ok = False
for i in range(n):
    for j in range(n):
        if i != j:
            if a[i] + a[j] == t:
                print(i, j)
                ok = True
                break
    if ok:
        break
if not ok:
    print(-1)

# 다른 방법으로도 해봤는데
d = {}
for i in range(len(a)):
    d[a[i]] = i

for i in range(len(a)):
    x = t - a[i]
    if x in d:
        if d[x] != i:
            print(i, d[x])
            break

# 이것도 해봄
def solve(nums, target):
    seen = {}
    for i, v in enumerate(nums):
        comp = target - v
        if comp in seen:
            return [seen[comp], i]
        seen[v] = i
    return [-1, -1]

res = solve(a, t)
print(res)

# 근데 이거 셋 다 답이 다르게 나올때가 있음;;
# 첫번째는 break 때문에 먼저 나오는거 출력하고
# 두번째는 딕셔너리라 순서가 다를수 있고
# 세번째는 또 다르게 나오는데 뭐가 맞는건지 모르겠음
```""",
        "question": """아 교수님 저 진짜 모르겠어요ㅠㅠ 투포인터인지 해시맵인지 브루트포스인지 셋 다 해봤는데 답이 다 다르게 나와요.. 첫번째꺼는 되는것 같은데 두번째꺼는 좀 이상하고 세번째꺼는 인터넷에서 봤는데 왜 되는지 모르겠고.. 그리고 시간복잡도도 각각 다르다는건 알겠는데 정확히 뭐가 다른건지.. 아 그리고 이 문제 제출하면 시간초과 뜨는데 첫번째꺼 말고 다른걸로 내야하는건가요? 근데 두번째세번째는 답이 이상해서;;"""
    },
}

# ── 코드 분석 ──────────────────────────────

CODE_ANALYSIS_BASE = """You are a friendly coding tutor. Analyze the student's code and provide feedback.

Assignment: {title} / Topic: {topic}
Rubric: {{"criteria": [{criteria}]}}

=== AI Policy ===
Normal mode - Pastes are detected; excessive pasting is a deduction factor.

=== Grading Criteria ===
Normal grading - Balanced grading. Praise strengths but also clearly point out weaknesses.

=== Paste Analysis ===
{paste_info}

Student submitted code:
```python
{code}
```

Coding snapshots: {snapshots}

Write in Markdown. Use ## for sections, ### for subsections, **bold** for keywords, - for lists.

## 🤖 피카버디의 추천 점수는 **[0~100점]점**이에요!
## 📝 종합 피드백
## 🔍 로직 분석
## ✨ 코드 품질
## 📋 복붙 분석
## 💡 개선 제안

IMPORTANT: Write the entire output in Korean."""

CODE_VARIANTS = {
    "short_clean": {
        "desc": "짧고 깔끔한 코드 (~10줄)",
        "title": "리스트 정렬 구현",
        "topic": "sorting algorithms",
        "criteria": '"name": "정확성", "weight": 40}, {"name": "효율성", "weight": 30}, {"name": "코드 품질", "weight": 30',
        "paste_info": "외부 복붙: 없음",
        "snapshots": 15,
        "code": """def insertion_sort(arr):
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key
    return arr

print(insertion_sort([64, 34, 25, 12, 22, 11, 90]))""",
    },
    "long_clean": {
        "desc": "길고 구조화된 코드 (~80줄, 클래스/독스트링/타입힌트 포함)",
        "title": "연결 리스트 구현",
        "topic": "data structures - linked list",
        "criteria": '"name": "정확성", "weight": 30}, {"name": "효율성", "weight": 20}, {"name": "코드 품질", "weight": 25}, {"name": "설계", "weight": 25',
        "paste_info": "외부 복붙: 없음",
        "snapshots": 42,
        "code": """from typing import Optional, Any

class Node:
    \"\"\"연결 리스트의 노드\"\"\"
    def __init__(self, data: Any, next_node: Optional['Node'] = None):
        self.data = data
        self.next = next_node

    def __repr__(self) -> str:
        return f"Node({self.data})"

class LinkedList:
    \"\"\"단일 연결 리스트 구현\"\"\"
    def __init__(self):
        self.head: Optional[Node] = None
        self._size: int = 0

    def __len__(self) -> int:
        return self._size

    def __repr__(self) -> str:
        nodes = []
        current = self.head
        while current:
            nodes.append(str(current.data))
            current = current.next
        return " -> ".join(nodes) + " -> None"

    def append(self, data: Any) -> None:
        \"\"\"리스트 끝에 노드 추가\"\"\"
        new_node = Node(data)
        if not self.head:
            self.head = new_node
        else:
            current = self.head
            while current.next:
                current = current.next
            current.next = new_node
        self._size += 1

    def prepend(self, data: Any) -> None:
        \"\"\"리스트 앞에 노드 추가\"\"\"
        new_node = Node(data, self.head)
        self.head = new_node
        self._size += 1

    def insert_at(self, index: int, data: Any) -> None:
        \"\"\"특정 인덱스에 노드 삽입\"\"\"
        if index < 0 or index > self._size:
            raise IndexError(f"Index {index} out of range for size {self._size}")
        if index == 0:
            self.prepend(data)
            return
        current = self.head
        for _ in range(index - 1):
            current = current.next
        new_node = Node(data, current.next)
        current.next = new_node
        self._size += 1

    def delete(self, data: Any) -> bool:
        \"\"\"값으로 노드 삭제. 삭제 성공 시 True 반환\"\"\"
        if not self.head:
            return False
        if self.head.data == data:
            self.head = self.head.next
            self._size -= 1
            return True
        current = self.head
        while current.next:
            if current.next.data == data:
                current.next = current.next.next
                self._size -= 1
                return True
            current = current.next
        return False

    def search(self, data: Any) -> Optional[int]:
        \"\"\"값의 인덱스 반환. 없으면 None\"\"\"
        current = self.head
        index = 0
        while current:
            if current.data == data:
                return index
            current = current.next
            index += 1
        return None

    def reverse(self) -> None:
        \"\"\"리스트를 제자리에서 뒤집기\"\"\"
        prev = None
        current = self.head
        while current:
            next_node = current.next
            current.next = prev
            prev = current
            current = next_node
        self.head = prev

    def to_list(self) -> list:
        \"\"\"파이썬 리스트로 변환\"\"\"
        result = []
        current = self.head
        while current:
            result.append(current.data)
            current = current.next
        return result

# 테스트
ll = LinkedList()
for val in [10, 20, 30, 40, 50]:
    ll.append(val)
print(f"초기: {ll}")
print(f"길이: {len(ll)}")

ll.prepend(5)
print(f"prepend(5): {ll}")

ll.insert_at(3, 25)
print(f"insert_at(3, 25): {ll}")

ll.delete(30)
print(f"delete(30): {ll}")

print(f"search(40): index={ll.search(40)}")
print(f"search(99): index={ll.search(99)}")

ll.reverse()
print(f"reverse: {ll}")
print(f"to_list: {ll.to_list()}")""",
    },
    "short_messy": {
        "desc": "짧고 엉망인 코드 (변수명 의미없음, 하드코딩)",
        "title": "피보나치 수열 구현",
        "topic": "recursion and dynamic programming",
        "criteria": '"name": "정확성", "weight": 40}, {"name": "효율성", "weight": 30}, {"name": "코드 품질", "weight": 30',
        "paste_info": "외부 복붙 의심: 1회 (7초 내 40자 입력)",
        "snapshots": 3,
        "code": """def f(x):
    if x==0: return 0
    if x==1: return 1
    return f(x-1)+f(x-2)
for i in range(10): print(f(i))""",
    },
    "long_messy": {
        "desc": "길고 엉망인 코드 (중복, 데드코드, 매직넘버, 전역변수 남용)",
        "title": "학생 성적 관리 시스템",
        "topic": "OOP and data management",
        "criteria": '"name": "정확성", "weight": 30}, {"name": "효율성", "weight": 20}, {"name": "코드 품질", "weight": 25}, {"name": "설계", "weight": 25',
        "paste_info": "외부 복붙 의심: 3회 (각각 5초 내 대량 입력)",
        "snapshots": 8,
        "code": """students = []
names = []
scores = []
grades = []

def add(n, s):
    students.append(n)
    names.append(n)
    scores.append(s)
    if s >= 90:
        grades.append('A')
    elif s >= 80:
        grades.append('B')
    elif s >= 70:
        grades.append('C')
    elif s >= 60:
        grades.append('D')
    else:
        grades.append('F')

def show():
    for i in range(len(students)):
        print(students[i], scores[i], grades[i])

def avg():
    total = 0
    for i in range(len(scores)):
        total = total + scores[i]
    return total / len(scores)

def best():
    m = 0
    mi = 0
    for i in range(len(scores)):
        if scores[i] > m:
            m = scores[i]
            mi = i
    return students[mi]

def worst():
    m = 999
    mi = 0
    for i in range(len(scores)):
        if scores[i] < m:
            m = scores[i]
            mi = i
    return students[mi]

# 검색
def find(n):
    for i in range(len(students)):
        if students[i] == n:
            return i
    return -1

def delete(n):
    i = find(n)
    if i != -1:
        students.pop(i)
        names.pop(i)
        scores.pop(i)
        grades.pop(i)
        return True
    return False

def update(n, s):
    i = find(n)
    if i != -1:
        scores[i] = s
        if s >= 90:
            grades[i] = 'A'
        elif s >= 80:
            grades[i] = 'B'
        elif s >= 70:
            grades[i] = 'C'
        elif s >= 60:
            grades[i] = 'D'
        else:
            grades[i] = 'F'

def sort_by_score():
    # 버블소트로 정렬
    temp_s = scores.copy()
    temp_n = students.copy()
    temp_g = grades.copy()
    for i in range(len(temp_s)):
        for j in range(len(temp_s)-1):
            if temp_s[j] < temp_s[j+1]:
                temp_s[j], temp_s[j+1] = temp_s[j+1], temp_s[j]
                temp_n[j], temp_n[j+1] = temp_n[j+1], temp_n[j]
                temp_g[j], temp_g[j+1] = temp_g[j+1], temp_g[j]
    for i in range(len(temp_s)):
        print(temp_n[i], temp_s[i], temp_g[i])

def stats():
    a = avg()
    print("평균:", a)
    print("최고:", best())
    print("최저:", worst())
    cnt = {'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0}
    for g in grades:
        cnt[g] = cnt[g] + 1
    print("등급 분포:", cnt)

add("김철수", 95)
add("이영희", 82)
add("박민수", 67)
add("최지현", 91)
add("정다은", 45)
add("강현우", 78)
add("윤서연", 88)
add("임준혁", 53)

show()
print("---")
stats()
print("---")
sort_by_score()
update("박민수", 75)
delete("정다은")
print("---삭제/수정 후---")
show()""",
    },
}

# ── 노트 질문 ──────────────────────────────

NOTE_ASK_BASE = """You are a friendly AI study helper. A student asked a question while writing notes.

Rules:
1. Answer ONLY the asked question. Do not analyze or summarize the entire note.
2. Explain the core concept concisely in 2-4 sentences.
3. Provide at most 1 short example if needed.
4. Use Markdown freely (**bold**, - lists, etc.).
5. Answer the question directly without referencing the note context.

[Student note context]
{note}

Student question: {question}

IMPORTANT: Write the entire output in Korean.
Answer:"""

NOTE_ASK_VARIANTS = {
    "short_clean": {
        "desc": "짧고 구조화된 노트 + 명확한 질문",
        "note": """# 파이썬 자료구조
## 리스트 (List)
- 순서가 있는 가변 자료형
- `append()`, `pop()`, `insert()` 메서드
- 인덱싱: `arr[0]`, 슬라이싱: `arr[1:3]`

## 딕셔너리 (Dict)
- 키-값 쌍으로 저장
- `keys()`, `values()`, `items()` 메서드
- 해시 테이블 기반""",
        "question": "딕셔너리에서 키가 중복되면 어떻게 되나요?",
    },
    "long_clean": {
        "desc": "길고 상세한 노트 + 심화 질문",
        "note": """# 운영체제 - 프로세스와 스레드

## 1. 프로세스 (Process)
### 정의
- 실행 중인 프로그램의 인스턴스
- 독립된 메모리 공간 (Code, Data, Stack, Heap)
- OS에 의해 관리되는 독립 실행 단위

### 프로세스 상태
- **New**: 생성 중
- **Ready**: CPU 할당 대기
- **Running**: CPU에서 실행 중
- **Waiting**: I/O 등 이벤트 대기
- **Terminated**: 실행 완료

### 컨텍스트 스위칭
- 프로세스 전환 시 현재 상태를 PCB에 저장
- 오버헤드: 레지스터 저장/복원, TLB 플러시, 캐시 미스
- 비용: 보통 수 마이크로초 ~ 수십 마이크로초

## 2. 스레드 (Thread)
### 정의
- 프로세스 내에서 실행되는 경량 실행 단위
- 같은 프로세스의 스레드끼리 메모리 공유 (Code, Data, Heap)
- 각 스레드는 독립 Stack 보유

### 멀티스레딩 장점
- 프로세스보다 생성/전환 비용이 적음
- 메모리 공유로 통신 효율적
- 병렬 처리로 응답성 향상

### 멀티스레딩 문제점
- **Race Condition**: 공유 자원 동시 접근 시 결과 비결정적
- **Deadlock**: 두 스레드가 서로의 자원을 기다리며 영원히 대기
- **Priority Inversion**: 높은 우선순위 스레드가 낮은 우선순위에 의해 차단

## 3. 동기화 도구
### Mutex (뮤텍스)
- 임계영역에 하나의 스레드만 진입 허용
- `lock()` / `unlock()` 연산
- 소유권 개념 존재 (잠근 스레드만 해제 가능)

### Semaphore (세마포어)
- 카운팅 세마포어: N개 스레드 동시 접근 허용
- 이진 세마포어 ≈ 뮤텍스 (but 소유권 없음)
- `wait()` (P 연산) / `signal()` (V 연산)

### Monitor
- 뮤텍스 + 조건 변수를 결합한 고수준 동기화
- Java의 `synchronized`, Python의 `threading.Condition`

## 4. 프로세스 간 통신 (IPC)
- **파이프**: 단방향 통신, 부모-자식 프로세스 간
- **메시지 큐**: 커널이 관리하는 메시지 버퍼
- **공유 메모리**: 가장 빠르지만 동기화 필요
- **소켓**: 네트워크를 통한 프로세스 간 통신

## 5. 스케줄링 알고리즘
- **FCFS**: 먼저 온 프로세스 먼저 실행 (비선점)
- **SJF**: 가장 짧은 작업 먼저 (최적이나 실현 어려움)
- **Round Robin**: 타임 슬라이스 단위로 순환 (선점)
- **Priority**: 우선순위 기반 (기아 문제 → Aging 해결)
- **MLFQ**: 다단계 피드백 큐 (실용적)""",
        "question": "뮤텍스와 이진 세마포어가 거의 같다고 했는데, 그러면 실제로 어떤 상황에서 뮤텍스를 쓰고 어떤 상황에서 세마포어를 쓰나요? 그리고 Python의 threading 모듈에서는 둘 다 지원하나요?",
    },
    "short_messy": {
        "desc": "짧고 엉망인 노트 + 모호한 질문",
        "note": """파이썬 자료구조
리스트 - 순서있음 append pop
딕셔너리 - 키값 {}
튜플 - 변경불가 ()
셋 - 중복없음""",
        "question": "근데 이거 다 비슷한거 아님?? 뭘 언제 써야되는지 모르겠음",
    },
    "long_messy": {
        "desc": "길고 엉망인 노트 (오타, 비문, 혼란스러운 구조) + 장황한 질문",
        "note": """운영체제 수업 필기

프로세스는 프로그램이 실행되는거
스레드는 프로세스 안에서 돌아가는 작은거
근데 프로세스가 메모리를 갖고있고 스레드는 공유한다고함
공유하면 좋은점이 빠르다? 근데 문제도 있음
레이스 컨디션이라고 두개가 동시에 접근하면 문제
데드락은 서로 기다리는거
뮤텍스 세마포어 모니터 이런걸로 해결
뮤텍스는 하나만 들어갈수있고
세마포어는 여러개 들어갈수있고
모니터는 자바에서 쓰는거?

컨텍스트 스위칭 - 프로세스 바꿀때 비용이 든다
PCB에 저장한다고함
스레드는 비용이 적다

스케줄링
FCFS - 먼저온거 먼저
SJF - 짧은거 먼저 근데 어떻게 알지?
라운드로빈 - 돌아가면서
우선순위 - 높은거 먼저 근데 기아문제있음

IPC
파이프 메시지큐 공유메모리 소켓
파이프는 단방향이고 소켓은 네트워크
공유메모리가 제일 빠르다는데 왜?

아 그리고 교수님이 가상메모리도 중요하다고 했는데
페이지 폴트가 뭐였더라
TLB는 캐시같은건데 주소변환할때 쓰는거
페이지 테이블이 느려서 TLB로 빠르게

스와핑 - 메모리 부족하면 디스크로 보내는거
스래싱 - 페이지 폴트가 너무 많아서 느려지는거
워킹셋 - 자주쓰는 페이지 모아놓는거""",
        "question": "아 이거 노트 정리하다가 헷갈리는게 있는데요 뮤텍스랑 세마포어 차이를 교수님이 설명했는데 제가 제대로 못들어서.. 이진 세마포어는 뮤텍스랑 같은거 아닌가요?? 그리고 파이썬에서 멀티스레딩 하면 GIL 때문에 진짜 병렬이 안된다는데 그럼 왜 쓰는건지.. 아 그리고 공유메모리가 왜 제일 빠른건지도 궁금해요 커널을 안거쳐서?",
    },
}

# ── 노트 다듬기 ────────────────────────────

NOTE_POLISH_BASE = """Below is a student's draft note. Improve ONLY the formatting and structure — do NOT change any content.

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
{note}
--- End ---"""

NOTE_POLISH_VARIANTS = {
    "short_clean": {
        "desc": "짧고 거의 구조화된 노트 (약간의 정리만 필요)",
        "note": """파이썬 반복문

for문: range 함수와 자주 쓰임. for i in range(10)은 0~9 반복.
while문: 조건이 참인 동안 반복.
break: 반복 중단
continue: 다음 반복으로
중첩 반복문: 반복 안에 반복. 시간복잡도 O(n^2).""",
    },
    "long_clean": {
        "desc": "길고 내용은 좋지만 포맷팅이 안 된 노트",
        "note": """데이터베이스 정규화

정규화의 목적: 데이터 중복을 최소화하고 무결성을 유지하기 위한 과정이다. 삽입 이상, 삭제 이상, 갱신 이상을 방지한다.

제1정규형(1NF): 모든 속성이 원자값(atomic value)을 가져야 한다. 반복 그룹이나 다중 값 속성이 없어야 한다. 예시: 전화번호 컬럼에 "010-1234-5678, 010-9876-5432" 처럼 여러 값을 넣으면 1NF 위반이다.

제2정규형(2NF): 1NF를 만족하고, 부분적 함수 종속이 없어야 한다. 즉, 기본키의 일부에만 종속되는 속성이 없어야 한다. 복합키일 때 주로 문제가 된다. 예시: (학생ID, 과목코드)가 기본키인데 학생이름이 학생ID에만 종속되면 2NF 위반.

제3정규형(3NF): 2NF를 만족하고, 이행적 함수 종속이 없어야 한다. A→B→C일 때 A→C가 이행적 종속이다. 예시: 학생ID→학과코드→학과명 에서 학과명은 이행적 종속이므로 분리해야 한다.

BCNF(보이스-코드 정규형): 모든 결정자가 후보키여야 한다. 3NF보다 엄격하다. 3NF이지만 BCNF가 아닌 경우: 후보키가 아닌 속성이 다른 속성을 결정할 때 발생한다.

제4정규형(4NF): BCNF를 만족하고, 다치 종속(Multi-valued dependency)이 없어야 한다.

제5정규형(5NF): 조인 종속(Join dependency)이 없어야 한다. 실무에서는 거의 고려하지 않는다.

반정규화(Denormalization): 성능을 위해 의도적으로 중복을 허용하는 것이다. 조인 비용이 큰 경우 사용한다. 읽기 성능은 향상되지만 쓰기 성능이 저하되고 데이터 일관성 유지가 어려워진다. 적용 사례: 자주 조회되는 통계 데이터, 로그성 데이터, 레포팅용 데이터 마트.

인덱스: B-Tree 인덱스가 가장 일반적이다. 해시 인덱스는 등호 검색에만 유효하다. 복합 인덱스는 왼쪽 컬럼부터 적용된다(Leftmost Prefix Rule). 인덱스가 많으면 INSERT/UPDATE가 느려진다.

트랜잭션 ACID: Atomicity(원자성) - 전부 성공 또는 전부 실패. Consistency(일관성) - 제약조건 항상 만족. Isolation(격리성) - 트랜잭션 간 간섭 없음. Durability(영속성) - 커밋된 데이터는 영구 저장.""",
    },
    "short_messy": {
        "desc": "짧고 뒤죽박죽인 메모",
        "note": """파이썬 반복문 for while 있음
range(10) 0~9임 range(1,10) 1~9
break 멈추기 continue 건너뛰기
for i in range(5): for j in range(5): 이러면 25번
리스트 컴프리헨션 [i for i in range(10)] 이것도 반복문?
enumerate 쓰면 인덱스도 같이 나옴
zip은 두개를 묶는거""",
    },
    "long_messy": {
        "desc": "길고 두서없는 강의 필기 (순서 뒤죽박죽, 중복, 오타)",
        "note": """DB 수업 정리

정규화 하는 이유 중복 줄이려고 이상현상 막으려고
1NF 원자값이어야함 전화번호 여러개 넣으면 안됨
2NF 부분종속 없어야함 근데 이게 뭔소리지
아 복합키일때 키의 일부에만 종속되면 안된다는뜻
3NF 이행종속 없어야함 A->B->C면 A->C 직접종속 안됨
BCNF는 뭐였더라 결정자가 후보키여야한다는거?
4NF 5NF는 시험에 안나온다고 했음

아 트랜잭션도 했다
ACID 원자성 일관성 격리성 영속성
원자성은 다되거나 다안되거나
일관성은 규칙 지키기
격리성은 트랜잭션끼리 방해안하기
영속성은 저장하면 안날아가기

인덱스 B-Tree가 제일 많이씀
해시는 = 만 가능 범위검색 안됨
복합인덱스는 앞에꺼부터 적용됨 (leftmost rule이었나)
인덱스 많이만들면 insert가 느려짐

아 반정규화도 있음 일부러 중복시키는거
성능때문에 조인이 너무 많으면
읽기는 빨라지는데 쓰기가 느려짐

아 그리고 정규화 2NF에서 부분종속 예시
학생ID 과목코드 가 복합키인데 학생이름은 학생ID에만 종속
이러면 2NF 위반이라 학생 테이블 분리해야함

3NF 예시는 학생ID->학과코드->학과명
학과명이 이행종속이라 학과 테이블로 분리

아 조인 종류도 해야되는데
INNER JOIN LEFT JOIN RIGHT JOIN FULL OUTER JOIN CROSS JOIN
INNER는 양쪽다 있는거만
LEFT는 왼쪽 다 + 오른쪽 매칭
셀프조인은 자기자신과 조인

서브쿼리 vs 조인 뭐가 더 좋을까
교수님은 상황에 따라 다르다고 함;;""",
    },
}

# ── 노트 분석 ──────────────────────────────

NOTE_ANALYZE_BASE = """You are a friendly study tutor. Analyze the student's note and provide feedback.

Course objectives: {objectives}
Student note: {note}
Code submissions: {submissions}

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
Category list: variables, data-types, conditionals, loops, functions, oop, algorithms, data-structures, recursion, sorting, graphs, os, database, networking

Use a warm, encouraging tone. Always mention what the student did well.
IMPORTANT: Write the entire output in Korean."""

NOTE_ANALYZE_VARIANTS = {
    "short_clean": {
        "desc": "짧고 구조화된 노트",
        "objectives": '["파이썬 기초 문법 이해", "반복문과 조건문 활용", "함수 작성 능력"]',
        "submissions": 5,
        "note": """# 파이썬 기초
## 변수와 자료형
- 정수(`int`), 실수(`float`), 문자열(`str`), 불리언(`bool`)
- `type()` 함수로 확인 가능

## 조건문
- `if`, `elif`, `else`
- 비교 연산자: `==`, `!=`, `>`, `<`, `>=`, `<=`
- 논리 연산자: `and`, `or`, `not`

## 반복문
- `for i in range(n)`: n번 반복
- `while 조건`: 조건이 참인 동안 반복
- `break`, `continue` 제어문""",
    },
    "long_clean": {
        "desc": "길고 상세하게 정리된 노트",
        "objectives": '["자료구조 기본 개념", "스택/큐/해시 구현", "시간복잡도 분석", "트리/그래프 탐색"]',
        "submissions": 12,
        "note": """# 자료구조 총정리

## 1. 선형 자료구조

### 배열 (Array)
- 연속된 메모리 공간에 같은 타입 데이터 저장
- 인덱스로 O(1) 접근
- 삽입/삭제: O(n) (요소 이동 필요)
- Python의 `list`는 동적 배열 (내부적으로 리사이징)

### 스택 (Stack)
- LIFO (Last In, First Out)
- 연산: `push(O(1))`, `pop(O(1))`, `peek(O(1))`
- 활용: 괄호 검증, DFS, 후위 표기법, 되돌리기(undo)
- Python 구현: `list`의 `append()`/`pop()` 사용

### 큐 (Queue)
- FIFO (First In, First Out)
- 연산: `enqueue(O(1))`, `dequeue(O(1))`
- 활용: BFS, 프린터 대기열, 프로세스 스케줄링
- Python 구현: `collections.deque`의 `append()`/`popleft()`
- **주의**: `list`의 `pop(0)`은 O(n)이므로 `deque` 사용 권장

### 연결 리스트 (Linked List)
- 노드가 데이터 + 다음 노드 포인터를 보유
- 삽입/삭제: O(1) (위치를 알 때)
- 탐색: O(n)
- 종류: 단일, 이중, 원형 연결 리스트

## 2. 비선형 자료구조

### 해시 테이블 (Hash Table)
- 키를 해시 함수로 인덱스 변환 → O(1) 평균 검색
- 충돌 해결: 체이닝(Chaining), 개방 주소법(Open Addressing)
- Python의 `dict`, `set`이 해시 테이블 기반
- 최악: O(n) (모든 키가 같은 버킷)

### 트리 (Tree)
- 계층적 구조, 루트 노드에서 시작
- **이진 트리**: 자식이 최대 2개
- **이진 탐색 트리(BST)**: 왼쪽 < 부모 < 오른쪽
  - 검색/삽입/삭제: 평균 O(log n), 최악 O(n) (편향)
- **균형 트리**: AVL, Red-Black (높이를 log n으로 유지)
- **힙(Heap)**: 완전 이진 트리, 최대힙/최소힙
  - 삽입/삭제: O(log n), 최솟값: O(1)
  - 활용: 우선순위 큐, 힙 정렬, 다익스트라

### 그래프 (Graph)
- 정점(Vertex)과 간선(Edge)의 집합
- 종류: 방향/무방향, 가중치/비가중치
- 표현: 인접 행렬 O(V^2), 인접 리스트 O(V+E)
- 탐색: BFS(큐, 최단 경로), DFS(스택/재귀, 사이클 감지)
- 최단 경로: 다익스트라(양수), 벨만-포드(음수 허용), 플로이드-워셜(전체 쌍)

## 3. 시간복잡도 비교표

| 연산 | 배열 | 연결리스트 | 스택 | 큐 | 해시 | BST(평균) |
|------|------|-----------|------|-----|------|----------|
| 접근 | O(1) | O(n) | O(n) | O(n) | O(1) | O(log n) |
| 검색 | O(n) | O(n) | O(n) | O(n) | O(1) | O(log n) |
| 삽입 | O(n) | O(1) | O(1) | O(1) | O(1) | O(log n) |
| 삭제 | O(n) | O(1) | O(1) | O(1) | O(1) | O(log n) |""",
    },
    "short_messy": {
        "desc": "짧고 엉망인 노트",
        "objectives": '["파이썬 기초 문법 이해", "반복문과 조건문 활용", "함수 작성 능력"]',
        "submissions": 1,
        "note": """파이썬
변수 int float str bool
if elif else
for while break continue
함수는 def 쓰면됨
return으로 반환""",
    },
    "long_messy": {
        "desc": "길고 두서없는 노트",
        "objectives": '["자료구조 기본 개념", "스택/큐/해시 구현", "시간복잡도 분석", "트리/그래프 탐색"]',
        "submissions": 4,
        "note": """자료구조

배열은 연속 메모리 인덱스 O(1)
리스트는 파이썬에서 동적배열이라고함
스택 LIFO push pop
큐 FIFO enqueue dequeue
연결리스트 노드가 다음꺼 가리킴

해시테이블 키를 해시함수로 바꿔서 O(1)
근데 충돌나면 체이닝이나 오픈어드레싱
파이썬 dict가 해시테이블임

트리 계층구조
이진트리 자식 최대 2개
BST 왼쪽<부모<오른쪽
검색 O(logn) 근데 편향되면 O(n)
AVL Red-Black은 균형맞춤

힙은 완전이진트리
최대힙 최소힙
우선순위큐에 씀
다익스트라도 힙씀

그래프 정점+간선
방향 무방향 가중치
인접행렬 O(V^2)공간 인접리스트 O(V+E)
BFS는 큐 DFS는 스택이나재귀
최단경로 다익스트라(양수만) 벨만포드(음수가능)

아 deque가 리스트보다 빠르다고함
list.pop(0)이 O(n)이라서

정렬도 해야되는데
버블 O(n^2) 선택 O(n^2) 삽입 O(n^2)
머지 O(nlogn) 퀵 O(nlogn) 평균인데 최악 O(n^2)
파이썬 sort는 팀소트 O(nlogn)

아 그리고 재귀도
base case 없으면 무한루프
피보나치 재귀로 하면 느림 O(2^n)
메모이제이션 쓰면 O(n)""",
    },
}

# ── 주간 리포트 ────────────────────────────

WEEKLY_REPORT_BASE = """Write a short weekly study report (3-4 sentences) for a student.

{data}

Use an encouraging tone and include 1 specific study tip.
IMPORTANT: Write the entire output in Korean."""

WEEKLY_REPORT_VARIANTS = {
    "short_clean": {
        "desc": "적은 활동량 학생",
        "data": """Total notes: 3 (variables, conditionals, loops)
New notes this week: 1 (loops)
Average understanding: 72%
Weakest areas: loops(55%)""",
    },
    "long_clean": {
        "desc": "많은 활동량 우수 학생",
        "data": """Total notes: 18 (Python basics, variables, data types, conditionals, loops, functions, modules, OOP basics, inheritance, polymorphism, encapsulation, algorithms intro, sorting, searching, recursion, dynamic programming, stacks, queues)
New notes this week: 6 (recursion, dynamic programming, stacks, queues, sorting, searching)
Average understanding: 81%
Strongest areas: variables(95%), conditionals(92%), data types(90%), functions(88%)
Weakest areas: dynamic programming(42%), recursion(55%), stacks(63%)
Code submissions this week: 14 (avg score: 76)
Tutor questions: 23
Quiz scores: [85, 72, 90, 68]""",
    },
    "short_messy": {
        "desc": "거의 활동 없는 학생",
        "data": """Total notes: 1 (untitled)
New notes this week: 0
Average understanding: N/A (no analysis done)
Code submissions: 0""",
    },
    "long_messy": {
        "desc": "많이 했지만 이해도가 낮은 학생",
        "data": """Total notes: 15 (Python intro, variables maybe, types idk, if else, loops, for while, function, class stuff, list, dict, tuple, set, file io, exception, regex)
New notes this week: 5 (class stuff, list, dict, tuple, set)
Average understanding: 38%
Strongest areas: variables(61%), Python intro(58%)
Weakest areas: regex(12%), exception(18%), class stuff(22%), file io(25%), dict(28%), tuple(30%), set(31%)
Code submissions this week: 9 (avg score: 34)
Tutor questions: 45
Quiz scores: [22, 35, 18, 40, 28]
Missed deadlines: 2""",
    },
}


# ════════════════════════════════════════════
#  측정 실행
# ════════════════════════════════════════════

FEATURES = [
    {
        "name": "tutor_chat",
        "display": "튜터 채팅",
        "model": MODEL_HEAVY,
        "variants": TUTOR_VARIANTS,
        "build_prompt": lambda v: f"""{TUTOR_BASE}

[Current code]
{v['code']}

Student's question: {v['question']}""",
    },
    {
        "name": "code_analysis",
        "display": "코드 분석",
        "model": MODEL_HEAVY,
        "variants": CODE_VARIANTS,
        "build_prompt": lambda v: CODE_ANALYSIS_BASE.format(**v),
    },
    {
        "name": "note_ask",
        "display": "노트 중 질문",
        "model": MODEL_HEAVY,
        "variants": NOTE_ASK_VARIANTS,
        "build_prompt": lambda v: NOTE_ASK_BASE.format(**v),
    },
    {
        "name": "note_polish",
        "display": "노트 다듬기",
        "model": MODEL_HEAVY,
        "variants": NOTE_POLISH_VARIANTS,
        "build_prompt": lambda v: NOTE_POLISH_BASE.format(**v),
    },
    {
        "name": "note_analyze",
        "display": "노트 분석",
        "model": MODEL_HEAVY,
        "variants": NOTE_ANALYZE_VARIANTS,
        "build_prompt": lambda v: NOTE_ANALYZE_BASE.format(**v),
    },
    {
        "name": "weekly_report",
        "display": "주간 리포트",
        "model": MODEL_LIGHT,
        "variants": WEEKLY_REPORT_VARIANTS,
        "build_prompt": lambda v: WEEKLY_REPORT_BASE.format(**v),
    },
]


def main():
    print("=" * 90)
    print("  PikaBuddy Token QA v2 — 4-Variant Measurement")
    print("  각 기능 x 4가지 입력 유형 (짧은/긴 x 구조화/엉망)")
    print("=" * 90)

    all_results = {}

    for feat in FEATURES:
        fname = feat["name"]
        all_results[fname] = {}

        print(f"\n{'─'*90}")
        print(f"  [{feat['display']}] (model: {feat['model']})")
        print(f"{'─'*90}")
        print(f"  {'Variant':<18} {'Desc':<40} {'In':>6} {'Out':>6} {'Total':>6} {'Cost($)':>10} {'Time':>6}")
        print(f"  {'-'*86}")

        for vkey in ["short_clean", "long_clean", "short_messy", "long_messy"]:
            vdata = feat["variants"][vkey]
            prompt = feat["build_prompt"](vdata)
            label = f"{fname}__{vkey}"

            result = measure(feat["model"], prompt, label)
            result["variant"] = vkey
            result["variant_desc"] = vdata["desc"]
            all_results[fname][vkey] = result

            print(f"  {vkey:<18} {vdata['desc']:<40} {result['input_tokens']:>6} {result['output_tokens']:>6} {result['total_tokens']:>6} ${result['cost_usd']:<9.7f} {result['elapsed_sec']:>5.1f}s")

        # 변형 간 비교
        sc = all_results[fname]["short_clean"]
        lm = all_results[fname]["long_messy"]
        ratio = lm["cost_usd"] / sc["cost_usd"] if sc["cost_usd"] > 0 else 0
        print(f"  {'':>18} {'long_messy / short_clean 비용 배율':<40} {'':>6} {'':>6} {'':>6} x{ratio:>.1f}")

    # ── 종합 요약 ──
    print(f"\n{'='*90}")
    print("  종합 요약: 비용 범위 (short_clean → long_messy)")
    print(f"{'='*90}")
    print(f"  {'Feature':<18} {'Min Cost':>12} {'Max Cost':>12} {'배율':>8} {'Min Tok':>10} {'Max Tok':>10}")
    print(f"  {'-'*74}")

    for feat in FEATURES:
        fname = feat["name"]
        costs = [all_results[fname][v]["cost_usd"] for v in ["short_clean", "long_clean", "short_messy", "long_messy"]]
        tokens = [all_results[fname][v]["total_tokens"] for v in ["short_clean", "long_clean", "short_messy", "long_messy"]]
        mn_c, mx_c = min(costs), max(costs)
        mn_t, mx_t = min(tokens), max(tokens)
        ratio = mx_c / mn_c if mn_c > 0 else 0
        print(f"  {feat['display']:<18} ${mn_c:<11.7f} ${mx_c:<11.7f} x{ratio:>5.1f} {mn_t:>10} {mx_t:>10}")

    # ── 시나리오 재계산 ──
    print(f"\n{'='*90}")
    print("  학생 1인 하루 비용 재계산 (4가지 유형별)")
    print(f"{'='*90}")

    # 평상시 수업일 학생 액션: 튜터 2회, 코드분석 1회, 노트질문 1회, 노트분석 1회
    for vkey, vname in [("short_clean","모범생(짧은코드)"), ("long_clean","모범생(긴코드)"), ("short_messy","초보(짧은코드)"), ("long_messy","초보(긴코드)")]:
        tutor = all_results["tutor_chat"][vkey]["cost_usd"] * 2
        code = all_results["code_analysis"][vkey]["cost_usd"] * 1
        note_q = all_results["note_ask"][vkey]["cost_usd"] * 1
        note_a = all_results["note_analyze"][vkey]["cost_usd"] * 1
        total = tutor + code + note_q + note_a
        print(f"  {vname:<25} 튜터x2=${tutor:.6f} + 코드x1=${code:.6f} + 노트질문=${note_q:.6f} + 노트분석=${note_a:.6f}")
        print(f"  {'':>25} = ${total:.6f} ({total*1380:.1f}원)")

    # JSON 저장
    output = {"features": {}, "summary": {}}
    for feat in FEATURES:
        fname = feat["name"]
        output["features"][fname] = {
            "display": feat["display"],
            "model": feat["model"],
            "variants": {}
        }
        for vkey in ["short_clean", "long_clean", "short_messy", "long_messy"]:
            r = all_results[fname][vkey]
            output["features"][fname]["variants"][vkey] = {
                "desc": r["variant_desc"],
                "input_tokens": r["input_tokens"],
                "output_tokens": r["output_tokens"],
                "total_tokens": r["total_tokens"],
                "cost_usd": r["cost_usd"],
                "elapsed_sec": r["elapsed_sec"],
            }
        costs = [all_results[fname][v]["cost_usd"] for v in ["short_clean", "long_clean", "short_messy", "long_messy"]]
        output["summary"][fname] = {
            "min_cost": min(costs),
            "max_cost": max(costs),
            "ratio": round(max(costs) / min(costs), 1) if min(costs) > 0 else 0,
        }

    with open("token_qa_v2_result.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"\nResults saved to token_qa_v2_result.json")


if __name__ == "__main__":
    main()
