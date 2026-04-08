import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as Diff from "diff";
import api from "../lib/api";
import { renderMarkdown } from "../lib/markdown";
import { useAuthStore } from "../store/authStore";
import AppShell from "../components/common/AppShell";
import type { Assignment, Problem } from "../types";

interface SubmissionWithAnalysis {
  id: string;
  student_id: string;
  code: string;
  content: Record<string, unknown> | null;
  status: string;
  submitted_at: string;
  problem_index?: number;
  users?: { name: string; email: string } | null;
  ai_analyses?: {
    id: string;
    score: number | null;
    final_score: number | null;
    feedback: string | null;
  }[] | null;
}

interface PasteLog {
  id: string;
  student_id: string;
  code_diff: { pasted_content?: string; problem_index?: number } | null;
  paste_source: string | null;
  created_at: string;
}

// ===== Tiptap JSON → HTML =====
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function tiptapToHtml(node: Record<string, unknown>): string {
  if (!node) return "";
  if (node.type === "text") {
    let html = escapeHtml(node.text as string || "");
    const marks = node.marks as { type: string }[] | undefined;
    if (marks) {
      for (const mark of marks) {
        if (mark.type === "bold") html = `<strong>${html}</strong>`;
        else if (mark.type === "italic") html = `<em>${html}</em>`;
        else if (mark.type === "underline") html = `<u>${html}</u>`;
        else if (mark.type === "code") html = `<code>${html}</code>`;
        else if (mark.type === "strike") html = `<s>${html}</s>`;
      }
    }
    return html;
  }
  const children = node.content as Record<string, unknown>[] | undefined;
  const inner = children ? children.map(tiptapToHtml).join("") : "";
  const type = node.type as string;
  const attrs = node.attrs as Record<string, unknown> | undefined;
  switch (type) {
    case "doc": return inner;
    case "paragraph": return `<p>${inner || "&nbsp;"}</p>`;
    case "heading": { const lv = attrs?.level || 1; return `<h${lv}>${inner}</h${lv}>`; }
    case "bulletList": return `<ul>${inner}</ul>`;
    case "orderedList": return `<ol>${inner}</ol>`;
    case "listItem": return `<li>${inner}</li>`;
    case "blockquote": return `<blockquote>${inner}</blockquote>`;
    case "codeBlock": return `<pre><code>${inner}</code></pre>`;
    case "horizontalRule": return "<hr/>";
    case "hardBreak": return "<br/>";
    case "image": return `<img src="${attrs?.src || ""}" alt="" style="max-width:100%;border-radius:8px;margin:8px 0"/>`;
    case "table": return `<table style="border-collapse:collapse;width:100%;margin:8px 0">${inner}</table>`;
    case "tableRow": return `<tr>${inner}</tr>`;
    case "tableHeader": return `<th style="border:1px solid var(--outline-variant);padding:8px;background:var(--surface-container)">${inner}</th>`;
    case "tableCell": return `<td style="border:1px solid var(--outline-variant);padding:8px">${inner}</td>`;
    default: return inner;
  }
}

// ===== Diff utilities =====
interface DiffLine {
  type: "add" | "remove" | "context";
  oldNum: string;
  newNum: string;
  text: string;
  isPasted?: boolean;
}

function computeDiff(oldStr: string, newStr: string, pastedLines?: Set<string>): DiffLine[] {
  const parts = Diff.diffLines(oldStr, newStr);
  const result: DiffLine[] = [];
  let oldNum = 1;
  let newNum = 1;
  let i = 0;
  while (i < parts.length) {
    const part = parts[i];
    if (!part.added && !part.removed) {
      const lines = part.value.replace(/\n$/, "").split("\n");
      for (const line of lines) {
        result.push({ type: "context", oldNum: String(oldNum++), newNum: String(newNum++), text: line });
      }
      i++;
    } else if (part.removed) {
      const removedLines = part.value.replace(/\n$/, "").split("\n");
      const nextPart = i + 1 < parts.length && parts[i + 1].added ? parts[i + 1] : null;
      const addedLines = nextPart ? nextPart.value.replace(/\n$/, "").split("\n") : [];
      const maxLen = Math.max(removedLines.length, addedLines.length);
      for (let j = 0; j < maxLen; j++) {
        if (j < removedLines.length) {
          result.push({ type: "remove", oldNum: String(oldNum++), newNum: "", text: removedLines[j] });
        }
        if (j < addedLines.length) {
          const isPasted = pastedLines ? pastedLines.has(addedLines[j].trim()) : false;
          result.push({ type: "add", oldNum: "", newNum: String(newNum++), text: addedLines[j], isPasted });
        }
      }
      i += nextPart ? 2 : 1;
    } else {
      const lines = part.value.replace(/\n$/, "").split("\n");
      for (const line of lines) {
        const isPasted = pastedLines ? pastedLines.has(line.trim()) : false;
        result.push({ type: "add", oldNum: "", newNum: String(newNum++), text: line, isPasted });
      }
      i++;
    }
  }
  return result;
}

