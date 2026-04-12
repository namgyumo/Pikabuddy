# PikaBuddy — Infrastructure Document

작성일: 2026-04-12  
버전: 1.0  
작성자: PikaBuddy 개발팀

---

## 1. 인프라 아키텍처 개요

### 1.1 전체 구성도

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

### 1.2 서비스 매핑

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

## 2. 서버 사양

### 2.1 현재 운영 환경

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

### 2.2 권장 사양 (공모전/프로덕션)

| 용도 | 인스턴스 | vCPU | RAM | 비용 (월) |
|------|---------|------|-----|-----------|
| 공모전 | t3.xlarge | 4 | 16 GB | ~$78 |
| 스타트업 | c7i.xlarge | 4 | 8 GB | ~$100 |
| 스케일업 | ECS Fargate | 자동 | 자동 | 사용량 기반 |

---

## 3. Docker 구성

### 3.1 Dockerfile (백엔드)

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# 코드 실행에 필요한 컴파일러/런타임 설치
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

### 3.2 Docker Compose

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

## 4. Nginx 구성

### 4.1 전체 설정

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

### 4.2 gzip 압축 설정

| 파라미터 | 값 | 설명 |
|----------|---|------|
| `gzip_comp_level` | 4 | 압축 레벨 (1-9, CPU와 압축률 균형) |
| `gzip_min_length` | 256 | 256바이트 이하 응답은 압축 안 함 |
| `gzip_types` | 12종 MIME | JSON, JS, CSS, SSE 등 압축 대상 |
| `gzip_proxied` | any | 프록시 응답도 압축 |

### 4.3 SSL/TLS 설정

```nginx
ssl_certificate /etc/nginx/ssl/fullchain.pem;
ssl_certificate_key /etc/nginx/ssl/privkey.pem;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
```

- Let's Encrypt 인증서 사용
- TLS 1.2 이상만 허용
- 취약한 암호 스위트 차단

### 4.4 SSE (Server-Sent Events) 지원

```nginx
proxy_buffering off;        # 버퍼링 비활성화 (실시간 스트리밍)
proxy_cache off;            # 캐시 비활성화
proxy_set_header Connection '';  # Connection 헤더 제거
proxy_http_version 1.1;     # HTTP/1.1 사용
chunked_transfer_encoding off;
proxy_read_timeout 86400s;  # 24시간 읽기 타임아웃 (장시간 SSE)
```

### 4.5 서버 블록 구조

| 서버 | 포트 | 용도 |
|------|------|------|
| HTTP 리디렉트 | 80 | HTTP → HTTPS 301 리디렉트 |
| HTTPS 프로덕션 | 443 | SSL + 리버스 프록시 |
| 개발용 | 80 (default) | SSL 없이 직접 프록시 |

---

## 5. 프론트엔드 빌드 및 배포

### 5.1 Vite 설정

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

### 5.2 빌드 프로세스

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

### 5.3 배포

빌드된 `dist/` 폴더를 Cloudflare Pages 또는 CDN에 배포합니다.

| 방법 | 설명 |
|------|------|
| Cloudflare Pages | Git push 시 자동 빌드/배포 |
| 수동 배포 | `dist/` 폴더를 CDN에 업로드 |

### 5.4 환경 변수 (프론트엔드)

