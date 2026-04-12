# PikaBuddy — Software Requirements Specification (SRS)

작성일: 2026-04-12  
버전: 1.0  
작성자: PikaBuddy 개발팀

---

## 1. 소개

### 1.1 목적

본 문서는 PikaBuddy AI 교육 플랫폼의 소프트웨어 요구사항을 정의합니다. 기능 요구사항, 비기능 요구사항, 외부 인터페이스 요구사항, 시스템 제약 조건을 포함합니다.

### 1.2 범위

PikaBuddy는 웹 기반 AI 교육 플랫폼으로, 다음을 포함합니다:
- **프론트엔드**: React 19 SPA (Single Page Application)
- **백엔드**: FastAPI RESTful API 서버
- **데이터베이스**: PostgreSQL (Supabase 관리형)
- **AI 서비스**: Google Gemini API
- **파일 스토리지**: Cloudflare R2
- **CDN/호스팅**: Cloudflare (프론트엔드), AWS EC2 (백엔드)

### 1.3 참조 문서

| 문서 | 파일 |
|------|------|
| Product Requirements Document | `docs/01_PRD.md` |
| Technical Design Document | `docs/03_TDD.md` |
| API Specification | `docs/04_API.md` |
| Entity Relationship Diagram | `docs/05_ERD.md` |

---

## 2. 전체 설명

### 2.1 시스템 개요

```
┌───────────────────────────────────────────────────────────┐
│                     사용자 (브라우저)                        │
│  React 19 + TypeScript + Vite + Zustand + Tiptap + Monaco │
└──────────────────────┬────────────────────────────────────┘
                       │ HTTPS (Cloudflare CDN → Nginx)
                       ▼
┌───────────────────────────────────────────────────────────┐
│                   Nginx 리버스 프록시                       │
│              gzip / keepalive / SSL termination            │
└──────────────────────┬────────────────────────────────────┘
                       │ HTTP (:8000)
                       ▼
┌───────────────────────────────────────────────────────────┐
│              FastAPI 백엔드 (Docker)                        │
│     Uvicorn (3 workers) + 20개 모듈 + 135 엔드포인트        │
└────┬──────────┬──────────┬──────────┬─────────────────────┘
     │          │          │          │
     ▼          ▼          ▼          ▼
┌─────────┐┌─────────┐┌─────────┐┌──────────┐
│Supabase ││ Gemini  ││   R2    ││Supabase  │
│PostgreSQL││  API    ││(boto3)  ││Realtime  │
│ (29 TBL)││ (AI)    ││(파일)   ││(WebSocket)│
└─────────┘└─────────┘└─────────┘└──────────┘
```

### 2.2 사용자 분류

| 역할 | 시스템 접근 권한 |
|------|----------------|
| **professor** | 강의/과제 CRUD, 학생 분석, 시험 감독, 팀 관리, 자료 업로드, 학생 노트 열람/코멘트 |
| **student** | 강의 참가, 과제 수행, 노트 작성, 메신저, 팀 활동, 투표 |
| **personal** | 개인 강의/과제 생성, AI 분석, 노트, 그래프 (교수+학생 기능의 개인화 버전) |
| **admin** | `@pikabuddy.admin` 이메일 도메인으로 식별, 모든 역할 접근 가능 |

### 2.3 운영 환경

| 항목 | 사양 |
|------|------|
| 클라이언트 | Chrome 90+, Edge 90+, Firefox 90+, Safari 15+ |
| 화면 해상도 | 1280×720 이상 권장, 반응형 지원 |
| 인터넷 | 5Mbps 이상 권장 (SSE 스트리밍, 실시간 기능) |
| 서버 OS | Ubuntu 22.04 LTS (Docker) |
| 런타임 | Python 3.12, Node.js 18+ |

---

## 3. 기능 요구사항

### 3.1 인증/인가 모듈 (AUTH)

#### FR-AUTH-001: Google OAuth 로그인

- **설명**: 사용자가 Google 계정으로 로그인한다
- **입력**: Google OAuth 콜백 (code, state)
- **처리**:
  1. Supabase Auth로 Google OAuth 리디렉트 URL 생성
  2. 콜백에서 access_token을 받아 Supabase에서 사용자 정보 조회
  3. users 테이블에 신규 사용자면 INSERT, 기존이면 name/avatar 업데이트
  4. role이 NULL이면 역할 선택 페이지로 리디렉트
- **출력**: `{ user, access_token, refresh_token }`
- **인가**: 없음 (공개)

#### FR-AUTH-002: 역할 선택

- **설명**: 신규 사용자가 역할(professor/student/personal)을 선택한다
- **입력**: `{ role: "professor" | "student" | "personal" }`
- **처리**:
  1. users 테이블의 role 컬럼 업데이트
  2. personal 선택 시 자동으로 "내 학습" 강의 생성 + 자동 수강 등록
- **출력**: `{ user }` (업데이트된 사용자 정보)
- **인가**: 로그인 필수

