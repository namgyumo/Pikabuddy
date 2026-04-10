"""
노트 카테고리 시스템 — 150개 사전 정의 카테고리
AI 분석 시 카테고리 선택 / 키워드 기반 자동 매칭
"""

# (slug, 한글명, 키워드 리스트)
CATEGORIES: list[tuple[str, str, list[str]]] = [
    # ── 프로그래밍 기초 ──
    ("variable", "변수", ["변수", "variable", "var", "let", "const", "할당", "선언"]),
    ("data-type", "자료형", ["자료형", "데이터타입", "int", "float", "string", "bool", "char", "타입", "형변환", "캐스팅"]),
    ("operator", "연산자", ["연산자", "operator", "산술", "비교", "논리", "비트", "삼항"]),
    ("control-flow", "제어문", ["제어문", "조건문", "if", "else", "switch", "case", "분기"]),
    ("loop", "반복문", ["반복문", "for", "while", "do-while", "루프", "loop", "반복", "iteration"]),
    ("function", "함수", ["함수", "function", "def", "return", "매개변수", "인자", "parameter", "argument", "호출"]),
    ("scope", "스코프", ["스코프", "scope", "지역변수", "전역변수", "클로저", "closure", "렉시컬"]),
    ("recursion", "재귀", ["재귀", "recursion", "recursive", "base case", "종료조건", "재귀호출"]),
    ("io", "입출력", ["입출력", "input", "output", "print", "scanf", "cin", "cout", "stdin", "stdout"]),
    ("string-ops", "문자열", ["문자열", "string", "substr", "문자열처리", "슬라이싱", "split", "join", "정규표현식", "regex"]),
    ("array", "배열", ["배열", "array", "리스트", "list", "인덱스", "index", "요소"]),
    ("comment", "주석/문서화", ["주석", "comment", "docstring", "문서화", "documentation"]),
    ("debugging", "디버깅", ["디버깅", "debug", "breakpoint", "print문", "에러추적", "traceback"]),
    ("error-handling", "예외처리", ["예외", "exception", "try", "catch", "finally", "throw", "raise", "에러처리"]),

    # ── 자료구조 ──
    ("linked-list", "연결리스트", ["연결리스트", "linked list", "노드", "node", "next", "단일연결", "이중연결"]),
    ("stack", "스택", ["스택", "stack", "push", "pop", "LIFO", "후입선출"]),
    ("queue", "큐", ["큐", "queue", "enqueue", "dequeue", "FIFO", "선입선출", "우선순위큐"]),
    ("tree", "트리", ["트리", "tree", "루트", "root", "리프", "leaf", "서브트리", "트리구조"]),
    ("binary-tree", "이진트리", ["이진트리", "binary tree", "이진탐색트리", "BST", "완전이진", "균형트리"]),
    ("heap", "힙", ["힙", "heap", "최대힙", "최소힙", "heapify", "우선순위큐"]),
    ("hash-table", "해시테이블", ["해시", "hash", "해시테이블", "딕셔너리", "dictionary", "해시맵", "hashmap", "충돌"]),
    ("graph-ds", "그래프", ["그래프", "graph", "정점", "vertex", "간선", "edge", "인접리스트", "인접행렬"]),
    ("set-ds", "집합", ["집합", "set", "합집합", "교집합", "차집합", "union", "intersection"]),
    ("tuple", "튜플", ["튜플", "tuple", "불변", "immutable", "named tuple"]),
    ("deque", "덱", ["덱", "deque", "양방향큐", "double-ended"]),
    ("trie", "트라이", ["트라이", "trie", "접두사트리", "prefix tree"]),

    # ── 알고리즘 ──
    ("sorting", "정렬", ["정렬", "sort", "버블", "선택", "삽입", "퀵", "머지", "병합", "힙정렬", "기수정렬"]),
    ("searching", "탐색", ["탐색", "search", "이진탐색", "binary search", "순차탐색", "linear search"]),
    ("bfs", "BFS", ["BFS", "너비우선", "breadth-first", "레벨탐색"]),
    ("dfs", "DFS", ["DFS", "깊이우선", "depth-first", "백트래킹"]),
    ("dynamic-programming", "동적프로그래밍", ["동적프로그래밍", "DP", "dynamic programming", "메모이제이션", "memoization", "최적부분구조"]),
    ("greedy", "그리디", ["그리디", "greedy", "탐욕", "최적해", "활동선택"]),
    ("divide-conquer", "분할정복", ["분할정복", "divide and conquer", "분할", "정복", "병합"]),
    ("backtracking", "백트래킹", ["백트래킹", "backtracking", "가지치기", "pruning", "N-Queen"]),
    ("graph-algo", "그래프알고리즘", ["다익스트라", "dijkstra", "벨만포드", "플로이드", "크루스칼", "프림", "최단경로", "최소신장트리"]),
    ("time-complexity", "시간복잡도", ["시간복잡도", "빅오", "big-o", "O(n)", "O(log n)", "복잡도분석", "성능"]),
    ("space-complexity", "공간복잡도", ["공간복잡도", "메모리", "space complexity", "in-place"]),
    ("two-pointer", "투포인터", ["투포인터", "two pointer", "슬라이딩윈도우", "sliding window"]),
    ("bit-manipulation", "비트연산", ["비트", "bit", "비트마스크", "bitmask", "AND", "OR", "XOR", "시프트"]),

    # ── 객체지향 ──
    ("oop", "객체지향", ["객체지향", "OOP", "object-oriented", "객체", "object"]),
    ("class", "클래스", ["클래스", "class", "인스턴스", "instance", "생성자", "constructor", "__init__"]),
    ("inheritance", "상속", ["상속", "inheritance", "extends", "super", "부모클래스", "자식클래스", "오버라이딩"]),
    ("polymorphism", "다형성", ["다형성", "polymorphism", "오버로딩", "overloading", "오버라이딩", "overriding"]),
    ("encapsulation", "캡슐화", ["캡슐화", "encapsulation", "접근제어", "private", "public", "protected", "getter", "setter"]),
    ("abstraction", "추상화", ["추상화", "abstraction", "인터페이스", "interface", "abstract class", "추상클래스"]),
    ("design-pattern", "디자인패턴", ["디자인패턴", "패턴", "싱글톤", "팩토리", "옵저버", "전략", "MVC", "MVVM"]),
    ("solid", "SOLID원칙", ["SOLID", "단일책임", "개방폐쇄", "리스코프", "인터페이스분리", "의존역전"]),

    # ── 데이터베이스 ──
    ("sql", "SQL", ["SQL", "쿼리", "query", "SELECT", "INSERT", "UPDATE", "DELETE"]),
    ("join", "JOIN", ["JOIN", "조인", "INNER JOIN", "LEFT JOIN", "외래키"]),
    ("normalization", "정규화", ["정규화", "normalization", "1NF", "2NF", "3NF", "BCNF"]),
    ("index-db", "인덱스", ["인덱스", "index", "B-tree", "해시인덱스", "복합인덱스"]),
    ("transaction", "트랜잭션", ["트랜잭션", "transaction", "ACID", "커밋", "롤백", "commit", "rollback"]),
    ("nosql", "NoSQL", ["NoSQL", "MongoDB", "Redis", "문서DB", "키-값", "컬럼형"]),
    ("er-model", "ER모델", ["ER", "개체관계", "entity", "relationship", "ERD", "스키마"]),
    ("rdb", "관계형DB", ["관계형", "RDB", "RDBMS", "MySQL", "PostgreSQL", "테이블", "릴레이션"]),

    # ── 웹 개발 ──
    ("html", "HTML", ["HTML", "태그", "tag", "마크업", "DOM", "시멘틱"]),
    ("css", "CSS", ["CSS", "스타일", "레이아웃", "flexbox", "grid", "반응형", "미디어쿼리"]),
    ("javascript", "JavaScript", ["JavaScript", "JS", "자바스크립트", "ES6", "ECMAScript"]),
    ("typescript", "TypeScript", ["TypeScript", "TS", "타입스크립트", "타입", "제네릭"]),
    ("react", "React", ["React", "리액트", "컴포넌트", "JSX", "useState", "useEffect", "훅", "props"]),
    ("vue", "Vue", ["Vue", "뷰", "Vuex", "composition API", "v-bind", "v-model"]),
    ("nodejs", "Node.js", ["Node", "Express", "npm", "서버사이드JS", "미들웨어"]),
    ("rest-api", "REST API", ["REST", "API", "엔드포인트", "endpoint", "GET", "POST", "PUT", "DELETE", "CRUD"]),
    ("graphql", "GraphQL", ["GraphQL", "쿼리언어", "mutation", "subscription", "스키마"]),
    ("http", "HTTP", ["HTTP", "HTTPS", "상태코드", "헤더", "요청", "응답", "쿠키", "세션"]),
    ("auth", "인증/인가", ["인증", "인가", "로그인", "JWT", "OAuth", "세션", "토큰", "authentication", "authorization"]),
    ("cors", "CORS", ["CORS", "교차출처", "cross-origin", "same-origin"]),
    ("websocket", "WebSocket", ["WebSocket", "웹소켓", "실시간", "양방향통신", "소켓"]),
    ("spa", "SPA", ["SPA", "싱글페이지", "라우팅", "CSR", "SSR", "하이드레이션"]),

    # ── 시스템/OS ──
    ("os", "운영체제", ["운영체제", "OS", "커널", "kernel", "시스템콜"]),
    ("process", "프로세스", ["프로세스", "process", "PCB", "컨텍스트스위칭", "멀티프로세스"]),
    ("thread", "스레드", ["스레드", "thread", "멀티스레드", "동시성", "병렬", "race condition"]),
    ("memory-mgmt", "메모리관리", ["메모리관리", "가상메모리", "페이징", "세그먼테이션", "malloc", "free", "가비지컬렉션"]),
    ("file-system", "파일시스템", ["파일시스템", "디렉토리", "inode", "파일입출력"]),
    ("deadlock", "데드락", ["데드락", "deadlock", "교착상태", "뮤텍스", "세마포어", "mutex", "semaphore"]),
    ("scheduling", "스케줄링", ["스케줄링", "scheduling", "라운드로빈", "FIFO", "SJF", "우선순위"]),
    ("cache", "캐시", ["캐시", "cache", "캐싱", "LRU", "히트율", "미스율"]),

    # ── 네트워크 ──
    ("network", "네트워크", ["네트워크", "network", "프로토콜", "protocol", "패킷"]),
    ("tcp-ip", "TCP/IP", ["TCP", "IP", "UDP", "3-way handshake", "소켓", "포트"]),
    ("osi", "OSI모델", ["OSI", "계층", "물리", "데이터링크", "네트워크층", "전송층", "응용층"]),
    ("dns", "DNS", ["DNS", "도메인", "네임서버", "IP주소"]),
    ("encryption", "암호화", ["암호화", "encryption", "대칭키", "비대칭키", "RSA", "AES", "해시", "SSL", "TLS"]),

    # ── 소프트웨어 공학 ──
    ("git", "Git/버전관리", ["Git", "버전관리", "커밋", "브랜치", "머지", "풀리퀘스트", "GitHub"]),
    ("testing", "테스트", ["테스트", "test", "단위테스트", "통합테스트", "TDD", "assertion", "mock"]),
    ("agile", "애자일", ["애자일", "스크럼", "스프린트", "칸반", "백로그"]),
    ("ci-cd", "CI/CD", ["CI", "CD", "배포", "자동화", "파이프라인", "Jenkins", "GitHub Actions"]),
    ("docker", "Docker/컨테이너", ["Docker", "컨테이너", "이미지", "Dockerfile", "도커", "Kubernetes"]),
    ("clean-code", "클린코드", ["클린코드", "리팩토링", "코드품질", "네이밍", "가독성"]),
    ("architecture", "아키텍처", ["아키텍처", "모놀리스", "마이크로서비스", "레이어드", "헥사고날", "클린아키텍처"]),
    ("uml", "UML", ["UML", "클래스다이어그램", "시퀀스다이어그램", "유스케이스"]),

    # ── AI / 머신러닝 ──
    ("ml", "머신러닝", ["머신러닝", "machine learning", "ML", "학습", "훈련", "모델"]),
    ("deep-learning", "딥러닝", ["딥러닝", "deep learning", "신경망", "뉴럴네트워크", "neural network"]),
    ("supervised", "지도학습", ["지도학습", "supervised", "분류", "회귀", "regression", "classification"]),
    ("unsupervised", "비지도학습", ["비지도학습", "unsupervised", "클러스터링", "clustering", "차원축소"]),
    ("cnn", "CNN", ["CNN", "합성곱", "convolution", "풀링", "이미지분류"]),
    ("rnn", "RNN", ["RNN", "LSTM", "GRU", "시퀀스", "시계열"]),
    ("nlp", "자연어처리", ["NLP", "자연어", "토큰화", "임베딩", "BERT", "GPT", "트랜스포머"]),
    ("reinforcement", "강화학습", ["강화학습", "reinforcement", "에이전트", "보상", "Q-learning"]),
    ("data-preprocessing", "데이터전처리", ["전처리", "정규화", "표준화", "결측치", "이상치", "원핫인코딩"]),
    ("evaluation", "모델평가", ["정확도", "accuracy", "정밀도", "재현율", "F1", "AUC", "ROC", "교차검증"]),
    ("numpy-pandas", "NumPy/Pandas", ["numpy", "pandas", "데이터프레임", "ndarray", "시리즈"]),
    ("tensorflow-pytorch", "TensorFlow/PyTorch", ["tensorflow", "pytorch", "텐서", "tensor", "모델학습"]),

    # ── 수학/이론 ──
    ("linear-algebra", "선형대수", ["행렬", "벡터", "선형대수", "고유값", "고유벡터", "내적", "외적"]),
    ("probability", "확률/통계", ["확률", "통계", "분포", "평균", "분산", "표준편차", "베이즈", "가설검정"]),
    ("discrete-math", "이산수학", ["이산수학", "집합론", "논리학", "명제", "그래프이론", "조합", "순열"]),
    ("calculus", "미적분", ["미분", "적분", "미적분", "도함수", "편미분", "기울기", "gradient"]),
    ("number-theory", "정수론", ["정수론", "소수", "GCD", "최대공약수", "모듈러", "유클리드"]),
    ("automata", "오토마타", ["오토마타", "유한상태", "정규언어", "문맥자유", "튜링머신", "NFA", "DFA"]),
    ("complexity-theory", "계산복잡도", ["P", "NP", "NP-완전", "결정불가능", "계산가능"]),

    # ── 모바일 ──
    ("android", "Android", ["Android", "안드로이드", "Activity", "Intent", "Kotlin"]),
    ("ios", "iOS", ["iOS", "Swift", "SwiftUI", "UIKit", "Xcode"]),
    ("flutter", "Flutter", ["Flutter", "Dart", "플러터", "위젯"]),
    ("react-native", "React Native", ["React Native", "RN", "Expo"]),

    # ── 데이터 ──
    ("data-analysis", "데이터분석", ["데이터분석", "시각화", "matplotlib", "seaborn", "차트", "그래프"]),
    ("big-data", "빅데이터", ["빅데이터", "하둡", "스파크", "MapReduce", "Kafka"]),
    ("data-mining", "데이터마이닝", ["데이터마이닝", "패턴", "연관규칙", "분류", "군집화"]),
    ("web-scraping", "웹스크래핑", ["크롤링", "스크래핑", "BeautifulSoup", "Selenium", "파싱"]),

    # ── 보안 ──
    ("security", "보안", ["보안", "security", "취약점", "해킹", "방화벽"]),
    ("xss", "XSS", ["XSS", "크로스사이트스크립팅", "스크립트주입"]),
    ("sql-injection", "SQL인젝션", ["SQL인젝션", "SQL injection", "인젝션공격"]),
    ("csrf", "CSRF", ["CSRF", "사이트간요청위조"]),

    # ── 클라우드/인프라 ──
    ("cloud", "클라우드", ["클라우드", "AWS", "GCP", "Azure", "EC2", "S3", "Lambda"]),
    ("linux", "Linux", ["Linux", "리눅스", "명령어", "쉘", "bash", "chmod", "grep"]),
    ("server", "서버", ["서버", "서버관리", "Nginx", "Apache", "로드밸런서"]),
    ("devops", "DevOps", ["DevOps", "인프라", "모니터링", "Terraform", "Ansible"]),

    # ── 프로그래밍 언어별 ──
    ("python", "Python", ["Python", "파이썬", "pip", "virtualenv", "리스트컴프리헨션", "데코레이터"]),
    ("java", "Java", ["Java", "자바", "JVM", "스프링", "Spring", "Maven", "Gradle"]),
    ("c-lang", "C언어", ["C언어", "포인터", "pointer", "malloc", "구조체", "struct", "헤더파일"]),
    ("cpp", "C++", ["C++", "STL", "템플릿", "template", "스마트포인터", "참조"]),
    ("go", "Go", ["Go", "고랭", "goroutine", "채널", "동시성"]),
    ("rust", "Rust", ["Rust", "러스트", "소유권", "ownership", "borrow", "lifetime"]),

    # ── 기타 CS ──
    ("compiler", "컴파일러", ["컴파일러", "인터프리터", "렉서", "파서", "AST", "코드생성"]),
    ("parallel", "병렬처리", ["병렬", "동시성", "비동기", "async", "await", "Promise", "Future"]),
    ("distributed", "분산시스템", ["분산", "마이크로서비스", "메시지큐", "CAP", "일관성"]),
    ("blockchain", "블록체인", ["블록체인", "비트코인", "이더리움", "스마트컨트랙트", "합의"]),
    ("game-dev", "게임개발", ["게임", "Unity", "Unreal", "물리엔진", "렌더링"]),
    ("embedded", "임베디드", ["임베디드", "아두이노", "라즈베리파이", "펌웨어", "IoT"]),
    ("regex", "정규표현식", ["정규표현식", "regex", "패턴매칭", "re모듈"]),
    ("fp", "함수형프로그래밍", ["함수형", "functional", "람다", "lambda", "map", "filter", "reduce", "불변성"]),
    ("generic", "제네릭", ["제네릭", "generic", "타입파라미터", "와일드카드"]),

    # ── 글쓰기/학문 ──
    ("essay-writing", "에세이", ["에세이", "서론", "본론", "결론", "논증", "주장", "근거"]),
    ("report-writing", "보고서", ["보고서", "리포트", "요약", "분석", "결과", "결론"]),
    ("research", "연구방법", ["연구", "방법론", "논문", "실험", "가설", "변인"]),
    ("presentation", "발표", ["발표", "프레젠테이션", "PPT", "슬라이드"]),
    ("critical-thinking", "비판적사고", ["비판", "논리", "오류", "반박", "분석적"]),
    ("ethics", "윤리", ["윤리", "도덕", "AI윤리", "데이터윤리", "개인정보"]),
    ("philosophy", "철학", ["철학", "인식론", "존재론", "사고실험"]),
    ("economics", "경제학", ["경제", "수요", "공급", "시장", "GDP", "인플레이션"]),
    ("psychology", "심리학", ["심리", "인지", "행동", "동기", "학습이론"]),
    ("physics", "물리학", ["물리", "역학", "에너지", "파동", "전자기", "양자"]),
    ("chemistry", "화학", ["화학", "원소", "분자", "반응", "유기화학"]),
    ("biology", "생물학", ["생물", "세포", "DNA", "유전", "진화", "생태계"]),
    ("math-general", "수학일반", ["수학", "방정식", "함수", "증명", "정리"]),
    ("english", "영어", ["영어", "문법", "어휘", "독해", "작문", "TOEIC", "TOEFL"]),
    ("history", "역사", ["역사", "사건", "시대", "혁명", "문명"]),
    ("sociology", "사회학", ["사회", "문화", "계층", "제도", "불평등"]),
    ("project-mgmt", "프로젝트관리", ["프로젝트", "일정", "마일스톤", "WBS", "간트차트"]),
]