```
VITE_API_URL=https://pikabuddy.com
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

---

## 6. 백엔드 환경 변수

### 6.1 필수 환경 변수

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

### 6.2 선택적 환경 변수

| 변수명 | 용도 | 기본값 |
|--------|------|--------|
| `APP_ENV` | 환경 구분 | `development` |
| `DEBUG` | 디버그 모드 | `True` |
| `studentAdminId` | 학생 관리자 계정 ID | - |
| `studentAdminPassword` | 학생 관리자 비밀번호 | - |
| `teacherAdminId` | 교수 관리자 계정 ID | - |
| `teacherAdminPassword` | 교수 관리자 비밀번호 | - |

### 6.3 환경 변수 관리

- `.env` 파일로 관리 (`.gitignore`에 포함)
- Docker: `--env-file` 또는 `env_file` 옵션으로 전달
- Pydantic Settings가 `.env` 파일을 자동 로드

---

## 7. 데이터베이스 인프라

### 7.1 Supabase 구성

| 항목 | 상세 |
|------|------|
| 서비스 | Supabase (관리형 PostgreSQL) |
| 버전 | PostgreSQL 15+ |
| 리전 | 자동 (Supabase Cloud) |
| 접속 | Supabase Python SDK (REST API) |
| 인증 | Service Role Key (백엔드 전용) |

### 7.2 데이터베이스 규모

| 항목 | 수치 |
|------|------|
| 테이블 | 27개 |
| 인덱스 | 51개 |
| 함수 | 1개 |
| 트리거 | 3개 |
| 외래 키 | 50개 |

### 7.3 마이그레이션 전략

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

### 7.4 백업

- Supabase 관리형 자동 백업 (Point-in-time Recovery)
- WAL (Write-Ahead Logging) 기반

---

## 8. 파일 스토리지 (Cloudflare R2)

### 8.1 구성

| 항목 | 상세 |
|------|------|
| 서비스 | Cloudflare R2 (S3 호환) |
| 버킷 | `pikabuddy` |
| 접근 방식 | boto3 (S3 API) |
| CDN | Cloudflare 자동 통합 |

### 8.2 저장 데이터 유형

| 유형 | 경로 패턴 | 용도 |
|------|-----------|------|
| 아바타 | `avatars/{user_id}/{filename}` | 프로필 이미지 |
| 배너 | `banners/{user_id}/{filename}` | 프로필/강의 배너 |
| 시험 스크린샷 | `exams/{assignment_id}/{student_id}/{timestamp}.jpg` | 시험 감독 캡처 |
| 교수 자료 | `materials/{course_id}/{filename}` | 강의 자료 파일 |

### 8.3 R2 클라이언트 구성

```python
# common/r2_client.py
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

## 9. 외부 서비스 의존성

### 9.1 Google Gemini API

| 항목 | 상세 |
|------|------|
| SDK | google-generativeai 0.8.3 |
| 모델 (주력) | gemini-2.5-flash |
| 모델 (경량) | gemini-2.5-flash-lite |
| 폴백 체인 | 2.5-flash → 2.0-flash → 2.5-flash-lite |
| 임베딩 모델 | text-embedding-004 (768차원) |
| 요금 | 입력 $0.10-0.30/1M tokens, 출력 $0.40-2.50/1M tokens |
| 모니터링 | `/api/token-stats` 내장 추적 |

### 9.2 Supabase Auth

| 항목 | 상세 |
|------|------|
| OAuth 제공자 | Google |
| 토큰 형식 | JWT (access_token + refresh_token) |
| 세션 관리 | Supabase Auth 자동 |

### 9.3 Supabase Realtime

| 항목 | 상세 |
|------|------|
| 프로토콜 | WebSocket |
| 사용 기능 | postgres_changes (INSERT 이벤트 구독) |
| 활용 | 메신저 실시간 수신, 알림, 투표 상태 변경 |

---

## 10. 보안 인프라

### 10.1 네트워크 보안

| 계층 | 보안 조치 |
|------|----------|
| DNS/CDN | Cloudflare DDoS 방어, WAF |
| 전송 | TLS 1.2+ (Nginx SSL + Cloudflare SSL) |
| API | CORS 명시적 도메인 제한 |
| DB | Supabase RLS + Service Key 접근 제한 |

### 10.2 인증/인가

| 계층 | 구현 |
|------|------|
| 인증 | Supabase Auth (Google OAuth 2.0 JWT) |
| 인가 | FastAPI Depends (역할 기반) |
| 세션 | JWT 토큰 (만료 시 재인증) |

### 10.3 코드 실행 격리

| 조치 | 상세 |
|------|------|
| 컨테이너 격리 | Docker 내에서 subprocess 실행 |
| 위험 패턴 차단 | 언어별 블랙리스트 (os.system, fork 등) |
| 타임아웃 | 5초 × 언어별 배율 |
| 메모리 제한 | Docker memory: 4G |
| 임시 파일 정리 | 실행 후 tmpdir 자동 삭제 |

