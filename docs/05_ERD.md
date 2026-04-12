# PikaBuddy — Entity Relationship Diagram (ERD) 문서

작성일: 2026-04-12  
버전: 1.0  
작성자: PikaBuddy 개발팀

---

## 1. 개요

PikaBuddy의 데이터베이스는 **Supabase (PostgreSQL)** 기반으로, 총 **27개 테이블**, **1개 함수**, **3개 트리거**로 구성됩니다. 모든 테이블에 **RLS(Row Level Security)**가 활성화되어 있으며, 실제 접근 제어는 백엔드 API 레벨에서 수행합니다.

### 스키마 파일 구조

| 파일 | 설명 |
|------|------|
| `supabase/schema.sql` | 기본 스키마 (16개 테이블 + 함수 + 트리거) |
| `supabase/add_exam_proctoring.sql` | 시험 감독 테이블 (exam_screenshots, exam_violations) + assignments 컬럼 추가 |
| `supabase/add_exam_reset_logs.sql` | 시험 리셋 로그 테이블 |
| `supabase/add_generation_status.sql` | assignments 생성 상태 컬럼 추가 |
| `supabase/add_messenger.sql` | 메신저 테이블 |
| `supabase/add_note_comments.sql` | 노트 코멘트 테이블 |
| `supabase/add_note_categories.sql` | 노트 카테고리 컬럼 + custom_categories 테이블 |
| `supabase/add_note_manual_links.sql` | 노트 수동 링크 테이블 |
| `supabase/add_teams_and_note_snapshots.sql` | 팀, 팀멤버, 노트스냅샷, 투표 테이블 + notes/assignments 컬럼 추가 |
| `supabase/add_user_events.sql` | 사용자 이벤트(캘린더) 테이블 |
| `supabase/add_course_banner.sql` | courses/enrollments 배너 컬럼 추가 |

---

## 2. 테이블 전체 목록

| # | 테이블명 | 설명 | 출처 |
|---|----------|------|------|
| 1 | `users` | 사용자 (교수/학생/개인) | schema.sql |
| 2 | `courses` | 강의 | schema.sql |
| 3 | `enrollments` | 수강 등록 | schema.sql |
| 4 | `assignments` | 과제 | schema.sql |
| 5 | `submissions` | 제출물 | schema.sql |
| 6 | `snapshots` | 코드/글 작성 스냅샷 | schema.sql |
| 7 | `ai_analyses` | AI 분석 결과 | schema.sql |
| 8 | `notes` | 노트 | schema.sql |
| 9 | `course_materials` | 강의 자료 | schema.sql |
| 10 | `user_exp` | 사용자 경험치 | schema.sql |
| 11 | `badges` | 뱃지 정의 | schema.sql |
| 12 | `user_badges` | 사용자-뱃지 매핑 | schema.sql |
| 13 | `judge_results` | 알고리즘 채점 결과 | schema.sql |
| 14 | `ai_comments` | AI 노트 코멘트 | schema.sql |
| 15 | `exam_screenshots` | 시험 스크린샷 | add_exam_proctoring.sql |
| 16 | `exam_violations` | 시험 위반 기록 | add_exam_proctoring.sql |
| 17 | `exam_reset_logs` | 시험 리셋 로그 | add_exam_reset_logs.sql |
| 18 | `messages` | 메신저 메시지 | add_messenger.sql |
| 19 | `note_comments` | 노트 사용자 코멘트 | add_note_comments.sql |
| 20 | `custom_categories` | 커스텀 카테고리 | add_note_categories.sql |
| 21 | `note_manual_links` | 노트 수동 링크 | add_note_manual_links.sql |
| 22 | `teams` | 팀 | add_teams_and_note_snapshots.sql |
| 23 | `team_members` | 팀 멤버 | add_teams_and_note_snapshots.sql |
| 24 | `note_snapshots` | 노트 스냅샷 | add_teams_and_note_snapshots.sql |
| 25 | `team_submission_votes` | 팀 제출 투표 | add_teams_and_note_snapshots.sql |
| 26 | `team_vote_responses` | 팀 투표 응답 | add_teams_and_note_snapshots.sql |
| 27 | `user_events` | 사용자 캘린더 이벤트 | add_user_events.sql |

---

## 3. 테이블 상세 스키마

### 3.1 users — 사용자

사용자 기본 정보를 저장합니다. Google OAuth를 통해 인증되며, `supabase_uid`로 Supabase Auth와 연결됩니다.

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 사용자 고유 ID |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | 이메일 주소 |
| `name` | VARCHAR(100) | NOT NULL | 이름 |
| `role` | VARCHAR(20) | CHECK (role IN ('professor', 'student', 'personal')) | 역할 |
| `preferences` | JSONB | NOT NULL, DEFAULT '{}' | 사용자 설정 |
| `avatar_url` | TEXT | | 프로필 이미지 URL |
| `banner_url` | TEXT | | 프로필 배너 이미지 URL |
| `bio` | TEXT | DEFAULT '' | 자기소개 |
| `social_links` | JSONB | NOT NULL, DEFAULT '{}' | 소셜 링크 (github, website 등) |
| `profile_color` | VARCHAR(7) | DEFAULT '#004AC6' | 프로필 테마 색상 |
| `school` | VARCHAR(100) | DEFAULT '' | 학교명 |
| `department` | VARCHAR(100) | DEFAULT '' | 학과명 |
| `student_id` | VARCHAR(50) | DEFAULT '' | 학번 |
| `supabase_uid` | VARCHAR(255) | NOT NULL, UNIQUE | Supabase Auth UID |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일시 |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 수정일시 |

**인덱스**:
- `idx_users_supabase_uid` ON users(supabase_uid)
- `idx_users_role` ON users(role)

