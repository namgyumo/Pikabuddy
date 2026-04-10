import { useState, useRef, useEffect } from "react";
import type { Message, ConversationPartner } from "../../types";

interface Props {
  messages: Message[];
  partner: ConversationPartner | null;
  currentUserId: string;
  sending: boolean;
  onSend: (content: string) => void;
}

export default function ChatView({ messages, partner, currentUserId, sending, onSend }: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLenRef = useRef(0);

  // 새 메시지 시 자동 스크롤
  useEffect(() => {
    if (messages.length > prevLenRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLenRef.current = messages.length;
  }, [messages.length]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || sending) return;
    onSend(text);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!partner) {
    return (
      <div className="chat-empty">
        <div className="chat-empty-icon">💬</div>
        <div className="chat-empty-text">대화 상대를 선택해주세요</div>
      </div>
    );
  }

  return (
    <div className="chat-view">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-avatar">
          {partner.avatar_url ? (
            <img src={partner.avatar_url} alt="" />
          ) : (
            <span>{partner.name?.charAt(0)?.toUpperCase()}</span>
          )}
        </div>
        <div className="chat-header-name">{partner.name}</div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-messages-empty">첫 메시지를 보내보세요!</div>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUserId;
          return (
            <div key={msg.id} className={`chat-bubble-wrap ${isMine ? "mine" : "theirs"}`}>
              <div className={`chat-bubble ${isMine ? "mine" : "theirs"}`}>
                <div className="chat-bubble-text">{msg.content}</div>
                <div className="chat-bubble-time">
                  {new Date(msg.created_at).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {isMine && (
                    <span className={`chat-read-status${msg.is_read ? " read" : ""}`}>
                      {" "}✓
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <textarea
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요..."
          rows={1}
          maxLength={2000}
        />
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={!input.trim() || sending}
        >
          {sending ? "..." : "전송"}
        </button>
      </div>
    </div>
  );
}
