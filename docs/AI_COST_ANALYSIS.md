# PikaBuddy AI 비용 분석 보고서

> **측정일**: 2026-04-11  
> **측정 방법**: Gemini API 실측 (실제 프롬프트 호출 → `usage_metadata` 기반)  
> **환율 기준**: 1 USD = 1,380 KRW

---

## Executive Summary: 기능별 호출당 비용 (최적 / 평균 / 최악)

### 학생 기능 (호출당)

| 기능 | 모델 | 최적 (Best) | 평균 (Avg) | 최악 (Worst) | 최악 시나리오 |
|---|---|---|---|---|---|
| **튜터 채팅** | Flash | $0.000555 (0.8원) | $0.000878 (1.2원) | $0.001661 (2.3원) | 깔끔한 코드 + 명확 질문 → 긴 답변 |
| **코드 분석** | Flash | $0.003750 (5.2원) | $0.005353 (7.4원) | $0.008703 (12.0원) | 80줄 엉망 코드 → 지적 폭발 |
| **노트 중 질문** | Flash | $0.000338 (0.5원) | $0.000647 (0.9원) | $0.001120 (1.5원) | 30줄 엉망 노트 + 질문 3개 |
| **노트 다듬기** | Flash | $0.000363 (0.5원) | $0.001170 (1.6원) | $0.002228 (3.1원) | DB 정규화 장문 포맷팅 |
| **노트 분석** | Flash | $0.001299 (1.8원) | $0.001902 (2.6원) | $0.002614 (3.6원) | 60줄 자료구조 노트 분석 |
| **주간 리포트** | Flash-Lite | $0.000038 (0.1원) | $0.000074 (0.1원) | $0.000113 (0.2원) | 18노트 우수학생 데이터 |

### 교수 기능 (호출당, 시스템 프롬프트 — 변동 없음)

| 기능 | 모델 | 비용 | 원화 |
|---|---|---|---|
| 문제 아웃라인 (5문제) | Flash | $0.000814 | 1.1원 |
| 문제 상세 (1문제) | Flash | $0.001552 | 2.1원 |
| TC 생성 (1문제분) | Flash-Lite | $0.000216 | 0.3원 |
| 퀴즈 생성 (3문제) | Flash | $0.002466 | 3.4원 |
| 대시보드 인사이트 | Flash-Lite | $0.000266 | 0.4원 |
| 서술형 채점 (1문항) | Flash | $0.001061 | 1.5원 |

### 학생 1인 하루 총 비용 (튜터 2회 + 코드분석 1회 + 노트질문 1회 + 노트분석 1회)

| 조건 | 비용 (USD) | 원화 | 설명 |
|---|---|---|---|
| **최적 (Best)** | $0.006497 | **9.0원** | 짧은 코드, 모호한 질문 → AI 답변 짧음 |
| **평균 (Average)** | $0.009658 | **13.3원** | 4가지 변형의 산술 평균 |
| **최악 (Worst)** | $0.015759 | **21.7원** | 80줄 엉망 코드 + 장황한 질문 → AI 답변 폭발 |

### 30명 강의 일일 비용 (접속률 70% = 21명 + 교수 1회)

| 조건 | 일일 | 월간 (26일) | 연간 (8개월) |
|---|---|---|---|
| **최적** | $0.147 (203원) | $3.83 (5,285원) | $30.66 (42,312원) |
| **평균** | $0.214 (295원) | $5.56 (7,666원) | $44.45 (61,332원) |
| **최악** | $0.342 (472원) | $8.89 (12,265원) | $71.12 (98,124원) |

> **결론**: 최악의 경우에도 30명 강의 1개의 AI 비용은 **연간 약 10만원** 미만이다.

---

## 1. 사용 모델 및 가격 정책

PikaBuddy는 작업 복잡도에 따라 두 가지 모델을 라우팅한다.

| 모델 | 용도 | Input ($/1M tokens) | Output ($/1M tokens) |
|---|---|---|---|
| **Gemini 2.5 Flash** | 분석, 튜터, 문제 생성 등 복잡한 작업 | $0.30 | $2.50 |
| **Gemini 2.5 Flash-Lite** | 요약, 분류, TC 생성, 대시보드 등 경량 작업 | $0.10 | $0.40 |

**Fallback 체인**: `gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-2.5-flash-lite` (503 과부하 시 자동 전환)

### 1.1 비용 절감 전략

| 전략 | 효과 |
|---|---|
| 모델 라우팅 (Flash-Lite 분리) | 경량 작업 비용 **~83% 절감** |
| 프롬프트 영어 재작성 | 입력 토큰 **~20% 절감** (토크나이저 효율) |
| 출력은 한국어 유지 | 사용자 경험 보존 |

---

## 2. 기능별 토큰 사용량 실측

실제 API 호출로 측정한 기능별 토큰 프로필이다.
각 기능은 **사용자 입력의 품질(구조화/엉망) x 길이(짧음/긴) 4가지 변형**으로 측정하여 실제 사용 범위를 확인했다.

| 변형 | 설명 |
|---|---|
| **short_clean** | 짧고 구조화된 입력 (모범 사례) |
| **long_clean** | 길고 구조화된 입력 (성실한 학생) |
| **short_messy** | 짧고 엉망인 입력 (초보 학생) |
| **long_messy** | 길고 엉망인 입력 (최악의 경우) |

### 2.1 학생 기능

#### 2.1.1 튜터 질문 (소크라틱 채팅)

**프롬프트 구조**: 소크라틱 방식 AI 튜터. 직접 답을 주지 않고 질문으로 유도. 순수 개념 질문은 예외적으로 직접 설명.

| 변형 | 테스트 입력 | Input | Output | 총 토큰 | 비용 |
|---|---|---|---|---|---|
| **short_clean** | 깔끔한 `two_sum` 코드(6줄) + "해시맵을 쓰면 O(n)으로 줄일 수 있다고 들었는데 어떤 원리인가요?" | 253 | 634 | 887 | $0.001661 |
| **long_clean** | BFS/DFS/다익스트라 구현(80줄) + deque 시간복잡도, 우선순위큐 미사용 이유, 음의 가중치 설명 3개 질문 | 1,046 | 159 | 1,205 | $0.000711 |
| **short_messy** | `a.sort()` 3줄 코드 + "이거 왜 됨?? sort가 뭔데 그냥 되는거임??" | 193 | 199 | 392 | $0.000555 |
| **long_messy** | 브루트포스/해시맵/투포인터 3가지 중복 시도(30줄+) + "답이 다 다르게 나와요ㅠㅠ 뭐가 맞는건지 모르겠고.. 시간초과도 뜨는데.." | 619 | 160 | 779 | $0.000586 |

**short_clean** — 명확한 질문, 깔끔한 코드:
```python
def two_sum(nums, target):
    for i in range(len(nums)):
        for j in range(i+1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
```
> 질문: "이 코드가 O(n^2)인데, 해시맵을 쓰면 O(n)으로 줄일 수 있다고 들었어요. 어떤 원리인가요?"

