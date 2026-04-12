# PikaBuddy — Technical Design Document (TDD)

작성일: 2026-04-12  
버전: 1.0  
작성자: PikaBuddy 개발팀

---

## 1. 시스템 아키텍처

### 1.1 고수준 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │          React 19 SPA (TypeScript + Vite)                  │  │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │ Zustand  │ │  Tiptap  │ │  Monaco  │ │ ForceGraph2D │  │  │
│  │  │ 7 stores │ │ 10 exts  │ │  Editor  │ │  d3-force    │  │  │
│  │  └─────────┘ └──────────┘ └──────────┘ └──────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                     Cloudflare CDN (정적 호스팅)                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS (:443)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Gateway Layer                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Nginx (리버스 프록시)                     │  │
│  │  • SSL Termination  • gzip (level 4)  • keepalive (16)    │  │
│  │  • client_max_body_size 50m  • SSE proxy buffering off    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTP (:8000)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │           FastAPI 0.115.0 + Uvicorn (3 workers)            │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │              20개 API 모듈 (135 엔드포인트)            │  │  │
│  │  │  auth│courses│assignments│editor│analysis│tutor│     │  │  │
│  │  │  notes│dashboard│proctor│runner│agents│materials│    │  │  │
│  │  │  gamification│messenger│comments│notifications│     │  │  │
│  │  │  events│teams│voting│seed                           │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │  ┌──────────────────┐ ┌──────────────────────────────┐   │  │
│  │  │  Common Layer     │ │   Code Runner (subprocess)   │   │  │
│  │  │ gemini_client.py  │ │ Python│JS│C│C++│Java│C#│    │   │  │
│  │  │ supabase_client.py│ │ Swift│Rust│Go (9개 언어)     │   │  │
│  │  │ r2_client.py      │ │ Docker 내 격리 실행          │   │  │
│  │  │ note_categories.py│ └──────────────────────────────┘   │  │
│  │  └──────────────────┘                                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                         Docker Container                         │
│                    Python 3.12-slim + gcc/g++ + JDK + Node.js    │
└────────┬──────────┬──────────┬──────────┬───────────────────────┘
         │          │          │          │
         ▼          ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
│ Supabase │ │ Gemini   │ │ R2       │ │ Supabase     │
│PostgreSQL│ │ API      │ │ (S3)     │ │ Realtime     │
│ 27 tables│ │ 3-tier   │ │ boto3    │ │ WebSocket    │
│ 51 index │ │ fallback │ │ 파일저장  │ │ 실시간 이벤트 │
└──────────┘ └──────────┘ └──────────┘ └──────────────┘
```

### 1.2 데이터 흐름

```
학생 코드 작성 → 스냅샷 저장 (30초) → 제출 → AI 분석 → SSE 피드백
                      ↓                         ↓
                 붙여넣기 감지              분석 결과 DB 저장
                      ↓                         ↓
                 교수 스냅샷 diff 조회      교수 대시보드 반영
