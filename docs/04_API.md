# PikaBuddy — API Specification Document

작성일: 2026-04-12  
버전: 1.0  
작성자: PikaBuddy 개발팀

---

## 1. 개요

### 1.1 API 기본 정보

| 항목 | 값 |
|------|---|
| Base URL | `https://pikabuddy.com/api` (프로덕션) / `http://localhost:8000/api` (개발) |
| 프로토콜 | HTTPS (TLS 1.2+) |
| 인증 | Bearer Token (Supabase JWT) |
| 응답 형식 | JSON (`application/json`) |
| 스트리밍 | SSE (`text/event-stream`) |
| API 문서 | FastAPI 자동 생성 Swagger UI (`/docs`) |

### 1.2 인증

모든 인증 필요 엔드포인트에 다음 헤더를 포함해야 합니다:

```
Authorization: Bearer <supabase_access_token>
```

### 1.3 공통 에러 응답

| 상태 코드 | 설명 |
|-----------|------|
| 400 | 잘못된 요청 (유효하지 않은 파라미터) |
| 401 | 인증 실패 (토큰 없음 또는 만료) |
| 403 | 권한 없음 (역할 부족) |
| 404 | 리소스를 찾을 수 없음 |
| 409 | 충돌 (중복 데이터) |
| 422 | 유효성 검사 실패 (Pydantic) |
| 500 | 서버 내부 오류 |

### 1.4 엔드포인트 수량 요약

| 모듈 | Prefix | 엔드포인트 수 |
|------|--------|--------------|
| auth | `/api/auth` | 10 |
| courses | `/api/courses` | 7 |
| assignments | `/api/courses/{courseId}/assignments` | 20 |
| editor | `/api/editor` | 7 |
| analysis | `/api` | 2 |
| tutor | `/api/tutor` | 1 |
| notes | `/api` | 22 |
| dashboard | `/api` | 3 |
| proctor | `/api` | 12 |
| runner | `/api` | 2 |
| agents | `/api/agents` | 5 |
| gamification | `/api` | 3 |
| materials | `/api` | 3 |
| messenger | `/api` | 6 |
| comments | `/api` | 8 |
| notifications | `/api` | 4 |
| events | `/api` | 6 |
| teams | `/api` | 5 |
| voting | `/api` | 3 |
| seed | `/api/seed` | 2 |
| **합계** | | **~135+** |

---

## 2. Auth 모듈 — 인증/인가

### POST `/api/auth/admin-login`

관리자 계정으로 로그인합니다.

- **인가**: 없음
- **Body**: `{ id: string, password: string, role: "student" | "teacher" }`
- **응답**: `{ user, access_token }`

### GET `/api/auth/test-accounts`

테스트 계정 정보를 조회합니다.

- **인가**: 없음
- **응답**: `{ student: { id, password }, teacher: { id, password } }`

### POST `/api/auth/callback`

Google OAuth 콜백을 처리합니다.

- **인가**: 없음
- **Body**: `{ access_token: string }`
- **처리**: Supabase Auth에서 사용자 정보 조회, users 테이블 INSERT/UPDATE
- **응답**: `{ user: User }`

### POST `/api/auth/role`

역할을 선택합니다 (최초 가입 시).

- **인가**: 로그인 필수
- **Body**: `{ role: "professor" | "student" | "personal" }`
- **처리**: users.role 업데이트, personal인 경우 자동 강의 생성
- **응답**: `{ user: User }`

### GET `/api/auth/me`

현재 로그인한 사용자 정보를 조회합니다.

- **인가**: 로그인 필수
- **응답**: `{ user: User }`

### POST `/api/auth/switch-role`

역할을 변경합니다.

- **인가**: 로그인 필수
- **Body**: `{ new_role: string }`
- **응답**: `{ user: User }`

### PATCH `/api/auth/profile`

프로필 정보를 수정합니다.

- **인가**: 로그인 필수
- **Body**: `{ name?, bio?, social_links?, profile_color?, school?, department?, student_id? }`
- **응답**: `{ user: User }`

### POST `/api/auth/avatar`

아바타 이미지를 업로드합니다.

