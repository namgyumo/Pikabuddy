import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import * as Diff from "diff";
import { renderMarkdown } from "../lib/markdown";
import api from "../lib/api";
import AppShell from "../components/common/AppShell";

interface AiAnalysis {
  score: number | null;
  feedback: string | null;
  suggestions: string[] | null;
}

interface SubmissionItem {
  id: string;
  code: string;
  status: string;
  submitted_at: string;
  assignment_id: string;
  problem_index?: number;
  ai_analyses: AiAnalysis | AiAnalysis[] | null;
  assignments: {
    title: string;
    topic: string | null;
    problems?: { title?: string; starter_code?: string; description?: string }[];
  } | null;
}

interface NoteItem {
  id: string;
  title: string;
  content: Record<string, unknown> | null;
  understanding_score: number | null;
  gap_analysis: Record<string, unknown> | null;
  parent_id: string | null;
  updated_at: string;
}

interface PasteLog {
  id: string;
  assignment_id: string | null;
  content: string;
  problem_index: number;
  timestamp: string;
}

interface StudentDetailData {
  student: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  };
  submissions: SubmissionItem[];
  notes: NoteItem[];
  snapshot_count: number;
  paste_count: number;
  paste_logs: PasteLog[];
}

function getAnalysis(sub: SubmissionItem): AiAnalysis | null {
  const a = sub.ai_analyses;
  if (Array.isArray(a)) return a[0] || null;
  return a;
}

function getScore(sub: SubmissionItem): number | null {
  return getAnalysis(sub)?.score ?? null;
}

// Convert Tiptap JSON node to HTML string
function tiptapToHtml(node: Record<string, unknown>): string {
  if (!node) return "";

  // Text node with marks
  if (node.type === "text") {
    let html = escapeHtml(node.text as string || "");
    const marks = node.marks as { type: string }[] | undefined;
    if (marks) {
      for (const mark of marks) {
        if (mark.type === "bold") html = `<strong>${html}</strong>`;
        else if (mark.type === "italic") html = `<em>${html}</em>`;
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
    case "heading": {
      const level = attrs?.level || 1;
      return `<h${level}>${inner}</h${level}>`;
    }
    case "bulletList": return `<ul>${inner}</ul>`;
    case "orderedList": return `<ol>${inner}</ol>`;
    case "listItem": return `<li>${inner}</li>`;
    case "blockquote": return `<blockquote>${inner}</blockquote>`;
    case "codeBlock": return `<pre><code>${inner}</code></pre>`;
    case "horizontalRule": return "<hr/>";
    case "hardBreak": return "<br/>";
    default: return inner;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Inline diff: removed line immediately followed by its replacement (added line)
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
      // Context lines
      const lines = part.value.replace(/\n$/, "").split("\n");
      for (const line of lines) {
        result.push({ type: "context", oldNum: String(oldNum++), newNum: String(newNum++), text: line });
      }
      i++;
    } else if (part.removed) {
      // Collect removed lines, then check if next part is added (replacement)
      const removedLines = part.value.replace(/\n$/, "").split("\n");
      const nextPart = i + 1 < parts.length && parts[i + 1].added ? parts[i + 1] : null;
      const addedLines = nextPart ? nextPart.value.replace(/\n$/, "").split("\n") : [];

      // Interleave: old line then new line
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
      // Pure addition (no preceding removal)
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

/** Build a set of trimmed lines from all paste logs for a given assignment */
function getPastedLines(pasteLogs: PasteLog[], assignmentId: string): Set<string> {
  const lines = new Set<string>();
  for (const log of pasteLogs) {
    if (log.assignment_id !== assignmentId) continue;
    if (!log.content) continue;
    for (const line of log.content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed) lines.add(trimmed);
    }
  }
  return lines;
}

/** Recursively convert any JSON object/value into readable markdown */
function jsonToMarkdown(value: unknown, depth: number = 0): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === "string") return `- ${item}`;
      if (typeof item === "object" && item !== null) return jsonToMarkdown(item, depth);
      return `- ${String(item)}`;
    }).join("\n");
  }

  if (typeof value === "object") {
    const labelMap: Record<string, string> = {
      gap_analysis: "갭 분석",
      incorrect_concepts: "잘못 이해한 개념",
      recommendations: "학습 추천",
      summary: "요약",
      feedback: "피드백",
      score: "점수",
      strengths: "잘한 점",
      weaknesses: "부족한 점",
      suggestions: "제안",
      details: "상세",
      analysis: "분석",
    };
    const heading = depth === 0 ? "###" : "####";
    const parts: string[] = [];
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val === null || val === undefined) continue;
      const label = labelMap[key] || key.replace(/_/g, " ");
      if (typeof val === "string") {
        parts.push(`${heading} ${label}\n${val}`);
      } else if (typeof val === "number" || typeof val === "boolean") {
        parts.push(`**${label}:** ${val}`);
      } else {
        parts.push(`${heading} ${label}\n${jsonToMarkdown(val, depth + 1)}`);
      }
    }
    return parts.join("\n\n");
  }

  return String(value);
}

