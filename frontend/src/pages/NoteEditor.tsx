import { useEffect, useState, useRef, useCallback, useLayoutEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
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
import { renderMarkdown } from "../lib/markdown";
import api from "../lib/api";
import { useAuthStore } from "../store/authStore";
import type { CourseMaterial } from "../types";
import { ExcalidrawExtension } from "../lib/ExcalidrawExtension";
import { AIPolishedExtension } from "../lib/AIPolishedExtension";
import { MathInline, MathBlock } from "../lib/MathExtension";
import { SubNoteExtension } from "../lib/SubNoteExtension";
import { NoteLinkExtension } from "../lib/NoteLinkExtension";
import { SlashCommandExtension } from "../lib/SlashCommandExtension";
import { BlockHandleExtension } from "../lib/BlockHandleExtension";
import { ToggleExtension } from "../lib/ToggleExtension";
import { CalloutExtension } from "../lib/CalloutExtension";
import MiniNoteTree from "../components/MiniNoteTree";
import type { Note } from "../types";

interface AiComment {
  id: string;
  target_text: string;
  comment: string;
  is_correct: boolean;
}

interface ChatMessage {
  role: "user" | "ai";
  text: string;
}

const SHORTCUTS = [
  { key: "Ctrl + S", desc: "저장" },
  { key: "Ctrl + Enter", desc: "AI 분석" },
  { key: "/", desc: "블록 삽입 메뉴" },
  { key: "Ctrl + B / I / U", desc: "굵게 / 기울임 / 밑줄" },
  { key: "Ctrl + Shift + X", desc: "취소선" },
  { key: "Ctrl + E", desc: "인라인 코드" },
  { key: "Ctrl + K", desc: "링크" },
  { key: "Ctrl + Alt + 1/2/3", desc: "제목 1/2/3" },
];

/* ── Dropdown Menu helper ── */
function DropMenu({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="toolbar-drop" ref={ref}>
      <button
        className={`toolbar-drop-btn${open ? " open" : ""}`}
        onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
      >
        {label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 4l3 3 3-3z" /></svg>
      </button>
      {open && (
        <div className="toolbar-drop-panel" onMouseDown={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

function Btn({
  active, onClick, title, children, danger,
}: {
  active?: boolean; onClick: () => void; title?: string; children: React.ReactNode; danger?: boolean;
}) {
  return (
    <button
      className={`toolbar-btn ${active ? "active" : ""} ${danger ? "danger" : ""}`}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
    >
      {children}
    </button>
  );
}

/* Drop-panel row */
function DRow({ icon, label, onClick, active }: { icon: string; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button className={`drop-row${active ? " active" : ""}`} onMouseDown={(e) => { e.preventDefault(); onClick(); }}>
      <span className="drop-row-icon">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

/* ── Material embed viewer ── */
function MaterialEmbedPanel({ material }: { material: CourseMaterial }) {
  const [loadError, setLoadError] = useState(false);
  const ext = material.file_name.split(".").pop()?.toLowerCase() || "";

  let viewerUrl: string | null = null;
  if (ext === "pdf") {
    viewerUrl = material.file_url;
  } else if (["ppt", "pptx", "doc", "docx", "xls", "xlsx"].includes(ext)) {
    viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(material.file_url)}`;
  } else if (ext === "hwp" || ext === "hwpx") {
    viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(material.file_url)}&embedded=true`;
  }

  if (viewerUrl && !loadError) {
    return (
      <>
        <iframe
          src={viewerUrl}
          style={{ flex: 1, width: "100%", border: "none" }}
          title={material.title}
          onError={() => setLoadError(true)}
        />
        <div className="doc-embed-bar">
          <a href={material.file_url} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ fontSize: 12 }}>
            새 탭에서 열기
          </a>
        </div>
      </>
    );
  }

  const icon = ext === "pdf" ? "PDF" : ["ppt","pptx"].includes(ext) ? "PPT" : ["doc","docx"].includes(ext) ? "DOC" : ["hwp","hwpx"].includes(ext) ? "HWP" : "FILE";
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <div style={{ fontSize: 40, fontWeight: 700, color: "var(--on-surface-variant)" }}>{icon}</div>
      <p style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>{material.file_name}</p>
      {loadError && (
        <p style={{ color: "var(--warning)", fontSize: 12 }}>미리보기를 불러올 수 없습니다.</p>
      )}
      <a href={material.file_url} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ fontSize: 13 }}>
        다운로드
      </a>
    </div>
  );
}

export default function NoteEditor() {
  const { courseId, noteId } = useParams<{ courseId: string; noteId: string }>();
  const [title, setTitle] = useState("새 노트");
  const [aiComments, setAiComments] = useState<AiComment[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [polishedMarkdown, setPolishedMarkdown] = useState<string | null>(null);
  const [draftMarkdown, setDraftMarkdown] = useState("");
  const [polishEditMode, setPolishEditMode] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const isProfessor = user?.role === "professor";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<CourseMaterial | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"ai" | "material" | "map">(
    searchParams.get("material") ? "material" : "ai"
  );
  const [tags, setTags] = useState<{ id: string; tag: string }[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [noteLinkSearch, setNoteLinkSearch] = useState(false);
  const [noteLinkQuery, setNoteLinkQuery] = useState("");
  const [noteLinkResults, setNoteLinkResults] = useState<Note[]>([]);
  const noteLinkRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { HTMLAttributes: { class: "code-block" } },
      }),
      Placeholder.configure({ placeholder: "여기에 노트를 작성하세요... ( / 로 블록 삽입)" }),
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
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "note-link" } }),
      Image.configure({ inline: false, HTMLAttributes: { class: "note-image" } }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      ExcalidrawExtension,
      AIPolishedExtension,
      MathInline,
      MathBlock,
      SubNoteExtension,
      NoteLinkExtension,
      SlashCommandExtension,
      BlockHandleExtension,
      ToggleExtension,
      CalloutExtension,
    ],
    content: "",
  });

  // ── 데이터 로드 ───────────────────────────────────────
  useEffect(() => {
    if (!noteId || noteId === "new" || !courseId) return;
    api.get(`/courses/${courseId}/notes`).then(({ data }) => {
      const note = data.find((n: { id: string }) => n.id === noteId);
      if (note) {
        setTitle(note.title);
        if (note.content && editor) editor.commands.setContent(note.content);
        if (note.understanding_score != null) setScore(note.understanding_score);
        if (note.gap_analysis?.feedback) setFeedbackText(note.gap_analysis.feedback);
      }
    });
    api.get(`/notes/${noteId}/ai-comments`).then(({ data }) => setAiComments(data));
    api.get(`/notes/${noteId}/tags`).then(({ data }) => setTags(data)).catch(() => {});
    api.get(`/courses/${courseId}/materials`).then(({ data }) => {
      setMaterials(data);
      const matParam = searchParams.get("material");
      if (matParam) {
        const found = data.find((m: CourseMaterial) => m.id === matParam);
        if (found) setSelectedMaterial(found);
      }
    }).catch(() => {});
  }, [noteId, courseId, editor, searchParams]);

  // ── 저장 & 분석 ───────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!editor || !courseId) return;
    const content = editor.getJSON();
    if (noteId && noteId !== "new") {
      await api.patch(`/notes/${noteId}`, { title, content });
    } else {
      const { data } = await api.post(`/courses/${courseId}/notes`, { title, content });
      navigate(`/courses/${courseId}/notes/${data.id}`, { replace: true });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [editor, courseId, noteId, title, navigate]);

  const handleAskAi = useCallback(async () => {
    const q = chatInput.trim();
    if (!q || chatLoading) return;
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", text: q }]);
    setChatLoading(true);
    try {
      const note_content = editor ? editor.getJSON() : undefined;
      const { data } = await api.post("/notes/ask", { question: q, note_content });
      setChatMessages((prev) => [...prev, { role: "ai", text: data.answer }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: "ai", text: "응답 중 오류가 발생했습니다." }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, editor]);

  useLayoutEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  const handlePolish = useCallback(async () => {
    if (!editor || !noteId || noteId === "new") return;
    setPolishing(true);
    try {
      const content = editor.getJSON();
      const { data } = await api.post(`/notes/${noteId}/polish`, { content });
      setPolishedMarkdown(data.polished_markdown);
      setDraftMarkdown(data.polished_markdown);
      setPolishEditMode(false);
    } catch (err) {
      console.error("[polish]", err);
    } finally {
      setPolishing(false);
    }
  }, [editor, noteId]);

  const handlePolishReplace = useCallback(() => {
    if (!editor || !draftMarkdown) return;
    const timestamp = new Date().toISOString();
    editor.commands.setContent(draftMarkdown);
    const parsed = editor.getJSON();
    editor.commands.setContent({
      type: "doc",
      content: [{ type: "aiPolished", attrs: { timestamp }, content: parsed.content ?? [] }],
    });
    setPolishedMarkdown(null);
  }, [editor, draftMarkdown]);

  const handlePolishAppend = useCallback(() => {
    if (!editor || !draftMarkdown) return;
    const timestamp = new Date().toISOString();
    const currentJSON = editor.getJSON();
    editor.commands.setContent(draftMarkdown);
    const parsedPolished = editor.getJSON();
    editor.commands.setContent({
      type: "doc",
      content: [
        ...(currentJSON.content ?? []),
        { type: "aiPolished", attrs: { timestamp }, content: parsedPolished.content ?? [] },
      ],
    });
    setPolishedMarkdown(null);
  }, [editor, draftMarkdown]);

  const handleAnalyze = useCallback(async () => {
    if (!noteId || noteId === "new") return;
    setAnalyzing(true);
    try {
      const { data } = await api.post(`/notes/${noteId}/analyze`);
      if (data.understanding_score != null) setScore(data.understanding_score);
      if (data.feedback) setFeedbackText(data.feedback);
      const { data: comments } = await api.get(`/notes/${noteId}/ai-comments`);
      setAiComments(comments);
    } finally {
      setAnalyzing(false);
    }
  }, [noteId]);

  // ── 키보드 단축키 ─────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "s") { e.preventDefault(); handleSave(); }
      if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); handleAnalyze(); }
      if (e.ctrlKey && e.key === "/") { e.preventDefault(); setShowShortcuts((v) => !v); }
      if (e.key === "Escape") { setShowShortcuts(false); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave, handleAnalyze]);

  // ── [[ 노트 링크 ─────────────────────────────────────
  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      const { state } = editor;
      const { from } = state.selection;
      const textBefore = state.doc.textBetween(Math.max(0, from - 2), from);
      if (textBefore === "[[") {
        // Delete the [[ characters
        editor.chain().deleteRange({ from: from - 2, to: from }).run();
        setNoteLinkSearch(true);
        setNoteLinkQuery("");
        // Load all notes for search
        if (courseId) {
          api.get(`/courses/${courseId}/notes`).then(({ data }) => {
            setNoteLinkResults(data.filter((n: Note) => n.id !== noteId));
          });
        }
      }
    };
    editor.on("update", handler);
    return () => { editor.off("update", handler); };
  }, [editor, courseId, noteId]);

  const insertNoteLink = useCallback((targetNote: Note) => {
    if (!editor) return;
    editor.chain().focus().insertContent({
      type: "noteLink",
      attrs: { noteId: targetNote.id, title: targetNote.title },
    }).run();
    setNoteLinkSearch(false);
  }, [editor]);

  // ── 태그 관리 ─────────────────────────────────────────
  const handleAddTag = useCallback(async () => {
    const t = tagInput.trim();
    if (!t || !noteId || noteId === "new") return;
    try {
      const { data } = await api.post(`/notes/${noteId}/tags`, { tag: t });
      setTags((prev) => prev.some((x) => x.tag === t) ? prev : [...prev, data]);
      setTagInput("");
    } catch { /* silent */ }
  }, [tagInput, noteId]);

  const handleRemoveTag = useCallback(async (tagId: string) => {
    if (!noteId) return;
    try {
      await api.delete(`/notes/${noteId}/tags/${tagId}`);
      setTags((prev) => prev.filter((t) => t.id !== tagId));
    } catch { /* silent */ }
  }, [noteId]);

  const insertLink = () => {
    if (!editor) return;
    if (!linkUrl.trim()) { editor.chain().focus().unsetLink().run(); }
    else { editor.chain().focus().setLink({ href: linkUrl.trim() }).run(); }
    setLinkUrl(""); setShowLinkInput(false);
  };

  const isInTable = editor?.isActive("table") ?? false;

  return (
    <div className="editor-page">
      {/* ── 상단 헤더 — 깔끔한 한 줄 ── */}
      <header className="editor-topbar">
        <div className="topbar-left">
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <input
            className="note-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="노트 제목"
          />
        </div>
        <div className="topbar-right">
          {saved && <span className="topbar-saved">저장됨</span>}
          <button className="topbar-action" onClick={handleSave} title="저장 (Ctrl+S)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
            </svg>
            저장
          </button>
          {(score != null || !!feedbackText) && (
            <button className="topbar-action ai" onClick={handlePolish}
              disabled={polishing || noteId === "new"}>
              {polishing ? "..." : "AI 다듬기"}
            </button>
          )}
          <button className="topbar-action primary" onClick={handleAnalyze}
            disabled={analyzing || noteId === "new"}>
            {analyzing ? "분석 중..." : "AI 분석"}
          </button>
          <button className="topbar-icon-btn" onClick={() => setShowShortcuts(true)} title="단축키 (Ctrl+/)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="8" x2="6" y2="8"/><line x1="10" y1="8" x2="14" y2="8"/><line x1="18" y1="8" x2="18" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          </button>
        </div>
      </header>

      <div className="editor-layout">
        <div className={`editor-main note-editor${isProfessor ? " show-ai-marks" : ""}`}>
          {/* ── 간결한 툴바 — 드롭다운 그룹 ── */}
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
                <DRow icon="🖼" label="이미지" onClick={() => { const u = prompt("이미지 URL"); if (u) editor.chain().focus().setImage({ src: u }).run(); }} />
                <DRow icon="🔗" label="링크" onClick={() => { setShowLinkInput(true); setLinkUrl(editor.getAttributes("link").href || ""); }} />
                <DRow icon="∑" label="인라인 수식" onClick={() => editor.chain().focus().insertContent({ type: "mathInline", attrs: { formula: "" } }).run()} />
                <DRow icon="∫" label="수식 블록" onClick={() => editor.chain().focus().insertContent({ type: "mathBlock", attrs: { formula: "" } }).run()} />
                <DRow icon="📄" label="하위 페이지" onClick={() => editor.chain().focus().insertContent({ type: "subNote", attrs: { noteId: null, title: "새 하위 노트" } }).run()} />
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
                  <DropMenu label="표">
                    <DRow icon="+→" label="열 추가" onClick={() => editor.chain().focus().addColumnAfter().run()} />
                    <DRow icon="+↓" label="행 추가" onClick={() => editor.chain().focus().addRowAfter().run()} />
                    <DRow icon="-→" label="열 삭제" onClick={() => editor.chain().focus().deleteColumn().run()} />
                    <DRow icon="-↓" label="행 삭제" onClick={() => editor.chain().focus().deleteRow().run()} />
                    <DRow icon="⊟" label="병합/분리" onClick={() => editor.chain().focus().mergeOrSplit().run()} />
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

          {/* ── 버블 메뉴 ── */}
          {editor && (
            <BubbleMenu editor={editor} tippyOptions={{ duration: 150, placement: "top" }}>
              <div className="bubble-menu">
                <button className={`bubble-btn ${editor.isActive("bold") ? "active" : ""}`} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}><strong>B</strong></button>
                <button className={`bubble-btn ${editor.isActive("italic") ? "active" : ""}`} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}><em>I</em></button>
                <button className={`bubble-btn ${editor.isActive("underline") ? "active" : ""}`} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}><u>U</u></button>
                <button className={`bubble-btn ${editor.isActive("strike") ? "active" : ""}`} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}><s>S</s></button>
                <div className="bubble-divider" />
                <button className={`bubble-btn ${editor.isActive("highlight") ? "active" : ""}`} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHighlight({ color: "#ffd700" }).run(); }}>H</button>
                <button className={`bubble-btn ${editor.isActive("link") ? "active" : ""}`} onMouseDown={(e) => { e.preventDefault(); setShowLinkInput(true); setLinkUrl(editor.getAttributes("link").href || ""); }}>Link</button>
              </div>
            </BubbleMenu>
          )}

          <EditorContent editor={editor} />

          {/* ── AI 다듬기 제안 패널 ── */}
          {polishedMarkdown !== null && (
            <div className="polish-panel">
              <div className="polish-panel-header">
                <div className="polish-panel-title">
                  <strong>AI 다듬기 제안</strong>
                  <span className="polish-panel-hint">내용은 그대로, 구조와 형식을 정리했어요</span>
                </div>
                <button className={`btn btn-ghost polish-toggle ${polishEditMode ? "active" : ""}`}
                  onClick={() => setPolishEditMode((v) => !v)}>
                  {polishEditMode ? "미리보기" : "편집"}
                </button>
              </div>
              <div className="polish-panel-body">
                {polishEditMode ? (
                  <textarea className="polish-textarea" value={draftMarkdown}
                    onChange={(e) => setDraftMarkdown(e.target.value)} spellCheck={false} />
                ) : (
                  <div className="polish-preview rendered-markdown"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(draftMarkdown) }} />
                )}
              </div>
              <div className="polish-panel-actions">
                <button className="btn btn-primary" onClick={handlePolishReplace}>수정하기</button>
                <button className="btn btn-secondary" onClick={handlePolishAppend}>붙이기</button>
                <button className="btn btn-ghost" onClick={() => setPolishedMarkdown(null)}>취소</button>
              </div>
            </div>
          )}
        </div>

        {/* ── 사이드바 (탭: 자료 | AI) ── */}
        <div className="editor-sidebar">
          {/* 탭 헤더 */}
          <div className="sidebar-tabs">
            {materials.length > 0 && (
              <button className={`sidebar-tab${sidebarTab === "material" ? " active" : ""}`}
                onClick={() => setSidebarTab("material")}>
                자료
              </button>
            )}
            <button className={`sidebar-tab${sidebarTab === "ai" ? " active" : ""}`}
              onClick={() => setSidebarTab("ai")}>
              AI 도우미
            </button>
            <button className={`sidebar-tab${sidebarTab === "map" ? " active" : ""}`}
              onClick={() => setSidebarTab("map")}>
              지도
            </button>
          </div>

          {/* ── 자료 탭 ── */}
          {sidebarTab === "material" && (
            <div className="sidebar-tab-content">
              {!selectedMaterial ? (
                <div className="sidebar-material-list">
                  {materials.map((m) => {
                    const ext = m.file_name.split(".").pop()?.toLowerCase() || "";
                    const icon = ext === "pdf" ? "PDF" : ["ppt","pptx"].includes(ext) ? "PPT" : ["doc","docx"].includes(ext) ? "DOC" : ["hwp","hwpx"].includes(ext) ? "HWP" : "FILE";
                    return (
                      <button key={m.id} className="ws-list-item" onClick={() => setSelectedMaterial(m)}>
                        <span className="ws-list-icon">{icon}</span>
                        <div className="ws-list-text">
                          <div className="ws-list-title">{m.title}</div>
                          <div className="ws-list-meta">{m.file_name}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="sidebar-material-viewer">
                  <div className="sidebar-material-viewer-bar">
                    <button className="btn btn-ghost" style={{ fontSize: 12, padding: "2px 8px" }}
                      onClick={() => setSelectedMaterial(null)}>
                      ← 목록
                    </button>
                    <span className="sidebar-material-viewer-title">{selectedMaterial.title}</span>
                  </div>
                  <MaterialEmbedPanel material={selectedMaterial} />
                </div>
              )}
            </div>
          )}

          {/* ── AI 탭 ── */}
          {sidebarTab === "ai" && (
            <div className="sidebar-tab-content sidebar-ai-tab">
              {/* AI 채팅 */}
              <div className="chat-sidebar-section">
                <div className="chat-sidebar-header">
                  <span className="chat-sidebar-icon">AI</span>
                  <span className="chat-sidebar-title">도우미</span>
                  {chatMessages.length > 0 && (
                    <button className="chat-clear-btn" onClick={() => setChatMessages([])} title="대화 초기화">↺</button>
                  )}
                </div>
                <div className="chat-messages">
                  {chatMessages.length === 0 && (
                    <div className="chat-empty">
                      <div className="chat-empty-icon">?</div>
                      <div>모르는 개념이나 궁금한 점을<br />바로 물어보세요</div>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`chat-bubble-wrap chat-bubble-wrap-${msg.role}`}>
                      {msg.role === "ai" && <div className="chat-avatar">AI</div>}
                      <div className={`chat-bubble chat-bubble-${msg.role}`}>
                        {msg.role === "ai" ? (
                          <div className="rendered-markdown"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }} />
                        ) : msg.text}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="chat-bubble-wrap chat-bubble-wrap-ai">
                      <div className="chat-avatar">AI</div>
                      <div className="chat-bubble chat-bubble-ai chat-bubble-loading">
                        <span className="chat-dots"><span/><span/><span/></span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="chat-input-row">
                  <input className="chat-input" placeholder="질문을 입력하세요..." value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAskAi(); } }}
                    disabled={chatLoading} />
                  <button className="chat-send-btn" onClick={handleAskAi}
                    disabled={chatLoading || !chatInput.trim()} title="전송 (Enter)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* AI 코멘트 */}
              {aiComments.length > 0 && (
                <div className="sidebar-section">
                  <h3>AI 코멘트</h3>
                  {aiComments.map((c) => (
                    <div key={c.id} className={`ai-comment ${c.is_correct ? "correct" : "incorrect"}`}>
                      <div className="comment-target">"{c.target_text}"</div>
                      <div className="comment-text">{c.comment}</div>
                    </div>
                  ))}
                </div>
              )}

              {(score != null || feedbackText) && (
                <div className="sidebar-section">
                  {score != null && (
                    <>
                      <h3>이해도 점수</h3>
                      <div className="understanding-score">
                        {score}<span style={{ fontSize: 18, fontWeight: 400 }}>%</span>
                      </div>
                    </>
                  )}
                  {feedbackText && (
                    <div className="feedback-text rendered-markdown" style={{ marginTop: 12 }}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(feedbackText) }} />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── 지도 탭 ── */}
          {sidebarTab === "map" && (
            <div className="sidebar-tab-content">
              <MiniNoteTree />
            </div>
          )}
        </div>
      </div>

      {/* ── 태그 바 ── */}
      {noteId && noteId !== "new" && (
        <div className="note-tag-bar">
          {tags.map((t) => (
            <span key={t.id} className="note-tag">
              #{t.tag}
              <button className="note-tag-remove" onClick={() => handleRemoveTag(t.id)}>&times;</button>
            </span>
          ))}
          <input
            className="note-tag-input"
            placeholder="태그 추가..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleAddTag(); }
            }}
          />
        </div>
      )}

      {/* ── [[ 노트 링크 검색 팝업 ── */}
      {noteLinkSearch && (
        <div className="note-link-overlay" onClick={() => setNoteLinkSearch(false)}>
          <div className="note-link-popup" ref={noteLinkRef} onClick={(e) => e.stopPropagation()}>
            <input
              className="note-link-search-input"
              placeholder="노트 검색..."
              value={noteLinkQuery}
              onChange={(e) => setNoteLinkQuery(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") setNoteLinkSearch(false);
              }}
            />
            <div className="note-link-results">
              {noteLinkResults
                .filter((n) => n.title.toLowerCase().includes(noteLinkQuery.toLowerCase()))
                .slice(0, 8)
                .map((n) => (
                  <button key={n.id} className="note-link-result" onClick={() => insertNoteLink(n)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span>{n.title}</span>
                    {n.understanding_score != null && (
                      <span className="note-link-result-score">{n.understanding_score}%</span>
                    )}
                  </button>
                ))}
              {noteLinkResults.filter((n) => n.title.toLowerCase().includes(noteLinkQuery.toLowerCase())).length === 0 && (
                <div className="note-link-empty">검색 결과 없음</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 단축키 도움말 ── */}
      {showShortcuts && (
        <div className="shortcuts-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>키보드 단축키</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <tbody>
                {SHORTCUTS.map(({ key, desc }) => (
                  <tr key={key} style={{ borderBottom: "1px solid var(--outline-variant)" }}>
                    <td style={{ padding: "8px 12px 8px 0" }}><code className="shortcut-key">{key}</code></td>
                    <td style={{ padding: "8px 0", color: "var(--on-surface-variant)" }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="btn btn-secondary" style={{ marginTop: 20, width: "100%" }} onClick={() => setShowShortcuts(false)}>닫기 (Esc)</button>
          </div>
        </div>
      )}
    </div>
  );
}