export default function AssignmentDetail() {
  const { courseId, assignmentId } = useParams<{ courseId: string; assignmentId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.email?.endsWith("@pikabuddy.admin") ?? false;
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionWithAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiPolicy, setAiPolicy] = useState("");
  const [updating, setUpdating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Problem editing
  const [editingProblem, setEditingProblem] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Problem>>({});
  const [addingProblem, setAddingProblem] = useState(false);
  const [newProblem, setNewProblem] = useState({ title: "", description: "", starter_code: "", expected_output: "", hints: "" });

  // Writing prompt editing
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptText, setPromptText] = useState("");

  // Score editing
  const [editingScore, setEditingScore] = useState<string | null>(null);
  const [scoreValue, setScoreValue] = useState("");

  // Submission detail view
  const [selectedSub, setSelectedSub] = useState<SubmissionWithAnalysis | null>(null);
  const [viewMode, setViewMode] = useState<"content" | "diff" | "paste">("content");

  // Paste logs
  const [pasteLogs, setPasteLogs] = useState<PasteLog[]>([]);

  // QA
  const [qaMessage, setQaMessage] = useState("");

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    if (!courseId || !assignmentId) return;
    Promise.all([
      api.get(`/courses/${courseId}/assignments/${assignmentId}`),
      api.get(`/courses/${courseId}/assignments/${assignmentId}/submissions`).catch(() => ({ data: [] })),
      api.get(`/courses/${courseId}/assignments/${assignmentId}/paste-logs`).catch(() => ({ data: [] })),
    ]).then(([assignRes, subRes, pasteRes]) => {
      setAssignment(assignRes.data);
      setAiPolicy(assignRes.data.ai_policy);
      setSubmissions(subRes.data || []);
      setPasteLogs(pasteRes.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [courseId, assignmentId]);

  // ===== Handlers =====
  const handlePolicyUpdate = async () => {
    if (!courseId || !assignmentId || !aiPolicy) return;
    setUpdating(true);
    try {
      await api.patch(`/courses/${courseId}/assignments/${assignmentId}/policy`, { ai_policy: aiPolicy });
      setAssignment((prev) => prev ? { ...prev, ai_policy: aiPolicy as Assignment["ai_policy"] } : null);
    } finally { setUpdating(false); }
  };

  const handlePublish = async () => {
    if (!courseId || !assignmentId) return;
    setPublishing(true);
    try {
      const endpoint = assignment?.status === "published" ? "unpublish" : "publish";
      await api.post(`/courses/${courseId}/assignments/${assignmentId}/${endpoint}`);
      setAssignment((prev) => prev ? { ...prev, status: endpoint === "publish" ? "published" : "draft" } : null);
    } finally { setPublishing(false); }
  };

  const handleDeleteAssignment = () => {
    setConfirmDialog({
      title: "과제 삭제",
      message: "이 과제를 삭제하시겠습니까?\n모든 제출물, 스냅샷, AI 분석이 함께 삭제되며 복구할 수 없습니다.",
      onConfirm: async () => {
        if (!courseId || !assignmentId) return;
        await api.delete(`/courses/${courseId}/assignments/${assignmentId}`);
        setConfirmDialog(null);
        navigate(`/courses/${courseId}`);
      },
    });
  };

  const handleDeleteSubmission = (sub: SubmissionWithAnalysis) => {
    setConfirmDialog({
      title: "제출물 삭제",
      message: `${sub.users?.name || "학생"}의 제출물을 삭제하시겠습니까?\nAI 분석 결과도 함께 삭제되며 복구할 수 없습니다.`,
      onConfirm: async () => {
        if (!courseId || !assignmentId) return;
        await api.delete(`/courses/${courseId}/assignments/${assignmentId}/submissions/${sub.id}`);
        setSubmissions((prev) => prev.filter((s) => s.id !== sub.id));
        if (selectedSub?.id === sub.id) { setSelectedSub(null); setViewMode("content"); }
        setConfirmDialog(null);
      },
    });
  };

  const handleDeleteProblem = (problemId: number) => {
    setConfirmDialog({
      title: "문제 삭제",
      message: "이 문제를 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.",
      onConfirm: async () => {
        if (!courseId || !assignmentId) return;
        await api.delete(`/courses/${courseId}/assignments/${assignmentId}/problems/${problemId}`);
        setAssignment((prev) => prev ? { ...prev, problems: prev.problems.filter((p) => p.id !== problemId) } : null);
        setConfirmDialog(null);
      },
    });
  };

  const handleEditProblem = (p: Problem) => { setEditingProblem(p.id); setEditForm({ ...p }); };

  const handleSaveEdit = async () => {
    if (!courseId || !assignmentId || editingProblem === null) return;
    await api.patch(`/courses/${courseId}/assignments/${assignmentId}/problems/${editingProblem}`, editForm);
    setAssignment((prev) => {
      if (!prev) return null;
      return { ...prev, problems: prev.problems.map((p) => p.id === editingProblem ? { ...p, ...editForm } as Problem : p) };
    });
    setEditingProblem(null);
  };

  const handleAddProblem = async () => {
    if (!courseId || !assignmentId || !newProblem.title.trim()) return;
    const { data } = await api.post(`/courses/${courseId}/assignments/${assignmentId}/problems`, {
      ...newProblem, hints: newProblem.hints ? newProblem.hints.split("\n").filter(Boolean) : [],
    });
    setAssignment((prev) => prev ? { ...prev, problems: [...prev.problems, data] } : null);
    setAddingProblem(false);
    setNewProblem({ title: "", description: "", starter_code: "", expected_output: "", hints: "" });
  };

  const handleSavePrompt = async () => {
    if (!courseId || !assignmentId) return;
    await api.patch(`/courses/${courseId}/assignments/${assignmentId}/writing-prompt`, { writing_prompt: promptText });
    setAssignment((prev) => prev ? { ...prev, writing_prompt: promptText } : null);
    setEditingPrompt(false);
  };

  const handleSetFinalScore = async (analysisId: string) => {
    if (!courseId || !assignmentId) return;
    const score = parseInt(scoreValue);
    if (isNaN(score) || score < 0 || score > 100) return;
    await api.patch(`/courses/${courseId}/assignments/${assignmentId}/analyses/${analysisId}/score`, { final_score: score });
    setSubmissions((prev) => prev.map((s) => ({
      ...s,
      ai_analyses: Array.isArray(s.ai_analyses) ? s.ai_analyses.map((a) =>
        a.id === analysisId ? { ...a, final_score: score } : a
      ) : s.ai_analyses,
    })));
    setEditingScore(null);
  };

  // ===== Paste helpers =====
  function getPastesForSubmission(sub: SubmissionWithAnalysis): PasteLog[] {
    const studentPastes = pasteLogs.filter((p) => p.student_id === sub.student_id && p.paste_source === "external");
    const studentSubs = submissions
      .filter((s) => s.student_id === sub.student_id)
      .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
    const idx = studentSubs.findIndex((s) => s.id === sub.id);
    const prevTime = idx > 0 ? new Date(studentSubs[idx - 1].submitted_at).getTime() : 0;
    const subTime = new Date(sub.submitted_at).getTime();
    return studentPastes.filter((p) => {
      const t = new Date(p.created_at).getTime();
      return t > prevTime && t <= subTime;
    });
  }

  function getPastedLineSet(pastes: PasteLog[]): Set<string> {
    const s = new Set<string>();
    for (const p of pastes) {
      const content = p.code_diff?.pasted_content;
      if (!content) continue;
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed) s.add(trimmed);
      }
    }
    return s;
  }

  const policyLabels: Record<string, string> = {
    free: "자유 (AI 허용)", normal: "보통 (복붙 감지)", strict: "엄격 (AI 제한)", exam: "시험 (전부 차단)",
  };

  const renderQaToolbox = () => {
    if (!isAdmin) return null;
    return (
      <div className="card" style={{ marginTop: 24, border: "2px solid var(--tertiary)", background: "var(--tertiary-container)" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "var(--on-tertiary-container)" }}>QA 도구 (어드민)</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={async () => {
            await api.delete(`/courses/${courseId}/assignments/${assignmentId}/qa/paste-logs`);
            setPasteLogs([]);
            setQaMessage("복붙 로그 초기화 완료");
          }}>복붙 로그 초기화</button>
          <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={async () => {
            await api.delete(`/courses/${courseId}/assignments/${assignmentId}/qa/snapshots`);
            setPasteLogs([]);
            setQaMessage("스냅샷 초기화 완료");
          }}>스냅샷 초기화</button>
          <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={async () => {
            await api.delete(`/courses/${courseId}/assignments/${assignmentId}/qa/submissions`);
            setSubmissions([]);
            setPasteLogs([]);
            setSelectedSub(null);
            setQaMessage("제출물 초기화 완료");
          }}>제출물 초기화</button>
          <button style={{
            fontSize: 13, background: "#dc2626", color: "#fff", border: "none",
            padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 600,
          }} onClick={async () => {
            await api.delete(`/courses/${courseId}/assignments/${assignmentId}/qa/all`);
            setSubmissions([]);
            setPasteLogs([]);
            setSelectedSub(null);
            setQaMessage("전체 데이터 초기화 완료");
          }}>전체 초기화</button>
        </div>
        {qaMessage && (
          <div style={{
            marginTop: 12, padding: "8px 14px", borderRadius: 8, fontSize: 13,
            background: "rgba(34,197,94,0.1)", color: "#16a34a",
          }}>{qaMessage}</div>
        )}
      </div>
    );
  };

  if (loading) return <AppShell><div className="loading-spinner" style={{ marginTop: 120 }}>과제를 불러오는 중...</div></AppShell>;
  if (!assignment) return <AppShell><div className="empty" style={{ marginTop: 120 }}>과제를 찾을 수 없습니다.</div></AppShell>;

  const isDraft = assignment.status === "draft";
  const isWriting = assignment.type === "writing" || assignment.type === "both";

  // ===== Detail view for a selected submission =====
  if (selectedSub) {
    const analysis = Array.isArray(selectedSub.ai_analyses) ? selectedSub.ai_analyses[0] : null;
    const subPastes = getPastesForSubmission(selectedSub);
    const pastedLineSet = getPastedLineSet(subPastes);
    const isWritingSub = isWriting && selectedSub.content;

    // For coding: get starter code for diff
    const problemIdx = selectedSub.problem_index || 0;
    const starterCode = assignment.problems?.[problemIdx]?.starter_code || "";

    // Compute diff lines (coding only)
    const diffLines = !isWritingSub && starterCode
      ? computeDiff(starterCode, selectedSub.code, pastedLineSet)
      : null;

    return (
      <AppShell>
        <main className="content" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)" }}>
          {/* Header */}
          <div className="detail-panel-header">
            <div className="detail-panel-title-row">
              <button className="btn btn-ghost" onClick={() => { setSelectedSub(null); setViewMode("content"); }}>&larr;</button>
              <h2>{selectedSub.users?.name || "학생"} - {isWritingSub ? "글쓰기" : `문제 ${problemIdx + 1}`}</h2>
              {analysis && (
                analysis.final_score != null
                  ? <span className="detail-score-badge" style={{ background: "rgba(34,197,94,0.15)", color: "#16a34a" }}>확정 {analysis.final_score}점</span>
                  : <span className="detail-score-badge">{analysis.score ?? "-"}점 (추천)</span>
              )}
              {subPastes.length > 0 && (
                <span className="diff-paste-badge">복붙 {subPastes.length}회</span>
              )}
              <button className="btn btn-ghost" style={{ fontSize: 12, color: "var(--error)", marginLeft: "auto" }}
                onClick={() => handleDeleteSubmission(selectedSub)}>제출물 삭제</button>
            </div>
            <div className="detail-tabs">
              <button className={`detail-tab ${viewMode === "content" ? "active" : ""}`}
                onClick={() => setViewMode("content")}>
                {isWritingSub ? "글 보기" : "전체 코드"}
              </button>
              {!isWritingSub && starterCode && (
                <button className={`detail-tab ${viewMode === "diff" ? "active" : ""}`}
                  onClick={() => setViewMode("diff")}>변경 사항</button>
              )}
              {subPastes.length > 0 && (
                <button className={`detail-tab ${viewMode === "paste" ? "active" : ""}`}
                  onClick={() => setViewMode("paste")}>복붙 기록 ({subPastes.length})</button>
              )}
            </div>
          </div>

          {/* Body: left = content, right = feedback */}
          <div className="detail-panel-body">
            <div className="detail-panel-left">
              {viewMode === "content" ? (
                isWritingSub ? (
                  /* Writing: render Tiptap HTML */
                  <div className="detail-note-body rendered-markdown"
                    dangerouslySetInnerHTML={{ __html: tiptapToHtml(selectedSub.content as Record<string, unknown>) }} />
                ) : (
                  /* Coding: code view with paste highlights */
                  <pre className="detail-code">
                    {selectedSub.code.split("\n").map((line, i) => {
                      const pasted = pastedLineSet.has(line.trim()) && line.trim() !== "";
                      return (
                        <div key={i} className={`code-line${pasted ? " code-line-paste" : ""}`}>
                          <span className="code-line-num">{i + 1}</span>
                          <span className="code-line-text">{line}</span>
                          {pasted && <span className="diff-paste-badge">복붙</span>}
                        </div>
                      );
                    })}
                  </pre>
                )
              ) : viewMode === "paste" ? (
                /* Paste log view */
                <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 16 }}>
                  {subPastes.map((p, idx) => (
                    <div key={p.id} style={{
                      background: "rgba(99, 46, 205, 0.06)", borderRadius: 12,
                      padding: 16, borderLeft: "3px solid var(--tertiary)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <span className="diff-paste-badge">복붙 #{idx + 1}</span>
                        <span style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>
                          {new Date(p.created_at).toLocaleString("ko-KR")}
                        </span>
                      </div>
                      <pre className="detail-code" style={{ margin: 0, maxHeight: 300, overflow: "auto", borderRadius: 8 }}>
                        {(p.code_diff?.pasted_content || "").split("\n").map((line, i) => (
                          <div key={i} className="code-line code-line-paste">
                            <span className="code-line-num">{i + 1}</span>
                            <span className="code-line-text">{line}</span>
                          </div>
                        ))}
                      </pre>
                    </div>
                  ))}
                </div>
              ) : diffLines ? (
                /* Diff view */
                <pre className="detail-code diff-view">
                  {diffLines.map((line, i) => (
                    <div key={i} className={`diff-line diff-${line.type}${line.isPasted ? " diff-paste" : ""}`}>
                      <span className="diff-num diff-num-old">{line.oldNum}</span>
                      <span className="diff-num diff-num-new">{line.newNum}</span>
                      <span className="diff-marker">
                        {line.isPasted ? "P" : line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
                      </span>
                      <span className="diff-content">{line.text}</span>
                      {line.isPasted && <span className="diff-paste-badge">복붙</span>}
                    </div>
                  ))}
                </pre>
              ) : (
                <div className="empty" style={{ padding: 40 }}>기본 코드가 없어 비교할 수 없습니다.</div>
              )}
            </div>

            <div className="detail-panel-right">
              {/* Score setting */}
              {analysis && (
                <div style={{ padding: 16, borderBottom: "1px solid var(--outline-variant)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>
                      피카버디 추천: <strong>{analysis.score ?? "-"}점</strong>
                    </span>
                    <span style={{ color: "var(--outline-variant)" }}>|</span>
                    {editingScore === analysis.id ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input className="input" type="number" min={0} max={100} value={scoreValue}
                          onChange={(e) => setScoreValue(e.target.value)} style={{ width: 80, padding: "4px 8px" }} />
                        <button className="btn btn-primary" style={{ padding: "4px 12px", fontSize: 12 }}
                          onClick={() => handleSetFinalScore(analysis.id)}>확정</button>
                        <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 12 }}
                          onClick={() => setEditingScore(null)}>취소</button>
                      </div>
                    ) : (
                      <button className="btn btn-secondary" style={{ padding: "4px 12px", fontSize: 12 }}
                        onClick={() => { setEditingScore(analysis.id); setScoreValue(String(analysis.final_score ?? analysis.score ?? "")); }}>
                        {analysis.final_score != null ? `확정 ${analysis.final_score}점 (수정)` : "점수 확정"}
                      </button>
                    )}
                  </div>
                </div>
              )}
              {/* Feedback */}
              {analysis?.feedback ? (
                <div className="detail-feedback-full" style={{ padding: 20 }}>
                  <h3 style={{ marginTop: 0 }}>AI 피드백</h3>
                  <div className="detail-feedback-body rendered-markdown"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(analysis.feedback) }} />
                </div>
              ) : (
                <div className="empty" style={{ padding: 40 }}>피드백 없음</div>
              )}
            </div>
          </div>
          {renderQaToolbox()}
        </main>
      </AppShell>
    );
  }

  // ===== Main assignment view =====
  return (
    <AppShell>
      <main className="content">
        <button className="btn btn-ghost" onClick={() => navigate(`/courses/${courseId}`)} style={{ marginBottom: 16 }}>
          &larr; 강의로 돌아가기
        </button>

        {/* Header with status */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {assignment.title}
                <span className="badge" style={{
                  background: isDraft ? "rgba(245,158,11,0.12)" : "rgba(34,197,94,0.12)",
                  color: isDraft ? "#d97706" : "#16a34a", fontSize: 13,
                }}>{isDraft ? "초안" : "공개됨"}</span>
              </h1>
              {assignment.topic && <p className="page-subtitle">주제: {assignment.topic}</p>}
              <div className="course-meta" style={{ marginTop: 12 }}>
                <span className="badge" style={{
                  background: assignment.type === "writing" ? "rgba(99,46,205,0.1)" : assignment.type === "both" ? "rgba(0,74,198,0.1)" : undefined,
                  color: assignment.type === "writing" ? "var(--tertiary)" : assignment.type === "both" ? "var(--primary)" : undefined,
                }}>
                  {assignment.type === "writing" ? "글쓰기" : assignment.type === "both" ? "코딩+글쓰기" : "코딩"}
                </span>
                <span className="badge badge-policy">{policyLabels[assignment.ai_policy] || assignment.ai_policy}</span>
                {assignment.type !== "writing" && <span className="badge">{assignment.language}</span>}
                {assignment.type !== "writing" && <span className="badge">문제 {assignment.problems?.length || 0}개</span>}
                {assignment.due_date && (
                  <span className="badge">마감: {new Date(assignment.due_date).toLocaleDateString("ko-KR")}</span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className={`btn ${isDraft ? "btn-primary" : "btn-secondary"}`}
                onClick={handlePublish} disabled={publishing} style={{ whiteSpace: "nowrap" }}>
                {publishing ? "처리 중..." : isDraft ? "학생에게 공개" : "비공개로 전환"}
              </button>
              <button className="btn btn-ghost" style={{ color: "var(--error)", whiteSpace: "nowrap" }}
                onClick={handleDeleteAssignment}>과제 삭제</button>
            </div>
          </div>
        </div>

        {/* AI Policy */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 className="section-title">AI 정책 설정</h2>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <select className="input" value={aiPolicy} onChange={(e) => setAiPolicy(e.target.value)} style={{ maxWidth: 240 }}>
              <option value="free">자유 (AI 허용)</option>
              <option value="normal">보통 (복붙 감지)</option>
              <option value="strict">엄격 (AI 제한)</option>
              <option value="exam">시험 (전부 차단)</option>
            </select>
            <button className="btn btn-secondary" onClick={handlePolicyUpdate} disabled={updating || aiPolicy === assignment.ai_policy}>
              {updating ? "변경 중..." : "정책 변경"}
            </button>
          </div>
          <label style={{
            display: "flex", alignItems: "center", gap: 10, marginTop: 16,
            fontSize: 14, color: "var(--on-surface-variant)", cursor: "pointer",
          }}>
            <input type="checkbox" checked={assignment.show_score_to_student ?? true}
              onChange={async (e) => {
                const val = e.target.checked;
                await api.patch(`/courses/${courseId}/assignments/${assignmentId}`, { show_score_to_student: val });
                setAssignment((prev) => prev ? { ...prev, show_score_to_student: val } : null);
              }}
              style={{ width: 18, height: 18, accentColor: "var(--primary)", cursor: "pointer" }} />
            학생에게 AI 추천 점수 공개
          </label>

          {/* 채점 강도 */}
          <div style={{ marginTop: 20 }}>
            <label style={{ fontSize: 13, color: "var(--on-surface-variant)", marginBottom: 8, display: "block" }}>
              AI 추천 점수 강도
            </label>
            <div style={{ display: "flex", gap: 0 }}>
              {([
                { value: "mild", label: "순한맛" },
                { value: "normal", label: "보통맛" },
                { value: "strict", label: "매운맛" },
              ] as const).map((opt, i) => (
                <button key={opt.value}
                  className={`btn ${(assignment.grading_strictness || "normal") === opt.value ? "btn-primary" : "btn-secondary"}`}
                  style={{ flex: 1, maxWidth: 120, borderRadius: i === 0 ? "10px 0 0 10px" : i === 2 ? "0 10px 10px 0" : 0, fontSize: 13 }}
                  onClick={async () => {
                    await api.patch(`/courses/${courseId}/assignments/${assignmentId}`, { grading_strictness: opt.value });
                    setAssignment((prev) => prev ? { ...prev, grading_strictness: opt.value } : null);
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 교수 유의사항 */}
          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: 13, color: "var(--on-surface-variant)", marginBottom: 6, display: "block" }}>
              AI 채점 유의사항
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <textarea className="input" value={assignment.grading_note || ""}
                placeholder="예: 변수명 컨벤션 중시, 주제 벗어나면 큰 감점 등"
                onChange={(e) => setAssignment((prev) => prev ? { ...prev, grading_note: e.target.value } : null)}
                rows={2} style={{ resize: "vertical", fontFamily: "inherit", flex: 1 }} />
              <button className="btn btn-secondary" style={{ alignSelf: "flex-end", whiteSpace: "nowrap" }}
                onClick={async () => {
                  if (!courseId || !assignmentId) return;
                  await api.patch(`/courses/${courseId}/assignments/${assignmentId}`, { grading_note: assignment.grading_note || "" });
                }}>저장</button>
            </div>
          </div>
        </div>

        {/* Writing Prompt */}
        {isWriting && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="section-title">글쓰기 지시문</h2>
              {!editingPrompt && (
                <button className="btn btn-ghost" onClick={() => { setEditingPrompt(true); setPromptText(assignment.writing_prompt || ""); }}>수정</button>
              )}
            </div>
            {editingPrompt ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <textarea className="input" value={promptText} onChange={(e) => setPromptText(e.target.value)}
                  rows={5} style={{ resize: "vertical", fontFamily: "inherit" }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary" onClick={handleSavePrompt}>저장</button>
                  <button className="btn btn-secondary" onClick={() => setEditingPrompt(false)}>취소</button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {assignment.writing_prompt || "지시문 없음"}
              </p>
            )}
          </div>
        )}

        {/* Problems */}
        {(assignment.type === "coding" || assignment.type === "both") && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="section-title">문제 목록</h2>
              <button className="btn btn-secondary" onClick={() => setAddingProblem(true)}>+ 문제 추가</button>
            </div>
            {addingProblem && (
              <div style={{ padding: 20, background: "var(--surface-container)", borderRadius: 12, marginBottom: 16 }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>새 문제 추가</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input className="input" placeholder="문제 제목" value={newProblem.title}
                    onChange={(e) => setNewProblem({ ...newProblem, title: e.target.value })} />
                  <textarea className="input" placeholder="문제 설명" value={newProblem.description}
                    onChange={(e) => setNewProblem({ ...newProblem, description: e.target.value })} rows={4}
                    style={{ resize: "vertical", fontFamily: "inherit" }} />
                  <textarea className="input" placeholder="시작 코드 (선택)" value={newProblem.starter_code}
                    onChange={(e) => setNewProblem({ ...newProblem, starter_code: e.target.value })} rows={3}
                    style={{ resize: "vertical", fontFamily: "JetBrains Mono, monospace", fontSize: 13 }} />
                  <input className="input" placeholder="예상 출력 (선택)" value={newProblem.expected_output}
                    onChange={(e) => setNewProblem({ ...newProblem, expected_output: e.target.value })} />
                  <textarea className="input" placeholder="힌트 (줄바꿈으로 구분)" value={newProblem.hints}
                    onChange={(e) => setNewProblem({ ...newProblem, hints: e.target.value })} rows={2}
                    style={{ resize: "vertical", fontFamily: "inherit" }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-primary" onClick={handleAddProblem}>추가</button>
                    <button className="btn btn-secondary" onClick={() => setAddingProblem(false)}>취소</button>
                  </div>
                </div>
              </div>
            )}
            {!assignment.problems || assignment.problems.length === 0 ? (
              <div className="empty">문제가 없습니다. 위 버튼으로 문제를 추가하세요.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {assignment.problems.map((p, i) => (
                  <div key={p.id} style={{ padding: 20, background: "var(--surface-container)", borderRadius: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <h3 style={{ margin: "0 0 8px" }}>{i + 1}. {p.title}</h3>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }}
                          onClick={() => handleEditProblem(p)}>수정</button>
                        <button className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 10px", color: "var(--error)" }}
                          onClick={() => handleDeleteProblem(p.id)}>삭제</button>
                      </div>
                    </div>
                    <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{p.description}</p>
                    {p.starter_code && (
                      <pre style={{
                        background: "#1e1e1e", color: "#d4d4d4", padding: 16, borderRadius: 8,
                        fontSize: 13, fontFamily: "JetBrains Mono, monospace", overflow: "auto", marginTop: 12,
                      }}>{p.starter_code}</pre>
                    )}
                    {p.hints && p.hints.length > 0 && (
                      <details style={{ marginTop: 12 }}>
                        <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--primary)" }}>힌트 ({p.hints.length}개)</summary>
                        <ul style={{ marginTop: 8, fontSize: 13, color: "var(--text-secondary)" }}>
                          {p.hints.map((h, hi) => <li key={hi}>{h}</li>)}
                        </ul>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Rubric */}
        {assignment.rubric?.criteria && assignment.rubric.criteria.length > 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h2 className="section-title">채점 루브릭</h2>
            <table className="table">
              <thead><tr><th>기준</th><th>비중</th><th>설명</th></tr></thead>
              <tbody>
                {assignment.rubric.criteria.map((c, i) => (
                  <tr key={i}><td style={{ fontWeight: 600 }}>{c.name}</td><td>{c.weight}%</td><td>{c.description}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Submissions */}
        <div className="card">
          <h2 className="section-title">제출 현황 ({submissions.length}건)</h2>
          {submissions.length === 0 ? (
            <div className="empty">아직 제출물이 없습니다.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {submissions.map((s) => {
                const analysis = Array.isArray(s.ai_analyses) ? s.ai_analyses[0] : null;
                const subPastes = getPastesForSubmission(s);
                const pasteCount = subPastes.length;
                const isWritingSub = isWriting && s.content;
                return (
                  <div key={s.id}
                    className="card course-card"
                    onClick={() => { setSelectedSub(s); setViewMode("content"); }}
                    style={{ margin: 0, cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontWeight: 600 }}>{s.users?.name || "학생"}</span>
                        <span style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>
                          {new Date(s.submitted_at).toLocaleString("ko-KR")}
                        </span>
                        {!isWritingSub && s.problem_index !== undefined && (
                          <span className="badge">문제 {(s.problem_index || 0) + 1}</span>
                        )}
                        {isWritingSub && <span className="badge" style={{ background: "rgba(99,46,205,0.1)", color: "var(--tertiary)" }}>글쓰기</span>}
                        {pasteCount > 0 && (
                          <span className="badge" style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626", fontWeight: 600 }}>
                            복붙 {pasteCount}회
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {analysis && (
                          analysis.final_score != null ? (
                            <span className="badge" style={{ background: "rgba(34,197,94,0.12)", color: "#16a34a", fontWeight: 700 }}>
                              확정 {analysis.final_score}점
                            </span>
                          ) : (
                            <span className="badge" style={{ background: "rgba(99,46,205,0.1)", color: "var(--tertiary)" }}>
                              AI 추천 {analysis.score ?? "-"}점
                            </span>
                          )
                        )}
                        <button className="btn btn-ghost" style={{
                          fontSize: 11, padding: "2px 8px", color: "var(--error)", opacity: 0.7,
                        }} onClick={(e) => { e.stopPropagation(); handleDeleteSubmission(s); }}>삭제</button>
                        <span style={{ color: "var(--on-surface-variant)", fontSize: 13 }}>&#9654;</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {renderQaToolbox()}
      </main>

      {/* ── 문제 수정 모달 (넓은 화면) ── */}
      {editingProblem !== null && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 999,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)",
        }} onClick={() => setEditingProblem(null)}>
          <div style={{
            background: "var(--surface-container-lowest)", borderRadius: 16, padding: 32,
            width: "90vw", maxWidth: 900, maxHeight: "85vh", overflow: "auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>문제 수정</h2>
              <button className="btn btn-ghost" onClick={() => setEditingProblem(null)} style={{ fontSize: 18, padding: "4px 8px" }}>&times;</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--on-surface-variant)", marginBottom: 6, display: "block" }}>문제 제목</label>
                <input className="input" value={editForm.title || ""} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  style={{ fontSize: 15, padding: "10px 14px" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--on-surface-variant)", marginBottom: 6, display: "block" }}>문제 설명</label>
                <textarea className="input" value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={10} style={{ resize: "vertical", fontFamily: "inherit", fontSize: 14, lineHeight: 1.7 }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--on-surface-variant)", marginBottom: 6, display: "block" }}>시작 코드</label>
                <textarea className="input" placeholder="시작 코드 (선택)" value={editForm.starter_code || ""}
                  onChange={(e) => setEditForm({ ...editForm, starter_code: e.target.value })} rows={12}
                  style={{ resize: "vertical", fontFamily: "JetBrains Mono, monospace", fontSize: 13, lineHeight: 1.6, background: "#1e1e2e", color: "#cdd6f4", border: "none", borderRadius: 10, padding: 16 }} />
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--on-surface-variant)", marginBottom: 6, display: "block" }}>예상 출력</label>
                  <input className="input" placeholder="예상 출력 (선택)" value={editForm.expected_output || ""}
                    onChange={(e) => setEditForm({ ...editForm, expected_output: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--on-surface-variant)", marginBottom: 6, display: "block" }}>힌트 (줄바꿈 구분)</label>
                  <textarea className="input" placeholder="힌트" value={Array.isArray(editForm.hints) ? editForm.hints.join("\n") : ""}
                    onChange={(e) => setEditForm({ ...editForm, hints: e.target.value.split("\n") })}
                    rows={3} style={{ resize: "vertical", fontFamily: "inherit" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid var(--outline-variant)" }}>
                <button className="btn btn-secondary" onClick={() => setEditingProblem(null)}>취소</button>
                <button className="btn btn-primary" onClick={handleSaveEdit} style={{ padding: "8px 28px" }}>저장</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)",
        }} onClick={() => setConfirmDialog(null)}>
          <div style={{
            background: "var(--surface-container)", borderRadius: 16, padding: 28,
            maxWidth: 420, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 36, height: 36, borderRadius: "50%",
                background: "rgba(220,38,38,0.12)", color: "#dc2626", fontSize: 18,
              }}>&#9888;</span>
              <h3 style={{ margin: 0, fontSize: 17 }}>{confirmDialog.title}</h3>
            </div>
            <p style={{
              fontSize: 14, color: "var(--on-surface-variant)", lineHeight: 1.7,
              whiteSpace: "pre-line", margin: "0 0 24px",
            }}>{confirmDialog.message}</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDialog(null)}>취소</button>
              <button className="btn" style={{
                background: "#dc2626", color: "#fff", border: "none",
                padding: "8px 20px", borderRadius: 8, fontWeight: 600, cursor: "pointer",
              }} onClick={confirmDialog.onConfirm}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
