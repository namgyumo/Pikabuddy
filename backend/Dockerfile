FROM python:3.12-slim

WORKDIR /app

# 코드 실행에 필요한 컴파일러/런타임 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libstdc++-12-dev \
    default-jdk \
    mono-mcs \
    mono-runtime \
    golang-go \
    nasm \
    curl \
    gnupg \
    ca-certificates \
    pkg-config \
    libfreetype6-dev \
    libpng-dev \
    && rm -rf /var/lib/apt/lists/*

# Node.js LTS (v20) — apt 기본 버전이 너무 낮으므로 NodeSource 사용
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# 비-root 사용자 생성
RUN useradd -m -s /bin/bash appuser

# Rust 설치 (rustup → minimal) — appuser 홈에 설치
RUN su - appuser -c "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal"
ENV PATH="/home/appuser/.cargo/bin:${PATH}"

# Node.js 글로벌 패키지 (학생 코드 실행용)
RUN npm install -g lodash axios chalk dayjs uuid

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# 앱 디렉토리 소유권을 appuser로 변경
RUN chown -R appuser:appuser /app

# 비-root 사용자로 전환
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