**트리거**: `trg_users_updated_at` — UPDATE 시 `updated_at` 자동 갱신

**RLS**: ENABLED — `Service role full access` 정책

---

### 3.2 courses — 강의

교수가 생성하는 강의 단위입니다. 초대 코드를 통해 학생이 참가합니다.

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 강의 고유 ID |
| `professor_id` | UUID | NOT NULL, FK → users(id) CASCADE | 담당 교수 |
| `title` | VARCHAR(200) | NOT NULL | 강의명 |
| `description` | TEXT | | 강의 설명 |
| `objectives` | JSONB | | 학습 목표 배열 |
| `invite_code` | VARCHAR(10) | NOT NULL, UNIQUE | 초대 코드 |
| `is_personal` | BOOLEAN | NOT NULL, DEFAULT false | 개인 학습용 여부 |
| `banner_url` | TEXT | | 강의 배너 이미지 URL |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일시 |

**인덱스**:
- `idx_courses_professor_id` ON courses(professor_id)
- `idx_courses_invite_code` ON courses(invite_code)
- `idx_courses_is_personal` ON courses(is_personal) WHERE is_personal = true — **부분 인덱스**

**외래 키**: professor_id → users(id) ON DELETE CASCADE

---

### 3.3 enrollments — 수강 등록

학생-강의 매핑 테이블입니다. 학생이 초대 코드로 강의에 참가하면 레코드가 생성됩니다.

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 등록 고유 ID |
| `student_id` | UUID | NOT NULL, FK → users(id) CASCADE | 학생 |
| `course_id` | UUID | NOT NULL, FK → courses(id) CASCADE | 강의 |
| `custom_banner_url` | TEXT | | 학생 개인 강의 배너 URL |
| `enrolled_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 등록일시 |

**유니크 제약**: UNIQUE(student_id, course_id) — 중복 등록 방지

**인덱스**:
- `idx_enrollments_student_id` ON enrollments(student_id)
- `idx_enrollments_course_id` ON enrollments(course_id)

---

### 3.4 assignments — 과제

교수가 출제하는 과제입니다. 코딩/글쓰기/퀴즈/알고리즘 4가지 유형을 지원합니다.

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 과제 고유 ID |
| `course_id` | UUID | NOT NULL, FK → courses(id) CASCADE | 소속 강의 |
| `title` | VARCHAR(200) | NOT NULL | 과제명 |
| `topic` | VARCHAR(200) | | 과제 주제 |
| `problems` | JSONB | NOT NULL, DEFAULT '[]' | 문제 목록 (배열) |
| `rubric` | JSONB | NOT NULL, DEFAULT '{}' | 채점 기준표 |
| `type` | VARCHAR(20) | NOT NULL, DEFAULT 'coding', CHECK IN ('coding','writing','both','algorithm') | 과제 유형 |
| `ai_policy` | VARCHAR(20) | NOT NULL, DEFAULT 'normal', CHECK IN ('free','normal','strict','exam') | AI 정책 |
| `language` | VARCHAR(20) | NOT NULL, DEFAULT 'python' | 프로그래밍 언어 |
| `writing_prompt` | TEXT | | 글쓰기 지침 |
| `due_date` | TIMESTAMPTZ | | 마감일 |
| `generation_status` | VARCHAR(20) | NOT NULL, DEFAULT 'completed', CHECK IN ('generating','completed','failed') | AI 생성 상태 |
| `exam_mode` | BOOLEAN | NOT NULL, DEFAULT false | 시험 모드 여부 |
| `exam_config` | JSONB | NOT NULL, DEFAULT '{}' | 시험 설정 (간격, 위반 한도 등) |
| `is_team_assignment` | BOOLEAN | NOT NULL, DEFAULT FALSE | 팀 과제 여부 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일시 |

**exam_config JSON 구조**:
```json
{
  "screenshot_interval": 60,
  "max_violations": 5,
  "screenshot_quality": 0.5,
  "fullscreen_required": true
}
```

**problems JSON 구조** (배열):
```json
[
  {
    "id": 1,
    "title": "문제 1",
    "description": "이진 탐색 트리를 구현하세요",
    "starter_code": "class BST:\n    pass",
    "expected_output": "1 2 3 4 5",
    "hints": ["Hint 1", "Hint 2"]
  }
]
```

**rubric JSON 구조**:
```json
{
  "criteria": [
    { "name": "정확성", "weight": 40, "description": "올바른 출력을 생성하는가" },
    { "name": "효율성", "weight": 30, "description": "시간/공간 복잡도가 적절한가" },
    { "name": "가독성", "weight": 30, "description": "코드가 읽기 쉬운가" }
  ]
}
```

**인덱스**: `idx_assignments_course_id` ON assignments(course_id)

---

### 3.5 submissions — 제출물

학생이 과제를 제출하면 생성되는 레코드입니다.

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 제출물 고유 ID |
| `assignment_id` | UUID | NOT NULL, FK → assignments(id) CASCADE | 소속 과제 |
| `student_id` | UUID | NOT NULL, FK → users(id) CASCADE | 제출 학생 |
| `code` | TEXT | NOT NULL, DEFAULT '' | 코드 내용 |
| `content` | JSONB | | 글쓰기 내용 (Tiptap JSON) |
| `problem_index` | INTEGER | NOT NULL, DEFAULT 0 | 문제 인덱스 (멀티 프로블럼) |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'submitted', CHECK IN ('submitted','analyzing','completed') | 상태 |
| `submitted_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 제출일시 |

**인덱스**:
- `idx_submissions_assignment_id` ON submissions(assignment_id)
- `idx_submissions_student_id` ON submissions(student_id)

---

### 3.6 snapshots — 코드/글 작성 스냅샷

