import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { renderMarkdown } from "../lib/markdown";
import api from "../lib/api";
import { toast } from "../lib/toast";
import AppShell from "../components/common/AppShell";
import type { Assignment, Problem } from "../types";

interface SubmissionItem {
  id: string;
  code: string;
  status: string;
  submitted_at: string;
  problem_index?: number;
  ai_analyses?: {
    id: string;
    score: number | null;
    final_score: number | null;
    feedback: string | null;
    suggestions: string[] | null;
  }[];
}

export default function PersonalAssignmentDetail() {
  const { courseId, assignmentId } = useParams<{ courseId: string; assignmentId: string }>();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editTopic, setEditTopic] = useState("");
  const [saving, setSaving] = useState(false);

  // Problem editing
  const [editingProblem, setEditingProblem] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Problem>>({});

  // Expanded submissions per problem
  const [expandedProblems, setExpandedProblems] = useState<Set<number>>(new Set());

  // View code modal
  const [viewingSub, setViewingSub] = useState<SubmissionItem | null>(null);

  // Confirm dialog
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    if (!courseId || !assignmentId) return;
    (async () => {
      try {
        const [aRes, sRes] = await Promise.all([
          api.get(`/courses/${courseId}/assignments/${assignmentId}`),
          api.get(`/courses/${courseId}/assignments/${assignmentId}/submissions`),
        ]);
        setAssignment(aRes.data);
        setSubmissions(sRes.data || []);
        setEditTitle(aRes.data.title);
        setEditTopic(aRes.data.topic || "");
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId, assignmentId]);

  const handleSaveEdit = async () => {
    if (!courseId || !assignmentId) return;
    setSaving(true);
    try {
      await api.patch(`/courses/${courseId}/assignments/${assignmentId}`, {
        title: editTitle,
        topic: editTopic,
      });
      setAssignment((prev) => prev ? { ...prev, title: editTitle, topic: editTopic } : prev);
      setEditing(false);
    } catch {
      toast.error("수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAssignment = () => {
    setConfirm({
      title: "챌린지 삭제",
      message: "이 챌린지를 삭제하시겠습니까?\n모든 제출물과 AI 분석이 함께 삭제됩니다.",
      onConfirm: async () => {
        await api.delete(`/courses/${courseId}/assignments/${assignmentId}`);
        navigate(`/personal`);
      },
    });
  };

  const handleSaveProblem = async () => {
    if (!courseId || !assignmentId || editingProblem === null) return;
    await api.patch(`/courses/${courseId}/assignments/${assignmentId}/problems/${editingProblem}`, editForm);
    setAssignment((prev) => {
      if (!prev) return prev;
      return { ...prev, problems: prev.problems.map((p) => p.id === editingProblem ? { ...p, ...editForm } as Problem : p) };
    });
    setEditingProblem(null);
    setEditForm({});
  };

  const handleDeleteProblem = (problemId: number) => {
    setConfirm({
      title: "문제 삭제",
      message: "이 문제를 삭제하시겠습니까?",
      onConfirm: async () => {
        await api.delete(`/courses/${courseId}/assignments/${assignmentId}/problems/${problemId}`);
        setAssignment((prev) => prev ? { ...prev, problems: prev.problems.filter((p) => p.id !== problemId) } : prev);
      },
    });
  };

  const toggleProblem = (idx: number) => {
    setExpandedProblems((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const getScore = (sub: SubmissionItem): number | null => {
    const a = sub.ai_analyses?.[0];
    if (!a) return null;
    return a.final_score ?? a.score ?? null;
  };

  if (loading) return <AppShell><div className="page-center">로딩 중...</div></AppShell>;
  if (!assignment) return <AppShell><div className="page-center">챌린지를 찾을 수 없습니다.</div></AppShell>;

  const problems = assignment.problems || [];
  const typeLabel: Record<string, string> = { coding: "코딩", writing: "글쓰기", both: "코딩+글쓰기", algorithm: "알고리즘", quiz: "퀴즈" };
  const policyLabel: Record<string, string> = { free: "자유", normal: "보통", strict: "엄격", exam: "시험" };

  // Group submissions by problem index
  const subsByProblem = new Map<number, SubmissionItem[]>();
  for (const s of submissions) {
    const idx = s.problem_index ?? 0;
    if (!subsByProblem.has(idx)) subsByProblem.set(idx, []);
    subsByProblem.get(idx)!.push(s);
  }

  // Overall stats
  const allScores = submissions.map(getScore).filter((s): s is number => s !== null);
  const avgScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : null;
  const bestScore = allScores.length > 0 ? Math.max(...allScores) : null;

  return (
    <AppShell>
      <div className="content">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ flex: 1 }}>
            <button className="btn btn-ghost" style={{ marginBottom: 8, fontSize: 13 }}
              onClick={() => navigate("/personal")}>&larr; 내 학습 공간</button>
            {editing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input className="form-input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                  style={{ fontSize: 18, fontWeight: 700 }} />
                <input className="form-input" value={editTopic} onChange={(e) => setEditTopic(e.target.value)}
                  placeholder="주제" />
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary" onClick={handleSaveEdit} disabled={saving}>
                    {saving ? "저장 중..." : "저장"}
                  </button>
                  <button className="btn btn-ghost" onClick={() => { setEditing(false); setEditTitle(assignment.title); setEditTopic(assignment.topic || ""); }}>
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="page-title" style={{ marginBottom: 4 }}>{assignment.title}</h1>
                {assignment.topic && <p className="page-subtitle">{assignment.topic}</p>}
              </>
            )}
            <div className="course-meta" style={{ marginTop: 8 }}>
              <span className="badge">{typeLabel[assignment.type] || assignment.type}</span>
              <span className="badge badge-invite">{assignment.language}</span>
              <span className="badge">{policyLabel[assignment.ai_policy] || assignment.ai_policy}</span>
              <span className="badge">{problems.length}문제</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 32 }}>
            {!editing && (
              <>
                <button className="btn btn-primary"
                  onClick={() => navigate(
                    assignment.type === "quiz" ? `/assignments/${assignmentId}/quiz`
                    : assignment.type === "writing" ? `/assignments/${assignmentId}/write`
                    : `/assignments/${assignmentId}/code`
                  )}>
                  풀기
                </button>
                <button className="btn btn-secondary" onClick={() => setEditing(true)}>수정</button>
                <button className="btn btn-ghost" style={{ color: "var(--error)" }} onClick={handleDeleteAssignment}>
                  삭제
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{ marginBottom: 28 }}>
          <div className="card" style={{ padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--primary)" }}>{submissions.length}</div>
            <div style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 2 }}>총 제출</div>
          </div>
          <div className="card" style={{ padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: bestScore != null && bestScore >= 80 ? "var(--success)" : "var(--primary)" }}>
              {bestScore != null ? `${bestScore}점` : "-"}
            </div>
            <div style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 2 }}>최고 점수</div>
          </div>
          <div className="card" style={{ padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--primary)" }}>
              {avgScore != null ? `${avgScore}점` : "-"}
            </div>
            <div style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 2 }}>평균 점수</div>
          </div>
          <div className="card" style={{ padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--primary)" }}>
              {problems.length > 0
                ? `${problems.filter((_, i) => (subsByProblem.get(i)?.length || 0) > 0).length}/${problems.length}`
                : "-"}
            </div>
            <div style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 2 }}>풀은 문제</div>
          </div>
        </div>

        {/* Problems */}
        <h2 className="section-title">{assignment.type === "quiz" ? "퀴즈 문제" : "문제 목록"}</h2>

        {/* Quiz problems — dedicated display */}
        {assignment.type === "quiz" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
            {problems.map((p: any, idx: number) => (
              <div key={p.id} className="card" style={{ padding: "18px 24px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, background: "var(--primary-light)", color: "var(--primary)", flexShrink: 0,
                  }}>{idx + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span className="badge" style={{
                        fontSize: 11, padding: "2px 8px",
                        background: p.type === "multiple_choice" ? "rgba(0,74,198,0.1)" : p.type === "short_answer" ? "rgba(16,185,129,0.1)" : "rgba(99,46,205,0.1)",
                        color: p.type === "multiple_choice" ? "var(--primary)" : p.type === "short_answer" ? "var(--success)" : "var(--tertiary)",
                      }}>
                        {p.type === "multiple_choice" ? "객관식" : p.type === "short_answer" ? "주관식" : "서술형"}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>{p.points || 10}점</span>
                    </div>
                    <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 8 }}>{p.question}</p>
                    {p.type === "multiple_choice" && p.options && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {p.options.map((opt: string, oi: number) => (
                          <div key={oi} style={{
                            padding: "6px 12px", borderRadius: 8, fontSize: 13,
                            background: oi === p.correct_answer ? "rgba(16,185,129,0.08)" : "var(--surface-container)",
                            border: oi === p.correct_answer ? "1px solid var(--success)" : "1px solid transparent",
                          }}>
                            {String.fromCharCode(9312 + oi)} {opt}
                            {oi === p.correct_answer && <span style={{ marginLeft: 8, fontSize: 11, color: "var(--success)", fontWeight: 600 }}>정답</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {p.type === "short_answer" && (
                      <div style={{ fontSize: 13, color: "var(--success)", fontWeight: 600 }}>
                        정답: {p.correct_answer}
                        {p.acceptable_answers?.length > 0 && (
                          <span style={{ fontWeight: 400, color: "var(--on-surface-variant)", marginLeft: 8 }}>
                            (허용: {p.acceptable_answers.join(", ")})
                          </span>
                        )}
                      </div>
                    )}
                    {p.type === "essay" && p.correct_answer && (
                      <div style={{ fontSize: 13, color: "var(--on-surface-variant)", fontStyle: "italic" }}>
                        모범답안: {p.correct_answer}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <button className="btn btn-primary btn-lg"
                onClick={() => navigate(`/assignments/${assignmentId}/quiz`)}>
                퀴즈 풀기
              </button>
            </div>
          </div>
        ) : (
          /* Coding problems — existing display */
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
            {problems.map((p, idx) => {
              const pSubs = subsByProblem.get(idx) || [];
              const pScores = pSubs.map(getScore).filter((s): s is number => s !== null);
              const pBest = pScores.length > 0 ? Math.max(...pScores) : null;
              const isExpanded = expandedProblems.has(idx);
              const isEditing = editingProblem === p.id;

              return (
                <div key={p.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                  {/* Problem header */}
                  <div
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "14px 20px",
                      cursor: "pointer", background: isExpanded ? "var(--surface-container-low)" : "transparent",
                      transition: "background 0.15s",
                    }}
                    onClick={() => toggleProblem(idx)}
                  >
                    <span style={{
                      fontSize: 12, color: "var(--on-surface-variant)",
                      transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                      transition: "transform 0.2s", display: "inline-block",
                    }}>&#9654;</span>
                    <span style={{
                      width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700,
                      background: pBest != null && pBest >= 80 ? "var(--success-light)" : pBest != null ? "var(--primary-light)" : "var(--surface-container)",
                      color: pBest != null && pBest >= 80 ? "var(--success)" : pBest != null ? "var(--primary)" : "var(--on-surface-variant)",
                    }}>
                      {idx + 1}
                    </span>
                    <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{p.title}</span>
                    {pBest != null && (
                      <span style={{ fontSize: 13, fontWeight: 600, color: pBest >= 80 ? "var(--success)" : "var(--primary)" }}>
                        {pBest}점
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>
                      {pSubs.length}회 제출
                    </span>
                    <button className="btn btn-ghost" style={{ fontSize: 12, padding: "2px 8px" }}
                      onClick={(e) => { e.stopPropagation(); navigate(`/assignments/${assignmentId}/code`); }}>
                      풀기
                    </button>
                  </div>

                  {/* Expanded: problem detail + submissions */}
                  {isExpanded && (
                    <div style={{ padding: "0 20px 16px", borderTop: "1px solid var(--outline-variant)" }}>
                      {/* Problem description */}
                      {isEditing ? (
                        <div style={{ padding: "12px 0", display: "flex", flexDirection: "column", gap: 8 }}>
                          <input className="form-input" value={editForm.title ?? p.title}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="문제 제목" />
                          <textarea className="form-input" rows={4} value={editForm.description ?? p.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="문제 설명" />
                          <textarea className="form-input" rows={3} value={editForm.starter_code ?? p.starter_code}
                            onChange={(e) => setEditForm({ ...editForm, starter_code: e.target.value })} placeholder="시작 코드"
                            style={{ fontFamily: "monospace", fontSize: 13 }} />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={handleSaveProblem}>저장</button>
                            <button className="btn btn-ghost" style={{ fontSize: 13 }}
                              onClick={() => { setEditingProblem(null); setEditForm({}); }}>취소</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: "12px 0" }}>
                          <div className="markdown-body" style={{ fontSize: 13, marginBottom: 12 }}
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(p.description || "") }} />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn btn-ghost" style={{ fontSize: 12, padding: "2px 8px" }}
                              onClick={() => { setEditingProblem(p.id); setEditForm({ title: p.title, description: p.description, starter_code: p.starter_code }); }}>
                              문제 수정
                            </button>
                            <button className="btn btn-ghost" style={{ fontSize: 12, padding: "2px 8px", color: "var(--error)" }}
                              onClick={() => handleDeleteProblem(p.id)}>
                              문제 삭제
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Submissions for this problem */}
                      {pSubs.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--on-surface-variant)" }}>
                            제출 기록
                          </h4>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {pSubs.map((s, si) => {
                              const sc = getScore(s);
                              return (
                                <div key={s.id} style={{
                                  display: "flex", alignItems: "center", gap: 12, padding: "8px 12px",
                                  borderRadius: 8, background: "var(--surface-container)",
                                  fontSize: 13, cursor: "pointer",
                                }}
                                  onClick={() => setViewingSub(s)}
                                >
                                  <span style={{ color: "var(--on-surface-variant)", minWidth: 24 }}>#{pSubs.length - si}</span>
                                  <span style={{ flex: 1, color: "var(--on-surface-variant)" }}>
                                    {new Date(s.submitted_at).toLocaleString("ko-KR")}
                                  </span>
                                  {sc != null ? (
                                    <span style={{ fontWeight: 600, color: sc >= 80 ? "var(--success)" : sc >= 60 ? "var(--primary)" : "var(--error)" }}>
                                      {sc}점
                                    </span>
                                  ) : (
                                    <span style={{ color: "var(--on-surface-variant)", fontSize: 12 }}>
                                      {s.status === "analyzing" ? "분석 중..." : "미채점"}
                                    </span>
                                  )}
                                  <span style={{ fontSize: 12, color: "var(--primary)" }}>코드 보기 &rarr;</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Writing prompt (if applicable) */}
        {assignment.type !== "coding" && assignment.writing_prompt && (
          <div className="card" style={{ padding: 20, marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>글쓰기 지시문</h3>
            <div className="markdown-body" style={{ fontSize: 13 }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(assignment.writing_prompt) }} />
          </div>
        )}
      </div>

      {/* Code View Modal */}
      {viewingSub && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => setViewingSub(null)}>
          <div style={{
            background: "var(--surface-container-lowest)", borderRadius: 16,
            width: "min(90vw, 900px)", maxHeight: "85vh", display: "flex", flexDirection: "column",
            overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              padding: "16px 24px", borderBottom: "1px solid var(--outline-variant)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>제출 코드</div>
                <div style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 2 }}>
                  {new Date(viewingSub.submitted_at).toLocaleString("ko-KR")}
                  {getScore(viewingSub) != null && (
                    <span style={{ marginLeft: 12, fontWeight: 600, color: "var(--primary)" }}>
                      {getScore(viewingSub)}점
                    </span>
                  )}
                </div>
              </div>
              <button className="btn btn-ghost" onClick={() => setViewingSub(null)}>&times;</button>
            </div>
            <pre style={{
              flex: 1, overflow: "auto", padding: 20, margin: 0,
              fontSize: 13, lineHeight: 1.6, fontFamily: "'Fira Code', 'Consolas', monospace",
              background: "var(--surface-container)", color: "var(--on-surface)",
            }}>
              {viewingSub.code}
            </pre>
            {viewingSub.ai_analyses?.[0]?.feedback && (
              <div style={{
                padding: "16px 24px", borderTop: "1px solid var(--outline-variant)",
                maxHeight: 200, overflowY: "auto",
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--primary)" }}>AI 피드백</div>
                <div className="markdown-body" style={{ fontSize: 13 }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(viewingSub.ai_analyses[0].feedback!) }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h2>{confirm.title}</h2>
            <p style={{ whiteSpace: "pre-line", color: "var(--on-surface-variant)", fontSize: 14, margin: "12px 0 20px" }}>
              {confirm.message}
            </p>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setConfirm(null)}>취소</button>
              <button className="btn btn-primary" style={{ background: "var(--error)" }}
                onClick={async () => { await confirm.onConfirm(); setConfirm(null); }}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