#### FR-AUTH-003: 역할 전환

- **설명**: 사용자가 역할을 변경한다
- **입력**: `{ new_role: string }`
- **처리**: role 컬럼 업데이트, personal 전환 시 개인 강의 자동 생성
- **출력**: `{ user }`
- **인가**: 로그인 필수

#### FR-AUTH-004: 프로필 관리

- **설명**: 사용자가 프로필 정보를 수정한다
- **입력**: `{ name, bio, social_links, profile_color, school, department, student_id }`
- **처리**: users 테이블 업데이트
- **출력**: `{ user }`
- **인가**: 로그인 필수

#### FR-AUTH-005: 아바타/배너 업로드

- **설명**: 프로필 이미지 및 배너 이미지를 Cloudflare R2에 업로드한다
- **입력**: 이미지 파일 (multipart/form-data)
- **처리**: R2에 저장 → URL을 users 테이블에 기록
- **출력**: `{ avatar_url }` 또는 `{ banner_url }`
- **인가**: 로그인 필수

#### FR-AUTH-006: 공개 프로필 조회

- **설명**: 다른 사용자의 공개 프로필을 조회한다
- **입력**: user_id (경로 파라미터)
- **출력**: `{ id, name, role, avatar_url, banner_url, bio, social_links, profile_color, school, department, tier, badges[] }`
- **인가**: 로그인 필수

---

### 3.2 강의 모듈 (COURSES)

#### FR-COURSE-001: 강의 생성

- **설명**: 교수가 새 강의를 생성한다
- **입력**: `{ title, description?, objectives? }`
- **처리**: 8자리 랜덤 초대 코드 자동 생성, courses 테이블 INSERT
- **출력**: `{ course }` (초대 코드 포함)
- **인가**: professor 또는 personal

#### FR-COURSE-002: 강의 목록 조회

- **설명**: 사용자의 강의 목록을 조회한다
- **처리**:
  - professor: 본인이 생성한 강의 (+ 수강 학생 수)
  - student: 수강 중인 강의
  - personal: is_personal=true인 강의
- **출력**: `{ courses[] }`
- **인가**: 로그인 필수

#### FR-COURSE-003: 강의 상세 조회

- **설명**: 강의 상세 정보, 과제 목록, 수강생 목록을 조회한다
- **출력**: `{ course, assignments[], students[], enrollments[] }`
- **인가**: 해당 강의 소속 사용자

#### FR-COURSE-004: 초대 코드 참가

- **설명**: 학생이 초대 코드로 강의에 참가한다
- **입력**: `{ invite_code }` 또는 URL 경로 `/join/:inviteCode`
- **처리**: enrollments 테이블 INSERT, 중복 등록 방지 (UNIQUE 제약)
- **출력**: `{ enrollment, course }`
- **인가**: student

---

### 3.3 과제 모듈 (ASSIGNMENTS)

#### FR-ASSIGN-001: 과제 생성

- **설명**: 교수가 과제를 생성한다
- **입력**:
  ```json
  {
    "title": "이진 탐색 트리",
    "topic": "자료구조",
    "type": "coding|writing|both|algorithm",
    "ai_policy": "free|normal|strict|exam",
    "language": "python",
    "problems": [...],
    "rubric": { "criteria": [...] },
    "writing_prompt": "...",
    "due_date": "2026-05-01T23:59:59Z",
    "exam_mode": false,
    "exam_config": {...},
    "is_team_assignment": false
  }
  ```
- **처리**: assignments 테이블 INSERT, generation_status='completed'
- **인가**: professor 또는 personal (해당 강의)

#### FR-ASSIGN-002: 과제 수정

- **설명**: 교수가 과제를 수정한다 (제목, 문제, 루브릭, 정책 등)
- **인가**: professor (해당 강의)

#### FR-ASSIGN-003: 과제 발행

- **설명**: 교수가 과제를 draft에서 published로 변경한다
- **처리**: status='published' 업데이트, 학생에게 노출
- **인가**: professor (해당 강의)

#### FR-ASSIGN-004: 문제 추가/수정/삭제

- **설명**: 코딩/알고리즘 과제에 문제를 추가, 수정, 삭제한다
- **처리**: problems JSONB 배열 내 항목 관리
- **인가**: professor 또는 personal

#### FR-ASSIGN-005: AI 루브릭 자동 생성

- **설명**: AI가 과제 주제와 문제를 기반으로 채점 기준표를 자동 생성한다
- **처리**: Gemini API 호출 → rubric JSON 생성
- **인가**: professor 또는 personal

#### FR-ASSIGN-006: 교수용 학생 스냅샷 조회

- **설명**: 교수가 특정 학생의 과제 작성 과정(스냅샷)을 시간순으로 조회한다
- **출력**: `{ snapshots[] }` (시간순 정렬, is_paste 포함)
- **인가**: professor (해당 강의)