### 10.4 시크릿 관리

| 시크릿 | 저장 위치 | 접근 |
|--------|----------|------|
| API 키 (Gemini, R2) | .env 파일 | 백엔드만 |
| Supabase Service Key | .env 파일 | 백엔드만 |
| Supabase Anon Key | 환경 변수 | 프론트엔드 (공개) |
| SSL 인증서 | nginx/ssl/ | Nginx만 |

---

## 11. 배포 프로세스

### 11.1 현재 배포 방법 (수동)

#### 백엔드 배포

```bash
# EC2 서버에서 실행
cd /home/ubuntu/pikabuddy

# 1. 최신 코드 pull
git pull origin develop

# 2. 기존 컨테이너 중지 및 삭제
sudo docker stop backend && sudo docker rm backend

# 3. Docker 이미지 빌드
sudo docker build -t backend ./backend

# 4. 컨테이너 실행
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

#### 프론트엔드 배포

```bash
cd frontend
npm install
npm run build
# dist/ 폴더를 Cloudflare Pages 또는 CDN에 배포
```

### 11.2 Docker Compose 배포 (Nginx 포함)

```bash
# 전체 스택 배포
sudo docker compose up -d --build

# 로그 확인
sudo docker compose logs -f api
sudo docker compose logs -f nginx

# 상태 확인
sudo docker compose ps
```

### 11.3 롤백 절차

```bash
# 이전 커밋으로 되돌리기
git log --oneline -5  # 이전 커밋 해시 확인
git checkout <commit_hash>

# 재빌드 및 재시작
sudo docker compose down
sudo docker compose up -d --build
```

---

## 12. 모니터링 및 로깅

### 12.1 현재 구현

| 항목 | 상태 | 상세 |
|------|------|------|
| 헬스 체크 | ✅ 구현됨 | `GET /health` |
| AI 토큰 추적 | ✅ 구현됨 | `GET /api/token-stats` |
| Docker 로그 | ✅ 기본 | `docker logs backend` |
| 서버 모니터링 | ❌ 미구현 | Prometheus/Grafana 예정 |
| API 메트릭 | ❌ 미구현 | 응답 시간/에러율 추적 예정 |
| 알림 | ❌ 미구현 | Slack/Email 알림 예정 |

### 12.2 향후 모니터링 계획

| 도구 | 용도 | 우선순위 |
|------|------|---------|
| **Prometheus** | 서버 메트릭 수집 (CPU, RAM, 디스크) | 높음 |
| **Grafana** | 메트릭 시각화 대시보드 | 높음 |
| **FastAPI Middleware** | API 응답 시간, 에러율, 요청 수 | 중간 |
| **Sentry** | 에러 트래킹, 스택트레이스 | 중간 |
| **CloudWatch** | EC2 인스턴스 모니터링 | 낮음 |

---

## 13. CI/CD (향후)

### 13.1 현재 상태

CI/CD 파이프라인은 아직 구성되어 있지 않습니다. 현재 수동 배포로 운영 중입니다.

### 13.2 계획된 파이프라인

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

### 13.3 계획된 GitHub Actions 워크플로우

```yaml
# .github/workflows/deploy.yml (예정)
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

## 14. 확장 전략

### 14.1 수직 확장 (Scale Up)

현재 c7i-flex.large (2 vCPU, 4GB) → 권장 인스턴스:

| 시나리오 | 인스턴스 | 사양 | 비용/월 |
|---------|---------|------|---------|
| 공모전 | t3.xlarge | 4 vCPU, 16GB | ~$78 |
| 소규모 서비스 | c7i.xlarge | 4 vCPU, 8GB | ~$100 |
| 중규모 서비스 | c7i.2xlarge | 8 vCPU, 16GB | ~$200 |

### 14.2 수평 확장 (Scale Out)

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

### 14.3 컨테이너 오케스트레이션 (향후)

