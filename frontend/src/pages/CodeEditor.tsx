import { useEffect, useState, useRef, useCallback, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { renderMarkdown } from "../lib/markdown";
import api from "../lib/api";
import { toast } from "../lib/toast";
import { customConfirm } from "../lib/confirm";

const BlockEditorLazy = lazy(() => import("../components/BlockEditor"));
import DeadlineTimer from "../components/DeadlineTimer";
import { supabase } from "../lib/supabase";
import { getAdminToken } from "../store/authStore";
import { useExamMode } from "../lib/useExamMode";
import { useTeamVote } from "../lib/useTeamVote";
import TeamVotePanel from "../components/TeamVotePanel";
import type { Assignment } from "../types";


async function getAuthHeaders(): Promise<Record<string, string>> {
  const adminToken = getAdminToken() || sessionStorage.getItem("admin_token");
  if (adminToken) {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    };
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    };
  }
  return { "Content-Type": "application/json" };
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8001/api";

/** Map our language IDs to Monaco editor language IDs */
const MONACO_LANG: Record<string, string> = {
  python: "python", c: "c", cpp: "cpp", java: "java",
  javascript: "javascript", csharp: "csharp",
  rust: "rust", go: "go", asm: "plaintext",
};

/** Display names for language badges */
const LANG_LABEL: Record<string, string> = {
  python: "Python", c: "C", cpp: "C++", java: "Java",
  javascript: "JavaScript", csharp: "C#",
  rust: "Rust", go: "Go", asm: "ASM",
};

function stripScoreLine(text: string): string {
  return text.replace(/🤖\s*피카버디의 추천 점수는.*?점이에요!?\s*\n?/g, "")
    .replace(/📊\s*점수[:\s]*\d+.*?\n?/g, "");
}

function formatAnalysis(a: Record<string, unknown>, hideScore = false): string {
  // New format: feedback contains the full readable text
  if (a.feedback && typeof a.feedback === "string" && (a.feedback as string).length > 50) {
    return hideScore ? stripScoreLine(a.feedback as string) : (a.feedback as string);
  }
  // Legacy format: structured fields
  const parts: string[] = [];
  if (!hideScore && a.score !== undefined) parts.push(`📊 점수: ${a.score}점 / 100점`);
  if (a.feedback) parts.push(`\n📝 종합 피드백\n${a.feedback}`);
  if (a.logic_analysis) parts.push(`\n🔍 로직 분석\n${a.logic_analysis}`);
  if (a.quality_analysis) parts.push(`\n✨ 코드 품질\n${a.quality_analysis}`);
  if (a.suggestions && Array.isArray(a.suggestions) && a.suggestions.length > 0) {
    parts.push(`\n💡 개선 제안\n${(a.suggestions as string[]).map((s, i) => `${i + 1}. ${s}`).join("\n")}`);
  }
  return parts.join("\n") || String(a.feedback || "");
}

