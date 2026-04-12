import logging
import os
import re
import subprocess
import tempfile
import uuid
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from middleware.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/code", tags=["코드 실행"])

TIMEOUT = 5  # seconds
MAX_OUTPUT = 5000  # characters

# 언어별 시간 배수 — 표준 입출력 기준 (C/C++ 1x, Java/JS/C#/Go 2x, Python 3x)
_TIME_MULTIPLIER = {
    "c": 1.0,
    "cpp": 1.0,
    "java": 2.0,
    "javascript": 2.0,
    "js": 2.0,
    "python": 3.0,
    "csharp": 2.0,
    "swift": 1.5,
    "rust": 1.0,
    "go": 1.5,
    "asm": 1.0,
}

# Windows: 낮은 우선순위 + 싱글코어로 실행 (온라인 저지급 성능 시뮬레이션)
import platform
_IS_WINDOWS = platform.system() == "Windows"
_LOW_PRIORITY_FLAGS = 0x00004000 if _IS_WINDOWS else 0  # BELOW_NORMAL_PRIORITY_CLASS

# 서버 시크릿 유출 방지를 위해 최소한의 안전한 환경변수만 전달
_SAFE_ENV = {k: os.environ[k] for k in ("PATH", "SYSTEMROOT", "TEMP", "TMP", "HOME", "LANG") if k in os.environ}

# 교육용 코드에서 사용할 이유가 없는 위험 패턴
_BLOCKED_PATTERNS = {
    "python": [
        r"import\s+subprocess", r"from\s+subprocess",
        r"import\s+socket",    r"from\s+socket",
        r"__import__\s*\(",
        r"os\.(system|popen|execv|execve|execvp|spawn|fork)",
        r"ctypes",
    ],
    "javascript": [
        r"require\s*\(\s*['\"]child_process",
        r"require\s*\(\s*['\"]net",
        r"require\s*\(\s*['\"]fs",
        r"process\.env",
    ],
    "csharp": [
        r"System\.Diagnostics\.Process",
        r"System\.Net\.Sockets",
    ],
    "go": [
        r"os/exec",
        r"net\b",
        r"syscall",
    ],
    "rust": [
        r"std::process::Command",
        r"std::net",
    ],
}


def _check_safety(code: str, language: str) -> str | None:
    """위험 패턴이 감지되면 에러 메시지를, 안전하면 None을 반환한다."""
    patterns = _BLOCKED_PATTERNS.get(language, [])
    for pattern in patterns:
        if re.search(pattern, code):
            return "보안상 허용되지 않는 코드 패턴이 포함되어 있습니다."
    return None


class RunRequest(BaseModel):
    code: str
    language: str  # python, javascript, c, java
    stdin: str = ""


class TestCase(BaseModel):
    input: str
    expected_output: str
    is_hidden: bool = False


class JudgeRequest(BaseModel):
    code: str
    language: str
    test_cases: list[TestCase]
    time_limit_ms: int = 1000
    memory_limit_mb: int = 256


@router.post("/judge")
async def judge_code(body: JudgeRequest, user: dict = Depends(get_current_user)):
    """알고리즘 문제 채점 — 각 테스트케이스별 실행 및 결과 판정"""
    language = body.language.lower()
    code = body.code
    # 언어별 시간 보정 — 온라인 저지처럼 Python은 3배, Java/JS는 2배
    multiplier = _TIME_MULTIPLIER.get(language, 1.0)
    time_limit_sec = (body.time_limit_ms / 1000) * multiplier

    safety_error = _check_safety(code, language)
    if safety_error:
        return {"verdict": "CE", "passed": 0, "total": len(body.test_cases),
                "results": [], "total_time_ms": 0, "max_memory_mb": 0, "error": safety_error}

    results = []
    passed = 0
    total_time = 0.0
    max_memory = 0.0

    memory_limit = body.memory_limit_mb

    for i, tc in enumerate(body.test_cases):
        case_result = _judge_single(code, language, tc.input, tc.expected_output, time_limit_sec, memory_limit)
        case_result["index"] = i
        case_result["is_hidden"] = tc.is_hidden
        results.append(case_result)
        if case_result["verdict"] == "AC":
            passed += 1
        total_time += case_result.get("time_ms", 0)
        max_memory = max(max_memory, case_result.get("memory_mb", 0))

    overall = "AC" if passed == len(body.test_cases) else results[-1]["verdict"] if results else "RE"
    # 가장 심각한 verdict 우선
    for r in results:
        if r["verdict"] != "AC":
            overall = r["verdict"]
            break

    return {
        "verdict": overall,
        "passed": passed,
        "total": len(body.test_cases),
        "results": results,
        "total_time_ms": round(total_time, 2),
        "max_memory_mb": round(max_memory, 2),
    }