#### FR-ASSIGN-007: 제출물 상세 + Diff 뷰

- **설명**: 교수가 학생의 제출물을 조회하고, 스냅샷 간 diff를 확인한다
- **처리**: 인접 스냅샷 비교, +/- diff 라인 생성
- **인가**: professor (해당 강의)

---

### 3.4 에디터 모듈 (EDITOR)

#### FR-EDIT-001: 과제 정보 + 현재 진행상태 조회

- **설명**: 학생이 에디터 진입 시 과제 정보와 기존 스냅샷을 조회한다
- **출력**: `{ assignment, latest_snapshot, submission_status }`
- **인가**: 해당 과제 수강생

#### FR-EDIT-002: 스냅샷 저장

- **설명**: 학생의 코드/글 작성 과정을 스냅샷으로 저장한다
- **입력**: `{ code_diff, cursor_position, is_paste, paste_source }`
- **처리**: snapshots 테이블 INSERT
- **주기**: 30초 간격 자동 + 코드 변경 시
- **인가**: 해당 과제 수강생

#### FR-EDIT-003: 붙여넣기 감지 기록

- **설명**: 외부/내부 붙여넣기 이벤트를 기록한다
- **입력**: `{ content, paste_source: "internal"|"external" }`
- **처리**: snapshots에 is_paste=true로 INSERT
- **인가**: 해당 과제 수강생

#### FR-EDIT-004: 코드/글 제출

- **설명**: 학생이 과제를 제출한다
- **입력**: `{ code, content?, problem_index? }`
- **처리**:
  1. submissions 테이블 INSERT (status='submitted')
  2. AI 분석 비동기 트리거 (status → 'analyzing' → 'completed')
- **출력**: `{ submission }`
- **인가**: 해당 과제 수강생

#### FR-EDIT-005: 퀴즈 자동 채점

- **설명**: 퀴즈 과제 제출 시 자동 채점한다
- **처리**: 객관식 정답 비교 + 주관식 AI 채점
- **출력**: `{ score, feedback }`
- **인가**: 해당 과제 수강생

---

### 3.5 AI 분석 모듈 (ANALYSIS)

#### FR-ANAL-001: 제출물 AI 분석

- **설명**: 제출된 코드/글을 AI가 분석한다
- **입력**: submission_id
- **처리**:
  1. 제출물 + 루브릭 + 스냅샷(붙여넣기 비율) 수집
  2. Gemini API 호출 (3단계 폴백)
  3. score, feedback, logic_analysis, quality_analysis, suggestions 생성
  4. ai_analyses 테이블 INSERT
  5. submissions.status → 'completed'
- **출력**: `{ analysis }`
- **인가**: 시스템 내부 호출

#### FR-ANAL-002: AI 피드백 스트리밍 (SSE)

- **설명**: AI 분석 결과를 SSE로 실시간 스트리밍한다
- **프로토콜**: `text/event-stream`
- **이벤트**: `data: {"type": "chunk", "content": "..."}`
- **처리**: Gemini 스트리밍 응답을 SSE 이벤트로 변환
- **인가**: 해당 과제 수강생

---

### 3.6 AI 튜터 모듈 (TUTOR)

#### FR-TUTOR-001: AI 튜터 채팅 (SSE)

- **설명**: 학생이 AI 튜터에게 질문하고 실시간 응답을 받는다
- **입력**: `{ message, context: { code, assignment_info } }`
- **처리**:
  1. AI 정책 확인 (exam일 경우 차단)
  2. 현재 코드 컨텍스트 + 대화 이력 포함
  3. Gemini 스트리밍 호출
  4. 정책별 응답 필터링 (strict: 코드 생성 차단)
- **프로토콜**: SSE 스트리밍
- **인가**: 해당 과제 수강생 (exam 정책 제외)

---

### 3.7 에이전트 모듈 (AGENTS)

#### FR-AGENT-001: 학생 에이전트 채팅

- **설명**: 학생 전용 AI 에이전트와 대화한다
- **기능**: 과제 도움, 학습 상담, 개념 설명
- **인가**: student 또는 personal

#### FR-AGENT-002: 교수 에이전트 채팅

- **설명**: 교수 전용 AI 에이전트와 대화한다
- **기능**: 학급 분석 요약, 과제 설계 조언, 교육 방법론
- **인가**: professor

#### FR-AGENT-003: 에이전트 세션/이력 관리

- **설명**: 에이전트 대화 세션을 생성, 조회, 초기화한다
- **인가**: 로그인 필수

---

### 3.8 노트 모듈 (NOTES)

#### FR-NOTE-001: 노트 CRUD

- **설명**: 노트를 생성, 조회, 수정, 삭제한다
- **입력 (생성)**: `{ title, content, course_id, parent_id?, team_id? }`
- **처리**: notes 테이블 CRUD, content는 Tiptap JSON 형태
- **인가**: 해당 강의 소속 사용자

#### FR-NOTE-002: AI 다듬기 (Polish)