CATEGORY_SLUGS = {c[0] for c in CATEGORIES}
SLUG_TO_NAME = {c[0]: c[1] for c in CATEGORIES}

# slug → 키워드 목록 (소문자)
_KEYWORD_MAP: dict[str, list[str]] = {}
for _slug, _name, _keywords in CATEGORIES:
    _KEYWORD_MAP[_slug] = [kw.lower() for kw in _keywords]


import re as _re


def match_categories_by_text(text: str, max_categories: int = 8) -> list[str]:
    """노트 텍스트에서 키워드 매칭으로 카테고리 자동 할당"""
    text_lower = text.lower()
    scores: dict[str, int] = {}
    for slug, keywords in _KEYWORD_MAP.items():
        count = 0
        for kw in keywords:
            # 짧은 키워드(3자 이하 영문)는 단어 경계 매칭
            if len(kw) <= 3 and kw.isascii():
                if _re.search(r'\b' + _re.escape(kw) + r'\b', text_lower, _re.IGNORECASE):
                    count += 1
            elif len(kw) <= 1:
                continue  # 1자 키워드 무시
            else:
                if kw in text_lower:
                    count += 1
        if count > 0:
            scores[slug] = count
    # 매칭 수 높은 순으로 상위 N개
    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return [slug for slug, _ in ranked[:max_categories]]


def get_categories_prompt_list() -> str:
    """AI 프롬프트에 넣을 카테고리 목록 문자열"""
    lines = []
    for slug, name, _ in CATEGORIES:
        lines.append(f"{slug} ({name})")
    return ", ".join(lines)
