# PikaBuddy — UI/UX Design Document

작성일: 2026-04-12  
버전: 1.0  
작성자: PikaBuddy 개발팀

---

## 1. 개요

### 1.1 디자인 원칙

| 원칙 | 설명 |
|------|------|
| **학습 중심** | 학습 과정에 방해되지 않는 깔끔한 인터페이스 |
| **역할 기반** | 교수/학생/개인 역할에 따라 최적화된 화면 구성 |
| **실시간 피드백** | AI 분석 결과, 메시지, 알림을 즉시 반영 |
| **커스터마이징** | 테마, 이펙트, 배너를 통한 개인화 |
| **접근성** | 한국어 기본, Skeleton UI로 로딩 피드백, 에러 바운더리 |

### 1.2 기술 스택

- **UI 프레임워크**: React 19 + TypeScript
- **스타일링**: CSS (App.css ~3,500줄, CSS 변수 기반 테마)
- **상태 관리**: Zustand (7개 스토어)
- **라우팅**: React Router v7 (27개 경로)
- **코드 분할**: React.lazy() + Suspense (27개 페이지)
- **에디터**: Tiptap v3 (리치 텍스트) + Monaco Editor (코드)
- **차트**: Recharts
- **그래프**: react-force-graph-2d + d3-force
- **드로잉**: Excalidraw

### 1.3 페이지 수량 요약

| 카테고리 | 페이지 수 |
|---------|-----------|
| 인증/온보딩 | 3 (Landing, AuthCallback, SelectRole) |
| 홈 대시보드 | 3 (ProfessorHome, StudentHome, PersonalHome) |
| 강의/과제 | 4 (CourseDetail, AssignmentDetail, PersonalAssignmentDetail, JoinCourse) |
| 에디터 | 3 (CodeEditor, WritingEditor, QuizEditor) |
| 노트 | 5 (NoteEditor, NotesList, AllNotes, NoteGraph, AllNotesGraph) |
| 분석 | 2 (Dashboard, StudentDetail) |
| 소셜 | 3 (Messenger, TeamManager, StudentNotes) |
| 기타 | 4 (Workspace, Settings, Profile, NotFound) |
| **합계** | **27** |

---

## 2. 공통 레이아웃

### 2.1 AppShell

모든 인증된 페이지에서 사용되는 공통 레이아웃입니다.

```
┌───────────────────────────────────────────────────────┐
│  AppShell Header                                      │
│  ┌─────┐ ┌──────────┐            ┌──┐ ┌──┐ ┌──┐ ┌──┐│
│  │ Logo│ │ 강의명    │            │🔔│ │💬│ │⚙│ │👤││
│  └─────┘ └──────────┘            └──┘ └──┘ └──┘ └──┘│
├───────────────────────────────────────────────────────┤
│  사이드바 (접기 가능)  │  메인 콘텐츠 영역              │
│  ┌─────────────────┐  │                               │
│  │ 📚 강의 홈       │  │                               │
│  │ 📝 과제         │  │         페이지 콘텐츠           │
│  │ 📒 노트         │  │                               │
│  │ 🔗 그래프       │  │                               │
│  │ 📊 대시보드      │  │                               │
│  │ 💬 메신저       │  │                               │
│  │ 👥 팀 관리      │  │                               │
│  │ 📁 자료         │  │                               │
│  │ 🖥️ 워크스페이스  │  │                               │
│  └─────────────────┘  │                               │
└───────────────────────────────────────────────────────┘
│                  ThemeBackground (이펙트 렌더링)          │
└───────────────────────────────────────────────────────┘
```

**구성 요소**:
- **Header**: 로고, 현재 강의명, 알림 벨(NotificationBell), 메신저 바로가기, 설정, 프로필 아바타
- **Sidebar**: 역할 + 현재 컨텍스트에 따라 동적 메뉴 구성
- **Content**: 페이지 콘텐츠 (Suspense + PageLoader)
- **ThemeBackground**: 선택된 테마 이펙트를 Canvas/CSS로 렌더링