- **설명**: 노트 내용을 AI가 다듬어 제안한다
- **입력**: `{ content (선택 텍스트) }`
- **출력**: `{ polished_text }`
- **인가**: 해당 노트 소유자

#### FR-NOTE-003: AI 질문 (Ask)

- **설명**: 노트 내용을 기반으로 AI에게 질문한다
- **입력**: `{ question, note_content }`
- **출력**: SSE 스트리밍 응답
- **인가**: 해당 노트 소유자

#### FR-NOTE-004: 지식 그래프 데이터 조회

- **설명**: 강의별 또는 통합 지식 그래프 데이터를 조회한다
- **처리**:
  1. notes → nodes 변환 (id, title, score, tags, content_length)
  2. parent_id → parent edges
  3. note_manual_links → link edges
  4. AI 임베딩 → similar edges (코사인 유사도 계산)
- **출력**: `{ nodes[], edges[] }`
- **인가**: 해당 강의 소속 사용자

#### FR-NOTE-005: 학습 경로 (Study Path)

- **설명**: AI가 노트를 분석하여 최적 학습 순서를 추천한다
- **출력**: `{ study_path: [...] }`
- **인가**: 해당 강의 소속 사용자

#### FR-NOTE-006: 주간 리포트 (Weekly Report)

- **설명**: 주간 학습 현황을 요약한다
- **출력**: `{ period, total_notes, new_notes, avg_score, weakest_notes[], summary }`
- **인가**: 해당 강의 소속 사용자

#### FR-NOTE-007: 노트 스냅샷 관리

- **설명**: 노트의 특정 시점 상태를 수동으로 저장/복원한다
- **인가**: 해당 노트 소유자 또는 팀원

---

### 3.9 코멘트 모듈 (COMMENTS)

#### FR-COMMENT-001: 블록 단위 코멘트 CRUD

- **설명**: 노트의 특정 블록에 코멘트를 작성, 수정, 삭제한다
- **입력**: `{ note_id, block_index, content, parent_id? }`
- **처리**: note_comments 테이블 CRUD, 답글은 parent_id로 스레드
- **인가**: 해당 노트 접근 권한

#### FR-COMMENT-002: 코멘트 해결 (Resolve)

- **설명**: 코멘트를 해결 상태로 변경한다
- **처리**: is_resolved = true 업데이트
- **인가**: 코멘트 작성자 또는 노트 소유자

#### FR-COMMENT-003: 코멘트 수 집계

- **설명**: 블록별 코멘트 수와 미해결 코멘트 수를 조회한다
- **출력**: `{ block_counts: {0: 3, 5: 1}, total: 10, unresolved: 4 }`
- **인가**: 해당 노트 접근 권한

#### FR-COMMENT-004: AI 코멘트 요약

- **설명**: 노트의 전체 코멘트를 AI가 요약한다
- **출력**: `{ summary }`
- **인가**: 해당 노트 접근 권한

---

### 3.10 대시보드 모듈 (DASHBOARD)

#### FR-DASH-001: 학급 개요

- **설명**: 교수가 강의의 전체 학습 현황을 조회한다
- **출력**:
  ```json
  {
    "course_id": "...",
    "student_count": 30,
    "avg_class_score": 78.5,
    "at_risk_count": 3,
    "students": [
      {
        "student": { "id", "name", "email", "avatar_url" },
        "avg_score": 85,
        "avg_understanding": 72,
        "paste_count": 5,
        "gap_level": "low",
        "submission_count": 8,
        "status": "ok"
      }
    ]
  }
  ```
- **인가**: professor (해당 강의)

#### FR-DASH-002: 학생 상세 분석

- **설명**: 특정 학생의 상세 학습 데이터를 조회한다
- **출력**: 과제별 점수, 제출 이력, 붙여넣기 비율, 노트 이해도 추이
- **인가**: professor (해당 강의)

#### FR-DASH-003: AI 인사이트

- **설명**: AI가 학급 전체 데이터를 분석하여 인사이트를 생성한다
- **출력**: `{ insights: "..." }` (마크다운 형태)
- **인가**: professor (해당 강의)

---

### 3.11 시험 감독 모듈 (PROCTOR)

#### FR-PROC-001: 시험 시작

- **설명**: 학생이 시험 모드 과제에 진입한다
- **처리**: 전체화면 강제, 감독 세션 시작
- **인가**: student (해당 과제, exam_mode=true)

#### FR-PROC-002: 스크린샷 캡처

- **설명**: 학생 화면을 주기적으로 캡처하여 R2에 저장한다
- **입력**: Base64 인코딩 이미지 데이터
- **처리**: R2 업로드 → exam_screenshots INSERT
- **주기**: exam_config.screenshot_interval (기본 60초)
- **인가**: student (시험 진행 중)

#### FR-PROC-003: 위반 기록

