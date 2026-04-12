#!/bin/bash
# PikaBuddy — 코드 실행 언어 의존성 설치 스크립트 (Ubuntu 22.04/24.04)
set -e

echo "=== PikaBuddy Language Runtime Installer ==="

apt-get update

# ── 기본 빌드 도구 (gcc, g++, make) ──
echo "[1/8] Installing build-essential (C, C++) ..."
apt-get install -y build-essential

# ── Python 3 ──
echo "[2/8] Installing Python 3 ..."
apt-get install -y python3 python3-pip

# python -> python3 심볼릭 링크 (없을 경우)
if ! command -v python &> /dev/null; then
    ln -sf /usr/bin/python3 /usr/bin/python
fi

# ── Node.js (JavaScript) ──
echo "[3/8] Installing Node.js ..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# ── Java (OpenJDK) ──
echo "[4/8] Installing Java (OpenJDK 17) ..."
apt-get install -y default-jdk

# ── C# (Mono) ──
echo "[5/8] Installing Mono (C#) ..."
apt-get install -y mono-mcs

# ── Go ──
echo "[6/8] Installing Go ..."
if ! command -v go &> /dev/null; then
    GO_VERSION="1.22.5"
    wget -q "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" -O /tmp/go.tar.gz
    rm -rf /usr/local/go
    tar -C /usr/local -xzf /tmp/go.tar.gz
    rm /tmp/go.tar.gz
    ln -sf /usr/local/go/bin/go /usr/bin/go
    ln -sf /usr/local/go/bin/gofmt /usr/bin/gofmt
fi

# ── Rust ──
echo "[7/8] Installing Rust ..."
if ! command -v rustc &> /dev/null; then
    apt-get install -y rustc
fi

# ── NASM (Assembly) ──
echo "[8/9] Installing NASM (Assembly) ..."
apt-get install -y nasm

# ── Swift ──
echo "[9/9] Installing Swift ..."
if ! command -v swiftc &> /dev/null; then
    SWIFT_VERSION="5.10.1"
    SWIFT_PLATFORM="ubuntu2204"
    wget -q "https://download.swift.org/swift-${SWIFT_VERSION}-release/ubuntu2204/swift-${SWIFT_VERSION}-RELEASE/swift-${SWIFT_VERSION}-RELEASE-${SWIFT_PLATFORM}.tar.gz" -O /tmp/swift.tar.gz
    tar -C /usr/local -xzf /tmp/swift.tar.gz
    ln -sf /usr/local/swift-${SWIFT_VERSION}-RELEASE-${SWIFT_PLATFORM}/usr/bin/swift /usr/bin/swift
    ln -sf /usr/local/swift-${SWIFT_VERSION}-RELEASE-${SWIFT_PLATFORM}/usr/bin/swiftc /usr/bin/swiftc
    rm /tmp/swift.tar.gz
fi

echo ""
echo "=== Verification ==="
echo -n "gcc:    "; gcc --version 2>/dev/null | head -1 || echo "NOT FOUND"
echo -n "g++:    "; g++ --version 2>/dev/null | head -1 || echo "NOT FOUND"
echo -n "python: "; python --version 2>/dev/null || echo "NOT FOUND"
echo -n "node:   "; node --version 2>/dev/null || echo "NOT FOUND"
echo -n "javac:  "; javac -version 2>/dev/null || echo "NOT FOUND"
echo -n "mcs:    "; mcs --version 2>/dev/null || echo "NOT FOUND"
echo -n "go:     "; go version 2>/dev/null || echo "NOT FOUND"
echo -n "rustc:  "; rustc --version 2>/dev/null || echo "NOT FOUND"
echo -n "nasm:   "; nasm --version 2>/dev/null || echo "NOT FOUND"
echo -n "swift:  "; swift --version 2>/dev/null | head -1 || echo "NOT INSTALLED (optional)"

echo ""
echo "=== Done! ==="