- **인가**: 로그인 필수
- **Content-Type**: `multipart/form-data`
- **Body**: `file: 이미지 파일`
- **처리**: Cloudflare R2에 업로드, users.avatar_url 업데이트
- **응답**: `{ avatar_url: string }`

### POST `/api/auth/banner`

배너 이미지를 업로드합니다.

- **인가**: 로그인 필수
- **Content-Type**: `multipart/form-data`
- **Body**: `file: 이미지 파일`
- **응답**: `{ banner_url: string }`

### GET `/api/auth/profile/{user_id}`

공개 프로필을 조회합니다.

- **인가**: 없음
- **Path**: `user_id: string`
- **응답**: `{ id, name, role, avatar_url, banner_url, bio, social_links, profile_color, school, department, tier_info, badges[] }`

---

## 3. Courses 모듈 — 강의

### POST `/api/courses`

새 강의를 생성합니다.

- **인가**: professor 또는 personal
- **Body**: `{ title: string, description?: string, objectives?: string[] }`
- **처리**: 8자리 랜덤 초대 코드 자동 생성
- **응답 (201)**: `{ course: Course }`

### GET `/api/courses`

사용자의 강의 목록을 조회합니다.

- **인가**: 로그인 필수
- **처리**: 역할별 분기 (professor=생성 강의, student=수강 강의, personal=개인 강의)
- **응답**: `{ courses: Course[] }`

### GET `/api/courses/by-invite/{invite_code}`

초대 코드로 강의 정보를 미리 조회합니다.

- **인가**: 없음
- **응답**: `{ course: Course }`

### POST `/api/courses/join`

초대 코드로 강의에 참가합니다.

- **인가**: student
- **Body**: `{ invite_code: string }`
- **응답**: `{ enrollment, course }`

### PATCH `/api/courses/{course_id}`

강의 정보를 수정합니다.

- **인가**: professor 또는 personal (해당 강의)
- **Body**: `{ title?, description?, objectives?, banner_url? }`
- **응답**: `{ course: Course }`

### GET `/api/courses/{course_id}`

강의 상세 정보를 조회합니다.

- **인가**: 해당 강의 소속 사용자
- **응답**: `{ course, assignments[], students[], enrollments[] }`

### PATCH `/api/courses/{course_id}/my-banner`

학생 개인의 강의 배너를 설정합니다.

- **인가**: 로그인 필수
- **Body**: `{ custom_banner_url: string }`
- **응답**: `{ custom_banner_url }`

---

## 4. Assignments 모듈 — 과제

**Base**: `/api/courses/{course_id}/assignments`

### POST `/api/courses/{course_id}/assignments`

과제를 생성합니다.

- **인가**: professor 또는 personal
- **Body**:
  ```json
  {
    "title": "이진 탐색 트리",
    "topic": "자료구조",
    "type": "coding|writing|both|algorithm",
    "ai_policy": "free|normal|strict|exam",
    "language": "python",
    "difficulty": "medium",
    "problem_count": 3,
    "problem_style": "default|baekjoon|programmers|quiz|block",
    "writing_prompt": "...",
    "due_date": "2026-05-01T23:59:59Z",
    "show_score_to_student": true,
    "grading_strictness": "normal",
    "grading_note": "",
    "exam_mode": false,
    "exam_config": {...},
    "is_team_assignment": false
  }
  ```
- **처리**: AI가 문제/루브릭 자동 생성 (백그라운드), generation_status로 진행률 추적
- **응답 (201)**: `{ assignment: Assignment }`

### GET `/api/courses/{course_id}/assignments`

과제 목록을 조회합니다.

- **인가**: 해당 강의 소속
- **응답**: `{ assignments: Assignment[] }` (학생은 has_submitted 포함)

### GET `/api/courses/{course_id}/assignments/{assignment_id}`

과제 상세를 조회합니다.

- **인가**: 해당 강의 소속
- **응답**: `{ assignment: Assignment }`

### PATCH `/api/courses/{course_id}/assignments/{assignment_id}`

과제를 수정합니다.

- **인가**: professor 또는 personal
- **Body**: `{ title?, topic?, type?, language?, due_date?, ... }`
- **응답**: `{ assignment }`