**long_clean** — 80줄 그래프 탐색 코드 + 심화 질문 3개:
```python
import sys
from collections import deque

def bfs_shortest_path(graph, start, end):
    """BFS를 사용하여 최단 경로를 찾는 함수"""
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
    return None

def dfs_all_paths(graph, start, end, path=None):
    """DFS를 사용하여 모든 가능한 경로를 찾는 함수"""
    if path is None:
        path = []
    path = path + [start]
    if start == end:
        return [path]
    if start not in graph:
        return []
    paths = []
    for neighbor in graph[start]:
        if neighbor not in path:
            new_paths = dfs_all_paths(graph, neighbor, end, path)
            paths.extend(new_paths)
    return paths

def dijkstra(graph, start):
    """다익스트라 알고리즘으로 최단 거리 계산"""
    distances = {node: float('inf') for node in graph}
    distances[start] = 0
    visited = set()
    while len(visited) < len(graph):
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

graph_unweighted = {
    'A': ['B', 'C'], 'B': ['A', 'D', 'E'], 'C': ['A', 'F'],
    'D': ['B'], 'E': ['B', 'F'], 'F': ['C', 'E']
}
graph_weighted = {
    'A': {'B': 4, 'C': 2}, 'B': {'A': 4, 'D': 3, 'E': 1}, 'C': {'A': 2, 'F': 5},
    'D': {'B': 3}, 'E': {'B': 1, 'F': 2}, 'F': {'C': 5, 'E': 2}
}
print("BFS 최단경로:", bfs_shortest_path(graph_unweighted, 'A', 'F'))
print("DFS 모든경로:", dfs_all_paths(graph_unweighted, 'A', 'F'))
print("다익스트라:", dijkstra(graph_weighted, 'A'))
```
> 질문: "1. BFS에서 deque 대신 일반 리스트를 쓰면 시간복잡도가 어떻게 달라지나요? 2. 다익스트라에서 우선순위 큐를 안 쓰고 매번 최소값을 찾으면 O(V^2)이 맞나요? 3. 음의 가중치가 있으면 다익스트라가 안 된다는데 왜 안 되는지 예시를 들어서 설명해주세요."

**short_messy** — 3줄 코드 + 두루뭉술한 질문:
```python
a = [3,1,2]
a.sort()
print(a)
```
> 질문: "이거 왜 됨?? sort가 뭔데 그냥 되는거임??"

**long_messy** — 같은 문제를 3가지 방식으로 중복 시도한 스파게티 코드 + 장황한 질문:
```python
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
```
> 질문: "아 교수님 저 진짜 모르겠어요ㅠㅠ 투포인터인지 해시맵인지 브루트포스인지 셋 다 해봤는데 답이 다 다르게 나와요.. 첫번째꺼는 되는것 같은데 두번째꺼는 좀 이상하고 세번째꺼는 인터넷에서 봤는데 왜 되는지 모르겠고.. 그리고 시간복잡도도 각각 다르다는건 알겠는데 정확히 뭐가 다른건지.. 아 그리고 이 문제 제출하면 시간초과 뜨는데 첫번째꺼 말고 다른걸로 내야하는건가요?"

> **분석**: 튜터는 Output이 적다 (65~634 tokens). 비용은 Input 길이보다 **Output 길이에 좌우**되어 long_clean이 가장 짧은 답변(159)을 받아 오히려 저렴할 수 있다. **비용 범위: $0.0006 ~ $0.0017**

---

#### 2.1.2 코드 분석 피드백

**프롬프트 구조**: 코딩 과제 제출 코드를 분석하여 점수, 종합 피드백, 로직 분석, 코드 품질, 복붙 분석, 개선 제안을 Markdown으로 출력.

| 변형 | 테스트 입력 | Input | Output | 총 토큰 | 비용 |
|---|---|---|---|---|---|
| **short_clean** | insertion_sort 10줄, 스냅샷 15회, 복붙 없음 | 366 | 1,526 | 1,892 | $0.003925 |
| **long_clean** | LinkedList 클래스 80줄 (독스트링/타입힌트 포함), 스냅샷 42회, 복붙 없음 | 1,316 | 1,855 | 3,171 | $0.005032 |
| **short_messy** | 재귀 피보나치 5줄 (변수명 `f`, `x`), 스냅샷 3회, 복붙 의심 1회 | 318 | 1,462 | 1,780 | $0.003750 |
| **long_messy** | 전역변수 남용 성적관리 80줄 (중복, 매직넘버, 데드코드), 스냅샷 8회, 복붙 의심 3회 | 1,278 | 3,328 | 4,606 | **$0.008703** |

**short_clean** — 과제 "리스트 정렬 구현" (스냅샷 15회, 복붙 없음):
```python
def insertion_sort(arr):
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key
    return arr
print(insertion_sort([64, 34, 25, 12, 22, 11, 90]))
```

**long_clean** — 과제 "연결 리스트 구현" (스냅샷 42회, 복붙 없음):
```python
from typing import Optional, Any

class Node:
    """연결 리스트의 노드"""
    def __init__(self, data: Any, next_node: Optional['Node'] = None):
        self.data = data
        self.next = next_node
    def __repr__(self) -> str:
        return f"Node({self.data})"

class LinkedList:
    """단일 연결 리스트 구현"""
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
        new_node = Node(data, self.head)
        self.head = new_node
        self._size += 1
    def insert_at(self, index: int, data: Any) -> None:
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
        current = self.head
        index = 0
        while current:
            if current.data == data:
                return index
            current = current.next
            index += 1
        return None
    def reverse(self) -> None:
        prev = None
        current = self.head
        while current:
            next_node = current.next
            current.next = prev
            prev = current
            current = next_node
        self.head = prev
    def to_list(self) -> list:
        result = []
        current = self.head
        while current:
            result.append(current.data)
            current = current.next
        return result

ll = LinkedList()
for val in [10, 20, 30, 40, 50]:
    ll.append(val)
print(f"초기: {ll}")
print(f"길이: {len(ll)}")
ll.prepend(5)
ll.insert_at(3, 25)
ll.delete(30)
print(f"search(40): index={ll.search(40)}")
ll.reverse()
print(f"reverse: {ll}")
print(f"to_list: {ll.to_list()}")
```

**short_messy** — 과제 "피보나치 수열" (스냅샷 3회, 복붙 의심 1회):
```python
def f(x):
    if x==0: return 0
    if x==1: return 1
    return f(x-1)+f(x-2)
for i in range(10): print(f(i))
```

**long_messy** — 과제 "학생 성적 관리" (스냅샷 8회, 복붙 의심 3회):
```python
students = []
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
stats()
sort_by_score()
update("박민수", 75)
delete("정다은")
show()
```

