import { useState } from "react";
import type { NoteComment } from "../../types";

interface Props {
  comment: NoteComment;
  currentUserId: string;
  currentUserRole: string;
  isNoteOwner: boolean;
  onReply: (parentId: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onResolve: (commentId: string, resolved: boolean) => void;
  isReply?: boolean;
}

export default function CommentItem({
  comment, currentUserId, currentUserRole, isNoteOwner,
  onReply, onEdit, onDelete, onResolve, isReply,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);

  const isMine = comment.user_id === currentUserId;
  const canDelete = isMine || currentUserRole === "professor";
  const canResolve = currentUserRole === "professor" || isNoteOwner;
  const roleLabel = comment.user_role === "professor" ? "교수" : "학생";

  const handleSaveEdit = () => {
    if (editText.trim() && editText.trim() !== comment.content) {
      onEdit(comment.id, editText.trim());
    }
    setEditing(false);
  };

  return (
    <div className={`comment-item${isReply ? " comment-reply" : ""}${comment.is_resolved ? " resolved" : ""}`}>
      <div className="comment-item-header">
        <div className="comment-avatar">
          {comment.user_avatar_url ? (
            <img src={comment.user_avatar_url} alt="" />
          ) : (
            <span>{comment.user_name?.charAt(0)?.toUpperCase() || "?"}</span>
          )}
        </div>
        <div className="comment-meta">
          <span className="comment-author">{comment.user_name}</span>
          <span className={`comment-role-badge ${comment.user_role}`}>{roleLabel}</span>
          <span className="comment-time">
            {new Date(comment.created_at).toLocaleDateString("ko-KR", {
              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </span>
        </div>
        {comment.is_resolved && <span className="comment-resolved-badge">해결됨</span>}
      </div>

      {editing ? (
        <div className="comment-edit-area">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="comment-edit-input"
            rows={2}
          />
          <div className="comment-edit-actions">
            <button className="btn-sm" onClick={handleSaveEdit}>저장</button>
            <button className="btn-sm btn-ghost" onClick={() => setEditing(false)}>취소</button>
          </div>
        </div>
      ) : (
        <div className="comment-content">{comment.content}</div>
      )}

      <div className="comment-actions">
        {!isReply && (
          <button className="comment-action-btn" onClick={() => onReply(comment.id)}>
            답글
          </button>
        )}
        {isMine && !editing && (
          <button className="comment-action-btn" onClick={() => { setEditText(comment.content); setEditing(true); }}>
            수정
          </button>
        )}
        {canDelete && (
          <button className="comment-action-btn danger" onClick={() => onDelete(comment.id)}>
            삭제
          </button>
        )}
        {canResolve && !isReply && (
          <button
            className={`comment-action-btn${comment.is_resolved ? " resolve-undo" : " resolve"}`}
            onClick={() => onResolve(comment.id, !comment.is_resolved)}
          >
            {comment.is_resolved ? "미해결로" : "해결"}
          </button>
        )}
      </div>
    </div>
  );
}
