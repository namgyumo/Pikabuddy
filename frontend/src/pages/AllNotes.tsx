import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import AppShell from "../components/common/AppShell";
import type { Note, Course } from "../types";

/** Tiptap JSON → plain text preview (first ~120 chars) */
function extractPreview(content: Record<string, unknown> | null | undefined, maxLen = 120): string {
  if (!content) return "";
  try {
    const texts: string[] = [];
    const walk = (node: any) => {
      if (texts.join(" ").length > maxLen) return;
      if (node.text) texts.push(node.text);
      if (Array.isArray(node.content)) node.content.forEach(walk);
    };
    walk(content);
    const joined = texts.join(" ").replace(/\s+/g, " ").trim();
    return joined.length > maxLen ? joined.slice(0, maxLen) + "…" : joined;
  } catch {
    return "";
  }
}

interface NoteWithCourse extends Note {
  courseName: string;
}

export default function AllNotes() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<NoteWithCourse[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"updated" | "created" | "score">("updated");
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");

  useEffect(() => {
    (async () => {
      try {
        const { data: courseList } = await api.get("/courses");
        setCourses(courseList);
        // Fetch notes from all courses in parallel
        const results = await Promise.all(
          courseList.map((c: Course) =>
            api.get(`/courses/${c.id}/notes`).catch(() => ({ data: [] }))
          )
        );
        const all: NoteWithCourse[] = [];
        for (let i = 0; i < courseList.length; i++) {
          for (const n of results[i].data || []) {
            all.push({ ...n, courseName: courseList[i].title });
          }
        }
        setNotes(all);
      } catch { /* */ }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = notes;
    if (courseFilter !== "all") {
      list = list.filter((n) => n.course_id === courseFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((n) => n.title.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      if (sortBy === "score") {
        return (b.understanding_score ?? -1) - (a.understanding_score ?? -1);
      }
      if (sortBy === "created") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
    return list;
  }, [notes, courseFilter, search, sortBy]);

  // Stats
  const totalNotes = notes.length;
  const avgScore = (() => {
    const scored = notes.filter((n) => n.understanding_score != null);
    if (scored.length === 0) return null;
    return Math.round(scored.reduce((s, n) => s + (n.understanding_score ?? 0), 0) / scored.length);
  })();

  if (loading) {
    return <AppShell><div className="loading-spinner" style={{ marginTop: 120 }}>노트를 불러오는 중...</div></AppShell>;
  }

  return (
    <AppShell>
      <main className="content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 className="page-title">My Notes</h1>
            <p className="page-subtitle">모든 강의의 노트를 한곳에서 관리하세요</p>
          </div>
          {/* Stats */}
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{
              padding: "12px 20px", borderRadius: 12, background: "var(--surface-container)",
              textAlign: "center", minWidth: 80,
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--primary)" }}>{totalNotes}</div>
              <div style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>전체 노트</div>
            </div>
            <div style={{
              padding: "12px 20px", borderRadius: 12, background: "var(--surface-container)",
              textAlign: "center", minWidth: 80,
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--tertiary)" }}>{courses.length}</div>
              <div style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>강의</div>
            </div>
            {avgScore != null && (
              <div style={{
                padding: "12px 20px", borderRadius: 12, background: "var(--surface-container)",
                textAlign: "center", minWidth: 80,
              }}>
                <div style={{
                  fontSize: 22, fontWeight: 700,
                  color: avgScore >= 80 ? "#16a34a" : avgScore >= 60 ? "#d97706" : "#dc2626",
                }}>{avgScore}</div>
                <div style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>평균 이해도</div>
              </div>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="card" style={{ marginBottom: 20, padding: "12px 16px" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              className="input"
              placeholder="노트 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 160, maxWidth: 300 }}
            />
            <select
              className="input"
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              style={{ maxWidth: 200 }}
            >
              <option value="all">모든 강의</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <select
              className="input"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              style={{ maxWidth: 140 }}
            >
              <option value="updated">최근 수정순</option>
              <option value="created">생성일순</option>
              <option value="score">이해도순</option>
            </select>
            <div style={{ display: "flex", gap: 0 }}>
              <button
                className={`btn ${viewMode === "grid" ? "btn-primary" : "btn-secondary"}`}
                style={{ borderRadius: "8px 0 0 8px", padding: "6px 12px", fontSize: 13 }}
                onClick={() => setViewMode("grid")}
              >Grid</button>
              <button
                className={`btn ${viewMode === "list" ? "btn-primary" : "btn-secondary"}`}
                style={{ borderRadius: "0 8px 8px 0", padding: "6px 12px", fontSize: 13 }}
                onClick={() => setViewMode("list")}
              >List</button>
            </div>
            {/* Unified graph */}
            <button
              className="btn btn-secondary"
              style={{ fontSize: 13 }}
              onClick={() => navigate(courseFilter !== "all" ? `/courses/${courseFilter}/graph` : "/all-notes/graph")}
            >
              &#x1F578; {courseFilter !== "all" ? "노트 지도" : "통합 노트 지도"}
            </button>
          </div>
        </div>

        {/* Course graph shortcuts */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {totalNotes > 0 && (
            <button
              className="btn btn-primary"
              style={{ fontSize: 12, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}
              onClick={() => navigate("/all-notes/graph")}
            >
              <span>&#x1F310;</span>
              통합 노트 지도 ({totalNotes})
            </button>
          )}
          {courses.map((c) => {
            const count = notes.filter((n) => n.course_id === c.id).length;
            if (count === 0) return null;
            return (
              <button
                key={c.id}
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}
                onClick={() => navigate(`/courses/${c.id}/graph`)}
              >
                <span>&#x1F578;</span>
                {c.title} 노트 지도 ({count})
              </button>
            );
          })}
        </div>

        {/* Notes */}
        {filtered.length === 0 ? (
          <div className="empty" style={{ marginTop: 60 }}>
            {search || courseFilter !== "all" ? "검색 결과가 없습니다." : "아직 노트가 없습니다. 강의에 들어가서 노트를 작성해보세요!"}
          </div>
        ) : viewMode === "grid" ? (
          /* ── Card-style grid: tall cards with content preview ── */
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 18,
          }}>
            {filtered.map((n) => {
              const preview = extractPreview(n.content as Record<string, unknown>);
              return (
                <div
                  key={n.id}
                  className="card"
                  style={{
                    cursor: "pointer", padding: 0, overflow: "hidden",
                    transition: "transform 0.15s, box-shadow 0.15s",
                    display: "flex", flexDirection: "column",
                    minHeight: 200,
                  }}
                  onClick={() => navigate(`/courses/${n.course_id}/notes/${n.id}`)}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.14)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                >
                  {/* Color strip top */}
                  <div style={{
                    height: 4,
                    background: n.understanding_score != null
                      ? n.understanding_score >= 80 ? "linear-gradient(90deg, #22c55e, #4ade80)"
                        : n.understanding_score >= 60 ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                        : "linear-gradient(90deg, #ef4444, #f87171)"
                      : "var(--primary)",
                  }} />
                  <div style={{ padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column" }}>
                    {/* Header: course + badges */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {n.courseName}
                      </span>
                      {n.team_id && (
                        <span style={{
                          fontSize: 9, padding: "1px 5px", borderRadius: 4,
                          background: "rgba(99,46,205,0.1)", color: "var(--tertiary)", fontWeight: 600,
                        }}>팀</span>
                      )}
                    </div>
                    {/* Title */}
                    <h3 style={{
                      margin: "0 0 8px", fontSize: 16, fontWeight: 700, lineHeight: 1.3,
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                      overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {n.title || "제목 없음"}
                    </h3>
                    {/* Content preview */}
                    <p style={{
                      margin: 0, fontSize: 13, lineHeight: 1.5,
                      color: "var(--on-surface-variant)", flex: 1,
                      display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
                      overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {preview || "내용 없음"}
                    </p>
                    {/* Footer */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--outline-variant, rgba(0,0,0,0.08))" }}>
                      <span style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>
                        {new Date(n.updated_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {n.understanding_score != null && (
                        <span style={{
                          fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 12,
                          background: n.understanding_score >= 80 ? "rgba(34,197,94,0.12)" : n.understanding_score >= 60 ? "rgba(245,158,11,0.12)" : "rgba(220,38,38,0.12)",
                          color: n.understanding_score >= 80 ? "#16a34a" : n.understanding_score >= 60 ? "#d97706" : "#dc2626",
                        }}>{n.understanding_score}점</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Compact list: same layout as old grid (small info cards in a grid) ── */
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 12,
          }}>
            {filtered.map((n) => (
              <div
                key={n.id}
                className="card"
                style={{ cursor: "pointer", padding: "14px 16px", transition: "transform 0.12s, box-shadow 0.12s" }}
                onClick={() => navigate(`/courses/${n.course_id}/notes/${n.id}`)}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {n.title || "제목 없음"}
                  </h3>
                  {n.understanding_score != null && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 10,
                      background: n.understanding_score >= 80 ? "rgba(34,197,94,0.12)" : n.understanding_score >= 60 ? "rgba(245,158,11,0.12)" : "rgba(220,38,38,0.12)",
                      color: n.understanding_score >= 80 ? "#16a34a" : n.understanding_score >= 60 ? "#d97706" : "#dc2626",
                      flexShrink: 0, marginLeft: 8,
                    }}>{n.understanding_score}점</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, color: "var(--primary)", fontWeight: 500 }}>{n.courseName}</span>
                  {n.team_id && (
                    <span style={{
                      fontSize: 9, padding: "1px 5px", borderRadius: 4,
                      background: "rgba(99,46,205,0.1)", color: "var(--tertiary)",
                    }}>팀</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "var(--on-surface-variant)", marginTop: 4 }}>
                  {new Date(n.updated_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}
