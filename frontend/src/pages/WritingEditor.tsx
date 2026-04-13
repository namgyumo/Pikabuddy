import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table/table";
import { TableRow } from "@tiptap/extension-table/row";
import { TableHeader } from "@tiptap/extension-table/header";
import { TableCell } from "@tiptap/extension-table/cell";
import { Markdown } from "tiptap-markdown";
import { MathInline, MathBlock } from "../lib/MathExtension";
import { CitationExtension } from "../lib/CitationExtension";
import { ExcalidrawExtension } from "../lib/ExcalidrawExtension";
import { SlashCommandExtension } from "../lib/SlashCommandExtension";
import { CodeBlockExtension } from "../lib/CodeBlockExtension";
import { BlockHandleExtension } from "../lib/BlockHandleExtension";
import { ToggleExtension } from "../lib/ToggleExtension";
import { CalloutExtension } from "../lib/CalloutExtension";
import DeadlineTimer from "../components/DeadlineTimer";
import { renderMarkdown } from "../lib/markdown";
import api from "../lib/api";
import { supabase } from "../lib/supabase";
import { getAdminToken, useAuthStore } from "../store/authStore";
import { useTeamVote } from "../lib/useTeamVote";
import { useExamMode } from "../lib/useExamMode";
import TeamVotePanel from "../components/TeamVotePanel";
import { toast } from "../lib/toast";
import { customConfirm } from "../lib/confirm";
import type { Assignment } from "../types";
import * as Y from "yjs";
import { ySyncPlugin, ySyncPluginKey, yCursorPlugin, yCursorPluginKey, yUndoPlugin, yUndoPluginKey, prosemirrorJSONToYXmlFragment } from "y-prosemirror";
import { SupabaseYjsProvider, getCollabColor } from "../lib/SupabaseYjsProvider";

/* ── Toolbar helpers (same as NoteEditor) ── */
function DropMenu({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div className="toolbar-drop" ref={ref}>
      <button className={`toolbar-drop-btn${open ? " open" : ""}`} onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}>
        {label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 4l3 3 3-3z" /></svg>
      </button>
      {open && <div className="toolbar-drop-panel" onMouseDown={() => setOpen(false)}>{children}</div>}
    </div>
  );
}

function Btn({ active, onClick, title, children }: { active?: boolean; onClick: () => void; title?: string; children: React.ReactNode }) {
  return <button className={`toolbar-btn ${active ? "active" : ""}`} onMouseDown={(e) => { e.preventDefault(); onClick(); }} title={title}>{children}</button>;
}

function DRow({ icon, label, onClick, active }: { icon: string; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button className={`drop-row${active ? " active" : ""}`} onMouseDown={(e) => { e.preventDefault(); onClick(); }}>
      <span className="drop-row-icon">{icon}</span><span>{label}</span>
    </button>
  );
}