```

---

## 2. 기술 스택 상세

### 2.1 프론트엔드

| 기술 | 버전 | 용도 |
|------|------|------|
| **React** | 19.2.4 | UI 라이브러리 |
| **TypeScript** | 5.9.3 | 타입 안전성 |
| **Vite** | 8.0.1 | 빌드 도구 (HMR, 코드 분할) |
| **React Router** | 7.14.0 | 클라이언트 사이드 라우팅 |
| **Zustand** | 5.0.12 | 전역 상태 관리 (7개 스토어) |
| **Axios** | 1.14.0 | HTTP 클라이언트 (인터셉터, 토큰 관리) |
| **Tiptap** | 3.22.x | 리치 텍스트 에디터 (10개 커스텀 확장) |
| **Monaco Editor** | 4.7.0 | 코드 에디터 (VS Code 엔진) |
| **react-force-graph-2d** | 1.29.1 | 지식 그래프 시각화 |
| **Recharts** | 3.8.1 | 대시보드 차트 |
| **Excalidraw** | 0.18.0 | 인라인 드로잉 |
| **KaTeX** | (Tiptap 내장) | 수학 수식 렌더링 |
| **Yjs** | 13.6.30 | CRDT 기반 실시간 협업 |
| **Supabase JS** | 2.101.1 | Supabase 클라이언트 (Realtime 포함) |
| **diff** | 8.0.4 | 텍스트 diff 계산 |
| **marked** | 17.0.6 | 마크다운 렌더링 |
| **QRCode.react** | 4.2.0 | 초대 코드 QR 생성 |
| **react-joyride** | 3.0.2 | 튜토리얼 가이드 |
| **react-easy-crop** | 5.5.7 | 이미지 크롭 |
| **Blockly** | 12.5.1 | 블록 프로그래밍 (향후 확장) |

### 2.2 백엔드

| 기술 | 버전 | 용도 |
|------|------|------|
| **Python** | 3.12 | 메인 런타임 |
| **FastAPI** | 0.115.0 | 웹 프레임워크 (비동기, OpenAPI 자동 문서) |
| **Uvicorn** | 0.30.6 | ASGI 서버 (3 workers, limit-concurrency 100) |
| **Pydantic** | 2.9.2 | 데이터 검증/직렬화 |
| **Pydantic Settings** | 2.5.2 | 환경 변수 관리 |
| **Supabase Python** | 2.9.1 | PostgreSQL 클라이언트 |
| **google-generativeai** | 0.8.3 | Gemini AI SDK |
| **httpx** | 0.27.2 | 비동기 HTTP 클라이언트 |
| **sse-starlette** | 2.1.3 | Server-Sent Events 지원 |
| **boto3** | latest | Cloudflare R2 (S3 호환) 클라이언트 |
| **numpy** | latest | 임베딩 벡터 연산 (코사인 유사도) |
| **python-multipart** | 0.0.12 | 파일 업로드 처리 |
| **python-dotenv** | 1.0.1 | .env 파일 로드 |

### 2.3 데이터베이스

| 항목 | 상세 |
|------|------|
| DBMS | PostgreSQL 15+ (Supabase 관리형) |
| 테이블 | 27개 |
| 인덱스 | 51개 (B-tree, GIN, Composite, Partial) |
| 함수 | 1개 (update_updated_at) |
| 트리거 | 3개 (users, notes, note_comments) |
| RLS | 전 테이블 활성화 |
| 마이그레이션 | 11개 SQL 파일 (증분식) |

### 2.4 인프라

| 항목 | 상세 |
|------|------|
| 컨테이너 | Docker (Python 3.12-slim + gcc/g++ + JDK + Node.js) |
| 오케스트레이션 | Docker Compose (nginx + api 서비스) |
| 웹 서버 | Nginx (리버스 프록시, gzip, keepalive, SSL) |
| 클라우드 | AWS EC2 (c7i-flex.large: 2 vCPU, 4GB RAM) |
| CDN | Cloudflare (프론트엔드 정적 파일) |
| 파일 스토리지 | Cloudflare R2 (S3 호환) |
| 도메인 | pikabuddy.com |

---

## 3. 프론트엔드 아키텍처

### 3.1 프로젝트 구조

```
frontend/src/
├── main.tsx                    # 엔트리 포인트
├── App.tsx                     # 라우터 + ProtectedRoute + 27 lazy pages
├── App.css                     # 전역 스타일 (~3,500줄)
├── pages/                      # 27개 페이지 컴포넌트
│   ├── Landing.tsx             # 홍보 + 로그인
│   ├── AuthCallback.tsx        # OAuth 콜백 처리
│   ├── SelectRole.tsx          # 역할 선택
│   ├── ProfessorHome.tsx       # 교수 대시보드
│   ├── StudentHome.tsx         # 학생 대시보드 + 캘린더
│   ├── PersonalHome.tsx        # 개인 대시보드
│   ├── CourseDetail.tsx        # 강의 상세
│   ├── AssignmentDetail.tsx    # 제출물 조회 + diff
│   ├── PersonalAssignmentDetail.tsx
│   ├── CodeEditor.tsx          # 코딩 과제 에디터
│   ├── WritingEditor.tsx       # 글쓰기 과제 에디터
│   ├── QuizEditor.tsx          # 퀴즈 과제
│   ├── NoteEditor.tsx          # 노트 작성
│   ├── NotesList.tsx           # 강의별 노트 목록
│   ├── AllNotes.tsx            # 통합 노트 (카드/리스트)
│   ├── NoteGraph.tsx           # 강의별 지식 그래프
│   ├── AllNotesGraph.tsx       # 통합 지식 그래프
│   ├── Dashboard.tsx           # 교수 분석 대시보드
│   ├── StudentDetail.tsx       # 학생 상세 분석
│   ├── StudentNotes.tsx        # 교수 학생노트 열람
│   ├── Messenger.tsx           # 1:1 DM
│   ├── TeamManager.tsx         # 팀 관리 + 투표
│   ├── Workspace.tsx           # 멀티페인 작업공간
│   ├── Settings.tsx            # 설정 + 테마
│   ├── Profile.tsx             # 공개 프로필
│   ├── JoinCourse.tsx          # 초대 코드 참가
│   └── NotFound.tsx            # 404 페이지
├── components/                 # 재사용 컴포넌트 (28+)
│   ├── common/                 # AppShell, ErrorBoundary, NotificationBell, ...
│   ├── comments/               # CommentThread, CommentsPanel, BlockCommentOverlay, ...
│   ├── messenger/              # ChatView, ConversationList
│   ├── settings/               # ThemeEditor, ThemePicker, EffectsPanel
│   ├── BlockEditor.tsx         # Tiptap 에디터 래퍼
│   ├── TeamVotePanel.tsx       # 팀 투표 UI
│   ├── ExamProctorPanel.tsx    # 시험 감독 패널
│   ├── MiniNoteTree.tsx        # 서브노트 트리
│   ├── NoteSnapshotPanel.tsx   # 노트 스냅샷 관리
│   ├── DeadlineTimer.tsx       # 마감 타이머
│   ├── DrawingCanvas.tsx       # 드로잉 캔버스
│   └── *NodeView.tsx           # Tiptap 노드 뷰 (Math, Excalidraw, NoteLink, SubNote)
├── store/                      # Zustand 스토어 (7개)
│   ├── authStore.ts            # 인증 상태
│   ├── courseStore.ts          # 강의/과제 데이터
│   ├── themeStore.ts           # 테마/이펙트 설정
│   ├── commentStore.ts         # 코멘트 상태
│   ├── messengerStore.ts       # 메신저 상태
│   ├── notificationStore.ts    # 알림 상태
│   └── tutorialStore.ts        # 튜토리얼 진행 상태
├── lib/                        # 유틸리티 + 커스텀 확장
│   ├── api.ts                  # Axios 인스턴스 (인터셉터, 토큰 갱신)
│   ├── supabase.ts             # Supabase 클라이언트
│   ├── useExamMode.ts          # 시험 모드 훅
│   ├── useTeamVote.ts          # 팀 투표 훅
│   ├── useRealtimeNotifications.ts  # 실시간 알림 훅
│   ├── noteDiff.ts             # 노트 diff 계산
│   ├── confirm.ts              # 커스텀 confirm 모달
│   ├── toast.ts                # 토스트 알림
│   ├── markdown.ts             # 마크다운 변환
│   ├── tutorials.ts            # 튜토리얼 정의
│   ├── bannerPresets.ts        # 배너 프리셋
│   ├── SlashCommandExtension.tsx  # "/" 슬래시 커맨드
│   ├── BlockHandleExtension.ts    # 블록 핸들 드래그
│   ├── CalloutExtension.ts        # 콜아웃 블록
│   ├── ToggleExtension.ts         # 토글 블록
│   ├── MathExtension.ts           # 수식 (KaTeX)
│   ├── ExcalidrawExtension.ts     # 드로잉
│   ├── NoteLinkExtension.ts       # 노트 링크
│   ├── SubNoteExtension.ts        # 서브노트
│   ├── CitationExtension.ts       # 인용
│   └── AIPolishedExtension.ts     # AI 다듬기
├── themes/                     # 테마 시스템
│   ├── index.ts                # 테마 적용 로직
│   ├── presets.ts              # 프리셋 테마 정의
│   └── effects/                # 시각 이펙트 (55종)
│       ├── types.ts            # 이펙트 타입 정의
│       ├── registry.ts         # 이펙트 레지스트리
│       ├── engine.ts           # Canvas/CSS 렌더링 엔진
│       ├── backgroundEffects.ts
│       ├── patternEffects.ts
│       ├── animationEffects.ts
│       ├── uiEffects.ts
│       ├── gamificationEffects.ts
│       └── mascotController.ts
└── types/
    └── index.ts                # TypeScript 타입 정의 (27+ 인터페이스)