### DELETE `/api/courses/{course_id}/assignments/{assignment_id}`

과제를 삭제합니다.

- **인가**: professor 또는 personal
- **응답 (204)**: 없음

### POST `/api/courses/{course_id}/assignments/{assignment_id}/publish`

과제를 발행합니다 (학생에게 노출).

- **인가**: professor 또는 personal
- **응답**: `{ assignment }`

### POST `/api/courses/{course_id}/assignments/{assignment_id}/unpublish`

과제를 비발행으로 변경합니다.

- **인가**: professor 또는 personal

### PATCH `/api/courses/{course_id}/assignments/{assignment_id}/policy`

AI 정책을 변경합니다.

- **Body**: `{ ai_policy: "free"|"normal"|"strict"|"exam" }`

### PATCH `/api/courses/{course_id}/assignments/{assignment_id}/writing-prompt`

글쓰기 지침을 수정합니다.

- **Body**: `{ writing_prompt: string }`

### POST `/api/courses/{course_id}/assignments/{assignment_id}/problems`

문제를 추가합니다.

- **Body**: `{ title, description, starter_code, expected_output, hints[] }`
- **응답 (201)**: `{ assignment }`

### PATCH `/api/courses/{course_id}/assignments/{assignment_id}/problems/{problem_id}`

문제를 수정합니다.

### DELETE `/api/courses/{course_id}/assignments/{assignment_id}/problems/{problem_id}`

문제를 삭제합니다.

### GET `/api/courses/{course_id}/assignments/{assignment_id}/submissions`

제출물 목록을 조회합니다 (교수용).

- **인가**: professor
- **응답**: `{ submissions: Submission[] }` (학생별, AI 분석 포함)

### GET `/api/courses/{course_id}/assignments/{assignment_id}/paste-logs`

붙여넣기 로그를 조회합니다.

- **인가**: professor

### GET `/api/courses/{course_id}/assignments/{assignment_id}/submissions/{student_id}/snapshots`

특정 학생의 스냅샷 타임라인을 조회합니다.

- **인가**: professor
- **응답**: `{ snapshots: Snapshot[] }` (시간순)

### PATCH `/api/courses/{course_id}/assignments/{assignment_id}/analyses/{analysis_id}/score`

AI 채점 점수를 수동으로 수정합니다.

- **인가**: professor
- **Body**: `{ final_score: number }`

### DELETE `/api/courses/{course_id}/assignments/{assignment_id}/submissions/{submission_id}`

제출물을 삭제합니다.

- **인가**: professor

### GET `/api/courses/{course_id}/assignments/problem-bank`

문제 은행을 조회합니다.

- **인가**: professor

### POST `/api/courses/{course_id}/assignments/{assignment_id}/import-problems`

문제 은행에서 문제를 가져옵니다.

- **인가**: professor

---

## 5. Editor 모듈 — 에디터

### GET `/api/editor/assignments/{assignment_id}`

학생용 과제 정보를 조회합니다 (에디터 진입 시).

- **인가**: 로그인 필수
- **응답**: `{ assignment, latest_code, submission_status }`

### POST `/api/editor/assignments/{assignment_id}/snapshots`

스냅샷을 저장합니다.

- **인가**: 로그인 필수
- **Body**: `{ code_diff: object, cursor_position?: object, is_paste?: boolean, paste_source?: string }`
- **응답 (201)**: `{ snapshot }`

### GET `/api/editor/assignments/{assignment_id}/snapshots`

본인의 스냅샷 목록을 조회합니다.

- **인가**: 로그인 필수
- **응답**: `{ snapshots[] }`

### POST `/api/editor/assignments/{assignment_id}/paste-log`

붙여넣기 이벤트를 기록합니다.

- **인가**: 로그인 필수
- **Body**: `{ content: string, paste_source: "internal"|"external" }`
- **응답 (201)**: `{ snapshot }`

### GET `/api/editor/assignments/{assignment_id}/my-submission`

본인의 제출물을 조회합니다.

- **인가**: 로그인 필수
- **응답**: `{ submission, analysis? }`

### POST `/api/editor/assignments/{assignment_id}/submit`

과제를 제출합니다.

