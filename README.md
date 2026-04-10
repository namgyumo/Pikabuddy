# PikaBuddy — 결과가 아닌 과정을 분석하는 AI 교육 플랫폼

## 프로젝트 소개

PikaBuddy는 학생의 **학습 과정(process)**을 AI가 추적·분석하여 맞춤형 피드백을 제공하는 통합 교육 플랫폼입니다.

코딩 과제뿐만 아니라 **Notion급 리치 텍스트 에디터 기반의 글쓰기 과제**, **퀴즈**, **시험 감독**까지 포괄하며, **Obsidian 스타일의 노트 지식 그래프**로 학습 맥락을 시각화합니다. 11개의 AI 기능이 교육 전 과정에 통합되어, 교수와 학생 모두의 교육 경험을 혁신합니다.

| 항목 | 내용 |
|------|------|
| 개발 기간 | 설계 2주 + 구현 26시간 (AI 바이브코딩) |
| 팀 규모 | 4명 |
| 코드 규모 | 프론트엔드 24,548줄 + 백엔드 5,171줄 = 약 30,000줄 |
| 설계 문서 | 7종 (PRD, SRS, TDD, API, ERD, UI/UX, INFRA) |

---

## 핵심 기능

### 1. 코딩 + 글쓰기 + 퀴즈 — 3종 과제 통합

- **코딩 과제**: Monaco 에디터, 4개 언어(Python/JS/C/Java) 서버 사이드 실행, OJ 판정(AC/WA/TLE/MLE), AI 피드백
- **글쓰기 과제**: TipTap 리치 텍스트 에디터(슬래시 명령 16종, Excalidraw 드로잉, KaTeX 수식), AI가 논리 구조·표현력·주제 적합도·복붙 분석까지 다차원 피드백
- **퀴즈 과제**: 객관식/단답형/서술형 자동 채점, AI 자동 문제 생성

### 2. AI 기반 학습 분석 (11가지)

| AI 기능 | 설명 |
|---------|------|
| AI 자동 채점 및 피드백 | 코딩/글쓰기 모두 SSE 스트리밍으로 실시간 다차원 분석 |
| 소크라테스식 AI 튜터 | 답을 주지 않고 질문으로 사고를 유도하는 교육적 AI |
| 코드 복붙 감지 | 외부 복사-붙여넣기 라인별 비율 자동 계산, AI 피드백 반영 |
| 노트 갭 분석 | 강의 목표 대비 이해도 점수(0-100), 놓친 개념 진단 |
| AI 노트 다듬기 | 학생 노트의 구조/서식 개선 (AI 수정 구간 자동 마킹) |
| AI 과제 자동 생성 | 주제+난이도 입력 → 5문제+테스트케이스 자동 생성 |
| 주간 학습 리포트 | 한 주간 활동 요약, 약점 노트 선별, AI 조언 |
| AI 클래스 인사이트 | 교수 대시보드에서 학급 전체 AI 분석 |
| AI 관련 노트 추천 | Jaccard 유사도 기반 관련 노트 5개 추천 |
| AI 정책 시스템 | 과제별 4단계(자유/보통/엄격/시험) + 채점 기준 3단계(순한맛/보통맛/매운맛) |
| 글쓰기 지시문 자동 생성 | AI가 주제에 맞는 작성 방향, 분량 가이드, 평가 기준 생성 |

### 3. 스냅샷 기반 과정 추적

- 코드 작성 과정을 자동 저장 (debouncing, 커서 위치까지 기록)
- 붙여넣기 출처 추적 (internal/external 구분, 내용·시각 기록)
- 교수가 스냅샷 간 코드 diff를 시각적으로 비교
- **"AI가 결과가 아닌 과정을 분석합니다"** — 이것의 기술적 구현

### 4. Obsidian 스타일 지식 그래프

- force-directed 알고리즘 기반 인터랙티브 노트 그래프
- 노트 간 태그/키워드 관계 자동 분석, 3종 관계 유형 (parent/link/similar)
- `[[]]` 스타일 양방향 노트 링크 (Obsidian과 동일)
- AI 이해도 분석과 결합 — 학습 갭을 시각적으로 진단

### 5. 시험 감독 시스템 (Proctoring)

- 전체화면 이탈 감지 + 탭 전환 추적 + 윈도우 포커스 손실 감지
- 스크린샷 Cloudflare R2 자동 저장, Presigned URL로 교수만 열람
- 위반 카운트 기반 자동 종료
- 교수 리셋 행위까지 감사 로그 기록 (양방향 감사 추적)