- **설명**: 시험 중 위반 행위를 감지하고 기록한다
- **입력**: `{ violation_type, detail? }`
- **처리**: exam_violations INSERT/UPDATE (violation_count 증가)
- **인가**: student (시험 진행 중)

#### FR-PROC-004: 시험 감독 설정 관리

- **설명**: 교수가 시험 감독 설정을 조회, 수정한다
- **입력**: `{ screenshot_interval, max_violations, screenshot_quality, fullscreen_required }`
- **인가**: professor (해당 과제)

#### FR-PROC-005: 스크린샷/위반 목록 조회

- **설명**: 교수가 시험의 스크린샷 타임라인과 위반 로그를 조회한다
- **출력**: `{ screenshots[], violations[] }`
- **인가**: professor (해당 과제)

#### FR-PROC-006: 시험 리셋

- **설명**: 교수가 학생의 시험 상태를 리셋한다
- **처리**: 위반 기록 초기화 + exam_reset_logs 기록
- **인가**: professor (해당 과제)

---

### 3.12 코드 실행 모듈 (RUNNER)

#### FR-RUN-001: 코드 실행 (Run)

- **설명**: 학생이 작성한 코드를 서버에서 실행하고 결과를 반환한다
- **입력**: `{ code, language, stdin? }`
- **지원 언어**: python, javascript, c, cpp, java, csharp, swift, rust, go
- **처리**:
  1. 위험 패턴 검사 (os.system, subprocess, exec 등)
  2. 임시 파일 생성 → 컴파일(필요 시) → 실행
  3. 타임아웃 적용 (5초 × 언어별 배율)
  4. stdout/stderr 캡처
- **출력**: `{ stdout, stderr, exit_code, execution_time_ms }`
- **인가**: 로그인 필수

#### FR-RUN-002: 알고리즘 채점 (Judge)

- **설명**: 테스트케이스 기반으로 코드를 자동 채점한다
- **입력**: `{ code, language, test_cases: [{input, expected_output}] }`
- **처리**:
  1. 각 테스트케이스에 대해 코드 실행
  2. 실제 출력과 기대 출력 비교
  3. 판정: AC(정답), WA(오답), TLE(시간 초과), RE(런타임 에러), CE(컴파일 에러)
  4. judge_results 테이블 INSERT
- **출력**: `{ verdict, passed_count, total_count, total_time_ms, case_results[] }`
- **인가**: 로그인 필수

**위험 패턴 차단 목록** (언어별):

| 언어 | 차단 패턴 |
|------|-----------|
| Python | `os.system`, `subprocess`, `exec(`, `eval(`, `__import__`, `open(` |
| JavaScript | `require('child_process')`, `require('fs')`, `eval(`, `Function(` |
| C/C++ | `system(`, `popen(`, `exec(`, `fork(` |
| Java | `Runtime.getRuntime`, `ProcessBuilder`, `System.exit` |
| C# | `Process.Start`, `System.IO.File`, `System.Net` |
| Go | `os/exec`, `os.Remove`, `syscall` |
| Rust | `std::process::Command`, `std::fs::remove` |

---

### 3.13 게이미피케이션 모듈 (GAMIFICATION)

#### FR-GAME-001: 티어/경험치 조회

- **설명**: 사용자의 현재 경험치, 티어, 다음 티어까지의 진행률을 조회한다
- **출력**: `{ total_exp, tier, tier_name, next_tier, progress_pct }`
- **인가**: 로그인 필수

#### FR-GAME-002: 뱃지 조회

- **설명**: 사용자의 획득 뱃지 목록을 조회한다
- **출력**: `{ badges: [{ id, name, description, category, earned_at }] }`
- **인가**: 로그인 필수

#### FR-GAME-003: 전체 티어 목록

- **설명**: 시스템의 전체 티어 목록과 필요 경험치를 조회한다
- **인가**: 로그인 필수

---

### 3.14 메신저 모듈 (MESSENGER)

#### FR-MSG-001: 미읽 메시지 카운트

- **설명**: 사용자의 전체 미읽 메시지 수를 조회한다
- **출력**: `{ unread_count: 5 }`
- **인가**: 로그인 필수

#### FR-MSG-002: 대화 목록

- **설명**: 강의 내 대화 상대 목록과 최근 메시지를 조회한다
- **출력**: `{ conversations: [{ partner, last_message, unread_count }] }`
- **인가**: 해당 강의 소속

#### FR-MSG-003: 메시지 조회

- **설명**: 특정 상대와의 메시지 이력을 조회한다 (읽음 처리 포함)
- **처리**: 조회 시 상대방 메시지를 is_read=true로 자동 업데이트
- **인가**: 해당 강의 소속

#### FR-MSG-004: 메시지 전송

- **설명**: 메시지를 전송한다
- **입력**: `{ receiver_id, content }`
- **처리**: messages INSERT, Supabase Realtime으로 실시간 전달
- **인가**: 해당 강의 소속

---

### 3.15 알림 모듈 (NOTIFICATIONS)