학생의 작성 과정을 시계열로 기록합니다. 30초 간격 자동 저장 + 코드 변경 시 저장.

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 스냅샷 고유 ID |
| `submission_id` | UUID | FK → submissions(id) SET NULL | 연관 제출물 (제출 전 NULL) |
| `assignment_id` | UUID | NOT NULL, FK → assignments(id) CASCADE | 소속 과제 |
| `student_id` | UUID | NOT NULL, FK → users(id) CASCADE | 작성 학생 |
| `code_diff` | JSONB | NOT NULL | 코드 또는 글 내용 |
| `cursor_position` | JSONB | | 커서 위치 {line, col} |
| `is_paste` | BOOLEAN | NOT NULL, DEFAULT false | 붙여넣기 여부 |
| `paste_source` | VARCHAR(20) | CHECK IN ('internal', 'external') | 붙여넣기 출처 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일시 |

**code_diff 형식** (코딩):
```json
{
  "code": "def solution():\n    pass",
  "problem_index": 0
}
```

**code_diff 형식** (글쓰기):
```json
{
  "code": "{\"type\":\"doc\",\"content\":[...]}"
}
```

**인덱스**:
- `idx_snapshots_assignment_id` ON snapshots(assignment_id)
- `idx_snapshots_student_id` ON snapshots(student_id)
- `idx_snapshots_created_at` ON snapshots(created_at)

---

### 3.7 ai_analyses — AI 분석 결과

AI가 제출물을 분석한 결과를 저장합니다.

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 분석 고유 ID |
| `submission_id` | UUID | NOT NULL, FK → submissions(id) CASCADE | 분석 대상 제출물 |
| `score` | INTEGER | CHECK (0 ≤ score ≤ 100) | AI 채점 점수 |
| `feedback` | TEXT | | AI 피드백 텍스트 |
| `logic_analysis` | JSONB | | 로직 분석 결과 |
| `quality_analysis` | JSONB | | 품질 분석 결과 |
| `suggestions` | JSONB | | 개선 제안 (배열) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 분석일시 |

**인덱스**: `idx_ai_analyses_submission_id` ON ai_analyses(submission_id)

---

### 3.8 notes — 노트

학생이 작성하는 학습 노트입니다. Tiptap JSON 형태로 내용을 저장합니다.

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 노트 고유 ID |
| `student_id` | UUID | NOT NULL, FK → users(id) CASCADE | 작성자 |
| `course_id` | UUID | NOT NULL, FK → courses(id) CASCADE | 소속 강의 |
| `parent_id` | UUID | FK → notes(id) SET NULL | 부모 노트 (서브노트 계층) |
| `title` | VARCHAR(200) | NOT NULL | 제목 |
| `content` | JSONB | NOT NULL, DEFAULT '{}' | Tiptap JSON 콘텐츠 |
| `gap_analysis` | JSONB | | AI 갭 분석 결과 |
| `understanding_score` | INTEGER | CHECK (0 ≤ score ≤ 100) | 이해도 점수 |
| `categories` | JSONB | DEFAULT '[]' | 카테고리 태그 배열 |
| `team_id` | UUID | FK → teams(id) SET NULL | 팀 노트 소속 팀 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일시 |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 수정일시 |

**인덱스**:
- `idx_notes_student_id` ON notes(student_id)
- `idx_notes_course_id` ON notes(course_id)
- `idx_notes_parent_id` ON notes(parent_id)
- `idx_notes_categories` ON notes USING **GIN**(categories) — JSON 배열 검색 최적화
- `idx_notes_team_id` ON notes(team_id)

**트리거**: `trg_notes_updated_at` — UPDATE 시 `updated_at` 자동 갱신

---

### 3.9 course_materials — 강의 자료

교수가 업로드하는 강의 자료 파일 메타데이터입니다.

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 자료 고유 ID |
| `course_id` | UUID | NOT NULL, FK → courses(id) CASCADE | 소속 강의 |
| `uploaded_by` | UUID | NOT NULL, FK → users(id) CASCADE | 업로더 |
| `title` | VARCHAR(200) | NOT NULL | 자료 제목 |
| `file_name` | VARCHAR(500) | NOT NULL | 원본 파일명 |
| `file_url` | TEXT | NOT NULL | R2 저장 URL |
| `file_size` | BIGINT | NOT NULL, DEFAULT 0 | 파일 크기 (bytes) |
| `mime_type` | VARCHAR(100) | | MIME 타입 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 업로드일시 |

**인덱스**: `idx_course_materials_course_id` ON course_materials(course_id)

---

### 3.10 user_exp — 사용자 경험치

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `user_id` | UUID | **PK**, FK → users(id) CASCADE | 사용자 (1:1) |
| `total_exp` | INT | NOT NULL, DEFAULT 0 | 총 경험치 |
| `tier` | VARCHAR(20) | NOT NULL, DEFAULT 'seed_iv' | 현재 티어 |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 갱신일시 |

**인덱스**: `idx_user_exp_tier` ON user_exp(tier)

**관계**: users와 **1:1** 관계 (user_id가 PK이자 FK)

---

### 3.11 badges — 뱃지 정의

시스템에서 제공하는 뱃지 목록입니다.

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `id` | VARCHAR(50) | PK | 뱃지 식별자 (예: 'first_submit') |
| `name` | VARCHAR(100) | NOT NULL | 뱃지 표시명 |
| `description` | TEXT | NOT NULL | 뱃지 설명 |
| `category` | VARCHAR(30) | NOT NULL | 카테고리 (achievement, streak 등) |
| `condition_type` | VARCHAR(50) | NOT NULL | 조건 유형 |
| `condition_value` | INT | NOT NULL, DEFAULT 1 | 조건 수치 |

---

