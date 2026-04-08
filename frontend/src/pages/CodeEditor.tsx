import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { renderMarkdown } from "../lib/markdown";
import api from "../lib/api";
import { supabase } from "../lib/supabase";
import { getAdminToken } from "../store/authStore";
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

  const handleSubmit = async () => {
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
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
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
          }
        }
      }
    } catch (err) {
      setFeedback((prev) => prev || "제출 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

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

  const policyLabels: Record<string, string> = {
    free: "자유",
    normal: "보통",
    strict: "엄격",
    exam: "시험",
  };

  return (
    <div className="editor-page">
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
            {(assignment?.language || "python").toUpperCase()}
          </span>
          <span className="badge badge-policy">
            AI 정책: {policyLabels[assignment?.ai_policy || ""] || "-"}
          </span>
        </div>
      </header>

      <div className="editor-layout">
        <div className="editor-main-wrapper">
          <div className="editor-main">
            <Editor
              height="100%"
              language={assignment?.language || "python"}
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
          </div>
          <div className="run-panel">
            <div className="run-panel-header">
              <div className="run-panel-tabs">
                <span className="run-panel-tab active">출력</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  className="stdin-input"
                  placeholder="stdin 입력 (선택)"
                  value={stdinInput}
                  onChange={(e) => setStdinInput(e.target.value)}
                />
                <button
                  className="btn-run"
                  onClick={handleRun}
                  disabled={running}
                >
                  {running ? "실행 중..." : "▶ 실행"}
                </button>
              </div>
            </div>
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
            <div className="problem-desc">
              {assignment?.problems?.[problemIdx]?.description ||
                "AI가 문제를 생성하고 있습니다..."}
            </div>
            {assignment?.problems?.[problemIdx]?.hints?.length ? (
              <details className="problem-hints">
                <summary>힌트 보기</summary>
                <ul>
                  {assignment.problems[problemIdx].hints.map((h, i) => (
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
            {assignment?.due_date && new Date(assignment.due_date) < new Date() ? (
              <div style={{
                padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: "rgba(220,38,38,0.08)", color: "var(--error)", textAlign: "center",
              }}>
                기한이 마감되었습니다 ({new Date(assignment.due_date).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })})
              </div>
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
                  <span style={{ fontSize: 12, color: "var(--on-surface-variant)", textAlign: "center", display: "block", marginTop: 4 }}>
                    마감: {new Date(assignment.due_date).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
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
