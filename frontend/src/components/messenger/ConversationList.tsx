import type { ConversationItem } from "../../types";

interface Props {
  conversations: ConversationItem[];
  activePartnerId: string | null;
  onSelect: (partnerId: string) => void;
  loading: boolean;
}

export default function ConversationList({ conversations, activePartnerId, onSelect, loading }: Props) {
  if (loading && conversations.length === 0) {
    return <div className="messenger-empty">대화 목록을 불러오는 중...</div>;
  }

  if (conversations.length === 0) {
    return <div className="messenger-empty">아직 대화 상대가 없습니다.</div>;
  }

  return (
    <div className="conversation-list">
      {conversations.map((conv) => {
        const isActive = conv.partner.id === activePartnerId;
        const lastMsg = conv.last_message;
        return (
          <button
            key={conv.partner.id}
            className={`conversation-item${isActive ? " active" : ""}`}
            onClick={() => onSelect(conv.partner.id)}
          >
            <div className="conversation-avatar">
              {conv.partner.avatar_url ? (
                <img src={conv.partner.avatar_url} alt="" />
              ) : (
                <span>{conv.partner.name?.charAt(0)?.toUpperCase() || "?"}</span>
              )}
            </div>
            <div className="conversation-info">
              <div className="conversation-name">{conv.partner.name}</div>
              {lastMsg && (
                <div className="conversation-preview">
                  {lastMsg.content.length > 40
                    ? lastMsg.content.slice(0, 40) + "..."
                    : lastMsg.content}
                </div>
              )}
            </div>
            {conv.unread_count > 0 && (
              <span className="conversation-badge">{conv.unread_count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