### 3.12 user_badges — 사용자-뱃지 매핑

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `user_id` | UUID | NOT NULL, FK → users(id) CASCADE | 사용자 |
| `badge_id` | VARCHAR(50) | NOT NULL, FK → badges(id) | 뱃지 |
| `earned_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 획득일시 |

**복합 PK**: (user_id, badge_id)

---

### 3.13 judge_results — 알고리즘 채점 결과

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 채점 고유 ID |
| `submission_id` | UUID | NOT NULL, FK → submissions(id) CASCADE | 제출물 |
| `verdict` | VARCHAR(10) | NOT NULL | 판정 (AC/WA/TLE/RE 등) |
| `passed_count` | INT | NOT NULL, DEFAULT 0 | 통과 테스트케이스 수 |
| `total_count` | INT | NOT NULL, DEFAULT 0 | 전체 테스트케이스 수 |
| `total_time_ms` | FLOAT | | 총 실행 시간 (ms) |
| `max_memory_mb` | FLOAT | | 최대 메모리 사용 (MB) |
| `case_results` | JSONB | NOT NULL, DEFAULT '[]' | 개별 케이스 결과 배열 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 채점일시 |

**case_results 예시**:
```json
[
  {"input": "5\n1 2 3 4 5", "expected": "15", "actual": "15", "verdict": "AC", "time_ms": 12},
  {"input": "3\n-1 0 1", "expected": "0", "actual": "1", "verdict": "WA", "time_ms": 8}
]
```

**인덱스**: `idx_judge_results_submission` ON judge_results(submission_id)

---

### 3.14 ai_comments — AI 노트 코멘트

AI가 노트 내용을 분석하여 자동 생성하는 코멘트입니다.

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 코멘트 고유 ID |
| `note_id` | UUID | NOT NULL, FK → notes(id) CASCADE | 대상 노트 |
| `target_text` | TEXT | NOT NULL | 대상 텍스트 |
| `comment` | TEXT | NOT NULL | AI 코멘트 내용 |
| `is_correct` | BOOLEAN | NOT NULL | 정확성 판단 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일시 |

**인덱스**: `idx_ai_comments_note_id` ON ai_comments(note_id)

---

### 3.15 exam_screenshots — 시험 스크린샷

시험 모드에서 캡처된 학생 화면 스크린샷의 메타데이터입니다.

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 스크린샷 고유 ID |
| `assignment_id` | UUID | NOT NULL, FK → assignments(id) CASCADE | 시험 과제 |
| `student_id` | UUID | NOT NULL, FK → users(id) CASCADE | 학생 |
| `r2_key` | TEXT | NOT NULL | Cloudflare R2 오브젝트 키 |
| `r2_url` | TEXT | NOT NULL | R2 접근 URL |
| `captured_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 캡처 시각 |
| `file_size_kb` | INT | DEFAULT 0 | 파일 크기 (KB) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 레코드 생성일시 |

**인덱스**:
- `idx_exam_screenshots_assignment` ON exam_screenshots(assignment_id)
- `idx_exam_screenshots_student` ON exam_screenshots(student_id)
- `idx_exam_screenshots_lookup` ON exam_screenshots(assignment_id, student_id, captured_at) — **복합 인덱스**

---

### 3.16 exam_violations — 시험 위반 기록

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 위반 고유 ID |
| `assignment_id` | UUID | NOT NULL, FK → assignments(id) CASCADE | 시험 과제 |
| `student_id` | UUID | NOT NULL, FK → users(id) CASCADE | 학생 |
| `violation_type` | VARCHAR(30) | NOT NULL, CHECK IN ('fullscreen_exit','tab_switch','window_blur','forced_end') | 위반 유형 |
| `violation_count` | INT | NOT NULL, DEFAULT 1 | 위반 횟수 |
| `detail` | TEXT | | 상세 정보 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 기록일시 |

**인덱스**:
- `idx_exam_violations_assignment` ON exam_violations(assignment_id)
- `idx_exam_violations_student` ON exam_violations(student_id)
- `idx_exam_violations_lookup` ON exam_violations(assignment_id, student_id) — **복합 인덱스**

---

### 3.17 exam_reset_logs — 시험 리셋 로그