> **분석**: 코드 분석은 **모든 기능 중 가장 비싸다**. 엉망인 긴 코드는 지적할 사항이 많아 Output이 3,328 tokens까지 증가. **비용 범위: $0.0038 ~ $0.0087 (2.3배 차이)**

---

#### 2.1.3 노트 AI 도우미 (노트 중 질문)

**프롬프트 구조**: 학생이 노트 작성 중 궁금한 점을 질문하면, 해당 질문만 2~4문장으로 간결하게 답변.

| 변형 | 테스트 입력 | Input | Output | 총 토큰 | 비용 |
|---|---|---|---|---|---|
| **short_clean** | Markdown 노트 (리스트/딕셔너리 6줄) + "딕셔너리에서 키가 중복되면 어떻게 되나요?" | 234 | 107 | 341 | $0.000338 |
| **long_clean** | OS 노트 (프로세스/스레드/동기화/IPC/스케줄링 40줄) + "뮤텍스와 이진 세마포어 차이 + Python threading 지원 여부" | 856 | 166 | 1,022 | $0.000672 |
| **short_messy** | 4줄 메모 (리스트, 딕셔너리, 튜플, 셋) + "근데 이거 다 비슷한거 아님?? 뭘 언제 써야되는지 모르겠음" | 175 | 162 | 337 | $0.000458 |
| **long_messy** | 30줄 강의 필기 (오타, 약어, 혼란) + "뮤텍스/세마포어 차이 + GIL 때문에 왜 쓰는지 + 공유메모리 왜 빠른지" 질문 3개 | 559 | 381 | 940 | $0.001120 |

**short_clean** — 구조화된 노트 + 명확한 질문:
```markdown
# 파이썬 자료구조
## 리스트 (List)
- 순서가 있는 가변 자료형
- `append()`, `pop()`, `insert()` 메서드
- 인덱싱: `arr[0]`, 슬라이싱: `arr[1:3]`

## 딕셔너리 (Dict)
- 키-값 쌍으로 저장
- `keys()`, `values()`, `items()` 메서드
- 해시 테이블 기반
```
> 질문: "딕셔너리에서 키가 중복되면 어떻게 되나요?"

**long_clean** — 운영체제 노트 (프로세스/스레드/동기화/IPC/스케줄링 전 범위):
```markdown
# 운영체제 - 프로세스와 스레드

## 1. 프로세스 (Process)
### 정의
- 실행 중인 프로그램의 인스턴스
- 독립된 메모리 공간 (Code, Data, Stack, Heap)
### 프로세스 상태
- **New** → **Ready** → **Running** → **Waiting** → **Terminated**
### 컨텍스트 스위칭
- PCB에 저장, 오버헤드: 레지스터 저장/복원, TLB 플러시

## 2. 스레드 (Thread)
- 프로세스 내 경량 실행 단위, 메모리 공유 (Code, Data, Heap)
- 각 스레드는 독립 Stack 보유
### 멀티스레딩 문제점
- **Race Condition**: 공유 자원 동시 접근
- **Deadlock**: 서로의 자원을 기다리며 영원히 대기
- **Priority Inversion**: 높은 우선순위가 낮은 우선순위에 차단

## 3. 동기화 도구
### Mutex - 하나의 스레드만 진입, 소유권 개념
### Semaphore - N개 동시 접근, wait()/signal()
### Monitor - 뮤텍스 + 조건 변수 (Java synchronized)

## 4. IPC
- 파이프(단방향), 메시지 큐, 공유 메모리(가장 빠름), 소켓

## 5. 스케줄링
- FCFS, SJF, Round Robin, Priority, MLFQ
```
> 질문: "뮤텍스와 이진 세마포어가 거의 같다고 했는데, 실제로 어떤 상황에서 뮤텍스를 쓰고 어떤 상황에서 세마포어를 쓰나요? Python threading 모듈에서는 둘 다 지원하나요?"

**short_messy** — 4줄 메모:
> 파이썬 자료구조
> 리스트 - 순서있음 append pop
> 딕셔너리 - 키값 {}
> 튜플 - 변경불가 ()
> 셋 - 중복없음

> 질문: "근데 이거 다 비슷한거 아님?? 뭘 언제 써야되는지 모르겠음"

**long_messy** — 30줄 강의 필기 (오타, 비문, 순서 뒤죽박죽):
> 운영체제 수업 필기
> 프로세스는 프로그램이 실행되는거
> 스레드는 프로세스 안에서 돌아가는 작은거
> 근데 프로세스가 메모리를 갖고있고 스레드는 공유한다고함
> 공유하면 좋은점이 빠르다? 근데 문제도 있음
> 레이스 컨디션이라고 두개가 동시에 접근하면 문제
> 데드락은 서로 기다리는거
> 뮤텍스 세마포어 모니터 이런걸로 해결
> 뮤텍스는 하나만 들어갈수있고
> 세마포어는 여러개 들어갈수있고
> 모니터는 자바에서 쓰는거?
> 컨텍스트 스위칭 - 프로세스 바꿀때 비용이 든다
> PCB에 저장한다고함 스레드는 비용이 적다
> 스케줄링 FCFS SJF 라운드로빈 우선순위
> IPC 파이프 메시지큐 공유메모리 소켓
> 공유메모리가 제일 빠르다는데 왜?
> 아 그리고 가상메모리도 중요하다고 했는데
> 페이지 폴트가 뭐였더라 TLB는 캐시같은건데
> 스와핑 스래싱 워킹셋...

> 질문: "아 이거 노트 정리하다가 헷갈리는게 있는데요 뮤텍스랑 세마포어 차이를 교수님이 설명했는데 제가 제대로 못들어서.. 이진 세마포어는 뮤텍스랑 같은거 아닌가요?? 그리고 파이썬에서 멀티스레딩 하면 GIL 때문에 진짜 병렬이 안된다는데 그럼 왜 쓰는건지.. 아 그리고 공유메모리가 왜 제일 빠른건지도 궁금해요 커널을 안거쳐서?"

> **분석**: 엉망인 질문에 AI가 더 길게 답변하는 경향 (short_messy Output 162 > short_clean 107). 여러 질문을 섞으면 Output이 크게 증가 (long_messy 381). **비용 범위: $0.0003 ~ $0.0011 (3.3배 차이)**

---

#### 2.1.4 노트 다듬기 (Polish)

**프롬프트 구조**: 학생 노트의 **구조와 포맷만 개선**. 내용 변경 금지. 헤딩/목록/볼드/코드 포맷 적용.

| 변형 | 테스트 입력 | Input | Output | 총 토큰 | 비용 |
|---|---|---|---|---|---|
| **short_clean** | 반복문 메모 6줄 (내용은 좋으나 포맷 없음) | 243 | 116 | 359 | $0.000363 |
| **long_clean** | DB 정규화 노트 (1NF~5NF, 반정규화, 인덱스, ACID) 포맷 없는 장문 | 785 | 797 | 1,582 | $0.002228 |
| **short_messy** | 반복문 메모 7줄 (약어, 무구조) | 274 | 184 | 458 | $0.000542 |
| **long_messy** | DB 강의 필기 30줄 (뒤죽박죽, 중복, 오타, "아 그리고~" 식 구어체) | 602 | 546 | 1,148 | $0.001546 |