def _judge_single(code: str, language: str, stdin_data: str, expected: str,
                   time_limit: float, memory_limit_mb: int = 256) -> dict:
    """단일 테스트케이스 실행 및 판정 — CPU 시간 + 메모리 기반"""
    import time

    try:
        start = time.perf_counter()
        if language == "python":
            result = _run_python_judge(code, stdin_data, time_limit)
        elif language in ("javascript", "js"):
            result = _run_js_judge(code, stdin_data, time_limit)
        elif language in ("c", "cpp"):
            result = _run_c_judge(code, stdin_data, time_limit, cpp=(language == "cpp"))
        elif language == "java":
            result = _run_java_judge(code, stdin_data, time_limit)
        elif language == "csharp":
            result = _run_csharp_judge(code, stdin_data, time_limit)
        elif language == "swift":
            result = _run_swift_judge(code, stdin_data, time_limit)
        elif language == "rust":
            result = _run_rust_judge(code, stdin_data, time_limit)
        elif language == "go":
            result = _run_go_judge(code, stdin_data, time_limit)
        elif language == "asm":
            result = _run_asm_judge(code, stdin_data, time_limit)
        else:
            return {"verdict": "CE", "time_ms": 0, "memory_mb": 0, "output": "", "error": f"지원하지 않는 언어: {language}"}
        wall_ms = (time.perf_counter() - start) * 1000
        # CPU 시간 우선, 없으면 wall time
        elapsed = result.get("cpu_time_ms") or wall_ms
        memory_mb = result.get("memory_mb", 0)

        if result.get("timeout"):
            return {"verdict": "TLE", "time_ms": round(elapsed, 2), "memory_mb": memory_mb, "output": "", "error": "시간 초과"}
        if not result["success"]:
            return {"verdict": "RE", "time_ms": round(elapsed, 2), "memory_mb": memory_mb, "output": result.get("output", ""), "error": result.get("error", "")}

        # CPU 시간 초과
        if elapsed > time_limit * 1000:
            return {"verdict": "TLE", "time_ms": round(elapsed, 2), "memory_mb": memory_mb, "output": "", "error": "CPU 시간 초과"}

        # 메모리 초과
        if memory_mb > memory_limit_mb:
            return {"verdict": "MLE", "time_ms": round(elapsed, 2), "memory_mb": memory_mb, "output": "", "error": f"메모리 초과 ({memory_mb:.1f}MB > {memory_limit_mb}MB)"}

        actual = result["output"].rstrip()
        exp = expected.rstrip()
        if actual == exp:
            return {"verdict": "AC", "time_ms": round(elapsed, 2), "memory_mb": memory_mb, "output": actual, "error": ""}
        else:
            return {"verdict": "WA", "time_ms": round(elapsed, 2), "memory_mb": memory_mb, "output": actual, "error": ""}
    except Exception as e:
        return {"verdict": "RE", "time_ms": 0, "memory_mb": 0, "output": "", "error": str(e)}