### 2.2 공통 컴포넌트

| 컴포넌트 | 파일 | 설명 |
|---------|------|------|
| AppShell | `common/AppShell.tsx` | 공통 레이아웃 (헤더 + 사이드바 + 콘텐츠) |
| ErrorBoundary | `common/ErrorBoundary.tsx` | React 에러 경계, 크래시 시 폴백 UI |
| NotificationBell | `common/NotificationBell.tsx` | 알림 벨 아이콘 + 미읽 뱃지 + 드롭다운 |
| Skeleton | `common/Skeleton.tsx` | 데이터 로딩 중 Skeleton UI |
| EmptyState | `common/EmptyState.tsx` | 빈 데이터 상태 안내 |
| ThemeBackground | `common/ThemeBackground.tsx` | 테마 이펙트 Canvas/CSS 렌더 컨테이너 |
| TierBadge | `common/TierBadge.tsx` | 티어 아이콘 + 이름 표시 |
| TutorialProvider | `common/TutorialProvider.tsx` | react-joyride 기반 튜토리얼 오버레이 |
| GlobalContextMenu | `common/GlobalContextMenu.tsx` | 우클릭 컨텍스트 메뉴 (뷰포트 경계 감지) |

---

## 3. 페이지 상세 설계

### 3.1 Landing — 랜딩 페이지

**경로**: `/`  
**역할**: 공개

**구성**:
- 히어로 섹션: 프로젝트 비전, CTA 버튼
- 기능 소개 섹션: 핵심 기능 카드 (코딩, 글쓰기, AI 분석, 노트, 그래프)
- Google 로그인 버튼 (Supabase Auth signInWithOAuth)
- 관리자 로그인 폼 (테스트용)

---

### 3.2 AuthCallback — OAuth 콜백

**경로**: `/auth/callback`

**처리 흐름**:
1. URL에서 access_token 추출
2. `/api/auth/callback` 호출
3. user.role에 따라 리디렉트:
   - NULL → `/select-role`
   - professor → `/professor`
   - student → `/student`
   - personal → `/personal`

---

### 3.3 SelectRole — 역할 선택

**경로**: `/select-role`

**UI**: 3개 역할 카드 (교수/학생/개인 학습자)
- 각 카드에 역할 설명, 주요 기능 리스트
- 카드 클릭 → `/api/auth/role` 호출 → 홈으로 리디렉트

---

### 3.4 ProfessorHome — 교수 대시보드

**경로**: `/professor`  
**역할**: professor

**구성**:
- 강의 카드 그리드 (강의명, 학생 수, 최근 활동)
- 강의 생성 모달 (제목, 설명, 학습 목표)
- 초대 코드 표시 (QR 코드 포함)
- 각 강의 → `CourseDetail`로 네비게이션

---

### 3.5 StudentHome — 학생 대시보드

**경로**: `/student`  
**역할**: student

**구성**:
- **좌측**: 수강 강의 카드 리스트 + 강의 참가(초대 코드) 모달
- **우측 상단**: 캘린더 (월간 뷰, 이벤트 + 마감일 표시)
- **우측 하단**: 오늘의 할일 (투두 리스트)
- 메신저 바로가기 (미읽 뱃지 표시)

---

### 3.6 PersonalHome — 개인 대시보드

**경로**: `/personal`  
**역할**: personal

**구성**:
- 개인 강의(is_personal=true) 카드
- 자유 과제 생성 버튼
- 노트, 그래프 바로가기
- AI 분석 요약

---

### 3.7 CourseDetail — 강의 상세

**경로**: `/courses/:courseId`

**탭 구성**:
| 탭 | 교수 | 학생 |
|----|------|------|
| 과제 | 과제 CRUD + AI 생성 + 제출 현황 | 과제 목록 + 제출 여부 |
| 노트 | - | 노트 바로가기 |
| 자료 | 업로드/삭제 | 다운로드 |
| 학생 | 수강생 목록 + 통계 | - |
| 설정 | 강의 정보 수정, 배너 변경 | 개인 배너 설정 |

