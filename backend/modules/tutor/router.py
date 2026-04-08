import asyncio
import json
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from common.gemini_client import get_gemini_model
from middleware.auth import require_student

router = APIRouter(prefix="/tutor", tags=["AI 튜터"])


class TutorChatRequest(BaseModel):
    message: str
    assignment_id: str | None = None
    starter_code: str | None = None   # 문제 초기 제공 코드
    code_context: str | None = None   # 학생의 현재 코드
    history: list[dict] | None = None  # [{"role": "user"|"ai", "content": "..."}]
    problem_context: dict | None = None  # {title, description, expected_output, hints}


@router.post("/chat")
async def tutor_chat(body: TutorChatRequest, user: dict = Depends(require_student)):
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

    prompt = f"""당신은 소크라테스식 AI 튜터입니다.
학생이 스스로 깨달을 수 있도록 질문으로 유도하세요.

기본 규칙:
1. 답을 직접 주지 않고, 생각을 유도하는 질문을 한다.
2. 한 번에 하나의 질문만 한다.
3. 학생의 현재 이해 수준에 맞춘다.
4. 따뜻하고 격려하는 톤을 사용한다.
5. 한국어로 응답한다.
6. 학생이 막혔을 때 힌트를 줄 수 있지만 코드 정답은 주지 않는다.
7. 초기 코드 대비 학생이 작성한 내용을 파악해 어디까지 이해했는지 고려한다.

예외 — 순수 개념·이론 질문:
학생이 특정 개념이나 용어의 의미를 묻는 경우(예: "재귀가 뭐야?", "O(n)이 뭐야?", "스택이란?")에는
소크라테스식 유도 없이 개념을 명확하고 간결하게 직접 설명한다.
단, 이 경우에도 문제의 정답 코드나 구현 방법은 알려주지 않는다.

{problem_section}

{code_section}

{f"[대화 히스토리]\\n{history_text}" if history_text else ""}

학생의 질문: {body.message}
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