export default function CodeEditor() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [code, setCode] = useState("");
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "ai"; content: string }[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [pasteSet, setPasteSet] = useState<Set<string>>(new Set());
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [running, setRunning] = useState(false);
  const [runOutput, setRunOutput] = useState<{ success: boolean; output: string; error: string } | null>(null);
  const [stdinInput, setStdinInput] = useState("");
  const [judging, setJudging] = useState(false);
  const [judgeResult, setJudgeResult] = useState<{
    verdict: string; passed: number; total: number;
    results: { index: number; verdict: string; time_ms: number; is_hidden: boolean; output?: string; error?: string }[];
    total_time_ms: number; max_memory_mb: number;
  } | null>(null);
  const [runTab, setRunTab] = useState<"output" | "judge">("output");
  const [editorMode, setEditorMode] = useState<"code" | "block">("code");
  const [problemIdx, setProblemIdx] = useState(0);
  const problemIdxRef = useRef(0);
  const codeLoadedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<unknown>(null);
  const codeMapRef = useRef<Record<number, string>>({});
  const pasteFlag = useRef(false);
  const lastInternalCopyRef = useRef("");
  const logPasteRef = useRef<(text: string, pIdx: number) => void>(() => {});
  const navigate = useNavigate();

  const { isTeamAssignment, voteStatus, loading: voteLoading, initiateVote, castVote } = useTeamVote(
    assignmentId,
    assignment?.is_team_assignment ?? false,
  );

  // 시험 모드
  const examMode = useExamMode({
    assignmentId: assignmentId || "",
    enabled: !!(assignment?.exam_mode),
  });
  const [examStarted, setExamStarted] = useState(false);

  // Count only pastes whose content still exists in current code
  const activePastes = Array.from(pasteSet).filter((p) =>
    p.split("\n").some((line) => line.trim().length > 3 && code.includes(line.trim()))
  );
  const pasteCount = activePastes.length;
  const codeCharCount = code.replace(/\s/g, "").length;
  const pasteCharCount = activePastes.reduce((sum, p) => sum + p.replace(/\s/g, "").length, 0);
  const pastePercent = codeCharCount > 0 ? Math.min(100, Math.round((pasteCharCount / codeCharCount) * 100)) : 0;

  // Keep ref in sync so mount-time callbacks get the latest value
  useEffect(() => { problemIdxRef.current = problemIdx; }, [problemIdx]);

  useEffect(() => {
    if (!assignmentId) return;
    let assignmentData: Assignment | null = null;

    // Load assignment, then snapshots, then restore per-problem code
    api.get(`/assignments/${assignmentId}`).then(({ data }) => {
      assignmentData = data;
      setAssignment(data);

      // Pre-fill codeMap with starter_code for each problem
      const problems = data.problems || [];
      for (let i = 0; i < problems.length; i++) {
        if (problems[i]?.starter_code && !codeMapRef.current[i]) {
          codeMapRef.current[i] = problems[i].starter_code;
        }
      }

      return api.get(`/assignments/${assignmentId}/snapshots`);
    }).then(({ data: snapshots }) => {
      // Restore latest snapshot per problem_index
      if (snapshots && snapshots.length > 0) {
        for (const snap of snapshots) {
          const pIdx = snap.code_diff?.problem_index ?? 0;
          const savedCode = snap.code_diff?.code;
          if (savedCode) {
            codeMapRef.current[pIdx] = savedCode;
          }
        }
        codeLoadedRef.current = true;
        setLastSaved("이전 코드 복원됨");
      }

      // Set current problem's code
      if (codeMapRef.current[problemIdx] !== undefined) {
        setCode(codeMapRef.current[problemIdx]);
      } else if (assignmentData?.problems?.[problemIdx]?.starter_code) {
        setCode(assignmentData.problems[problemIdx].starter_code);
      }
    }).catch(() => {});

    // Load previous submission + AI feedback
    api.get(`/assignments/${assignmentId}/my-submission`).then(({ data }) => {
      if (data) {
        const pIdx = data.problem_index ?? 0;
        if (data.code && !codeLoadedRef.current) {
          codeMapRef.current[pIdx] = data.code;
          if (pIdx === problemIdx) setCode(data.code);
          codeLoadedRef.current = true;
        }
        const analysis = Array.isArray(data.ai_analyses)
          ? data.ai_analyses[0]
          : data.ai_analyses;
        if (analysis) {
          setFeedback(formatAnalysis(analysis));
        }
      }
    }).catch(() => {});
  }, [assignmentId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const saveSnapshot = useCallback(
    async (currentCode: string, pIdx: number) => {
      if (!assignmentId) return;
      try {
        await api.post(`/assignments/${assignmentId}/snapshots`, {
          code: currentCode,
          timestamp: new Date().toISOString(),
          problem_index: pIdx,
        });
        setLastSaved(new Date().toLocaleTimeString());
      } catch {
        /* snapshot failure ignored */
      }
    },
    [assignmentId]
  );

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || "";
    setCode(newCode);
    codeMapRef.current[problemIdx] = newCode;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveSnapshot(newCode, problemIdx), 2500);
  };

  const logPaste = useCallback(async (pastedText: string, pIdx: number) => {
    if (!assignmentId) return;
    setPasteSet((prev) => new Set(prev).add(pastedText));
    try {
      await api.post(`/assignments/${assignmentId}/paste-log`, {
        content: pastedText,
        paste_source: "external",
        timestamp: new Date().toISOString(),
        problem_index: pIdx,
      });
    } catch {
      /* logging failure ignored */
    }
  }, [assignmentId]);

  // Keep logPaste ref in sync so editor callbacks always use latest
  useEffect(() => { logPasteRef.current = logPaste; }, [logPaste]);

  const handleEditorMount = useCallback((editor: unknown) => {
    editorRef.current = editor;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const monacoEditor = editor as any;

    // Track internal copy/cut to distinguish from external paste
    const domNode = monacoEditor.getDomNode() as HTMLElement | null;
    if (domNode) {
      const textarea = domNode.querySelector("textarea.inputarea");
      const target = textarea || domNode;

      const trackCopy = () => {
        const model = monacoEditor.getModel();
        const sel = monacoEditor.getSelection();
        if (model && sel) {
          lastInternalCopyRef.current = model.getValueInRange(sel);
        }
      };
      target.addEventListener("copy", trackCopy, true);
      target.addEventListener("cut", trackCopy, true);
      target.addEventListener("paste", () => { pasteFlag.current = true; }, true);
    }

    // onDidChangeModelContent fires after paste content is inserted
    monacoEditor.onDidChangeModelContent((e: { changes: { text: string }[] }) => {
      if (pasteFlag.current) {
        pasteFlag.current = false;
        const pastedText = e.changes.map((c: { text: string }) => c.text).join("");
        if (!pastedText.trim()) return;
        // Skip if this is an internal copy-paste
        if (pastedText === lastInternalCopyRef.current) return;
        logPasteRef.current(pastedText, problemIdxRef.current);
      }
    });

    // Fallback: onDidPaste in case DOM approach misses
    if (typeof monacoEditor.onDidPaste === "function") {
      monacoEditor.onDidPaste((e: { range: { startLineNumber: number; endLineNumber: number; startColumn: number; endColumn: number } }) => {
        if (pasteFlag.current) return; // DOM handler already processed
        const model = monacoEditor.getModel();
        if (!model) return;
        const text = model.getValueInRange(e.range);
        if (!text || !text.trim()) return;
        if (text === lastInternalCopyRef.current) return; // internal
        logPasteRef.current(text, problemIdxRef.current);
      });
    }
  }, []);

  const handleRun = async () => {
    if (running) return;
    setRunning(true);
    setRunOutput(null);
    const lang = assignment?.language || "python";
    try {
      const { data } = await api.post("/code/run", {
        code,
        language: lang,
        stdin: stdinInput,
      });
      setRunOutput(data);
    } catch {
      setRunOutput({ success: false, output: "", error: "실행 요청 실패" });
    } finally {
      setRunning(false);
    }
  };

  const currentProblem = assignment?.problems?.[problemIdx] as Record<string, unknown> | undefined;
  const problemFormat = (currentProblem?.format as string) || "regular";
  const isAlgorithm = problemFormat === "baekjoon" || problemFormat === "programmers" || assignment?.type === "algorithm";
  const isBlockProblem = problemFormat === "block";
  const showBlockToggle = isBlockProblem || (assignment?.language === "python" || assignment?.language === "javascript");

  // Auto-switch to block mode for block problems
  useEffect(() => {
    if (isBlockProblem) setEditorMode("block");
  }, [isBlockProblem]);

  const handleJudge = async () => {
    if (judging || !currentProblem) return;
    setJudging(true);
    setJudgeResult(null);
    setRunTab("judge");
    const testCases = (currentProblem.test_cases as { input: string; expected_output: string; is_hidden: boolean }[]) || [];
    const examples = (currentProblem.examples as { input: string; output: string }[]) || [];
    // 예제도 테스트케이스로 포함 (공개)
    const allCases = [
      ...examples.map((e) => ({ input: e.input, expected_output: e.output, is_hidden: false })),
      ...testCases,
    ];
    try {
      const { data } = await api.post("/code/judge", {
        code,
        language: assignment?.language || "python",
        test_cases: allCases,
        time_limit_ms: (currentProblem.time_limit_ms as number) || 1000,
        memory_limit_mb: (currentProblem.memory_limit_mb as number) || 256,
      });
      setJudgeResult(data);
    } catch {
      setJudgeResult({ verdict: "RE", passed: 0, total: allCases.length, results: [], total_time_ms: 0, max_memory_mb: 0 });
    } finally {
      setJudging(false);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!assignmentId || submitting) return;
    setSubmitting(true);
    setFeedback("");

    try {
      const { data: submission } = await api.post(
        `/assignments/${assignmentId}/submit`,
        { code, problem_index: problemIdx }
      );

      if (!submission?.id) {
        setFeedback("제출 실패: 서버 응답이 올바르지 않습니다.");
        setSubmitting(false);
        return;
      }

      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_BASE}/submissions/${submission.id}/feedback-stream`,
        { headers }
      );

      if (!response.ok) {
        setFeedback(`제출 후 피드백 요청 실패 (${response.status})`);
        setSubmitting(false);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = "";
        const processLine = (line: string) => {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "chunk") {
                setFeedback((prev) => prev + data.text);
              } else if (data.type === "error") {
                setFeedback((prev) => prev || `오류: ${data.text}`);
              }
            } catch { /* SSE parse error */ }
          }
        };
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (buffer.trim()) processLine(buffer);
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) processLine(line);
        }
      }
    } catch (err) {
      setFeedback((prev) => prev || "제출 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }, [assignmentId, submitting, code, problemIdx]);

  const handleTutorChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatInput("");

    let aiText = "";
    setChatMessages((prev) => [...prev, { role: "ai", content: "..." }]);

    // 현재 문제 정보 추출 (AI가 문제 맥락을 이해할 수 있도록)
    const currentProblem = assignment?.problems?.[problemIdx];
    const problem_context = currentProblem
      ? {
          title: currentProblem.title,
          description: currentProblem.description,
          expected_output: currentProblem.expected_output ?? "",
          hints: currentProblem.hints ?? [],
        }
      : null;
    const starter_code = currentProblem?.starter_code ?? "";

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_BASE}/tutor/chat`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            message: userMsg,
            assignment_id: assignmentId,
            starter_code,
            code_context: code,
            history: chatMessages,
            problem_context,
          }),
        }
      );

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          const lines = text.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "chunk") {
                  aiText += data.text;
                  setChatMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      role: "ai",
                      content: aiText,
                    };
                    return updated;
                  });
                }
              } catch {
                /* parse error */
              }
            }
          }
        }
      }
    } catch {
      /* tutor error */
    }
  };

  // 키보드 단축키: Ctrl+S (저장), Ctrl+Enter (제출)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveSnapshot(code, problemIdx);
      }
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [code, problemIdx, saveSnapshot, handleSubmit]);

  const policyLabels: Record<string, string> = {
    free: "자유",
    normal: "보통",
    strict: "엄격",
    exam: "시험",
  };

  const isOverdue = assignment?.due_date && new Date(assignment.due_date) < new Date();

  // 시험 모드: 시작 전 오버레이
  if (assignment?.exam_mode && !examStarted && !examMode.examEnded) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          maxWidth: 500, padding: 40, borderRadius: 16,
          background: "var(--surface-container)", textAlign: "center",
        }}>
          <h2 style={{ fontSize: 24, marginBottom: 16, color: "var(--on-surface)" }}>시험 모드</h2>
          <p style={{ color: "var(--on-surface-variant)", lineHeight: 1.8, marginBottom: 8 }}>
            이 과제는 <strong>시험 모드</strong>로 설정되어 있습니다.
          </p>
          <ul style={{ textAlign: "left", color: "var(--on-surface-variant)", lineHeight: 2, marginBottom: 24, paddingLeft: 20 }}>
            <li>시험 중 <strong>전체화면</strong>이 유지됩니다</li>
            <li>주기적으로 <strong>화면이 캡쳐</strong>됩니다</li>
            <li>화면 이탈 시 <strong>경고</strong>가 누적됩니다</li>
            <li><strong>{examMode.config?.max_violations || 3}회</strong> 이탈 시 시험이 <strong>자동 종료</strong>됩니다</li>
          </ul>
          <p style={{ color: "var(--on-surface-variant)", fontSize: 13, marginBottom: 24 }}>
            "시험 시작"을 누르면 화면 공유 권한을 요청합니다.
          </p>
          <button
            className="btn btn-primary"
            style={{ padding: "12px 40px", fontSize: 16 }}
            onClick={async () => {
              const ok = await examMode.startExam();
              if (ok) setExamStarted(true);
              else toast.warning("화면 공유를 허용해야 시험을 시작할 수 있습니다.");
            }}
          >
            시험 시작
          </button>
        </div>
      </div>
    );
  }

  // 시험 모드: 종료됨
  if (examMode.examEnded) {
    const isSuccess = examMode.manualEnd;
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          maxWidth: 450, padding: 40, borderRadius: 16,
          background: isSuccess ? "var(--primary-container, var(--surface-container))" : "var(--error-container)",
          textAlign: "center",
        }}>
          <h2 style={{ fontSize: 24, marginBottom: 16, color: isSuccess ? "var(--on-surface)" : "var(--on-error-container)" }}>
            {examMode.alreadyEnded ? "재입장 불가" : isSuccess ? "시험이 정상 종료되었습니다" : "시험이 종료되었습니다"}
          </h2>
          <p style={{ color: isSuccess ? "var(--on-surface-variant)" : "var(--on-error-container)", lineHeight: 1.8, marginBottom: 24 }}>
            {examMode.alreadyEnded
              ? "이미 종료된 시험입니다. 시험을 나간 후에는 다시 입장할 수 없습니다."
              : isSuccess
              ? <>시험이 무사히 종료되었습니다.<br/>작성한 코드는 자동 저장되었습니다.</>
              : <>화면 이탈 횟수 초과로 시험이 자동 종료되었습니다.<br/>현재까지 작성한 코드는 자동 저장되었습니다.</>
            }
          </p>
          <button className="btn" onClick={() => navigate(-1)} style={{ padding: "10px 30px" }}>
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-page">
      {/* 시험 모드 경고 배너 — topbar 위에 표시 */}
      {examMode.showWarning && (
        <div style={{
          padding: "10px 20px", textAlign: "center", fontWeight: 600,
          background: "var(--error)", color: "var(--on-error)", fontSize: 14,
          animation: "pulse 1s ease-in-out 3", flexShrink: 0,
        }}>
          {examMode.showWarning}
        </div>
      )}

      <header className="editor-topbar">
        <div className="topbar-left">
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>
            &larr;
          </button>
          <span className="editor-topbar-title">
            {assignment?.title || "로딩 중..."}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="badge" style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}>
            {LANG_LABEL[assignment?.language || "python"] || (assignment?.language || "python").toUpperCase()}
          </span>
          <span className="badge badge-policy">
            AI 정책: {policyLabels[assignment?.ai_policy || ""] || "-"}
          </span>
          {isOverdue && (
            <span className="badge" style={{ background: "var(--error)", color: "var(--on-error)", fontWeight: 600 }}>
              마감 지남
            </span>
          )}
          {/* 시험 모드 상태 + 끝내기 */}
          {assignment?.exam_mode && examStarted && (
            <>
              <div style={{
                padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: "rgba(220,38,38,0.15)", color: "#fca5a5",
              }}>
                🔴 이탈 {examMode.violations}/{examMode.config?.max_violations || 3}
              </div>
              <button
                onClick={() => {
                  customConfirm("시험을 종료하시겠습니까? 종료 후에는 다시 입장할 수 없습니다.", { danger: true, confirmText: "종료" }).then((ok) => {
                    if (ok) examMode.endExam("학생이 직접 종료", true);
                  });
                }}
                style={{
                  padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: "var(--error)", color: "var(--on-error)",
                  border: "none", cursor: "pointer",
                }}
              >
                시험 끝내기
              </button>
            </>
          )}
        </div>
      </header>

      <div className="editor-layout">
        <div className="editor-main-wrapper">
          <div className="editor-main">
            {/* Block/Code toggle */}
            {showBlockToggle && (
              <div style={{
                display: "flex", gap: 0, position: "absolute", top: 8, right: 12, zIndex: 10,
              }}>
                <button
                  onClick={() => setEditorMode("code")}
                  style={{
                    padding: "4px 12px", fontSize: 12, fontWeight: 600, border: "1px solid var(--outline-variant)",
                    borderRadius: "6px 0 0 6px", cursor: "pointer",
                    background: editorMode === "code" ? "var(--primary)" : "var(--surface-container)",
                    color: editorMode === "code" ? "#fff" : "var(--on-surface-variant)",
                  }}
                >
                  코드
                </button>
                <button
                  onClick={() => setEditorMode("block")}
                  style={{
                    padding: "4px 12px", fontSize: 12, fontWeight: 600, border: "1px solid var(--outline-variant)",
                    borderLeft: "none", borderRadius: "0 6px 6px 0", cursor: "pointer",
                    background: editorMode === "block" ? "var(--primary)" : "var(--surface-container)",
                    color: editorMode === "block" ? "#fff" : "var(--on-surface-variant)",
                  }}
                >
                  블록
                </button>
              </div>
            )}
            {editorMode === "block" ? (
              <Suspense fallback={<div style={{ padding: 20, color: "#aaa" }}>블록 에디터 로딩 중...</div>}>
                <BlockEditorLazy
                  language={assignment?.language || "python"}
                  onCodeChange={(generated) => {
                    setCode(generated);
                    codeMapRef.current[problemIdx] = generated;
                  }}
                />
              </Suspense>
            ) : (
              <Editor
                height="100%"
                language={MONACO_LANG[assignment?.language || "python"] || "plaintext"}
                theme="vs-dark"
                value={code}
                onChange={handleCodeChange}
                onMount={handleEditorMount}
                options={{
                  fontSize: 14,
                  fontFamily: "JetBrains Mono, Fira Code, monospace",
                  minimap: { enabled: false },
                  automaticLayout: true,
                  padding: { top: 16 },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  cursorBlinking: "smooth",
                  cursorSmoothCaretAnimation: "on",
                  renderLineHighlight: "all",
                }}
              />
            )}
          </div>
          <div className="run-panel" style={editorMode === "block" ? { height: 120, minHeight: 120 } : undefined}>
            <div className="run-panel-header">
              <div className="run-panel-tabs">
                <span className={`run-panel-tab${runTab === "output" ? " active" : ""}`} onClick={() => setRunTab("output")} style={{ cursor: "pointer" }}>출력</span>
                {isAlgorithm && (
                  <span className={`run-panel-tab${runTab === "judge" ? " active" : ""}`} onClick={() => setRunTab("judge")} style={{ cursor: "pointer" }}>채점</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {runTab === "output" && (
                  <>
                    <input
                      className="stdin-input"
                      placeholder="stdin 입력 (선택)"
                      value={stdinInput}
                      onChange={(e) => setStdinInput(e.target.value)}
                    />
                    <button className="btn-run" onClick={handleRun} disabled={running}>
                      {running ? "실행 중..." : "▶ 실행"}
                    </button>
                  </>
                )}
                {runTab === "judge" && isAlgorithm && (
                  <button className="btn-run" onClick={handleJudge} disabled={judging} style={{ background: "#10b981" }}>
                    {judging ? "채점 중..." : "채점하기"}
                  </button>
                )}
              </div>
            </div>
            {runTab === "output" ? (
              <pre className="run-output">
                {running && "실행 중...\n"}
                {runOutput && (
                  <>
                    {runOutput.output}
                    {runOutput.error && (
                      <span className="run-error">{runOutput.error}</span>
                    )}
                    {runOutput.success && !runOutput.output && !runOutput.error && (
                      <span style={{ color: "#6b7280" }}>(출력 없음)</span>
                    )}
                  </>
                )}
                {!running && !runOutput && (
                  <span style={{ color: "#6b7280" }}>코드를 실행하면 여기에 결과가 표시됩니다.</span>
                )}
              </pre>
            ) : (
              <div className="run-output" style={{ overflow: "auto", fontFamily: "var(--font-code)", fontSize: 13 }}>
                {judging && <div style={{ color: "#94a3b8", padding: 8 }}>채점 중...</div>}
                {judgeResult && (
                  <div style={{ padding: 8 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                      <span style={{
                        fontWeight: 700, fontSize: 16,
                        color: judgeResult.verdict === "AC" ? "#10b981" : judgeResult.verdict === "WA" ? "#ef4444" : judgeResult.verdict === "TLE" ? "#f59e0b" : "#94a3b8",
                      }}>
                        {judgeResult.verdict}
                      </span>
                      <span style={{ color: "#94a3b8" }}>
                        {judgeResult.passed}/{judgeResult.total} 통과
                      </span>
                      <span style={{ color: "#94a3b8" }}>
                        {judgeResult.total_time_ms}ms
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {judgeResult.results.map((r, i) => (
                        <div key={i} style={{
                          display: "flex", gap: 8, alignItems: "center", padding: "4px 8px",
                          borderRadius: 6, background: r.verdict === "AC" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                        }}>
                          <span style={{
                            fontWeight: 600, width: 30,
                            color: r.verdict === "AC" ? "#10b981" : r.verdict === "WA" ? "#ef4444" : r.verdict === "TLE" ? "#f59e0b" : "#94a3b8",
                          }}>
                            {r.verdict}
                          </span>
                          <span style={{ color: "#94a3b8", fontSize: 12 }}>
                            #{i + 1} {r.is_hidden ? "(히든)" : ""} — {r.time_ms}ms
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!judging && !judgeResult && (
                  <div style={{ color: "#6b7280", padding: 8 }}>채점하기 버튼을 눌러 테스트케이스를 실행하세요.</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="editor-sidebar">
          <div className="sidebar-section">
            <div className="problem-header">
              <h3>
                문제 {assignment?.problems?.length
                  ? `${problemIdx + 1} / ${assignment.problems.length}`
                  : ""}
              </h3>
              {assignment?.problems && assignment.problems.length > 1 && (
                <div className="problem-nav">
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={problemIdx === 0}
                    onClick={() => {
                      // Save current problem's code
                      codeMapRef.current[problemIdx] = code;
                      const next = problemIdx - 1;
                      setProblemIdx(next);
                      // Restore saved code, or starter_code, or empty
                      const saved = codeMapRef.current[next];
                      setCode(saved !== undefined ? saved : (assignment.problems[next]?.starter_code || ""));
                      setFeedback("");
                    }}
                  >
                    &larr; 이전
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={problemIdx >= assignment.problems.length - 1}
                    onClick={() => {
                      // Save current problem's code
                      codeMapRef.current[problemIdx] = code;
                      const next = problemIdx + 1;
                      setProblemIdx(next);
                      // Restore saved code, or starter_code, or empty
                      const saved = codeMapRef.current[next];
                      setCode(saved !== undefined ? saved : (assignment.problems[next]?.starter_code || ""));
                      setFeedback("");
                    }}
                  >
                    다음 &rarr;
                  </button>
                </div>
              )}
            </div>
            <div
              className="problem-desc markdown-body"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(
                  (currentProblem?.description as string) || "AI가 문제를 생성하고 있습니다..."
                ),
              }}
            />
            {/* 문제 형식 배지 + 시간/메모리 제한 */}
            {isAlgorithm && currentProblem && (
              <div style={{ marginTop: 8, marginBottom: 4, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                <span style={{
                  display: "inline-block", fontSize: 11, fontWeight: 700, padding: "2px 8px",
                  borderRadius: 99, background: problemFormat === "programmers" ? "rgba(99,46,205,0.15)" : "rgba(16,185,129,0.15)",
                  color: problemFormat === "programmers" ? "#a78bfa" : "#34d399",
                }}>
                  {problemFormat === "programmers" ? "함수 구현형" : "표준 입출력형"}
                </span>
                {currentProblem.time_limit_ms && (
                  <span className="badge" style={{ fontSize: 11, fontWeight: 600, color: "var(--warning)" }}>
                    시간 {(currentProblem.time_limit_ms as number) / 1000}초
                  </span>
                )}
                {currentProblem.memory_limit_mb && (
                  <span className="badge" style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)" }}>
                    메모리 {currentProblem.memory_limit_mb as number}MB
                  </span>
                )}
              </div>
            )}
            {/* 함수 구현형: 함수 시그니처 + 매개변수 */}
            {problemFormat === "programmers" && currentProblem && (
              <div style={{ marginTop: 12, fontSize: 13 }}>
                {(currentProblem.parameters as { name: string; type: string; description: string }[])?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <strong style={{ fontSize: 14 }}>매개변수</strong>
                    <div style={{ marginTop: 4 }}>
                      {(currentProblem.parameters as { name: string; type: string; description: string }[]).map((p, i) => (
                        <div key={i} style={{ marginBottom: 2 }}>
                          <code style={{ color: "var(--primary)", fontSize: 12 }}>{p.name}</code>
                          <span style={{ color: "var(--on-surface-variant)" }}> ({p.type})</span>
                          {p.description && <span style={{ color: "var(--on-surface-variant)" }}> — {p.description}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {currentProblem.return_type && (
                  <div style={{ marginBottom: 12 }}>
                    <strong style={{ fontSize: 14 }}>반환값</strong>
                    <div style={{ marginTop: 6 }}>
                      <code style={{ color: "var(--primary)", fontSize: 12 }}>{currentProblem.return_type as string}</code>
                      {currentProblem.return_description && (
                        <span style={{ color: "var(--on-surface-variant)" }}> — {currentProblem.return_description as string}</span>
                      )}
                    </div>
                  </div>
                )}
                {(currentProblem.constraints as string) && (
                  <div style={{ marginBottom: 12 }}>
                    <strong style={{ fontSize: 14 }}>제약 조건</strong>
                    <div className="markdown-body" style={{ marginTop: 6, lineHeight: 1.7, color: "var(--warning)" }}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(currentProblem.constraints as string) }} />
                  </div>
                )}
                {(currentProblem.examples as { input: Record<string, unknown>; output: unknown; explanation?: string }[])?.length > 0 && (
                  <div>
                    <strong style={{ color: "var(--text-light)" }}>예제</strong>
                    {(currentProblem.examples as { input: Record<string, unknown>; output: unknown; explanation?: string }[]).map((ex, i) => (
                      <div key={i} style={{ marginTop: 8, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 10 }}>
                        <div style={{ marginBottom: 4, color: "#94a3b8" }}>예제 {i + 1}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>입력</div>
                            <pre style={{ background: "rgba(0,0,0,0.3)", padding: 6, borderRadius: 4, margin: 0, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-all", overflow: "auto", maxHeight: 200 }}>{JSON.stringify(ex.input, null, 2)}</pre>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>출력</div>
                            <pre style={{ background: "rgba(0,0,0,0.3)", padding: 6, borderRadius: 4, margin: 0, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-all", overflow: "auto", maxHeight: 200 }}>{JSON.stringify(ex.output)}</pre>
                          </div>
                        </div>
                        {ex.explanation && <div style={{ marginTop: 4, fontSize: 12, color: "#94a3b8" }}>{ex.explanation}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* 표준 입출력형: 입출력 형식, 제약조건, 예제 */}
            {(problemFormat === "baekjoon" || (isAlgorithm && problemFormat !== "programmers")) && currentProblem && (
              <div style={{ marginTop: 12, fontSize: 13 }}>
                {(currentProblem.input_description as string) && (
                  <div style={{ marginBottom: 12 }}>
                    <strong style={{ fontSize: 14 }}>입력</strong>
                    <div className="markdown-body" style={{ marginTop: 6, lineHeight: 1.7 }}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(currentProblem.input_description as string) }} />
                  </div>
                )}
                {(currentProblem.output_description as string) && (
                  <div style={{ marginBottom: 12 }}>
                    <strong style={{ fontSize: 14 }}>출력</strong>
                    <div className="markdown-body" style={{ marginTop: 6, lineHeight: 1.7 }}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(currentProblem.output_description as string) }} />
                  </div>
                )}
                {(currentProblem.constraints as string) && (
                  <div style={{ marginBottom: 12 }}>
                    <strong style={{ fontSize: 14 }}>제약 조건</strong>
                    <div className="markdown-body" style={{ marginTop: 6, lineHeight: 1.7, color: "var(--warning)" }}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(currentProblem.constraints as string) }} />
                  </div>
                )}
                {(currentProblem.examples as { input: string; output: string; explanation?: string }[])?.length > 0 && (
                  <div>
                    <strong style={{ color: "var(--text-light)" }}>예제</strong>
                    {(currentProblem.examples as { input: string; output: string; explanation?: string }[]).map((ex, i) => (
                      <div key={i} style={{ marginTop: 8, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 10 }}>
                        <div style={{ marginBottom: 4, color: "#94a3b8" }}>예제 {i + 1}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>입력</div>
                            <pre style={{ background: "rgba(0,0,0,0.3)", padding: 6, borderRadius: 4, margin: 0, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-all", overflow: "auto", maxHeight: 200 }}>{typeof ex.input === "string" ? ex.input : JSON.stringify(ex.input, null, 2)}</pre>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>출력</div>
                            <pre style={{ background: "rgba(0,0,0,0.3)", padding: 6, borderRadius: 4, margin: 0, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-all", overflow: "auto", maxHeight: 200 }}>{typeof ex.output === "string" ? ex.output : JSON.stringify(ex.output)}</pre>
                          </div>
                        </div>
                        {ex.explanation && <div style={{ marginTop: 4, fontSize: 12, color: "#94a3b8" }}>{ex.explanation}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {(currentProblem?.hints as string[])?.length ? (
              <details className="problem-hints">
                <summary>힌트 보기</summary>
                <ul>
                  {(currentProblem!.hints as string[]).map((h: string, i: number) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>

          <div className="sidebar-section tutor-chat">
            <h3>AI 튜터</h3>
            <div className="chat-messages">
              {chatMessages.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px 0",
                    color: "var(--text-light)",
                    fontSize: 13,
                  }}
                >
                  질문하면 답을 직접 주지 않고
                  <br />
                  스스로 깨달을 수 있도록 도와줍니다.
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`chat-bubble chat-${msg.role}`}>
                  {msg.content}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="chat-input-row">
              <input
                className="input"
                placeholder="질문을 입력하세요..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTutorChat()}
              />
              <button className="btn btn-primary" onClick={handleTutorChat}>
                &uarr;
              </button>
            </div>
          </div>

          <div className="sidebar-actions">
            {isOverdue ? (
              <div style={{
                padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: "rgba(220,38,38,0.08)", color: "var(--error)", textAlign: "center",
              }}>
                기한이 마감되었습니다 ({new Date(assignment.due_date).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })})
              </div>
            ) : isTeamAssignment ? (
              <TeamVotePanel
                voteStatus={voteStatus}
                loading={voteLoading}
                onInitiateVote={() => initiateVote({ code, problem_index: problemIdx })}
                onCastVote={castVote}
              />
            ) : (
              <>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? "AI 분석 중..." : "제출하기"}
                </button>
                {assignment?.due_date && (
                  <div style={{ marginTop: 6 }}>
                    <DeadlineTimer dueDate={assignment.due_date} compact />
                  </div>
                )}
              </>
            )}
          </div>

          {feedback && (
            <div className="sidebar-section feedback">
              <h3>AI 피드백</h3>
              <div
                className="feedback-text rendered-markdown"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(
                  assignment?.show_score_to_student === false ? stripScoreLine(feedback) : feedback
                ) }}
              />
              {submitting && <span className="feedback-cursor">▍</span>}
            </div>
          )}
        </div>
      </div>

      <footer className="editor-footer">
        <span>
          {lastSaved ? `자동 저장 완료 ${lastSaved}` : "자동 저장 대기 중"}
        </span>
        <span>
          외부 복붙: {pasteCount}회{pasteCount > 0 ? ` (${pastePercent}%)` : ""}
        </span>
      </footer>
    </div>
  );
}