def _run_with_timeout(cmd: list[str], stdin_data: str, timeout: float, cwd: str | None = None) -> dict:
    """Run with custom timeout + CPU 제한 (IDLE 우선순위, 싱글코어, CPU 시간 측정)"""
    import psutil
    try:
        kwargs = dict(
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            cwd=cwd, encoding="utf-8", errors="replace", env=_SAFE_ENV,
        )
        if _IS_WINDOWS:
            kwargs["creationflags"] = 0x00000040  # IDLE_PRIORITY_CLASS

        proc = subprocess.Popen(cmd, **kwargs)
        try:
            # 싱글코어 고정 (코어 0번만 사용)
            ps = psutil.Process(proc.pid)
            ps.cpu_affinity([0])
        except Exception:
            pass  # 실패해도 계속 진행

        try:
            stdout, stderr = proc.communicate(input=stdin_data, timeout=timeout)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.communicate()
            return {"success": False, "output": "", "error": "시간 초과", "timeout": True, "cpu_time_ms": 0}

        # CPU 시간 + 메모리 측정
        cpu_time_ms = 0
        memory_mb = 0
        try:
            cpu_times = ps.cpu_times()
            cpu_time_ms = (cpu_times.user + cpu_times.system) * 1000
        except Exception:
            pass
        try:
            mem_info = ps.memory_info()
            memory_mb = mem_info.peak_wset / (1024 * 1024) if hasattr(mem_info, 'peak_wset') else mem_info.rss / (1024 * 1024)
        except Exception:
            pass

        return {
            "success": proc.returncode == 0,
            "output": (stdout or "")[:MAX_OUTPUT],
            "error": (stderr or "")[:MAX_OUTPUT],
            "timeout": False,
            "cpu_time_ms": round(cpu_time_ms, 2),
            "memory_mb": round(memory_mb, 2),
        }
    except FileNotFoundError:
        return {"success": False, "output": "", "error": "실행 환경 오류", "timeout": False, "cpu_time_ms": 0}


def _run_python_judge(code: str, stdin_data: str, timeout: float) -> dict:
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False, encoding="utf-8") as f:
        f.write(code); f.flush()
        try: return _run_with_timeout(["python", f.name], stdin_data, timeout)
        finally: os.unlink(f.name)


def _run_js_judge(code: str, stdin_data: str, timeout: float) -> dict:
    with tempfile.NamedTemporaryFile(mode="w", suffix=".js", delete=False, encoding="utf-8") as f:
        f.write(code); f.flush()
        try: return _run_with_timeout(["node", f.name], stdin_data, timeout)
        finally: os.unlink(f.name)


def _run_c_judge(code: str, stdin_data: str, timeout: float, cpp: bool = False) -> dict:
    tmpdir = tempfile.mkdtemp()
    ext = ".cpp" if cpp else ".c"
    compiler = "g++" if cpp else "gcc"
    src = os.path.join(tmpdir, f"main{ext}")
    exe = os.path.join(tmpdir, "main.exe")
    try:
        with open(src, "w", encoding="utf-8") as f: f.write(code)
        compile_res = _run_with_timeout([compiler, src, "-o", exe, "-lm"], "", 10)
        if not compile_res["success"]:
            return {"success": False, "output": "", "error": "컴파일 에러:\n" + compile_res["error"], "timeout": False}
        return _run_with_timeout([exe], stdin_data, timeout)
    finally:
        for fname in [src, exe]:
            try: os.unlink(fname)
            except OSError: pass
        try: os.rmdir(tmpdir)
        except OSError: pass


def _run_java_judge(code: str, stdin_data: str, timeout: float) -> dict:
    tmpdir = tempfile.mkdtemp()
    match = re.search(r"public\s+class\s+(\w+)", code)
    class_name = match.group(1) if match else "Main"
    src = os.path.join(tmpdir, f"{class_name}.java")
    try:
        with open(src, "w", encoding="utf-8") as f: f.write(code)
        compile_res = _run_with_timeout(["javac", src], "", 15)
        if not compile_res["success"]:
            return {"success": False, "output": "", "error": "컴파일 에러:\n" + compile_res["error"], "timeout": False}
        return _run_with_timeout(["java", "-cp", tmpdir, class_name], stdin_data, timeout)
    finally:
        for fname in os.listdir(tmpdir):
            try: os.unlink(os.path.join(tmpdir, fname))
            except OSError: pass
        try: os.rmdir(tmpdir)
        except OSError: pass