**short_clean** — 반복문 메모 (내용 좋으나 포맷 없음):
> 파이썬 반복문
>
> for문: range 함수와 자주 쓰임. for i in range(10)은 0~9 반복.
> while문: 조건이 참인 동안 반복.
> break: 반복 중단
> continue: 다음 반복으로
> 중첩 반복문: 반복 안에 반복. 시간복잡도 O(n^2).

**long_clean** — DB 정규화 장문 (내용 좋으나 Markdown 포맷 없음):
> 데이터베이스 정규화
>
> 정규화의 목적: 데이터 중복을 최소화하고 무결성을 유지하기 위한 과정이다. 삽입 이상, 삭제 이상, 갱신 이상을 방지한다.
>
> 제1정규형(1NF): 모든 속성이 원자값을 가져야 한다. 예시: 전화번호 컬럼에 여러 값을 넣으면 위반.
>
> 제2정규형(2NF): 1NF + 부분적 함수 종속이 없어야 한다. 복합키일 때 문제. 예시: (학생ID, 과목코드)가 기본키인데 학생이름이 학생ID에만 종속되면 위반.
>
> 제3정규형(3NF): 2NF + 이행적 함수 종속이 없어야 한다. 예시: 학생ID→학과코드→학과명.
>
> BCNF: 모든 결정자가 후보키여야 한다. 제4정규형(4NF): 다치 종속 없어야. 제5정규형(5NF): 실무에서 거의 미고려.
>
> 반정규화: 성능을 위해 의도적으로 중복 허용. 읽기 향상, 쓰기 저하.
>
> 인덱스: B-Tree가 일반적. 해시는 등호만. 복합인덱스는 왼쪽부터 적용(Leftmost Prefix Rule). 많으면 INSERT 느려짐.
>
> 트랜잭션 ACID: Atomicity, Consistency, Isolation, Durability.

**short_messy** — 뒤죽박죽 메모:
> 파이썬 반복문 for while 있음
> range(10) 0~9임 range(1,10) 1~9
> break 멈추기 continue 건너뛰기
> for i in range(5): for j in range(5): 이러면 25번
> 리스트 컴프리헨션 [i for i in range(10)] 이것도 반복문?
> enumerate 쓰면 인덱스도 같이 나옴
> zip은 두개를 묶는거

**long_messy** — 30줄 두서없는 강의 필기 (중복, 오타, 구어체):
> DB 수업 정리
>
> 정규화 하는 이유 중복 줄이려고 이상현상 막으려고
> 1NF 원자값이어야함 전화번호 여러개 넣으면 안됨
> 2NF 부분종속 없어야함 근데 이게 뭔소리지
> 아 복합키일때 키의 일부에만 종속되면 안된다는뜻
> 3NF 이행종속 없어야함 A->B->C면 A->C 직접종속 안됨
> BCNF는 뭐였더라 결정자가 후보키여야한다는거?
> 4NF 5NF는 시험에 안나온다고 했음
>
> 아 트랜잭션도 했다 ACID 원자성 일관성 격리성 영속성
> 원자성은 다되거나 다안되거나 일관성은 규칙 지키기
> 격리성은 트랜잭션끼리 방해안하기 영속성은 저장하면 안날아가기
>
> 인덱스 B-Tree가 제일 많이씀 해시는 = 만 가능
> 복합인덱스는 앞에꺼부터 적용됨 인덱스 많이만들면 insert가 느려짐
>
> 아 반정규화도 있음 일부러 중복시키는거 성능때문에
>
> 아 그리고 정규화 2NF에서 부분종속 예시
> 학생ID 과목코드 가 복합키인데 학생이름은 학생ID에만 종속
> 3NF 예시는 학생ID->학과코드->학과명
>
> 아 조인 종류도 해야되는데
> INNER LEFT RIGHT FULL OUTER CROSS
> 셀프조인은 자기자신과 조인
> 서브쿼리 vs 조인 뭐가 더 좋을까 교수님은 상황에 따라 다르다고 함;;

> **분석**: 다듬기는 **입력 길이에 비례**하여 Output이 증가한다 (원문을 포맷팅하여 그대로 출력하므로). 엉망인 노트는 이미 구조화된 노트보다 포맷 변환 작업이 많아 Output이 상대적으로 더 커진다. **비용 범위: $0.0004 ~ $0.0022 (6.1배 차이 — 가장 큰 편차)**

---

#### 2.1.5 노트 갭 분석 (Analyze)

**프롬프트 구조**: 수업 목표 대비 학생 노트의 이해도를 분석. 이해도 점수, 종합 평가, 잘 이해한 부분, 보완 필요 부분, 학습 추천, 카테고리 태깅 출력.

| 변형 | 테스트 입력 | Input | Output | 총 토큰 | 비용 |
|---|---|---|---|---|---|
| **short_clean** | 파이썬 기초 노트 (변수/조건/반복 10줄, Markdown 구조화) / 목표 3개 / 제출 5회 | 357 | 610 | 967 | $0.001632 |
| **long_clean** | 자료구조 총정리 노트 (배열~그래프, 시간복잡도표 포함 60줄) / 목표 4개 / 제출 12회 | 1,137 | 909 | 2,046 | $0.002614 |
| **short_messy** | 5줄 메모 ("변수 int float str bool / if elif else / for while break") / 제출 1회 | 255 | 489 | 744 | $0.001299 |
| **long_messy** | 30줄 뒤죽박죽 필기 (약어, 중복, "아 그리고~", 정렬/재귀 등 관련없는 내용 혼재) / 제출 4회 | 630 | 750 | 1,380 | $0.002064 |

**short_clean** — 수업 목표: `["파이썬 기초 문법 이해", "반복문과 조건문 활용", "함수 작성 능력"]`, 제출 5회:
```markdown
# 파이썬 기초
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
- `break`, `continue` 제어문
```