**과제 생성 모달** (교수):
- 기본 정보: 제목, 주제, 유형(coding/writing/quiz/algorithm)
- AI 설정: 정책(free/normal/strict/exam), 언어, 난이도
- 문제 설정: 자동 생성 or 수동 작성, 문제 수
- 시험 설정: exam_mode, 스크린샷 간격, 위반 한도
- 팀 과제 설정: is_team_assignment 토글

---

### 3.8 AssignmentDetail — 제출물 상세 (교수)

**경로**: `/courses/:courseId/assignments/:assignmentId`  
**역할**: professor

**구성**:
- 제출한 학생 목록 (카드 형태)
- 학생 선택 시:
  - **코딩 과제**: 코드 뷰어 + AI 분석 결과 + 스냅샷 diff
  - **글쓰기 과제**: 글 뷰어 + AI 분석 + 스냅샷 diff (Tiptap JSON → 텍스트 diff)
  - **퀴즈**: 답안 + 점수
- AI 점수 수동 조정 기능

**스냅샷 Diff 뷰**:
```
┌──────────────────────┐  ┌──────────────────────────┐
│ 타임라인 (좌측)        │  │ Diff 뷰 (우측)            │
│                       │  │                          │
│ 14:32:10 ● 스냅샷 1   │  │ - 삭제된 라인 (빨강)       │
│ 14:32:40 ● 스냅샷 2   │  │ + 추가된 라인 (초록)       │
│ 14:33:15 ○ 붙여넣기   │  │   변경 없는 라인           │
│ 14:33:50 ● 스냅샷 3   │  │                          │
│ 14:35:00 ★ 제출       │  │                          │
└──────────────────────┘  └──────────────────────────┘
```

---

### 3.9 CodeEditor — 코딩 과제 에디터

**경로**: `/assignments/:assignmentId/code`

**레이아웃**:
```
┌──────────────────────────────────────────────────────┐
│ 헤더: 과제명 | 언어 선택 | AI 정책 표시 | 제출 버튼    │
├──────────────┬───────────────────────────────────────┤
│ 문제 패널     │ Monaco 코드 에디터                     │
│              │                                       │
│ 문제 설명     │ // 코드 작성 영역                      │
│ 입력 형식     │                                       │
│ 출력 형식     │                                       │
│ 예시         │                                       │
│ 힌트 (접기)   │                                       │
│              ├───────────────────────────────────────┤
│              │ 실행 결과 / 테스트 결과 패널             │
│              │ stdout | stderr | verdict              │
├──────────────┴───────────────────────────────────────┤
│ AI 튜터 채팅 패널 (접기 가능)                           │
│ [메시지 입력] [전송]                                   │
└──────────────────────────────────────────────────────┘
```

**기능**:
- Monaco Editor (VS Code 엔진): 구문 하이라이팅, 자동 완성, 미니맵
- 언어 선택 드롭다운 (9개 언어)
- "실행" 버튼 → `/api/run` → 결과 표시
- "채점" 버튼 (algorithm) → `/api/judge` → 테스트케이스 결과 표시
- 스냅샷 자동 저장 (30초 간격)
- 붙여넣기 감지 → 토스트 알림 + 로그 기록
- AI 튜터 패널 (정책에 따라 비활성화)
- **시험 모드**: ExamProctorPanel 표시, 전체화면 강제
- **팀 과제**: TeamVotePanel로 투표 UI 대체
- DeadlineTimer: 마감일 카운트다운

---

### 3.10 WritingEditor — 글쓰기 과제 에디터

**경로**: `/assignments/:assignmentId/write`

**레이아웃**:
```
┌──────────────────────────────────────────────────────┐
│ 헤더: 과제명 | 작성 지침 보기 | 제출 버튼              │
├──────────────────────────────────────────────────────┤
│                                                      │
│              Tiptap 리치 텍스트 에디터                  │
│                                                      │
│  [B] [I] [U] [S] [H1] [H2] [H3] [Link] [Code]      │
│  [BulletList] [OrderedList] [Blockquote]             │
│                                                      │
│  학생이 글을 작성하는 영역...                           │
│                                                      │
├──────────────────────────────────────────────────────┤
│ AI 튜터 채팅 패널 (접기 가능)                           │
└──────────────────────────────────────────────────────┘
```