#### FR-NOTI-001: 알림 목록 조회

- **설명**: 사용자의 알림 목록을 조회한다
- **출력**: `{ notifications[] }`
- **인가**: 로그인 필수

#### FR-NOTI-002: 미읽 알림 수 조회

- **설명**: 전체 미읽 알림 수를 조회한다
- **인가**: 로그인 필수

#### FR-NOTI-003: 강의별 최근 알림

- **설명**: 특정 강의의 최근 알림을 조회한다
- **인가**: 해당 강의 소속

---

### 3.16 캘린더/이벤트 모듈 (EVENTS)

#### FR-EVENT-001: 이벤트 CRUD

- **설명**: 개인 일정을 생성, 조회, 수정, 삭제한다
- **입력**: `{ title, description?, event_date, end_date?, color? }`
- **인가**: 로그인 필수 (본인 이벤트만)

#### FR-EVENT-002: 캘린더 조회

- **설명**: 특정 월의 이벤트 + 과제 마감일을 통합 조회한다
- **출력**: `{ events[], deadlines[] }`
- **인가**: 로그인 필수

#### FR-EVENT-003: 투두 조회

- **설명**: 오늘의 할일(이벤트 + 마감 과제)을 조회한다
- **인가**: 로그인 필수

---

### 3.17 팀 모듈 (TEAMS)

#### FR-TEAM-001: 팀 CRUD

- **설명**: 교수가 팀을 생성, 조회, 수정, 삭제한다
- **입력 (생성)**: `{ name, course_id }`
- **인가**: professor (해당 강의)

#### FR-TEAM-002: 팀원 관리

- **설명**: 팀에 멤버를 추가/제거한다
- **처리**: team_members INSERT/DELETE
- **인가**: professor (해당 강의)

---

### 3.18 투표 모듈 (VOTING)

#### FR-VOTE-001: 투표 발의

- **설명**: 팀원이 과제 제출을 위한 투표를 시작한다
- **입력**: `{ submission_payload }` (제출할 코드/내용)
- **처리**:
  1. team_submission_votes INSERT (status='pending', deadline=now+10분)
  2. 발의자 자동 approve 기록
  3. 팀원에게 알림
- **제약**: 이미 pending 투표가 있으면 거부 (부분 유니크 인덱스)
- **인가**: 해당 팀 멤버

#### FR-VOTE-002: 투표 응답

- **설명**: 팀원이 투표에 응답(approve/reject)한다
- **입력**: `{ response: "approve" | "reject" }`
- **처리**: UPSERT (변경 가능), 자동 resolve 체크
- **인가**: 해당 팀 멤버

#### FR-VOTE-003: 투표 상태 조회

- **설명**: 현재 투표 상태를 조회한다
- **처리**: deadline 경과 시 자동 resolve
- **자동 resolve 로직**:
  1. 만장일치 approve → approved → 전원 제출
  2. 만장일치 reject → rejected
  3. 전원 투표 완료 → 과반수 결정
  4. deadline 초과 → 투표 참여자 기준 과반수 결정
- **출력**: `{ vote, responses[], my_response, total_members }`
- **인가**: 해당 팀 멤버

---

### 3.19 교수자료 모듈 (MATERIALS)

#### FR-MAT-001: 자료 업로드

- **설명**: 교수가 강의 자료를 업로드한다
- **입력**: 파일 (multipart/form-data, 최대 50MB)
- **처리**: R2 업로드 → course_materials INSERT
- **인가**: professor (해당 강의)

#### FR-MAT-002: 자료 목록/다운로드

- **설명**: 강의 자료 목록을 조회하고 다운로드 URL을 얻는다
- **인가**: 해당 강의 소속

#### FR-MAT-003: 자료 삭제

- **설명**: 업로드한 자료를 삭제한다
- **처리**: R2 오브젝트 삭제 + course_materials DELETE
- **인가**: professor (해당 강의)

---

### 3.20 시드 데이터 모듈 (SEED)

#### FR-SEED-001: 테스트 데이터 생성

- **설명**: 개발/테스트용 데이터를 생성한다
- **처리**: 교수/학생 계정, 강의, 과제, 제출물 등 더미 데이터 INSERT
- **인가**: 인증 불요 (개발 전용)

---

## 4. 비기능 요구사항

### 4.1 성능 요구사항

| ID | 요구사항 | 기준 | 구현 방법 |
|----|----------|------|-----------|
| NFR-PERF-001 | 정적 자산 로드 시간 | < 3초 (LTE 환경) | Vite 코드 분할 + React Lazy Loading + Cloudflare CDN |
| NFR-PERF-002 | API 응답 시간 (CRUD) | < 500ms (p95) | Uvicorn 멀티워커 + DB 인덱스 최적화 |
| NFR-PERF-003 | AI 스트리밍 첫 토큰 | < 2초 | SSE 스트리밍 + Gemini 스트리밍 API |
| NFR-PERF-004 | 코드 실행 시간 | < 5초 (기본) | subprocess 타임아웃 + 언어별 배율 |
| NFR-PERF-005 | 동시 접속 처리 | 100+ 동시 사용자 | 3 workers + limit-concurrency 100 |
| NFR-PERF-006 | 이미지 압축 | R2 업로드 최적화 | 프론트엔드 리사이즈 + quality 설정 |
| NFR-PERF-007 | API 페이로드 압축 | gzip 적용 | Nginx gzip level 4, min 256B |
| NFR-PERF-008 | 커넥션 재사용 | HTTP keepalive | Nginx keepalive 16, timeout 65s |

