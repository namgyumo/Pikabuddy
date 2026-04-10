import { useEffect, useState, useRef, useCallback } from "react";
import { useCommentStore } from "../../store/commentStore";
import type { NoteComment } from "../../types";

interface Props {
  editorRef: React.RefObject<HTMLDivElement | null>;
  noteId: string;
  noteOwnerId: string;
  currentUserId: string;
  currentUserRole: string;
}

interface BlockPos {
  top: number;
  height: number;
}

export default function BlockCommentOverlay({
  editorRef, noteId, currentUserId, currentUserRole,
}: Props) {
  const { comments, counts, addComment, resolveComment, submitting } = useCommentStore();
  const [expandedBlock, setExpandedBlock] = useState<number | null>(null);
  const [blockPositions, setBlockPositions] = useState<BlockPos[]>([]);
  const [newComment, setNewComment] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  // Listen for block-comment-toggle events from BlockHandleExtension
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.blockIndex != null) {
        setExpandedBlock((prev) => (prev === detail.blockIndex ? null : detail.blockIndex));
        setNewComment("");
      }
    };
    window.addEventListener("block-comment-toggle", handler);
    return () => window.removeEventListener("block-comment-toggle", handler);
  }, []);

  // Measure ProseMirror block positions
  const measure = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const pm = el.querySelector(".ProseMirror");
    if (!pm) return;

    const containerRect = el.getBoundingClientRect();
    const positions: BlockPos[] = [];
    for (let i = 0; i < pm.children.length; i++) {
      const child = pm.children[i] as HTMLElement;
      const rect = child.getBoundingClientRect();
      positions.push({
        top: rect.top - containerRect.top + el.scrollTop,
        height: rect.height,
      });
    }
    setBlockPositions(positions);
  }, [editorRef]);

  useEffect(() => {
    measure();
    const el = editorRef.current;
    if (!el) return;
    const pm = el.querySelector(".ProseMirror");
    if (!pm) return;

    const observer = new MutationObserver(measure);
    observer.observe(pm, { childList: true, subtree: true, characterData: true, attributes: true });

    const resizeObs = new ResizeObserver(measure);
    resizeObs.observe(pm);

    el.addEventListener("scroll", measure);
    return () => {
      observer.disconnect();
      resizeObs.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [editorRef, measure]);

  // Re-measure when expanded block or comments change
  useEffect(() => {
    const timer = setTimeout(measure, 50);
    return () => clearTimeout(timer);
  }, [expandedBlock, comments.length, measure]);

  const blockCounts = counts.block_counts;

  const getBlockComments = (blockIndex: number): NoteComment[] => {
    return comments.filter((c) => c.block_index === blockIndex && !c.parent_id);
  };

  const getReplies = (parentId: string): NoteComment[] => {
    return comments.filter((c) => c.parent_id === parentId);
  };

  const handleAdd = async (blockIndex: number) => {
    if (!newComment.trim()) return;
    await addComment(noteId, { block_index: blockIndex, content: newComment.trim() });
    setNewComment("");
  };

  const toggleBlock = (index: number) => {
    setExpandedBlock((prev) => (prev === index ? null : index));
    setNewComment("");
  };

  return (
    <div ref={overlayRef} className="block-comment-overlay" style={{ position: "absolute", top: 0, left: 0, right: 0, pointerEvents: "none", zIndex: 6 }}>
      {blockPositions.map((pos, i) => {
        const count = blockCounts[i] || 0;
        const isExpanded = expandedBlock === i;

        // 코멘트가 있는 블록에만 우측 뱃지 표시
        const showBadge = count > 0;

        return (
          <div key={i}>
            {/* 코멘트 수 뱃지 (우측) — 코멘트가 있을 때만 */}
            {showBadge && (
              <button
                className={`block-comment-indicator${isExpanded ? " active" : ""}`}
                style={{
                  position: "absolute",
                  top: pos.top + 2,
                  right: 4,
                  pointerEvents: "auto",
                }}
                onClick={() => toggleBlock(i)}
              >
                <span>{count}</span>
                <span className={`bci-chevron${isExpanded ? " open" : ""}`}>&rsaquo;</span>
              </button>
            )}

            {/* 펼쳐진 인라인 코멘트 영역 */}
            {isExpanded && (
              <div
                className="block-inline-comments"
                style={{
                  position: "absolute",
                  top: pos.top + pos.height + 2,
                  left: 12,
                  right: 12,
                  pointerEvents: "auto",
                }}
              >
                <div className="block-inline-comments-header">
                  <span>블록 {i + 1} 코멘트 ({count})</span>
                  <button
                    className="bic-resolve-btn"
                    onClick={() => toggleBlock(i)}
                  >
                    접기 &times;
                  </button>
                </div>

                {getBlockComments(i).length === 0 && (
                  <div style={{ fontSize: 12, color: "var(--on-surface-variant)", padding: "4px 0" }}>
                    아직 코멘트가 없습니다.
                  </div>
                )}

                {getBlockComments(i).map((c) => (
                  <div key={c.id} className={`bic-item${c.is_resolved ? " bic-resolved" : ""}`}>
                    <div className="bic-author">
                      {c.user_name}
                      <span className="bic-role">{c.user_role === "professor" ? "교수" : "학생"}</span>
                      {(currentUserRole === "professor" || c.user_id === currentUserId) && (
                        <button
                          className="bic-resolve-btn"
                          onClick={() => resolveComment(c.id, !c.is_resolved)}
                        >
                          {c.is_resolved ? "미해결" : "해결"}
                        </button>
                      )}
                    </div>
                    <div className="bic-content">{c.content}</div>
                    <div className="bic-time">
                      {new Date(c.created_at).toLocaleDateString("ko-KR", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </div>
                    {/* 답글 */}
                    {getReplies(c.id).map((r) => (
                      <div key={r.id} className="bic-item" style={{ marginLeft: 16, borderLeft: "2px solid var(--outline-variant)", paddingLeft: 10 }}>
                        <div className="bic-author">
                          {r.user_name}
                          <span className="bic-role">{r.user_role === "professor" ? "교수" : "학생"}</span>
                        </div>
                        <div className="bic-content">{r.content}</div>
                      </div>
                    ))}
                  </div>
                ))}

                <div className="bic-input-row">
                  <input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={`블록 ${i + 1}에 코멘트 달기...`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAdd(i);
                      }
                    }}
                  />
                  <button onClick={() => handleAdd(i)} disabled={!newComment.trim() || submitting}>
                    {submitting ? "..." : "추가"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