**기능**:
- Tiptap 에디터 (기본 확장: Bold, Italic, Underline, Strike, Heading, Code, Link, Lists 등)
- 작성 지침(writing_prompt) 표시 패널
- 자동 저장 (30초 간격)
- 팀 과제: TeamVotePanel

---

### 3.11 QuizEditor — 퀴즈 에디터

**경로**: `/assignments/:assignmentId/quiz`

**구성**:
- 문제 목록 (좌측 네비게이션)
- 문제별 답안 입력:
  - 객관식: 라디오 버튼
  - 주관식: 텍스트 입력
- "제출 및 채점" 버튼 → `/api/editor/.../quiz-grade`
- 채점 결과 표시 (정답/오답, AI 피드백)

---

### 3.12 NoteEditor — 노트 에디터

**경로**: `/courses/:courseId/notes/:noteId`

**레이아웃**:
```
┌──────────────────────────────────────────────────────┐
│ 헤더: 노트 제목 (편집 가능) | 스냅샷 | AI 분석 | 저장   │
├──────────┬───────────────────────────────────────────┤
│ MiniNote │                                           │
│ Tree     │     Tiptap 에디터 (10개 확장)              │
│          │                                           │
│ ├ 부모   │  / 입력 → SlashCommand 메뉴               │
│ │ ├ 현재 │  수식, 드로잉, 콜아웃, 토글 등              │
│ │ └ 형제 │                                           │
│ └ 자식   │                                           │
│          │                                           │
│──────────│                                           │
│ Comments │                                           │
│ Panel    │                                           │
│ (접기)    │                                           │
└──────────┴───────────────────────────────────────────┘
```

**기능**:
- **10개 Tiptap 확장**: Slash, BlockHandle, Callout, Toggle, Math, Excalidraw, NoteLink, SubNote, Citation, AIPolished
- **MiniNoteTree**: 서브노트 계층 구조 트리 (좌측)
- **CommentsPanel**: 블록별 코멘트 스레드 (교수 ↔ 학생)
- **BlockCommentOverlay**: 블록 우측에 코멘트 아이콘 표시
- **NoteSnapshotPanel**: 수동 스냅샷 저장/복원
- **AI 다듬기**: 텍스트 선택 → AI Polish → 결과 적용
- **AI 질문**: 노트 내용 기반 AI 질문
- **AI 분석**: 이해도 점수 + 갭 분석
- 자동 저장 (디바운스)

---

### 3.13 NotesList — 노트 목록

**경로**: `/courses/:courseId/notes`

**구성**:
- 노트 카드 그리드 (제목, 수정일, 이해도 점수 뱃지)
- 검색 필터
- 카테고리 필터
- 새 노트 생성 버튼

---

### 3.14 AllNotes — 통합 노트

**경로**: `/all-notes`

**구성**:
- 모든 강의의 노트 통합 표시
- 뷰 모드 전환: 카드 뷰 / 리스트 뷰
- 강의별 필터
- 검색 + 카테고리 필터

---

### 3.15 NoteGraph — 지식 그래프

**경로**: `/courses/:courseId/graph`

**레이아웃**:
```
┌──────────────────────────────────────────────────────┐
│ 헤더: 강의명 | 필터 | 이해도 슬라이더 | 범례            │
├──────────────────────────────────────────────────────┤
│                                                      │
│           react-force-graph-2d 캔버스                  │
│                                                      │
│        ●───●      ● 노트 노드                        │
│       / \  │      ─ parent 엣지 (실선)                │
│      ●   ● │      ╌ link 엣지 (점선)                  │
│       \   \│      ≈ similar 엣지 (파선)               │
│        ●───●                                         │
│                                                      │
├──────────────────────────────────────────────────────┤
│ 호버 툴팁: 노트 제목, 이해도 점수, 카테고리             │
└──────────────────────────────────────────────────────┘
```