교수가 학생의 시험을 리셋할 때 기록됩니다.

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 로그 고유 ID |
| `assignment_id` | UUID | NOT NULL, FK → assignments(id) CASCADE | 시험 과제 |
| `student_id` | UUID | NOT NULL, FK → users(id) CASCADE | 학생 |
| `professor_id` | UUID | NOT NULL, FK → users(id) CASCADE | 리셋 교수 |
| `reason` | TEXT | NOT NULL, DEFAULT '' | 리셋 사유 |
| `reset_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 리셋 시각 |

**인덱스**:
- `idx_exam_reset_logs_assignment` ON exam_reset_logs(assignment_id)
- `idx_exam_reset_logs_student` ON exam_reset_logs(student_id)

---

### 3.18 messages — 메신저 메시지

강의 내 1:1 DM 메시지입니다.

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 메시지 고유 ID |
| `course_id` | UUID | NOT NULL, FK → courses(id) CASCADE | 강의 컨텍스트 |
| `sender_id` | UUID | NOT NULL, FK → users(id) CASCADE | 발신자 |
| `receiver_id` | UUID | NOT NULL, FK → users(id) CASCADE | 수신자 |
| `content` | TEXT | NOT NULL | 메시지 내용 |
| `is_read` | BOOLEAN | NOT NULL, DEFAULT false | 읽음 여부 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 발송일시 |

**인덱스**:
- `idx_messages_course` ON messages(course_id)
- `idx_messages_conversation` ON messages(course_id, sender_id, receiver_id, created_at) — **복합 인덱스**
- `idx_messages_unread` ON messages(receiver_id, is_read) WHERE is_read = false — **부분 인덱스**

---

### 3.19 note_comments — 노트 사용자 코멘트

교수/학생이 노트 블록에 남기는 코멘트입니다. 스레드 답글을 지원합니다.

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 코멘트 고유 ID |
| `note_id` | UUID | NOT NULL, FK → notes(id) CASCADE | 대상 노트 |
| `user_id` | UUID | NOT NULL, FK → users(id) CASCADE | 작성자 |
| `block_index` | INTEGER | | 블록 인덱스 (NULL=전체 노트) |
| `parent_id` | UUID | FK → note_comments(id) CASCADE | 부모 코멘트 (답글 시) |
| `content` | TEXT | NOT NULL | 코멘트 내용 |
| `is_resolved` | BOOLEAN | NOT NULL, DEFAULT false | 해결 여부 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일시 |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 수정일시 |

**자기 참조**: parent_id → note_comments(id) — 답글 스레드

**인덱스**:
- `idx_note_comments_note` ON note_comments(note_id)
- `idx_note_comments_block` ON note_comments(note_id, block_index) — **복합 인덱스**
- `idx_note_comments_parent` ON note_comments(parent_id)

**트리거**: `trg_note_comments_updated_at` — UPDATE 시 `updated_at` 자동 갱신

---

### 3.20 custom_categories — 커스텀 카테고리

AI 카테고리 자동 분류에 사용되는 사용자 정의 카테고리입니다.

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 카테고리 고유 ID |
| `slug` | VARCHAR(100) | NOT NULL, UNIQUE | URL-safe 식별자 |
| `name` | VARCHAR(100) | NOT NULL | 표시명 |
| `keywords` | JSONB | NOT NULL, DEFAULT '[]' | 연관 키워드 배열 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일시 |

---

### 3.21 note_manual_links — 노트 수동 링크

학생이 직접 생성하는 노트 간 링크입니다 (지식 그래프 엣지의 `link` 타입).

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 링크 고유 ID |
| `course_id` | UUID | NOT NULL, FK → courses(id) CASCADE | 강의 |
| `source_note_id` | UUID | NOT NULL, FK → notes(id) CASCADE | 출발 노트 |
| `target_note_id` | UUID | NOT NULL, FK → notes(id) CASCADE | 도착 노트 |
| `created_by` | UUID | NOT NULL, FK → users(id) CASCADE | 생성자 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일시 |

**유니크 제약**: UNIQUE(source_note_id, target_note_id) — 중복 링크 방지

**인덱스**:
- `idx_note_manual_links_course` ON note_manual_links(course_id)
- `idx_note_manual_links_source` ON note_manual_links(source_note_id)
- `idx_note_manual_links_target` ON note_manual_links(target_note_id)

---

### 3.22 teams — 팀

강의 내 팀(조) 정보입니다.

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 팀 고유 ID |
| `course_id` | UUID | NOT NULL, FK → courses(id) CASCADE | 소속 강의 |
| `name` | VARCHAR(200) | NOT NULL | 팀명 |
| `created_by` | UUID | NOT NULL, FK → users(id) CASCADE | 생성자 (교수) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일시 |

**인덱스**: `idx_teams_course_id` ON teams(course_id)

---

### 3.23 team_members — 팀 멤버

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 멤버 레코드 ID |
| `team_id` | UUID | NOT NULL, FK → teams(id) CASCADE | 소속 팀 |
| `student_id` | UUID | NOT NULL, FK → users(id) CASCADE | 학생 |
| `joined_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 가입일시 |

**유니크 제약**: UNIQUE(team_id, student_id) — 중복 가입 방지

**인덱스**:
- `idx_team_members_team_id` ON team_members(team_id)
- `idx_team_members_student_id` ON team_members(student_id)

---

### 3.24 note_snapshots — 노트 스냅샷

노트의 특정 시점 상태를 수동으로 저장한 스냅샷입니다.

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 스냅샷 고유 ID |
| `note_id` | UUID | NOT NULL, FK → notes(id) CASCADE | 대상 노트 |
| `saved_by` | UUID | NOT NULL, FK → users(id) CASCADE | 저장자 |
| `title` | VARCHAR(200) | NOT NULL | 스냅샷 제목 |
| `content` | JSONB | NOT NULL | Tiptap JSON 내용 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 저장일시 |

**인덱스**:
- `idx_note_snapshots_note_id` ON note_snapshots(note_id)
- `idx_note_snapshots_created_at` ON note_snapshots(created_at)

---

### 3.25 team_submission_votes — 팀 제출 투표

팀 과제 제출 시 진행되는 투표 세션입니다.

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 투표 세션 ID |
| `assignment_id` | UUID | NOT NULL, FK → assignments(id) CASCADE | 대상 과제 |
| `team_id` | UUID | NOT NULL, FK → teams(id) CASCADE | 투표 팀 |
| `initiated_by` | UUID | NOT NULL, FK → users(id) CASCADE | 투표 발의자 |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'pending', CHECK IN ('pending','approved','rejected') | 상태 |
| `submission_payload` | JSONB | NOT NULL, DEFAULT '{}' | 제출 내용 |
| `deadline` | TIMESTAMPTZ | NOT NULL | 투표 기한 |
| `resolved_at` | TIMESTAMPTZ | | 결정 시각 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일시 |

**부분 유니크 인덱스**: `idx_tsv_active_vote` UNIQUE ON (assignment_id, team_id) WHERE status = 'pending'
→ 하나의 팀+과제에 **동시에 1개의 진행 중 투표만** 허용

**인덱스**:
- `idx_tsv_assignment` ON team_submission_votes(assignment_id)
- `idx_tsv_team` ON team_submission_votes(team_id)

---

### 3.26 team_vote_responses — 팀 투표 응답