- **인가**: 로그인 필수
- **Body**: `{ code?: string, content?: object, problem_index?: number }`
- **처리**: submissions INSERT → 비동기 AI 분석 트리거
- **응답 (201)**: `{ submission }`

### POST `/api/editor/assignments/{assignment_id}/quiz-grade`

퀴즈를 채점합니다.

- **인가**: 로그인 필수
- **Body**: `{ answers: object }`
- **응답**: `{ score, feedback, details[] }`

---

## 6. Analysis 모듈 — AI 분석

### GET `/api/submissions/{submission_id}/analysis`

AI 분석 결과를 조회합니다.

- **인가**: 로그인 필수
- **응답**: `{ analysis: AiAnalysis }`

### GET `/api/submissions/{submission_id}/feedback-stream`

AI 피드백을 SSE로 스트리밍합니다.

- **인가**: 로그인 필수
- **Content-Type**: `text/event-stream`
- **이벤트 형식**:
  ```
  data: {"type": "chunk", "content": "분석 텍스트 조각..."}
  data: {"type": "score", "score": 85}
  data: {"type": "done"}
  ```

---

## 7. Tutor 모듈 — AI 튜터

### POST `/api/tutor/chat`

AI 튜터와 대화합니다 (SSE 스트리밍).

- **인가**: student 또는 personal
- **Body**: `{ message: string, assignment_id: string, code_context?: string, history?: ChatMessage[] }`
- **Content-Type (응답)**: `text/event-stream`
- **처리**: AI 정책(ai_policy)에 따라 응답 수준 제한
- **이벤트**: `data: {"type": "chunk", "content": "..."}`

---

## 8. Notes 모듈 — 노트

### POST `/api/courses/{course_id}/notes`

노트를 생성합니다.

- **인가**: student 또는 personal
- **Body**: `{ title: string, content?: object, parent_id?: string, team_id?: string }`
- **응답 (201)**: `{ note: Note }`

### GET `/api/courses/{course_id}/notes`

노트 목록을 조회합니다.

- **인가**: 해당 강의 소속
- **Query**: `?team_id=xxx` (팀 노트 필터)
- **응답**: `{ notes: Note[] }`

### PATCH `/api/notes/{note_id}`

노트를 수정합니다.

- **인가**: 노트 소유자 또는 팀원
- **Body**: `{ title?, content?, categories? }`
- **응답**: `{ note }`

### DELETE `/api/notes/{note_id}`

노트를 삭제합니다.

- **인가**: student 또는 personal (소유자)
- **응답 (204)**: 없음

### GET `/api/notes/{note_id}/snapshots`

노트 스냅샷 목록을 조회합니다.

- **응답**: `{ snapshots: NoteSnapshot[] }`

### GET `/api/notes/{note_id}/snapshots/{snapshot_id}`

특정 노트 스냅샷을 조회합니다.

- **응답**: `{ snapshot: NoteSnapshot }` (content 포함)

### GET `/api/courses/{course_id}/notes/graph`

강의별 지식 그래프 데이터를 조회합니다.

- **인가**: 해당 강의 소속
- **처리**: 노트 → 노드, parent/link/similar → 엣지, 임베딩 유사도 계산
- **응답**: `{ nodes: GraphNode[], edges: GraphEdge[] }`

### GET `/api/notes/unified-graph`

통합 지식 그래프 데이터를 조회합니다 (모든 강의).

- **인가**: 로그인 필수
- **응답**: `{ nodes: GraphNode[], edges: GraphEdge[] }`

### GET `/api/notes/{note_id}/tags`

노트 태그를 조회합니다.

### POST `/api/notes/{note_id}/tags`

태그를 추가합니다.

- **Body**: `{ tag: string }`

### DELETE `/api/notes/{note_id}/tags/{tag_id}`

태그를 삭제합니다.

### GET `/api/notes/{note_id}/backlinks`

이 노트를 참조하는 다른 노트 목록을 조회합니다.

### GET `/api/notes/{note_id}/recommendations`

관련 노트를 추천합니다 (임베딩 유사도 기반).

### GET `/api/courses/{course_id}/study-path`

AI 추천 학습 경로를 조회합니다.

