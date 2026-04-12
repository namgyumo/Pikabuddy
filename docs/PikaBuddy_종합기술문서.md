# PikaBuddy AI 교육 플랫폼 — 종합 기술 문서

> **프로젝트:** PikaBuddy (피카버디)  
> **버전:** 1.0  
> **작성일:** 2026-04-12  
> **총 분량:** 5,890줄 | 7개 섹션  

---

## 목차

| # | 섹션 | 설명 |
|---|------|------|
| 1 | [PRD — 제품 요구사항 정의서](#1-prd--제품-요구사항-정의서) | 프로젝트 비전, 핵심 기능, 사용자 시나리오 |
| 2 | [SRS — 소프트웨어 요구사항 명세서](#2-srs--소프트웨어-요구사항-명세서) | 기능/비기능 요구사항, 외부 인터페이스 |
| 3 | [TDD — 기술 설계 문서](#3-tdd--기술-설계-문서) | 시스템 아키텍처, 컴포넌트 설계 |
| 4 | [API — API 명세서](#4-api--api-명세서) | 135+ 엔드포인트 상세 |
| 5 | [ERD — 데이터베이스 설계서](#5-erd--데이터베이스-설계서) | 27 테이블, 인덱스, 관계 |
| 6 | [UI/UX — 사용자 인터페이스 설계서](#6-uiux--사용자-인터페이스-설계서) | 27 페이지, 컴포넌트, 테마 |
| 7 | [INFRA — 인프라 및 배포 문서](#7-infra--인프라-및-배포-문서) | Docker, Nginx, CI/CD, 모니터링 |

---


# 1. PRD — 제품 요구사항 정의서


작성일: 2026-04-12  
버전: 1.0  
작성자: PikaBuddy 개발팀

---

### 1. 프로젝트 개요

#### 1.1 프로젝트명

**PikaBuddy** — AI 기반 과정 분석 교육 플랫폼

#### 1.2 프로젝트 비전

> "학생의 학습 **과정**을 AI가 실시간으로 분석하여, 결과물만이 아닌 **사고의 흐름**까지 이해하고 피드백하는 차세대 교육 플랫폼"

기존 교육 플랫폼이 최종 결과물(제출물)만을 평가하는 데 반해, PikaBuddy는 학생이 코드를 작성하고, 글을 쓰고, 노트를 정리하는 **모든 과정**을 스냅샷으로 기록하고 AI가 분석합니다. 교수는 학생의 사고 과정을 투명하게 파악할 수 있고, 학생은 AI 튜터의 실시간 피드백을 통해 자기주도 학습 역량을 키울 수 있습니다.

#### 1.3 프로젝트 배경

- **문제점 1**: 기존 LMS(Learning Management System)는 최종 결과물만 수집하여, 학생이 어디서 막혔는지, 어떤 사고 과정을 거쳤는지 파악 불가
- **문제점 2**: AI 도구(ChatGPT 등)의 무분별한 사용으로 학생의 실제 학습 여부를 검증하기 어려움
- **문제점 3**: 대규모 강의에서 교수가 개별 학생에게 맞춤형 피드백을 제공하기 어려움
- **문제점 4**: 시험 환경에서의 부정행위 감시가 수동적이고 비효율적

#### 1.4 핵심 가치 제안 (Value Proposition)

| 대상 | 가치 |
|------|------|
| **학생** | AI 튜터의 실시간 피드백, 자동 학습 분석, 게이미피케이션을 통한 동기 부여 |
| **교수** | 학생별 학습 과정 투명화, AI 기반 자동 채점/분석, 부정행위 자동 감지 |
| **개인 학습자** | 별도 강의 없이 개인 과제를 생성하고 AI 피드백을 받을 수 있는 셀프 학습 환경 |

---

### 2. 대상 사용자 (Target Users)

#### 2.1 사용자 역할 (Roles)

| 역할 | 영문 | 설명 |
|------|------|------|
| **교수** | professor | 강의 생성, 과제 출제, 학생 분석 대시보드 열람, 시험 감독, 팀 관리 |
| **학생** | student | 강의 참가, 과제 수행(코딩/글쓰기/퀴즈), 노트 작성, 메신저, 팀 활동 |
| **개인 학습자** | personal | 자기 주도 학습용 개인 강의·과제 생성, AI 분석 활용 |

#### 2.2 사용자 시나리오

##### 시나리오 1: 대학교 프로그래밍 수업

1. 교수가 PikaBuddy에 "자료구조" 강의를 개설하고 초대 코드를 공유
2. 학생들이 초대 코드로 강의에 참가
3. 교수가 "이진 탐색 트리 구현" 코딩 과제를 출제 (Python, algorithm 타입)
4. 학생들이 코드 에디터에서 코드를 작성 — 모든 키스트로크, 붙여넣기, 커서 이동이 스냅샷으로 기록
5. AI가 실시간으로 코드 품질, 로직 분석, 표절 의심 여부를 분석
6. 학생은 AI 튜터에게 힌트를 요청 (AI 정책에 따라 제한)
7. 교수는 대시보드에서 학급 전체의 진행 상황, 위험군 학생, 평균 점수를 확인
8. 교수는 개별 학생의 코드 작성 과정(스냅샷 diff)을 시간순으로 확인

##### 시나리오 2: 글쓰기 수업 + 시험 모드

1. 교수가 "논술 시험" 글쓰기 과제를 시험 모드(exam_mode)로 출제
2. 학생이 과제에 진입하면 전체화면 강제, 탭 전환 감시 시작
3. 일정 주기로 학생 화면 스크린샷이 R2에 저장
4. 탭 전환, 전체화면 이탈 등 위반 행위가 자동 기록
5. 위반 횟수 초과 시 시험 자동 종료
6. 교수는 시험 후 스크린샷 타임라인과 위반 로그를 열람

##### 시나리오 3: 조별 과제 + 투표 제출

1. 교수가 팀을 구성하고 팀 과제를 출제
2. 팀원 A가 코드를 완성하고 "제출 투표"를 시작
3. 모든 팀원에게 투표 요청이 전달됨
4. 만장일치 승인 → 팀 전원의 제출물이 자동 생성
5. 만장일치 거부 → 재투표 가능
6. 10분 내 미투표 → 투표한 인원 기준 과반수로 결정

##### 시나리오 4: 개인 학습자

1. 사용자가 "personal" 역할로 가입
2. 자동 생성된 "내 학습" 강의에서 자유롭게 과제 생성
3. AI 분석, 노트, 지식 그래프 등 모든 기능을 개인적으로 활용

---

### 3. 핵심 기능 (Core Features)

#### 3.1 기능 목록 총괄

| # | 기능 | 설명 | 대상 역할 |
|---|------|------|-----------|
| F-01 | 코딩 과제 시스템 | Monaco 에디터 기반 코드 작성, 9개 언어 실행, 알고리즘 채점 | 교수, 학생, 개인 |
| F-02 | 글쓰기 과제 시스템 | Tiptap 리치 텍스트 에디터 기반 글쓰기, AI 분석 | 교수, 학생, 개인 |
| F-03 | 퀴즈/시험 시스템 | 객관식·주관식 자동 채점, 시험 감독(Proctoring) | 교수, 학생 |
| F-04 | AI 학습 분석 | Gemini AI 기반 코드/글 분석, 점수화, 피드백 스트리밍 | 전체 |
| F-05 | AI 튜터 챗봇 | SSE 스트리밍 대화, AI 정책별 응답 제한, 세션 관리 | 학생, 개인 |
| F-06 | 노트 시스템 | Tiptap 10개 확장, 수식, 그림, 코드블록, 서브노트, 협업 | 전체 |
| F-07 | 지식 그래프 | 노트 관계 시각화 (parent/link/similar), 임베딩 유사도 | 전체 |
| F-08 | 게이미피케이션 | 경험치, 티어(11단계), 뱃지, 시각 이펙트(55종) | 전체 |
| F-09 | 메신저 | 강의 내 1:1 DM, 실시간 읽음 확인, 미읽 카운트 | 교수, 학생 |
| F-10 | 팀 관리 + 투표 | 팀 생성/편집, 팀원 관리, 제출 투표 시스템 | 교수, 학생 |
| F-11 | 교수 대시보드 | 학급 분석, 학생별 상세, AI 인사이트 | 교수 |
| F-12 | 시험 감독 (Proctoring) | 스크린샷 캡처, 위반 감지, 전체화면 강제 | 교수, 학생 |
| F-13 | 캘린더 + 할일 | 개인 일정 관리, 과제 마감일 연동 | 학생 |
| F-14 | 테마 + 시각 이펙트 | 커스텀 테마, 55종 배경/UI 이펙트, 마스코트 | 전체 |
| F-15 | 교수자료 관리 | Cloudflare R2 파일 업로드/다운로드 | 교수 |
| F-16 | 알림 시스템 | Supabase Realtime 기반 실시간 알림, 미읽 뱃지 | 전체 |

---

#### 3.2 기능 상세

##### F-01: 코딩 과제 시스템

**목적**: 학생이 웹 브라우저에서 코드를 작성하고 실행하며, 모든 과정을 기록

**세부 기능**:
- Monaco 코드 에디터 (VS Code 핵심 엔진)
- **9개 프로그래밍 언어 지원**: Python, JavaScript, C, C++, Java, C#, Swift, Rust, Go
- 코드 실행 결과 즉시 확인 (stdin/stdout)
- **알고리즘 채점(Judge) 모드**: 테스트케이스 기반 자동 채점, 통과/실패/시간초과/런타임에러 판정
- **스냅샷 자동 저장**: 30초 간격 + 코드 변경 시 자동 저장
- **붙여넣기 감지**: 외부/내부 붙여넣기 구분, 소스 기록
- 문제별 독립 코드 작성 (멀티 프로블럼)
- AI 정책에 따른 튜터 접근 제한

**AI 정책별 동작**:

| 정책 | 설명 |
|------|------|
| `free` | AI 튜터 자유 사용, 전체 코드 공유 가능 |
| `normal` | 힌트 수준 답변만 제공, 직접적 코드 생성 제한 |
| `strict` | 개념 설명만 가능, 코드 관련 답변 차단 |
| `exam` | AI 튜터 완전 차단, 시험 감독 모드 활성화 |

**언어별 실행 환경**:

| 언어 | 컴파일러/런타임 | 시간 배율 |
|------|---------------|-----------|
| Python | python3 | 1.5x |
| JavaScript | node | 1.5x |
| C | gcc | 1.0x |
| C++ | g++ | 1.0x |
| Java | javac + java | 2.0x |
| C# | mcs + mono | 2.0x |
| Swift | swift | 1.5x |
| Rust | rustc | 1.0x |
| Go | go run | 1.5x |

---

##### F-02: 글쓰기 과제 시스템

**목적**: Tiptap 리치 텍스트 에디터에서 글쓰기 과제 수행, AI가 글쓰기 과정과 결과를 분석

**세부 기능**:
- Tiptap 에디터 (Heading, Bold, Italic, Underline, Strike, BulletList, OrderedList, CodeBlock, Blockquote, Link 등)
- 교수가 작성 지침(writing_prompt) 제공
- 자동 저장 (30초 간격)
- 스냅샷: Tiptap JSON → code_diff 필드에 저장
- AI 분석: 글의 구조, 논리, 표현력, 독창성 평가
- 제출 후 AI 피드백 스트리밍

---

##### F-03: 퀴즈/시험 시스템

**목적**: 객관식·주관식 문제 자동 채점 및 시험 감독

**세부 기능**:
- 교수가 문제 목록을 JSON 형태로 정의
- 객관식: 정답 자동 비교
- 주관식: AI가 루브릭 기반 채점
- 시험 모드(exam_mode) 연동
- 시간 제한(due_date) 설정 가능

---

##### F-04: AI 학습 분석

**목적**: Gemini AI가 학생의 제출물을 다각도로 분석하여 교수와 학생에게 인사이트 제공

**세부 기능**:
- **코딩 분석**: 코드 품질, 로직 흐름, 효율성, 컨벤션 준수 여부
- **글쓰기 분석**: 구조, 논리적 일관성, 표현력, 독창성
- **점수화**: 루브릭 기반 0-100점 자동 채점
- **피드백 스트리밍**: SSE(Server-Sent Events)로 실시간 피드백 전달
- **붙여넣기 분석**: 스냅샷 기반 외부 코드 복사 비율 계산
- **학습 갭 분석**: 노트 내용 기반 이해도 측정, 취약 영역 도출

**AI 모델 폴백 체인**:

```
gemini-2.5-flash-preview-04-17
  → gemini-2.0-flash
    → gemini-1.5-flash
```

모든 AI 호출은 3단계 폴백을 거치며, 각 단계에서 실패 시 다음 모델로 자동 전환. 토큰 사용량은 별도 추적(`/api/token-stats`).

---

##### F-05: AI 튜터 챗봇

**목적**: 학생이 과제를 수행하면서 실시간으로 AI에게 질문하고 도움을 받음

**세부 기능**:
- SSE 스트리밍으로 응답 실시간 표시
- AI 정책(ai_policy)에 따른 응답 수준 제한
- 대화 세션 관리 (세션 시작/이력 조회/초기화)
- 코드 컨텍스트 자동 포함 (현재 작성 중인 코드 전달)
- 과제별 독립 세션

**에이전트 시스템** (별도 모듈):
- 학생용 에이전트: 과제 도움, 학습 상담
- 교수용 에이전트: 학급 분석 요약, 과제 설계 도움

---

##### F-06: 노트 시스템

**목적**: 학생이 강의 노트를 작성하고, AI가 이해도를 분석하며, 교수가 열람·코멘트

**세부 기능**:
- **Tiptap 확장 10종**:

| 확장 | 설명 |
|------|------|
| SlashCommand | "/" 입력 시 블록 삽입 메뉴 |
| BlockHandle | 블록 드래그·삽입·삭제 핸들 |
| Callout | 강조 박스 (info/warning/tip/danger) |
| Toggle | 접기/펼치기 토글 블록 |
| Math (KaTeX) | 수학 수식 렌더링 |
| Excalidraw | 인라인 드로잉 캔버스 |
| NoteLinkExtension | 다른 노트로의 하이퍼링크 |
| SubNoteExtension | 서브노트 생성·포함 |
| CitationExtension | 인용 표시 |
| AIPolishedExtension | AI 다듬기 결과 하이라이트 |

- **노트 스냅샷**: 수동 저장 포인트, 타임라인 복원
- **AI 다듬기(Polish)**: 선택 텍스트를 AI가 다듬어 제안
- **AI 질문(Ask)**: 노트 내용 기반으로 AI에게 질문
- **갭 분석**: 노트 이해도 점수 산출 (0-100)
- **카테고리 자동 분류**: AI가 노트 내용을 분석하여 카테고리 태깅
- **교수 코멘트**: 블록 단위 코멘트, 스레드 답글, 해결(resolve) 기능
- **팀 노트**: 팀원 공동 노트 작성 (team_id 연결)
- **서브노트 트리**: 부모-자식 관계 기반 노트 계층 구조

---

##### F-07: 지식 그래프

**목적**: 학생의 노트 관계를 시각적 그래프로 표현하여 지식 구조를 한눈에 파악

**세부 기능**:
- **react-force-graph-2d** + **d3-force** 기반 인터랙티브 그래프
- **3가지 엣지 타입**:
  - `parent`: 부모-자식 노트 관계
  - `link`: 수동 링크 (NoteLinkExtension, note_manual_links)
  - `similar`: AI 임베딩 기반 유사도 (코사인 유사도 > 임계값)
- **노드 크기**: 콘텐츠 길이 비례
- **노드 색상**: 이해도 점수 기반 (빨강 → 주황 → 초록)
- **필터링**: 검색, 카테고리, 이해도 범위 슬라이더
- **강의별 그래프** (`/courses/:courseId/graph`) + **통합 그래프** (`/all-notes/graph`)
- **학습 경로(Study Path)**: AI가 추천하는 학습 순서
- **주간 리포트(Weekly Report)**: 학습 진행 상황 요약

---

##### F-08: 게이미피케이션

**목적**: 학습 동기 부여를 위한 경험치·티어·뱃지·시각 이펙트 시스템

**티어 체계 (11단계)**:

| 레벨 | 티어명 | 필요 EXP | 이펙트 |
|------|--------|----------|--------|
| 1 | Seed IV | 0 | 기본 |
| 2 | Seed III | 100 | 기본 |
| 3 | Seed II | 250 | 기본 |
| 4 | Seed I | 500 | 기본 |
| 5 | Sprout III | 1,000 | 배경 이펙트 해금 |
| 6 | Sprout II | 2,000 | 추가 이펙트 |
| 7 | Sprout I | 3,500 | 추가 이펙트 |
| 8 | Bloom III | 5,500 | 프리미엄 이펙트 |
| 9 | Bloom II | 8,000 | 프리미엄 이펙트 |
| 10 | Bloom I | 12,000 | 최고급 이펙트 |
| 11 | Fruit | 20,000 | 전체 해금 |

**시각 이펙트 (55종, 10카테고리)**:
- Background(배경), Pattern(패턴), Animation(애니메이션), UI, Gamification, Mascot 등
- Canvas 기반 파티클, CSS 패턴, SVG 마스코트 등

**뱃지 시스템**:
- 과제 완료, 노트 작성, 연속 로그인 등 조건별 자동 수여
- 프로필에 획득 뱃지 표시

---

##### F-09: 메신저

**목적**: 강의 참여자 간 1:1 다이렉트 메시지 소통

**세부 기능**:
- 강의별 대화 상대 목록 (교수 ↔ 학생, 학생 ↔ 학생)
- 실시간 메시지 전송/수신 (Supabase Realtime)
- 읽음 확인 (is_read)
- 미읽 메시지 카운트 뱃지
- 프로필 클릭으로 DM 바로 시작
- 사이드바 메신저 바로가기

---

##### F-10: 팀 관리 + 제출 투표

**목적**: 조별 과제 운영 및 민주적 제출 결정

**세부 기능**:
- 교수가 팀 생성 및 멤버 할당
- 팀 노트 공동 작성
- 팀 과제 제출 시 투표 시스템:
  - 투표 발의 → 팀원 전원에게 통보
  - 승인/거부 투표
  - 만장일치 승인 → 즉시 전원 제출
  - 만장일치 거부 → 재투표 가능
  - 10분 데드라인 → 과반수 결정
  - 데드라인 지남 → 투표 참여자 중 과반수로 결정

---

##### F-11: 교수 대시보드

**목적**: 학급 전체와 개별 학생의 학습 상태를 한눈에 파악

**세부 기능**:
- 학급 개요: 평균 점수, 위험군 학생 수, 전체 현황
- 학생별 상세: 과제 점수 추이, 붙여넣기 비율, 이해도, 제출 횟수
- AI 인사이트: 학급 전체에 대한 AI 분석 요약
- 학생 노트 열람: 교수가 학생 노트를 읽고 블록 단위 코멘트 작성

---

##### F-12: 시험 감독 (Proctoring)

**목적**: 온라인 시험의 공정성 확보

**세부 기능**:
- 전체화면 강제 (fullscreen_required)
- 주기적 스크린샷 캡처 (configurable interval, 기본 60초)
- Cloudflare R2에 스크린샷 저장
- 위반 행위 자동 감지:
  - `fullscreen_exit`: 전체화면 이탈
  - `tab_switch`: 탭 전환
  - `window_blur`: 창 포커스 이탈
  - `forced_end`: 위반 초과로 강제 종료
- 최대 위반 횟수 초과 시 자동 시험 종료
- 교수용: 스크린샷 타임라인, 위반 로그 열람, 시험 리셋

---

##### F-13: 캘린더 + 할일

**목적**: 학생의 일정 관리 및 과제 마감일 추적

**세부 기능**:
- 개인 이벤트 CRUD
- 과제 마감일 자동 연동
- 월간/주간 캘린더 뷰
- 오늘의 할일 목록 (투두)

---

##### F-14: 테마 + 시각 이펙트

**목적**: 사용자 맞춤형 UI 커스터마이징으로 학습 환경 개인화

**세부 기능**:
- **프리셋 테마**: 다양한 기본 테마 제공
- **커스텀 테마 에디터**: CSS 변수 기반 색상/폰트/간격 자유 편집
- **55종 시각 이펙트**: 배경 파티클, 패턴, UI 애니메이션, 마스코트
- 이펙트 조합: 여러 이펙트를 동시에 활성화
- 티어에 따른 이펙트 해금
- 그래프 페이지 전용 테마 호환

---

##### F-15: 교수자료 관리

**목적**: 강의 자료 업로드 및 학생에게 배포

**세부 기능**:
- Cloudflare R2 기반 파일 스토리지
- 파일 업로드 (50MB 제한)
- 파일 목록 조회 및 다운로드
- 파일 삭제 (교수만)

---

##### F-16: 알림 시스템

**목적**: 실시간 이벤트 알림으로 사용자 참여 유도

**세부 기능**:
- Supabase Realtime 구독 기반 실시간 알림
- 알림 유형: 코멘트, 메시지, 과제 피드백, 팀 투표 등
- 미읽 알림 뱃지 (AppShell 상단)
- 강의별 최근 알림 조회
- 읽음 처리

---

### 4. 비기능 요구사항 (Non-Functional Requirements)

#### 4.1 성능

| 항목 | 목표 |
|------|------|
| 페이지 초기 로드 | < 3초 (Lazy Loading 적용) |
| API 응답 시간 | < 500ms (일반 CRUD) |
| AI 분석 응답 | SSE 스트리밍 (첫 토큰 < 2초) |
| 동시 접속자 | 100+ (uvicorn 3 workers + limit-concurrency) |
| 코드 실행 타임아웃 | 기본 5초 (언어별 배율 적용) |

#### 4.2 보안

| 항목 | 구현 |
|------|------|
| 인증 | Google OAuth 2.0 + Supabase Auth |
| 인가 | 역할 기반 접근 제어 (professor/student/personal) |
| 데이터 보호 | PostgreSQL RLS (Row Level Security) |
| 코드 실행 샌드박스 | Docker 컨테이너 내 subprocess, 위험 패턴 차단 |
| CORS | 허용 도메인 명시적 설정 |
| 파일 업로드 | 50MB 제한, MIME 타입 검증 |
| 환경 변수 | .env 파일로 민감 정보 관리 |

#### 4.3 확장성

| 항목 | 전략 |
|------|------|
| 프론트엔드 | React Lazy Loading, 코드 분할 |
| 백엔드 | FastAPI 모듈 구조 (21개 독립 모듈) |
| 데이터베이스 | Supabase 클라우드 (자동 스케일링) |
| 파일 스토리지 | Cloudflare R2 (S3 호환, 글로벌 CDN) |
| AI | 3단계 모델 폴백 체인 |

#### 4.4 가용성

| 항목 | 전략 |
|------|------|
| 프론트엔드 | Cloudflare CDN 정적 호스팅 |
| 백엔드 | Docker 컨테이너 + Nginx 리버스 프록시 |
| 데이터베이스 | Supabase 관리형 PostgreSQL |
| 모니터링 | 추후 구현 예정 |

---

### 5. 기술 스택 요약

| 영역 | 기술 |
|------|------|
| **프론트엔드** | React 19, TypeScript, Vite, Zustand, Tiptap, Monaco Editor, react-force-graph-2d |
| **백엔드** | Python 3.12, FastAPI 0.115.0, Uvicorn, Pydantic |
| **데이터베이스** | PostgreSQL (Supabase), 29개 테이블, RLS |
| **AI** | Google Gemini (2.5/2.0/1.5 Flash), Embeddings |
| **파일 스토리지** | Cloudflare R2 (boto3) |
| **실시간** | SSE (sse-starlette), Supabase Realtime |
| **인증** | Google OAuth 2.0, Supabase Auth |
| **배포** | Docker, Nginx, AWS EC2 |
| **CDN** | Cloudflare |

---

### 6. 성공 지표 (Success Metrics)

| 지표 | 측정 방법 | 목표값 |
|------|-----------|--------|
| 과제 제출률 | 제출물 / 수강생 × 과제 수 | > 80% |
| AI 분석 완료율 | 분석 완료 / 제출물 수 | > 95% |
| 평균 노트 작성 수 | 총 노트 / 학생 수 | > 5개/학생 |
| AI 튜터 사용률 | 튜터 세션 수 / 학생 수 | > 50% |
| 교수 대시보드 조회율 | 대시보드 방문 / 과제 수 | > 70% |
| 부정행위 탐지율 | 감지 위반 / 실제 위반 | > 90% |
| 시스템 가용성 | 업타임 | > 99% |

---

### 7. 제약 사항 및 가정

#### 7.1 제약 사항

1. **AI 모델 의존성**: Google Gemini API에 의존하며, API 장애 시 3단계 폴백 적용
2. **코드 실행 보안**: Docker 컨테이너 내에서 실행하지만, 완전한 샌드박스는 아님 (위험 패턴 차단으로 보완)
3. **브라우저 호환성**: Chrome, Edge 등 Chromium 기반 브라우저 최적화 (시험 감독의 전체화면 API 의존)
4. **파일 크기 제한**: 업로드 파일 50MB 이하
5. **실시간 기능**: Supabase Realtime 의존 (WebSocket 연결 필요)

#### 7.2 가정

1. 사용자는 안정적인 인터넷 연결을 가지고 있음
2. Google OAuth 인증을 사용할 수 있는 환경
3. 교수는 과제 유형과 AI 정책을 적절히 설정할 수 있음
4. 학생은 현대적 웹 브라우저(Chrome 90+, Edge 90+, Firefox 90+, Safari 15+) 사용

---

### 8. 릴리스 로드맵

#### Phase 1: Core (완료)
- 인증/인가 시스템
- 강의/과제/제출 CRUD
- 코딩 에디터 + 4개 언어 실행
- AI 분석 + 피드백 스트리밍
- 기본 노트 시스템

#### Phase 2: Enhanced (완료)
- 글쓰기/퀴즈 과제 시스템
- 시험 감독 (Proctoring)
- AI 튜터 챗봇
- 교수 대시보드
- 게이미피케이션 기본

#### Phase 3: Collaboration (완료)
- 메신저 (1:1 DM)
- 팀 관리 + 제출 투표
- 노트 코멘트 시스템
- 알림 시스템 (Realtime)
- 지식 그래프 (강의별 + 통합)

#### Phase 4: Polish (완료)
- 5개 추가 언어 (C++, C#, Swift, Rust, Go)
- 55종 시각 이펙트
- 커스텀 테마 에디터
- 멀티페인 워크스페이스
- 캘린더 + 할일
- 프로필 시스템
- Nginx gzip/keepalive 최적화

#### Phase 5: Scale (예정)
- CI/CD 파이프라인
- 모니터링 + 로깅
- 인스턴스 스케일링
- 사용자 피드백 반영

---

### 9. 용어 정의

| 용어 | 정의 |
|------|------|
| **스냅샷** | 학생의 코드/글 작성 과정을 특정 시점에 캡처한 기록 |
| **AI 정책** | 과제별로 AI 튜터의 도움 수준을 제어하는 설정 (free/normal/strict/exam) |
| **갭 분석** | AI가 노트 내용을 분석하여 학생의 이해도 부족 영역을 식별하는 과정 |
| **임베딩 유사도** | AI가 텍스트를 벡터로 변환하여 노트 간 의미적 유사성을 계산하는 방법 |
| **RLS** | Row Level Security. 데이터베이스 행 수준의 접근 제어 |
| **SSE** | Server-Sent Events. 서버에서 클라이언트로 실시간 데이터를 스트리밍하는 프로토콜 |
| **프록터링** | 시험 감독. 스크린샷 캡처와 위반 감지를 통한 온라인 시험 감시 |
| **루브릭** | 채점 기준표. AI가 이를 기반으로 점수를 산출 |
| **폴백** | 주 서비스 실패 시 대체 서비스로 자동 전환하는 메커니즘 |

---

*이 문서는 PikaBuddy 프로젝트의 제품 요구사항을 정의합니다. 기술적 구현 세부사항은 03_TDD.md (Technical Design Document)를, API 상세는 04_API.md를 참조하세요.*


---


# 2. SRS — 소프트웨어 요구사항 명세서


작성일: 2026-04-12  
버전: 1.0  
작성자: PikaBuddy 개발팀

---

### 1. 소개

#### 1.1 목적

본 문서는 PikaBuddy AI 교육 플랫폼의 소프트웨어 요구사항을 정의합니다. 기능 요구사항, 비기능 요구사항, 외부 인터페이스 요구사항, 시스템 제약 조건을 포함합니다.

#### 1.2 범위

PikaBuddy는 웹 기반 AI 교육 플랫폼으로, 다음을 포함합니다:
- **프론트엔드**: React 19 SPA (Single Page Application)
- **백엔드**: FastAPI RESTful API 서버
- **데이터베이스**: PostgreSQL (Supabase 관리형)
- **AI 서비스**: Google Gemini API
- **파일 스토리지**: Cloudflare R2
- **CDN/호스팅**: Cloudflare (프론트엔드), AWS EC2 (백엔드)

#### 1.3 참조 문서

| 문서 | 파일 |
|------|------|
| Product Requirements Document | `docs/01_PRD.md` |
| Technical Design Document | `docs/03_TDD.md` |
| API Specification | `docs/04_API.md` |
| Entity Relationship Diagram | `docs/05_ERD.md` |

---

### 2. 전체 설명

#### 2.1 시스템 개요

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

#### 2.2 사용자 분류

| 역할 | 시스템 접근 권한 |
|------|----------------|
| **professor** | 강의/과제 CRUD, 학생 분석, 시험 감독, 팀 관리, 자료 업로드, 학생 노트 열람/코멘트 |
| **student** | 강의 참가, 과제 수행, 노트 작성, 메신저, 팀 활동, 투표 |
| **personal** | 개인 강의/과제 생성, AI 분석, 노트, 그래프 (교수+학생 기능의 개인화 버전) |
| **admin** | `@pikabuddy.admin` 이메일 도메인으로 식별, 모든 역할 접근 가능 |

#### 2.3 운영 환경

| 항목 | 사양 |
|------|------|
| 클라이언트 | Chrome 90+, Edge 90+, Firefox 90+, Safari 15+ |
| 화면 해상도 | 1280×720 이상 권장, 반응형 지원 |
| 인터넷 | 5Mbps 이상 권장 (SSE 스트리밍, 실시간 기능) |
| 서버 OS | Ubuntu 22.04 LTS (Docker) |
| 런타임 | Python 3.12, Node.js 18+ |

---

### 3. 기능 요구사항

#### 3.1 인증/인가 모듈 (AUTH)

##### FR-AUTH-001: Google OAuth 로그인

- **설명**: 사용자가 Google 계정으로 로그인한다
- **입력**: Google OAuth 콜백 (code, state)
- **처리**:
  1. Supabase Auth로 Google OAuth 리디렉트 URL 생성
  2. 콜백에서 access_token을 받아 Supabase에서 사용자 정보 조회
  3. users 테이블에 신규 사용자면 INSERT, 기존이면 name/avatar 업데이트
  4. role이 NULL이면 역할 선택 페이지로 리디렉트
- **출력**: `{ user, access_token, refresh_token }`
- **인가**: 없음 (공개)

##### FR-AUTH-002: 역할 선택

- **설명**: 신규 사용자가 역할(professor/student/personal)을 선택한다
- **입력**: `{ role: "professor" | "student" | "personal" }`
- **처리**:
  1. users 테이블의 role 컬럼 업데이트
  2. personal 선택 시 자동으로 "내 학습" 강의 생성 + 자동 수강 등록
- **출력**: `{ user }` (업데이트된 사용자 정보)
- **인가**: 로그인 필수

##### FR-AUTH-003: 역할 전환

- **설명**: 사용자가 역할을 변경한다
- **입력**: `{ new_role: string }`
- **처리**: role 컬럼 업데이트, personal 전환 시 개인 강의 자동 생성
- **출력**: `{ user }`
- **인가**: 로그인 필수

##### FR-AUTH-004: 프로필 관리

- **설명**: 사용자가 프로필 정보를 수정한다
- **입력**: `{ name, bio, social_links, profile_color, school, department, student_id }`
- **처리**: users 테이블 업데이트
- **출력**: `{ user }`
- **인가**: 로그인 필수

##### FR-AUTH-005: 아바타/배너 업로드

- **설명**: 프로필 이미지 및 배너 이미지를 Cloudflare R2에 업로드한다
- **입력**: 이미지 파일 (multipart/form-data)
- **처리**: R2에 저장 → URL을 users 테이블에 기록
- **출력**: `{ avatar_url }` 또는 `{ banner_url }`
- **인가**: 로그인 필수

##### FR-AUTH-006: 공개 프로필 조회

- **설명**: 다른 사용자의 공개 프로필을 조회한다
- **입력**: user_id (경로 파라미터)
- **출력**: `{ id, name, role, avatar_url, banner_url, bio, social_links, profile_color, school, department, tier, badges[] }`
- **인가**: 로그인 필수

---

#### 3.2 강의 모듈 (COURSES)

##### FR-COURSE-001: 강의 생성

- **설명**: 교수가 새 강의를 생성한다
- **입력**: `{ title, description?, objectives? }`
- **처리**: 8자리 랜덤 초대 코드 자동 생성, courses 테이블 INSERT
- **출력**: `{ course }` (초대 코드 포함)
- **인가**: professor 또는 personal

##### FR-COURSE-002: 강의 목록 조회

- **설명**: 사용자의 강의 목록을 조회한다
- **처리**:
  - professor: 본인이 생성한 강의 (+ 수강 학생 수)
  - student: 수강 중인 강의
  - personal: is_personal=true인 강의
- **출력**: `{ courses[] }`
- **인가**: 로그인 필수

##### FR-COURSE-003: 강의 상세 조회

- **설명**: 강의 상세 정보, 과제 목록, 수강생 목록을 조회한다
- **출력**: `{ course, assignments[], students[], enrollments[] }`
- **인가**: 해당 강의 소속 사용자

##### FR-COURSE-004: 초대 코드 참가

- **설명**: 학생이 초대 코드로 강의에 참가한다
- **입력**: `{ invite_code }` 또는 URL 경로 `/join/:inviteCode`
- **처리**: enrollments 테이블 INSERT, 중복 등록 방지 (UNIQUE 제약)
- **출력**: `{ enrollment, course }`
- **인가**: student

---

#### 3.3 과제 모듈 (ASSIGNMENTS)

##### FR-ASSIGN-001: 과제 생성

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

##### FR-ASSIGN-002: 과제 수정

- **설명**: 교수가 과제를 수정한다 (제목, 문제, 루브릭, 정책 등)
- **인가**: professor (해당 강의)

##### FR-ASSIGN-003: 과제 발행

- **설명**: 교수가 과제를 draft에서 published로 변경한다
- **처리**: status='published' 업데이트, 학생에게 노출
- **인가**: professor (해당 강의)

##### FR-ASSIGN-004: 문제 추가/수정/삭제

- **설명**: 코딩/알고리즘 과제에 문제를 추가, 수정, 삭제한다
- **처리**: problems JSONB 배열 내 항목 관리
- **인가**: professor 또는 personal

##### FR-ASSIGN-005: AI 루브릭 자동 생성

- **설명**: AI가 과제 주제와 문제를 기반으로 채점 기준표를 자동 생성한다
- **처리**: Gemini API 호출 → rubric JSON 생성
- **인가**: professor 또는 personal

##### FR-ASSIGN-006: 교수용 학생 스냅샷 조회

- **설명**: 교수가 특정 학생의 과제 작성 과정(스냅샷)을 시간순으로 조회한다
- **출력**: `{ snapshots[] }` (시간순 정렬, is_paste 포함)
- **인가**: professor (해당 강의)

##### FR-ASSIGN-007: 제출물 상세 + Diff 뷰

- **설명**: 교수가 학생의 제출물을 조회하고, 스냅샷 간 diff를 확인한다
- **처리**: 인접 스냅샷 비교, +/- diff 라인 생성
- **인가**: professor (해당 강의)

---

#### 3.4 에디터 모듈 (EDITOR)

##### FR-EDIT-001: 과제 정보 + 현재 진행상태 조회

- **설명**: 학생이 에디터 진입 시 과제 정보와 기존 스냅샷을 조회한다
- **출력**: `{ assignment, latest_snapshot, submission_status }`
- **인가**: 해당 과제 수강생

##### FR-EDIT-002: 스냅샷 저장

- **설명**: 학생의 코드/글 작성 과정을 스냅샷으로 저장한다
- **입력**: `{ code_diff, cursor_position, is_paste, paste_source }`
- **처리**: snapshots 테이블 INSERT
- **주기**: 30초 간격 자동 + 코드 변경 시
- **인가**: 해당 과제 수강생

##### FR-EDIT-003: 붙여넣기 감지 기록

- **설명**: 외부/내부 붙여넣기 이벤트를 기록한다
- **입력**: `{ content, paste_source: "internal"|"external" }`
- **처리**: snapshots에 is_paste=true로 INSERT
- **인가**: 해당 과제 수강생

##### FR-EDIT-004: 코드/글 제출

- **설명**: 학생이 과제를 제출한다
- **입력**: `{ code, content?, problem_index? }`
- **처리**:
  1. submissions 테이블 INSERT (status='submitted')
  2. AI 분석 비동기 트리거 (status → 'analyzing' → 'completed')
- **출력**: `{ submission }`
- **인가**: 해당 과제 수강생

##### FR-EDIT-005: 퀴즈 자동 채점

- **설명**: 퀴즈 과제 제출 시 자동 채점한다
- **처리**: 객관식 정답 비교 + 주관식 AI 채점
- **출력**: `{ score, feedback }`
- **인가**: 해당 과제 수강생

---

#### 3.5 AI 분석 모듈 (ANALYSIS)

##### FR-ANAL-001: 제출물 AI 분석

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

##### FR-ANAL-002: AI 피드백 스트리밍 (SSE)

- **설명**: AI 분석 결과를 SSE로 실시간 스트리밍한다
- **프로토콜**: `text/event-stream`
- **이벤트**: `data: {"type": "chunk", "content": "..."}`
- **처리**: Gemini 스트리밍 응답을 SSE 이벤트로 변환
- **인가**: 해당 과제 수강생

---

#### 3.6 AI 튜터 모듈 (TUTOR)

##### FR-TUTOR-001: AI 튜터 채팅 (SSE)

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

#### 3.7 에이전트 모듈 (AGENTS)

##### FR-AGENT-001: 학생 에이전트 채팅

- **설명**: 학생 전용 AI 에이전트와 대화한다
- **기능**: 과제 도움, 학습 상담, 개념 설명
- **인가**: student 또는 personal

##### FR-AGENT-002: 교수 에이전트 채팅

- **설명**: 교수 전용 AI 에이전트와 대화한다
- **기능**: 학급 분석 요약, 과제 설계 조언, 교육 방법론
- **인가**: professor

##### FR-AGENT-003: 에이전트 세션/이력 관리

- **설명**: 에이전트 대화 세션을 생성, 조회, 초기화한다
- **인가**: 로그인 필수

---

#### 3.8 노트 모듈 (NOTES)

##### FR-NOTE-001: 노트 CRUD

- **설명**: 노트를 생성, 조회, 수정, 삭제한다
- **입력 (생성)**: `{ title, content, course_id, parent_id?, team_id? }`
- **처리**: notes 테이블 CRUD, content는 Tiptap JSON 형태
- **인가**: 해당 강의 소속 사용자

##### FR-NOTE-002: AI 다듬기 (Polish)

- **설명**: 노트 내용을 AI가 다듬어 제안한다
- **입력**: `{ content (선택 텍스트) }`
- **출력**: `{ polished_text }`
- **인가**: 해당 노트 소유자

##### FR-NOTE-003: AI 질문 (Ask)

- **설명**: 노트 내용을 기반으로 AI에게 질문한다
- **입력**: `{ question, note_content }`
- **출력**: SSE 스트리밍 응답
- **인가**: 해당 노트 소유자

##### FR-NOTE-004: 지식 그래프 데이터 조회

- **설명**: 강의별 또는 통합 지식 그래프 데이터를 조회한다
- **처리**:
  1. notes → nodes 변환 (id, title, score, tags, content_length)
  2. parent_id → parent edges
  3. note_manual_links → link edges
  4. AI 임베딩 → similar edges (코사인 유사도 계산)
- **출력**: `{ nodes[], edges[] }`
- **인가**: 해당 강의 소속 사용자

##### FR-NOTE-005: 학습 경로 (Study Path)

- **설명**: AI가 노트를 분석하여 최적 학습 순서를 추천한다
- **출력**: `{ study_path: [...] }`
- **인가**: 해당 강의 소속 사용자

##### FR-NOTE-006: 주간 리포트 (Weekly Report)

- **설명**: 주간 학습 현황을 요약한다
- **출력**: `{ period, total_notes, new_notes, avg_score, weakest_notes[], summary }`
- **인가**: 해당 강의 소속 사용자

##### FR-NOTE-007: 노트 스냅샷 관리

- **설명**: 노트의 특정 시점 상태를 수동으로 저장/복원한다
- **인가**: 해당 노트 소유자 또는 팀원

---

#### 3.9 코멘트 모듈 (COMMENTS)

##### FR-COMMENT-001: 블록 단위 코멘트 CRUD

- **설명**: 노트의 특정 블록에 코멘트를 작성, 수정, 삭제한다
- **입력**: `{ note_id, block_index, content, parent_id? }`
- **처리**: note_comments 테이블 CRUD, 답글은 parent_id로 스레드
- **인가**: 해당 노트 접근 권한

##### FR-COMMENT-002: 코멘트 해결 (Resolve)

- **설명**: 코멘트를 해결 상태로 변경한다
- **처리**: is_resolved = true 업데이트
- **인가**: 코멘트 작성자 또는 노트 소유자

##### FR-COMMENT-003: 코멘트 수 집계

- **설명**: 블록별 코멘트 수와 미해결 코멘트 수를 조회한다
- **출력**: `{ block_counts: {0: 3, 5: 1}, total: 10, unresolved: 4 }`
- **인가**: 해당 노트 접근 권한

##### FR-COMMENT-004: AI 코멘트 요약

- **설명**: 노트의 전체 코멘트를 AI가 요약한다
- **출력**: `{ summary }`
- **인가**: 해당 노트 접근 권한

---

#### 3.10 대시보드 모듈 (DASHBOARD)

##### FR-DASH-001: 학급 개요

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

##### FR-DASH-002: 학생 상세 분석

- **설명**: 특정 학생의 상세 학습 데이터를 조회한다
- **출력**: 과제별 점수, 제출 이력, 붙여넣기 비율, 노트 이해도 추이
- **인가**: professor (해당 강의)

##### FR-DASH-003: AI 인사이트

- **설명**: AI가 학급 전체 데이터를 분석하여 인사이트를 생성한다
- **출력**: `{ insights: "..." }` (마크다운 형태)
- **인가**: professor (해당 강의)

---

#### 3.11 시험 감독 모듈 (PROCTOR)

##### FR-PROC-001: 시험 시작

- **설명**: 학생이 시험 모드 과제에 진입한다
- **처리**: 전체화면 강제, 감독 세션 시작
- **인가**: student (해당 과제, exam_mode=true)

##### FR-PROC-002: 스크린샷 캡처

- **설명**: 학생 화면을 주기적으로 캡처하여 R2에 저장한다
- **입력**: Base64 인코딩 이미지 데이터
- **처리**: R2 업로드 → exam_screenshots INSERT
- **주기**: exam_config.screenshot_interval (기본 60초)
- **인가**: student (시험 진행 중)

##### FR-PROC-003: 위반 기록

- **설명**: 시험 중 위반 행위를 감지하고 기록한다
- **입력**: `{ violation_type, detail? }`
- **처리**: exam_violations INSERT/UPDATE (violation_count 증가)
- **인가**: student (시험 진행 중)

##### FR-PROC-004: 시험 감독 설정 관리

- **설명**: 교수가 시험 감독 설정을 조회, 수정한다
- **입력**: `{ screenshot_interval, max_violations, screenshot_quality, fullscreen_required }`
- **인가**: professor (해당 과제)

##### FR-PROC-005: 스크린샷/위반 목록 조회

- **설명**: 교수가 시험의 스크린샷 타임라인과 위반 로그를 조회한다
- **출력**: `{ screenshots[], violations[] }`
- **인가**: professor (해당 과제)

##### FR-PROC-006: 시험 리셋

- **설명**: 교수가 학생의 시험 상태를 리셋한다
- **처리**: 위반 기록 초기화 + exam_reset_logs 기록
- **인가**: professor (해당 과제)

---

#### 3.12 코드 실행 모듈 (RUNNER)

##### FR-RUN-001: 코드 실행 (Run)

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

##### FR-RUN-002: 알고리즘 채점 (Judge)

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

#### 3.13 게이미피케이션 모듈 (GAMIFICATION)

##### FR-GAME-001: 티어/경험치 조회

- **설명**: 사용자의 현재 경험치, 티어, 다음 티어까지의 진행률을 조회한다
- **출력**: `{ total_exp, tier, tier_name, next_tier, progress_pct }`
- **인가**: 로그인 필수

##### FR-GAME-002: 뱃지 조회

- **설명**: 사용자의 획득 뱃지 목록을 조회한다
- **출력**: `{ badges: [{ id, name, description, category, earned_at }] }`
- **인가**: 로그인 필수

##### FR-GAME-003: 전체 티어 목록

- **설명**: 시스템의 전체 티어 목록과 필요 경험치를 조회한다
- **인가**: 로그인 필수

---

#### 3.14 메신저 모듈 (MESSENGER)

##### FR-MSG-001: 미읽 메시지 카운트

- **설명**: 사용자의 전체 미읽 메시지 수를 조회한다
- **출력**: `{ unread_count: 5 }`
- **인가**: 로그인 필수

##### FR-MSG-002: 대화 목록

- **설명**: 강의 내 대화 상대 목록과 최근 메시지를 조회한다
- **출력**: `{ conversations: [{ partner, last_message, unread_count }] }`
- **인가**: 해당 강의 소속

##### FR-MSG-003: 메시지 조회

- **설명**: 특정 상대와의 메시지 이력을 조회한다 (읽음 처리 포함)
- **처리**: 조회 시 상대방 메시지를 is_read=true로 자동 업데이트
- **인가**: 해당 강의 소속

##### FR-MSG-004: 메시지 전송

- **설명**: 메시지를 전송한다
- **입력**: `{ receiver_id, content }`
- **처리**: messages INSERT, Supabase Realtime으로 실시간 전달
- **인가**: 해당 강의 소속

---

#### 3.15 알림 모듈 (NOTIFICATIONS)

##### FR-NOTI-001: 알림 목록 조회

- **설명**: 사용자의 알림 목록을 조회한다
- **출력**: `{ notifications[] }`
- **인가**: 로그인 필수

##### FR-NOTI-002: 미읽 알림 수 조회

- **설명**: 전체 미읽 알림 수를 조회한다
- **인가**: 로그인 필수

##### FR-NOTI-003: 강의별 최근 알림

- **설명**: 특정 강의의 최근 알림을 조회한다
- **인가**: 해당 강의 소속

---

#### 3.16 캘린더/이벤트 모듈 (EVENTS)

##### FR-EVENT-001: 이벤트 CRUD

- **설명**: 개인 일정을 생성, 조회, 수정, 삭제한다
- **입력**: `{ title, description?, event_date, end_date?, color? }`
- **인가**: 로그인 필수 (본인 이벤트만)

##### FR-EVENT-002: 캘린더 조회

- **설명**: 특정 월의 이벤트 + 과제 마감일을 통합 조회한다
- **출력**: `{ events[], deadlines[] }`
- **인가**: 로그인 필수

##### FR-EVENT-003: 투두 조회

- **설명**: 오늘의 할일(이벤트 + 마감 과제)을 조회한다
- **인가**: 로그인 필수

---

#### 3.17 팀 모듈 (TEAMS)

##### FR-TEAM-001: 팀 CRUD

- **설명**: 교수가 팀을 생성, 조회, 수정, 삭제한다
- **입력 (생성)**: `{ name, course_id }`
- **인가**: professor (해당 강의)

##### FR-TEAM-002: 팀원 관리

- **설명**: 팀에 멤버를 추가/제거한다
- **처리**: team_members INSERT/DELETE
- **인가**: professor (해당 강의)

---

#### 3.18 투표 모듈 (VOTING)

##### FR-VOTE-001: 투표 발의

- **설명**: 팀원이 과제 제출을 위한 투표를 시작한다
- **입력**: `{ submission_payload }` (제출할 코드/내용)
- **처리**:
  1. team_submission_votes INSERT (status='pending', deadline=now+10분)
  2. 발의자 자동 approve 기록
  3. 팀원에게 알림
- **제약**: 이미 pending 투표가 있으면 거부 (부분 유니크 인덱스)
- **인가**: 해당 팀 멤버

##### FR-VOTE-002: 투표 응답

- **설명**: 팀원이 투표에 응답(approve/reject)한다
- **입력**: `{ response: "approve" | "reject" }`
- **처리**: UPSERT (변경 가능), 자동 resolve 체크
- **인가**: 해당 팀 멤버

##### FR-VOTE-003: 투표 상태 조회

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

#### 3.19 교수자료 모듈 (MATERIALS)

##### FR-MAT-001: 자료 업로드

- **설명**: 교수가 강의 자료를 업로드한다
- **입력**: 파일 (multipart/form-data, 최대 50MB)
- **처리**: R2 업로드 → course_materials INSERT
- **인가**: professor (해당 강의)

##### FR-MAT-002: 자료 목록/다운로드

- **설명**: 강의 자료 목록을 조회하고 다운로드 URL을 얻는다
- **인가**: 해당 강의 소속

##### FR-MAT-003: 자료 삭제

- **설명**: 업로드한 자료를 삭제한다
- **처리**: R2 오브젝트 삭제 + course_materials DELETE
- **인가**: professor (해당 강의)

---

#### 3.20 시드 데이터 모듈 (SEED)

##### FR-SEED-001: 테스트 데이터 생성

- **설명**: 개발/테스트용 데이터를 생성한다
- **처리**: 교수/학생 계정, 강의, 과제, 제출물 등 더미 데이터 INSERT
- **인가**: 인증 불요 (개발 전용)

---

### 4. 비기능 요구사항

#### 4.1 성능 요구사항

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

#### 4.2 보안 요구사항

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

#### 4.3 신뢰성 요구사항

| ID | 요구사항 | 구현 |
|----|----------|------|
| NFR-REL-001 | AI 서비스 가용성 | 3단계 모델 폴백 (2.5→2.0→1.5 Flash) |
| NFR-REL-002 | 데이터 영속성 | Supabase 관리형 백업 + WAL |
| NFR-REL-003 | 에러 복구 | ErrorBoundary (프론트), 전역 예외 핸들러 (백엔드) |
| NFR-REL-004 | 스냅샷 지속성 | 자동 저장 30초 간격 + 제출 시 최종 스냅샷 |
| NFR-REL-005 | 투표 일관성 | 부분 유니크 인덱스로 동시 투표 방지 |

#### 4.4 사용성 요구사항

| ID | 요구사항 | 구현 |
|----|----------|------|
| NFR-USE-001 | 페이지 로딩 피드백 | Skeleton UI + PageLoader 스피너 |
| NFR-USE-002 | 에러 메시지 | 한국어 사용자 친화적 메시지 + 토스트 알림 |
| NFR-USE-003 | 실시간 피드백 | SSE 스트리밍 + Supabase Realtime + 토스트 |
| NFR-USE-004 | 키보드 접근성 | 에디터 단축키, 모달 ESC 닫기 |
| NFR-USE-005 | 테마 커스터마이징 | CSS 변수 기반 테마 + 55종 이펙트 |
| NFR-USE-006 | 튜토리얼 | TutorialProvider로 신규 사용자 온보딩 가이드 |
| NFR-USE-007 | 커스텀 확인 모달 | 브라우저 기본 confirm 대신 커스텀 모달 사용 |

#### 4.5 유지보수성 요구사항

| ID | 요구사항 | 구현 |
|----|----------|------|
| NFR-MNT-001 | 모듈화 | 백엔드 21개 독립 모듈, 프론트엔드 컴포넌트 분리 |
| NFR-MNT-002 | 타입 안전성 | TypeScript strict mode + Pydantic 모델 |
| NFR-MNT-003 | 상태 관리 | Zustand 7개 독립 스토어 (관심사 분리) |
| NFR-MNT-004 | API 문서화 | FastAPI 자동 Swagger/OpenAPI 문서 (/docs) |
| NFR-MNT-005 | DB 마이그레이션 | 개별 SQL 파일 기반 증분 마이그레이션 |

#### 4.6 확장성 요구사항

| ID | 요구사항 | 구현 |
|----|----------|------|
| NFR-SCL-001 | 수평 확장 | Docker 컨테이너화 + Nginx 로드밸런서 |
| NFR-SCL-002 | DB 스케일링 | Supabase 클라우드 자동 스케일링 |
| NFR-SCL-003 | 파일 스토리지 | Cloudflare R2 (S3 호환, 무제한 확장) |
| NFR-SCL-004 | CDN | Cloudflare 글로벌 CDN |
| NFR-SCL-005 | 워커 스케일링 | uvicorn --workers 설정으로 CPU 코어 활용 |

---

### 5. 외부 인터페이스 요구사항

#### 5.1 사용자 인터페이스

| 인터페이스 | 기술 | 설명 |
|-----------|------|------|
| 웹 브라우저 | React SPA | 27개 페이지, Lazy Loading |
| 코드 에디터 | Monaco Editor | VS Code 엔진, 9개 언어 하이라이팅 |
| 리치 텍스트 에디터 | Tiptap v2 | 10개 커스텀 확장 |
| 지식 그래프 | react-force-graph-2d | d3-force 기반 인터랙티브 |
| 드로잉 | Excalidraw | 인라인 드로잉 캔버스 |
| 수식 | KaTeX | LaTeX 수식 렌더링 |

#### 5.2 소프트웨어 인터페이스

| 외부 서비스 | 프로토콜 | 용도 |
|------------|----------|------|
| Google OAuth 2.0 | HTTPS | 사용자 인증 |
| Supabase Auth | HTTPS | JWT 토큰 관리 |
| Supabase PostgreSQL | TCP/SSL | 데이터 저장소 |
| Supabase Realtime | WebSocket | 실시간 이벤트 |
| Google Gemini API | HTTPS | AI 분석/튜터/에이전트 |
| Cloudflare R2 | HTTPS (S3 API) | 파일 스토리지 |

#### 5.3 하드웨어 인터페이스

| 항목 | 최소 사양 | 권장 사양 |
|------|-----------|-----------|
| 서버 CPU | 2 vCPU | 4 vCPU |
| 서버 RAM | 4 GB | 8-16 GB |
| 서버 스토리지 | 20 GB SSD | 50 GB SSD |
| 인스턴스 | AWS EC2 c7i-flex.large | AWS EC2 t3.xlarge |

#### 5.4 통신 인터페이스

| 프로토콜 | 포트 | 용도 |
|----------|------|------|
| HTTPS | 443 | 클라이언트 ↔ Nginx |
| HTTP | 8000 | Nginx ↔ FastAPI (내부) |
| WSS | 443 | Supabase Realtime |
| SSE | 443 | AI 스트리밍 응답 |

---

### 6. 시스템 제약 조건

#### 6.1 기술적 제약

1. **단일 서버 배포**: 현재 EC2 단일 인스턴스에 백엔드 + Nginx 배포 (수평 확장 미적용)
2. **코드 실행 격리**: Docker 컨테이너 레벨 격리 (VM 레벨 아님)
3. **AI API 한도**: Google Gemini API 요청 제한 (RPM/TPM)
4. **Supabase 무료 티어**: 데이터베이스 크기/연결 수 제한 가능
5. **브라우저 API 의존**: 시험 감독의 전체화면 API는 브라우저 지원 필요

#### 6.2 비즈니스 제약

1. **한국어 우선**: UI/UX와 AI 프롬프트 모두 한국어 기반
2. **Google 계정 필수**: OAuth 제공자가 Google만 지원
3. **무료 운영**: 현 단계에서 수익 모델 미적용

---

### 7. 데이터 요구사항

#### 7.1 데이터 보존

| 데이터 유형 | 보존 기간 | 비고 |
|------------|-----------|------|
| 사용자 정보 | 계정 존재 기간 | CASCADE 삭제 |
| 제출물/분석 | 영구 | 학습 이력으로 보존 |
| 스냅샷 | 영구 | 학습 과정 분석용 |
| 시험 스크린샷 | 학기 단위 | R2 스토리지 비용 고려 |
| 메시지 | 영구 | 소통 이력 보존 |
| 노트 | 영구 | 학습 자산 |

#### 7.2 데이터 무결성

- UUID 기반 PK (충돌 확률 무시 가능)
- 외래 키 CASCADE/SET NULL로 참조 무결성 보장
- UNIQUE 제약으로 중복 방지 (enrollments, team_members, vote_responses)
- CHECK 제약으로 값 범위 제한 (role, status, type, score 등)
- 부분 유니크 인덱스로 비즈니스 규칙 보장 (진행 중 투표 1개 제한)

---

### 8. 검증 기준

#### 8.1 기능 검증

각 기능 요구사항(FR-*)에 대해:
1. 정상 시나리오 (Happy Path) 테스트
2. 권한 없는 접근 시 403 반환
3. 잘못된 입력 시 400/422 반환
4. 존재하지 않는 리소스 시 404 반환

#### 8.2 성능 검증

- API 응답 시간 벤치마크 (p50, p95, p99)
- 동시 접속 부하 테스트 (100+ 사용자)
- AI 스트리밍 지연시간 측정

#### 8.3 보안 검증

- 인증 우회 시도 테스트
- CORS 정책 검증
- 코드 실행 샌드박스 탈출 시도 테스트
- SQL 인젝션 테스트

---

*이 문서는 PikaBuddy의 소프트웨어 요구사항 명세서입니다. 기능 요구사항은 04_API.md의 엔드포인트 명세와 매핑됩니다.*


---


# 3. TDD — 기술 설계 문서


작성일: 2026-04-12  
버전: 1.0  
작성자: PikaBuddy 개발팀

---

### 1. 시스템 아키텍처

#### 1.1 고수준 아키텍처

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

#### 1.2 데이터 흐름

```
학생 코드 작성 → 스냅샷 저장 (30초) → 제출 → AI 분석 → SSE 피드백
                      ↓                         ↓
                 붙여넣기 감지              분석 결과 DB 저장
                      ↓                         ↓
                 교수 스냅샷 diff 조회      교수 대시보드 반영
```

---

### 2. 기술 스택 상세

#### 2.1 프론트엔드

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

#### 2.2 백엔드

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

#### 2.3 데이터베이스

| 항목 | 상세 |
|------|------|
| DBMS | PostgreSQL 15+ (Supabase 관리형) |
| 테이블 | 27개 |
| 인덱스 | 51개 (B-tree, GIN, Composite, Partial) |
| 함수 | 1개 (update_updated_at) |
| 트리거 | 3개 (users, notes, note_comments) |
| RLS | 전 테이블 활성화 |
| 마이그레이션 | 11개 SQL 파일 (증분식) |

#### 2.4 인프라

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

### 3. 프론트엔드 아키텍처

#### 3.1 프로젝트 구조

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

#### 3.2 라우팅 설계

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

#### 3.3 상태 관리 (Zustand)

##### authStore

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

##### courseStore

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

##### themeStore

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

##### commentStore

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

##### messengerStore

```typescript
interface MessengerState {
  conversations: ConversationItem[];
  messages: Message[];
  unreadTotal: number;
  fetchConversations: (courseId: string) => Promise<void>;
  sendMessage: (courseId: string, receiverId: string, content: string) => Promise<void>;
}
```

##### notificationStore

```typescript
interface NotificationState {
  totalUnread: number;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
}
```

##### tutorialStore

```typescript
interface TutorialState {
  completedTutorials: string[];
  markCompleted: (id: string) => void;
  shouldShow: (id: string) => boolean;
}
```

#### 3.4 API 통신 레이어

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

#### 3.5 Tiptap 확장 시스템

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

### 4. 백엔드 아키텍처

#### 4.1 프로젝트 구조

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

#### 4.2 인증/인가 아키텍처

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

#### 4.3 AI 통합 아키텍처

##### Gemini Client (`common/gemini_client.py`)

```python
## 모델 티어
MODEL_HEAVY = "gemini-2.5-flash"        # 복잡한 작업
MODEL_LIGHT = "gemini-2.5-flash-lite"   # 경량 작업

## 폴백 체인 (503 과부하 시)
FALLBACK_MODELS = [MODEL_HEAVY, "gemini-2.0-flash", MODEL_LIGHT]

## 가격 정보 (USD per 1M tokens)
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

##### AI 활용 영역

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

#### 4.4 코드 실행 엔진 (Runner)

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

#### 4.5 실시간 통신

##### SSE (Server-Sent Events)

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

##### Supabase Realtime

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

### 5. 보안 설계

#### 5.1 인증 흐름

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

#### 5.2 코드 실행 보안

1. **위험 패턴 차단**: 언어별 블랙리스트 (os.system, subprocess, fork 등)
2. **타임아웃 강제**: subprocess에 5초(기본) × 언어별 배율 타임아웃
3. **Docker 격리**: 백엔드 Docker 컨테이너 내에서 실행
4. **리소스 제한**: Docker `deploy.resources.limits.memory: 1G`
5. **임시 파일 정리**: 실행 후 tmpdir 자동 삭제

#### 5.3 데이터 보안

1. **RLS**: 모든 27개 테이블에 Row Level Security 활성화
2. **Service Key**: 백엔드만 Supabase Service Role Key 보유
3. **환경 변수**: API 키, DB 비밀번호 등 .env 파일로 관리 (gitignore)
4. **CORS**: 명시적 허용 도메인만 접근 가능
5. **HTTPS**: Cloudflare + Nginx SSL 이중 암호화

---

### 6. 성능 최적화 설계

#### 6.1 프론트엔드

| 최적화 | 구현 |
|--------|------|
| 코드 분할 | React.lazy() + Suspense로 27개 페이지 분할 |
| 번들 최적화 | Vite Tree Shaking + minification |
| 정적 호스팅 | Cloudflare CDN (글로벌 엣지 캐시) |
| Skeleton UI | 데이터 로딩 중 Skeleton 컴포넌트 표시 |
| 디바운싱 | 스냅샷 저장, 검색 입력 디바운싱 |
| 이미지 최적화 | 아바타/배너 리사이즈 후 업로드 |

#### 6.2 백엔드

| 최적화 | 구현 |
|--------|------|
| 멀티 워커 | uvicorn --workers 3 (2 vCPU에 최적화) |
| 동시성 제한 | --limit-concurrency 100 |
| gzip 압축 | Nginx gzip level 4, min 256B |
| Keepalive | Nginx upstream keepalive 16 |
| 인덱스 최적화 | 51개 DB 인덱스 (Composite, Partial, GIN 포함) |
| 싱글턴 패턴 | Supabase/R2 클라이언트 1회 초기화 |
| LRU 캐시 | Settings 객체 @lru_cache |

#### 6.3 데이터베이스

| 최적화 | 구현 |
|--------|------|
| 부분 인덱스 | 미읽 메시지, 개인 강의, 진행 중 투표 |
| 복합 인덱스 | 메시지 대화 조회, 시험 스크린샷 룩업 |
| GIN 인덱스 | 노트 카테고리 JSONB 배열 검색 |
| CASCADE | 부모 삭제 시 자식 자동 정리 |
| Supabase | 관리형 PostgreSQL 자동 최적화 |

---

### 7. 에러 처리 설계

#### 7.1 프론트엔드

- **ErrorBoundary**: React 에러 경계로 크래시 시 폴백 UI 표시
- **Axios 인터셉터**: 401 → 세션 만료 알림, 네트워크 에러 → 토스트
- **Toast 시스템**: 성공/에러/경고 토스트 알림

#### 7.2 백엔드

- **HTTP 상태 코드**: 400(잘못된 요청), 401(미인증), 403(권한 없음), 404(미발견), 422(검증 실패), 500(서버 에러)
- **AI 폴백**: Gemini 503 → 대체 모델 자동 전환
- **코드 실행 에러**: 컴파일 에러, 런타임 에러, 타임아웃을 구분하여 반환

---

### 8. 테스트 전략

#### 8.1 API 테스트

현재 31개 API 테스트가 구현되어 있습니다.

#### 8.2 향후 계획

| 레벨 | 도구 | 범위 |
|------|------|------|
| 단위 테스트 | pytest | 백엔드 모듈별 함수 |
| 통합 테스트 | pytest + httpx | API 엔드포인트 |
| E2E 테스트 | Playwright | 주요 사용자 시나리오 |
| 부하 테스트 | locust | 동시 접속 시나리오 |

---

### 9. 모니터링 설계 (향후)

| 영역 | 도구 (예정) | 측정 항목 |
|------|------------|-----------|
| 서버 메트릭 | Prometheus + Grafana | CPU, RAM, 디스크, 네트워크 |
| API 메트릭 | FastAPI middleware | 응답 시간, 에러율, 요청 수 |
| AI 메트릭 | 내장 token-stats | 토큰 사용량, 비용, 모델별 분포 |
| 로그 | 구조화 로깅 | 요청/에러 로그 |
| 알림 | 슬랙/이메일 | 에러율 급증, 서버 다운 |

---

*이 문서는 PikaBuddy의 기술 설계를 정의합니다. API 상세는 04_API.md, DB 스키마는 05_ERD.md를 참조하세요.*


---


# 4. API — API 명세서


작성일: 2026-04-12  
버전: 1.0  
작성자: PikaBuddy 개발팀

---

### 1. 개요

#### 1.1 API 기본 정보

| 항목 | 값 |
|------|---|
| Base URL | `https://pikabuddy.com/api` (프로덕션) / `http://localhost:8000/api` (개발) |
| 프로토콜 | HTTPS (TLS 1.2+) |
| 인증 | Bearer Token (Supabase JWT) |
| 응답 형식 | JSON (`application/json`) |
| 스트리밍 | SSE (`text/event-stream`) |
| API 문서 | FastAPI 자동 생성 Swagger UI (`/docs`) |

#### 1.2 인증

모든 인증 필요 엔드포인트에 다음 헤더를 포함해야 합니다:

```
Authorization: Bearer <supabase_access_token>
```

#### 1.3 공통 에러 응답

| 상태 코드 | 설명 |
|-----------|------|
| 400 | 잘못된 요청 (유효하지 않은 파라미터) |
| 401 | 인증 실패 (토큰 없음 또는 만료) |
| 403 | 권한 없음 (역할 부족) |
| 404 | 리소스를 찾을 수 없음 |
| 409 | 충돌 (중복 데이터) |
| 422 | 유효성 검사 실패 (Pydantic) |
| 500 | 서버 내부 오류 |

#### 1.4 엔드포인트 수량 요약

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

### 2. Auth 모듈 — 인증/인가

#### POST `/api/auth/admin-login`

관리자 계정으로 로그인합니다.

- **인가**: 없음
- **Body**: `{ id: string, password: string, role: "student" | "teacher" }`
- **응답**: `{ user, access_token }`

#### GET `/api/auth/test-accounts`

테스트 계정 정보를 조회합니다.

- **인가**: 없음
- **응답**: `{ student: { id, password }, teacher: { id, password } }`

#### POST `/api/auth/callback`

Google OAuth 콜백을 처리합니다.

- **인가**: 없음
- **Body**: `{ access_token: string }`
- **처리**: Supabase Auth에서 사용자 정보 조회, users 테이블 INSERT/UPDATE
- **응답**: `{ user: User }`

#### POST `/api/auth/role`

역할을 선택합니다 (최초 가입 시).

- **인가**: 로그인 필수
- **Body**: `{ role: "professor" | "student" | "personal" }`
- **처리**: users.role 업데이트, personal인 경우 자동 강의 생성
- **응답**: `{ user: User }`

#### GET `/api/auth/me`

현재 로그인한 사용자 정보를 조회합니다.

- **인가**: 로그인 필수
- **응답**: `{ user: User }`

#### POST `/api/auth/switch-role`

역할을 변경합니다.

- **인가**: 로그인 필수
- **Body**: `{ new_role: string }`
- **응답**: `{ user: User }`

#### PATCH `/api/auth/profile`

프로필 정보를 수정합니다.

- **인가**: 로그인 필수
- **Body**: `{ name?, bio?, social_links?, profile_color?, school?, department?, student_id? }`
- **응답**: `{ user: User }`

#### POST `/api/auth/avatar`

아바타 이미지를 업로드합니다.

- **인가**: 로그인 필수
- **Content-Type**: `multipart/form-data`
- **Body**: `file: 이미지 파일`
- **처리**: Cloudflare R2에 업로드, users.avatar_url 업데이트
- **응답**: `{ avatar_url: string }`

#### POST `/api/auth/banner`

배너 이미지를 업로드합니다.

- **인가**: 로그인 필수
- **Content-Type**: `multipart/form-data`
- **Body**: `file: 이미지 파일`
- **응답**: `{ banner_url: string }`

#### GET `/api/auth/profile/{user_id}`

공개 프로필을 조회합니다.

- **인가**: 없음
- **Path**: `user_id: string`
- **응답**: `{ id, name, role, avatar_url, banner_url, bio, social_links, profile_color, school, department, tier_info, badges[] }`

---

### 3. Courses 모듈 — 강의

#### POST `/api/courses`

새 강의를 생성합니다.

- **인가**: professor 또는 personal
- **Body**: `{ title: string, description?: string, objectives?: string[] }`
- **처리**: 8자리 랜덤 초대 코드 자동 생성
- **응답 (201)**: `{ course: Course }`

#### GET `/api/courses`

사용자의 강의 목록을 조회합니다.

- **인가**: 로그인 필수
- **처리**: 역할별 분기 (professor=생성 강의, student=수강 강의, personal=개인 강의)
- **응답**: `{ courses: Course[] }`

#### GET `/api/courses/by-invite/{invite_code}`

초대 코드로 강의 정보를 미리 조회합니다.

- **인가**: 없음
- **응답**: `{ course: Course }`

#### POST `/api/courses/join`

초대 코드로 강의에 참가합니다.

- **인가**: student
- **Body**: `{ invite_code: string }`
- **응답**: `{ enrollment, course }`

#### PATCH `/api/courses/{course_id}`

강의 정보를 수정합니다.

- **인가**: professor 또는 personal (해당 강의)
- **Body**: `{ title?, description?, objectives?, banner_url? }`
- **응답**: `{ course: Course }`

#### GET `/api/courses/{course_id}`

강의 상세 정보를 조회합니다.

- **인가**: 해당 강의 소속 사용자
- **응답**: `{ course, assignments[], students[], enrollments[] }`

#### PATCH `/api/courses/{course_id}/my-banner`

학생 개인의 강의 배너를 설정합니다.

- **인가**: 로그인 필수
- **Body**: `{ custom_banner_url: string }`
- **응답**: `{ custom_banner_url }`

---

### 4. Assignments 모듈 — 과제

**Base**: `/api/courses/{course_id}/assignments`

#### POST `/api/courses/{course_id}/assignments`

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

#### GET `/api/courses/{course_id}/assignments`

과제 목록을 조회합니다.

- **인가**: 해당 강의 소속
- **응답**: `{ assignments: Assignment[] }` (학생은 has_submitted 포함)

#### GET `/api/courses/{course_id}/assignments/{assignment_id}`

과제 상세를 조회합니다.

- **인가**: 해당 강의 소속
- **응답**: `{ assignment: Assignment }`

#### PATCH `/api/courses/{course_id}/assignments/{assignment_id}`

과제를 수정합니다.

- **인가**: professor 또는 personal
- **Body**: `{ title?, topic?, type?, language?, due_date?, ... }`
- **응답**: `{ assignment }`

#### DELETE `/api/courses/{course_id}/assignments/{assignment_id}`

과제를 삭제합니다.

- **인가**: professor 또는 personal
- **응답 (204)**: 없음

#### POST `/api/courses/{course_id}/assignments/{assignment_id}/publish`

과제를 발행합니다 (학생에게 노출).

- **인가**: professor 또는 personal
- **응답**: `{ assignment }`

#### POST `/api/courses/{course_id}/assignments/{assignment_id}/unpublish`

과제를 비발행으로 변경합니다.

- **인가**: professor 또는 personal

#### PATCH `/api/courses/{course_id}/assignments/{assignment_id}/policy`

AI 정책을 변경합니다.

- **Body**: `{ ai_policy: "free"|"normal"|"strict"|"exam" }`

#### PATCH `/api/courses/{course_id}/assignments/{assignment_id}/writing-prompt`

글쓰기 지침을 수정합니다.

- **Body**: `{ writing_prompt: string }`

#### POST `/api/courses/{course_id}/assignments/{assignment_id}/problems`

문제를 추가합니다.

- **Body**: `{ title, description, starter_code, expected_output, hints[] }`
- **응답 (201)**: `{ assignment }`

#### PATCH `/api/courses/{course_id}/assignments/{assignment_id}/problems/{problem_id}`

문제를 수정합니다.

#### DELETE `/api/courses/{course_id}/assignments/{assignment_id}/problems/{problem_id}`

문제를 삭제합니다.

#### GET `/api/courses/{course_id}/assignments/{assignment_id}/submissions`

제출물 목록을 조회합니다 (교수용).

- **인가**: professor
- **응답**: `{ submissions: Submission[] }` (학생별, AI 분석 포함)

#### GET `/api/courses/{course_id}/assignments/{assignment_id}/paste-logs`

붙여넣기 로그를 조회합니다.

- **인가**: professor

#### GET `/api/courses/{course_id}/assignments/{assignment_id}/submissions/{student_id}/snapshots`

특정 학생의 스냅샷 타임라인을 조회합니다.

- **인가**: professor
- **응답**: `{ snapshots: Snapshot[] }` (시간순)

#### PATCH `/api/courses/{course_id}/assignments/{assignment_id}/analyses/{analysis_id}/score`

AI 채점 점수를 수동으로 수정합니다.

- **인가**: professor
- **Body**: `{ final_score: number }`

#### DELETE `/api/courses/{course_id}/assignments/{assignment_id}/submissions/{submission_id}`

제출물을 삭제합니다.

- **인가**: professor

#### GET `/api/courses/{course_id}/assignments/problem-bank`

문제 은행을 조회합니다.

- **인가**: professor

#### POST `/api/courses/{course_id}/assignments/{assignment_id}/import-problems`

문제 은행에서 문제를 가져옵니다.

- **인가**: professor

---

### 5. Editor 모듈 — 에디터

#### GET `/api/editor/assignments/{assignment_id}`

학생용 과제 정보를 조회합니다 (에디터 진입 시).

- **인가**: 로그인 필수
- **응답**: `{ assignment, latest_code, submission_status }`

#### POST `/api/editor/assignments/{assignment_id}/snapshots`

스냅샷을 저장합니다.

- **인가**: 로그인 필수
- **Body**: `{ code_diff: object, cursor_position?: object, is_paste?: boolean, paste_source?: string }`
- **응답 (201)**: `{ snapshot }`

#### GET `/api/editor/assignments/{assignment_id}/snapshots`

본인의 스냅샷 목록을 조회합니다.

- **인가**: 로그인 필수
- **응답**: `{ snapshots[] }`

#### POST `/api/editor/assignments/{assignment_id}/paste-log`

붙여넣기 이벤트를 기록합니다.

- **인가**: 로그인 필수
- **Body**: `{ content: string, paste_source: "internal"|"external" }`
- **응답 (201)**: `{ snapshot }`

#### GET `/api/editor/assignments/{assignment_id}/my-submission`

본인의 제출물을 조회합니다.

- **인가**: 로그인 필수
- **응답**: `{ submission, analysis? }`

#### POST `/api/editor/assignments/{assignment_id}/submit`

과제를 제출합니다.

- **인가**: 로그인 필수
- **Body**: `{ code?: string, content?: object, problem_index?: number }`
- **처리**: submissions INSERT → 비동기 AI 분석 트리거
- **응답 (201)**: `{ submission }`

#### POST `/api/editor/assignments/{assignment_id}/quiz-grade`

퀴즈를 채점합니다.

- **인가**: 로그인 필수
- **Body**: `{ answers: object }`
- **응답**: `{ score, feedback, details[] }`

---

### 6. Analysis 모듈 — AI 분석

#### GET `/api/submissions/{submission_id}/analysis`

AI 분석 결과를 조회합니다.

- **인가**: 로그인 필수
- **응답**: `{ analysis: AiAnalysis }`

#### GET `/api/submissions/{submission_id}/feedback-stream`

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

### 7. Tutor 모듈 — AI 튜터

#### POST `/api/tutor/chat`

AI 튜터와 대화합니다 (SSE 스트리밍).

- **인가**: student 또는 personal
- **Body**: `{ message: string, assignment_id: string, code_context?: string, history?: ChatMessage[] }`
- **Content-Type (응답)**: `text/event-stream`
- **처리**: AI 정책(ai_policy)에 따라 응답 수준 제한
- **이벤트**: `data: {"type": "chunk", "content": "..."}`

---

### 8. Notes 모듈 — 노트

#### POST `/api/courses/{course_id}/notes`

노트를 생성합니다.

- **인가**: student 또는 personal
- **Body**: `{ title: string, content?: object, parent_id?: string, team_id?: string }`
- **응답 (201)**: `{ note: Note }`

#### GET `/api/courses/{course_id}/notes`

노트 목록을 조회합니다.

- **인가**: 해당 강의 소속
- **Query**: `?team_id=xxx` (팀 노트 필터)
- **응답**: `{ notes: Note[] }`

#### PATCH `/api/notes/{note_id}`

노트를 수정합니다.

- **인가**: 노트 소유자 또는 팀원
- **Body**: `{ title?, content?, categories? }`
- **응답**: `{ note }`

#### DELETE `/api/notes/{note_id}`

노트를 삭제합니다.

- **인가**: student 또는 personal (소유자)
- **응답 (204)**: 없음

#### GET `/api/notes/{note_id}/snapshots`

노트 스냅샷 목록을 조회합니다.

- **응답**: `{ snapshots: NoteSnapshot[] }`

#### GET `/api/notes/{note_id}/snapshots/{snapshot_id}`

특정 노트 스냅샷을 조회합니다.

- **응답**: `{ snapshot: NoteSnapshot }` (content 포함)

#### GET `/api/courses/{course_id}/notes/graph`

강의별 지식 그래프 데이터를 조회합니다.

- **인가**: 해당 강의 소속
- **처리**: 노트 → 노드, parent/link/similar → 엣지, 임베딩 유사도 계산
- **응답**: `{ nodes: GraphNode[], edges: GraphEdge[] }`

#### GET `/api/notes/unified-graph`

통합 지식 그래프 데이터를 조회합니다 (모든 강의).

- **인가**: 로그인 필수
- **응답**: `{ nodes: GraphNode[], edges: GraphEdge[] }`

#### GET `/api/notes/{note_id}/tags`

노트 태그를 조회합니다.

#### POST `/api/notes/{note_id}/tags`

태그를 추가합니다.

- **Body**: `{ tag: string }`

#### DELETE `/api/notes/{note_id}/tags/{tag_id}`

태그를 삭제합니다.

#### GET `/api/notes/{note_id}/backlinks`

이 노트를 참조하는 다른 노트 목록을 조회합니다.

#### GET `/api/notes/{note_id}/recommendations`

관련 노트를 추천합니다 (임베딩 유사도 기반).

#### GET `/api/courses/{course_id}/study-path`

AI 추천 학습 경로를 조회합니다.

- **응답**: `{ study_path: [{note_id, title, reason}] }`

#### GET `/api/courses/{course_id}/weekly-report`

강의별 주간 학습 리포트를 조회합니다.

- **응답**: `{ period, total_notes, new_notes, avg_score, weakest_notes[], summary }`

#### GET `/api/notes/unified-study-path`

통합 학습 경로를 조회합니다.

#### GET `/api/notes/unified-weekly-report`

통합 주간 리포트를 조회합니다.

#### POST `/api/courses/{course_id}/notes/manual-link`

노트 간 수동 링크를 생성합니다.

- **Body**: `{ source_note_id: string, target_note_id: string }`

#### DELETE `/api/courses/{course_id}/notes/manual-link`

수동 링크를 삭제합니다.

- **Body**: `{ source_note_id: string, target_note_id: string }`

#### GET `/api/notes/{note_id}/ai-comments`

AI가 생성한 코멘트를 조회합니다.

#### POST `/api/notes/ask`

AI에게 질문합니다 (노트 컨텍스트 기반).

- **Body**: `{ question: string, context: string }`
- **응답**: `{ answer: string }`

#### POST `/api/notes/{note_id}/polish`

노트 텍스트를 AI가 다듬습니다.

- **Body**: `{ content: string }`
- **응답**: `{ polished: string }`

#### POST `/api/notes/{note_id}/analyze`

노트를 AI가 분석합니다 (이해도 점수, 갭 분석).

- **응답**: `{ understanding_score, gap_analysis, categories }`

#### GET `/api/notes/{note_id}/analyze-stream`

노트 분석을 SSE로 스트리밍합니다.

---

### 9. Dashboard 모듈 — 교수 대시보드

#### GET `/api/courses/{course_id}/dashboard`

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

#### GET `/api/courses/{course_id}/dashboard/students/{student_id}`

학생 상세 분석을 조회합니다.

- **인가**: professor 또는 personal
- **응답**: `{ student, submissions[], notes[], snapshot_count, paste_logs }`

#### GET `/api/courses/{course_id}/insights`

AI 인사이트를 조회합니다.

- **인가**: professor 또는 personal
- **응답**: `{ insights: string }` (마크다운)

---

### 10. Proctor 모듈 — 시험 감독

#### POST `/api/exam/screenshot`

시험 스크린샷을 업로드합니다.

- **인가**: 로그인 필수 (시험 진행 중)
- **Content-Type**: `multipart/form-data`
- **Body**: `assignment_id, file (이미지)`
- **처리**: Cloudflare R2에 업로드, exam_screenshots INSERT

#### POST `/api/exam/start`

시험을 시작합니다.

- **Body**: `{ assignment_id: string }`
- **응답 (201)**: `{ status: "started" }`

#### GET `/api/exam/status/{assignment_id}`

시험 상태를 조회합니다.

- **응답**: `{ is_active, violation_count, max_violations, config }`

#### POST `/api/exam/violation`

위반을 기록합니다.

- **Body**: `{ assignment_id: string, violation_type: string, detail?: string }`
- **응답 (201)**: `{ violation }`

#### GET `/api/exam/config/{assignment_id}`

시험 설정을 조회합니다.

#### PATCH `/api/exam/config/{assignment_id}`

시험 설정을 수정합니다.

- **인가**: professor
- **Body**: `{ screenshot_interval?, max_violations?, screenshot_quality?, fullscreen_required? }`

#### GET `/api/exam/screenshots/{assignment_id}`

스크린샷 목록을 조회합니다.

- **인가**: professor
- **Query**: `?student_id=xxx`
- **응답**: `{ screenshots[] }`

#### GET `/api/exam/violations/{assignment_id}`

위반 목록을 조회합니다.

- **인가**: professor
- **Query**: `?student_id=xxx`

#### GET `/api/exam/summary/{assignment_id}`

시험 요약을 조회합니다.

- **인가**: professor
- **응답**: `{ total_students, total_violations, screenshot_count, students_summary[] }`

#### GET `/api/exam/students/{assignment_id}`

시험 응시 학생 목록을 조회합니다.

#### POST `/api/exam/reset`

학생 시험 상태를 리셋합니다.

- **인가**: professor
- **Body**: `{ assignment_id: string, student_id: string, reason?: string }`

---

### 11. Runner 모듈 — 코드 실행

#### POST `/api/run`

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

#### POST `/api/judge`

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

### 12. Agents 모듈 — AI 에이전트

#### POST `/api/agents/student/chat`

학생 AI 에이전트와 대화합니다 (SSE).

- **인가**: student 또는 personal
- **Body**: `{ message: string, context?: string }`
- **응답**: SSE 스트리밍

#### POST `/api/agents/professor/chat`

교수 AI 에이전트와 대화합니다 (SSE).

- **인가**: professor 또는 personal
- **Body**: `{ message: string, context?: string }`

#### GET `/api/agents/session/{agent_type}`

에이전트 세션 정보를 조회합니다.

- **Path**: `agent_type: "student" | "professor"`

#### GET `/api/agents/session/{agent_type}/history`

에이전트 대화 이력을 조회합니다.

#### DELETE `/api/agents/session/{agent_type}`

에이전트 세션을 초기화합니다.

---

### 13. Gamification 모듈 — 게이미피케이션

#### GET `/api/me/tier`

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

#### GET `/api/me/badges`

본인의 뱃지 목록을 조회합니다.

- **응답**: `{ badges: [{ id, name, description, category, earned_at }] }`

#### GET `/api/tiers`

전체 티어 목록을 조회합니다.

- **응답**: `{ tiers: [{ id, name, min_exp, effects[] }] }`

---

### 14. Materials 모듈 — 교수자료

#### GET `/api/courses/{course_id}/materials`

자료 목록을 조회합니다.

- **응답**: `{ materials: CourseMaterial[] }`

#### POST `/api/courses/{course_id}/materials`

자료를 업로드합니다.

- **인가**: professor
- **Content-Type**: `multipart/form-data`
- **Body**: `file, title`
- **제한**: 50MB
- **응답 (201)**: `{ material: CourseMaterial }`

#### DELETE `/api/courses/{course_id}/materials/{material_id}`

자료를 삭제합니다.

- **인가**: professor
- **응답 (204)**: 없음

---

### 15. Messenger 모듈 — 메신저

#### GET `/api/messenger/total-unread`

전체 미읽 메시지 수를 조회합니다.

- **응답**: `{ unread_count: number }`

#### GET `/api/messenger/recent-course`

가장 최근 메시지가 있는 강의를 조회합니다.

- **응답**: `{ course_id: string }`

#### GET `/api/courses/{course_id}/messenger/unread-count`

강의별 미읽 메시지 수를 조회합니다.

#### GET `/api/courses/{course_id}/messenger/conversations`

대화 목록을 조회합니다.

- **응답**: `{ conversations: ConversationItem[] }`

#### GET `/api/courses/{course_id}/messenger/{partner_id}`

특정 상대와의 메시지 이력을 조회합니다.

- **처리**: 조회 시 상대방 메시지 읽음 처리 자동 수행
- **응답**: `{ messages: Message[] }`

#### POST `/api/courses/{course_id}/messenger/{partner_id}`

메시지를 전송합니다.

- **Body**: `{ content: string }`
- **응답 (201)**: `{ message: Message }`

---

### 16. Comments 모듈 — 노트 코멘트

#### GET `/api/notes/{note_id}/comments`

코멘트 목록을 조회합니다.

- **응답**: `{ comments: NoteComment[] }` (user_name, user_role, user_avatar_url 포함)

#### POST `/api/notes/{note_id}/comments`

코멘트를 작성합니다.

- **Body**: `{ content: string, block_index?: number, parent_id?: string }`
- **응답 (201)**: `{ comment: NoteComment }`

#### PATCH `/api/comments/{comment_id}`

코멘트를 수정합니다.

- **Body**: `{ content: string }`

#### DELETE `/api/comments/{comment_id}`

코멘트를 삭제합니다.

#### PATCH `/api/comments/{comment_id}/resolve`

코멘트를 해결/미해결로 토글합니다.

#### GET `/api/notes/{note_id}/comment-counts`

블록별 코멘트 수를 조회합니다.

- **응답**: `{ block_counts: { "0": 3, "5": 1 }, total: 10, unresolved: 4 }`

#### GET `/api/courses/{course_id}/notes/comment-summary`

강의 내 노트 코멘트 요약을 조회합니다.

#### GET `/api/courses/{course_id}/student-notes`

교수용 학생 노트 목록을 조회합니다.

- **인가**: professor
- **응답**: `{ students_with_notes: StudentWithNotes[] }`

---

### 17. Notifications 모듈 — 알림

#### GET `/api/notifications`

알림 목록을 조회합니다.

#### POST `/api/notifications/mark-read`

알림을 읽음 처리합니다.

#### GET `/api/messenger/total-unread`

전체 미읽 메시지 수를 조회합니다.

#### GET `/api/messenger/recent-course`

최근 메시지 강의를 조회합니다.

---

### 18. Events 모듈 — 캘린더

#### GET `/api/events`

이벤트 목록을 조회합니다.

#### POST `/api/events`

이벤트를 생성합니다.

- **Body**: `{ title: string, description?: string, event_date: string, end_date?: string, color?: string }`
- **응답 (201)**: `{ event }`

#### PATCH `/api/events/{event_id}`

이벤트를 수정합니다.

#### DELETE `/api/events/{event_id}`

이벤트를 삭제합니다.

#### GET `/api/calendar`

캘린더 데이터를 조회합니다 (이벤트 + 과제 마감일 통합).

- **Query**: `?year=2026&month=4`
- **응답**: `{ events[], deadlines[] }`

#### GET `/api/todos`

오늘의 할일을 조회합니다.

- **응답**: `{ todos: [{ type: "event"|"deadline", title, date, ... }] }`

---

### 19. Teams 모듈 — 팀

#### POST `/api/courses/{course_id}/teams`

팀을 생성합니다.

- **인가**: professor
- **Body**: `{ name: string, member_ids?: string[] }`
- **응답 (201)**: `{ team: Team }`

#### GET `/api/courses/{course_id}/teams`

팀 목록을 조회합니다.

- **응답**: `{ teams: Team[] }` (members 포함)

#### GET `/api/courses/{course_id}/teams/{team_id}`

팀 상세를 조회합니다.

#### PATCH `/api/courses/{course_id}/teams/{team_id}`

팀을 수정합니다 (멤버 추가/제거).

- **Body**: `{ name?, add_members?: string[], remove_members?: string[] }`

#### DELETE `/api/courses/{course_id}/teams/{team_id}`

팀을 삭제합니다.

---

### 20. Voting 모듈 — 팀 투표

#### POST `/api/assignments/{assignment_id}/vote`

제출 투표를 발의합니다.

- **인가**: 해당 팀 멤버
- **Body**: `{ submission_payload: object }` (제출할 코드/내용)
- **처리**:
  1. 이미 pending 투표 있으면 409 Conflict
  2. team_submission_votes INSERT (deadline=now+10분)
  3. 발의자 자동 approve
- **응답 (201)**: `{ vote, my_response, responses[], total_members }`

#### POST `/api/assignments/{assignment_id}/vote/{vote_id}/respond`

투표에 응답합니다.

- **Body**: `{ response: "approve" | "reject" }`
- **처리**: UPSERT (변경 가능), 자동 resolve 체크
- **자동 resolve 규칙**:
  1. 만장일치 approve → approved → 팀원 전원 submission 자동 생성
  2. 만장일치 reject → rejected
  3. 전원 투표 완료 → 과반수 결정
  4. deadline 초과 → 투표 참여자 기준 과반수 결정
- **응답**: `{ vote, my_response, responses[], total_members }`

#### GET `/api/assignments/{assignment_id}/vote/status`

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

### 21. Seed 모듈 — 시드 데이터

#### POST `/api/seed/reset`

테스트 데이터를 초기화하고 재생성합니다.

- **인가**: 테스트 계정만
- **처리**: 기존 데이터 삭제 → 교수/학생/강의/과제/제출물 등 더미 데이터 INSERT

#### GET `/api/seed/status`

시드 데이터 상태를 조회합니다.

---

### 22. 기타 엔드포인트

#### GET `/`

API 루트 정보를 반환합니다.

- **응답**: `{ message: "AI 교육 플랫폼 API", docs: "/docs" }`

#### GET `/health`

헬스 체크를 수행합니다.

- **응답**: `{ status: "ok", service: "ai-edu-platform" }`

#### GET `/api/token-stats`

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

#### POST `/api/token-stats/reset`

토큰 통계를 초기화합니다.

---

### 23. SSE 스트리밍 엔드포인트 목록

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


---


# 5. ERD — 데이터베이스 설계서


작성일: 2026-04-12  
버전: 1.0  
작성자: PikaBuddy 개발팀

---

### 1. 개요

PikaBuddy의 데이터베이스는 **Supabase (PostgreSQL)** 기반으로, 총 **27개 테이블**, **1개 함수**, **3개 트리거**로 구성됩니다. 모든 테이블에 **RLS(Row Level Security)**가 활성화되어 있으며, 실제 접근 제어는 백엔드 API 레벨에서 수행합니다.

#### 스키마 파일 구조

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

### 2. 테이블 전체 목록

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

### 3. 테이블 상세 스키마

#### 3.1 users — 사용자

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

#### 3.2 courses — 강의

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

#### 3.3 enrollments — 수강 등록

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

#### 3.4 assignments — 과제

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

#### 3.5 submissions — 제출물

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

#### 3.6 snapshots — 코드/글 작성 스냅샷

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

#### 3.7 ai_analyses — AI 분석 결과

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

#### 3.8 notes — 노트

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

#### 3.9 course_materials — 강의 자료

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

#### 3.10 user_exp — 사용자 경험치

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `user_id` | UUID | **PK**, FK → users(id) CASCADE | 사용자 (1:1) |
| `total_exp` | INT | NOT NULL, DEFAULT 0 | 총 경험치 |
| `tier` | VARCHAR(20) | NOT NULL, DEFAULT 'seed_iv' | 현재 티어 |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 갱신일시 |

**인덱스**: `idx_user_exp_tier` ON user_exp(tier)

**관계**: users와 **1:1** 관계 (user_id가 PK이자 FK)

---

#### 3.11 badges — 뱃지 정의

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

#### 3.12 user_badges — 사용자-뱃지 매핑

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `user_id` | UUID | NOT NULL, FK → users(id) CASCADE | 사용자 |
| `badge_id` | VARCHAR(50) | NOT NULL, FK → badges(id) | 뱃지 |
| `earned_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 획득일시 |

**복합 PK**: (user_id, badge_id)

---

#### 3.13 judge_results — 알고리즘 채점 결과

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

#### 3.14 ai_comments — AI 노트 코멘트

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

#### 3.15 exam_screenshots — 시험 스크린샷

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

#### 3.16 exam_violations — 시험 위반 기록

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

#### 3.17 exam_reset_logs — 시험 리셋 로그

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

#### 3.18 messages — 메신저 메시지

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

#### 3.19 note_comments — 노트 사용자 코멘트

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

#### 3.20 custom_categories — 커스텀 카테고리

AI 카테고리 자동 분류에 사용되는 사용자 정의 카테고리입니다.

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|-----------|------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 카테고리 고유 ID |
| `slug` | VARCHAR(100) | NOT NULL, UNIQUE | URL-safe 식별자 |
| `name` | VARCHAR(100) | NOT NULL | 표시명 |
| `keywords` | JSONB | NOT NULL, DEFAULT '[]' | 연관 키워드 배열 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일시 |

---

#### 3.21 note_manual_links — 노트 수동 링크

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

#### 3.22 teams — 팀

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

#### 3.23 team_members — 팀 멤버

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

#### 3.24 note_snapshots — 노트 스냅샷

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

#### 3.25 team_submission_votes — 팀 제출 투표

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

#### 3.26 team_vote_responses — 팀 투표 응답

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

#### 3.27 user_events — 사용자 캘린더 이벤트

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

### 4. 함수 및 트리거

#### 4.1 update_updated_at() 함수

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### 4.2 트리거 목록

| 트리거명 | 대상 테이블 | 이벤트 | 설명 |
|----------|------------|--------|------|
| `trg_users_updated_at` | users | BEFORE UPDATE | updated_at 자동 갱신 |
| `trg_notes_updated_at` | notes | BEFORE UPDATE | updated_at 자동 갱신 |
| `trg_note_comments_updated_at` | note_comments | BEFORE UPDATE | updated_at 자동 갱신 |

---

### 5. RLS (Row Level Security) 정책

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

### 6. 엔티티 관계 다이어그램 (텍스트)

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

### 7. 인덱스 전체 목록

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

### 8. 외래 키 관계 전체 맵

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

### 9. 마이그레이션 히스토리

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

### 10. 설계 특이사항

#### 10.1 자기 참조 (Self-Referencing)

| 테이블 | 컬럼 | 용도 |
|--------|------|------|
| notes | parent_id → notes(id) | 서브노트 계층 구조 (부모-자식) |
| note_comments | parent_id → note_comments(id) | 답글 스레드 |

#### 10.2 부분 인덱스 (Partial Index)

- `idx_courses_is_personal`: `WHERE is_personal = true` — 개인 강의 빠른 조회
- `idx_messages_unread`: `WHERE is_read = false` — 미읽 메시지 빠른 카운팅
- `idx_tsv_active_vote`: `WHERE status = 'pending'` — 진행 중 투표 유니크 보장

#### 10.3 GIN 인덱스

- `idx_notes_categories`: `USING GIN(categories)` — JSONB 배열 내 검색 최적화

#### 10.4 삭제 전략

- 대부분 **CASCADE**: 부모 삭제 시 자식 자동 삭제
- **SET NULL**: snapshots.submission_id, notes.parent_id, notes.team_id — 참조 무결성 유지하면서 부모 삭제 허용

---

*이 문서는 PikaBuddy 데이터베이스의 전체 스키마를 정의합니다. 테이블 간 관계와 제약 조건의 상세 내용을 담고 있습니다.*


---


# 6. UI/UX — 사용자 인터페이스 설계서


작성일: 2026-04-12  
버전: 1.0  
작성자: PikaBuddy 개발팀

---

### 1. 개요

#### 1.1 디자인 원칙

| 원칙 | 설명 |
|------|------|
| **학습 중심** | 학습 과정에 방해되지 않는 깔끔한 인터페이스 |
| **역할 기반** | 교수/학생/개인 역할에 따라 최적화된 화면 구성 |
| **실시간 피드백** | AI 분석 결과, 메시지, 알림을 즉시 반영 |
| **커스터마이징** | 테마, 이펙트, 배너를 통한 개인화 |
| **접근성** | 한국어 기본, Skeleton UI로 로딩 피드백, 에러 바운더리 |

#### 1.2 기술 스택

- **UI 프레임워크**: React 19 + TypeScript
- **스타일링**: CSS (App.css ~3,500줄, CSS 변수 기반 테마)
- **상태 관리**: Zustand (7개 스토어)
- **라우팅**: React Router v7 (27개 경로)
- **코드 분할**: React.lazy() + Suspense (27개 페이지)
- **에디터**: Tiptap v3 (리치 텍스트) + Monaco Editor (코드)
- **차트**: Recharts
- **그래프**: react-force-graph-2d + d3-force
- **드로잉**: Excalidraw

#### 1.3 페이지 수량 요약

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

### 2. 공통 레이아웃

#### 2.1 AppShell

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

#### 2.2 공통 컴포넌트

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

### 3. 페이지 상세 설계

#### 3.1 Landing — 랜딩 페이지

**경로**: `/`  
**역할**: 공개

**구성**:
- 히어로 섹션: 프로젝트 비전, CTA 버튼
- 기능 소개 섹션: 핵심 기능 카드 (코딩, 글쓰기, AI 분석, 노트, 그래프)
- Google 로그인 버튼 (Supabase Auth signInWithOAuth)
- 관리자 로그인 폼 (테스트용)

---

#### 3.2 AuthCallback — OAuth 콜백

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

#### 3.3 SelectRole — 역할 선택

**경로**: `/select-role`

**UI**: 3개 역할 카드 (교수/학생/개인 학습자)
- 각 카드에 역할 설명, 주요 기능 리스트
- 카드 클릭 → `/api/auth/role` 호출 → 홈으로 리디렉트

---

#### 3.4 ProfessorHome — 교수 대시보드

**경로**: `/professor`  
**역할**: professor

**구성**:
- 강의 카드 그리드 (강의명, 학생 수, 최근 활동)
- 강의 생성 모달 (제목, 설명, 학습 목표)
- 초대 코드 표시 (QR 코드 포함)
- 각 강의 → `CourseDetail`로 네비게이션

---

#### 3.5 StudentHome — 학생 대시보드

**경로**: `/student`  
**역할**: student

**구성**:
- **좌측**: 수강 강의 카드 리스트 + 강의 참가(초대 코드) 모달
- **우측 상단**: 캘린더 (월간 뷰, 이벤트 + 마감일 표시)
- **우측 하단**: 오늘의 할일 (투두 리스트)
- 메신저 바로가기 (미읽 뱃지 표시)

---

#### 3.6 PersonalHome — 개인 대시보드

**경로**: `/personal`  
**역할**: personal

**구성**:
- 개인 강의(is_personal=true) 카드
- 자유 과제 생성 버튼
- 노트, 그래프 바로가기
- AI 분석 요약

---

#### 3.7 CourseDetail — 강의 상세

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

#### 3.8 AssignmentDetail — 제출물 상세 (교수)

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

#### 3.9 CodeEditor — 코딩 과제 에디터

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

#### 3.10 WritingEditor — 글쓰기 과제 에디터

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

#### 3.11 QuizEditor — 퀴즈 에디터

**경로**: `/assignments/:assignmentId/quiz`

**구성**:
- 문제 목록 (좌측 네비게이션)
- 문제별 답안 입력:
  - 객관식: 라디오 버튼
  - 주관식: 텍스트 입력
- "제출 및 채점" 버튼 → `/api/editor/.../quiz-grade`
- 채점 결과 표시 (정답/오답, AI 피드백)

---

#### 3.12 NoteEditor — 노트 에디터

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

#### 3.13 NotesList — 노트 목록

**경로**: `/courses/:courseId/notes`

**구성**:
- 노트 카드 그리드 (제목, 수정일, 이해도 점수 뱃지)
- 검색 필터
- 카테고리 필터
- 새 노트 생성 버튼

---

#### 3.14 AllNotes — 통합 노트

**경로**: `/all-notes`

**구성**:
- 모든 강의의 노트 통합 표시
- 뷰 모드 전환: 카드 뷰 / 리스트 뷰
- 강의별 필터
- 검색 + 카테고리 필터

---

#### 3.15 NoteGraph — 지식 그래프

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

#### 3.16 AllNotesGraph — 통합 지식 그래프

**경로**: `/all-notes/graph`

NoteGraph와 동일한 UI이지만, 모든 강의의 노트를 통합 표시합니다.

---

#### 3.17 Dashboard — 교수 분석 대시보드

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

#### 3.18 StudentDetail — 학생 상세 분석

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

#### 3.19 StudentNotes — 학생 노트 열람

**경로**: `/courses/:courseId/student-notes`  
**역할**: professor

**구성**:
- 학생 목록 (좌측)
- 선택한 학생의 노트 목록 (우측)
- 노트 클릭 → NoteEditor (읽기 + 코멘트 작성 모드)
- 코멘트 수 뱃지 표시

---

#### 3.20 Messenger — 메신저

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

#### 3.21 TeamManager — 팀 관리

**경로**: `/courses/:courseId/teams`  
**역할**: professor

**구성**:
- 팀 생성 모달 (팀명 + 멤버 선택)
- 팀 카드 그리드 (팀명, 멤버 아바타 리스트)
- 팀 편집: 멤버 추가/제거
- 팀 삭제 (커스텀 confirm 모달)
- 팀 노트 바로가기

---

#### 3.22 Workspace — 멀티페인 작업공간

**경로**: `/courses/:courseId/workspace`

**구성**:
- 2-3개 패널을 나란히 배치
- 패널 유형: 노트 에디터, 코드 에디터, 그래프, 자료 뷰어
- 패널 크기 조절 (드래그 리사이즈)
- 다중 작업 지원

---

#### 3.23 Settings — 설정

**경로**: `/settings`

**탭 구성**:

| 탭 | 내용 |
|----|------|
| **프로필** | 이름, 학교, 학과, 학번, 자기소개, 소셜 링크 |
| **테마** | ThemePicker (프리셋 선택) + ThemeEditor (커스텀 CSS 변수) |
| **이펙트** | EffectsPanel (55종 이펙트 토글, 미리보기) |
| **계정** | 역할 전환, 로그아웃 |

---

#### 3.24 Profile — 공개 프로필

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

#### 3.25 JoinCourse — 강의 참가

**경로**: `/join/:inviteCode`

**구성**:
- 초대 코드에 해당하는 강의 정보 표시
- "참가하기" 버튼
- 이미 참가한 경우 강의 페이지로 리디렉트

---

#### 3.26 NotFound — 404

**경로**: `*`

- 404 안내 메시지
- 홈으로 돌아가기 버튼

---

### 4. 컴포넌트 상세

#### 4.1 BlockEditor (Tiptap 래퍼)

노트 에디터에서 사용하는 Tiptap 에디터 래퍼 컴포넌트입니다.

**포함 확장**:
- StarterKit (Heading, Bold, Italic, Strike, Code, Blockquote, BulletList, OrderedList, HardBreak)
- Underline, TextAlign, Color, Highlight, TextStyle, Typography
- Image, Table, TaskList, TaskItem
- Subscript, Superscript
- Placeholder
- **커스텀 10종**: Slash, BlockHandle, Callout, Toggle, Math, Excalidraw, NoteLink, SubNote, Citation, AIPolished

#### 4.2 TeamVotePanel

팀 과제 제출 투표 UI 컴포넌트입니다.

**상태별 UI**:
| 상태 | UI |
|------|---|
| 투표 없음 | "제출 투표 시작" 버튼 |
| pending + 미투표 | "승인" / "거부" 버튼 + 투표 현황 |
| pending + 이미 투표 | 대기 상태 + 팀원 투표 현황 + 데드라인 카운트다운 |
| approved | "팀 제출 완료!" 성공 메시지 |
| rejected | "투표 부결" + 재투표 버튼 |

#### 4.3 ExamProctorPanel

시험 감독 패널 컴포넌트입니다.

**기능**:
- 위반 횟수 표시 (현재/최대)
- 스크린샷 캡처 상태 표시
- 전체화면 상태 감시
- 위반 초과 시 시험 종료 경고

#### 4.4 CommentsPanel + BlockCommentOverlay

노트 코멘트 시스템 UI입니다.

- **CommentsPanel**: 전체 코멘트 목록, 스레드 뷰, 해결 토글
- **BlockCommentOverlay**: 에디터 블록 우측에 코멘트 아이콘 오버레이
- **CommentThread**: 답글이 포함된 코멘트 스레드
- **CommentItem**: 개별 코멘트 (작성자, 시간, 내용, 수정/삭제/해결)

---

### 5. 테마 시스템

#### 5.1 CSS 변수 기반 테마

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

#### 5.2 프리셋 테마

다양한 사전 정의 테마를 제공합니다 (라이트/다크/커스텀).

#### 5.3 시각 이펙트 (55종)

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

### 6. 사용자 흐름 (User Flow)

#### 6.1 학생 — 코딩 과제 수행 흐름

```
StudentHome → CourseDetail → "과제 시작" →
  CodeEditor → 코드 작성 (자동 스냅샷) →
    AI 튜터 질문 (선택) →
  "실행" → 결과 확인 →
  "제출" → AI 분석 대기 (SSE) →
  피드백 확인 → CourseDetail (제출 완료 표시)
```

#### 6.2 교수 — 학생 분석 흐름

```
ProfessorHome → CourseDetail → "대시보드" →
  Dashboard (학급 개요) →
    학생 클릭 → StudentDetail (상세 분석) →
      "제출물 보기" → AssignmentDetail (스냅샷 diff) →
    "노트 열람" → StudentNotes → NoteEditor (코멘트 작성)
```

#### 6.3 팀 과제 제출 흐름

```
CodeEditor (팀 과제) →
  "제출 투표 시작" → TeamVotePanel →
    팀원에게 투표 알림 (Realtime) →
  팀원들 투표 (approve/reject) →
    만장일치 approve → 전원 자동 제출 ✅
    데드라인 초과 → 과반수 결정
```

---

### 7. 반응형 및 접근성

#### 7.1 반응형 설계

- 최소 지원 해상도: 1024×768
- 권장 해상도: 1280×720 이상
- 사이드바: 접기/펼치기 지원
- 에디터: 문제 패널 접기 지원

#### 7.2 접근성

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


---


# 7. INFRA — 인프라 및 배포 문서


작성일: 2026-04-12  
버전: 1.0  
작성자: PikaBuddy 개발팀

---

### 1. 인프라 아키텍처 개요

#### 1.1 전체 구성도

```
                   인터넷
                     │
                     ▼
         ┌───────────────────────┐
         │   Cloudflare CDN      │ ← 프론트엔드 정적 파일
         │   pikabuddy.com       │   (React SPA, JS/CSS/이미지)
         │   DNS + SSL + Cache   │
         └───────────┬───────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
    ▼                ▼                ▼
┌────────┐   ┌──────────────┐   ┌──────────┐
│Supabase│   │  AWS EC2     │   │Cloudflare│
│ Auth   │   │ 3.26.183.153 │   │    R2    │
│(OAuth) │   │              │   │ (파일)   │
└────────┘   │ ┌──────────┐ │   └──────────┘
             │ │  Docker   │ │
             │ │ Compose   │ │
             │ │           │ │
             │ │ ┌───────┐ │ │
             │ │ │ Nginx │ │ │
             │ │ │ :80   │ │ │
             │ │ │ :443  │ │ │
             │ │ └───┬───┘ │ │
             │ │     │     │ │
             │ │ ┌───▼───┐ │ │
             │ │ │FastAPI│ │ │
             │ │ │ :8000 │ │ │
             │ │ │4 wkrs │ │ │
             │ │ └───────┘ │ │
             │ └──────────┘ │
             └──────────────┘
                     │
                     ▼
             ┌──────────────┐
             │   Supabase    │
             │  PostgreSQL   │
             │  (클라우드)    │
             │  + Realtime   │
             └──────────────┘
```

#### 1.2 서비스 매핑

| 서비스 | 호스팅 | 역할 |
|--------|--------|------|
| **프론트엔드** | Cloudflare Pages/CDN | React SPA 정적 배포 |
| **백엔드 API** | AWS EC2 (Docker) | FastAPI REST API |
| **웹 서버** | EC2 Docker (Nginx) | 리버스 프록시, SSL, gzip |
| **데이터베이스** | Supabase Cloud | PostgreSQL + Realtime |
| **인증** | Supabase Auth | Google OAuth 2.0 |
| **파일 스토리지** | Cloudflare R2 | 스크린샷, 자료, 아바타 |
| **AI 서비스** | Google Gemini API | AI 분석, 튜터, 에이전트 |
| **DNS** | Cloudflare | 도메인 관리 |

---

### 2. 서버 사양

#### 2.1 현재 운영 환경

| 항목 | 사양 |
|------|------|
| **인스턴스 유형** | AWS EC2 c7i-flex.large |
| **vCPU** | 2 |
| **메모리** | 4 GB |
| **네트워크** | 최대 12.5 Gbps |
| **스토리지** | EBS gp3 |
| **OS** | Ubuntu 22.04 LTS |
| **IP** | 3.26.183.153 |
| **도메인** | pikabuddy.com |

#### 2.2 권장 사양 (공모전/프로덕션)

| 용도 | 인스턴스 | vCPU | RAM | 비용 (월) |
|------|---------|------|-----|-----------|
| 공모전 | t3.xlarge | 4 | 16 GB | ~$78 |
| 스타트업 | c7i.xlarge | 4 | 8 GB | ~$100 |
| 스케일업 | ECS Fargate | 자동 | 자동 | 사용량 기반 |

---

### 3. Docker 구성

#### 3.1 Dockerfile (백엔드)

```dockerfile
FROM python:3.12-slim

WORKDIR /app

## 코드 실행에 필요한 컴파일러/런타임 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    default-jdk \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**이미지 구성 요소**:

| 구성 요소 | 용도 |
|----------|------|
| python:3.12-slim | Python 런타임 (FastAPI, AI SDK) |
| gcc | C 언어 코드 컴파일 |
| g++ | C++ 코드 컴파일 |
| default-jdk | Java 컴파일/실행 (javac + java) |
| nodejs + npm | JavaScript 코드 실행 (node) |

> **참고**: C#(mcs/mono), Swift, Rust, Go 런타임은 추가 설치가 필요합니다. 현재 Docker 이미지에는 포함되어 있지 않으며, 해당 언어 실행 시 런타임 에러가 발생할 수 있습니다.

#### 3.2 Docker Compose

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
    restart: unless-stopped

  api:
    build: ./backend
    command: >
      uvicorn main:app
      --host 0.0.0.0
      --port 8000
      --workers 4
      --limit-concurrency 100
      --timeout-keep-alive 30
    env_file: ./backend/.env
    expose:
      - "8000"
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 4G
```

**서비스 설명**:

| 서비스 | 이미지 | 포트 | 역할 |
|--------|--------|------|------|
| `nginx` | nginx:alpine | 80, 443 (호스트) | 리버스 프록시, SSL 종단, gzip |
| `api` | 커스텀 빌드 | 8000 (내부) | FastAPI 백엔드 |

**Uvicorn 설정**:

| 파라미터 | 값 | 설명 |
|----------|---|------|
| `--workers` | 4 | 워커 프로세스 수 (CPU 코어 × 2) |
| `--limit-concurrency` | 100 | 최대 동시 요청 수 |
| `--timeout-keep-alive` | 30 | Keep-alive 타임아웃 (초) |

**리소스 제한**:
- 메모리: 4GB 상한 (OOM 방지)

---

### 4. Nginx 구성

#### 4.1 전체 설정

```nginx
events {
    worker_connections 1024;
}

http {
    # gzip 압축
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 4;
    gzip_min_length 256;
    gzip_types
        text/plain text/css text/javascript
        application/json application/javascript application/xml
        application/xml+rss text/event-stream image/svg+xml;

    # 파일 업로드 제한
    client_max_body_size 50m;

    # Keep-alive
    keepalive_timeout 65;

    upstream api {
        server api:8000;
        keepalive 16;  # 연결 재사용 풀
    }
}
```

#### 4.2 gzip 압축 설정

| 파라미터 | 값 | 설명 |
|----------|---|------|
| `gzip_comp_level` | 4 | 압축 레벨 (1-9, CPU와 압축률 균형) |
| `gzip_min_length` | 256 | 256바이트 이하 응답은 압축 안 함 |
| `gzip_types` | 12종 MIME | JSON, JS, CSS, SSE 등 압축 대상 |
| `gzip_proxied` | any | 프록시 응답도 압축 |

#### 4.3 SSL/TLS 설정

```nginx
ssl_certificate /etc/nginx/ssl/fullchain.pem;
ssl_certificate_key /etc/nginx/ssl/privkey.pem;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
```

- Let's Encrypt 인증서 사용
- TLS 1.2 이상만 허용
- 취약한 암호 스위트 차단

#### 4.4 SSE (Server-Sent Events) 지원

```nginx
proxy_buffering off;        # 버퍼링 비활성화 (실시간 스트리밍)
proxy_cache off;            # 캐시 비활성화
proxy_set_header Connection '';  # Connection 헤더 제거
proxy_http_version 1.1;     # HTTP/1.1 사용
chunked_transfer_encoding off;
proxy_read_timeout 86400s;  # 24시간 읽기 타임아웃 (장시간 SSE)
```

#### 4.5 서버 블록 구조

| 서버 | 포트 | 용도 |
|------|------|------|
| HTTP 리디렉트 | 80 | HTTP → HTTPS 301 리디렉트 |
| HTTPS 프로덕션 | 443 | SSL + 리버스 프록시 |
| 개발용 | 80 (default) | SSL 없이 직접 프록시 |

---

### 5. 프론트엔드 빌드 및 배포

#### 5.1 Vite 설정

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'blockly/core',
      'blockly/blocks',
      'blockly/python',
      'blockly/javascript',
    ],
  },
})
```

#### 5.2 빌드 프로세스

```bash
cd frontend
npm install
npm run build  # → dist/ 폴더에 정적 파일 생성
```

**빌드 최적화**:
- Vite 코드 분할 (27개 lazy-loaded 페이지)
- Tree Shaking (미사용 코드 제거)
- Minification (JS/CSS 압축)
- Asset hashing (캐시 무효화)

#### 5.3 배포

빌드된 `dist/` 폴더를 Cloudflare Pages 또는 CDN에 배포합니다.

| 방법 | 설명 |
|------|------|
| Cloudflare Pages | Git push 시 자동 빌드/배포 |
| 수동 배포 | `dist/` 폴더를 CDN에 업로드 |

#### 5.4 환경 변수 (프론트엔드)

```
VITE_API_URL=https://pikabuddy.com
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

---

### 6. 백엔드 환경 변수

#### 6.1 필수 환경 변수

| 변수명 | 용도 | 예시 |
|--------|------|------|
| `SUPABASE_URL` | Supabase 프로젝트 URL | `https://xxx.supabase.co` |
| `SUPABASE_KEY` | Supabase anon key | `eyJ...` |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | `eyJ...` |
| `GEMINI_API_KEY` | Google Gemini API 키 | `AIza...` |
| `CORS_ORIGINS` | 허용 도메인 (콤마 구분) | `https://pikabuddy.com,http://localhost:5173` |
| `R2_ACCOUNT_ID` | Cloudflare 계정 ID | `xxx` |
| `R2_ACCESS_KEY_ID` | R2 접근 키 | `xxx` |
| `R2_SECRET_ACCESS_KEY` | R2 시크릿 키 | `xxx` |
| `R2_BUCKET_NAME` | R2 버킷명 | `pikabuddy` |

#### 6.2 선택적 환경 변수

| 변수명 | 용도 | 기본값 |
|--------|------|--------|
| `APP_ENV` | 환경 구분 | `development` |
| `DEBUG` | 디버그 모드 | `True` |
| `studentAdminId` | 학생 관리자 계정 ID | - |
| `studentAdminPassword` | 학생 관리자 비밀번호 | - |
| `teacherAdminId` | 교수 관리자 계정 ID | - |
| `teacherAdminPassword` | 교수 관리자 비밀번호 | - |

#### 6.3 환경 변수 관리

- `.env` 파일로 관리 (`.gitignore`에 포함)
- Docker: `--env-file` 또는 `env_file` 옵션으로 전달
- Pydantic Settings가 `.env` 파일을 자동 로드

---

### 7. 데이터베이스 인프라

#### 7.1 Supabase 구성

| 항목 | 상세 |
|------|------|
| 서비스 | Supabase (관리형 PostgreSQL) |
| 버전 | PostgreSQL 15+ |
| 리전 | 자동 (Supabase Cloud) |
| 접속 | Supabase Python SDK (REST API) |
| 인증 | Service Role Key (백엔드 전용) |

#### 7.2 데이터베이스 규모

| 항목 | 수치 |
|------|------|
| 테이블 | 27개 |
| 인덱스 | 51개 |
| 함수 | 1개 |
| 트리거 | 3개 |
| 외래 키 | 50개 |

#### 7.3 마이그레이션 전략

SQL 파일 기반 증분 마이그레이션:

```
supabase/
├── schema.sql                      # 기본 스키마 (16 테이블)
├── add_exam_proctoring.sql         # 시험 감독
├── add_exam_reset_logs.sql         # 시험 리셋 로그
├── add_generation_status.sql       # 과제 생성 상태
├── add_messenger.sql               # 메신저
├── add_note_comments.sql           # 노트 코멘트
├── add_note_categories.sql         # 노트 카테고리
├── add_note_manual_links.sql       # 노트 수동 링크
├── add_teams_and_note_snapshots.sql # 팀 + 투표 + 노트 스냅샷
├── add_user_events.sql             # 캘린더 이벤트
└── add_course_banner.sql           # 강의 배너
```

**마이그레이션 적용**:
1. Supabase 대시보드 SQL 에디터에서 실행
2. 각 마이그레이션은 `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` 패턴으로 멱등성 보장

#### 7.4 백업

- Supabase 관리형 자동 백업 (Point-in-time Recovery)
- WAL (Write-Ahead Logging) 기반

---

### 8. 파일 스토리지 (Cloudflare R2)

#### 8.1 구성

| 항목 | 상세 |
|------|------|
| 서비스 | Cloudflare R2 (S3 호환) |
| 버킷 | `pikabuddy` |
| 접근 방식 | boto3 (S3 API) |
| CDN | Cloudflare 자동 통합 |

#### 8.2 저장 데이터 유형

| 유형 | 경로 패턴 | 용도 |
|------|-----------|------|
| 아바타 | `avatars/{user_id}/{filename}` | 프로필 이미지 |
| 배너 | `banners/{user_id}/{filename}` | 프로필/강의 배너 |
| 시험 스크린샷 | `exams/{assignment_id}/{student_id}/{timestamp}.jpg` | 시험 감독 캡처 |
| 교수 자료 | `materials/{course_id}/{filename}` | 강의 자료 파일 |

#### 8.3 R2 클라이언트 구성

```python
## common/r2_client.py
import boto3

def get_r2_client():
    return boto3.client(
        's3',
        endpoint_url=f'https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com',
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        region_name='auto'
    )
```

---

### 9. 외부 서비스 의존성

#### 9.1 Google Gemini API

| 항목 | 상세 |
|------|------|
| SDK | google-generativeai 0.8.3 |
| 모델 (주력) | gemini-2.5-flash |
| 모델 (경량) | gemini-2.5-flash-lite |
| 폴백 체인 | 2.5-flash → 2.0-flash → 2.5-flash-lite |
| 임베딩 모델 | text-embedding-004 (768차원) |
| 요금 | 입력 $0.10-0.30/1M tokens, 출력 $0.40-2.50/1M tokens |
| 모니터링 | `/api/token-stats` 내장 추적 |

#### 9.2 Supabase Auth

| 항목 | 상세 |
|------|------|
| OAuth 제공자 | Google |
| 토큰 형식 | JWT (access_token + refresh_token) |
| 세션 관리 | Supabase Auth 자동 |

#### 9.3 Supabase Realtime

| 항목 | 상세 |
|------|------|
| 프로토콜 | WebSocket |
| 사용 기능 | postgres_changes (INSERT 이벤트 구독) |
| 활용 | 메신저 실시간 수신, 알림, 투표 상태 변경 |

---

### 10. 보안 인프라

#### 10.1 네트워크 보안

| 계층 | 보안 조치 |
|------|----------|
| DNS/CDN | Cloudflare DDoS 방어, WAF |
| 전송 | TLS 1.2+ (Nginx SSL + Cloudflare SSL) |
| API | CORS 명시적 도메인 제한 |
| DB | Supabase RLS + Service Key 접근 제한 |

#### 10.2 인증/인가

| 계층 | 구현 |
|------|------|
| 인증 | Supabase Auth (Google OAuth 2.0 JWT) |
| 인가 | FastAPI Depends (역할 기반) |
| 세션 | JWT 토큰 (만료 시 재인증) |

#### 10.3 코드 실행 격리

| 조치 | 상세 |
|------|------|
| 컨테이너 격리 | Docker 내에서 subprocess 실행 |
| 위험 패턴 차단 | 언어별 블랙리스트 (os.system, fork 등) |
| 타임아웃 | 5초 × 언어별 배율 |
| 메모리 제한 | Docker memory: 4G |
| 임시 파일 정리 | 실행 후 tmpdir 자동 삭제 |

#### 10.4 시크릿 관리

| 시크릿 | 저장 위치 | 접근 |
|--------|----------|------|
| API 키 (Gemini, R2) | .env 파일 | 백엔드만 |
| Supabase Service Key | .env 파일 | 백엔드만 |
| Supabase Anon Key | 환경 변수 | 프론트엔드 (공개) |
| SSL 인증서 | nginx/ssl/ | Nginx만 |

---

### 11. 배포 프로세스

#### 11.1 현재 배포 방법 (수동)

##### 백엔드 배포

```bash
## EC2 서버에서 실행
cd /home/ubuntu/pikabuddy

## 1. 최신 코드 pull
git pull origin develop

## 2. 기존 컨테이너 중지 및 삭제
sudo docker stop backend && sudo docker rm backend

## 3. Docker 이미지 빌드
sudo docker build -t backend ./backend

## 4. 컨테이너 실행
sudo docker run -d \
  --name backend \
  -p 80:8000 \
  --env-file ./backend/.env \
  backend
```

> **참고**: Docker Compose를 사용할 경우:
> ```bash
> sudo docker compose down
> sudo docker compose up -d --build
> ```

##### 프론트엔드 배포

```bash
cd frontend
npm install
npm run build
## dist/ 폴더를 Cloudflare Pages 또는 CDN에 배포
```

#### 11.2 Docker Compose 배포 (Nginx 포함)

```bash
## 전체 스택 배포
sudo docker compose up -d --build

## 로그 확인
sudo docker compose logs -f api
sudo docker compose logs -f nginx

## 상태 확인
sudo docker compose ps
```

#### 11.3 롤백 절차

```bash
## 이전 커밋으로 되돌리기
git log --oneline -5  # 이전 커밋 해시 확인
git checkout <commit_hash>

## 재빌드 및 재시작
sudo docker compose down
sudo docker compose up -d --build
```

---

### 12. 모니터링 및 로깅

#### 12.1 현재 구현

| 항목 | 상태 | 상세 |
|------|------|------|
| 헬스 체크 | ✅ 구현됨 | `GET /health` |
| AI 토큰 추적 | ✅ 구현됨 | `GET /api/token-stats` |
| Docker 로그 | ✅ 기본 | `docker logs backend` |
| 서버 모니터링 | ❌ 미구현 | Prometheus/Grafana 예정 |
| API 메트릭 | ❌ 미구현 | 응답 시간/에러율 추적 예정 |
| 알림 | ❌ 미구현 | Slack/Email 알림 예정 |

#### 12.2 향후 모니터링 계획

| 도구 | 용도 | 우선순위 |
|------|------|---------|
| **Prometheus** | 서버 메트릭 수집 (CPU, RAM, 디스크) | 높음 |
| **Grafana** | 메트릭 시각화 대시보드 | 높음 |
| **FastAPI Middleware** | API 응답 시간, 에러율, 요청 수 | 중간 |
| **Sentry** | 에러 트래킹, 스택트레이스 | 중간 |
| **CloudWatch** | EC2 인스턴스 모니터링 | 낮음 |

---

### 13. CI/CD (향후)

#### 13.1 현재 상태

CI/CD 파이프라인은 아직 구성되어 있지 않습니다. 현재 수동 배포로 운영 중입니다.

#### 13.2 계획된 파이프라인

```
Git Push (develop)
     │
     ▼
GitHub Actions
     ├── 린트 + 타입 체크 (프론트엔드)
     ├── pytest (백엔드)
     │
     ▼ (main 머지 시)
     ├── Docker 이미지 빌드
     ├── ECR/DockerHub 이미지 푸시
     │
     ▼
배포
     ├── 프론트엔드: Cloudflare Pages 자동 배포
     └── 백엔드: EC2 SSH → docker pull → docker compose up
```

#### 13.3 계획된 GitHub Actions 워크플로우

```yaml
## .github/workflows/deploy.yml (예정)
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Backend tests
        run: |
          cd backend
          pip install -r requirements.txt
          pytest

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build frontend
        run: |
          cd frontend
          npm ci
          npm run build
      - name: Deploy to Cloudflare Pages
        # Cloudflare Pages Action

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: SSH Deploy
        # EC2 SSH → git pull → docker compose up -d --build
```

---

### 14. 확장 전략

#### 14.1 수직 확장 (Scale Up)

현재 c7i-flex.large (2 vCPU, 4GB) → 권장 인스턴스:

| 시나리오 | 인스턴스 | 사양 | 비용/월 |
|---------|---------|------|---------|
| 공모전 | t3.xlarge | 4 vCPU, 16GB | ~$78 |
| 소규모 서비스 | c7i.xlarge | 4 vCPU, 8GB | ~$100 |
| 중규모 서비스 | c7i.2xlarge | 8 vCPU, 16GB | ~$200 |

#### 14.2 수평 확장 (Scale Out)

```
                      Load Balancer (ALB)
                     ╱        │        ╲
              ┌─────┐   ┌─────┐   ┌─────┐
              │EC2-1│   │EC2-2│   │EC2-3│
              │(API)│   │(API)│   │(API)│
              └─────┘   └─────┘   └─────┘
                     ╲        │        ╱
                      Supabase PostgreSQL
```

- AWS ALB (Application Load Balancer) 추가
- 동일 Docker 이미지로 여러 EC2 인스턴스 운영
- Supabase PostgreSQL은 단일 클러스터 (자동 스케일링)

#### 14.3 컨테이너 오케스트레이션 (향후)

| 옵션 | 장점 | 복잡도 |
|------|------|--------|
| **ECS Fargate** | 서버리스, 자동 스케일링, AWS 통합 | 중간 |
| **Kubernetes (EKS)** | 완전한 컨테이너 오케스트레이션 | 높음 |
| **Docker Swarm** | 간단한 멀티노드 배포 | 낮음 |

---

### 15. 성능 튜닝

#### 15.1 현재 적용된 최적화

| 영역 | 최적화 | 효과 |
|------|--------|------|
| **Nginx gzip** | level 4, 12종 MIME | 응답 크기 60-80% 감소 |
| **Nginx keepalive** | upstream 16, timeout 65s | 연결 재사용, 레이턴시 감소 |
| **Uvicorn workers** | 4 workers | CPU 코어 활용, 병렬 처리 |
| **Uvicorn concurrency** | limit 100 | 과부하 방지 |
| **React Lazy** | 27개 페이지 분할 | 초기 로드 시간 감소 |
| **DB 인덱스** | 51개 (Composite, Partial, GIN) | 쿼리 성능 최적화 |
| **Cloudflare CDN** | 정적 파일 캐시 | 글로벌 레이턴시 감소 |

#### 15.2 추가 가능한 최적화

| 최적화 | 효과 | 우선순위 |
|--------|------|---------|
| Redis 캐시 | API 응답 캐싱, 세션 캐시 | 높음 |
| DB 커넥션 풀 | 연결 재사용, 오버헤드 감소 | 중간 |
| CDN 이미지 최적화 | WebP 자동 변환, 리사이즈 | 중간 |
| HTTP/2 | 멀티플렉싱, 서버 푸시 | 낮음 |

---

### 16. 장애 대응

#### 16.1 장애 시나리오 및 대응

| 장애 | 영향 | 대응 |
|------|------|------|
| EC2 다운 | 백엔드 전체 불가 | EC2 재시작, Docker Compose up |
| Gemini API 장애 | AI 기능 불가 | 3단계 폴백 자동 전환 |
| Supabase 장애 | DB 전체 불가 | Supabase 상태 확인, 대기 |
| R2 장애 | 파일 업로드/조회 불가 | Cloudflare 상태 확인, 대기 |
| Docker OOM | 컨테이너 크래시 | `restart: unless-stopped`로 자동 재시작 |
| SSL 인증서 만료 | HTTPS 불가 | Let's Encrypt 갱신 |

#### 16.2 복구 명령어

```bash
## 컨테이너 상태 확인
sudo docker ps -a

## 로그 확인
sudo docker logs backend --tail 100

## 컨테이너 재시작
sudo docker restart backend

## 전체 재배포
sudo docker compose down && sudo docker compose up -d --build

## 디스크 정리
sudo docker system prune -f
```

---

### 17. 비용 분석

#### 17.1 현재 월간 비용 (예상)

| 서비스 | 비용/월 | 비고 |
|--------|---------|------|
| AWS EC2 (c7i-flex.large) | ~$42 | 온디맨드 기준 |
| Supabase | $0-25 | Free/Pro 플랜 |
| Cloudflare (CDN + R2) | ~$5 | R2 스토리지 사용량 기반 |
| Google Gemini API | ~$5-20 | 토큰 사용량 기반 |
| 도메인 (pikabuddy.com) | ~$1 | 연간 기준 분배 |
| **합계** | **~$53-93** | |

#### 17.2 스케일업 시 비용

| 시나리오 | 인스턴스 | Supabase | AI | 합계/월 |
|---------|---------|----------|-----|---------|
| 공모전 (100명) | $78 (t3.xlarge) | $25 (Pro) | $20 | ~$125 |
| 소규모 서비스 (500명) | $100 (c7i.xlarge) | $25 | $50 | ~$180 |
| 중규모 서비스 (2000명) | $200+ (ALB+다중) | $75+ | $200+ | ~$500+ |

---

*이 문서는 PikaBuddy의 인프라 아키텍처와 배포 환경을 정의합니다. 시스템 설계 상세는 03_TDD.md를, 데이터베이스 상세는 05_ERD.md를 참조하세요.*


---

*— End of Document —*