개별 팀원의 투표 응답입니다.

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 응답 고유 ID |
| `vote_id` | UUID | NOT NULL, FK → team_submission_votes(id) CASCADE | 소속 투표 |
| `student_id` | UUID | NOT NULL, FK → users(id) CASCADE | 투표 학생 |
| `response` | VARCHAR(10) | NOT NULL, CHECK IN ('approve', 'reject') | 응답 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 응답일시 |

**유니크 제약**: UNIQUE(vote_id, student_id) — 1인 1표 (UPSERT로 변경 가능)

**인덱스**: `idx_tvr_vote_id` ON team_vote_responses(vote_id)

---

### 3.27 user_events — 사용자 캘린더 이벤트

학생이 관리하는 개인 일정 및 할일입니다.

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 이벤트 고유 ID |
| `user_id` | UUID | NOT NULL, FK → users(id) CASCADE | 소유자 |
| `title` | VARCHAR(200) | NOT NULL | 이벤트 제목 |
| `description` | TEXT | | 상세 설명 |
| `event_date` | TIMESTAMPTZ | NOT NULL | 시작일시 |
| `end_date` | TIMESTAMPTZ | | 종료일시 (NULL=단일일정) |
| `color` | VARCHAR(20) | DEFAULT 'primary' | 표시 색상 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일시 |

**인덱스**:
- `idx_user_events_user` ON user_events(user_id)
- `idx_user_events_date` ON user_events(user_id, event_date) — **복합 인덱스**

---

## 4. 함수 및 트리거

### 4.1 update_updated_at() 함수

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 4.2 트리거 목록

| 트리거명 | 대상 테이블 | 이벤트 | 설명 |
|----------|------------|--------|------|
| `trg_users_updated_at` | users | BEFORE UPDATE | updated_at 자동 갱신 |
| `trg_notes_updated_at` | notes | BEFORE UPDATE | updated_at 자동 갱신 |
| `trg_note_comments_updated_at` | note_comments | BEFORE UPDATE | updated_at 자동 갱신 |

---

## 5. RLS (Row Level Security) 정책

모든 테이블에 RLS가 활성화되어 있으며, 동일한 정책이 적용됩니다:

```sql
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON <table_name>
    FOR ALL USING (true) WITH CHECK (true);
```

이는 **Supabase Service Role Key**를 사용하는 백엔드가 모든 데이터에 접근할 수 있도록 하는 설정입니다. 실제 접근 제어는 **FastAPI 미들웨어 레벨**에서 수행됩니다:

- `require_user`: 로그인 필수
- `require_professor`: 교수 역할 필수
- `require_professor_or_personal`: 교수 또는 개인 학습자
- `require_student`: 학생 역할 필수
- 과제/강의 소속 검증은 각 엔드포인트에서 쿼리로 수행

---

## 6. 엔티티 관계 다이어그램 (텍스트)

```
                          ┌──────────────┐
                          │    users     │
                          │──────────────│
                          │ id (PK)      │
                          │ email        │
                          │ name         │
                          │ role         │
                          │ supabase_uid │
                          └──────┬───────┘
                 ┌───────┬───────┼───────┬───────────────┬────────────┐
                 │       │       │       │               │            │
                 ▼       ▼       ▼       ▼               ▼            ▼
          ┌──────────┐ ┌────────────┐ ┌─────────┐ ┌───────────┐ ┌──────────┐
          │ courses  │ │enrollments │ │ notes   │ │ user_exp  │ │user_events│
          │──────────│ │────────────│ │─────────│ │───────────│ │──────────│
          │ id (PK)  │ │student_id  │ │ id (PK) │ │user_id(PK)│ │ id (PK)  │
          │professor │ │course_id   │ │student  │ │total_exp  │ │ user_id  │
          │ _id (FK) │ │            │ │course   │ │tier       │ │ title    │
          └────┬─────┘ └────────────┘ │parent   │ └───────────┘ └──────────┘
               │                      │team_id  │
     ┌─────────┼──────────┐          └────┬────┘
     │         │          │               │
     ▼         ▼          ▼               ▼
┌──────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────┐
│assignments│ │ teams   │ │materials │ │note_comments │
│──────────│ │─────────│ │──────────│ │──────────────│
│ id (PK)  │ │ id (PK) │ │ id (PK)  │ │ id (PK)      │
│course_id │ │course_id│ │course_id │ │ note_id (FK) │
│type      │ │name     │ │file_url  │ │ block_index  │
│ai_policy │ └────┬────┘ └──────────┘ │ parent_id    │
│exam_mode │      │                    └──────────────┘
└────┬─────┘      ▼
     │      ┌──────────────┐
     │      │team_members  │
     │      │──────────────│
     │      │team_id (FK)  │
     │      │student_id(FK)│
     │      └──────────────┘
     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│ submissions  │────▶│ ai_analyses  │     │team_submission    │
│──────────────│     │──────────────│     │     _votes        │
│ id (PK)      │     │submission_id │     │──────────────────│
│assignment_id │     │score         │     │assignment_id (FK)│
│student_id    │     │feedback      │     │team_id (FK)      │
│code / content│     └──────────────┘     │status            │
└──────┬───────┘                          │deadline          │
       │                                  └────────┬─────────┘
       │     ┌──────────────┐                      │
       ├────▶│judge_results │                      ▼
       │     │──────────────│              ┌──────────────────┐
       │     │verdict       │              │team_vote_responses│
       │     │passed/total  │              │──────────────────│
       │     └──────────────┘              │vote_id (FK)      │
       │                                   │student_id (FK)   │
       ▼                                   │response          │
┌──────────────┐                           └──────────────────┘
│  snapshots   │
│──────────────│
│submission_id │
│assignment_id │
│code_diff     │
│is_paste      │
└──────────────┘

┌──────────────────┐     ┌──────────────────┐
│exam_screenshots  │     │ exam_violations  │
│──────────────────│     │──────────────────│
│assignment_id (FK)│     │assignment_id (FK)│
│student_id (FK)   │     │student_id (FK)   │
│r2_key / r2_url   │     │violation_type    │
└──────────────────┘     └──────────────────┘

┌──────────────┐     ┌───────────────────┐
│  messages    │     │note_manual_links  │
│──────────────│     │───────────────────│
│course_id (FK)│     │source_note_id (FK)│
│sender_id (FK)│     │target_note_id (FK)│
│receiver_id   │     │course_id (FK)     │
│content       │     └───────────────────┘
│is_read       │
└──────────────┘
```