**기능**:
- **노드**: 원형, 크기 = 콘텐츠 길이 비례, 색상 = 이해도 점수
  - 빨강 (0-33) → 주황 (34-66) → 초록 (67-100)
- **엣지**: parent(실선), link(점선), similar(파선)
- **인터랙션**: 드래그, 줌, 패닝, 노드 클릭 → 노트 에디터로 이동
- **필터**: 검색, 카테고리, 이해도 범위 슬라이더
- **학습 경로**: AI 추천 학습 순서 오버레이
- **주간 리포트**: 학습 진행 요약 패널
- **뷰포트 경계 감지**: 툴팁이 화면 밖으로 나가지 않도록 위치 조정
- **테마 호환**: 그래프 색상이 현재 테마와 자동 연동

---

### 3.16 AllNotesGraph — 통합 지식 그래프

**경로**: `/all-notes/graph`

NoteGraph와 동일한 UI이지만, 모든 강의의 노트를 통합 표시합니다.

---

### 3.17 Dashboard — 교수 분석 대시보드

**경로**: `/courses/:courseId/dashboard`  
**역할**: professor

**구성**:
```
┌───────────────────────────────────────────────────────┐
│ 학급 개요 카드                                          │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│ │ 학생 수   │ │ 평균 점수 │ │ 위험군    │ │ 제출률   │  │
│ │    30    │ │   78.5   │ │    3     │ │   85%    │  │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
├───────────────────────────────────────────────────────┤
│ 학생 리스트 (테이블)                                    │
│ ┌────┬──────┬──────┬──────┬──────┬──────┬─────────┐  │
│ │    │ 이름  │ 평균  │ 이해도│ 복붙  │ 갭   │ 상태    │  │
│ │ 👤 │ 김학생│ 85   │ 72%  │ 5회  │ low  │ ✅ ok   │  │
│ │ 👤 │ 이학생│ 42   │ 35%  │ 15회 │ high │ ⚠️ warn │  │
│ └────┴──────┴──────┴──────┴──────┴──────┴─────────┘  │
│                                                       │
│ 클릭 → StudentDetail                                   │
├───────────────────────────────────────────────────────┤
│ AI 인사이트 (마크다운 렌더링)                             │
│ "3명의 학생이 이진 탐색 개념에 어려움을 겪고 있습니다..."    │
└───────────────────────────────────────────────────────┘
```

---

### 3.18 StudentDetail — 학생 상세 분석

**경로**: `/courses/:courseId/dashboard/students/:studentId`  
**역할**: professor

**구성**:
- 학생 프로필 헤더 (이름, 아바타, 티어)
- 과제별 점수 차트 (Recharts)
- 제출 이력 타임라인
- 붙여넣기 로그
- 노트 이해도 추이
- 스냅샷 수

---

### 3.19 StudentNotes — 학생 노트 열람

**경로**: `/courses/:courseId/student-notes`  
**역할**: professor

**구성**:
- 학생 목록 (좌측)
- 선택한 학생의 노트 목록 (우측)
- 노트 클릭 → NoteEditor (읽기 + 코멘트 작성 모드)
- 코멘트 수 뱃지 표시

---

### 3.20 Messenger — 메신저

**경로**: `/courses/:courseId/messenger(/:partnerId)`

**레이아웃**:
```
┌──────────────────┬───────────────────────────────────┐
│ ConversationList │ ChatView                          │
│ ┌──────────────┐ │                                   │
│ │ 👤 김교수     │ │  메시지 스크롤 영역               │
│ │   안녕하세요  │ │                                   │
│ │ 👤 이학생  (3)│ │  [발신 메시지]           13:24    │
│ │   질문이요   │ │          [수신 메시지]    13:25    │
│ │ 👤 박학생     │ │                                   │
│ └──────────────┘ │ ┌─────────────────────────┐ ┌──┐ │
│                   │ │ 메시지 입력              │ │▶│ │
│                   │ └─────────────────────────┘ └──┘ │
└──────────────────┴───────────────────────────────────┘
```