- **응답**: `{ study_path: [{note_id, title, reason}] }`

### GET `/api/courses/{course_id}/weekly-report`

강의별 주간 학습 리포트를 조회합니다.

- **응답**: `{ period, total_notes, new_notes, avg_score, weakest_notes[], summary }`

### GET `/api/notes/unified-study-path`

통합 학습 경로를 조회합니다.

### GET `/api/notes/unified-weekly-report`

통합 주간 리포트를 조회합니다.

### POST `/api/courses/{course_id}/notes/manual-link`

노트 간 수동 링크를 생성합니다.

- **Body**: `{ source_note_id: string, target_note_id: string }`

### DELETE `/api/courses/{course_id}/notes/manual-link`

수동 링크를 삭제합니다.

- **Body**: `{ source_note_id: string, target_note_id: string }`

### GET `/api/notes/{note_id}/ai-comments`

AI가 생성한 코멘트를 조회합니다.

### POST `/api/notes/ask`

AI에게 질문합니다 (노트 컨텍스트 기반).

- **Body**: `{ question: string, context: string }`
- **응답**: `{ answer: string }`

### POST `/api/notes/{note_id}/polish`

노트 텍스트를 AI가 다듬습니다.

- **Body**: `{ content: string }`
- **응답**: `{ polished: string }`

### POST `/api/notes/{note_id}/analyze`

노트를 AI가 분석합니다 (이해도 점수, 갭 분석).

- **응답**: `{ understanding_score, gap_analysis, categories }`

### GET `/api/notes/{note_id}/analyze-stream`

노트 분석을 SSE로 스트리밍합니다.

---

## 9. Dashboard 모듈 — 교수 대시보드

### GET `/api/courses/{course_id}/dashboard`

학급 전체 대시보드를 조회합니다.

- **인가**: professor 또는 personal
- **응답**:
  ```json
  {
    "course_id": "...",
    "student_count": 30,
    "avg_class_score": 78.5,
    "at_risk_count": 3,
    "students": [{
      "student": { "id", "name", "email", "avatar_url" },
      "avg_score": 85,
      "avg_understanding": 72,
      "paste_count": 5,
      "gap_level": "low|medium|high",
      "submission_count": 8,
      "status": "ok|warning"
    }]
  }
  ```

### GET `/api/courses/{course_id}/dashboard/students/{student_id}`

학생 상세 분석을 조회합니다.

- **인가**: professor 또는 personal
- **응답**: `{ student, submissions[], notes[], snapshot_count, paste_logs }`

### GET `/api/courses/{course_id}/insights`

AI 인사이트를 조회합니다.

- **인가**: professor 또는 personal
- **응답**: `{ insights: string }` (마크다운)

---

## 10. Proctor 모듈 — 시험 감독

### POST `/api/exam/screenshot`

시험 스크린샷을 업로드합니다.

- **인가**: 로그인 필수 (시험 진행 중)
- **Content-Type**: `multipart/form-data`
- **Body**: `assignment_id, file (이미지)`
- **처리**: Cloudflare R2에 업로드, exam_screenshots INSERT

### POST `/api/exam/start`

시험을 시작합니다.

- **Body**: `{ assignment_id: string }`
- **응답 (201)**: `{ status: "started" }`

### GET `/api/exam/status/{assignment_id}`

시험 상태를 조회합니다.

- **응답**: `{ is_active, violation_count, max_violations, config }`

### POST `/api/exam/violation`

위반을 기록합니다.

- **Body**: `{ assignment_id: string, violation_type: string, detail?: string }`
- **응답 (201)**: `{ violation }`

### GET `/api/exam/config/{assignment_id}`

시험 설정을 조회합니다.

### PATCH `/api/exam/config/{assignment_id}`

시험 설정을 수정합니다.

- **인가**: professor
- **Body**: `{ screenshot_interval?, max_violations?, screenshot_quality?, fullscreen_required? }`

### GET `/api/exam/screenshots/{assignment_id}`

스크린샷 목록을 조회합니다.

- **인가**: professor
- **Query**: `?student_id=xxx`
- **응답**: `{ screenshots[] }`

### GET `/api/exam/violations/{assignment_id}`

