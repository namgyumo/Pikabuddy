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
        elif language == "c":
            result = _run_c(code, stdin_data)
        elif language == "java":
            result = _run_java(code, stdin_data)
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


def _run_c(code: str, stdin_data: str) -> dict:
    tmpdir = tempfile.mkdtemp()
    src = os.path.join(tmpdir, "main.c")
    exe = os.path.join(tmpdir, "main.exe")

    try:
        with open(src, "w", encoding="utf-8") as f:
            f.write(code)

        # Compile
        compile_result = _execute(["gcc", src, "-o", exe, "-lm"])
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