---

## 7. 인덱스 전체 목록

| # | 인덱스명 | 테이블 | 컬럼 | 유형 |
|---|----------|--------|------|------|
| 1 | idx_users_supabase_uid | users | supabase_uid | B-tree |
| 2 | idx_users_role | users | role | B-tree |
| 3 | idx_courses_professor_id | courses | professor_id | B-tree |
| 4 | idx_courses_invite_code | courses | invite_code | B-tree |
| 5 | idx_courses_is_personal | courses | is_personal | Partial (WHERE true) |
| 6 | idx_enrollments_student_id | enrollments | student_id | B-tree |
| 7 | idx_enrollments_course_id | enrollments | course_id | B-tree |
| 8 | idx_assignments_course_id | assignments | course_id | B-tree |
| 9 | idx_submissions_assignment_id | submissions | assignment_id | B-tree |
| 10 | idx_submissions_student_id | submissions | student_id | B-tree |
| 11 | idx_snapshots_assignment_id | snapshots | assignment_id | B-tree |
| 12 | idx_snapshots_student_id | snapshots | student_id | B-tree |
| 13 | idx_snapshots_created_at | snapshots | created_at | B-tree |
| 14 | idx_ai_analyses_submission_id | ai_analyses | submission_id | B-tree |
| 15 | idx_notes_student_id | notes | student_id | B-tree |
| 16 | idx_notes_course_id | notes | course_id | B-tree |
| 17 | idx_notes_parent_id | notes | parent_id | B-tree |
| 18 | idx_notes_categories | notes | categories | GIN |
| 19 | idx_notes_team_id | notes | team_id | B-tree |
| 20 | idx_course_materials_course_id | course_materials | course_id | B-tree |
| 21 | idx_user_exp_tier | user_exp | tier | B-tree |
| 22 | idx_judge_results_submission | judge_results | submission_id | B-tree |
| 23 | idx_ai_comments_note_id | ai_comments | note_id | B-tree |
| 24 | idx_exam_screenshots_assignment | exam_screenshots | assignment_id | B-tree |
| 25 | idx_exam_screenshots_student | exam_screenshots | student_id | B-tree |
| 26 | idx_exam_screenshots_lookup | exam_screenshots | (assignment_id, student_id, captured_at) | Composite |
| 27 | idx_exam_violations_assignment | exam_violations | assignment_id | B-tree |
| 28 | idx_exam_violations_student | exam_violations | student_id | B-tree |
| 29 | idx_exam_violations_lookup | exam_violations | (assignment_id, student_id) | Composite |
| 30 | idx_exam_reset_logs_assignment | exam_reset_logs | assignment_id | B-tree |
| 31 | idx_exam_reset_logs_student | exam_reset_logs | student_id | B-tree |
| 32 | idx_messages_course | messages | course_id | B-tree |
| 33 | idx_messages_conversation | messages | (course_id, sender_id, receiver_id, created_at) | Composite |
| 34 | idx_messages_unread | messages | (receiver_id, is_read) | Partial (WHERE false) |
| 35 | idx_note_comments_note | note_comments | note_id | B-tree |
| 36 | idx_note_comments_block | note_comments | (note_id, block_index) | Composite |
| 37 | idx_note_comments_parent | note_comments | parent_id | B-tree |
| 38 | idx_note_manual_links_course | note_manual_links | course_id | B-tree |
| 39 | idx_note_manual_links_source | note_manual_links | source_note_id | B-tree |
| 40 | idx_note_manual_links_target | note_manual_links | target_note_id | B-tree |
| 41 | idx_teams_course_id | teams | course_id | B-tree |
| 42 | idx_team_members_team_id | team_members | team_id | B-tree |
| 43 | idx_team_members_student_id | team_members | student_id | B-tree |
| 44 | idx_note_snapshots_note_id | note_snapshots | note_id | B-tree |
| 45 | idx_note_snapshots_created_at | note_snapshots | created_at | B-tree |
| 46 | idx_tsv_assignment | team_submission_votes | assignment_id | B-tree |
| 47 | idx_tsv_team | team_submission_votes | team_id | B-tree |
| 48 | idx_tsv_active_vote | team_submission_votes | (assignment_id, team_id) | Partial Unique |
| 49 | idx_tvr_vote_id | team_vote_responses | vote_id | B-tree |
| 50 | idx_user_events_user | user_events | user_id | B-tree |
| 51 | idx_user_events_date | user_events | (user_id, event_date) | Composite |

**총 51개 인덱스** (PK/UNIQUE 인덱스 제외)

---

## 8. 외래 키 관계 전체 맵