```

### 3.2 라우팅 설계

모든 페이지는 `React.lazy()`로 코드 분할되어, 첫 로드 시 필요한 페이지만 다운로드합니다.

| 경로 | 컴포넌트 | 인가 |
|------|----------|------|
| `/` | Landing | 공개 |
| `/auth/callback` | AuthCallback | 공개 |
| `/select-role` | SelectRole | 로그인 |
| `/professor` | ProfessorHome | professor |
| `/student` | StudentHome | student |
| `/personal` | PersonalHome | personal |
| `/courses/:courseId` | CourseDetail | 로그인 |
| `/courses/:courseId/dashboard` | Dashboard | professor |
| `/courses/:courseId/dashboard/students/:studentId` | StudentDetail | professor |
| `/courses/:courseId/assignments/:assignmentId` | AssignmentDetail | professor |
| `/personal/courses/:courseId/assignments/:assignmentId` | PersonalAssignmentDetail | personal |
| `/assignments/:assignmentId/code` | CodeEditor | 로그인 |
| `/assignments/:assignmentId/write` | WritingEditor | 로그인 |
| `/assignments/:assignmentId/quiz` | QuizEditor | 로그인 |
| `/courses/:courseId/notes` | NotesList | 로그인 |
| `/courses/:courseId/notes/:noteId` | NoteEditor | 로그인 |
| `/all-notes` | AllNotes | 로그인 |
| `/all-notes/graph` | AllNotesGraph | 로그인 |
| `/courses/:courseId/graph` | NoteGraph | 로그인 |
| `/courses/:courseId/workspace` | Workspace | 로그인 |
| `/courses/:courseId/messenger` | Messenger | 로그인 |
| `/courses/:courseId/messenger/:partnerId` | Messenger | 로그인 |
| `/courses/:courseId/teams` | TeamManager | professor |
| `/courses/:courseId/student-notes` | StudentNotes | professor |
| `/courses/:courseId/student-notes/:studentId/:noteId` | NoteEditor | professor |
| `/profile/:userId` | Profile | 로그인 |
| `/settings` | Settings | 로그인 |
| `/join/:inviteCode` | JoinCourse | 공개 |
| `*` | NotFound | 공개 |

### 3.3 상태 관리 (Zustand)

#### authStore

```typescript
interface AuthState {
  user: User | null;
  loading: boolean;
  fetchUser: () => Promise<void>;
  setUser: (user: User) => void;
  logout: () => void;
}
```

- Supabase Auth에서 세션 조회 → `/api/auth/me`로 사용자 정보 로드
- 세션 만료 시 `session-expired` 이벤트 발행

#### courseStore

```typescript
interface CourseState {
  courses: Course[];
  currentCourse: Course | null;
  assignments: Assignment[];
  loading: boolean;
  fetchCourses: () => Promise<void>;
  fetchCourse: (courseId: string) => Promise<void>;
  fetchAssignments: (courseId: string) => Promise<void>;
}
```

#### themeStore

```typescript
interface ThemeState {
  activeTheme: string;           // 프리셋 ID
  customTheme: ThemeVars | null; // CSS 변수 오버라이드
  activeEffects: string[];       // 활성 이펙트 ID 배열
  setTheme: (id: string) => void;
  toggleEffect: (id: string) => void;
}
```

- `localStorage`에 테마 설정 영속화
- 이펙트 변경 시 `EffectEngine` 자동 업데이트

#### commentStore

```typescript
interface CommentState {
  comments: NoteComment[];
  counts: CommentCounts;
  selectedBlock: number | null;
  fetchComments: (noteId: string) => Promise<void>;
  addComment: (data: CreateCommentData) => Promise<void>;
  resolveComment: (commentId: string) => Promise<void>;
}
```

#### messengerStore

```typescript
interface MessengerState {
  conversations: ConversationItem[];
  messages: Message[];
  unreadTotal: number;
  fetchConversations: (courseId: string) => Promise<void>;
  sendMessage: (courseId: string, receiverId: string, content: string) => Promise<void>;
}
```

#### notificationStore

```typescript
interface NotificationState {
  totalUnread: number;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
}
```

#### tutorialStore

```typescript
interface TutorialState {
  completedTutorials: string[];
  markCompleted: (id: string) => void;
  shouldShow: (id: string) => boolean;
}
```

### 3.4 API 통신 레이어

**`lib/api.ts`** — Axios 인스턴스 설정:

```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 30000,
});