**long_clean** — 수업 목표: `["자료구조 기본 개념", "스택/큐/해시 구현", "시간복잡도 분석", "트리/그래프 탐색"]`, 제출 12회:
```markdown
# 자료구조 총정리
## 1. 선형 자료구조
### 배열 (Array)
- 연속된 메모리, 인덱스 O(1), 삽입/삭제 O(n)
### 스택 (Stack)
- LIFO, push/pop/peek O(1), 활용: 괄호 검증, DFS, 후위 표기법
### 큐 (Queue)
- FIFO, enqueue/dequeue O(1), 활용: BFS, 프로세스 스케줄링
- list.pop(0)은 O(n)이므로 collections.deque 사용 권장
### 연결 리스트
- 노드 = 데이터 + 포인터, 삽입/삭제 O(1), 탐색 O(n)

## 2. 비선형 자료구조
### 해시 테이블
- 키→해시→인덱스, 평균 O(1), 충돌: 체이닝/개방주소법
### 트리
- 이진 탐색 트리: 왼쪽 < 부모 < 오른쪽, 평균 O(log n)
- 힙: 완전 이진 트리, 우선순위 큐, 다익스트라
### 그래프
- 인접 행렬 O(V^2), 인접 리스트 O(V+E)
- BFS(큐, 최단 경로), DFS(스택/재귀, 사이클 감지)
- 다익스트라(양수), 벨만-포드(음수 허용)

## 3. 시간복잡도 비교표
| 연산 | 배열 | 연결리스트 | 해시 | BST(평균) |
|------|------|-----------|------|----------|
| 접근 | O(1) | O(n) | O(1) | O(log n) |
| 검색 | O(n) | O(n) | O(1) | O(log n) |
| 삽입 | O(n) | O(1) | O(1) | O(log n) |
```

**short_messy** — 수업 목표 동일(파이썬 기초), 제출 1회:
> 파이썬
> 변수 int float str bool
> if elif else
> for while break continue
> 함수는 def 쓰면됨
> return으로 반환

**long_messy** — 수업 목표(자료구조), 제출 4회:
> 자료구조
> 배열은 연속 메모리 인덱스 O(1)
> 스택 LIFO push pop 큐 FIFO enqueue dequeue
> 연결리스트 노드가 다음꺼 가리킴
> 해시테이블 키를 해시함수로 바꿔서 O(1) 충돌나면 체이닝
> 트리 계층구조 BST 왼쪽<부모<오른쪽
> 힙은 완전이진트리 우선순위큐에 씀
> 그래프 정점+간선 BFS는 큐 DFS는 스택이나재귀
> 아 deque가 리스트보다 빠르다고함 list.pop(0)이 O(n)이라서
> 정렬도 해야되는데 버블 O(n^2) 머지 O(nlogn) 퀵 O(nlogn)
> 아 그리고 재귀도 base case 없으면 무한루프
> 피보나치 재귀로 하면 느림 O(2^n) 메모이제이션 쓰면 O(n)

> **분석**: 분석 기능은 **출력 구조가 고정**(점수/평가/추천 등)이므로 Output 변동 폭이 적다 (489~909). 긴 노트는 Input이 커지지만 Output도 약간만 늘어남. **비용 범위: $0.0013 ~ $0.0026 (2.0배 차이)**

---

#### 2.1.6 주간 리포트

**프롬프트 구조**: 학생의 주간 학습 데이터를 요약하여 3~4문장 리포트 + 학습 팁 1개 제공. (Flash-Lite 경량 모델)

| 변형 | 테스트 입력 | Input | Output | 총 토큰 | 비용 |
|---|---|---|---|---|---|
| **short_clean** | 노트 3개, 이해도 72%, 취약: loops(55%) | 82 | 104 | 186 | $0.000050 |
| **long_clean** | 노트 18개, 이해도 81%, 코드 14회, 튜터 23회, 퀴즈 4회 | 211 | 230 | 441 | $0.000113 |
| **short_messy** | 노트 1개(untitled), 이해도 N/A, 제출 0회 | 75 | 76 | 151 | $0.000038 |
| **long_messy** | 노트 15개, 이해도 38%, 제출 9회(평균 34점), 튜터 45회, 퀴즈 평균 29점, 마감 2회 미스 | 226 | 184 | 410 | $0.000096 |

**short_clean** — 적은 활동량 학생:
> Total notes: 3 (variables, conditionals, loops)
> New notes this week: 1 (loops)
> Average understanding: 72%
> Weakest areas: loops(55%)

**long_clean** — 많은 활동량 우수 학생:
> Total notes: 18 (Python basics, variables, data types, conditionals, loops, functions, modules, OOP basics, inheritance, polymorphism, encapsulation, algorithms intro, sorting, searching, recursion, dynamic programming, stacks, queues)
> New notes this week: 6 (recursion, dynamic programming, stacks, queues, sorting, searching)
> Average understanding: 81%
> Strongest areas: variables(95%), conditionals(92%), data types(90%), functions(88%)
> Weakest areas: dynamic programming(42%), recursion(55%), stacks(63%)
> Code submissions this week: 14 (avg score: 76)
> Tutor questions: 23
> Quiz scores: [85, 72, 90, 68]

**short_messy** — 거의 활동 없는 학생:
> Total notes: 1 (untitled)
> New notes this week: 0
> Average understanding: N/A (no analysis done)
> Code submissions: 0

**long_messy** — 많이 했지만 이해도가 낮은 학생:
> Total notes: 15 (Python intro, variables maybe, types idk, if else, loops, for while, function, class stuff, list, dict, tuple, set, file io, exception, regex)
> New notes this week: 5 (class stuff, list, dict, tuple, set)
> Average understanding: 38%
> Strongest areas: variables(61%), Python intro(58%)
> Weakest areas: regex(12%), exception(18%), class stuff(22%), file io(25%), dict(28%), tuple(30%), set(31%)
> Code submissions this week: 9 (avg score: 34)
> Tutor questions: 45
> Quiz scores: [22, 35, 18, 40, 28]
> Missed deadlines: 2

> **분석**: Flash-Lite 사용으로 **모든 변형이 $0.0001 이하**. 가장 저렴한 기능. **비용 범위: $0.00004 ~ $0.00011 (3.0배 차이)**

---

### 2.2 교수 기능

교수 기능은 시스템이 생성한 프롬프트를 사용하므로 사용자 입력 품질에 의한 변동이 적다. v1 측정값을 기준으로 기록한다.

| 기능 | 모델 | Input | Output | 총 토큰 | 호출당 비용 | 테스트 입력 |
|---|---|---|---|---|---|---|
| **문제 아웃라인** | Flash | 97 | 314 | 411 | $0.000814 | 주제: Python lists and dictionaries, 5문제 |
| **문제 상세** | Flash | 64 | 613 | 677 | $0.001552 | 아웃라인 기반 개별 문제 상세 생성 |
| **TC 생성** | Flash-Lite | 183 | 494 | 677 | $0.000216 | "두 수의 합" 문제, 8개 랜덤 TC |
| **퀴즈 생성** | Flash | 245 | 957 | 1,202 | $0.002466 | Python basics / medium / 객관식+단답+서술 3문제 |
| **대시보드** | Flash-Lite | 141 | 629 | 770 | $0.000266 | 제출 87건, 평균 72점, 이해도 61% |
| **서술형 채점** | Flash | 137 | 408 | 545 | $0.001061 | 주관식 1문항 rubric 기반 채점 |

---

### 2.3 기능별 비용 범위 종합표