function formatGapAnalysis(gap: Record<string, unknown>): string {
  return jsonToMarkdown(gap);
}

export default function StudentDetail() {
  const { courseId, studentId } = useParams<{
    courseId: string;
    studentId: string;
  }>();
  const navigate = useNavigate();
  const [data, setData] = useState<StudentDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<SubmissionItem | null>(null);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [viewMode, setViewMode] = useState<"code" | "diff" | "paste">("code");
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null);
  const [expandedProblem, setExpandedProblem] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  // Memoize note tree structure
  const noteTree = useMemo(() => {
    if (!data?.notes.length) return { roots: [] as NoteItem[], childrenMap: new Map<string | null, NoteItem[]>() };
    const noteIds = new Set(data.notes.map((n) => n.id));
    const childrenMap = new Map<string | null, NoteItem[]>();
    for (const n of data.notes) {
      const pid = n.parent_id && noteIds.has(n.parent_id) ? n.parent_id : null;
      if (!childrenMap.has(pid)) childrenMap.set(pid, []);
      childrenMap.get(pid)!.push(n);
    }
    return { roots: childrenMap.get(null) || [], childrenMap };
  }, [data?.notes]);

  useEffect(() => {
    if (!courseId || !studentId) return;
    api
      .get(`/courses/${courseId}/dashboard/students/${studentId}`)
      .then(({ data }) => {
        setData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [courseId, studentId]);

  if (loading) {
    return (
      <AppShell>
        <div className="loading-spinner" style={{ marginTop: 120 }}>
          학생 데이터를 불러오는 중...
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <div className="empty" style={{ marginTop: 120 }}>
          학생 정보를 찾을 수 없���니다.
        </div>
      </AppShell>
    );
  }

  const scores = data.submissions
    .filter((s) => getScore(s) != null)
    .map((s, i) => ({
      name: s.assignments?.title || `제출 ${i + 1}`,
      점수: getScore(s),
    }));

  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + (s.점수 || 0), 0) / scores.length)
      : 0;

  const noteScores = data.notes.filter((n) => n.understanding_score != null);
  const avgUnderstanding =
    noteScores.length > 0
      ? Math.round(
          noteScores.reduce((sum, n) => sum + (n.understanding_score || 0), 0) /
            noteScores.length
        )
      : 0;

  const subProblemIdx = selectedSub?.problem_index ?? 0;
  const starterCode = selectedSub?.assignments?.problems?.[subProblemIdx]?.starter_code || "";

  // Find paste logs scoped to this specific submission attempt's time window
  const subPasteLogs = (() => {
    if (!selectedSub) return [];
    const allLogs = (data.paste_logs || []).filter(
      (p) => p.assignment_id === selectedSub.assignment_id && p.problem_index === subProblemIdx
    );
    // Find all submissions for the same assignment+problem, sorted by time
    const siblingSubs = data.submissions
      .filter((s) => s.assignment_id === selectedSub.assignment_id && (s.problem_index ?? 0) === subProblemIdx)
      .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
    const myIndex = siblingSubs.findIndex((s) => s.id === selectedSub.id);
    const prevTime = myIndex > 0 ? new Date(siblingSubs[myIndex - 1].submitted_at).getTime() : 0;
    const myTime = new Date(selectedSub.submitted_at).getTime();
    // Only paste logs between previous submission and this submission
    return allLogs.filter((p) => {
      const t = new Date(p.timestamp).getTime();
      return t > prevTime && t <= myTime;
    });
  })();

  const pastedLines = (() => {
    const lines = new Set<string>();
    for (const log of subPasteLogs) {
      if (!log.content) continue;
      for (const line of log.content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed) lines.add(trimmed);
      }
    }
    return lines;
  })();

  const diffLines = selectedSub && starterCode
    ? computeDiff(starterCode, selectedSub.code, pastedLines)
    : null;
  const analysis = selectedSub ? getAnalysis(selectedSub) : null;

  return (
    <AppShell>
      <main className="content">
        <button
          className="btn btn-ghost"
          onClick={() => navigate(`/courses/${courseId}/dashboard`)}
          style={{ marginBottom: 16 }}
        >
          &larr; 대시보드로 돌아가기
        </button>

        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              className="topnav-avatar"
              style={{ width: 56, height: 56, fontSize: 24 }}
            >
              {data.student.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div>
              <h1 className="page-title" style={{ marginBottom: 4 }}>
                {data.student.name}
              </h1>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-light)",
                  margin: 0,
                }}
              >
                {data.student.email}
              </p>
            </div>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">평균 코드 점수</div>
            <div className="stat-value">{avgScore}%</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">평균 이해도</div>
            <div className="stat-value">{avgUnderstanding}%</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">제출 횟수</div>
            <div className="stat-value">{data.submissions.length}회</div>
          </div>
          <div className="stat-card stat-warning">
            <div className="stat-label">외부 복붙</div>
            <div className="stat-value">{data.paste_count}회</div>
          </div>
        </div>

        {scores.length > 0 && (
          <div className="card" style={{ marginTop: 24 }}>
            <h2 className="section-title">점수 추이</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={scores}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eaebf2" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "#515F74" }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12, fill: "#515F74" }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "none",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Line
                  type="monotone"
                  dataKey="점수"
                  stroke="#004AC6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Submissions grouped by assignment → problem */}
        <div style={{ marginTop: 24 }}>
          <h2 className="section-title">제출 내역</h2>
          {data.submissions.length === 0 ? (
            <div className="card"><div className="empty">아직 제출한 과제가 없습니다.</div></div>
          ) : (
            (() => {
              // Group: assignment → problem → submissions
              const grouped = new Map<string, { title: string; problems: Map<number, SubmissionItem[]>; allProblems?: { title?: string }[] }>();
              for (const s of data.submissions) {
                const key = s.assignment_id;
                if (!grouped.has(key)) {
                  grouped.set(key, {
                    title: s.assignments?.title || "과제",
                    problems: new Map(),
                    allProblems: s.assignments?.problems,
                  });
                }
                const g = grouped.get(key)!;
                const pIdx = s.problem_index ?? 0;
                if (!g.problems.has(pIdx)) g.problems.set(pIdx, []);
                g.problems.get(pIdx)!.push(s);
              }
              let assignmentIdx = 0;
              return Array.from(grouped.entries()).map(([aId, group]) => {
                assignmentIdx++;
                const aExpanded = expandedAssignment === aId;
                const pasteCountForAssignment = (data.paste_logs || []).filter(
                  (p) => p.assignment_id === aId
                ).length;
                const totalSubs = Array.from(group.problems.values()).reduce((s, arr) => s + arr.length, 0);

                // Best score across all problems (latest per problem)
                const bestScores = Array.from(group.problems.values()).map((subs) => {
                  const last = subs[subs.length - 1];
                  return last ? getScore(last) : null;
                }).filter((s): s is number => s != null);
                const avgAssignmentScore = bestScores.length
                  ? Math.round(bestScores.reduce((a, b) => a + b, 0) / bestScores.length)
                  : null;

                return (
                  <div key={aId} className="card" style={{
                    marginBottom: 12, padding: 0, overflow: "hidden",
                    transition: "box-shadow 0.2s",
                    ...(aExpanded ? { boxShadow: "0 2px 12px rgba(0,0,0,0.06)" } : {}),
                  }}>
                    {/* Assignment header */}
                    <div
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "16px 20px", cursor: "pointer", userSelect: "none",
                      }}
                      onClick={() => setExpandedAssignment(aExpanded ? null : aId)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 28, height: 28, borderRadius: 8,
                          background: "var(--primary-light)", color: "var(--primary)",
                          fontSize: 13, fontWeight: 700, fontFamily: "var(--font-code)",
                          flexShrink: 0,
                        }}>{assignmentIdx}</span>
                        <div>
                          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>{group.title}</h3>
                          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                            <span style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>
                              {group.problems.size}문제
                            </span>
                            <span style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>
                              {totalSubs}회 제출
                            </span>
                            {avgAssignmentScore != null && (
                              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)" }}>
                                평균 {avgAssignmentScore}점
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {pasteCountForAssignment > 0 && (
                          <span className="badge" style={{ background: "var(--tertiary-light)", color: "var(--tertiary)", fontSize: 11 }}>
                            복붙 {pasteCountForAssignment}
                          </span>
                        )}
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 28, height: 28, borderRadius: 8,
                          fontSize: 12, transition: "transform 0.25s ease, background 0.15s",
                          transform: aExpanded ? "rotate(180deg)" : "rotate(0deg)",
                          color: "var(--on-surface-variant)",
                          background: aExpanded ? "var(--surface-container)" : "transparent",
                        }}>
                          &#9660;
                        </span>
                      </div>
                    </div>

                    {/* Problems */}
                    {aExpanded && (
                      <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                        {Array.from(group.problems.entries())
                          .sort(([a], [b]) => a - b)
                          .map(([pIdx, subs]) => {
                            const problemKey = `${aId}-${pIdx}`;
                            const pExpanded = expandedProblem === problemKey;
                            const problemTitle = group.allProblems?.[pIdx]?.title || `문제 ${pIdx + 1}`;
                            const allLogsForProblem = (data.paste_logs || []).filter(
                              (p) => p.assignment_id === aId && p.problem_index === pIdx
                            );
                            const pasteCountPerSub = subs.map((s, idx) => {
                              const prevTime = idx > 0 ? new Date(subs[idx - 1].submitted_at).getTime() : 0;
                              const myTime = new Date(s.submitted_at).getTime();
                              return allLogsForProblem.filter((p) => {
                                const t = new Date(p.timestamp).getTime();
                                return t > prevTime && t <= myTime;
                              }).length;
                            });
                            const totalPastes = pasteCountPerSub.reduce((a, b) => a + b, 0);
                            const latestScore = subs.length > 0 ? getScore(subs[subs.length - 1]) : null;

                            return (
                              <div key={pIdx} style={{
                                borderRadius: 10, overflow: "hidden",
                                background: pExpanded ? "var(--surface-container-low)" : "var(--surface-container-low)",
                              }}>
                                {/* Problem header */}
                                <div
                                  style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    padding: "12px 16px", cursor: "pointer", userSelect: "none",
                                  }}
                                  onClick={() => setExpandedProblem(pExpanded ? null : problemKey)}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <span style={{
                                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                                      width: 22, height: 22, borderRadius: 6,
                                      background: "var(--primary-light)", color: "var(--primary)",
                                      fontSize: 11, fontWeight: 700, fontFamily: "var(--font-code)",
                                      flexShrink: 0,
                                    }}>{pIdx + 1}</span>
                                    <span style={{ fontSize: 13, fontWeight: 600 }}>{problemTitle}</span>
                                  </div>
                                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    {latestScore != null && (
                                      <span style={{
                                        fontSize: 13, fontWeight: 700, color: "var(--primary)",
                                        background: "var(--primary-light)", padding: "2px 8px", borderRadius: 6,
                                      }}>
                                        {latestScore}점
                                      </span>
                                    )}
                                    <span style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>{subs.length}차</span>
                                    {totalPastes > 0 && (
                                      <span style={{
                                        fontSize: 11, fontWeight: 600, color: "var(--tertiary)",
                                        background: "var(--tertiary-light)", padding: "2px 7px", borderRadius: 6,
                                      }}>
                                        복붙 {totalPastes}
                                      </span>
                                    )}
                                    <span style={{
                                      fontSize: 10, transition: "transform 0.2s ease",
                                      transform: pExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                      color: "var(--on-surface-variant)",
                                    }}>&#9660;</span>
                                  </div>
                                </div>

                                {/* Submissions */}
                                {pExpanded && (
                                  <div style={{ padding: "0 16px 12px" }}>
                                    {subs.map((s, idx) => (
                                      <div key={s.id} style={{
                                        display: "flex", alignItems: "center", justifyContent: "space-between",
                                        padding: "10px 0",
                                        ...(idx > 0 ? { borderTop: "1px solid var(--outline-variant)" } : {}),
                                      }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                          <span style={{
                                            fontSize: 12, fontWeight: 700, color: "var(--on-surface-variant)",
                                            background: "var(--surface-container)", padding: "2px 10px", borderRadius: 6,
                                          }}>
                                            {idx + 1}차
                                          </span>
                                          {getScore(s) != null ? (
                                            <span style={{ fontWeight: 600, color: "var(--primary)", fontSize: 14 }}>
                                              {getScore(s)}점
                                            </span>
                                          ) : (
                                            <span className="badge" style={{ fontSize: 11 }}>
                                              {s.status === "completed" ? "완료" : s.status === "analyzing" ? "분석 중" : "제출됨"}
                                            </span>
                                          )}
                                          {pasteCountPerSub[idx] > 0 && (
                                            <span style={{
                                              fontSize: 10, fontWeight: 600, color: "var(--tertiary)",
                                              background: "var(--tertiary-light)", padding: "2px 7px", borderRadius: 6,
                                            }}>
                                              복붙 {pasteCountPerSub[idx]}
                                            </span>
                                          )}
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                          <span style={{ fontSize: 12, color: "var(--secondary)" }}>
                                            {new Date(s.submitted_at).toLocaleDateString("ko-KR", {
                                              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                                            })}
                                          </span>
                                          <button
                                            className="btn btn-ghost"
                                            style={{ fontSize: 12, padding: "4px 12px" }}
                                            onClick={(e) => { e.stopPropagation(); setSelectedSub(s); setSelectedNote(null); setViewMode("code"); }}
                                          >
                                            코드 보기
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              });
            })()
          )}
        </div>

        {/* Notes — hierarchical tree */}
        <div className="card" style={{ marginTop: 24 }}>
          <h2 className="section-title">노트</h2>
          {data.notes.length === 0 ? (
            <div className="empty">아직 작성한 노트가 없습니다.</div>
          ) : (() => {
            const { roots, childrenMap } = noteTree;

            const renderNote = (note: NoteItem, depth: number): React.ReactNode => {
              const children = childrenMap.get(note.id) || [];
              const hasChildren = children.length > 0;
              const isExpanded = expandedNotes.has(note.id);
              return (
                <div key={note.id}>
                  <div
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 12px", paddingLeft: 12 + depth * 24,
                      borderBottom: "1px solid var(--outline-variant)",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-container-high)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Expand toggle */}
                    {hasChildren ? (
                      <span
                        onClick={() => setExpandedNotes((prev) => {
                          const next = new Set(prev);
                          if (next.has(note.id)) next.delete(note.id); else next.add(note.id);
                          return next;
                        })}
                        style={{
                          cursor: "pointer", fontSize: 12, color: "var(--on-surface-variant)",
                          display: "inline-block", transition: "transform 0.2s", width: 16, textAlign: "center",
                          transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                        }}
                      >&#9654;</span>
                    ) : (
                      <span style={{ width: 16 }} />
                    )}
                    <span style={{ fontWeight: depth === 0 ? 700 : 500, fontSize: depth === 0 ? 14 : 13, flex: 1 }}>
                      {note.title}
                      {hasChildren && (
                        <span style={{ fontSize: 11, color: "var(--on-surface-variant)", marginLeft: 6 }}>
                          ({children.length})
                        </span>
                      )}
                    </span>
                    {note.understanding_score != null ? (
                      <span style={{ fontWeight: 600, fontSize: 13, color: "var(--primary)", minWidth: 40, textAlign: "right" }}>
                        {note.understanding_score}%
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--on-surface-variant)", minWidth: 40, textAlign: "right" }}>-</span>
                    )}
                    <span style={{ fontSize: 12, color: "var(--on-surface-variant)", minWidth: 70 }}>
                      {new Date(note.updated_at).toLocaleDateString("ko-KR")}
                    </span>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: 12, padding: "2px 8px" }}
                      onClick={() => { setSelectedNote(note); setSelectedSub(null); }}
                    >
                      보기
                    </button>
                  </div>
                  {hasChildren && isExpanded && children.map((c) => renderNote(c, depth + 1))}
                </div>
              );
            };

            return (
              <div style={{ borderTop: "1px solid var(--outline-variant)" }}>
                {roots.map((n) => renderNote(n, 0))}
              </div>
            );
          })()}
        </div>

        {/* Code Detail Panel */}
        {selectedSub && (
          <div className="detail-overlay" onClick={() => setSelectedSub(null)}>
            <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
              <div className="detail-panel-header">
                <div className="detail-panel-title-row">
                  <button className="btn btn-ghost" onClick={() => setSelectedSub(null)}>
                    &larr;
                  </button>
                  <h2>{selectedSub.assignments?.title || "제출 코드"}</h2>
                  {analysis?.score != null && (
                    <span className="detail-score-badge">{analysis.score}점</span>
                  )}
                </div>
                <div className="detail-tabs">
                  <button
                    className={`detail-tab ${viewMode === "code" ? "active" : ""}`}
                    onClick={() => setViewMode("code")}
                  >
                    전체 코드
                  </button>
                  {starterCode && (
                    <button
                      className={`detail-tab ${viewMode === "diff" ? "active" : ""}`}
                      onClick={() => setViewMode("diff")}
                    >
                      변경 사항
                    </button>
                  )}
                  {subPasteLogs.length > 0 && (
                    <button
                      className={`detail-tab ${viewMode === "paste" ? "active" : ""}`}
                      onClick={() => setViewMode("paste")}
                    >
                      복붙 기록 ({subPasteLogs.length})
                    </button>
                  )}
                </div>
              </div>

              <div className="detail-panel-body">
                <div className="detail-panel-left">
                  {viewMode === "code" ? (
                    <pre className="detail-code">
                      {selectedSub.code.split("\n").map((line, i) => {
                        const pasted = pastedLines.has(line.trim()) && line.trim() !== "";
                        return (
                          <div key={i} className={`code-line${pasted ? " code-line-paste" : ""}`}>
                            <span className="code-line-num">{i + 1}</span>
                            <span className="code-line-text">{line}</span>
                            {pasted && <span className="diff-paste-badge">복붙</span>}
                          </div>
                        );
                      })}
                    </pre>
                  ) : viewMode === "paste" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 8 }}>
                      {subPasteLogs.map((log, idx) => (
                        <div key={log.id} style={{
                          background: "rgba(99, 46, 205, 0.06)",
                          borderRadius: 12,
                          padding: 16,
                          borderLeft: "3px solid var(--tertiary)",
                        }}>
                          <div style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            marginBottom: 10,
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span className="diff-paste-badge">복붙 #{idx + 1}</span>
                              <span style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>
                                문제 {log.problem_index + 1}
                              </span>
                            </div>
                            <span style={{ fontSize: 12, color: "var(--secondary)" }}>
                              {new Date(log.timestamp).toLocaleDateString("ko-KR", {
                                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
                              })}
                            </span>
                          </div>
                          <pre className="detail-code" style={{ margin: 0, maxHeight: 300, overflow: "auto" }}>
                            {log.content ? log.content.split("\n").map((line, i) => (
                              <div key={i} className="code-line code-line-paste">
                                <span className="code-line-num">{i + 1}</span>
                                <span className="code-line-text">{line}</span>
                              </div>
                            )) : (
                              <div className="empty" style={{ padding: 16 }}>내용 없음</div>
                            )}
                          </pre>
                        </div>
                      ))}
                    </div>
                  ) : diffLines ? (
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
                    <div className="empty" style={{ padding: 40 }}>
                      기본 코드가 없어 비교할 수 없습니다.
                    </div>
                  )}
                </div>

                <div className="detail-panel-right">
                  {analysis?.feedback ? (
                    <div className="detail-feedback-full">
                      <h3>AI 피드백</h3>
                      <div
                        className="detail-feedback-body rendered-markdown"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(analysis.feedback) }}
                      />
                    </div>
                  ) : (
                    <div className="empty" style={{ padding: 40 }}>
                      AI 피드백이 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Note Detail Panel */}
        {selectedNote && (
          <div className="detail-overlay" onClick={() => setSelectedNote(null)}>
            <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
              <div className="detail-panel-header">
                <div className="detail-panel-title-row">
                  <button className="btn btn-ghost" onClick={() => setSelectedNote(null)}>
                    &larr;
                  </button>
                  <h2>{selectedNote.title}</h2>
                  {selectedNote.understanding_score != null && (
                    <span className="detail-score-badge">
                      이해도 {selectedNote.understanding_score}%
                    </span>
                  )}
                </div>
              </div>

              <div className="detail-panel-body">
                <div className="detail-panel-left">
                  <div className="detail-note-body rendered-markdown">
                    {selectedNote.content ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: tiptapToHtml(selectedNote.content as Record<string, unknown>),
                        }}
                      />
                    ) : (
                      <div className="empty">노트 내용이 없습니다.</div>
                    )}
                  </div>
                </div>

                <div className="detail-panel-right">
                  {selectedNote.gap_analysis ? (
                    <div className="detail-feedback-full">
                      <h3>갭 분석</h3>
                      <div
                        className="detail-feedback-body rendered-markdown"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(formatGapAnalysis(selectedNote.gap_analysis)) }}
                      />
                    </div>
                  ) : (
                    <div className="empty" style={{ padding: 40 }}>
                      갭 분석 결과가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
