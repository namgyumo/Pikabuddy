import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as Diff from "diff";
import api from "../lib/api";
import DOMPurify from "dompurify";
import { renderMarkdown } from "../lib/markdown";
import { computeNoteDiff, tiptapToLines, type NoteDiffLine } from "../lib/noteDiff";
import { useAuthStore } from "../store/authStore";
import AppShell from "../components/common/AppShell";
import ExamProctorPanel from "../components/ExamProctorPanel";
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
  const [newProblemFormat, setNewProblemFormat] = useState<"regular" | "baekjoon" | "programmers">("regular");
  const [newProblem, setNewProblem] = useState({
    title: "", description: "", starter_code: "", expected_output: "", hints: "",
    input_description: "", output_description: "", constraints: "",
    time_limit_ms: 1000, memory_limit_mb: 256,
    examples_text: "", test_cases_text: "",
    function_name: "solution", return_type: "", return_description: "", parameters_text: "",
  });

  // Due date editing
  const [editingDueDate, setEditingDueDate] = useState(false);
  const [dueDateValue, setDueDateValue] = useState("");

  // Problem import (문제 가져오기)
  const [showImport, setShowImport] = useState(false);
  const [problemBank, setProblemBank] = useState<{ assignment_id: string; assignment_title: string; problem_index: number; problem: Problem }[]>([]);
  const [importSelected, setImportSelected] = useState<Set<string>>(new Set());
  const [importLoading, setImportLoading] = useState(false);

  // Writing prompt editing
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptText, setPromptText] = useState("");

  // Score editing
  const [editingScore, setEditingScore] = useState<string | null>(null);
  const [scoreValue, setScoreValue] = useState("");

  // Submission detail view
  const [selectedSub, setSelectedSub] = useState<SubmissionWithAnalysis | null>(null);
  const [viewMode, setViewMode] = useState<"content" | "diff" | "paste" | "snapshot">("content");

  // Paste logs
  const [pasteLogs, setPasteLogs] = useState<PasteLog[]>([]);

  // Writing snapshots
  const [writingSnapshots, setWritingSnapshots] = useState<{ id: string; student_id: string; code_diff: Record<string, unknown> | null; created_at: string }[]>([]);
  const [selectedSnapshotIdx, setSelectedSnapshotIdx] = useState<number>(-1);
  const [snapshotDiffLines, setSnapshotDiffLines] = useState<NoteDiffLine[]>([]);

  // QA
  const [qaMessage, setQaMessage] = useState("");

  // Rubric editing
  const [editingRubric, setEditingRubric] = useState(false);
  const [rubricCriteria, setRubricCriteria] = useState<{ name: string; weight: number; description: string }[]>([]);

  // Expanded students / problems in grouped submissions
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [expandedProblems, setExpandedProblems] = useState<Set<string>>(new Set());

  // Exam student status
  const [examStudents, setExamStudents] = useState<{
    student_id: string; name: string; email: string; exam_ended: boolean;
    last_reset: { reset_at: string; reason: string } | null;
  }[]>([]);
  const [examStudentsLoaded, setExamStudentsLoaded] = useState(false);
  const [resetReason, setResetReason] = useState("");
  const [resettingStudent, setResettingStudent] = useState<string | null>(null);

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

  // Fetch writing snapshots when switching to snapshot view
  useEffect(() => {
    if (viewMode !== "snapshot" || !selectedSub || !courseId || !assignmentId) return;
    const isWritingSub = (assignment?.type === "writing" || assignment?.type === "both") && selectedSub.content;
    if (!isWritingSub) return;
    api.get(`/courses/${courseId}/assignments/${assignmentId}/submissions/${selectedSub.student_id}/snapshots`)
      .then((res) => {
        const snaps = res.data || [];
        setWritingSnapshots(snaps);
        setSelectedSnapshotIdx(snaps.length > 0 ? snaps.length - 1 : -1);
      })
      .catch(() => setWritingSnapshots([]));
  }, [viewMode, selectedSub?.id, courseId, assignmentId]);

  // Compute diff when snapshot selection changes
  useEffect(() => {
    if (selectedSnapshotIdx < 0 || writingSnapshots.length === 0) {
      setSnapshotDiffLines([]);
      return;
    }
    const snap = writingSnapshots[selectedSnapshotIdx];
    const prevSnap = selectedSnapshotIdx > 0 ? writingSnapshots[selectedSnapshotIdx - 1] : null;

    // Extract tiptap JSON from code_diff.code (stored as JSON.stringify'd)
    const parseContent = (s: { code_diff: Record<string, unknown> | null }) => {
      try {
        const raw = (s.code_diff as Record<string, string>)?.code;
        if (!raw) return {};
        return JSON.parse(raw) as Record<string, unknown>;
      } catch { return {}; }
    };

    const newContent = parseContent(snap);
    const oldContent = prevSnap ? parseContent(prevSnap) : { type: "doc", content: [] };
    setSnapshotDiffLines(computeNoteDiff(oldContent, newContent));
  }, [selectedSnapshotIdx, writingSnapshots]);

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

    // Parse examples and test_cases from text
    let examples: { input: string; output: string; explanation?: string }[] | undefined;
    let test_cases: { input: string; expected_output: string; is_hidden: boolean }[] | undefined;
    try {
      if (newProblem.examples_text.trim()) examples = JSON.parse(newProblem.examples_text);
    } catch { /* ignore parse error */ }
    try {
      if (newProblem.test_cases_text.trim()) test_cases = JSON.parse(newProblem.test_cases_text);
    } catch { /* ignore parse error */ }

    let parameters: { name: string; type: string; description: string }[] | undefined;
    try {
      if (newProblem.parameters_text.trim()) parameters = JSON.parse(newProblem.parameters_text);
    } catch { /* ignore parse error */ }

    const body: Record<string, unknown> = {
      title: newProblem.title,
      description: newProblem.description,
      starter_code: newProblemFormat === "baekjoon" ? "" : newProblem.starter_code,
      expected_output: newProblem.expected_output,
      hints: newProblem.hints ? newProblem.hints.split("\n").filter(Boolean) : [],
      format: newProblemFormat,
    };

    if (newProblemFormat === "baekjoon" || newProblemFormat === "programmers") {
      body.input_description = newProblem.input_description || undefined;
      body.output_description = newProblem.output_description || undefined;
      body.constraints = newProblem.constraints || undefined;
      body.time_limit_ms = newProblem.time_limit_ms;
      body.memory_limit_mb = newProblem.memory_limit_mb;
      if (examples) body.examples = examples;
      if (test_cases) body.test_cases = test_cases;
    }
    if (newProblemFormat === "programmers") {
      body.function_name = newProblem.function_name || undefined;
      body.return_type = newProblem.return_type || undefined;
      body.return_description = newProblem.return_description || undefined;
      if (parameters) body.parameters = parameters;
    }

    const { data } = await api.post(`/courses/${courseId}/assignments/${assignmentId}/problems`, body);
    setAssignment((prev) => prev ? { ...prev, problems: [...prev.problems, data] } : null);
    setAddingProblem(false);
    setNewProblemFormat("regular");
    setNewProblem({
      title: "", description: "", starter_code: "", expected_output: "", hints: "",
      input_description: "", output_description: "", constraints: "",
      time_limit_ms: 1000, memory_limit_mb: 256,
      examples_text: "", test_cases_text: "",
      function_name: "solution", return_type: "", return_description: "", parameters_text: "",
    });
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
        <main className="content" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)", maxWidth: "none", padding: "0" }}>
          {/* Header */}
          <div className="detail-panel-header">
            <div className="detail-panel-title-row">
              <button className="btn btn-ghost" onClick={() => { setSelectedSub(null); setViewMode("content"); setWritingSnapshots([]); setSelectedSnapshotIdx(-1); }}>&larr;</button>
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
              {isWritingSub && (
                <button className={`detail-tab ${viewMode === "snapshot" ? "active" : ""}`}
                  onClick={() => setViewMode("snapshot")}>스냅샷</button>
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
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(tiptapToHtml(selectedSub.content as Record<string, unknown>)) }} />
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
              ) : viewMode === "snapshot" ? (
                /* Writing snapshot diff view */
                <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
                  {/* Timeline sidebar */}
                  <div style={{
                    width: 200, minWidth: 200, borderRight: "1px solid var(--outline-variant)",
                    overflowY: "auto", background: "var(--surface-container)",
                  }}>
                    <div style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "var(--on-surface-variant)", borderBottom: "1px solid var(--outline-variant)" }}>
                      스냅샷 ({writingSnapshots.length})
                    </div>
                    {writingSnapshots.length === 0 ? (
                      <div style={{ padding: 16, fontSize: 13, color: "var(--on-surface-variant)" }}>스냅샷 없음</div>
                    ) : writingSnapshots.map((snap, idx) => (
                      <div key={snap.id}
                        onClick={() => setSelectedSnapshotIdx(idx)}
                        style={{
                          padding: "10px 14px", cursor: "pointer", fontSize: 12,
                          background: idx === selectedSnapshotIdx ? "var(--primary-light)" : "transparent",
                          borderLeft: idx === selectedSnapshotIdx ? "3px solid var(--primary)" : "3px solid transparent",
                          borderBottom: "1px solid var(--outline-variant)",
                        }}>
                        <div style={{ fontWeight: 600, color: idx === selectedSnapshotIdx ? "var(--primary)" : "var(--on-surface)" }}>
                          #{idx + 1}
                        </div>
                        <div style={{ color: "var(--on-surface-variant)", marginTop: 2 }}>
                          {new Date(snap.created_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </div>
                        {idx === 0 && <span style={{ fontSize: 10, color: "var(--tertiary)" }}>최초</span>}
                      </div>
                    ))}
                  </div>
                  {/* Diff area */}
                  <div style={{ flex: 1, overflow: "auto" }}>
                    {selectedSnapshotIdx < 0 ? (
                      <div className="empty" style={{ padding: 40 }}>스냅샷을 선택하세요</div>
                    ) : snapshotDiffLines.length === 0 ? (
                      <div className="empty" style={{ padding: 40 }}>
                        {selectedSnapshotIdx === 0 ? "최초 스냅샷 (이전 버전 없음)" : "변경 사항 없음"}
                      </div>
                    ) : (
                      <pre className="detail-code diff-view" style={{ margin: 0 }}>
                        {snapshotDiffLines.map((line, i) => (
                          <div key={i} className={`diff-line diff-${line.type}`}>
                            <span className="diff-num diff-num-old">{line.oldNum}</span>
                            <span className="diff-num diff-num-new">{line.newNum}</span>
                            <span className="diff-marker">
                              {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
                            </span>
                            <span className="diff-content">{line.text || "\u00A0"}</span>
                          </div>
                        ))}
                      </pre>
                    )}
                  </div>
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
                  background: assignment.type === "writing" ? "rgba(99,46,205,0.1)" : assignment.type === "both" ? "rgba(0,74,198,0.1)" : assignment.type === "algorithm" ? "rgba(16,185,129,0.1)" : assignment.type === "quiz" ? "rgba(245,158,11,0.1)" : undefined,
                  color: assignment.type === "writing" ? "var(--tertiary)" : assignment.type === "both" ? "var(--primary)" : assignment.type === "algorithm" ? "var(--success)" : assignment.type === "quiz" ? "var(--warning)" : undefined,
                }}>
                  {assignment.type === "writing" ? "글쓰기" : assignment.type === "both" ? "코딩+글쓰기" : assignment.type === "algorithm" ? "알고리즘" : assignment.type === "quiz" ? "퀴즈" : "코딩"}
                </span>
                <span className="badge badge-policy">{policyLabels[assignment.ai_policy] || assignment.ai_policy}</span>
                {assignment.type !== "writing" && <span className="badge">{assignment.language}</span>}
                {assignment.type !== "writing" && <span className="badge">문제 {assignment.problems?.length || 0}개</span>}
                {(() => {
                  const bjCount = assignment.problems?.filter((p: Record<string, unknown>) => (p as Record<string, unknown>).format === "baekjoon").length || 0;
                  const pgCount = assignment.problems?.filter((p: Record<string, unknown>) => (p as Record<string, unknown>).format === "programmers").length || 0;
                  const quizCount = assignment.problems?.filter((p: Record<string, unknown>) => (p as Record<string, unknown>).format === "quiz").length || 0;
                  const blockCount = assignment.problems?.filter((p: Record<string, unknown>) => (p as Record<string, unknown>).format === "block").length || 0;
                  return (
                    <>
                      {bjCount > 0 && <span className="badge" style={{ background: "rgba(16,185,129,0.1)", color: "var(--success)" }}>표준 입출력 {bjCount}</span>}
                      {pgCount > 0 && <span className="badge" style={{ background: "rgba(99,46,205,0.1)", color: "var(--tertiary)" }}>함수 구현 {pgCount}</span>}
                      {quizCount > 0 && <span className="badge" style={{ background: "rgba(245,158,11,0.1)", color: "var(--warning)" }}>퀴즈 {quizCount}</span>}
                      {blockCount > 0 && <span className="badge" style={{ background: "rgba(59,130,246,0.1)", color: "var(--primary)" }}>블록 코딩 {blockCount}</span>}
                    </>
                  );
                })()}
                {editingDueDate ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="datetime-local"
                      className="input"
                      style={{ fontSize: 12, padding: "3px 8px", width: "auto" }}
                      value={dueDateValue}
                      onChange={(e) => setDueDateValue(e.target.value)}
                    />
                    <button className="btn btn-primary" style={{ fontSize: 11, padding: "3px 10px" }}
                      onClick={async () => {
                        try {
                          await api.patch(`/courses/${courseId}/assignments/${assignmentId}`, {
                            due_date: dueDateValue ? new Date(dueDateValue).toISOString() : null,
                          });
                          setAssignment((prev) => prev ? { ...prev, due_date: dueDateValue ? new Date(dueDateValue).toISOString() : null } : prev);
                          setEditingDueDate(false);
                        } catch { /* ignore */ }
                      }}>저장</button>
                    <button className="btn btn-ghost" style={{ fontSize: 11, padding: "3px 8px" }}
                      onClick={() => setEditingDueDate(false)}>취소</button>
                    {dueDateValue && (
                      <button className="btn btn-ghost" style={{ fontSize: 11, padding: "3px 8px", color: "var(--error)" }}
                        onClick={async () => {
                          try {
                            await api.patch(`/courses/${courseId}/assignments/${assignmentId}`, { due_date: null });
                            setAssignment((prev) => prev ? { ...prev, due_date: null } : prev);
                            setDueDateValue("");
                            setEditingDueDate(false);
                          } catch { /* ignore */ }
                        }}>삭제</button>
                    )}
                  </span>
                ) : (
                  <span className="badge" style={{ cursor: "pointer" }}
                    onClick={() => {
                      setDueDateValue(assignment.due_date
                        ? new Date(assignment.due_date).toISOString().slice(0, 16)
                        : "");
                      setEditingDueDate(true);
                    }}>
                    {assignment.due_date
                      ? `마감: ${new Date(assignment.due_date).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
                      : "+ 기한 설정"}
                  </span>
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

          {/* 시험 모드 */}
          <label style={{
            display: "flex", alignItems: "center", gap: 10, marginTop: 12,
            fontSize: 14, color: "var(--on-surface-variant)", cursor: "pointer",
          }}>
            <input type="checkbox" checked={assignment.exam_mode ?? false}
              onChange={async (e) => {
                const val = e.target.checked;
                try {
                  await api.patch(`/exam/config/${assignmentId}`, {
                    exam_mode: val,
                    screenshot_interval: 30,
                    max_violations: 3,
                    screenshot_quality: 0.3,
                    fullscreen_required: true,
                  });
                  setAssignment((prev) => prev ? { ...prev, exam_mode: val } : null);
                } catch { /* ignore */ }
              }}
              style={{ width: 18, height: 18, accentColor: "var(--error)", cursor: "pointer" }} />
            시험 모드 (전체화면 강제 + 화면 캡쳐 + 이탈 감지)
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
        {assignment.type === "quiz" && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h2 className="section-title">퀴즈 문제 목록</h2>
            {!assignment.problems || assignment.problems.length === 0 ? (
              <div className="empty">퀴즈 문제가 아직 생성되지 않았습니다.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {assignment.problems
                  .filter((p) => (p as Record<string, unknown>).format === "quiz")
                  .map((p, i) => {
                    const qp = p as Record<string, unknown>;
                    const qType = qp.type as string || "multiple_choice";
                    const typeLabel = qType === "multiple_choice" ? "객관식" : qType === "short_answer" ? "주관식" : "서술형";
                    const typeColor = qType === "multiple_choice" ? "var(--primary)" : qType === "short_answer" ? "var(--success)" : "var(--tertiary)";
                    const typeBg = qType === "multiple_choice" ? "rgba(0,74,198,0.1)" : qType === "short_answer" ? "rgba(16,185,129,0.1)" : "rgba(99,46,205,0.1)";
                    const options = qp.options as string[] | undefined;
                    const correctAnswer = qp.correct_answer as string | undefined;
                    const acceptableAnswers = qp.acceptable_answers as string[] | undefined;
                    const points = qp.points as number | undefined;
                    return (
                      <div key={qp.id as number || i} style={{ padding: 20, background: "var(--surface-container)", borderRadius: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <h3 style={{ margin: "0 0 8px", display: "flex", alignItems: "center", gap: 8 }}>
                            {i + 1}. {qp.question as string || qp.title as string || ""}
                            <span className="badge" style={{ background: typeBg, color: typeColor, fontSize: 11 }}>{typeLabel}</span>
                            {points && <span className="badge" style={{ fontSize: 11 }}>{points}점</span>}
                          </h3>
                        </div>
                        {qType === "multiple_choice" && options && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                            {options.map((opt, oi) => (
                              <div key={oi} style={{
                                padding: "8px 12px", borderRadius: 8, fontSize: 14,
                                background: opt === correctAnswer ? "rgba(16,185,129,0.1)" : "var(--surface-container-high)",
                                border: opt === correctAnswer ? "1px solid var(--success)" : "1px solid transparent",
                                display: "flex", alignItems: "center", gap: 8,
                              }}>
                                <span style={{ fontWeight: 600, color: "var(--on-surface-variant)", minWidth: 20 }}>{String.fromCharCode(65 + oi)}.</span>
                                {opt}
                                {opt === correctAnswer && <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--success)", fontWeight: 600 }}>정답</span>}
                              </div>
                            ))}
                          </div>
                        )}
                        {qType === "short_answer" && correctAnswer && (
                          <div style={{ marginTop: 8, fontSize: 13 }}>
                            <strong>정답:</strong> <code style={{ background: "var(--surface-container-high)", padding: "2px 6px", borderRadius: 4 }}>{correctAnswer}</code>
                            {acceptableAnswers && acceptableAnswers.length > 0 && (
                              <span style={{ color: "var(--on-surface-variant)", marginLeft: 8 }}>
                                (허용: {acceptableAnswers.join(", ")})
                              </span>
                            )}
                          </div>
                        )}
                        {qType === "essay" && correctAnswer && (
                          <div style={{ marginTop: 8, fontSize: 13, color: "var(--on-surface-variant)", fontStyle: "italic" }}>
                            <strong style={{ fontStyle: "normal" }}>모범 답안:</strong> {correctAnswer}
                          </div>
                        )}
                        {qp.explanation && (
                          <div style={{ marginTop: 8, fontSize: 13, color: "var(--on-surface-variant)" }}>
                            <strong>해설:</strong> {qp.explanation as string}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {(assignment.type === "coding" || assignment.type === "both" || assignment.type === "algorithm") && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="section-title">문제 목록</h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn-ghost" onClick={async () => {
                  setShowImport(true);
                  setImportSelected(new Set());
                  try {
                    const { data } = await api.get(`/courses/${courseId}/assignments/problem-bank`);
                    setProblemBank((data || []).filter((p: { assignment_id: string }) => p.assignment_id !== assignmentId));
                  } catch { setProblemBank([]); }
                }}>기존 문제 가져오기</button>
                {/* JSON 내보내기 */}
                <button className="btn btn-ghost" onClick={() => {
                  if (!assignment?.problems?.length) return;
                  const json = JSON.stringify(assignment.problems, null, 2);
                  const blob = new Blob([json], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `problems_${assignment.title.replace(/\s+/g, "_")}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}>JSON 내보내기</button>
                {/* JSON 가져오기 */}
                <label className="btn btn-ghost" style={{ cursor: "pointer" }}>
                  JSON 가져오기
                  <input type="file" accept=".json" style={{ display: "none" }} onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const text = await file.text();
                      const imported = JSON.parse(text);
                      const problems = Array.isArray(imported) ? imported : [imported];
                      // 현재 과제에 문제 추가
                      const existing = assignment?.problems || [];
                      await api.patch(`/courses/${courseId}/assignments/${assignmentId}`, {
                        problems: [...existing, ...problems],
                      });
                      const { data } = await api.get(`/courses/${courseId}/assignments/${assignmentId}`);
                      setAssignment(data);
                      alert(`${problems.length}개 문제를 가져왔습니다.`);
                    } catch { alert("JSON 파싱 오류: 유효한 문제 JSON 파일이 아닙니다."); }
                    e.target.value = "";
                  }} />
                </label>
                <button className="btn btn-secondary" onClick={() => setAddingProblem(true)}>+ 문제 추가</button>
              </div>
            </div>
            {/* 문제 가져오기 패널 */}
            {showImport && (
              <div style={{ padding: 20, background: "var(--surface-container)", borderRadius: 12, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 15 }}>기존 문제 가져오기</h3>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-primary" style={{ fontSize: 12 }} disabled={importSelected.size === 0 || importLoading}
                      onClick={async () => {
                        setImportLoading(true);
                        try {
                          // 선택된 문제를 소스별로 그룹화
                          const grouped: Record<string, number[]> = {};
                          for (const key of importSelected) {
                            const [aId, pIdx] = key.split("::");
                            if (!grouped[aId]) grouped[aId] = [];
                            grouped[aId].push(parseInt(pIdx));
                          }
                          for (const [sourceId, indices] of Object.entries(grouped)) {
                            await api.post(`/courses/${courseId}/assignments/${assignmentId}/import-problems`, {
                              source_assignment_id: sourceId,
                              problem_indices: indices,
                            });
                          }
                          // 과제 새로고침
                          const { data } = await api.get(`/courses/${courseId}/assignments/${assignmentId}`);
                          setAssignment(data);
                          setShowImport(false);
                        } finally { setImportLoading(false); }
                      }}>
                      {importLoading ? "가져오는 중..." : `${importSelected.size}개 가져오기`}
                    </button>
                    <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowImport(false)}>취소</button>
                  </div>
                </div>
                {problemBank.length === 0 ? (
                  <div style={{ color: "var(--on-surface-variant)", fontSize: 13, padding: "12px 0" }}>가져올 수 있는 문제가 없습니다.</div>
                ) : (
                  <div style={{ maxHeight: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                    {problemBank.map((item) => {
                      const key = `${item.assignment_id}::${item.problem_index}`;
                      const checked = importSelected.has(key);
                      return (
                        <label key={key} style={{
                          display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px",
                          background: checked ? "var(--primary-light)" : "var(--surface-container-lowest)",
                          borderRadius: 8, cursor: "pointer", border: `1px solid ${checked ? "var(--primary)" : "var(--outline-variant)"}`,
                          transition: "all 0.12s",
                        }}>
                          <input type="checkbox" checked={checked}
                            onChange={() => {
                              setImportSelected((prev) => {
                                const next = new Set(prev);
                                next.has(key) ? next.delete(key) : next.add(key);
                                return next;
                              });
                            }}
                            style={{ marginTop: 3, accentColor: "var(--primary)" }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{item.problem.title}</div>
                            <div style={{ fontSize: 11, color: "var(--on-surface-variant)", marginTop: 2 }}>
                              {item.assignment_title} &middot; {(item.problem as Record<string, unknown>).format === "baekjoon" ? "표준 입출력" : (item.problem as Record<string, unknown>).format === "programmers" ? "함수 구현" : (item.problem as Record<string, unknown>).format === "quiz" ? "퀴즈" : "일반"}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {addingProblem && (
              <div style={{ padding: 20, background: "var(--surface-container)", borderRadius: 12, marginBottom: 16 }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>새 문제 추가</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* 문제 형식 선택 */}
                  <div className="type-chips">
                    {(["regular", "baekjoon", "programmers"] as const).map((f) => (
                      <button key={f} type="button"
                        className={`type-chip${newProblemFormat === f ? " active" : ""}`}
                        onClick={() => setNewProblemFormat(f)}>
                        {f === "regular" ? "일반 코딩" : f === "baekjoon" ? "표준 입출력형" : "함수 구현형"}
                      </button>
                    ))}
                  </div>

                  {/* 공통 필드 */}
                  <input className="input" placeholder="문제 제목" value={newProblem.title}
                    onChange={(e) => setNewProblem({ ...newProblem, title: e.target.value })} />
                  <textarea className="input" placeholder="문제 설명" value={newProblem.description}
                    onChange={(e) => setNewProblem({ ...newProblem, description: e.target.value })} rows={4}
                    style={{ resize: "vertical", fontFamily: "inherit" }} />

                  {/* 일반: 시작 코드 + 예상 출력 */}
                  {newProblemFormat === "regular" && (
                    <>
                      <textarea className="input" placeholder="시작 코드 (선택)" value={newProblem.starter_code}
                        onChange={(e) => setNewProblem({ ...newProblem, starter_code: e.target.value })} rows={3}
                        style={{ resize: "vertical", fontFamily: "JetBrains Mono, monospace", fontSize: 13 }} />
                      <input className="input" placeholder="예상 출력 (선택)" value={newProblem.expected_output}
                        onChange={(e) => setNewProblem({ ...newProblem, expected_output: e.target.value })} />
                    </>
                  )}

                  {/* 함수 구현형: 전체 코드 틀 (solution 비워둠) */}
                  {newProblemFormat === "programmers" && (
                    <>
                      <textarea className="input" placeholder="시작 코드 (전체 구조 — solution 함수 body만 비워두기)" value={newProblem.starter_code}
                        onChange={(e) => setNewProblem({ ...newProblem, starter_code: e.target.value })} rows={6}
                        style={{ resize: "vertical", fontFamily: "JetBrains Mono, monospace", fontSize: 13 }} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <input className="input" placeholder="함수 이름 (예: solution)" value={newProblem.function_name}
                          onChange={(e) => setNewProblem({ ...newProblem, function_name: e.target.value })} style={{ flex: 1 }} />
                        <input className="input" placeholder="반환 타입 (예: int)" value={newProblem.return_type}
                          onChange={(e) => setNewProblem({ ...newProblem, return_type: e.target.value })} style={{ flex: 1 }} />
                      </div>
                      <input className="input" placeholder="반환값 설명 (예: 최대 합. 답 없으면 -1)" value={newProblem.return_description}
                        onChange={(e) => setNewProblem({ ...newProblem, return_description: e.target.value })} />
                      <textarea className="input" placeholder={'매개변수 JSON (예: [{"name":"n","type":"int","description":"크기"}])'}
                        value={newProblem.parameters_text}
                        onChange={(e) => setNewProblem({ ...newProblem, parameters_text: e.target.value })} rows={2}
                        style={{ resize: "vertical", fontFamily: "JetBrains Mono, monospace", fontSize: 12 }} />
                    </>
                  )}

                  {/* 표준 입출력 / 함수 구현 공통: 입출력 형식 + 제약 + 테스트케이스 */}
                  {(newProblemFormat === "baekjoon" || newProblemFormat === "programmers") && (
                    <>
                      {newProblemFormat === "baekjoon" && (
                        <div style={{ display: "flex", gap: 8 }}>
                          <textarea className="input" placeholder="입력 형식 설명" value={newProblem.input_description}
                            onChange={(e) => setNewProblem({ ...newProblem, input_description: e.target.value })} rows={2}
                            style={{ resize: "vertical", fontFamily: "inherit", flex: 1 }} />
                          <textarea className="input" placeholder="출력 형식 설명" value={newProblem.output_description}
                            onChange={(e) => setNewProblem({ ...newProblem, output_description: e.target.value })} rows={2}
                            style={{ resize: "vertical", fontFamily: "inherit", flex: 1 }} />
                        </div>
                      )}
                      <input className="input" placeholder="제약 조건 (예: 1 <= N <= 100000)" value={newProblem.constraints}
                        onChange={(e) => setNewProblem({ ...newProblem, constraints: e.target.value })} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--on-surface-variant)" }}>
                          시간
                          <input className="input" type="number" min={100} max={10000} value={newProblem.time_limit_ms}
                            onChange={(e) => setNewProblem({ ...newProblem, time_limit_ms: Number(e.target.value) })}
                            style={{ width: 90 }} />
                          ms
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--on-surface-variant)" }}>
                          메모리
                          <input className="input" type="number" min={16} max={1024} value={newProblem.memory_limit_mb}
                            onChange={(e) => setNewProblem({ ...newProblem, memory_limit_mb: Number(e.target.value) })}
                            style={{ width: 90 }} />
                          MB
                        </label>
                      </div>
                      <textarea className="input"
                        placeholder={'예제 JSON (예: [{"input":"5\\n1 2 3 4 5","output":"15","explanation":"합"}])'}
                        value={newProblem.examples_text}
                        onChange={(e) => setNewProblem({ ...newProblem, examples_text: e.target.value })} rows={3}
                        style={{ resize: "vertical", fontFamily: "JetBrains Mono, monospace", fontSize: 12 }} />
                      <textarea className="input"
                        placeholder={'테스트케이스 JSON (예: [{"input":"3\\n1 2 3","expected_output":"6","is_hidden":false}])'}
                        value={newProblem.test_cases_text}
                        onChange={(e) => setNewProblem({ ...newProblem, test_cases_text: e.target.value })} rows={3}
                        style={{ resize: "vertical", fontFamily: "JetBrains Mono, monospace", fontSize: 12 }} />
                    </>
                  )}

                  {/* 힌트 (공통) */}
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
                      <h3 style={{ margin: "0 0 8px", display: "flex", alignItems: "center", gap: 8 }}>
                        {i + 1}. {p.title}
                        {(p as Record<string, unknown>).format === "baekjoon" && (
                          <span className="badge" style={{ background: "rgba(16,185,129,0.1)", color: "var(--success)", fontSize: 11 }}>표준 입출력</span>
                        )}
                        {(p as Record<string, unknown>).format === "programmers" && (
                          <span className="badge" style={{ background: "rgba(99,46,205,0.1)", color: "var(--tertiary)", fontSize: 11 }}>함수 구현</span>
                        )}
                        {(p as Record<string, unknown>).format === "block" && (
                          <span className="badge" style={{ background: "rgba(59,130,246,0.1)", color: "var(--primary)", fontSize: 11 }}>블록 코딩</span>
                        )}
                      </h3>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }}
                          onClick={() => handleEditProblem(p)}>수정</button>
                        <button className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 10px", color: "var(--error)" }}
                          onClick={() => handleDeleteProblem(p.id)}>삭제</button>
                      </div>
                    </div>
                    <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{p.description}</p>
                    {/* Algorithm-specific fields */}
                    {((p as Record<string, unknown>).format === "baekjoon" || (p as Record<string, unknown>).format === "programmers" || assignment.type === "algorithm") && (() => {
                      const ap = p as Record<string, unknown>;
                      const fmt = (ap.format as string) || "baekjoon";
                      const examples = ap.examples as { input: unknown; output: unknown; explanation?: string }[] | undefined;
                      const testCases = ap.test_cases as { input: unknown; expected_output: unknown; is_hidden: boolean }[] | undefined;
                      const fmtStr = (v: unknown) => typeof v === "string" ? v : JSON.stringify(v, null, 2);
                      return (
                        <div style={{ marginTop: 12, fontSize: 13 }}>
                          {/* 함수 구현형: 매개변수/반환값 */}
                          {fmt === "programmers" && (ap.parameters as { name: string; type: string; description: string }[])?.length > 0 && (
                            <div style={{ marginBottom: 8 }}>
                              <strong>매개변수</strong>
                              {(ap.parameters as { name: string; type: string; description: string }[]).map((param, pi) => (
                                <p key={pi} style={{ margin: "2px 0", color: "var(--on-surface-variant)" }}>
                                  <code style={{ fontWeight: 600 }}>{param.name}</code> ({param.type}) — {param.description}
                                </p>
                              ))}
                            </div>
                          )}
                          {fmt === "programmers" && ap.return_type && (
                            <div style={{ marginBottom: 8 }}>
                              <strong>반환값</strong>
                              <p style={{ margin: "4px 0", color: "var(--on-surface-variant)" }}>
                                <code style={{ fontWeight: 600 }}>{ap.return_type as string}</code>
                                {ap.return_description && ` — ${ap.return_description as string}`}
                              </p>
                            </div>
                          )}
                          {/* 표준 입출력형: 입출력 형식 */}
                          {fmt !== "programmers" && ap.input_description && (
                            <div style={{ marginBottom: 8 }}>
                              <strong>입력 형식</strong>
                              <p style={{ margin: "4px 0", color: "var(--on-surface-variant)" }}>{ap.input_description as string}</p>
                            </div>
                          )}
                          {fmt !== "programmers" && ap.output_description && (
                            <div style={{ marginBottom: 8 }}>
                              <strong>출력 형식</strong>
                              <p style={{ margin: "4px 0", color: "var(--on-surface-variant)" }}>{ap.output_description as string}</p>
                            </div>
                          )}
                          {ap.constraints && (
                            <div style={{ marginBottom: 8 }}>
                              <strong>제약 조건</strong>
                              <p style={{ margin: "4px 0", color: "var(--warning)" }}>{ap.constraints as string}</p>
                            </div>
                          )}
                          {ap.time_limit_ms && (
                            <span className="badge" style={{ marginRight: 6 }}>시간 제한: {ap.time_limit_ms as number}ms</span>
                          )}
                          {ap.memory_limit_mb && (
                            <span className="badge">메모리 제한: {ap.memory_limit_mb as number}MB</span>
                          )}
                          {examples && examples.length > 0 && (
                            <details style={{ marginTop: 10 }} open>
                              <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--primary)" }}>예제 ({examples.length}개)</summary>
                              {examples.map((ex, ei) => (
                                <div key={ei} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8, background: "var(--surface-container-high)", borderRadius: 8, padding: 10 }}>
                                  <div>
                                    <div style={{ fontSize: 11, color: "var(--on-surface-variant)", marginBottom: 2 }}>입력</div>
                                    <pre style={{ background: "var(--editor-bg)", color: "#d4d4d4", padding: 8, borderRadius: 6, margin: 0, fontSize: 12, fontFamily: "JetBrains Mono, monospace", whiteSpace: "pre-wrap", wordBreak: "break-all", overflow: "auto", maxHeight: 200 }}>{fmtStr(ex.input)}</pre>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 11, color: "var(--on-surface-variant)", marginBottom: 2 }}>출력</div>
                                    <pre style={{ background: "var(--editor-bg)", color: "#d4d4d4", padding: 8, borderRadius: 6, margin: 0, fontSize: 12, fontFamily: "JetBrains Mono, monospace", whiteSpace: "pre-wrap", wordBreak: "break-all", overflow: "auto", maxHeight: 200 }}>{fmtStr(ex.output)}</pre>
                                  </div>
                                  {ex.explanation && <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "var(--on-surface-variant)" }}>{ex.explanation}</div>}
                                </div>
                              ))}
                            </details>
                          )}
                          {testCases && testCases.length > 0 && (
                            <details style={{ marginTop: 10 }}>
                              <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--tertiary)" }}>테스트케이스 ({testCases.length}개)</summary>
                              {testCases.map((tc, ti) => (
                                <div key={ti} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8, background: "var(--surface-container-high)", borderRadius: 8, padding: 10 }}>
                                  <div>
                                    <div style={{ fontSize: 11, color: "var(--on-surface-variant)", marginBottom: 2 }}>입력 {tc.is_hidden && <span style={{ color: "var(--warning)" }}>(히든)</span>}</div>
                                    <pre style={{ background: "var(--editor-bg)", color: "#d4d4d4", padding: 8, borderRadius: 6, margin: 0, fontSize: 12, fontFamily: "JetBrains Mono, monospace", whiteSpace: "pre-wrap", wordBreak: "break-all", overflow: "auto", maxHeight: 200 }}>{fmtStr(tc.input)}</pre>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 11, color: "var(--on-surface-variant)", marginBottom: 2 }}>예상 출력</div>
                                    <pre style={{ background: "var(--editor-bg)", color: "#d4d4d4", padding: 8, borderRadius: 6, margin: 0, fontSize: 12, fontFamily: "JetBrains Mono, monospace", whiteSpace: "pre-wrap", wordBreak: "break-all", overflow: "auto", maxHeight: 200 }}>{fmtStr(tc.expected_output)}</pre>
                                  </div>
                                </div>
                              ))}
                            </details>
                          )}
                        </div>
                      );
                    })()}
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
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 className="section-title">채점 루브릭</h2>
            {!editingRubric && (
              <button className="btn btn-ghost" onClick={() => {
                setRubricCriteria(assignment.rubric?.criteria?.length
                  ? assignment.rubric.criteria.map((c) => ({ ...c }))
                  : [{ name: "", weight: 100, description: "" }]);
                setEditingRubric(true);
              }}>수정</button>
            )}
          </div>
          {editingRubric ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {rubricCriteria.map((c, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input className="input" placeholder="기준명" value={c.name}
                    onChange={(e) => { const arr = [...rubricCriteria]; arr[i] = { ...arr[i], name: e.target.value }; setRubricCriteria(arr); }}
                    style={{ flex: 1 }} />
                  <input className="input" type="number" min={0} max={100} value={c.weight}
                    onChange={(e) => { const arr = [...rubricCriteria]; arr[i] = { ...arr[i], weight: Number(e.target.value) }; setRubricCriteria(arr); }}
                    style={{ width: 70, textAlign: "center" }} />
                  <span style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>%</span>
                  <input className="input" placeholder="설명" value={c.description}
                    onChange={(e) => { const arr = [...rubricCriteria]; arr[i] = { ...arr[i], description: e.target.value }; setRubricCriteria(arr); }}
                    style={{ flex: 2 }} />
                  <button className="btn btn-ghost" style={{ color: "var(--error)", padding: "4px 8px", fontSize: 16 }}
                    onClick={() => setRubricCriteria(rubricCriteria.filter((_, j) => j !== i))}>&times;</button>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button className="btn btn-secondary" style={{ fontSize: 13 }}
                  onClick={() => setRubricCriteria([...rubricCriteria, { name: "", weight: 0, description: "" }])}>
                  + 기준 추가
                </button>
                <span style={{ fontSize: 12, color: rubricCriteria.reduce((s, c) => s + c.weight, 0) === 100 ? "var(--success)" : "var(--warning)" }}>
                  합계: {rubricCriteria.reduce((s, c) => s + c.weight, 0)}%
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary" onClick={async () => {
                  const filtered = rubricCriteria.filter((c) => c.name.trim());
                  const newRubric = { criteria: filtered };
                  await api.patch(`/courses/${courseId}/assignments/${assignmentId}`, { rubric: newRubric });
                  setAssignment((prev) => prev ? { ...prev, rubric: newRubric } : null);
                  setEditingRubric(false);
                }}>저장</button>
                <button className="btn btn-secondary" onClick={() => setEditingRubric(false)}>취소</button>
              </div>
            </div>
          ) : assignment.rubric?.criteria && assignment.rubric.criteria.length > 0 ? (
            <table className="table">
              <thead><tr><th>기준</th><th>비중</th><th>설명</th></tr></thead>
              <tbody>
                {assignment.rubric.criteria.map((c, i) => (
                  <tr key={i}><td style={{ fontWeight: 600 }}>{c.name}</td><td>{c.weight}%</td><td>{c.description}</td></tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">루브릭이 없습니다. 수정 버튼으로 추가하세요.</div>
          )}
        </div>

        {/* 시험 감독 */}
        {assignment.exam_mode && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h2 className="section-title">시험 감독</h2>
            <ExamProctorPanel assignmentId={assignment.id} />
          </div>
        )}

        {/* 시험 응시 관리 */}
        {assignment.exam_mode && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="section-title">시험 응시 관리</h2>
              {!examStudentsLoaded && (
                <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={async () => {
                  try {
                    const { data } = await api.get(`/exam/students/${assignmentId}`);
                    setExamStudents(data);
                    setExamStudentsLoaded(true);
                  } catch { /* ignore */ }
                }}>응시 현황 불러오기</button>
              )}
            </div>
            {examStudentsLoaded && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
                {examStudents.length === 0 ? (
                  <div className="empty">수강생이 없습니다.</div>
                ) : examStudents.map((st) => (
                  <div key={st.student_id} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                    background: "var(--surface-container)", borderRadius: 10,
                  }}>
                    <span style={{ fontWeight: 600, fontSize: 14, minWidth: 80 }}>{st.name}</span>
                    <span style={{ fontSize: 12, color: "var(--on-surface-variant)", minWidth: 140 }}>{st.email}</span>
                    <span className="badge" style={{
                      background: st.exam_ended ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
                      color: st.exam_ended ? "#16a34a" : "#d97706", fontWeight: 600,
                    }}>
                      {st.exam_ended ? "응시 완료" : "미응시"}
                    </span>
                    {st.last_reset && (
                      <span style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>
                        리셋: {new Date(st.last_reset.reset_at).toLocaleString("ko-KR")}
                        {st.last_reset.reason && ` (${st.last_reset.reason})`}
                      </span>
                    )}
                    <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
                      {st.exam_ended && resettingStudent !== st.student_id && (
                        <button className="btn btn-ghost" style={{ fontSize: 12, color: "var(--primary)", padding: "4px 10px" }}
                          onClick={() => { setResettingStudent(st.student_id); setResetReason(""); }}>
                          미응시로 변경
                        </button>
                      )}
                      {resettingStudent === st.student_id && (
                        <>
                          <input className="input" placeholder="사유 입력 (필수)" value={resetReason}
                            onChange={(e) => setResetReason(e.target.value)}
                            style={{ width: 180, padding: "4px 8px", fontSize: 12 }} />
                          <button className="btn btn-primary" style={{ fontSize: 12, padding: "4px 12px" }}
                            disabled={!resetReason.trim()}
                            onClick={async () => {
                              try {
                                await api.post("/exam/reset", {
                                  assignment_id: assignmentId,
                                  student_id: st.student_id,
                                  reason: resetReason,
                                });
                                setExamStudents((prev) => prev.map((s) =>
                                  s.student_id === st.student_id
                                    ? { ...s, exam_ended: false, last_reset: { reset_at: new Date().toISOString(), reason: resetReason } }
                                    : s
                                ));
                                setResettingStudent(null);
                              } catch { /* ignore */ }
                            }}>확인</button>
                          <button className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 8px" }}
                            onClick={() => setResettingStudent(null)}>취소</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Submissions — grouped by student */}
        <div className="card">
          <h2 className="section-title">제출 현황 ({submissions.length}건)</h2>
          {submissions.length === 0 ? (
            <div className="empty">아직 제출물이 없습니다.</div>
          ) : (() => {
            // Helper: best score for a submission
            const getScore = (s: SubmissionWithAnalysis) => {
              const a = Array.isArray(s.ai_analyses) ? s.ai_analyses[0] : null;
              if (!a) return null;
              return a.final_score ?? a.score ?? null;
            };

            // Group by student
            const grouped = new Map<string, SubmissionWithAnalysis[]>();
            for (const s of submissions) {
              if (!grouped.has(s.student_id)) grouped.set(s.student_id, []);
              grouped.get(s.student_id)!.push(s);
            }
            const studentEntries = Array.from(grouped.entries()).sort((a, b) =>
              (a[1][0]?.users?.name || "").localeCompare(b[1][0]?.users?.name || "", "ko")
            );

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {studentEntries.map(([studentId, subs]) => {
                  const studentName = subs[0]?.users?.name || "학생";
                  const studentEmail = subs[0]?.users?.email || "";
                  const totalPastes = subs.reduce((sum, s) => sum + getPastesForSubmission(s).length, 0);
                  const isStudentExpanded = expandedStudents.has(studentId);

                  // Group by problem index
                  const byProblem = new Map<number, SubmissionWithAnalysis[]>();
                  for (const s of subs) {
                    const pIdx = s.problem_index ?? 0;
                    if (!byProblem.has(pIdx)) byProblem.set(pIdx, []);
                    byProblem.get(pIdx)!.push(s);
                  }
                  const problemEntries = Array.from(byProblem.entries()).sort((a, b) => a[0] - b[0]);

                  // Per-problem best score (highest among all submissions)
                  const problemBestScores: (number | null)[] = problemEntries.map(([, psubs]) => {
                    let best: number | null = null;
                    for (const s of psubs) {
                      const sc = getScore(s);
                      if (sc !== null && (best === null || sc > best)) best = sc;
                    }
                    return best;
                  });

                  // Student avg = average of per-problem best scores
                  const validScores = problemBestScores.filter((s): s is number => s !== null);
                  const studentAvg = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : null;

                  return (
                    <div key={studentId} style={{
                      background: "var(--surface-container)", borderRadius: 12, overflow: "hidden",
                    }}>
                      {/* ── Student header ── */}
                      <div
                        onClick={() => setExpandedStudents((prev) => {
                          const next = new Set(prev);
                          if (next.has(studentId)) next.delete(studentId); else next.add(studentId);
                          return next;
                        })}
                        style={{
                          padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
                          cursor: "pointer", transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-container-high)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{
                            display: "inline-block", transition: "transform 0.2s",
                            transform: isStudentExpanded ? "rotate(90deg)" : "rotate(0deg)",
                            fontSize: 13, color: "var(--on-surface-variant)",
                          }}>&#9654;</span>
                          <span style={{ fontWeight: 700, fontSize: 15 }}>{studentName}</span>
                          <span style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>{studentEmail}</span>
                          <span className="badge">{subs.length}건 제출</span>
                          {totalPastes > 0 && (
                            <span className="badge" style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626", fontWeight: 600 }}>
                              복붙 {totalPastes}회
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {studentAvg !== null && (
                            <span className="badge" style={{
                              background: studentAvg >= 80 ? "rgba(34,197,94,0.12)" : studentAvg >= 50 ? "rgba(245,158,11,0.12)" : "rgba(220,38,38,0.1)",
                              color: studentAvg >= 80 ? "#16a34a" : studentAvg >= 50 ? "#d97706" : "#dc2626",
                              fontWeight: 700,
                            }}>
                              평균 {studentAvg}점
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ── Problem groups under student ── */}
                      {isStudentExpanded && (
                        <div style={{ borderTop: "1px solid var(--outline-variant)" }}>
                          {problemEntries.map(([pIdx, psubs], pi) => {
                            const problemKey = `${studentId}-p${pIdx}`;
                            const isProblemExpanded = expandedProblems.has(problemKey);
                            const bestScore = problemBestScores[pi];
                            const problemTitle = isWriting && psubs[0]?.content
                              ? "글쓰기"
                              : `문제 ${pIdx + 1}${assignment.problems?.[pIdx]?.title ? ` — ${assignment.problems[pIdx].title}` : ""}`;

                            return (
                              <div key={problemKey}>
                                {/* Problem header */}
                                <div
                                  onClick={() => setExpandedProblems((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(problemKey)) next.delete(problemKey); else next.add(problemKey);
                                    return next;
                                  })}
                                  style={{
                                    padding: "8px 16px 8px 40px", display: "flex", justifyContent: "space-between",
                                    alignItems: "center", cursor: "pointer", transition: "background 0.15s",
                                    borderBottom: "1px solid var(--outline-variant)",
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-container-high)")}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{
                                      display: "inline-block", transition: "transform 0.2s",
                                      transform: isProblemExpanded ? "rotate(90deg)" : "rotate(0deg)",
                                      fontSize: 11, color: "var(--on-surface-variant)",
                                    }}>&#9654;</span>
                                    <span style={{ fontWeight: 600, fontSize: 13 }}>{problemTitle}</span>
                                    <span style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>{psubs.length}건</span>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    {bestScore !== null && (
                                      <span className="badge" style={{
                                        fontSize: 11,
                                        background: bestScore >= 80 ? "rgba(34,197,94,0.12)" : bestScore >= 50 ? "rgba(245,158,11,0.12)" : "rgba(220,38,38,0.1)",
                                        color: bestScore >= 80 ? "#16a34a" : bestScore >= 50 ? "#d97706" : "#dc2626",
                                        fontWeight: 700,
                                      }}>
                                        최고 {bestScore}점
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Individual submissions */}
                                {isProblemExpanded && psubs
                                  .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
                                  .map((s) => {
                                    const analysis = Array.isArray(s.ai_analyses) ? s.ai_analyses[0] : null;
                                    const subPastes = getPastesForSubmission(s);
                                    const pasteCount = subPastes.length;
                                    return (
                                      <div key={s.id}
                                        onClick={() => { setSelectedSub(s); setViewMode("content"); }}
                                        style={{
                                          padding: "8px 16px 8px 64px", cursor: "pointer",
                                          borderBottom: "1px solid var(--outline-variant)",
                                          transition: "background 0.15s",
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-container-high)")}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                      >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <span style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>
                                              {new Date(s.submitted_at).toLocaleString("ko-KR")}
                                            </span>
                                            {pasteCount > 0 && (
                                              <span className="badge" style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626", fontWeight: 600, fontSize: 11 }}>
                                                복붙 {pasteCount}회
                                              </span>
                                            )}
                                          </div>
                                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            {analysis && (
                                              analysis.final_score != null ? (
                                                <span className="badge" style={{ background: "rgba(34,197,94,0.12)", color: "#16a34a", fontWeight: 700, fontSize: 11 }}>
                                                  확정 {analysis.final_score}점
                                                </span>
                                              ) : (
                                                <span className="badge" style={{ background: "rgba(99,46,205,0.1)", color: "var(--tertiary)", fontSize: 11 }}>
                                                  AI {analysis.score ?? "-"}점
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
                                  })
                                }
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
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