@router.post("/run")
async def run_code(body: RunRequest, user: dict = Depends(get_current_user)):
    """코드를 실행하고 결과를 반환한다."""
    language = body.language.lower()
    code = body.code
    stdin_data = body.stdin
    logger.info(f"[Runner] language={language}, code_len={len(code)}")

    safety_error = _check_safety(code, language)
    if safety_error:
        return {"success": False, "output": "", "error": safety_error}

    try:
        if language == "python":
            result = _run_python(code, stdin_data)
        elif language in ("javascript", "js"):
            result = _run_javascript(code, stdin_data)
        elif language in ("c", "cpp"):
            result = _run_c(code, stdin_data, cpp=(language == "cpp"))
        elif language == "java":
            result = _run_java(code, stdin_data)
        elif language == "csharp":
            result = _run_csharp(code, stdin_data)
        elif language == "swift":
            result = _run_swift(code, stdin_data)
        elif language == "rust":
            result = _run_rust(code, stdin_data)
        elif language == "go":
            result = _run_go(code, stdin_data)
        elif language == "asm":
            result = _run_asm(code, stdin_data)
        else:
            return {"success": False, "output": "", "error": f"지원하지 않는 언어: {language}"}

        return result
    except Exception as e:
        return {"success": False, "output": "", "error": str(e)}


def _execute(cmd: list[str], stdin_data: str = "", cwd: str | None = None) -> dict:
    """Run a command with timeout and capture output."""
    try:
        proc = subprocess.run(
            cmd,
            input=stdin_data,
            capture_output=True,
            text=True,
            timeout=TIMEOUT,
            cwd=cwd,
            encoding="utf-8",
            errors="replace",
            env=_SAFE_ENV,
        )
        output = proc.stdout[:MAX_OUTPUT]
        error = proc.stderr[:MAX_OUTPUT]

        if proc.returncode == 0:
            return {"success": True, "output": output, "error": error}
        else:
            return {"success": False, "output": output, "error": error or f"Exit code: {proc.returncode}"}
    except subprocess.TimeoutExpired:
        return {"success": False, "output": "", "error": f"시간 초과 ({TIMEOUT}초)"}
    except FileNotFoundError:
        return {"success": False, "output": "", "error": f"실행 환경 오류: '{cmd[0]}'이(가) 설치되어 있지 않습니다. (gcc, node, javac 등 필요)"}


def _run_python(code: str, stdin_data: str) -> dict:
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False, encoding="utf-8") as f:
        f.write(code)
        f.flush()
        try:
            return _execute(["python", f.name], stdin_data)
        finally:
            os.unlink(f.name)


def _run_javascript(code: str, stdin_data: str) -> dict:
    with tempfile.NamedTemporaryFile(mode="w", suffix=".js", delete=False, encoding="utf-8") as f:
        f.write(code)
        f.flush()
        try:
            return _execute(["node", f.name], stdin_data)
        finally:
            os.unlink(f.name)


def _run_c(code: str, stdin_data: str, cpp: bool = False) -> dict:
    tmpdir = tempfile.mkdtemp()
    ext = ".cpp" if cpp else ".c"
    compiler = "g++" if cpp else "gcc"
    src = os.path.join(tmpdir, f"main{ext}")
    exe = os.path.join(tmpdir, "main.exe")

    try:
        with open(src, "w", encoding="utf-8") as f:
            f.write(code)

        # Compile
        compile_result = _execute([compiler, src, "-o", exe, "-lm"])
        if not compile_result["success"]:
            compile_result["error"] = "컴파일 에러:\n" + compile_result["error"]
            return compile_result

        # Run
        return _execute([exe], stdin_data)
    finally:
        for fname in [src, exe]:
            try:
                os.unlink(fname)
            except OSError:
                pass
        try:
            os.rmdir(tmpdir)
        except OSError:
            pass