### 4.2 보안 요구사항

| ID | 요구사항 | 구현 |
|----|----------|------|
| NFR-SEC-001 | 인증 | Google OAuth 2.0 + Supabase Auth JWT 토큰 |
| NFR-SEC-002 | 인가 | 역할 기반 접근 제어 (FastAPI Depends) |
| NFR-SEC-003 | 데이터 암호화 (전송) | HTTPS (TLS 1.2+) via Nginx/Cloudflare |
| NFR-SEC-004 | 데이터 격리 | PostgreSQL RLS + 백엔드 쿼리 필터 |
| NFR-SEC-005 | 코드 실행 보안 | Docker 컨테이너 격리 + 위험 패턴 차단 + 타임아웃 |
| NFR-SEC-006 | CORS 제한 | 명시적 허용 도메인 목록 |
| NFR-SEC-007 | 환경 변수 보호 | .env 파일 (gitignore), Docker --env-file |
| NFR-SEC-008 | 파일 업로드 제한 | 50MB 크기 제한 + MIME 타입 검증 |
| NFR-SEC-009 | 세션 만료 | access_token 만료 감지 → 재로그인 안내 |
| NFR-SEC-010 | SQL 인젝션 방지 | Supabase Python SDK 파라미터 바인딩 |

### 4.3 신뢰성 요구사항

| ID | 요구사항 | 구현 |
|----|----------|------|
| NFR-REL-001 | AI 서비스 가용성 | 3단계 모델 폴백 (2.5→2.0→1.5 Flash) |
| NFR-REL-002 | 데이터 영속성 | Supabase 관리형 백업 + WAL |
| NFR-REL-003 | 에러 복구 | ErrorBoundary (프론트), 전역 예외 핸들러 (백엔드) |
| NFR-REL-004 | 스냅샷 지속성 | 자동 저장 30초 간격 + 제출 시 최종 스냅샷 |
| NFR-REL-005 | 투표 일관성 | 부분 유니크 인덱스로 동시 투표 방지 |

### 4.4 사용성 요구사항

| ID | 요구사항 | 구현 |
|----|----------|------|
| NFR-USE-001 | 페이지 로딩 피드백 | Skeleton UI + PageLoader 스피너 |
| NFR-USE-002 | 에러 메시지 | 한국어 사용자 친화적 메시지 + 토스트 알림 |
| NFR-USE-003 | 실시간 피드백 | SSE 스트리밍 + Supabase Realtime + 토스트 |
| NFR-USE-004 | 키보드 접근성 | 에디터 단축키, 모달 ESC 닫기 |
| NFR-USE-005 | 테마 커스터마이징 | CSS 변수 기반 테마 + 55종 이펙트 |
| NFR-USE-006 | 튜토리얼 | TutorialProvider로 신규 사용자 온보딩 가이드 |
| NFR-USE-007 | 커스텀 확인 모달 | 브라우저 기본 confirm 대신 커스텀 모달 사용 |

### 4.5 유지보수성 요구사항

| ID | 요구사항 | 구현 |
|----|----------|------|
| NFR-MNT-001 | 모듈화 | 백엔드 21개 독립 모듈, 프론트엔드 컴포넌트 분리 |
| NFR-MNT-002 | 타입 안전성 | TypeScript strict mode + Pydantic 모델 |
| NFR-MNT-003 | 상태 관리 | Zustand 7개 독립 스토어 (관심사 분리) |
| NFR-MNT-004 | API 문서화 | FastAPI 자동 Swagger/OpenAPI 문서 (/docs) |
| NFR-MNT-005 | DB 마이그레이션 | 개별 SQL 파일 기반 증분 마이그레이션 |

### 4.6 확장성 요구사항

| ID | 요구사항 | 구현 |
|----|----------|------|
| NFR-SCL-001 | 수평 확장 | Docker 컨테이너화 + Nginx 로드밸런서 |
| NFR-SCL-002 | DB 스케일링 | Supabase 클라우드 자동 스케일링 |
| NFR-SCL-003 | 파일 스토리지 | Cloudflare R2 (S3 호환, 무제한 확장) |
| NFR-SCL-004 | CDN | Cloudflare 글로벌 CDN |
| NFR-SCL-005 | 워커 스케일링 | uvicorn --workers 설정으로 CPU 코어 활용 |

---