// 요청 인터셉터: access_token 자동 첨부
api.interceptors.request.use(async (config) => {
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    config.headers.Authorization = `Bearer ${session.data.session.access_token}`;
  }
  return config;
});

// 응답 인터셉터: 401 시 세션 만료 이벤트
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event("session-expired"));
    }
    return Promise.reject(error);
  }
);
```

### 3.5 Tiptap 확장 시스템

| 확장 | 타입 | 설명 |
|------|------|------|
| `SlashCommandExtension` | Suggestion Plugin | "/" 입력 시 블록 삽입 메뉴 표시. 뷰포트 경계 감지로 메뉴 위치 자동 조정 |
| `BlockHandleExtension` | Plugin | 블록 좌측 핸들로 드래그, 클릭 시 블록 추가/삭제 메뉴 |
| `CalloutExtension` | Node | info/warning/tip/danger 4종 콜아웃 박스 |
| `ToggleExtension` | Node | 접기/펼치기 토글 블록 |
| `MathExtension` | Node (inline + block) | KaTeX 수식 렌더링, 인라인/블록 모드 |
| `ExcalidrawExtension` | Node | Excalidraw 인라인 드로잉 캔버스 |
| `NoteLinkExtension` | Mark / Node | 다른 노트로의 링크, 클릭 시 네비게이션 |
| `SubNoteExtension` | Node | 서브노트 임베딩, 클릭 시 해당 노트로 이동 |
| `CitationExtension` | Mark | 인용 텍스트 하이라이트 |
| `AIPolishedExtension` | Mark | AI 다듬기 결과 하이라이트 (원본과 비교) |

---

## 4. 백엔드 아키텍처

### 4.1 프로젝트 구조

```
backend/
├── main.py                     # FastAPI 앱 + 라우터 등록 + 헬스체크
├── config/
│   ├── __init__.py             # get_settings() re-export
│   └── settings.py             # Pydantic Settings (환경 변수)
├── common/
│   ├── __init__.py
│   ├── supabase_client.py      # Supabase 싱글턴 클라이언트
│   ├── gemini_client.py        # Gemini AI 클라이언트 + 토큰 추적
│   ├── r2_client.py            # Cloudflare R2 boto3 클라이언트
│   └── note_categories.py      # 노트 카테고리 분류 유틸
├── modules/
│   ├── auth/router.py          # 인증/인가 (9 endpoints)
│   ├── courses/router.py       # 강의 (5 endpoints)
│   ├── assignments/router.py   # 과제 (12 endpoints)
│   ├── editor/router.py        # 에디터 (7 endpoints)
│   ├── analysis/router.py      # AI 분석 (2 endpoints)
│   ├── tutor/router.py         # AI 튜터 (1 endpoint)
│   ├── notes/router.py         # 노트 (12 endpoints)
│   ├── dashboard/router.py     # 대시보드 (3 endpoints)
│   ├── proctor/router.py       # 시험 감독 (11 endpoints)
│   ├── runner/router.py        # 코드 실행 (2 endpoints)
│   ├── agents/router.py        # AI 에이전트 (5 endpoints)
│   ├── gamification/router.py  # 게이미피케이션 (3 endpoints)
│   ├── materials/router.py     # 교수자료 (3 endpoints)
│   ├── messenger/router.py     # 메신저 (4 endpoints)
│   ├── comments/router.py      # 코멘트 (7 endpoints)
│   ├── notifications/router.py # 알림 (3 endpoints)
│   ├── events/router.py        # 캘린더 (6 endpoints)
│   ├── teams/router.py         # 팀 (7 endpoints)
│   ├── voting/router.py        # 투표 (3 endpoints)
│   └── seed/router.py          # 시드 데이터 (1 endpoint)
├── requirements.txt            # Python 의존성
└── Dockerfile                  # Docker 이미지 빌드
```

### 4.2 인증/인가 아키텍처

```
클라이언트 요청
    │
    ▼
