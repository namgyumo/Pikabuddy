"""
세션 기반 AI 에이전트 라우터
- 학생용 에이전트: 소크라테스식 튜터링
- 교수용 에이전트: 교육 어시스턴트
"""
import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from common.gemini_client import get_gemini_model
from middleware.auth import get_current_user, require_student, require_professor
from .session_manager import get_session_manager, AgentType

router = APIRouter(prefix="/agents", tags=["AI 에이전트"])


# ============ Request/Response Models ============

class ChatRequest(BaseModel):
    message: str
    context: dict | None = None  # 선택적 컨텍스트 (과제, 코드 등)


class SessionResponse(BaseModel):
    session_id: str
    agent_type: AgentType
    message_count: int


class HistoryResponse(BaseModel):
    session_id: str
    messages: list[dict]


# ============ 학생 에이전트 ============

STUDENT_AGENT_PROMPT = """당신은 학생을 위한 AI 학습 도우미입니다.

역할:
- 소크라테스식 대화를 통해 학생이 스스로 깨달을 수 있도록 돕습니다
- 직접적인 정답 대신 생각을 유도하는 질문을 합니다
- 학생의 수준에 맞춰 설명합니다

기본 규칙:
1. 답을 직접 주지 않고, 생각을 유도하는 질문을 합니다
2. 한 번에 하나의 질문만 합니다
3. 따뜻하고 격려하는 톤을 사용합니다
4. 한국어로 응답합니다
5. 코드 문제의 경우 정답 코드는 직접 주지 않습니다

예외 - 순수 개념 질문:
학생이 개념이나 용어를 물으면 (예: "재귀가 뭐야?") 명확하게 설명합니다.
단, 문제의 정답 코드는 알려주지 않습니다.

{context_section}

[대화 히스토리]
{history}

학생: {message}
"""


@router.post("/student/chat")
async def student_chat(body: ChatRequest, user: dict = Depends(require_student)):
    """학생용 AI 에이전트 채팅 (세션 기반, SSE 스트리밍)"""
    session_manager = get_session_manager()
    user_id = str(user["id"])

    # 세션 가져오기 또는 생성
    session = session_manager.get_or_create_session(user_id, "student", body.context)

    # 사용자 메시지 저장
    session_manager.add_message(session.session_id, "user", body.message)

    # 히스토리 구성
    history_text = ""
    for msg in session_manager.get_history(session.session_id, limit=10)[:-1]:  # 현재 메시지 제외
        role = "학생" if msg.role == "user" else "튜터"
        history_text += f"{role}: {msg.content}\n"

    # 컨텍스트 섹션 구성
    context_section = ""
    if session.context:
        if session.context.get("assignment_title"):
            context_section += f"\n[현재 과제: {session.context['assignment_title']}]"
        if session.context.get("code"):
            context_section += f"\n[학생 코드]\n```\n{session.context['code']}\n```"
        if session.context.get("problem_description"):
            context_section += f"\n[문제 설명]\n{session.context['problem_description']}"

    prompt = STUDENT_AGENT_PROMPT.format(
        context_section=context_section,
        history=history_text if history_text else "(첫 대화입니다)",
        message=body.message
    )

    async def generate():
        loop = asyncio.get_running_loop()
        queue: asyncio.Queue = asyncio.Queue()
        full_response = []

        def run_stream():
            try:
                model = get_gemini_model()
                response = model.generate_content(prompt, stream=True)
                for chunk in response:
                    if chunk.text:
                        full_response.append(chunk.text)
                        loop.call_soon_threadsafe(queue.put_nowait, ("chunk", chunk.text))
                loop.call_soon_threadsafe(queue.put_nowait, ("done", "".join(full_response)))
            except Exception as e:
                loop.call_soon_threadsafe(queue.put_nowait, ("error", str(e)))

        loop.run_in_executor(None, run_stream)

        while True:
            event_type, data = await queue.get()
            if event_type == "chunk":
                yield {"event": "message", "data": json.dumps({
                    "type": "chunk",
                    "text": data,
                    "session_id": session.session_id
                }, ensure_ascii=False)}
            elif event_type == "done":
                # AI 응답 저장
                session_manager.add_message(session.session_id, "assistant", data)
                yield {"event": "message", "data": json.dumps({
                    "type": "done",
                    "session_id": session.session_id
                }, ensure_ascii=False)}
                break
            elif event_type == "error":
                yield {"event": "message", "data": json.dumps({
                    "type": "error",
                    "text": data
                }, ensure_ascii=False)}
                break

    return EventSourceResponse(generate())


# ============ 교수 에이전트 ============

