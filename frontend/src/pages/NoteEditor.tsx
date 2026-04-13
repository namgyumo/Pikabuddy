import { useEffect, useState, useRef, useCallback, useLayoutEffect } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import { Extension } from "@tiptap/core";
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
import { useAuthStore, getAdminToken } from "../store/authStore";
import { supabase } from "../lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
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
import { CitationExtension } from "../lib/CitationExtension";
import { CodeBlockExtension } from "../lib/CodeBlockExtension";
import GlobalContextMenu from "../components/common/GlobalContextMenu";
import * as Y from "yjs";
import { ySyncPlugin, ySyncPluginKey, yCursorPlugin, yCursorPluginKey, yUndoPlugin, yUndoPluginKey, prosemirrorJSONToYXmlFragment } from "y-prosemirror";
import { SupabaseYjsProvider, getCollabColor } from "../lib/SupabaseYjsProvider";
import MiniNoteTree from "../components/MiniNoteTree";
import CommentsPanel from "../components/comments/CommentsPanel";
import BlockCommentOverlay from "../components/comments/BlockCommentOverlay";
import NoteSnapshotPanel from "../components/NoteSnapshotPanel";
import { useCommentStore } from "../store/commentStore";
import type { Note, Team } from "../types";

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
  const { courseId, noteId, studentId } = useParams<{ courseId: string; noteId: string; studentId?: string }>();
  const isReviewMode = !!studentId; // 교수가 학생 노트를 리뷰하는 모드
  const [title, setTitle] = useState("새 노트");
  const [aiComments, setAiComments] = useState<AiComment[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showCitationInput, setShowCitationInput] = useState(false);
  const [citationSource, setCitationSource] = useState("");
  const [citationSourceUrl, setCitationSourceUrl] = useState("");
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
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const fromNotification = (location.state as { fromNotification?: boolean })?.fromNotification;
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<CourseMaterial | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"ai" | "material" | "map" | "comments" | "history">(
    fromNotification ? "comments" : isReviewMode ? "comments" : searchParams.get("material") ? "material" : "ai"
  );
  const [noteOwnerId, setNoteOwnerId] = useState<string>("");
  const [noteTeamId, setNoteTeamId] = useState<string | null>(null);
  const [teamInfo, setTeamInfo] = useState<Team | null>(null);
  const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null);
  const editorMainRef = useRef<HTMLDivElement>(null);
  const [tags, setTags] = useState<{ id: string; tag: string }[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [noteLinkSearch, setNoteLinkSearch] = useState(false);
  const [noteLinkQuery, setNoteLinkQuery] = useState("");
  const [noteLinkResults, setNoteLinkResults] = useState<Note[]>([]);
  const noteLinkRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const [teamPresence, setTeamPresence] = useState<{ userId: string; name: string; avatarUrl: string | null }[]>([]);
  const [remoteUpdatePending, setRemoteUpdatePending] = useState(false);

  // Heading Backspace fix: convert heading to paragraph when pressing Backspace at position 0
  const HeadingBackspaceFix = Extension.create({
    name: "headingBackspaceFix",
    addKeyboardShortcuts() {
      return {
        Backspace: ({ editor: ed }) => {
          const { $from, empty } = ed.state.selection;
          // Only handle when cursor is at the very start of a heading block
          if (!empty || $from.parentOffset !== 0 || !$from.parent.type.name.startsWith("heading")) {
            return false; // let default handler run
          }
          // If heading is empty, convert to paragraph
          if ($from.parent.textContent === "") {
            return ed.commands.setParagraph();
          }
          // If at start of heading with content, convert to paragraph (remove heading formatting)
          if ($from.index(0) === 0 || $from.nodeBefore === null) {
            return ed.commands.setParagraph();
          }
          return false;
        },
      };
    },
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
      }),
      CodeBlockExtension,
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
      Link.configure({
        openOnClick: isReviewMode,
        HTMLAttributes: { class: "note-link", target: "_blank", rel: "noopener noreferrer" },
      }),
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
      BlockHandleExtension.configure({ isReviewMode }),
      ToggleExtension,
      CalloutExtension,
      CitationExtension,
      HeadingBackspaceFix,
    ],
    content: "",
  });

  // ── 데이터 로드 ───────────────────────────────────────
  useEffect(() => {
    if (!noteId || noteId === "new" || !courseId) return;

    // Helper to apply note data once loaded
    const applyNote = (note: Record<string, unknown>, ownerFallback: string) => {
      setTitle(note.title as string);
      setNoteOwnerId((note.student_id as string) || ownerFallback);
      setNoteTeamId((note.team_id as string) || null);
      if (note.content && editor) {
        editor.commands.setContent(note.content as Record<string, unknown>);
        if (isReviewMode) editor.setEditable(false);
      }
      if (note.understanding_score != null) setScore(note.understanding_score as number);
      if ((note.gap_analysis as Record<string, unknown>)?.feedback) setFeedbackText((note.gap_analysis as Record<string, unknown>).feedback as string);
      if (note.team_id) {
        api.get(`/courses/${courseId}/teams/${note.team_id}`).then(({ data: t }) => setTeamInfo(t)).catch(() => {});
      }
    };

    // Fire all independent requests in parallel
    const notesUrl = isReviewMode && studentId
      ? `/courses/${courseId}/notes?student_id=${studentId}`
      : `/courses/${courseId}/notes`;

    Promise.all([
      api.get(notesUrl).catch(() => ({ data: [] })),
      api.get(`/notes/${noteId}/ai-comments`).catch(() => ({ data: [] })),
      api.get(`/notes/${noteId}/tags`).catch(() => ({ data: [] })),
      api.get(`/courses/${courseId}/materials`).catch(() => ({ data: [] })),
    ]).then(([notesRes, aiCommentsRes, tagsRes, matsRes]) => {
      // Apply note
      const note = (notesRes.data || []).find((n: { id: string }) => n.id === noteId);
      if (note) applyNote(note, isReviewMode && studentId ? studentId : user?.id || "");
      // Apply side data
      setAiComments(aiCommentsRes.data);
      setTags(tagsRes.data);
      setMaterials(matsRes.data);
      const matParam = searchParams.get("material");
      if (matParam) {
        const found = matsRes.data.find((m: CourseMaterial) => m.id === matParam);
        if (found) setSelectedMaterial(found);
      }
    });
    // Comments are in their own store — fire in parallel
    useCommentStore.getState().fetchComments(noteId);
    useCommentStore.getState().fetchCounts(noteId);
  }, [noteId, courseId, editor, searchParams, isReviewMode, studentId, user?.id]);

  // ── 팀 노트 실시간 협업 (Yjs + Supabase Realtime) ──────────────────
  const ydocRef = useRef<Y.Doc | null>(null);
  const yjsProviderRef = useRef<SupabaseYjsProvider | null>(null);

  useEffect(() => {
    if (!noteTeamId || !noteId || noteId === "new" || !user?.id || !editor) return;

    // ── 1. Yjs 문서 + 프로바이더 생성 ──
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

    // ── 2. 동기화 완료 후 플러그인 등록 (콘텐츠 중복 방지) ──
    let pluginsRegistered = false;
    provider.onSynced = (hasPeers: boolean) => {
      if (pluginsRegistered || !editor || editor.isDestroyed) return;
      pluginsRegistered = true;

      if (!hasPeers && savedContent?.content?.length) {
        // 첫 번째 클라이언트 — 저장된 내용으로 Y.Doc 초기화
        prosemirrorJSONToYXmlFragment(editor.schema, savedContent, fragment);
      }
      // ProseMirror ↔ Y.Doc 동기화 플러그인 등록
      try {
        editor.registerPlugin(ySyncPlugin(fragment));
        editor.registerPlugin(yUndoPlugin());
        editor.registerPlugin(yCursorPlugin(provider.awareness));
      } catch (e) {
        console.warn("[Collab] Plugin registration error:", e);
      }
    };

    // ── 3. Supabase 채널 구독 (Presence + Yjs 동기화) ──
    const channelName = `team-collab:${noteId}`;
    const channel = supabase.channel(channelName, { config: { presence: { key: user.id } } });

    // Presence: 편집 중인 팀원 표시
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const members: { userId: string; name: string; avatarUrl: string | null }[] = [];
      for (const [, presences] of Object.entries(state)) {
        for (const p of presences as { userId: string; name: string; avatarUrl: string | null }[]) {
          if (p.userId !== user.id) {
            members.push({ userId: p.userId, name: p.name, avatarUrl: p.avatarUrl });
          }
        }
      }
      setTeamPresence(members);
    });

    // 브로드캐스트 리스너를 subscribe 전에 등록 (메시지 유실 방지)
    provider.connect(channel);

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          userId: user.id,
          name: user.name || "Unknown",
          avatarUrl: user.avatar_url || null,
        });
        // 구독 완료 후 피어에게 동기화 요청
        provider.requestSync();
      }
    });

    realtimeChannelRef.current = channel;

    return () => {
      // 플러그인 해제
      try { editor.unregisterPlugin(ySyncPluginKey); } catch { /* ignore */ }
      try { editor.unregisterPlugin(yCursorPluginKey); } catch { /* ignore */ }
      try { editor.unregisterPlugin(yUndoPluginKey); } catch { /* ignore */ }
      // 프로바이더 정리
      provider.destroy();
      ydoc.destroy();
      ydocRef.current = null;
      yjsProviderRef.current = null;
      // 채널 해제
      channel.unsubscribe();
      realtimeChannelRef.current = null;
    };
  }, [noteTeamId, noteId, user?.id, user?.name, editor]);

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
    // 팀 노트면 실시간 채널로 저장 알림 브로드캐스트
    if (noteTeamId && realtimeChannelRef.current) {
      realtimeChannelRef.current.send({
        type: "broadcast",
        event: "note-saved",
        payload: { userId: user?.id, timestamp: Date.now() },
      });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [editor, courseId, noteId, title, navigate, noteTeamId, user?.id]);

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
    setFeedbackText("");

    try {
      // Get auth headers for raw fetch
      const adminToken = getAdminToken() || sessionStorage.getItem("admin_token");
      const headers: Record<string, string> = {};
      if (adminToken) {
        headers["Authorization"] = `Bearer ${adminToken}`;
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }
      }

      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8001/api";
      const response = await fetch(`${API_BASE}/notes/${noteId}/analyze-stream`, { headers });

      if (!response.ok) {
        // Fallback to non-streaming endpoint
        const { data } = await api.post(`/notes/${noteId}/analyze`);
        if (data.understanding_score != null) setScore(data.understanding_score);
        if (data.feedback) setFeedbackText(data.feedback);
      } else {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          let buffer = "";
          const processLine = (line: string) => {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "chunk") {
                  setFeedbackText((prev) => prev + data.text);
                } else if (data.type === "done") {
                  if (data.score != null) setScore(data.score);
                } else if (data.type === "error") {
                  setFeedbackText((prev) => prev || `오류: ${data.text}`);
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
      }

      // Fetch AI comments after analysis completes
      const { data: comments } = await api.get(`/notes/${noteId}/ai-comments`);
      setAiComments(comments);
    } catch {
      setFeedbackText((prev) => prev || "분석 중 오류가 발생했습니다.");
    } finally {
      setAnalyzing(false);
    }
  }, [noteId]);

  // ── 자동 저장 (3초 idle) ──────────────────────────────
  const autoSaveRef = useRef<ReturnType<typeof setTimeout>>();
  const autoSaveEnabled = !isReviewMode && noteId !== "new" && !!noteId;

  useEffect(() => {
    if (!editor || !autoSaveEnabled) return;
    const handler = () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
      autoSaveRef.current = setTimeout(() => {
        handleSave();
      }, 3000);
    };
    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
  }, [editor, autoSaveEnabled, handleSave]);

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

  // ── 우클릭 메뉴 커맨드 수신 ──────────────────────────────
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
        case "insertImage": {
          const u = prompt("이미지 URL");
          if (u) chain.setImage({ src: u }).run();
          break;
        }
        case "setHorizontalRule": chain.setHorizontalRule().run(); break;
        case "insertMath": chain.insertContent({ type: "mathInline", attrs: { formula: "" } }).run(); break;
        case "setTextAlign": chain.setTextAlign(args?.alignment || "left").run(); break;
        case "deleteNode": {
          // Delete current block node
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

  // ── Ctrl+클릭으로 링크 열기 ──────────────────────────────
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const onClick = (e: MouseEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const target = e.target as HTMLElement;
      const link = target.closest("a.note-link") as HTMLAnchorElement;
      if (link?.href) {
        e.preventDefault();
        window.open(link.href, "_blank");
      }
    };
    dom.addEventListener("click", onClick);
    return () => dom.removeEventListener("click", onClick);
  }, [editor]);

  // ── [[ 노트 링크 ─────────────────────────────────────
  const openNoteLinkPopup = useCallback(() => {
    setNoteLinkSearch(true);
    setNoteLinkQuery("");
    if (courseId) {
      api.get(`/courses/${courseId}/notes`).then(({ data }) => {
        setNoteLinkResults(data.filter((n: Note) => n.id !== noteId));
      });
    }
  }, [courseId, noteId]);

  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      const { state } = editor;
      const { from } = state.selection;
      const textBefore = state.doc.textBetween(Math.max(0, from - 2), from);
      if (textBefore === "[[") {
        // Delete the [[ characters
        editor.chain().deleteRange({ from: from - 2, to: from }).run();
        openNoteLinkPopup();
      }
    };
    editor.on("update", handler);
    return () => { editor.off("update", handler); };
  }, [editor, openNoteLinkPopup]);

  // ── 슬래시 커맨드 이벤트 리스너 (링크, 노트 링크) ──
  useEffect(() => {
    const handleInsertLink = () => {
      setShowLinkInput(true);
      setLinkUrl(editor?.getAttributes("link").href || "");
    };
    const handleInsertNoteLink = () => {
      openNoteLinkPopup();
    };
    const handleInsertCitation = () => {
      setShowCitationInput(true);
      setCitationSource("");
      setCitationSourceUrl("");
    };
    window.addEventListener("editor-insert-link", handleInsertLink);
    window.addEventListener("editor-insert-notelink", handleInsertNoteLink);
    window.addEventListener("editor-insert-citation", handleInsertCitation);
    return () => {
      window.removeEventListener("editor-insert-link", handleInsertLink);
      window.removeEventListener("editor-insert-notelink", handleInsertNoteLink);
      window.removeEventListener("editor-insert-citation", handleInsertCitation);
    };
  }, [editor, openNoteLinkPopup]);

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

  // Focus link input reliably (autoFocus alone can lose to ProseMirror)
  useEffect(() => {
    if (showLinkInput) {
      requestAnimationFrame(() => linkInputRef.current?.focus());
    }
  }, [showLinkInput]);

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

  return (
    <div className="editor-page">
      <GlobalContextMenu />
      {/* ── 상단 헤더 — 깔끔한 한 줄 ── */}
      <header className="editor-topbar">
        <div className="topbar-left">
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <input
            className="note-title-input"
            value={title}
            onChange={(e) => !isReviewMode && setTitle(e.target.value)}
            placeholder="노트 제목"
            readOnly={isReviewMode}
          />
          {isReviewMode && <span className="review-mode-badge">리뷰 모드 (읽기 전용)</span>}
          {remoteUpdatePending && (
            <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600, animation: "pulse 1s infinite" }}>
              동기화 중...
            </span>
          )}
          {teamPresence.length > 0 && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px",
              background: "rgba(0,180,0,0.1)", borderRadius: "var(--radius-sm)", fontSize: 11, color: "#22863a",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22863a", animation: "pulse 2s infinite" }} />
              {teamPresence.map((m) => m.name).join(", ")} 편집 중
            </span>
          )}
          {teamInfo && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px",
              background: "var(--tertiary-container)", color: "var(--on-tertiary-container)",
              borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 600, marginLeft: 8,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              {teamInfo.name}
              <span style={{ display: "inline-flex", gap: 2 }}>
                {(teamInfo.members || []).slice(0, 5).map((m) => (
                  <span key={m.student_id} title={m.name} style={{
                    width: 18, height: 18, borderRadius: "50%", overflow: "hidden",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    background: "var(--primary)", color: "#fff", fontSize: 9, fontWeight: 700,
                    border: "1.5px solid var(--tertiary-container)",
                  }}>
                    {m.avatar_url
                      ? <img src={m.avatar_url} alt="" style={{ width: "100%", height: "100%" }} />
                      : m.name.charAt(0)}
                  </span>
                ))}
              </span>
            </span>
          )}
        </div>
        <div className="topbar-right">
          {!isReviewMode && (
            <>
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
            </>
          )}
        </div>
      </header>

      <div className="editor-layout">
        <div ref={editorMainRef} className={`editor-main note-editor${isProfessor ? " show-ai-marks" : ""}`} style={{ position: "relative" }}>
          {/* ── 간결한 툴바 — 드롭다운 그룹 ── */}
          {editor && !isReviewMode && (
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
            <div className="toolbar-popup" style={{ position: "absolute", top: 100, left: 60, zIndex: 10001 }}>
              <input ref={linkInputRef} className="input" style={{ fontSize: 13, padding: "6px 10px", width: 260 }} placeholder="URL (빈 칸이면 링크 제거)" value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") insertLink(); if (e.key === "Escape") setShowLinkInput(false); }} autoFocus />
              <button className="btn btn-primary" style={{ fontSize: 12, padding: "4px 12px" }} onClick={insertLink}>적용</button>
            </div>
          )}

          {/* 출처 인용 입력 팝업 */}
          {showCitationInput && (
            <div className="toolbar-popup citation-input-popup" style={{ position: "absolute", top: 100, left: 60, zIndex: 10001 }}>
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

          {/* ── 버블 메뉴 ── */}
          {editor && !isReviewMode && (
            <BubbleMenu editor={editor} tippyOptions={{ duration: 150, placement: "top" }}
              shouldShow={({ editor }) => {
                // 표 안에서는 별도 표 버블메뉴가 뜨므로 여기선 숨김
                if (editor.isActive("table") || editor.isActive("tableCell") || editor.isActive("tableHeader")) return false;
                return editor.state.selection.content().size > 0;
              }}
            >
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

          {/* ── 표 전용 버블 메뉴 ── */}
          {editor && !isReviewMode && (
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

          {/* 블록별 인라인 코멘트 오버레이 — 코멘트가 있으면 항상 > 뱃지 표시 */}
          {editor && noteId && noteId !== "new" && (
            <BlockCommentOverlay
              editorRef={editorMainRef}
              noteId={noteId}
              noteOwnerId={noteOwnerId || user?.id || ""}
              currentUserId={user?.id || ""}
              currentUserRole={user?.role || ""}
              isReviewMode={isReviewMode}
            />
          )}

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
            {(isReviewMode || noteId !== "new") && (
              <button className={`sidebar-tab${sidebarTab === "comments" ? " active" : ""}`}
                onClick={() => setSidebarTab("comments")}>
                코멘트
                {useCommentStore.getState().counts.unresolved > 0 && (
                  <span className="sidebar-tab-badge">{useCommentStore.getState().counts.unresolved}</span>
                )}
              </button>
            )}
            {noteTeamId && noteId && noteId !== "new" && (
              <button className={`sidebar-tab${sidebarTab === "history" ? " active" : ""}`}
                onClick={() => setSidebarTab("history")}>
                히스토리
              </button>
            )}
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

          {sidebarTab === "comments" && noteId && noteId !== "new" && (
            <div className="sidebar-tab-content">
              <CommentsPanel
                noteId={noteId}
                noteOwnerId={noteOwnerId || user?.id || ""}
                currentUserId={user?.id || ""}
                currentUserRole={user?.role || ""}
                activeBlockIndex={activeBlockIndex}
                onBlockClick={(idx) => setActiveBlockIndex(idx)}
              />
            </div>
          )}

          {sidebarTab === "history" && noteId && noteId !== "new" && noteTeamId && (
            <div className="sidebar-tab-content" style={{ padding: 0 }}>
              <NoteSnapshotPanel noteId={noteId} onRestore={(content) => {
                if (editor) {
                  editor.commands.setContent(content);
                }
              }} />
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
              {!isReviewMode && (
                <button className="note-tag-remove" onClick={() => handleRemoveTag(t.id)}>&times;</button>
              )}
            </span>
          ))}
          {!isReviewMode && (
            <input
              className="note-tag-input"
              placeholder="태그 추가..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleAddTag(); }
              }}
            />
          )}
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