Authorization: Bearer <supabase_access_token>
    │
    ▼
FastAPI Depends(get_current_user)
    │
    ├── Supabase Auth로 토큰 검증 → user 정보 반환
    ├── users 테이블에서 role 확인
    │
    ▼
역할 기반 접근 제어
    ├── require_user()           → 로그인 필수
    ├── require_professor()      → professor만
    ├── require_student()        → student만
    └── require_professor_or_personal() → professor 또는 personal
```

admin 계정은 이메일이 `@pikabuddy.admin`으로 끝나는 경우 모든 역할에 접근 가능합니다.

### 4.3 AI 통합 아키텍처

#### Gemini Client (`common/gemini_client.py`)

```python
# 모델 티어
MODEL_HEAVY = "gemini-2.5-flash"        # 복잡한 작업
MODEL_LIGHT = "gemini-2.5-flash-lite"   # 경량 작업

# 폴백 체인 (503 과부하 시)
FALLBACK_MODELS = [MODEL_HEAVY, "gemini-2.0-flash", MODEL_LIGHT]

# 가격 정보 (USD per 1M tokens)
PRICING = {
    "gemini-2.5-flash":      {"input": 0.30, "output": 2.50},
    "gemini-2.5-flash-lite": {"input": 0.10, "output": 0.40},
    "gemini-2.0-flash":      {"input": 0.10, "output": 0.40},
}
```

**토큰 사용량 추적**: 모든 AI 호출의 토큰 수와 비용을 메모리에 기록하며, `/api/token-stats` 엔드포인트로 조회 가능합니다.

- `by_model`: 모델별 호출 수, 토큰 수, 비용
- `by_endpoint`: 엔드포인트별 사용량
- `history`: 최근 100건 기록
- `totals`: 전체 합계

#### AI 활용 영역

| 영역 | 모델 | 입력 | 출력 |
|------|------|------|------|
| 코드/글 분석 | HEAVY | 코드 + 루브릭 + 스냅샷 | score, feedback, analysis JSON |
| AI 튜터 | HEAVY | 대화 + 코드 컨텍스트 | SSE 스트리밍 응답 |
| 노트 다듬기 | LIGHT | 텍스트 블록 | 다듬어진 텍스트 |
| 노트 질문 | HEAVY | 노트 내용 + 질문 | SSE 스트리밍 응답 |
| 갭 분석 | HEAVY | 노트 전체 내용 | 이해도 점수 + 분석 JSON |
| 카테고리 분류 | LIGHT | 노트 텍스트 | 카테고리 배열 |
| 루브릭 생성 | HEAVY | 과제 정보 + 문제 | 루브릭 JSON |
| 대시보드 인사이트 | HEAVY | 학급 통계 데이터 | 마크다운 인사이트 |
| 임베딩 | text-embedding-004 | 노트 텍스트 | 768차원 벡터 |
| 퀴즈 채점 | HEAVY/LIGHT | 답안 + 기대 답안 | 점수 + 피드백 |

### 4.4 코드 실행 엔진 (Runner)

```
코드 제출
    │
    ▼
