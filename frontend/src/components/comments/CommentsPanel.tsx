import { useEffect, useState, useMemo } from "react";
import { useCommentStore } from "../../store/commentStore";
import CommentThread from "./CommentThread";

interface Props {
  noteId: string;
  noteOwnerId: string;
  currentUserId: string;
  currentUserRole: string;
  activeBlockIndex?: number | null;
  onBlockClick?: (index: number | null) => void;
}

export default function CommentsPanel({
  noteId, noteOwnerId, currentUserId, currentUserRole,
  activeBlockIndex, onBlockClick,
}: Props) {
  const { comments, counts, loading, submitting, fetchComments, fetchCounts, addComment } = useCommentStore();
  const [newComment, setNewComment] = useState("");
  const [filterBlock, setFilterBlock] = useState<number | "all" | "general">("all");

  useEffect(() => {
    fetchComments(noteId);
    fetchCounts(noteId);
  }, [noteId, fetchComments, fetchCounts]);

  // activeBlockIndex가 바뀌면 필터 동기화
  useEffect(() => {
    if (activeBlockIndex !== undefined && activeBlockIndex !== null) {
      setFilterBlock(activeBlockIndex);
    }
  }, [activeBlockIndex]);

  // 스레드 구조 정리
  const { threads, replyMap } = useMemo(() => {
    const topLevel = comments.filter((c) => !c.parent_id);
    const replies = new Map<string, typeof comments>();
    for (const c of comments) {
      if (c.parent_id) {
        const arr = replies.get(c.parent_id) || [];
        arr.push(c);
        replies.set(c.parent_id, arr);
      }
    }
    return { threads: topLevel, replyMap: replies };
  }, [comments]);

  // 필터링
  const filtered = useMemo(() => {
    if (filterBlock === "all") return threads;
    if (filterBlock === "general") return threads.filter((t) => t.block_index === null);
    return threads.filter((t) => t.block_index === filterBlock);
  }, [threads, filterBlock]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    const blockIdx = filterBlock === "all" || filterBlock === "general" ? null : filterBlock;
    await addComment(noteId, {
      block_index: blockIdx,
      content: newComment.trim(),
    });
    setNewComment("");
  };

  const handleReply = async (parentId: string, content: string) => {
    const parent = comments.find((c) => c.id === parentId);
    await addComment(noteId, {
      block_index: parent?.block_index ?? null,
      parent_id: parentId,
      content,
    });
  };

  const isNoteOwner = noteOwnerId === currentUserId;

  // 블록 인덱스 목록 (코멘트가 있는)
  const blockIndices = useMemo(() => {
    const set = new Set<number>();
    for (const c of threads) {
      if (c.block_index !== null) set.add(c.block_index);
    }
    return [...set].sort((a, b) => a - b);
  }, [threads]);

  return (
    <div className="comments-panel">
      <div className="comments-panel-header">
        <h4>코멘트</h4>
        <span className="comments-count">
          {counts.total}개{counts.unresolved > 0 && ` (미해결 ${counts.unresolved})`}
        </span>
      </div>

      {/* 필터 */}
      <div className="comments-filter">
        <button
          className={`comments-filter-btn${filterBlock === "all" ? " active" : ""}`}
          onClick={() => { setFilterBlock("all"); onBlockClick?.(null); }}
        >
          전체
        </button>
        <button
          className={`comments-filter-btn${filterBlock === "general" ? " active" : ""}`}
          onClick={() => { setFilterBlock("general"); onBlockClick?.(null); }}
        >
          노트 전체
        </button>
        {blockIndices.map((bi) => (
          <button
            key={bi}
            className={`comments-filter-btn${filterBlock === bi ? " active" : ""}`}
            onClick={() => { setFilterBlock(bi); onBlockClick?.(bi); }}
          >
            블록 {bi + 1}
          </button>
        ))}
      </div>

      {/* 코멘트 목록 */}
      <div className="comments-list">
        {loading && comments.length === 0 && (
          <div className="comments-empty">불러오는 중...</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="comments-empty">코멘트가 없습니다.</div>
        )}
        {filtered.map((thread) => (
          <CommentThread
            key={thread.id}
            thread={thread}
            replies={replyMap.get(thread.id) || []}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            isNoteOwner={isNoteOwner}
            onReply={handleReply}
            onEdit={(id, content) => useCommentStore.getState().updateComment(id, content)}
            onDelete={(id) => useCommentStore.getState().deleteComment(id)}
            onResolve={(id, resolved) => useCommentStore.getState().resolveComment(id, resolved)}
          />
        ))}
      </div>

      {/* 새 코멘트 입력 */}
      <div className="comments-new">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={
            filterBlock !== "all" && filterBlock !== "general"
              ? `블록 ${(filterBlock as number) + 1}에 코멘트 달기...`
              : "코멘트를 작성하세요..."
          }
          rows={2}
          className="comment-textarea"
        />
        <button
          className="btn-sm btn-primary"
          onClick={handleAddComment}
          disabled={!newComment.trim() || submitting}
        >
          {submitting ? "..." : "코멘트 달기"}
        </button>
      </div>
    </div>
  );
}