const HeadingBackspaceFix = Extension.create({
  name: "headingBackspaceFix",
  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor: ed }) => {
        const { $from, empty } = ed.state.selection;
        if (!empty || $from.parentOffset !== 0 || !$from.parent.type.name.startsWith("heading")) return false;
        if ($from.parent.textContent === "") return ed.commands.setParagraph();
        if ($from.index(0) === 0 || $from.nodeBefore === null) return ed.commands.setParagraph();
        return false;
      },
    };
  },
});

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

  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showCitationInput, setShowCitationInput] = useState(false);
  const [citationSource, setCitationSource] = useState("");
  const [citationSourceUrl, setCitationSourceUrl] = useState("");

  const { user } = useAuthStore();

  const { isTeamAssignment, voteStatus, loading: voteLoading, initiateVote, castVote } = useTeamVote(
    assignmentId,
    assignment?.is_team_assignment ?? false,
  );

  // 팀 실시간 협업 상태
  const [teamPresence, setTeamPresence] = useState<{ userId: string; name: string }[]>([]);
  const ydocRef = useRef<Y.Doc | null>(null);
  const yjsProviderRef = useRef<SupabaseYjsProvider | null>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const submitAbortRef = useRef<AbortController | null>(null);

  // Cleanup SSE streams on unmount
  useEffect(() => {
    return () => {
      submitAbortRef.current?.abort();
    };
  }, []);

  // 시험 모드
  const examMode = useExamMode({
    assignmentId: assignmentId || "",
    enabled: !!(assignment?.exam_mode),
  });
  const [examStarted, setExamStarted] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
      }),
      CodeBlockExtension,
      Placeholder.configure({ placeholder: "여기에 글을 작성하세요... ( / 로 블록 삽입)" }),
      Typography,
      Markdown,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Superscript,
      Subscript,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "note-link" },
      }),
      Image.configure({ inline: false, HTMLAttributes: { class: "note-image" } }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      ExcalidrawExtension,
      MathInline,
      MathBlock,
      SlashCommandExtension,
      BlockHandleExtension,
      ToggleExtension,
      CalloutExtension,
      CitationExtension,
      HeadingBackspaceFix,
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
      // 인용 블록 안에서는 복붙 감지 무시
      if (editor.isActive("citation")) return;
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

  // ── 우클릭 메뉴 커맨드 수신 ──
  useEffect(() => {
    if (!editor) return;
    const handler = (e: Event) => {
      const { cmd, args } = (e as CustomEvent).detail || {};
      if (!cmd) return;
      const chain = editor.chain().focus();
      switch (cmd) {
        case "toggleBold": chain.toggleBold().run(); break;
        case "toggleItalic": chain.toggleItalic().run(); break;
        case "toggleUnderline": chain.toggleUnderline().run(); break;
        case "toggleStrike": chain.toggleStrike().run(); break;
        case "toggleHeading": chain.toggleHeading({ level: args?.level || 1 }).run(); break;
        case "setParagraph": chain.setParagraph().run(); break;
        case "toggleBulletList": chain.toggleBulletList().run(); break;
        case "toggleOrderedList": chain.toggleOrderedList().run(); break;
        case "toggleTaskList": chain.toggleTaskList().run(); break;
        case "toggleBlockquote": chain.toggleBlockquote().run(); break;
        case "insertTable": chain.insertTable({ rows: args?.rows || 3, cols: args?.cols || 3, withHeaderRow: true }).run(); break;
        case "insertImage": { const u = prompt("이미지 URL"); if (u) chain.setImage({ src: u }).run(); break; }
        case "setHorizontalRule": chain.setHorizontalRule().run(); break;
        case "insertMath": chain.insertContent({ type: "mathInline", attrs: { formula: "" } }).run(); break;
        case "setTextAlign": chain.setTextAlign(args?.alignment || "left").run(); break;
        case "deleteNode": {
          const { from } = editor.state.selection;
          const resolved = editor.state.doc.resolve(from);
          const blockStart = resolved.before(1);
          const blockEnd = resolved.after(1);
          editor.chain().focus().deleteRange({ from: blockStart, to: blockEnd }).run();
          break;
        }
      }
    };
    window.addEventListener("ctx-editor-cmd", handler);
    return () => window.removeEventListener("ctx-editor-cmd", handler);
  }, [editor]);

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

  // ── 팀 과제 실시간 협업 (Y.js + Supabase Realtime) ──
  const teamId = voteStatus?.team_id;

  useEffect(() => {
    if (!isTeamAssignment || !teamId || !assignmentId || !editor || !user) return;

    const ydoc = new Y.Doc();
    const provider = new SupabaseYjsProvider(ydoc);
    ydocRef.current = ydoc;
    yjsProviderRef.current = provider;

    const fragment = ydoc.getXmlFragment("default");
    const savedContent = editor.getJSON();

    provider.awareness.setLocalStateField("user", {
      name: user.name || "Anonymous",
      color: getCollabColor(user.id),
    });

    // 동기화 완료 후 플러그인 등록 (콘텐츠 중복 방지)
    let pluginsRegistered = false;
    provider.onSynced = (hasPeers: boolean) => {
      if (pluginsRegistered || !editor || editor.isDestroyed) return;
      pluginsRegistered = true;

      if (!hasPeers && savedContent?.content?.length) {
        prosemirrorJSONToYXmlFragment(editor.schema, savedContent, fragment);
      }
      try {
        editor.registerPlugin(ySyncPlugin(fragment));
        editor.registerPlugin(yUndoPlugin());
        editor.registerPlugin(yCursorPlugin(provider.awareness));
      } catch (e) {
        console.warn("[TeamCollab] Plugin registration error:", e);
      }
    };

    // 브로드캐스트 리스너를 subscribe 전에 등록
    const channelName = `team-writing:${assignmentId}:${teamId}`;
    const channel = supabase.channel(channelName, { config: { presence: { key: user.id } } });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const members: { userId: string; name: string }[] = [];
      for (const [, presences] of Object.entries(state)) {
        for (const p of presences as { userId: string; name: string }[]) {
          if (p.userId !== user.id) {
            members.push({ userId: p.userId, name: p.name });
          }
        }
      }
      setTeamPresence(members);
    });

    provider.connect(channel);

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ userId: user.id, name: user.name || "Unknown" });
        provider.requestSync();
      }
    });

    realtimeChannelRef.current = channel;

    return () => {
      try { editor.unregisterPlugin(ySyncPluginKey); } catch { /* */ }
      try { editor.unregisterPlugin(yCursorPluginKey); } catch { /* */ }
      try { editor.unregisterPlugin(yUndoPluginKey); } catch { /* */ }
      provider.destroy();
      ydoc.destroy();
      ydocRef.current = null;
      yjsProviderRef.current = null;
      channel.unsubscribe();
      realtimeChannelRef.current = null;
    };
  }, [isTeamAssignment, teamId, assignmentId, editor, user?.id]);

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
      const text = editor.getText();
      const { data: submission } = await api.post(`/assignments/${assignmentId}/submit`, {
        code: text,
        content,
        problem_index: 0,
        char_count: text.replace(/\s/g, "").length,
      });

      if (!submission?.id) {
        setFeedback("제출 실패");
        setSubmitting(false);
        return;
      }

      const headers = await getAuthHeaders();
      const abortController = new AbortController();
      submitAbortRef.current = abortController;
      const response = await fetch(`${API_BASE}/submissions/${submission.id}/feedback-stream`, { headers, signal: abortController.signal });

      if (!response.ok) {
        setFeedback(`피드백 요청 실패 (${response.status})`);
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
              if (data.type === "chunk") setFeedback((prev) => prev + data.text);
              else if (data.type === "error") setFeedback((prev) => prev || `오류: ${data.text}`);
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
      if ((err as Error)?.name !== "AbortError") {
        setFeedback("제출 중 오류가 발생했습니다.");
      }
    } finally {
      submitAbortRef.current = null;
      setSubmitting(false);
    }
  };

  const handleSubmitAll = useCallback(async (silent = false) => {
    if (!assignmentId || !editor) return;
    const content = editor.getJSON();
    const text = editor.getText();
    if (!text.trim()) {
      if (!silent) toast.warning("작성된 글��� 없습니다.");
      return;
    }
    try {
      await api.post(`/assignments/${assignmentId}/submit-all`, {
        problems: [{
          problem_index: 0,
          code: text,
          content,
          char_count: text.replace(/\s/g, "").length,
        }],
      });
      if (!silent) toast.success("글이 제출되었습니다. AI ��석이 ���그라운드에서 진행됩니다.");
    } catch {
      if (!silent) toast.error("제출 중 오류가 발생했습니���.");
    }
  }, [assignmentId, editor]);

  const insertLink = () => {
    if (!editor) return;
    if (!linkUrl.trim()) { editor.chain().focus().unsetLink().run(); }
    else { editor.chain().focus().setLink({ href: linkUrl.trim() }).run(); }
    setLinkUrl(""); setShowLinkInput(false);
  };

  const insertCitation = () => {
    if (!editor) return;
    (editor.commands as any).insertCitation({ source: citationSource.trim(), sourceUrl: citationSourceUrl.trim() });
    setCitationSource(""); setCitationSourceUrl(""); setShowCitationInput(false);
  };

  const isInTable = editor ? (editor.isActive("table") || editor.isActive("tableCell") || editor.isActive("tableHeader") || editor.isActive("tableRow")) : false;

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
              ? <>시험이 무사히 종료되었습니다.<br/>작성한 글은 자동 저장되었습니다.</>
              : <>화면 이탈 횟수 초과로 시험이 자동 종료되었습니다.<br/>현재까지 작성한 글은 자동 저장되었습니다.</>
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
      {/* 시험 모드 경고 배너 */}
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
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>&larr;</button>
          <span className="editor-topbar-title">{assignment?.title || "로딩 중..."}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="badge" style={{ background: "rgba(99,46,205,0.12)", color: "var(--tertiary)" }}>글쓰기</span>
          {isTeamAssignment && (
            <span className="badge" style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 3, verticalAlign: -1 }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              팀 공유
              {teamPresence.length > 0 && (
                <span style={{ marginLeft: 4, fontWeight: 700 }}>
                  ({teamPresence.map(m => m.name).join(", ")} 편집 중)
                </span>
              )}
            </span>
          )}
          <span className="badge badge-policy">
            AI 정책: {({ free: "자유", normal: "보통", strict: "엄격", exam: "시험" } as Record<string, string>)[assignment?.ai_policy || ""] || "-"}
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
                  customConfirm("시험을 종료하시겠습니까? 작성한 글이 자동 제출됩니다. 종료 후에는 다시 입장할 수 없습니다.", { danger: true, confirmText: "종��" }).then(async (ok) => {
                    if (ok) {
                      await handleSubmitAll(true);
                      examMode.endExam("학생이 직접 종료", true);
                    }
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
        <div className="editor-main note-editor" style={{ flex: 1 }}>
          {editor && (
            <div className="note-toolbar compact">
              {/* 빠른 접근: 서식 */}
              <Btn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="굵게"><strong>B</strong></Btn>
              <Btn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="기울임"><em>I</em></Btn>
              <Btn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="밑줄"><u>U</u></Btn>
              <Btn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="취소선"><s>S</s></Btn>
              <div className="toolbar-divider" />

              {/* 제목 드롭다운 */}
              <DropMenu label={editor.isActive("heading") ? `H${editor.getAttributes("heading").level}` : "제목"}>
                <DRow icon="H1" label="제목 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} />
                <DRow icon="H2" label="제목 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} />
                <DRow icon="H3" label="제목 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} />
                <DRow icon="Aa" label="본문" onClick={() => editor.chain().focus().setParagraph().run()} />
              </DropMenu>

              {/* 목록 드롭다운 */}
              <DropMenu label="목록">
                <DRow icon="•" label="글머리 목록" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} />
                <DRow icon="1." label="번호 목록" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} />
                <DRow icon="☑" label="체크리스트" onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive("taskList")} />
                <DRow icon="❝" label="인용" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} />
                <DRow icon="{ }" label="코드 블록" onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} />
              </DropMenu>

              {/* 삽입 드롭다운 */}
              <DropMenu label="삽입">
                <DRow icon="—" label="구분선" onClick={() => editor.chain().focus().setHorizontalRule().run()} />
                <DRow icon="⊞" label="표 (3x3)" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
                <DRow icon="🖼" label="이미지" onClick={handleImageUpload} />
                <DRow icon="🔗" label="링크" onClick={() => { setShowLinkInput(true); setLinkUrl(editor.getAttributes("link").href || ""); }} />
                <DRow icon="∑" label="인라인 수식" onClick={() => editor.chain().focus().insertContent({ type: "mathInline", attrs: { formula: "" } }).run()} />
                <DRow icon="∫" label="수식 블록" onClick={() => editor.chain().focus().insertContent({ type: "mathBlock", attrs: { formula: "" } }).run()} />
                <DRow icon="✏️" label="그리기" onClick={() => editor.chain().focus().insertContent({ type: "excalidraw", attrs: { sceneData: null, preview: null } }).run()} />
              </DropMenu>

              {/* 서식 더보기 */}
              <DropMenu label="서식">
                <DRow icon="x²" label="위첨자" onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive("superscript")} />
                <DRow icon="x₂" label="아래첨자" onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive("subscript")} />
                <DRow icon="</>" label="인라인 코드" onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} />
                <DRow icon="≡" label="왼쪽 정렬" onClick={() => editor.chain().focus().setTextAlign("left").run()} />
                <DRow icon="☰" label="가운데 정렬" onClick={() => editor.chain().focus().setTextAlign("center").run()} />
                <DRow icon="☰" label="오른쪽 정렬" onClick={() => editor.chain().focus().setTextAlign("right").run()} />
                <DRow icon="⊘" label="색상 초기화" onClick={() => editor.chain().focus().unsetColor().run()} />
              </DropMenu>

              {/* 색상 — 인라인 */}
              <div className="toolbar-divider" />
              <label className="toolbar-btn color-pick" title="글자 색상">
                <span style={{ borderBottom: "3px solid currentColor", lineHeight: 1 }}>A</span>
                <input type="color" style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                  onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} />
              </label>
              <label className={`toolbar-btn color-pick${editor.isActive("highlight") ? " active" : ""}`} title="형광펜">
                <span style={{ lineHeight: 1 }}>H</span>
                <input type="color" defaultValue="#ffd700" style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                  onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()} />
              </label>

              {/* 표 안일 때 표 컨트롤 */}
              {isInTable && (
                <>
                  <div className="toolbar-divider" />
                  <Btn onClick={() => editor.chain().focus().addColumnBefore().run()} title="왼쪽에 열 추가">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="3" width="15" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="1" y1="12" x2="5" y2="12"/><line x1="3" y1="10" x2="3" y2="14"/></svg>
                  </Btn>
                  <Btn onClick={() => editor.chain().focus().addColumnAfter().run()} title="오른쪽에 열 추가">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="15" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="19" y1="12" x2="23" y2="12"/><line x1="21" y1="10" x2="21" y2="14"/></svg>
                  </Btn>
                  <Btn onClick={() => editor.chain().focus().addRowBefore().run()} title="위에 행 추가">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="6" width="18" height="15" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="12" y1="1" x2="12" y2="5"/><line x1="10" y1="3" x2="14" y2="3"/></svg>
                  </Btn>
                  <Btn onClick={() => editor.chain().focus().addRowAfter().run()} title="아래에 행 추가">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="15" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="10" y1="21" x2="14" y2="21"/></svg>
                  </Btn>
                  <DropMenu label="표 편집">
                    <DRow icon="-→" label="열 삭제" onClick={() => editor.chain().focus().deleteColumn().run()} />
                    <DRow icon="-↓" label="행 삭제" onClick={() => editor.chain().focus().deleteRow().run()} />
                    <DRow icon="⊟" label="셀 병합/분리" onClick={() => editor.chain().focus().mergeOrSplit().run()} />
                    <DRow icon="🗑" label="표 삭제" onClick={() => editor.chain().focus().deleteTable().run()} />
                  </DropMenu>
                </>
              )}
            </div>
          )}

          {/* 링크 입력 팝업 */}
          {showLinkInput && (
            <div className="toolbar-popup" style={{ position: "absolute", top: 100, left: 60, zIndex: 100 }}>
              <input className="input" style={{ fontSize: 13, padding: "6px 10px", width: 260 }} placeholder="URL (빈 칸이면 링크 제거)" value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") insertLink(); if (e.key === "Escape") setShowLinkInput(false); }} autoFocus />
              <button className="btn btn-primary" style={{ fontSize: 12, padding: "4px 12px" }} onClick={insertLink}>적용</button>
            </div>
          )}

          {/* 출처 인용 입력 팝업 */}
          {showCitationInput && (
            <div className="toolbar-popup citation-input-popup" style={{ position: "absolute", top: 100, left: 60, zIndex: 100 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>출처 인용 삽입</div>
              <input className="input" style={{ fontSize: 13, padding: "6px 10px", width: 280, marginBottom: 6 }} placeholder="출처 (예: 홍길동, 2024, p.42)"
                value={citationSource} onChange={(e) => setCitationSource(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") setShowCitationInput(false); }} autoFocus />
              <input className="input" style={{ fontSize: 13, padding: "6px 10px", width: 280, marginBottom: 6 }} placeholder="출처 URL (선택)"
                value={citationSourceUrl} onChange={(e) => setCitationSourceUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") insertCitation(); if (e.key === "Escape") setShowCitationInput(false); }} />
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 12px" }} onClick={() => setShowCitationInput(false)}>취소</button>
                <button className="btn btn-primary" style={{ fontSize: 12, padding: "4px 12px" }} onClick={insertCitation}>삽입</button>
              </div>
            </div>
          )}
          {/* ── 표 전용 버블 메뉴 ── */}
          {editor && (
            <BubbleMenu editor={editor} tippyOptions={{ duration: 150, placement: "top" }}
              shouldShow={({ editor }) => editor.isActive("table") || editor.isActive("tableCell") || editor.isActive("tableHeader")}
            >
              <div className="bubble-menu table-bubble">
                <button className="bubble-btn" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addColumnBefore().run(); }} title="왼쪽에 열 추가">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="3" width="15" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="1" y1="12" x2="5" y2="12"/><line x1="3" y1="10" x2="3" y2="14"/></svg>
                </button>
                <button className="bubble-btn" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addColumnAfter().run(); }} title="오른쪽에 열 추가">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="15" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="19" y1="12" x2="23" y2="12"/><line x1="21" y1="10" x2="21" y2="14"/></svg>
                </button>
                <button className="bubble-btn" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addRowBefore().run(); }} title="위에 행 추가">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="6" width="18" height="15" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="12" y1="1" x2="12" y2="5"/><line x1="10" y1="3" x2="14" y2="3"/></svg>
                </button>
                <button className="bubble-btn" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addRowAfter().run(); }} title="아래에 행 추가">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="15" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="10" y1="21" x2="14" y2="21"/></svg>
                </button>
                <div className="bubble-divider" />
                <button className="bubble-btn" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteColumn().run(); }} title="열 삭제" style={{ color: "var(--error, #ef4444)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="3" width="15" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="1" y1="12" x2="5" y2="12"/></svg>
                </button>
                <button className="bubble-btn" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteRow().run(); }} title="행 삭제" style={{ color: "var(--error, #ef4444)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="6" width="18" height="15" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="12" y1="1" x2="12" y2="5"/></svg>
                </button>
                <button className="bubble-btn" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().mergeOrSplit().run(); }} title="셀 병합/분리">
                  <span style={{ fontSize: 12, fontWeight: 600 }}>M</span>
                </button>
                <button className="bubble-btn" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteTable().run(); }} title="표 삭제" style={{ color: "var(--error, #ef4444)" }}>
                  <span style={{ fontSize: 12 }}>🗑</span>
                </button>
              </div>
            </BubbleMenu>
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
            ) : isTeamAssignment ? (
              <TeamVotePanel
                voteStatus={voteStatus}
                loading={voteLoading}
                onInitiateVote={() => {
                  if (!editor) return;
                  const content = editor.getJSON();
                  const text = editor.getText();
                  initiateVote({ code: text, content, problem_index: 0 });
                }}
                onCastVote={castVote}
              />
            ) : (
              <>
                <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
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