def _run_java(code: str, stdin_data: str) -> dict:
    tmpdir = tempfile.mkdtemp()

    # Extract class name from code
    import re
    match = re.search(r"public\s+class\s+(\w+)", code)
    class_name = match.group(1) if match else "Main"

    src = os.path.join(tmpdir, f"{class_name}.java")

    try:
        with open(src, "w", encoding="utf-8") as f:
            f.write(code)

        # Compile
        compile_result = _execute(["javac", src])
        if not compile_result["success"]:
            compile_result["error"] = "컴파일 에러:\n" + compile_result["error"]
            return compile_result

        # Run
        return _execute(["java", "-cp", tmpdir, class_name], stdin_data)
    finally:
        for fname in os.listdir(tmpdir):
            try:
                os.unlink(os.path.join(tmpdir, fname))
            except OSError:
                pass
        try:
            os.rmdir(tmpdir)
        except OSError:
            pass


# ── C# (Mono) ──

def _run_csharp(code: str, stdin_data: str) -> dict:
    tmpdir = tempfile.mkdtemp()
    src = os.path.join(tmpdir, "Main.cs")
    exe = os.path.join(tmpdir, "Main.exe")
    try:
        with open(src, "w", encoding="utf-8") as f:
            f.write(code)
        compile_result = _execute(["mcs", "-out:" + exe, src])
        if not compile_result["success"]:
            compile_result["error"] = "컴파일 에러:\n" + compile_result["error"]
            return compile_result
        return _execute(["mono", exe], stdin_data)
    finally:
        _cleanup_dir(tmpdir)


def _run_csharp_judge(code: str, stdin_data: str, timeout: float) -> dict:
    tmpdir = tempfile.mkdtemp()
    src = os.path.join(tmpdir, "Main.cs")
    exe = os.path.join(tmpdir, "Main.exe")
    try:
        with open(src, "w", encoding="utf-8") as f:
            f.write(code)
        compile_res = _run_with_timeout(["mcs", "-out:" + exe, src], "", 15)
        if not compile_res["success"]:
            return {"success": False, "output": "", "error": "컴파일 에러:\n" + compile_res["error"], "timeout": False}
        return _run_with_timeout(["mono", exe], stdin_data, timeout)
    finally:
        _cleanup_dir(tmpdir)


# ── Swift ──

def _run_swift(code: str, stdin_data: str) -> dict:
    with tempfile.NamedTemporaryFile(mode="w", suffix=".swift", delete=False, encoding="utf-8") as f:
        f.write(code); f.flush()
        try:
            return _execute(["swift", f.name], stdin_data)
        finally:
            os.unlink(f.name)


def _run_swift_judge(code: str, stdin_data: str, timeout: float) -> dict:
    tmpdir = tempfile.mkdtemp()
    src = os.path.join(tmpdir, "main.swift")
    exe = os.path.join(tmpdir, "main")
    try:
        with open(src, "w", encoding="utf-8") as f:
            f.write(code)
        compile_res = _run_with_timeout(["swiftc", src, "-o", exe], "", 30)
        if not compile_res["success"]:
            return {"success": False, "output": "", "error": "컴파일 에러:\n" + compile_res["error"], "timeout": False}
        return _run_with_timeout([exe], stdin_data, timeout)
    finally:
        _cleanup_dir(tmpdir)


# ── Rust ──

def _run_rust(code: str, stdin_data: str) -> dict:
    tmpdir = tempfile.mkdtemp()
    src = os.path.join(tmpdir, "main.rs")
    exe = os.path.join(tmpdir, "main")
    try:
        with open(src, "w", encoding="utf-8") as f:
            f.write(code)
        compile_result = _execute(["rustc", src, "-o", exe])
        if not compile_result["success"]:
            compile_result["error"] = "컴파일 에러:\n" + compile_result["error"]
            return compile_result
        return _execute([exe], stdin_data)
    finally:
        _cleanup_dir(tmpdir)


