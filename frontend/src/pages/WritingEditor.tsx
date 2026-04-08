import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { MathInline, MathBlock } from "../lib/MathExtension";
import { renderMarkdown } from "../lib/markdown";
import api from "../lib/api";
import { supabase } from "../lib/supabase";
import { getAdminToken } from "../store/authStore";
import type { Assignment } from "../types";

function stripScoreLine(text: string): string {
  return text.replace(/🤖\s*피카버디의 추천 점수는.*?점이에요!?\s*\n?/g, "")
    .replace(/📊\s*점수[:\s]*\d+.*?\n?/g, "");
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const adminToken = getAdminToken() || sessionStorage.getItem("admin_token");
  if (adminToken) return { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` };
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) return { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` };
  return { "Content-Type": "application/json" };
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8001/api";

export default function WritingEditor() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [pasteSet, setPasteSet] = useState<Set<string>>(new Set());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastInternalCopyRef = useRef("");
  const navigate = useNavigate();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { HTMLAttributes: { class: "code-block" } },
      }),
      Placeholder.configure({ placeholder: "여기에 글을 작성하세요..." }),
      Typography,
      Underline,
      Image.configure({ inline: true, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      MathInline,
      MathBlock,
    ],
    content: "",
    onUpdate: ({ editor: ed }) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => saveSnapshot(ed.getJSON()), 3000);
    },
  });

  // Track internal copy for paste detection
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const onCopy = () => {
      const { from, to } = editor.state.selection;
      lastInternalCopyRef.current = editor.state.doc.textBetween(from, to);
    };
    const onPaste = (e: ClipboardEvent) => {
      const data = e.clipboardData;
      if (!data) return;
      // Only track text pastes, not images/html
      const text = data.getData("text/plain");
      if (!text || text.length < 50) return; // short pastes ignored
      if (text === lastInternalCopyRef.current) return; // internal
      setPasteSet((prev) => new Set(prev).add(text));
      // Log to backend
      if (assignmentId) {
        api.post(`/assignments/${assignmentId}/paste-log`, {
          content: text,
          paste_source: "external",
          timestamp: new Date().toISOString(),
          problem_index: 0,
        }).catch(() => {});
      }
    };
    dom.addEventListener("copy", onCopy, true);
    dom.addEventListener("cut", onCopy, true);
    dom.addEventListener("paste", onPaste as EventListener, true);
    return () => {
      dom.removeEventListener("copy", onCopy, true);
      dom.removeEventListener("cut", onCopy, true);
      dom.removeEventListener("paste", onPaste as EventListener, true);
    };
  }, [editor, assignmentId]);

  // Load assignment
  useEffect(() => {
    if (!assignmentId) return;
    api.get(`/assignments/${assignmentId}`).then(({ data }) => setAssignment(data));

    // Restore from latest snapshot
    api.get(`/assignments/${assignmentId}/snapshots`).then(({ data }) => {
      if (data && data.length > 0) {
        const latest = data[data.length - 1];
        const savedCode = latest.code_diff?.code;
        if (savedCode && editor) {
          try {
            const parsed = JSON.parse(savedCode);
            editor.commands.setContent(parsed);
          } catch {
            // Not JSON, ignore
          }
          setLastSaved("이전 글 복원됨");
        }
      }
    }).catch(() => {});

    // Restore from previous submission
    api.get(`/assignments/${assignmentId}/my-submission`).then(({ data }) => {
      if (data?.content && editor) {
        editor.commands.setContent(data.content);
      }
      if (data?.ai_analyses) {
        const a = Array.isArray(data.ai_analyses) ? data.ai_analyses[0] : data.ai_analyses;
        if (a?.feedback) setFeedback(a.feedback);
      }
    }).catch(() => {});
  }, [assignmentId, editor]);

  const saveSnapshot = useCallback(async (content: Record<string, unknown>) => {
    if (!assignmentId) return;
    try {
      await api.post(`/assignments/${assignmentId}/snapshots`, {
        code: JSON.stringify(content),
        timestamp: new Date().toISOString(),
        problem_index: 0,
      });
      setLastSaved(new Date().toLocaleTimeString());
    } catch { /* ignored */ }
  }, [assignmentId]);

  const handleSubmit = async () => {
    if (!assignmentId || !editor || submitting) return;
    setSubmitting(true);
    setFeedback("");

    try {
      const content = editor.getJSON();
      const { data: submission } = await api.post(`/assignments/${assignmentId}/submit`, {
        code: editor.getText(),
        content,
        problem_index: 0,
      });

      if (!submission?.id) {
        setFeedback("제출 실패");
        setSubmitting(false);
        return;
      }

      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/submissions/${submission.id}/feedback-stream`, { headers });

      if (!response.ok) {
        setFeedback(`피드백 요청 실패 (${response.status})`);
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
                if (data.type === "chunk") setFeedback((prev) => prev + data.text);
                else if (data.type === "error") setFeedback((prev) => prev || `오류: ${data.text}`);
              } catch { /* SSE parse error */ }
            }
          }
        }
      }
    } catch {
      setFeedback("제출 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !editor) return;
      // Convert to base64 for simplicity (could use Supabase Storage)
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        editor.chain().focus().setImage({ src: base64 }).run();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const editorText = editor ? editor.getText() : "";
  const wordCount = editorText.replace(/\s/g, "").length;
  const activePastes = Array.from(pasteSet).filter((p) =>
    p.split("\n").some((line) => line.trim().length > 3 && editorText.includes(line.trim()))
  );
  const pasteCount = activePastes.length;
  // 복붙 글자수: 에디터에 남아있는 복붙 텍스트의 공백 제외 글자수
  const pasteCharCount = activePastes.reduce((sum, p) => {
    const chars = p.replace(/\s/g, "").length;
    return sum + chars;
  }, 0);
  const pastePercent = wordCount > 0 ? Math.min(100, Math.round((pasteCharCount / wordCount) * 100)) : 0;
  const isOverdue = assignment?.due_date && new Date(assignment.due_date) < new Date();

  return (
    <div className="editor-page">
      <header className="editor-topbar">
        <div className="topbar-left">
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>&larr;</button>
          <span className="editor-topbar-title">{assignment?.title || "로딩 중..."}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="badge" style={{ background: "rgba(99,46,205,0.12)", color: "var(--tertiary)" }}>글쓰기</span>
          <span className="badge badge-policy">
            AI 정책: {({ free: "자유", normal: "보통", strict: "엄격", exam: "시험" } as Record<string, string>)[assignment?.ai_policy || ""] || "-"}
          </span>
        </div>
      </header>

      <div className="editor-layout">
        <div className="editor-main note-editor" style={{ flex: 1 }}>
          {editor && (
            <div className="note-toolbar">
              <button className={`toolbar-btn ${editor.isActive("heading", { level: 1 }) ? "active" : ""}`}
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</button>
              <button className={`toolbar-btn ${editor.isActive("heading", { level: 2 }) ? "active" : ""}`}
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
              <button className={`toolbar-btn ${editor.isActive("heading", { level: 3 }) ? "active" : ""}`}
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
              <div className="toolbar-divider" />
              <button className={`toolbar-btn ${editor.isActive("bold") ? "active" : ""}`}
                onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></button>
              <button className={`toolbar-btn ${editor.isActive("italic") ? "active" : ""}`}
                onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></button>
              <button className={`toolbar-btn ${editor.isActive("underline") ? "active" : ""}`}
                onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></button>
              <div className="toolbar-divider" />
              <button className={`toolbar-btn ${editor.isActive("bulletList") ? "active" : ""}`}
                onClick={() => editor.chain().focus().toggleBulletList().run()}>&bull;</button>
              <button className={`toolbar-btn ${editor.isActive("orderedList") ? "active" : ""}`}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}>1.</button>
              <button className={`toolbar-btn ${editor.isActive("blockquote") ? "active" : ""}`}
                onClick={() => editor.chain().focus().toggleBlockquote().run()}>&ldquo;</button>
              <div className="toolbar-divider" />
              <button className="toolbar-btn" onClick={handleImageUpload} title="이미지 삽입">IMG</button>
              <button className="toolbar-btn" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="표 삽입">TBL</button>
              <div className="toolbar-divider" />
              <button className="toolbar-btn" onClick={() => editor.chain().focus().insertContent({ type: "mathInline", attrs: { formula: "" } }).run()} title="인라인 수식 ($수식$)">∑</button>
              <button className="toolbar-btn" onClick={() => editor.chain().focus().insertContent({ type: "mathBlock", attrs: { formula: "" } }).run()} title="수식 블록 ($$수식$$)">∫</button>
              <div className="toolbar-divider" />
              <button className="toolbar-btn" onClick={() => editor.chain().focus().setHorizontalRule().run()}>&#x2014;</button>
            </div>
          )}
          <EditorContent editor={editor} />
        </div>

        <div className="editor-sidebar">
          {/* 과제 지시문 */}
          <div className="sidebar-section">
            <h3>과제 안내</h3>
            <div style={{ fontSize: 13, color: "var(--on-surface-variant)", lineHeight: 1.6 }}>
              {assignment?.writing_prompt || assignment?.topic || "과제 정보를 불러오는 중..."}
            </div>
          </div>

          {/* 통계 */}
          <div className="sidebar-section">
            <h3>작성 현황</h3>
            <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 20, color: "var(--primary)" }}>{wordCount}</div>
                <div style={{ color: "var(--on-surface-variant)" }}>글자</div>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 20, color: pasteCount > 0 ? "var(--tertiary)" : "var(--on-surface-variant)" }}>{pasteCount}</div>
                <div style={{ color: "var(--on-surface-variant)" }}>외부 복붙</div>
              </div>
              {pasteCount > 0 && (
                <div>
                  <div style={{
                    fontWeight: 700, fontSize: 20,
                    color: pastePercent > 50 ? "var(--error)" : pastePercent > 20 ? "var(--tertiary)" : "var(--on-surface-variant)",
                  }}>{pastePercent}%</div>
                  <div style={{ color: "var(--on-surface-variant)" }}>복붙 비율</div>
                </div>
              )}
            </div>
          </div>

          {/* 제출 */}
          <div className="sidebar-actions">
            {isOverdue ? (
              <div style={{
                padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: "rgba(220,38,38,0.08)", color: "var(--error)", textAlign: "center",
              }}>
                기한이 마감되었습니다
              </div>
            ) : (
              <>
                <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
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

          {/* AI 피드백 */}
          {feedback && (
            <div className="sidebar-section feedback">
              <h3>AI 피드백</h3>
              <div className="feedback-text rendered-markdown"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(
                  assignment?.show_score_to_student === false ? stripScoreLine(feedback) : feedback
                ) }} />
              {submitting && <span className="feedback-cursor">▍</span>}
            </div>
          )}
        </div>
      </div>

      <footer className="editor-footer">
        <span>{lastSaved ? `자동 저장 완료 ${lastSaved}` : "자동 저장 대기 중"}</span>
        <span>{wordCount}자 | 외부 복붙: {pasteCount}회{pasteCount > 0 ? ` (${pastePercent}%)` : ""}</span>
      </footer>
    </div>
  );
}