위반 목록을 조회합니다.

- **인가**: professor
- **Query**: `?student_id=xxx`

### GET `/api/exam/summary/{assignment_id}`

시험 요약을 조회합니다.

- **인가**: professor
- **응답**: `{ total_students, total_violations, screenshot_count, students_summary[] }`

### GET `/api/exam/students/{assignment_id}`

시험 응시 학생 목록을 조회합니다.

### POST `/api/exam/reset`

학생 시험 상태를 리셋합니다.

- **인가**: professor
- **Body**: `{ assignment_id: string, student_id: string, reason?: string }`

---

## 11. Runner 모듈 — 코드 실행

### POST `/api/run`

코드를 실행합니다.

- **인가**: 로그인 필수
- **Body**:
  ```json
  {
    "code": "print('Hello')",
    "language": "python|javascript|c|cpp|java|csharp|swift|rust|go",
    "stdin": ""
  }
  ```
- **응답**:
  ```json
  {
    "stdout": "Hello\n",
    "stderr": "",
    "exit_code": 0,
    "execution_time_ms": 45
  }
  ```

### POST `/api/judge`

테스트케이스 기반 알고리즘 채점을 수행합니다.

- **인가**: 로그인 필수
- **Body**:
  ```json
  {
    "code": "...",
    "language": "python",
    "assignment_id": "...",
    "problem_index": 0,
    "test_cases": [
      { "input": "5\n1 2 3 4 5", "expected_output": "15" }
    ],
    "time_limit": 2.0
  }
  ```
- **응답**:
  ```json
  {
    "verdict": "AC|WA|TLE|RE|CE",
    "passed_count": 5,
    "total_count": 5,
    "total_time_ms": 120,
    "case_results": [
      { "verdict": "AC", "time_ms": 24, "actual": "15", "expected": "15" }
    ]
  }
  ```

---

## 12. Agents 모듈 — AI 에이전트

### POST `/api/agents/student/chat`

학생 AI 에이전트와 대화합니다 (SSE).

- **인가**: student 또는 personal
- **Body**: `{ message: string, context?: string }`
- **응답**: SSE 스트리밍

### POST `/api/agents/professor/chat`

교수 AI 에이전트와 대화합니다 (SSE).

- **인가**: professor 또는 personal
- **Body**: `{ message: string, context?: string }`

### GET `/api/agents/session/{agent_type}`

에이전트 세션 정보를 조회합니다.

- **Path**: `agent_type: "student" | "professor"`

### GET `/api/agents/session/{agent_type}/history`

에이전트 대화 이력을 조회합니다.

### DELETE `/api/agents/session/{agent_type}`

에이전트 세션을 초기화합니다.

---

## 13. Gamification 모듈 — 게이미피케이션

### GET `/api/me/tier`

본인의 티어/경험치를 조회합니다.

- **응답**:
  ```json
  {
    "total_exp": 3500,
    "tier": "sprout_i",
    "tier_name": "Sprout I",
    "next_tier": "bloom_iii",
    "next_exp": 5500,
    "progress_pct": 0.636
  }
  ```

### GET `/api/me/badges`

본인의 뱃지 목록을 조회합니다.

- **응답**: `{ badges: [{ id, name, description, category, earned_at }] }`

### GET `/api/tiers`

전체 티어 목록을 조회합니다.

- **응답**: `{ tiers: [{ id, name, min_exp, effects[] }] }`

---

## 14. Materials 모듈 — 교수자료

### GET `/api/courses/{course_id}/materials`

자료 목록을 조회합니다.

- **응답**: `{ materials: CourseMaterial[] }`

### POST `/api/courses/{course_id}/materials`

자료를 업로드합니다.

- **인가**: professor
- **Content-Type**: `multipart/form-data`
- **Body**: `file, title`
- **제한**: 50MB
- **응답 (201)**: `{ material: CourseMaterial }`

### DELETE `/api/courses/{course_id}/materials/{material_id}`

자료를 삭제합니다.

- **인가**: professor
- **응답 (204)**: 없음

---

## 15. Messenger 모듈 — 메신저

### GET `/api/messenger/total-unread`

전체 미읽 메시지 수를 조회합니다.

