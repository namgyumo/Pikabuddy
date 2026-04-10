import { useState } from "react";
import type { NoteComment } from "../../types";
import CommentItem from "./CommentItem";

interface Props {
  thread: NoteComment;
  replies: NoteComment[];
  currentUserId: string;
  currentUserRole: string;
  isNoteOwner: boolean;
  onReply: (parentId: string, content: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onResolve: (commentId: string, resolved: boolean) => void;
}

export default function CommentThread({
  thread, replies, currentUserId, currentUserRole, isNoteOwner,
  onReply, onEdit, onDelete, onResolve,
}: Props) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");

  const handleSubmitReply = () => {
    if (!replyText.trim()) return;
    onReply(thread.id, replyText.trim());
    setReplyText("");
    setReplyOpen(false);
  };

  return (
    <div className="comment-thread">
      <CommentItem
        comment={thread}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        isNoteOwner={isNoteOwner}
        onReply={() => setReplyOpen(!replyOpen)}
        onEdit={onEdit}
        onDelete={onDelete}
        onResolve={onResolve}
      />

      {replies.length > 0 && (
        <div className="comment-replies">
          {replies.map((r) => (
            <CommentItem
              key={r.id}
              comment={r}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              isNoteOwner={isNoteOwner}
              onReply={() => setReplyOpen(true)}
              onEdit={onEdit}
              onDelete={onDelete}
              onResolve={onResolve}
              isReply
            />
          ))}
        </div>
      )}

      {replyOpen && (
        <div className="comment-reply-input">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="답글을 입력하세요..."
            rows={2}
            className="comment-textarea"
          />
          <div className="comment-reply-actions">
            <button className="btn-sm btn-primary" onClick={handleSubmitReply} disabled={!replyText.trim()}>
              답글 달기
            </button>
            <button className="btn-sm btn-ghost" onClick={() => { setReplyOpen(false); setReplyText(""); }}>
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