| 옵션 | 장점 | 복잡도 |
|------|------|--------|
| **ECS Fargate** | 서버리스, 자동 스케일링, AWS 통합 | 중간 |
| **Kubernetes (EKS)** | 완전한 컨테이너 오케스트레이션 | 높음 |
| **Docker Swarm** | 간단한 멀티노드 배포 | 낮음 |

---

## 15. 성능 튜닝

### 15.1 현재 적용된 최적화

| 영역 | 최적화 | 효과 |
|------|--------|------|
| **Nginx gzip** | level 4, 12종 MIME | 응답 크기 60-80% 감소 |
| **Nginx keepalive** | upstream 16, timeout 65s | 연결 재사용, 레이턴시 감소 |
| **Uvicorn workers** | 4 workers | CPU 코어 활용, 병렬 처리 |
| **Uvicorn concurrency** | limit 100 | 과부하 방지 |
| **React Lazy** | 27개 페이지 분할 | 초기 로드 시간 감소 |
| **DB 인덱스** | 51개 (Composite, Partial, GIN) | 쿼리 성능 최적화 |
| **Cloudflare CDN** | 정적 파일 캐시 | 글로벌 레이턴시 감소 |

### 15.2 추가 가능한 최적화

| 최적화 | 효과 | 우선순위 |
|--------|------|---------|
| Redis 캐시 | API 응답 캐싱, 세션 캐시 | 높음 |
| DB 커넥션 풀 | 연결 재사용, 오버헤드 감소 | 중간 |
| CDN 이미지 최적화 | WebP 자동 변환, 리사이즈 | 중간 |
| HTTP/2 | 멀티플렉싱, 서버 푸시 | 낮음 |

---

## 16. 장애 대응

### 16.1 장애 시나리오 및 대응

| 장애 | 영향 | 대응 |
|------|------|------|
| EC2 다운 | 백엔드 전체 불가 | EC2 재시작, Docker Compose up |
| Gemini API 장애 | AI 기능 불가 | 3단계 폴백 자동 전환 |
| Supabase 장애 | DB 전체 불가 | Supabase 상태 확인, 대기 |
| R2 장애 | 파일 업로드/조회 불가 | Cloudflare 상태 확인, 대기 |
| Docker OOM | 컨테이너 크래시 | `restart: unless-stopped`로 자동 재시작 |
| SSL 인증서 만료 | HTTPS 불가 | Let's Encrypt 갱신 |

### 16.2 복구 명령어

```bash
# 컨테이너 상태 확인
sudo docker ps -a

# 로그 확인
sudo docker logs backend --tail 100

# 컨테이너 재시작
sudo docker restart backend

# 전체 재배포
sudo docker compose down && sudo docker compose up -d --build

# 디스크 정리
sudo docker system prune -f
```

---

## 17. 비용 분석

### 17.1 현재 월간 비용 (예상)

| 서비스 | 비용/월 | 비고 |
|--------|---------|------|
| AWS EC2 (c7i-flex.large) | ~$42 | 온디맨드 기준 |
| Supabase | $0-25 | Free/Pro 플랜 |
| Cloudflare (CDN + R2) | ~$5 | R2 스토리지 사용량 기반 |
| Google Gemini API | ~$5-20 | 토큰 사용량 기반 |
| 도메인 (pikabuddy.com) | ~$1 | 연간 기준 분배 |
| **합계** | **~$53-93** | |

### 17.2 스케일업 시 비용

| 시나리오 | 인스턴스 | Supabase | AI | 합계/월 |
|---------|---------|----------|-----|---------|
| 공모전 (100명) | $78 (t3.xlarge) | $25 (Pro) | $20 | ~$125 |
| 소규모 서비스 (500명) | $100 (c7i.xlarge) | $25 | $50 | ~$180 |
| 중규모 서비스 (2000명) | $200+ (ALB+다중) | $75+ | $200+ | ~$500+ |

---

*이 문서는 PikaBuddy의 인프라 아키텍처와 배포 환경을 정의합니다. 시스템 설계 상세는 03_TDD.md를, 데이터베이스 상세는 05_ERD.md를 참조하세요.*