### 6. 게임화 시스템

- 24단계 EXP/티어 시스템 (씨앗 → 새싹 → 나무 → 꽃 → 열매 → 숲)
- 55개 시각 이펙트 (배경, 패턴, 텍스트, 커서, 애니메이션 등 10개 카테고리)
- 3단계 테마 에디터 (GUI 색상 피커 / JSON import·export / 커스텀 CSS)
- CSS injection 방지 (68개 변수 화이트리스트, 보안 패턴 차단)

### 7. 다중 역할 시스템

- **교강사**: 과제 생성, AI 정책 설정, 학생 분석 대시보드, 이해도 갭 자동 감지
- **학생**: 과제 풀이, AI 피드백, 소크라테스 AI 튜터, 학습 대시보드
- **개인 학습**: 교수 없이 혼자 AI 과제 생성/풀이/피드백 (Duolingo + LMS 하이브리드)
- 동일 계정으로 역할 자유 전환 가능

---

## 기술 스택

| 계층 | 기술 | 상세 |
|------|------|------|
| **프론트엔드** | React 19.2.4 | TypeScript, Vite 8.0.1, 21개 페이지 (24,548 LOC) |
| | 상태 관리 | Zustand 5.0.12 (4개 글로벌 스토어) |
| | 에디터 | TipTap 3.22.2 (10+ 커스텀 확장, 슬래시 명령 16종), Monaco Editor 4.7.0 |
| | 시각화 | React Force Graph 2D (지식 그래프), Recharts 3.8.1 (대시보드), Blockly (블록 코딩) |
| | 스타일 | CSS 변수 디자인 시스템, 55개 이펙트 엔진 |
| **백엔드** | FastAPI 0.115.0 | Uvicorn, 13개 모듈, 89개 API 엔드포인트 |
| | AI | Google Gemini (2.5/2.0/1.5 Flash 3단계 폴백), JSON mode |
| | 데이터베이스 | Supabase (PostgreSQL), 16개 테이블, RLS 보안 |
| | 파일 저장 | Cloudflare R2 (S3 호환, 시험 스크린샷) |
| | 코드 실행 | subprocess + CPU 격리 + 타임아웃 관리 + 보안 패턴 차단 |
| **배포** | 컨테이너 | Docker, docker-compose |
| | 웹 서버 | Nginx (리버스 프록시, SSL) |
| | 서버 | AWS EC2 (Ubuntu) |

---

## 아키텍처 개요

### 백엔드 모듈 구조 (13개)

```
backend/modules/
├── auth/          # Google OAuth + Admin 인증, HMAC 타이밍 공격 방어
├── courses/       # 강좌 CRUD, 수강 관리
├── assignments/   # 과제 관리, AI 자동 생성 (코딩/글쓰기/퀴즈)
├── editor/        # 코드 스냅샷, 붙여넣기 추적
├── analysis/      # AI 피드백 (SSE 스트리밍), 복붙 분석
├── tutor/         # 소크라테스식 AI 튜터
├── notes/         # 노트 CRUD, AI 갭 분석, 지식 그래프, AI 다듬기
├── dashboard/     # 교수 대시보드, 이해도 갭 분석, AI 인사이트
├── proctor/       # 시험 감독 (스크린샷, 위반, 감사 로그)
├── runner/        # 코드 실행 (Python/JS/C/Java), OJ 판정
├── agents/        # 학생/교수용 AI 에이전트, 주간 리포트
├── gamification/  # EXP, 뱃지, 티어 시스템
└── materials/     # 강의 자료 관리
```

### 프론트엔드 (21개 페이지)

주요 페이지: Landing, ProfessorHome, StudentHome, PersonalHome, AssignmentDetail, CodeEditor, WritingEditor, QuizEditor, NoteEditor, NoteGraph, Dashboard, StudentDetail, Settings 등

### TipTap 커스텀 확장

SlashCommand, SubNote, NoteLink(`[[]]`), Excalidraw, Math(KaTeX), AIPolished, Callout, BlockHandle, Toggle 등 — Notion + Obsidian + Overleaf 기능을 교육 특화 에디터로 통합

### 데이터베이스 (16개 테이블)

users, courses, enrollments, assignments, submissions, snapshots, ai_analyses, notes, course_materials, user_exp, badges, user_badges, judge_results, ai_comments, exam_screenshots, exam_violations

---

## 개발 타임라인

