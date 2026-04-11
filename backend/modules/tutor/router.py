import asyncio
import json
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from common.gemini_client import get_gemini_model
from middleware.auth import require_student_or_personal

router = APIRouter(prefix="/tutor", tags=["AI 튜터"])


class TutorChatRequest(BaseModel):
    message: str
    assignment_id: str | None = None
    starter_code: str | None = None   # 문제 초기 제공 코드
    code_context: str | None = None   # 학생의 현재 코드
    history: list[dict] | None = None  # [{"role": "user"|"ai", "content": "..."}]
    problem_context: dict | None = None  # {title, description, expected_output, hints}


@router.post("/chat")
async def tutor_chat(body: TutorChatRequest, user: dict = Depends(require_student_or_personal)):
    """AI 소크라테스 튜터 - SSE 스트리밍"""

    history_text = ""
    if body.history:
        for h in body.history[-10:]:
            role = "학생" if h["role"] == "user" else "튜터"
            history_text += f"{role}: {h['content']}\n"

    # 문제 맥락 섹션
    problem_section = ""
    if body.problem_context:
        pc = body.problem_context
        problem_section = f"""[풀고 있는 문제]
제목: {pc.get('title', '(없음)')}
문제 설명:
{pc.get('description', '(없음)')}"""
        if pc.get('expected_output'):
            problem_section += f"\n기대 출력:\n{pc['expected_output']}"
        hints = pc.get('hints')
        if hints:
            if isinstance(hints, list):
                problem_section += f"\n힌트: {', '.join(hints)}"
            else:
                problem_section += f"\n힌트: {hints}"

    # 코드 변화 섹션 구성
    code_section = ""
    if body.starter_code and body.code_context:
        if body.starter_code.strip() == body.code_context.strip():
            code_section = f"[현재 코드] (초기 코드에서 변경 없음)\n```\n{body.code_context}\n```"
        else:
            code_section = (
                f"[초기 제공 코드 (문제 시작 시 주어진 코드)]\n```\n{body.starter_code}\n```\n\n"
                f"[학생이 작성한 현재 코드]\n```\n{body.code_context}\n```"
            )
    elif body.code_context:
        code_section = f"[현재 코드]\n```\n{body.code_context}\n```"

    prompt = f"""You are a Socratic AI tutor. Guide the student to discover answers through questions.

Rules:
1. Do not give direct answers — ask thought-provoking questions instead.
2. Ask only ONE question at a time.
3. Match the student's current understanding level.
4. Use a warm, encouraging tone.
5. When the student is stuck, give hints but NEVER provide the solution code.
6. Assess the student's progress by comparing their code against the starter code.

Exception — Pure concept/theory questions:
If the student asks about a concept or term (e.g., "What is recursion?", "What is O(n)?", "What is a stack?"),
explain the concept clearly and concisely WITHOUT Socratic questioning.
However, even then, never reveal the solution code or implementation approach.

{problem_section}

{code_section}

{f"[Conversation history]\\n{history_text}" if history_text else ""}

Student's question: {body.message}

IMPORTANT: Write the entire output in Korean.
"""

    async def generate():
        loop = asyncio.get_running_loop()
        queue: asyncio.Queue = asyncio.Queue()

        def run_stream():
            try:
                model = get_gemini_model()
                response = model.generate_content(prompt, stream=True)
                for chunk in response:
                    if chunk.text:
                        loop.call_soon_threadsafe(queue.put_nowait, ("chunk", chunk.text))
                loop.call_soon_threadsafe(queue.put_nowait, ("done", None))
            except Exception as e:
                loop.call_soon_threadsafe(queue.put_nowait, ("error", str(e)))

        loop.run_in_executor(None, run_stream)

        while True:
            event_type, data = await queue.get()
            if event_type == "chunk":
                yield {"event": "message", "data": json.dumps({"type": "chunk", "text": data}, ensure_ascii=False)}
            elif event_type == "done":
                yield {"event": "message", "data": json.dumps({"type": "done"}, ensure_ascii=False)}
                break
            elif event_type == "error":
                yield {"event": "message", "data": json.dumps({"type": "error", "text": data}, ensure_ascii=False)}
                break

    return EventSourceResponse(generate())