PROFESSOR_AGENT_PROMPT = """당신은 교수를 위한 AI 교육 어시스턴트입니다.

역할:
- 강의 자료 및 과제 작성을 도와줍니다
- 학생 성적 분석 및 피드백 제안을 합니다
- 교육 방법론에 대한 조언을 제공합니다
- 시험 문제 및 평가 기준 설계를 돕습니다

기본 규칙:
1. 전문적이고 효율적인 톤을 사용합니다
2. 구체적이고 실행 가능한 제안을 합니다
3. 교육학적 근거를 바탕으로 조언합니다
4. 한국어로 응답합니다
5. 필요시 코드 예제나 구조화된 답변을 제공합니다

{context_section}

[대화 히스토리]
{history}

교수님: {message}
"""


@router.post("/professor/chat")
async def professor_chat(body: ChatRequest, user: dict = Depends(require_professor)):
    """교수용 AI 에이전트 채팅 (세션 기반, SSE 스트리밍)"""
    session_manager = get_session_manager()
    user_id = str(user["id"])

    # 세션 가져오기 또는 생성
    session = session_manager.get_or_create_session(user_id, "professor", body.context)

    # 사용자 메시지 저장
    session_manager.add_message(session.session_id, "user", body.message)

    # 히스토리 구성
    history_text = ""
    for msg in session_manager.get_history(session.session_id, limit=10)[:-1]:
        role = "교수님" if msg.role == "user" else "어시스턴트"
        history_text += f"{role}: {msg.content}\n"

    # 컨텍스트 섹션 구성
    context_section = ""
    if session.context:
        if session.context.get("course_name"):
            context_section += f"\n[강의: {session.context['course_name']}]"
        if session.context.get("student_data"):
            context_section += f"\n[학생 데이터 요약]\n{session.context['student_data']}"
        if session.context.get("assignment_info"):
            context_section += f"\n[과제 정보]\n{session.context['assignment_info']}"

    prompt = PROFESSOR_AGENT_PROMPT.format(
        context_section=context_section,
        history=history_text if history_text else "(첫 대화입니다)",
        message=body.message
    )

    async def generate():
        loop = asyncio.get_running_loop()
        queue: asyncio.Queue = asyncio.Queue()
        full_response = []

        def run_stream():
            try:
                model = get_gemini_model()
                response = model.generate_content(prompt, stream=True)
                for chunk in response:
                    if chunk.text:
                        full_response.append(chunk.text)
                        loop.call_soon_threadsafe(queue.put_nowait, ("chunk", chunk.text))
                loop.call_soon_threadsafe(queue.put_nowait, ("done", "".join(full_response)))
            except Exception as e:
                loop.call_soon_threadsafe(queue.put_nowait, ("error", str(e)))

        loop.run_in_executor(None, run_stream)

        while True:
            event_type, data = await queue.get()
            if event_type == "chunk":
                yield {"event": "message", "data": json.dumps({
                    "type": "chunk",
                    "text": data,
                    "session_id": session.session_id
                }, ensure_ascii=False)}
            elif event_type == "done":
                session_manager.add_message(session.session_id, "assistant", data)
                yield {"event": "message", "data": json.dumps({
                    "type": "done",
                    "session_id": session.session_id
                }, ensure_ascii=False)}
                break
            elif event_type == "error":
                yield {"event": "message", "data": json.dumps({
                    "type": "error",
                    "text": data
                }, ensure_ascii=False)}
                break

    return EventSourceResponse(generate())


# ============ 세션 관리 API ============

@router.get("/session/{agent_type}")
async def get_session_info(agent_type: AgentType, user: dict = Depends(get_current_user)):
    """현재 사용자의 세션 정보 조회"""
    session_manager = get_session_manager()
    user_id = str(user["id"])
    session = session_manager.get_user_session(user_id, agent_type)

    if not session:
        raise HTTPException(status_code=404, detail="세션이 없습니다")

    return SessionResponse(
        session_id=session.session_id,
        agent_type=session.agent_type,
        message_count=len(session.messages)
    )


@router.get("/session/{agent_type}/history")
async def get_session_history(agent_type: AgentType, user: dict = Depends(get_current_user)):
    """세션의 대화 히스토리 조회"""
    session_manager = get_session_manager()
    user_id = str(user["id"])
    session = session_manager.get_user_session(user_id, agent_type)

    if not session:
        raise HTTPException(status_code=404, detail="세션이 없습니다")

    messages = [
        {
            "role": msg.role,
            "content": msg.content,
            "timestamp": msg.timestamp.isoformat()
        }
        for msg in session.messages
    ]

    return HistoryResponse(session_id=session.session_id, messages=messages)


@router.delete("/session/{agent_type}")
async def clear_session(agent_type: AgentType, user: dict = Depends(get_current_user)):
    """세션 대화 내용 초기화"""
    session_manager = get_session_manager()
    user_id = str(user["id"])
    session = session_manager.get_user_session(user_id, agent_type)

    if not session:
        raise HTTPException(status_code=404, detail="세션이 없습니다")

    session_manager.clear_session(session.session_id)
    return {"message": "세션이 초기화되었습니다", "session_id": session.session_id}
