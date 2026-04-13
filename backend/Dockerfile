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
    libcurl4 \
    libedit2 \
    libxml2 \
    libz3-dev \
    pkg-config \
    libfreetype6-dev \
    libpng-dev \
    libncurses6 \
    && rm -rf /var/lib/apt/lists/*

# Node.js LTS (v20) — apt 기본 버전이 너무 낮으므로 NodeSource 사용
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Rust 설치 (rustup → minimal)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal \
    && echo 'source $HOME/.cargo/env' >> /etc/bash.bashrc
ENV PATH="/root/.cargo/bin:${PATH}"

# Swift 설치
RUN SWIFT_URL="https://download.swift.org/swift-5.10.1-release/ubuntu2204/swift-5.10.1-RELEASE/swift-5.10.1-RELEASE-ubuntu22.04.tar.gz" \
    && curl -fsSL "$SWIFT_URL" -o /tmp/swift.tar.gz \
    && tar xzf /tmp/swift.tar.gz -C /opt \
    && ln -s /opt/swift-5.10.1-RELEASE-ubuntu22.04/usr/bin/swift /usr/local/bin/swift \
    && ln -s /opt/swift-5.10.1-RELEASE-ubuntu22.04/usr/bin/swiftc /usr/local/bin/swiftc \
    && rm /tmp/swift.tar.gz

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