**기능**:
- ConversationList: 대화 상대 목록, 미읽 카운트 뱃지, 최근 메시지 미리보기
- ChatView: 메시지 타임라인, 읽음 확인 표시
- Supabase Realtime으로 실시간 메시지 수신
- 프로필 클릭 → Profile 페이지

---

### 3.21 TeamManager — 팀 관리

**경로**: `/courses/:courseId/teams`  
**역할**: professor

**구성**:
- 팀 생성 모달 (팀명 + 멤버 선택)
- 팀 카드 그리드 (팀명, 멤버 아바타 리스트)
- 팀 편집: 멤버 추가/제거
- 팀 삭제 (커스텀 confirm 모달)
- 팀 노트 바로가기

---

### 3.22 Workspace — 멀티페인 작업공간

**경로**: `/courses/:courseId/workspace`

**구성**:
- 2-3개 패널을 나란히 배치
- 패널 유형: 노트 에디터, 코드 에디터, 그래프, 자료 뷰어
- 패널 크기 조절 (드래그 리사이즈)
- 다중 작업 지원

---

### 3.23 Settings — 설정

**경로**: `/settings`

**탭 구성**:

| 탭 | 내용 |
|----|------|
| **프로필** | 이름, 학교, 학과, 학번, 자기소개, 소셜 링크 |
| **테마** | ThemePicker (프리셋 선택) + ThemeEditor (커스텀 CSS 변수) |
| **이펙트** | EffectsPanel (55종 이펙트 토글, 미리보기) |
| **계정** | 역할 전환, 로그아웃 |

---

### 3.24 Profile — 공개 프로필

**경로**: `/profile/:userId`

**구성**:
- 배너 이미지 (커스텀 또는 기본)
- 아바타 + 이름 + 역할 + 학교/학과
- 티어 뱃지 + 경험치 바
- 획득 뱃지 그리드
- 자기소개
- 소셜 링크
- DM 보내기 버튼

---

### 3.25 JoinCourse — 강의 참가

**경로**: `/join/:inviteCode`

**구성**:
- 초대 코드에 해당하는 강의 정보 표시
- "참가하기" 버튼
- 이미 참가한 경우 강의 페이지로 리디렉트

---

### 3.26 NotFound — 404

**경로**: `*`

- 404 안내 메시지
- 홈으로 돌아가기 버튼

---

## 4. 컴포넌트 상세

### 4.1 BlockEditor (Tiptap 래퍼)

노트 에디터에서 사용하는 Tiptap 에디터 래퍼 컴포넌트입니다.

**포함 확장**:
- StarterKit (Heading, Bold, Italic, Strike, Code, Blockquote, BulletList, OrderedList, HardBreak)
- Underline, TextAlign, Color, Highlight, TextStyle, Typography
- Image, Table, TaskList, TaskItem
- Subscript, Superscript
- Placeholder
- **커스텀 10종**: Slash, BlockHandle, Callout, Toggle, Math, Excalidraw, NoteLink, SubNote, Citation, AIPolished

### 4.2 TeamVotePanel

팀 과제 제출 투표 UI 컴포넌트입니다.

**상태별 UI**:
| 상태 | UI |
|------|---|
| 투표 없음 | "제출 투표 시작" 버튼 |
| pending + 미투표 | "승인" / "거부" 버튼 + 투표 현황 |
| pending + 이미 투표 | 대기 상태 + 팀원 투표 현황 + 데드라인 카운트다운 |
| approved | "팀 제출 완료!" 성공 메시지 |
| rejected | "투표 부결" + 재투표 버튼 |

### 4.3 ExamProctorPanel

시험 감독 패널 컴포넌트입니다.

**기능**:
- 위반 횟수 표시 (현재/최대)
- 스크린샷 캡처 상태 표시
- 전체화면 상태 감시
- 위반 초과 시 시험 종료 경고