| 기능 | 모델 | 최소 비용 | 최대 비용 | 배율 | 최소 토큰 | 최대 토큰 |
|---|---|---|---|---|---|---|
| **튜터 채팅** | Flash | $0.000555 | $0.001661 | x3.0 | 392 | 1,205 |
| **코드 분석** | Flash | $0.003750 | $0.008703 | x2.3 | 1,780 | 4,606 |
| **노트 중 질문** | Flash | $0.000338 | $0.001120 | x3.3 | 337 | 1,022 |
| **노트 다듬기** | Flash | $0.000363 | $0.002228 | x6.1 | 359 | 1,582 |
| **노트 분석** | Flash | $0.001299 | $0.002614 | x2.0 | 744 | 2,046 |
| **주간 리포트** | Flash-Lite | $0.000038 | $0.000113 | x3.0 | 151 | 441 |

### 2.4 학생 유형별 하루 비용

평상시 수업일 기준 (튜터 2회 + 코드 분석 1회 + 노트 질문 1회 + 노트 분석 1회):

| 학생 유형 | 설명 | 하루 비용 | 원화 |
|---|---|---|---|
| **모범생 (짧은 코드)** | 깔끔한 코드, 명확한 질문 | $0.009216 | 12.7원 |
| **모범생 (긴 코드)** | 잘 구조화된 긴 코드, 상세 질문 | $0.009740 | 13.4원 |
| **초보 (짧은 코드)** | 엉망인 짧은 코드, 모호한 질문 | $0.006618 | 9.1원 |
| **초보 (긴 코드)** | 엉망인 긴 코드, 장황한 질문 | **$0.013059** | **18.0원** |

> **핵심 발견**: 최악의 경우(초보+긴 코드)도 하루 18원. 최선과 최악의 차이는 약 **2배**이며, 이는 주로 코드 분석의 Output 차이($0.0038 vs $0.0087)에서 발생한다.

### 2.5 비용 분포 분석

모범생 (short_clean, 튜터 2회 + 코드 1회 + 노트질문 1회 + 노트분석 1회):

```
코드 분석      ████████████████████████████████████████████  42.6%  ($0.00393)
튜터 질문 x2   ████████████████████████████████████████      36.0%  ($0.00332)
노트 분석      ██████████████████                            17.7%  ($0.00163)
노트 질문      ████                                           3.7%  ($0.00034)
```

초보 학생 (long_messy, 동일 액션):

```
코드 분석      ████████████████████████████████████████████████████████████████████  66.7%  ($0.00870)
노트 분석      ████████████████                              15.8%  ($0.00206)
튜터 질문 x2   █████████                                      9.0%  ($0.00117)
노트 질문      █████████                                      8.6%  ($0.00112)
```

> **핵심 발견**: 코드 분석이 **모든 학생 유형에서 최대 비중**. 초보의 엉망 코드는 지적 사항이 많아 Output 3,328 tokens → 비용 2.3배 증가, 전체의 67%를 차지.

---

## 3. 시나리오별 비용 시뮬레이션

### 3.1 시나리오 환경 변수 요약

| 시나리오 | 수강생 | 접속률 | 실접속 | 사용시간 | 과목 | 503 재시도 |
|---|---|---|---|---|---|---|
| 평상시 수업일 | 30명 | 70% | 21명 | 1.5h | 1개 | x1.1 |
| 과제 마감일 | 30명 | 95% | 28명 | 3.0h | 1개 | x1.2 |
| 시험 기간 (5시간) | 30명 | 100% | 30명 | 5.0h | 3개 | x1.3 |
| 시험 당일 | 30명 | 100% | 30명 | 2.0h | 1개 | x1.15 |
| 대규모 강의 | 100명 | 60% | 60명 | 1.0h | 1개 | x1.15 |
| 글쓰기 수업 | 30명 | 80% | 24명 | 2.0h | 1개 | x1.1 |
| 주말 자율학습 | 30명 | 25% | 7명 | 3.0h | 2개 | x1.05 |

---

### 3.2 시나리오 1: 평상시 수업일

> 일반적인 수업이 있는 평일. 학생은 수업 듣고 과제 1개 수행.

**환경**: 30명 / 접속률 70% / 1.5시간 / 1과목

#### 학생 1인 액션

| 액션 | 모델 | 횟수 | Input | Output | 비용 |
|---|---|---|---|---|---|
| 튜터 질문 2회 (개념) | Flash | 2 | 378 | 130 | $0.000482 |
| 코드 제출 분석 1회 (짧은 코드) | Flash | 1 | 365 | 1,612 | $0.004553 |
| 노트 중 질문 1회 | Flash | 1 | 175 | 102 | $0.000338 |
| 노트 분석 1회 | Flash | 1 | 299 | 527 | $0.001548 |
| **학생 1인 합계** | | | | | **$0.006922 (9.6원)** |

#### 교수 액션

| 액션 | 모델 | 횟수 | Input | Output | 비용 |
|---|---|---|---|---|---|
| 문제 아웃라인 5개 생성 | Flash | 1 | 97 | 314 | $0.000896 |
| 문제 상세 5개 병렬 생성 | Flash | 5 | 320 | 3,065 | $0.008534 |
| 랜덤 TC 5문제분 생성 | Flash-Lite | 5 | 915 | 2,470 | $0.001187 |
| 대시보드 확인 | Flash-Lite | 1 | 141 | 629 | $0.000292 |
| **교수 합계** | | | | | **$0.010910 (15.1원)** |

> **일일 합계: $0.156 (216원)** = 학생 21명 x $0.0069 + 교수 $0.0109

---

### 3.3 시나리오 2: 과제 마감일

> 과제 마감 당일. 학생들이 몰려서 튜터 질문과 코드 제출이 급증.

**환경**: 30명 / 접속률 95% / 3시간 / 1과목 / 503 재시도 20%

#### 학생 1인 액션

| 액션 | 모델 | 횟수 | Input | Output | 비용 |
|---|---|---|---|---|---|
| 튜터 질문 5회 (코드 맥락) | Flash | 5 | 600 | 305 | $0.001131 |
| 튜터 개념 질문 3회 | Flash | 3 | 567 | 195 | $0.000789 |
| 코드 제출 분석 2회 (긴 코드) | Flash | 2 | 1,002 | 3,460 | $0.010741 |
| 노트 중 질문 2회 | Flash | 2 | 350 | 204 | $0.000738 |
| 노트 다듬기 1회 | Flash | 1 | 263 | 158 | $0.000569 |
| 노트 분석 1회 | Flash | 1 | 299 | 527 | $0.001689 |
| **학생 1인 합계** | | | | | **$0.015656 (21.6원)** |

#### 교수 액션

| 액션 | 모델 | 횟수 | 비용 |
|---|---|---|---|
| 대시보드 확인 2회 (제출 현황) | Flash-Lite | 2 | $0.000638 |

> **일일 합계: $0.439 (606원)** = 학생 28명 x $0.0157 + 교수 $0.0006

---

### 3.4 시나리오 3: 시험 기간 (5시간 집중 학습)

> 중간/기말고사 1주 전. 모든 학생이 평균 5시간 PikaBuddy로 복습.