```
users (1) ──< (N) courses              [professor_id → CASCADE]
users (1) ──< (N) enrollments          [student_id → CASCADE]
courses (1) ──< (N) enrollments        [course_id → CASCADE]
courses (1) ──< (N) assignments        [course_id → CASCADE]
assignments (1) ──< (N) submissions    [assignment_id → CASCADE]
users (1) ──< (N) submissions          [student_id → CASCADE]
submissions (1) ──< (N) ai_analyses    [submission_id → CASCADE]
submissions (1) ──< (N) judge_results  [submission_id → CASCADE]
submissions (1) ──< (N) snapshots      [submission_id → SET NULL]
assignments (1) ──< (N) snapshots      [assignment_id → CASCADE]
users (1) ──< (N) snapshots            [student_id → CASCADE]
users (1) ──< (N) notes                [student_id → CASCADE]
courses (1) ──< (N) notes              [course_id → CASCADE]
notes (1) ──< (N) notes                [parent_id → SET NULL] (자기참조)
teams (1) ──< (N) notes                [team_id → SET NULL]
notes (1) ──< (N) ai_comments          [note_id → CASCADE]
notes (1) ──< (N) note_comments        [note_id → CASCADE]
users (1) ──< (N) note_comments        [user_id → CASCADE]
note_comments (1) ──< (N) note_comments [parent_id → CASCADE] (자기참조)
notes (1) ──< (N) note_manual_links    [source_note_id → CASCADE]
notes (1) ──< (N) note_manual_links    [target_note_id → CASCADE]
courses (1) ──< (N) note_manual_links  [course_id → CASCADE]
users (1) ──< (N) note_manual_links    [created_by → CASCADE]
notes (1) ──< (N) note_snapshots       [note_id → CASCADE]
users (1) ──< (N) note_snapshots       [saved_by → CASCADE]
courses (1) ──< (N) course_materials   [course_id → CASCADE]
users (1) ──< (N) course_materials     [uploaded_by → CASCADE]
users (1) ── (1) user_exp              [user_id → CASCADE] (1:1)
users (1) ──< (N) user_badges          [user_id → CASCADE]
badges (1) ──< (N) user_badges         [badge_id → NO ACTION]
assignments (1) ──< (N) exam_screenshots  [assignment_id → CASCADE]
users (1) ──< (N) exam_screenshots     [student_id → CASCADE]
assignments (1) ──< (N) exam_violations   [assignment_id → CASCADE]
users (1) ──< (N) exam_violations      [student_id → CASCADE]
assignments (1) ──< (N) exam_reset_logs   [assignment_id → CASCADE]
users (1) ──< (N) exam_reset_logs      [student_id → CASCADE]
users (1) ──< (N) exam_reset_logs      [professor_id → CASCADE]
courses (1) ──< (N) messages           [course_id → CASCADE]
users (1) ──< (N) messages             [sender_id → CASCADE]
users (1) ──< (N) messages             [receiver_id → CASCADE]
courses (1) ──< (N) teams              [course_id → CASCADE]
users (1) ──< (N) teams                [created_by → CASCADE]
teams (1) ──< (N) team_members         [team_id → CASCADE]
users (1) ──< (N) team_members         [student_id → CASCADE]
assignments (1) ──< (N) team_submission_votes [assignment_id → CASCADE]
teams (1) ──< (N) team_submission_votes       [team_id → CASCADE]
users (1) ──< (N) team_submission_votes       [initiated_by → CASCADE]
team_submission_votes (1) ──< (N) team_vote_responses [vote_id → CASCADE]
users (1) ──< (N) team_vote_responses         [student_id → CASCADE]
users (1) ──< (N) user_events          [user_id → CASCADE]
```

**총 50개 외래 키 관계**

---

## 9. 마이그레이션 히스토리

| 순서 | 파일 | 추가/변경 내용 |
|------|------|---------------|
| 1 | schema.sql | 기본 16개 테이블, 함수, 트리거, 뱃지 시드 데이터 |
| 2 | add_exam_proctoring.sql | exam_screenshots, exam_violations 생성 + assignments 컬럼 추가 |
| 3 | add_exam_reset_logs.sql | exam_reset_logs 생성 |
| 4 | add_generation_status.sql | assignments.generation_status 컬럼 추가 |
| 5 | add_messenger.sql | messages 생성 |
| 6 | add_note_comments.sql | note_comments 생성 |
| 7 | add_note_categories.sql | custom_categories 생성 + notes.categories 컬럼/GIN 인덱스 추가 |
| 8 | add_note_manual_links.sql | note_manual_links 생성 |
| 9 | add_teams_and_note_snapshots.sql | teams, team_members, note_snapshots, team_submission_votes, team_vote_responses 생성 + notes.team_id, assignments.is_team_assignment 추가 |
| 10 | add_user_events.sql | user_events 생성 |
| 11 | add_course_banner.sql | courses.banner_url, enrollments.custom_banner_url 추가 |

---

## 10. 설계 특이사항

### 10.1 자기 참조 (Self-Referencing)

| 테이블 | 컬럼 | 용도 |
|--------|------|------|
| notes | parent_id → notes(id) | 서브노트 계층 구조 (부모-자식) |
| note_comments | parent_id → note_comments(id) | 답글 스레드 |

### 10.2 부분 인덱스 (Partial Index)

- `idx_courses_is_personal`: `WHERE is_personal = true` — 개인 강의 빠른 조회
- `idx_messages_unread`: `WHERE is_read = false` — 미읽 메시지 빠른 카운팅
- `idx_tsv_active_vote`: `WHERE status = 'pending'` — 진행 중 투표 유니크 보장

### 10.3 GIN 인덱스

- `idx_notes_categories`: `USING GIN(categories)` — JSONB 배열 내 검색 최적화

### 10.4 삭제 전략

- 대부분 **CASCADE**: 부모 삭제 시 자식 자동 삭제
- **SET NULL**: snapshots.submission_id, notes.parent_id, notes.team_id — 참조 무결성 유지하면서 부모 삭제 허용

---

*이 문서는 PikaBuddy 데이터베이스의 전체 스키마를 정의합니다. 테이블 간 관계와 제약 조건의 상세 내용을 담고 있습니다.*