### 4.4 CommentsPanel + BlockCommentOverlay

노트 코멘트 시스템 UI입니다.

- **CommentsPanel**: 전체 코멘트 목록, 스레드 뷰, 해결 토글
- **BlockCommentOverlay**: 에디터 블록 우측에 코멘트 아이콘 오버레이
- **CommentThread**: 답글이 포함된 코멘트 스레드
- **CommentItem**: 개별 코멘트 (작성자, 시간, 내용, 수정/삭제/해결)

---

## 5. 테마 시스템

### 5.1 CSS 변수 기반 테마

모든 색상, 폰트, 간격은 CSS 변수로 정의되며, 테마 변경 시 변수 값만 교체합니다.

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --accent-primary: #004AC6;
  --accent-secondary: #0066FF;
  --border-color: #e0e0e0;
  --radius: 8px;
  --shadow: 0 2px 8px rgba(0,0,0,0.1);
  /* ... 등 */
}
```

### 5.2 프리셋 테마

다양한 사전 정의 테마를 제공합니다 (라이트/다크/커스텀).

### 5.3 시각 이펙트 (55종)

| 카테고리 | 수량 | 예시 |
|---------|------|------|
| Background | 10+ | 파티클, 별, 눈, 비, 안개 |
| Pattern | 8+ | 격자, 점, 대각선, 물결 |
| Animation | 10+ | 페이드, 슬라이드, 바운스 |
| UI | 8+ | 글로우, 블러, 네온 |
| Gamification | 10+ | 레벨업 이펙트, 뱃지 획득 |
| Mascot | 5+ | SVG 마스코트 캐릭터 |

**렌더링 엔진** (`themes/effects/engine.ts`):
- Canvas 2D: 파티클, 별, 눈 등 애니메이션
- CSS: 패턴, 글로우, 블러 등 정적 효과
- SVG: 마스코트 캐릭터

---

## 6. 사용자 흐름 (User Flow)

### 6.1 학생 — 코딩 과제 수행 흐름

```
StudentHome → CourseDetail → "과제 시작" →
  CodeEditor → 코드 작성 (자동 스냅샷) →
    AI 튜터 질문 (선택) →
  "실행" → 결과 확인 →
  "제출" → AI 분석 대기 (SSE) →
  피드백 확인 → CourseDetail (제출 완료 표시)
```

### 6.2 교수 — 학생 분석 흐름

```
ProfessorHome → CourseDetail → "대시보드" →
  Dashboard (학급 개요) →
    학생 클릭 → StudentDetail (상세 분석) →
      "제출물 보기" → AssignmentDetail (스냅샷 diff) →
    "노트 열람" → StudentNotes → NoteEditor (코멘트 작성)
```

### 6.3 팀 과제 제출 흐름

```
CodeEditor (팀 과제) →
  "제출 투표 시작" → TeamVotePanel →
    팀원에게 투표 알림 (Realtime) →
  팀원들 투표 (approve/reject) →
    만장일치 approve → 전원 자동 제출 ✅
    데드라인 초과 → 과반수 결정
```

---

## 7. 반응형 및 접근성

### 7.1 반응형 설계

- 최소 지원 해상도: 1024×768
- 권장 해상도: 1280×720 이상
- 사이드바: 접기/펼치기 지원
- 에디터: 문제 패널 접기 지원

### 7.2 접근성

| 항목 | 구현 |
|------|------|
| 키보드 네비게이션 | Tab 이동, Enter 활성화, Escape 닫기 |
| 로딩 표시 | Skeleton UI, PageLoader 스피너 |
| 에러 표시 | Toast 알림, ErrorBoundary 폴백 |
| 세션 만료 | 상단 빨간 배너로 명확한 안내 |
| 튜토리얼 | react-joyride 기반 단계별 가이드 |
| 한국어 | 모든 UI 텍스트 한국어 기본 |

---

*이 문서는 PikaBuddy의 UI/UX 설계를 정의합니다. 기술적 구현 세부사항은 03_TDD.md를 참조하세요.*