- **응답**: `{ unread_count: number }`

### GET `/api/messenger/recent-course`

가장 최근 메시지가 있는 강의를 조회합니다.

- **응답**: `{ course_id: string }`

### GET `/api/courses/{course_id}/messenger/unread-count`

강의별 미읽 메시지 수를 조회합니다.

### GET `/api/courses/{course_id}/messenger/conversations`

대화 목록을 조회합니다.

- **응답**: `{ conversations: ConversationItem[] }`

### GET `/api/courses/{course_id}/messenger/{partner_id}`

특정 상대와의 메시지 이력을 조회합니다.

- **처리**: 조회 시 상대방 메시지 읽음 처리 자동 수행
- **응답**: `{ messages: Message[] }`

### POST `/api/courses/{course_id}/messenger/{partner_id}`

메시지를 전송합니다.

- **Body**: `{ content: string }`
- **응답 (201)**: `{ message: Message }`

---

## 16. Comments 모듈 — 노트 코멘트

### GET `/api/notes/{note_id}/comments`

코멘트 목록을 조회합니다.

- **응답**: `{ comments: NoteComment[] }` (user_name, user_role, user_avatar_url 포함)

### POST `/api/notes/{note_id}/comments`

코멘트를 작성합니다.

- **Body**: `{ content: string, block_index?: number, parent_id?: string }`
- **응답 (201)**: `{ comment: NoteComment }`

### PATCH `/api/comments/{comment_id}`

코멘트를 수정합니다.

- **Body**: `{ content: string }`

### DELETE `/api/comments/{comment_id}`

코멘트를 삭제합니다.

### PATCH `/api/comments/{comment_id}/resolve`

코멘트를 해결/미해결로 토글합니다.

### GET `/api/notes/{note_id}/comment-counts`

블록별 코멘트 수를 조회합니다.

- **응답**: `{ block_counts: { "0": 3, "5": 1 }, total: 10, unresolved: 4 }`

### GET `/api/courses/{course_id}/notes/comment-summary`

강의 내 노트 코멘트 요약을 조회합니다.

### GET `/api/courses/{course_id}/student-notes`

교수용 학생 노트 목록을 조회합니다.

- **인가**: professor
- **응답**: `{ students_with_notes: StudentWithNotes[] }`

---

## 17. Notifications 모듈 — 알림

### GET `/api/notifications`

알림 목록을 조회합니다.

### POST `/api/notifications/mark-read`

알림을 읽음 처리합니다.

### GET `/api/messenger/total-unread`

전체 미읽 메시지 수를 조회합니다.

### GET `/api/messenger/recent-course`

최근 메시지 강의를 조회합니다.

---

## 18. Events 모듈 — 캘린더

### GET `/api/events`

이벤트 목록을 조회합니다.

### POST `/api/events`

이벤트를 생성합니다.

- **Body**: `{ title: string, description?: string, event_date: string, end_date?: string, color?: string }`
- **응답 (201)**: `{ event }`

### PATCH `/api/events/{event_id}`

이벤트를 수정합니다.

### DELETE `/api/events/{event_id}`

이벤트를 삭제합니다.

### GET `/api/calendar`

캘린더 데이터를 조회합니다 (이벤트 + 과제 마감일 통합).

- **Query**: `?year=2026&month=4`
- **응답**: `{ events[], deadlines[] }`

### GET `/api/todos`

오늘의 할일을 조회합니다.

- **응답**: `{ todos: [{ type: "event"|"deadline", title, date, ... }] }`

---

## 19. Teams 모듈 — 팀

### POST `/api/courses/{course_id}/teams`

팀을 생성합니다.

- **인가**: professor
- **Body**: `{ name: string, member_ids?: string[] }`
- **응답 (201)**: `{ team: Team }`

### GET `/api/courses/{course_id}/teams`

팀 목록을 조회합니다.

- **응답**: `{ teams: Team[] }` (members 포함)

### GET `/api/courses/{course_id}/teams/{team_id}`

팀 상세를 조회합니다.

### PATCH `/api/courses/{course_id}/teams/{team_id}`

팀을 수정합니다 (멤버 추가/제거).