위험 패턴 검사 (언어별 블랙리스트)
    │ 위험 패턴 발견 → 400 에러
    │
    ▼
임시 파일 생성 (/tmp/runner_XXXX/)
    │
    ▼
컴파일 (C/C++/Java/C#/Rust/Go)
    │ 컴파일 에러 → CE 반환
    │
    ▼
실행 (subprocess.run + 타임아웃)
    │ 타임아웃 → TLE 반환
    │ 런타임 에러 → RE 반환
    │
    ▼
stdout/stderr 캡처 → 결과 반환
    │
    ▼
임시 파일 정리
```

**언어별 컴파일/실행 명령**:

| 언어 | 확장자 | 컴파일 | 실행 |
|------|--------|--------|------|
| Python | .py | — | `python3 {file}` |
| JavaScript | .js | — | `node {file}` |
| C | .c | `gcc -o {out} {file}` | `./{out}` |
| C++ | .cpp | `g++ -o {out} {file}` | `./{out}` |
| Java | .java | `javac {file}` | `java -cp {dir} Main` |
| C# | .cs | `mcs -out:{out} {file}` | `mono {out}` |
| Swift | .swift | — | `swift {file}` |
| Rust | .rs | `rustc -o {out} {file}` | `./{out}` |
| Go | .go | — | `go run {file}` |

### 4.5 실시간 통신

#### SSE (Server-Sent Events)

AI 분석 피드백, 튜터 응답 등에 사용됩니다.

```python
from sse_starlette.sse import EventSourceResponse

async def stream_feedback(request):
    async def event_generator():
        async for chunk in gemini_stream(prompt):
            yield {"data": json.dumps({"type": "chunk", "content": chunk})}
        yield {"data": json.dumps({"type": "done"})}

    return EventSourceResponse(event_generator())
```

Nginx에서 SSE를 위해 프록시 버퍼링을 비활성화합니다:
```nginx
proxy_buffering off;
proxy_cache off;
proxy_set_header X-Accel-Buffering no;
```

#### Supabase Realtime

메신저, 알림 등 실시간 이벤트에 사용됩니다. 프론트엔드에서 직접 Supabase Realtime 채널을 구독합니다.

```typescript
// useRealtimeNotifications.ts
const channel = supabase
  .channel(`notifications:${userId}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
    (payload) => { /* 새 메시지 처리 */ }
  )
  .subscribe();
```

---

## 5. 보안 설계

### 5.1 인증 흐름

```
1. 사용자 → "Google로 로그인" 클릭
2. 프론트엔드 → Supabase Auth OAuth URL 생성
3. 사용자 → Google 로그인 페이지
4. Google → 콜백 URL로 리디렉트 (code 포함)
5. 프론트엔드 → /auth/callback 페이지에서 Supabase에 code 교환
6. Supabase → access_token + refresh_token 반환
7. 프론트엔드 → access_token을 모든 API 요청의 Authorization 헤더에 포함
8. 백엔드 → Supabase Auth로 토큰 검증 → users 테이블에서 사용자 조회
```

### 5.2 코드 실행 보안

1. **위험 패턴 차단**: 언어별 블랙리스트 (os.system, subprocess, fork 등)
2. **타임아웃 강제**: subprocess에 5초(기본) × 언어별 배율 타임아웃
3. **Docker 격리**: 백엔드 Docker 컨테이너 내에서 실행
4. **리소스 제한**: Docker `deploy.resources.limits.memory: 1G`
5. **임시 파일 정리**: 실행 후 tmpdir 자동 삭제

### 5.3 데이터 보안

1. **RLS**: 모든 27개 테이블에 Row Level Security 활성화
2. **Service Key**: 백엔드만 Supabase Service Role Key 보유
3. **환경 변수**: API 키, DB 비밀번호 등 .env 파일로 관리 (gitignore)
4. **CORS**: 명시적 허용 도메인만 접근 가능
5. **HTTPS**: Cloudflare + Nginx SSL 이중 암호화

---

## 6. 성능 최적화 설계

### 6.1 프론트엔드

| 최적화 | 구현 |
|--------|------|
| 코드 분할 | React.lazy() + Suspense로 27개 페이지 분할 |
| 번들 최적화 | Vite Tree Shaking + minification |
| 정적 호스팅 | Cloudflare CDN (글로벌 엣지 캐시) |
| Skeleton UI | 데이터 로딩 중 Skeleton 컴포넌트 표시 |
| 디바운싱 | 스냅샷 저장, 검색 입력 디바운싱 |
| 이미지 최적화 | 아바타/배너 리사이즈 후 업로드 |

### 6.2 백엔드

| 최적화 | 구현 |
|--------|------|
| 멀티 워커 | uvicorn --workers 3 (2 vCPU에 최적화) |
| 동시성 제한 | --limit-concurrency 100 |
| gzip 압축 | Nginx gzip level 4, min 256B |
| Keepalive | Nginx upstream keepalive 16 |
| 인덱스 최적화 | 51개 DB 인덱스 (Composite, Partial, GIN 포함) |
| 싱글턴 패턴 | Supabase/R2 클라이언트 1회 초기화 |
| LRU 캐시 | Settings 객체 @lru_cache |

### 6.3 데이터베이스

| 최적화 | 구현 |
|--------|------|
| 부분 인덱스 | 미읽 메시지, 개인 강의, 진행 중 투표 |
| 복합 인덱스 | 메시지 대화 조회, 시험 스크린샷 룩업 |
| GIN 인덱스 | 노트 카테고리 JSONB 배열 검색 |
| CASCADE | 부모 삭제 시 자식 자동 정리 |
| Supabase | 관리형 PostgreSQL 자동 최적화 |

---

## 7. 에러 처리 설계

### 7.1 프론트엔드

- **ErrorBoundary**: React 에러 경계로 크래시 시 폴백 UI 표시
- **Axios 인터셉터**: 401 → 세션 만료 알림, 네트워크 에러 → 토스트
- **Toast 시스템**: 성공/에러/경고 토스트 알림

### 7.2 백엔드

- **HTTP 상태 코드**: 400(잘못된 요청), 401(미인증), 403(권한 없음), 404(미발견), 422(검증 실패), 500(서버 에러)
- **AI 폴백**: Gemini 503 → 대체 모델 자동 전환
- **코드 실행 에러**: 컴파일 에러, 런타임 에러, 타임아웃을 구분하여 반환

---

## 8. 테스트 전략

### 8.1 API 테스트

현재 31개 API 테스트가 구현되어 있습니다.

### 8.2 향후 계획

| 레벨 | 도구 | 범위 |
|------|------|------|
| 단위 테스트 | pytest | 백엔드 모듈별 함수 |
| 통합 테스트 | pytest + httpx | API 엔드포인트 |
| E2E 테스트 | Playwright | 주요 사용자 시나리오 |
| 부하 테스트 | locust | 동시 접속 시나리오 |

---

## 9. 모니터링 설계 (향후)

| 영역 | 도구 (예정) | 측정 항목 |
|------|------------|-----------|
| 서버 메트릭 | Prometheus + Grafana | CPU, RAM, 디스크, 네트워크 |
| API 메트릭 | FastAPI middleware | 응답 시간, 에러율, 요청 수 |
| AI 메트릭 | 내장 token-stats | 토큰 사용량, 비용, 모델별 분포 |
| 로그 | 구조화 로깅 | 요청/에러 로그 |
| 알림 | 슬랙/이메일 | 에러율 급증, 서버 다운 |

---

*이 문서는 PikaBuddy의 기술 설계를 정의합니다. API 상세는 04_API.md, DB 스키마는 05_ERD.md를 참조하세요.*