**환경**: 30명 / 접속률 100% / 5시간 / 3과목 / 503 재시도 30%

#### 학생 1인 액션

| 액션 | 모델 | 횟수 | Input | Output | 비용 |
|---|---|---|---|---|---|
| 튜터 코드 질문 8회 (3과목) | Flash | 8 | 960 | 488 | $0.001960 |
| 튜터 개념 질문 12회 (시험 범위 복습) | Flash | 12 | 2,268 | 780 | $0.003420 |
| 노트 중 질문 6회 | Flash | 6 | 1,050 | 612 | $0.002399 |
| 노트 심층 분석 3회 (과목별 1회) | Flash | 3 | 282 | 3,636 | $0.011927 |
| 노트 다듬기 2회 | Flash | 2 | 526 | 316 | $0.001232 |
| 주간 리포트 3과목 확인 | Flash-Lite | 3 | 330 | 459 | $0.000282 |
| **학생 1인 합계** | | | | | **$0.021219 (29.3원)** |

#### 교수 액션

| 액션 | 모델 | 횟수 | Input | Output | 비용 |
|---|---|---|---|---|---|
| 퀴즈/시험 문제 생성 3과목 | Flash | 3 | 735 | 2,871 | $0.009617 |
| 코딩 시험 문제 아웃라인 | Flash | 2 | 194 | 628 | $0.002117 |
| 코딩 시험 문제 상세 10개 | Flash | 10 | 640 | 6,130 | $0.020172 |
| 시험 문제 TC 10개분 | Flash-Lite | 10 | 1,830 | 4,940 | $0.002807 |
| 대시보드 3과목 확인 | Flash-Lite | 3 | 423 | 1,887 | $0.001036 |
| **교수 합계** | | | | | **$0.035749 (49.3원)** |

> **일일 합계: $0.672 (928원)** = 학생 30명 x $0.0212 + 교수 $0.0357

---

### 3.5 시나리오 4: 시험 당일

> 온라인 코딩 시험. 학생 전원이 2시간 동안 시험 + AI 채점.

**환경**: 30명 / 접속률 100% / 2시간 / 1과목

#### 학생 1인 액션 (시험 모드 — 튜터 사용 불가, AI는 채점에만 사용)

| 액션 | 모델 | 횟수 | Input | Output | 비용 |
|---|---|---|---|---|---|
| 코딩 문제 3개 AI 채점 | Flash | 3 | 1,503 | 5,190 | $0.015440 |
| 서술형 문제 2개 AI 채점 | Flash | 2 | 274 | 816 | $0.002441 |
| **학생 1인 합계** | | | | | **$0.017880 (24.7원)** |

#### 교수 액션

| 액션 | 모델 | 횟수 | 비용 |
|---|---|---|---|
| 시험 후 대시보드 확인 | Flash-Lite | 1 | $0.000306 |

> **일일 합계: $0.537 (741원)** = 학생 30명 x $0.0179 + 교수 $0.0003

---

### 3.6 시나리오 5: 대규모 강의 (100명)

> 수강생 100명인 교양 프로그래밍 수업. 평상시 수업일.

**환경**: 100명 / 접속률 60% / 1시간 / 1과목

#### 학생 1인 액션

| 액션 | 모델 | 횟수 | Input | Output | 비용 |
|---|---|---|---|---|---|
| 튜터 질문 2회 | Flash | 2 | 378 | 130 | $0.000504 |
| 코드 제출 분석 1회 | Flash | 1 | 365 | 1,612 | $0.004760 |
| 노트 질문 1회 | Flash | 1 | 175 | 102 | $0.000354 |
| **학생 1인 합계** | | | | | **$0.005618 (7.8원)** |

#### 교수 액션

| 액션 | 모델 | 횟수 | 비용 |
|---|---|---|---|
| 문제 아웃라인 | Flash | 1 | $0.000936 |
| 문제 상세 5개 | Flash | 5 | $0.008922 |
| TC 5문제분 | Flash-Lite | 5 | $0.001241 |
| 대시보드 | Flash-Lite | 1 | $0.000306 |
| **교수 합계** | | | **$0.011405 (15.7원)** |

> **일일 합계: $0.348 (481원)** = 학생 60명 x $0.0056 + 교수 $0.0114

---

### 3.7 시나리오 6: 글쓰기 과제 수업

> 코딩이 아닌 서술형/글쓰기 위주 과제. 에세이 제출 + AI 피드백.

**환경**: 30명 / 접속률 80% / 2시간 / 1과목

#### 학생 1인 액션

| 액션 | 모델 | 횟수 | Input | Output | 비용 |
|---|---|---|---|---|---|
| 튜터 질문 3회 (개념) | Flash | 3 | 567 | 195 | $0.000723 |
| 글쓰기 과제 AI 분석 | Flash | 1 | 128 | 952 | $0.002660 |
| 노트 질문 2회 | Flash | 2 | 350 | 204 | $0.000677 |
| 노트 다듬기 2회 | Flash | 2 | 526 | 316 | $0.001043 |
| 노트 분석 1회 | Flash | 1 | 299 | 527 | $0.001548 |
| **학생 1인 합계** | | | | | **$0.006651 (9.2원)** |

#### 교수 액션

| 액션 | 모델 | 횟수 | 비용 |
|---|---|---|---|
| 글쓰기 지시문 생성 | Flash | 1 | $0.000583 |
| 대시보드 확인 | Flash-Lite | 1 | $0.000292 |
| **교수 합계** | | | **$0.000875 (1.2원)** |

> **일일 합계: $0.160 (221원)** = 학생 24명 x $0.0067 + 교수 $0.0009

---

### 3.8 시나리오 7: 주말 자율 학습

> 주말에 자발적으로 접속하는 학생들. 소수만 접속하지만 오래 사용.

**환경**: 30명 / 접속률 25% / 3시간 / 2과목 / 교수 미접속

#### 학생 1인 액션

| 액션 | 모델 | 횟수 | Input | Output | 비용 |
|---|---|---|---|---|---|
| 튜터 코드 질문 4회 | Flash | 4 | 480 | 244 | $0.000792 |
| 튜터 개념 질문 4회 | Flash | 4 | 756 | 260 | $0.000921 |
| 코드 제출 분석 2회 | Flash | 2 | 730 | 3,224 | $0.008693 |
| 노트 질문 3회 | Flash | 3 | 525 | 306 | $0.000969 |
| 노트 다듬기 | Flash | 1 | 263 | 158 | $0.000498 |
| 노트 분석 2회 | Flash | 2 | 598 | 1,054 | $0.002955 |
| 주간 리포트 2과목 | Flash-Lite | 2 | 220 | 306 | $0.000152 |
| **학생 1인 합계** | | | | | **$0.014978 (20.7원)** |

> **일일 합계: $0.105 (145원)** = 학생 7명 x $0.0150 (교수 미접속)

---

## 4. 일일 비용 비교