## 5. 외부 인터페이스 요구사항

### 5.1 사용자 인터페이스

| 인터페이스 | 기술 | 설명 |
|-----------|------|------|
| 웹 브라우저 | React SPA | 27개 페이지, Lazy Loading |
| 코드 에디터 | Monaco Editor | VS Code 엔진, 9개 언어 하이라이팅 |
| 리치 텍스트 에디터 | Tiptap v2 | 10개 커스텀 확장 |
| 지식 그래프 | react-force-graph-2d | d3-force 기반 인터랙티브 |
| 드로잉 | Excalidraw | 인라인 드로잉 캔버스 |
| 수식 | KaTeX | LaTeX 수식 렌더링 |

### 5.2 소프트웨어 인터페이스

| 외부 서비스 | 프로토콜 | 용도 |
|------------|----------|------|
| Google OAuth 2.0 | HTTPS | 사용자 인증 |
| Supabase Auth | HTTPS | JWT 토큰 관리 |
| Supabase PostgreSQL | TCP/SSL | 데이터 저장소 |
| Supabase Realtime | WebSocket | 실시간 이벤트 |
| Google Gemini API | HTTPS | AI 분석/튜터/에이전트 |
| Cloudflare R2 | HTTPS (S3 API) | 파일 스토리지 |

### 5.3 하드웨어 인터페이스

| 항목 | 최소 사양 | 권장 사양 |
|------|-----------|-----------|
| 서버 CPU | 2 vCPU | 4 vCPU |
| 서버 RAM | 4 GB | 8-16 GB |
| 서버 스토리지 | 20 GB SSD | 50 GB SSD |
| 인스턴스 | AWS EC2 c7i-flex.large | AWS EC2 t3.xlarge |

### 5.4 통신 인터페이스

| 프로토콜 | 포트 | 용도 |
|----------|------|------|
| HTTPS | 443 | 클라이언트 ↔ Nginx |
| HTTP | 8000 | Nginx ↔ FastAPI (내부) |
| WSS | 443 | Supabase Realtime |
| SSE | 443 | AI 스트리밍 응답 |

---

## 6. 시스템 제약 조건

### 6.1 기술적 제약

1. **단일 서버 배포**: 현재 EC2 단일 인스턴스에 백엔드 + Nginx 배포 (수평 확장 미적용)
2. **코드 실행 격리**: Docker 컨테이너 레벨 격리 (VM 레벨 아님)
3. **AI API 한도**: Google Gemini API 요청 제한 (RPM/TPM)
4. **Supabase 무료 티어**: 데이터베이스 크기/연결 수 제한 가능
5. **브라우저 API 의존**: 시험 감독의 전체화면 API는 브라우저 지원 필요

### 6.2 비즈니스 제약

1. **한국어 우선**: UI/UX와 AI 프롬프트 모두 한국어 기반
2. **Google 계정 필수**: OAuth 제공자가 Google만 지원
3. **무료 운영**: 현 단계에서 수익 모델 미적용

---

## 7. 데이터 요구사항

### 7.1 데이터 보존

| 데이터 유형 | 보존 기간 | 비고 |
|------------|-----------|------|
| 사용자 정보 | 계정 존재 기간 | CASCADE 삭제 |
| 제출물/분석 | 영구 | 학습 이력으로 보존 |
| 스냅샷 | 영구 | 학습 과정 분석용 |
| 시험 스크린샷 | 학기 단위 | R2 스토리지 비용 고려 |
| 메시지 | 영구 | 소통 이력 보존 |
| 노트 | 영구 | 학습 자산 |

### 7.2 데이터 무결성

- UUID 기반 PK (충돌 확률 무시 가능)
- 외래 키 CASCADE/SET NULL로 참조 무결성 보장
- UNIQUE 제약으로 중복 방지 (enrollments, team_members, vote_responses)
- CHECK 제약으로 값 범위 제한 (role, status, type, score 등)
- 부분 유니크 인덱스로 비즈니스 규칙 보장 (진행 중 투표 1개 제한)

---

## 8. 검증 기준

### 8.1 기능 검증

각 기능 요구사항(FR-*)에 대해:
1. 정상 시나리오 (Happy Path) 테스트
2. 권한 없는 접근 시 403 반환
3. 잘못된 입력 시 400/422 반환
4. 존재하지 않는 리소스 시 404 반환

### 8.2 성능 검증

- API 응답 시간 벤치마크 (p50, p95, p99)
- 동시 접속 부하 테스트 (100+ 사용자)
- AI 스트리밍 지연시간 측정

### 8.3 보안 검증

- 인증 우회 시도 테스트
- CORS 정책 검증
- 코드 실행 샌드박스 탈출 시도 테스트
- SQL 인젝션 테스트

---

*이 문서는 PikaBuddy의 소프트웨어 요구사항 명세서입니다. 기능 요구사항은 04_API.md의 엔드포인트 명세와 매핑됩니다.*
