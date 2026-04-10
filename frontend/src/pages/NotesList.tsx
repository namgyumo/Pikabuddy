import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import AppShell from "../components/common/AppShell";
import type { Note, Course } from "../types";

export default function NotesList() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const materialParam = searchParams.get("material");
  const [notes, setNotes] = useState<Note[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string; childCount: number } | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [commentSummary, setCommentSummary] = useState<Record<string, { total: number; unresolved: number }>>({});

  useEffect(() => {
    if (!courseId) return;
    Promise.all([
      api.get(`/courses/${courseId}/notes`),
      api.get(`/courses/${courseId}`),
      api.get(`/courses/${courseId}/notes/comment-summary`).catch(() => ({ data: {} })),
    ]).then(([notesRes, courseRes, commentRes]) => {
      setNotes(notesRes.data);
      setCourse(courseRes.data);
      setCommentSummary(commentRes.data || {});
      setLoading(false);
    });
  }, [courseId]);

  const matSuffix = materialParam ? `?material=${materialParam}` : "";
  const handleCreateNote = () => {
    navigate(`/courses/${courseId}/notes/new${matSuffix}`);
  };

  const handleDelete = (id: string, title: string, childCount: number) => {
    setDeleteTarget({ id, title, childCount });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/notes/${deleteTarget.id}`);
      setNotes((prev) => prev.filter((n) => n.id !== deleteTarget.id && n.parent_id !== deleteTarget.id));
    } catch { /* silent */ }
    setDeleteTarget(null);
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredNotes = searchQuery
    ? notes.filter((n) => n.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : notes;

  // Separate root notes and child notes
  const rootNotes = filteredNotes.filter((n) => !n.parent_id);
  const childMap = new Map<string, Note[]>();
  for (const n of notes) {
    if (n.parent_id) {
      const children = childMap.get(n.parent_id) || [];
      children.push(n);
      childMap.set(n.parent_id, children);
    }
  }

  if (loading) {
    return (
      <AppShell courseTitle={course?.title}>
        <div className="loading-spinner" style={{ marginTop: 120 }}>
          노트를 불러오는 중...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell courseTitle={course?.title}>
      <main className="content">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h1 className="page-title" style={{ marginBottom: 0 }}>노트</h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              placeholder="노트 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "6px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--outline-variant)",
                fontSize: 13, background: "var(--surface-container-lowest)", color: "var(--on-surface)", width: 180,
              }}
            />
            <button
              onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
              style={{
                padding: "6px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--outline-variant)",
                background: "var(--surface-container-lowest)", cursor: "pointer", fontSize: 14,
              }}
              title={viewMode === "list" ? "그리드 뷰" : "목록 뷰"}
            >
              {viewMode === "list" ? "\u{25A6}" : "\u{2630}"}
            </button>
          </div>
        </div>
        <p className="page-subtitle">
          강의 내용을 정리하고 AI가 이해도를 분석해드립니다.
        </p>

        <div className="page-header">
          <h2 className="section-title">내 노트 목록</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => navigate(`/courses/${courseId}/graph`)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4, verticalAlign: -2 }}>
                <circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/>
                <circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/>
                <line x1="8.5" y1="7.5" x2="15.5" y2="16.5"/>
                <line x1="15.5" y1="7.5" x2="8.5" y2="16.5"/>
              </svg>
              노트 지도
            </button>
            <button className="btn btn-primary" onClick={handleCreateNote}>
              + 새 노트 작성
            </button>
          </div>
        </div>

        {rootNotes.length === 0 ? (
          <div className="empty">
            아직 작성한 노트가 없습니다.
            <br />
            "새 노트 작성"으로 강의 내용을 정리해보세요.
          </div>
        ) : (
          <div className="course-grid">
            {rootNotes.map((note) => {
              const children = childMap.get(note.id) || [];
              const isOpen = expanded.has(note.id);
              return (
                <div key={note.id} className="note-tree-item">
                  <div className="card course-card note-card-row">
                    {/* 토글 버튼 */}
                    {children.length > 0 ? (
                      <button
                        className={`note-expand-btn${isOpen ? " open" : ""}`}
                        onClick={(e) => { e.stopPropagation(); toggleExpand(note.id); }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </button>
                    ) : (
                      <div style={{ width: 28 }} />
                    )}

                    {/* 카드 본문 */}
                    <div
                      className="note-card-body"
                      onClick={() => navigate(`/courses/${courseId}/notes/${note.id}${matSuffix}`)}
                    >
                      <h3>{note.title}</h3>
                      <p style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>
                        {new Date(note.updated_at).toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <div className="course-meta">
                        {note.understanding_score != null && (
                          <span className="badge badge-policy">
                            이해도 {note.understanding_score}%
                          </span>
                        )}
                        {note.gap_analysis && (
                          <span className="badge">분석 완료</span>
                        )}
                        {children.length > 0 && (
                          <span className="badge" style={{ background: "rgba(0,74,198,0.08)", color: "var(--primary)" }}>
                            하위 {children.length}개
                          </span>
                        )}
                        {commentSummary[note.id]?.unresolved > 0 && (
                          <span className="note-card-badge comments">
                            💬 {commentSummary[note.id].unresolved}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 삭제 버튼 */}
                    <button
                      className="note-delete-btn"
                      title="노트 삭제"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(note.id, note.title, children.length);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>

                  {/* 하위 노트 (토글) */}
                  {isOpen && children.length > 0 && (
                    <div className="sub-notes-list">
                      {children.map((child) => (
                        <div
                          key={child.id}
                          className="sub-note-card"
                          onClick={() =>
                            navigate(`/courses/${courseId}/notes/${child.id}${matSuffix}`)
                          }
                        >
                          <span className="sub-note-card-icon">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          </span>
                          <span className="sub-note-card-title">{child.title}</span>
                          <span className="sub-note-card-date">
                            {new Date(child.updated_at).toLocaleDateString("ko-KR", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <button
                            className="note-delete-btn small"
                            title="삭제"
                            onClick={(e) => { e.stopPropagation(); handleDelete(child.id, child.title, 0); }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="confirm-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </div>
            <h3 className="confirm-title">노트 삭제</h3>
            <p className="confirm-desc">
              <strong>{deleteTarget.title}</strong>
              {deleteTarget.childCount > 0
                ? ` 노트와 하위 ${deleteTarget.childCount}개 노트가 모두 삭제됩니다.`
                : " 노트를 삭제합니다."}
              <br />이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="confirm-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>취소</button>
              <button className="btn btn-danger" onClick={confirmDelete}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