| 시나리오 | 일일 비용 (USD) | 일일 비용 (KRW) | 학생 1인당 |
|---|---|---|---|
| 주말 자율학습 | $0.105 | 145원 | 20.7원 |
| 평상시 수업일 | $0.156 | 216원 | 9.6원 |
| 글쓰기 수업 | $0.160 | 221원 | 9.2원 |
| 대규모 강의 (100명) | $0.348 | 481원 | 7.8원 |
| 과제 마감일 | $0.439 | 606원 | 21.6원 |
| 시험 당일 | $0.537 | 741원 | 24.7원 |
| **시험 기간 (5시간)** | **$0.672** | **928원** | **29.3원** |

---

## 5. 월간 비용 추산

### 5.1 일반 월 (30명 강의 1개)

| 유형 | 일수 | 일일 비용 | 소계 |
|---|---|---|---|
| 평상시 수업일 | 12일 | $0.156 | $1.875 |
| 과제 마감일 | 4일 | $0.439 | $1.756 |
| 글쓰기 수업 | 2일 | $0.160 | $0.321 |
| 주말 자율학습 | 8일 | $0.105 | $0.839 |
| **합계** | **26일** | | **$4.79 (6,612원)** |

### 5.2 시험 기간 월 (30명 강의 1개)

| 유형 | 일수 | 일일 비용 | 소계 |
|---|---|---|---|
| 평상시 수업일 | 6일 | $0.156 | $0.938 |
| 과제 마감일 | 2일 | $0.439 | $0.878 |
| 시험 대비 학습 | 4일 | $0.672 | $2.689 |
| 시험 당일 | 2일 | $0.537 | $1.073 |
| 주말 자율학습 | 4일 | $0.105 | $0.419 |
| 글쓰기 수업 | 2일 | $0.160 | $0.321 |
| **합계** | **20일** | | **$6.32 (8,720원)** |

### 5.3 대규모 강의 월 (100명)

| 유형 | 일수 | 일일 비용 | 소계 |
|---|---|---|---|
| 수업일 | 16일 | $0.348 | $5.576 |
| 주말 자율학습 | 8일 | $0.105 | $0.839 |
| **합계** | **24일** | | **$6.41 (8,852원)** |

---

## 6. 연간 비용 추산

> 1학기 = 일반 월 3개 + 시험 월 1개 = 4개월, 연간 = 2학기 = 8개월

| 규모 | 학기 비용 | **연간 비용 (USD)** | **연간 비용 (KRW)** |
|---|---|---|---|
| 30명 x 1강의 | $20.69 | **$41.38** | **57,109원** |
| 100명 x 1강의 | $25.66 | **$51.32** | **70,819원** |
| 30명 x 5강의 | $103.46 | **$206.92** | **285,547원** |
| 100명 x 3강의 | $76.98 | **$153.95** | **212,457원** |

---

## 7. 비용이 저렴한 이유

### 7.1 Gemini Flash 모델의 가격 경쟁력

Gemini 2.5 Flash는 Google이 "가성비" 포지셔닝으로 내놓은 모델이다:
- GPT-4o 대비 Input **10배**, Output **4배** 저렴
- Claude 3.5 Sonnet 대비 Input **10배**, Output **6배** 저렴
- Flash-Lite는 여기서 **추가 3~6배** 저렴

### 7.2 교육 플랫폼 특성

| 요인 | 설명 |
|---|---|
| **짧은 프롬프트** | 교육용 프롬프트는 평균 100~300 input tokens로 짧다 |
| **구조화된 출력** | 분석 결과가 정형화되어 있어 output도 제한적 |
| **동시 접속 분산** | 30명이 동시에 몰리지 않고, 시간대별로 분산 사용 |
| **비대칭 사용** | 교수 기능 (문제 생성)은 하루 1회성, 학생 기능이 주 사용 |

### 7.3 비용 vs 가치

| 비교 대상 | 비용 |
|---|---|
| PikaBuddy 학생 1인 연간 AI 비용 | **~1,900원** (30명 강의 기준) |
| 커피 1잔 | ~5,000원 |
| ChatGPT Plus 1개월 | ~28,000원 |
| 과외비 1시간 | ~30,000~50,000원 |

---

## 8. 위험 요소 및 주의사항

| 항목 | 설명 | 대응 |
|---|---|---|
| **실사용 토큰 > 측정값** | 실제 대화 히스토리 누적 시 input 증가 | 히스토리 길이 제한 (최근 5턴) |
| **503 과부하** | 피크타임 재시도 시 비용 증가 (최대 x1.3) | Fallback 체인으로 자동 전환 |
| **모델 가격 변동** | Google 가격 정책 변경 가능성 | 런타임 토큰 추적 (`/api/token-stats`)으로 실시간 모니터링 |
| **스케일링** | 수강생 급증 시 선형 비용 증가 | 100명 3강의도 연간 21만원으로 감당 가능 |
| **코드 분석 비용 집중** | 전체 비용의 56%를 차지 | 짧은 코드 우선 분석, 긴 코드는 요약 후 상세 분석 |

---

## 9. 런타임 모니터링

PikaBuddy는 실시간 토큰 사용량 추적 API를 내장하고 있다.

```
GET  /api/token-stats        # 현재 토큰 사용량 조회
POST /api/token-stats/reset  # 통계 초기화
```

**응답 예시**:
```json
{
  "uptime_seconds": 3600,
  "totals": {
    "calls": 42,
    "input_tokens": 8500,
    "output_tokens": 15200,
    "total_tokens": 23700,
    "cost_usd": 0.042135
  },
  "by_model": {
    "gemini-2.5-flash": { "calls": 35, "cost_usd": 0.039 },
    "gemini-2.5-flash-lite": { "calls": 7, "cost_usd": 0.003 }
  },
  "by_endpoint": {
    "tutor_chat": { "calls": 15, "cost_usd": 0.012 },
    "code_analysis": { "calls": 8, "cost_usd": 0.018 },
    ...
  },
  "recent_calls": [ ... ]
}
```

---

## 10. 결론

| 지표 | 값 |
|---|---|
| 학생 1인 하루 평균 비용 | **$0.007 (9.6원)** |
| 학생 1인 하루 최대 비용 (시험기간) | **$0.021 (29.3원)** |
| 30명 강의 월간 비용 | **$4.79 ~ $6.32 (6,612 ~ 8,720원)** |
| 30명 강의 연간 비용 | **$41.38 (57,109원)** |
| 100명 x 3강의 연간 비용 | **$153.95 (212,457원)** |

> **PikaBuddy의 AI 비용은 학생 1인당 연간 약 1,900원으로, 커피 반 잔 가격이다.**  
> Gemini Flash의 극도로 낮은 토큰 가격과 교육 플랫폼 특성상 짧은 프롬프트가 결합된 결과이며,  
> 100명 규모의 대형 강의 3개를 운영해도 연간 21만원 수준이다.