| 기간 | 단계 | 주요 성과 |
|------|------|---------|
| 3/23~25 | 팀 셋업 | 프로젝트 구조, 컨벤션, PR/이슈 템플릿 |
| 3/25~4/7 | 기획/설계 | 7종 설계 문서 (PRD, SRS, TDD, API, ERD, UI/UX, INFRA) |
| 4/8 | 핵심 구현 | 전체 애플리케이션 구현 — 133파일, 29,747줄 |
| 4/9 오전 | 고급 기능 | 시험 감독, OJ, 게이미피케이션 — 55파일, 6,818줄 |
| 4/9 오후 | 확장 기능 | 커스텀 테마, AI 폴백, 퀴즈, 블록코딩, 55개 이펙트 — 8,031줄 |
| 4/9~ | 안정화 | 버그 수정, 배포, 문서화 |

> **실질 코딩: 26시간, 39,000줄** — AI 바이브코딩의 생산성을 직접 증명합니다.

---

## 실행 방법

### 로컬 개발 환경

**사전 요구사항**: Node.js 18+, Python 3.9+, Supabase 계정, Google Gemini API 키, Cloudflare R2 자격증명

```bash
# 레포지토리 클론
git clone https://github.com/namgyumo/Pikabuddy.git
cd Pikabuddy

# 프론트엔드
cd frontend
npm install
npm run dev  # http://localhost:5173

# 백엔드 (새 터미널)
cd backend
pip install -r requirements.txt
cp .env.example .env  # 환경 변수 설정 후
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 환경 변수 (backend/.env)

```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
GEMINI_API_KEY=your_gemini_key
AWS_ACCOUNT_ID=your_r2_account_id
AWS_ACCESS_KEY_ID=your_r2_access_key
AWS_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=your_bucket_name
CORS_ORIGINS=http://localhost:5173
```

### Docker 배포

```bash
docker-compose up --build
# http://localhost (Nginx 리버스 프록시)
```

---

## 프로젝트 구조

```
Pikabuddy/
├── frontend/
│   └── src/
│       ├── pages/          # 21개 페이지
│       ├── components/     # 재사용 컴포넌트
│       ├── store/          # Zustand (auth, course, theme, tutorial)
│       ├── lib/            # TipTap 확장, 유틸리티
│       ├── types/          # TypeScript 타입 정의
│       └── themes/effects/ # 55개 시각 이펙트 엔진
├── backend/
│   ├── main.py
│   ├── config/settings.py
│   ├── modules/            # 13개 API 모듈
│   └── requirements.txt
├── supabase/
│   └── schema.sql          # 16개 테이블
├── tests/
│   └── test_api.py         # 28개 API 테스트
├── nginx/
│   └── nginx.conf
├── docs/
│   └── CONVENTION.md
├── 01_PRD.docx ~ 07_INFRA.docx  # 7종 설계 문서
├── docker-compose.yml
└── README.md
```

---

## 팀 구성

| 이름 | 역할 | 담당 영역 |
|------|------|---------|
| 남규모 | 프론트엔드 / 배포 | React UI, AWS EC2 배포, CI/CD, Cloudflare 설정 |
| 박계령 | 백엔드 | FastAPI API 개발, AI 통합, Supabase 설계 |
| 이주현 | 프론트엔드 | React 페이지 개발, TipTap 에디터 커스텀, UI/UX |
| 주인경 | 백엔드 | 코드 실행 엔진, 시험 감독 시스템, 최적화 |

---

## 주요 설계 특징

### AI 모델 3단계 폴백
gemini-2.5-flash → gemini-2.0-flash → gemini-1.5-flash (503 과부하 시 자동 전환, 무료 API 고가용성)

### 과정 기반 평가
최종 결과가 아닌 코드 스냅샷 + 붙여넣기 추적 + diff 비교로 학생의 사고 과정 분석

### 이해도 갭 분석
코드 점수 vs 노트 이해도 점수의 이중 축 평가 — 갭 > 30이면 위험 학생 자동 플래깅

### SSE 실시간 스트리밍
AI 분석, 튜터 응답, 주간 리포트를 실시간으로 전달

### 보안
- Supabase RLS (Row Level Security) 전 테이블 적용
- Google OAuth + Admin 인증 분리 (HMAC 타이밍 공격 방어)
- CSS injection 방지 (68개 변수 화이트리스트)
- 코드 실행 샌드박스 (CPU 격리, 보안 패턴 차단)

---

## 개발 워크플로우

### 브랜치 전략
- `main`: 배포용 (직접 push 금지)
- `develop`: 개발 통합
- `feature/기능명`: 기능 개발

### 커밋 규칙
`feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

---

## 라이선스

MIT License