- **Body**: `{ name?, add_members?: string[], remove_members?: string[] }`

### DELETE `/api/courses/{course_id}/teams/{team_id}`

팀을 삭제합니다.

---

## 20. Voting 모듈 — 팀 투표

### POST `/api/assignments/{assignment_id}/vote`

제출 투표를 발의합니다.

- **인가**: 해당 팀 멤버
- **Body**: `{ submission_payload: object }` (제출할 코드/내용)
- **처리**:
  1. 이미 pending 투표 있으면 409 Conflict
  2. team_submission_votes INSERT (deadline=now+10분)
  3. 발의자 자동 approve
- **응답 (201)**: `{ vote, my_response, responses[], total_members }`

### POST `/api/assignments/{assignment_id}/vote/{vote_id}/respond`

투표에 응답합니다.

- **Body**: `{ response: "approve" | "reject" }`
- **처리**: UPSERT (변경 가능), 자동 resolve 체크
- **자동 resolve 규칙**:
  1. 만장일치 approve → approved → 팀원 전원 submission 자동 생성
  2. 만장일치 reject → rejected
  3. 전원 투표 완료 → 과반수 결정
  4. deadline 초과 → 투표 참여자 기준 과반수 결정
- **응답**: `{ vote, my_response, responses[], total_members }`

### GET `/api/assignments/{assignment_id}/vote/status`

현재 투표 상태를 조회합니다.

- **처리**: deadline 경과 시 자동 resolve
- **응답**:
  ```json
  {
    "vote": {
      "id": "...",
      "status": "pending|approved|rejected",
      "deadline": "2026-04-12T15:30:00Z",
      "initiated_by": "...",
      "submission_payload": {...}
    },
    "my_response": "approve|reject|null",
    "responses": [
      { "student_id": "...", "student_name": "...", "response": "approve" }
    ],
    "total_members": 4,
    "approve_count": 3,
    "reject_count": 0
  }
  ```

---

## 21. Seed 모듈 — 시드 데이터

### POST `/api/seed/reset`

테스트 데이터를 초기화하고 재생성합니다.

- **인가**: 테스트 계정만
- **처리**: 기존 데이터 삭제 → 교수/학생/강의/과제/제출물 등 더미 데이터 INSERT

### GET `/api/seed/status`

시드 데이터 상태를 조회합니다.

---

## 22. 기타 엔드포인트

### GET `/`

API 루트 정보를 반환합니다.

- **응답**: `{ message: "AI 교육 플랫폼 API", docs: "/docs" }`

### GET `/health`

헬스 체크를 수행합니다.

- **응답**: `{ status: "ok", service: "ai-edu-platform" }`

### GET `/api/token-stats`

AI 토큰 사용량 통계를 조회합니다.

- **응답**:
  ```json
  {
    "uptime_seconds": 3600,
    "totals": { "calls": 150, "input_tokens": 500000, "output_tokens": 200000, "cost_usd": 0.52 },
    "by_model": { "gemini-2.5-flash": {...} },
    "by_endpoint": { "analysis": {...} },
    "history": [...]
  }
  ```

### POST `/api/token-stats/reset`

토큰 통계를 초기화합니다.

---

## 23. SSE 스트리밍 엔드포인트 목록

| 엔드포인트 | 용도 |
|-----------|------|
| `GET /api/submissions/{id}/feedback-stream` | AI 분석 피드백 |
| `POST /api/tutor/chat` | AI 튜터 대화 |
| `POST /api/agents/student/chat` | 학생 에이전트 대화 |
| `POST /api/agents/professor/chat` | 교수 에이전트 대화 |
| `GET /api/notes/{id}/analyze-stream` | 노트 분석 |

**SSE 이벤트 공통 형식**:
```
data: {"type": "chunk", "content": "텍스트 조각"}
data: {"type": "score", "score": 85}
data: {"type": "done"}
data: {"type": "error", "message": "에러 메시지"}
```

---

*이 문서는 PikaBuddy의 전체 API 명세를 정의합니다. 각 엔드포인트의 상세 요청/응답 스키마는 FastAPI 자동 생성 문서 (`/docs`)에서 확인할 수 있습니다.*