def _run_rust_judge(code: str, stdin_data: str, timeout: float) -> dict:
    tmpdir = tempfile.mkdtemp()
    src = os.path.join(tmpdir, "main.rs")
    exe = os.path.join(tmpdir, "main")
    try:
        with open(src, "w", encoding="utf-8") as f:
            f.write(code)
        compile_res = _run_with_timeout(["rustc", src, "-o", exe], "", 30)
        if not compile_res["success"]:
            return {"success": False, "output": "", "error": "컴파일 에러:\n" + compile_res["error"], "timeout": False}
        return _run_with_timeout([exe], stdin_data, timeout)
    finally:
        _cleanup_dir(tmpdir)


# ── Go ──

def _run_go(code: str, stdin_data: str) -> dict:
    tmpdir = tempfile.mkdtemp()
    src = os.path.join(tmpdir, "main.go")
    try:
        with open(src, "w", encoding="utf-8") as f:
            f.write(code)
        return _execute(["go", "run", src], stdin_data, cwd=tmpdir)
    finally:
        _cleanup_dir(tmpdir)


def _run_go_judge(code: str, stdin_data: str, timeout: float) -> dict:
    tmpdir = tempfile.mkdtemp()
    src = os.path.join(tmpdir, "main.go")
    exe = os.path.join(tmpdir, "main")
    try:
        with open(src, "w", encoding="utf-8") as f:
            f.write(code)
        compile_res = _run_with_timeout(["go", "build", "-o", exe, src], "", 30, cwd=tmpdir)
        if not compile_res["success"]:
            return {"success": False, "output": "", "error": "컴파일 에러:\n" + compile_res["error"], "timeout": False}
        return _run_with_timeout([exe], stdin_data, timeout)
    finally:
        _cleanup_dir(tmpdir)


# ── Assembly (x86_64 NASM, Linux) ──

def _run_asm(code: str, stdin_data: str) -> dict:
    tmpdir = tempfile.mkdtemp()
    src = os.path.join(tmpdir, "main.asm")
    obj = os.path.join(tmpdir, "main.o")
    exe = os.path.join(tmpdir, "main")
    try:
        with open(src, "w", encoding="utf-8") as f:
            f.write(code)
        # Assemble
        asm_result = _execute(["nasm", "-f", "elf64", src, "-o", obj])
        if not asm_result["success"]:
            asm_result["error"] = "어셈블 에러:\n" + asm_result["error"]
            return asm_result
        # Link
        link_result = _execute(["gcc", "-no-pie", obj, "-o", exe])
        if not link_result["success"]:
            link_result["error"] = "��크 에러:\n" + link_result["error"]
            return link_result
        return _execute([exe], stdin_data)
    finally:
        _cleanup_dir(tmpdir)


def _run_asm_judge(code: str, stdin_data: str, timeout: float) -> dict:
    tmpdir = tempfile.mkdtemp()
    src = os.path.join(tmpdir, "main.asm")
    obj = os.path.join(tmpdir, "main.o")
    exe = os.path.join(tmpdir, "main")
    try:
        with open(src, "w", encoding="utf-8") as f:
            f.write(code)
        asm_res = _run_with_timeout(["nasm", "-f", "elf64", src, "-o", obj], "", 10)
        if not asm_res["success"]:
            return {"success": False, "output": "", "error": "어셈블 에러:\n" + asm_res["error"], "timeout": False}
        link_res = _run_with_timeout(["gcc", "-no-pie", obj, "-o", exe], "", 10)
        if not link_res["success"]:
            return {"success": False, "output": "", "error": "링크 에러:\n" + link_res["error"], "timeout": False}
        return _run_with_timeout([exe], stdin_data, timeout)
    finally:
        _cleanup_dir(tmpdir)


# ── Helpers ──

def _cleanup_dir(tmpdir: str):
    """임시 디렉토리와 그 안의 파일들을 정리한다."""
    try:
        for fname in os.listdir(tmpdir):
            try:
                os.unlink(os.path.join(tmpdir, fname))
            except OSError:
                pass
        os.rmdir(tmpdir)
    except OSError:
        pass
