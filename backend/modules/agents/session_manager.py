"""
세션 기반 대화 관리자
- 메모리 기반 세션 저장 (서버 재시작 시 초기화)
- 사용자별, 에이전트 타입별 세션 관리
"""
import uuid
import time
from datetime import datetime
from typing import Literal
from dataclasses import dataclass, field

MAX_SESSIONS_PER_USER = 5
MAX_MESSAGES_PER_SESSION = 100
SESSION_EXPIRY_SECONDS = 3600  # 1시간


AgentType = Literal["student", "professor"]


@dataclass
class Message:
    role: Literal["user", "assistant"]
    content: str
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class Session:
    session_id: str
    user_id: str
    agent_type: AgentType
    messages: list[Message] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    last_accessed: float = field(default_factory=time.time)
    context: dict = field(default_factory=dict)  # 추가 컨텍스트 (과목, 과제 등)


class SessionManager:
    """인메모리 세션 관리자"""

    def __init__(self):
        self._sessions: dict[str, Session] = {}  # session_id -> Session
        self._user_sessions: dict[str, dict[AgentType, str]] = {}  # user_id -> {agent_type -> session_id}

    def create_session(self, user_id: str, agent_type: AgentType, context: dict = None) -> Session:
        """새 세션 생성"""
        session_id = str(uuid.uuid4())
        session = Session(
            session_id=session_id,
            user_id=user_id,
            agent_type=agent_type,
            context=context or {}
        )
        self._sessions[session_id] = session

        # 사용자별 세션 매핑
        if user_id not in self._user_sessions:
            self._user_sessions[user_id] = {}
        self._user_sessions[user_id][agent_type] = session_id

        return session

    def _cleanup_expired(self):
        """만료된 세션을 정리"""
        now = time.time()
        expired_ids = [
            sid for sid, s in self._sessions.items()
            if now - s.last_accessed > SESSION_EXPIRY_SECONDS
        ]
        for sid in expired_ids:
            self.delete_session(sid)

    def get_session(self, session_id: str) -> Session | None:
        """세션 ID로 세션 조회"""
        session = self._sessions.get(session_id)
        if session:
            session.last_accessed = time.time()
        return session

    def get_user_session(self, user_id: str, agent_type: AgentType) -> Session | None:
        """사용자의 특정 에이전트 타입 세션 조회"""
        user_sessions = self._user_sessions.get(user_id, {})
        session_id = user_sessions.get(agent_type)
        if session_id:
            return self._sessions.get(session_id)
        return None

    def get_or_create_session(self, user_id: str, agent_type: AgentType, context: dict = None) -> Session:
        """세션이 있으면 반환, 없으면 생성. 만료 세션 정리 포함."""
        self._cleanup_expired()
        session = self.get_user_session(user_id, agent_type)
        if session:
            session.last_accessed = time.time()
            if context:
                session.context.update(context)
            return session
        return self.create_session(user_id, agent_type, context)

    def add_message(self, session_id: str, role: Literal["user", "assistant"], content: str) -> Message | None:
        """세션에 메시지 추가. 최대 메시지 수 초과 시 오래된 것부터 제거."""
        session = self._sessions.get(session_id)
        if not session:
            return None
        session.last_accessed = time.time()
        message = Message(role=role, content=content)
        session.messages.append(message)
        if len(session.messages) > MAX_MESSAGES_PER_SESSION:
            session.messages = session.messages[-MAX_MESSAGES_PER_SESSION:]
        return message

    def get_history(self, session_id: str, limit: int = 20) -> list[Message]:
        """세션의 최근 대화 히스토리 조회"""
        session = self._sessions.get(session_id)
        if not session:
            return []
        return session.messages[-limit:]

    def clear_session(self, session_id: str) -> bool:
        """세션 대화 내용 초기화"""
        session = self._sessions.get(session_id)
        if session:
            session.messages = []
            return True
        return False

    def delete_session(self, session_id: str) -> bool:
        """세션 삭제"""
        session = self._sessions.get(session_id)
        if session:
            # 사용자 매핑에서도 제거
            user_sessions = self._user_sessions.get(session.user_id, {})
            if session.agent_type in user_sessions:
                del user_sessions[session.agent_type]
            del self._sessions[session_id]
            return True
        return False


# 싱글톤 인스턴스
_session_manager: SessionManager | None = None


def get_session_manager() -> SessionManager:
    global _session_manager
    if _session_manager is None:
        _session_manager = SessionManager()
    return _session_manager
