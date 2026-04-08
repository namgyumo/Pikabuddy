import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table/table";
import { TableRow } from "@tiptap/extension-table/row";
import { TableHeader } from "@tiptap/extension-table/header";
import { TableCell } from "@tiptap/extension-table/cell";
import { MathInline, MathBlock } from "../lib/MathExtension";
import api from "../lib/api";
import type { Note, CourseMaterial, Course } from "../types";

/* ── Pane types ── */
type PaneType = "material" | "note" | "note-list" | "material-list";

interface Pane {
  id: string;
  type: PaneType;
  title: string;
  resourceId?: string;
  url?: string;
}

interface SplitNode {
  id: string;
  direction: "horizontal" | "vertical";
  ratio: number;
  children: [SplitNode | LeafNode, SplitNode | LeafNode];
}

interface LeafNode {
  id: string;
  paneId: string;
}

type TreeNode = SplitNode | LeafNode;

function isLeaf(n: TreeNode): n is LeafNode {
  return "paneId" in n;
}

let nextId = 1;
function uid() { return `p${nextId++}`; }

/* ── Document viewer helpers ── */
function getFileExt(name: string) {
  return name.split(".").pop()?.toLowerCase() || "";
}

function getViewerUrl(fileUrl: string, ext: string): string | null {
  if (ext === "pdf") return fileUrl;
  if (["ppt", "pptx", "doc", "docx", "xls", "xlsx"].includes(ext)) {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
  }
  if (ext === "hwp" || ext === "hwpx") {
    return `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
  }
  return null;
}

function getFileIcon(ext: string) {
  if (ext === "pdf") return "PDF";
  if (["ppt", "pptx"].includes(ext)) return "PPT";
  if (["doc", "docx"].includes(ext)) return "DOC";
  if (["hwp", "hwpx"].includes(ext)) return "HWP";
  if (["xls", "xlsx"].includes(ext)) return "XLS";
  return "FILE";
}

/* ── DocumentEmbed: renders iframe or download fallback ── */
function DocumentEmbed({ url, title, fileUrl, fileName }: { url: string | null; title: string; fileUrl: string; fileName: string }) {
  const [loadError, setLoadError] = useState(false);

  if (url && !loadError) {
    return (
      <>
        <iframe
          src={url}
          style={{ width: "100%", height: "100%", border: "none" }}
          title={title}
          onError={() => setLoadError(true)}
        />
        <div className="doc-embed-bar">
          <a href={fileUrl} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ fontSize: 12 }}>
            새 탭에서 열기
          </a>
        </div>
      </>
    );
  }

  const ext = getFileExt(fileName);
  return (
    <div style={{ padding: 40, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1 }}>
      <div style={{ fontSize: 48, marginBottom: 16, fontWeight: 700, color: "var(--on-surface-variant)" }}>
        {getFileIcon(ext)}
      </div>
      <h3>{title}</h3>
      <p style={{ color: "var(--on-surface-variant)", marginBottom: 16 }}>{fileName}</p>
      {loadError && (
        <p style={{ color: "var(--warning)", fontSize: 13, marginBottom: 12 }}>
          미리보기를 불러올 수 없습니다. 다운로드하여 확인해주세요.
        </p>
      )}
      <a href={fileUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
        다운로드
      </a>
    </div>
  );
}

/* ── MaterialViewer ── */
function MaterialViewer({ material }: { material: CourseMaterial | undefined }) {
  if (!material) {
    return (
      <div className="ws-pane-body" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--on-surface-variant)" }}>
        자료를 불러올 수 없습니다.
      </div>
    );
  }
  const ext = getFileExt(material.file_name);
  const viewerUrl = getViewerUrl(material.file_url, ext);

  return (
    <div className="ws-pane-body" style={{ display: "flex", flexDirection: "column" }}>
      <DocumentEmbed url={viewerUrl} title={material.title} fileUrl={material.file_url} fileName={material.file_name} />
    </div>
  );
}

/* ── Inline Note Editor (editable in workspace) ── */
const wsEditorExtensions = [
  StarterKit.configure({ heading: { levels: [1, 2, 3] }, codeBlock: { HTMLAttributes: { class: "code-block" } } }),
  Placeholder.configure({ placeholder: "노트를 작성하세요..." }),
  Underline,
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Superscript,
  Subscript,
  TaskList,
  TaskItem.configure({ nested: true }),
  Link.configure({ openOnClick: false }),
  Image.configure({ inline: false }),
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
  MathInline,
  MathBlock,
];

function InlineNoteEditor({ note, courseId }: { note: Note | undefined; courseId: string }) {
  const [saved, setSaved] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteRef = useRef(note);
  noteRef.current = note;

  const editor = useEditor({
    extensions: wsEditorExtensions,
    content: note?.content || "",
    onUpdate: () => setSaved(false),
  }, [note?.id]);

  // Auto-save with debounce
  useEffect(() => {
    if (saved || !editor || !note) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const content = editor.getJSON();
      try {
        await api.patch(`/notes/${note.id}`, { title: note.title, content });
        setSaved(true);
      } catch { /* silent */ }
    }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [saved, editor, note]);

  if (!note) {
    return (
      <div className="ws-pane-body" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--on-surface-variant)" }}>
        노트를 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div className="ws-pane-body ws-note-editor">
      <div className="ws-note-status">
        <span style={{ fontSize: 12, color: saved ? "var(--success)" : "var(--on-surface-variant)" }}>
          {saved ? "저장됨" : "편집 중..."}
        </span>
        <a href={`/courses/${courseId}/notes/${note.id}`} target="_blank" rel="noreferrer"
          style={{ fontSize: 12, color: "var(--primary)" }}>
          전체 에디터 ↗
        </a>
      </div>
      <div className="ws-note-content note-editor">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

/* ── List panels ── */
function MaterialListPanel({ materials, onSelect }: { materials: CourseMaterial[]; onSelect: (m: CourseMaterial) => void }) {
  return (
    <div className="ws-pane-body ws-list">
      {materials.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--on-surface-variant)" }}>강의자료 없음</div>
      ) : materials.map((m) => (
        <button key={m.id} className="ws-list-item" onClick={() => onSelect(m)}>
          <span className="ws-list-icon">{getFileIcon(getFileExt(m.file_name))}</span>
          <div className="ws-list-text">
            <div className="ws-list-title">{m.title}</div>
            <div className="ws-list-meta">{m.file_name}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

function NoteListPanel({ notes, onSelect }: { notes: Note[]; onSelect: (n: Note) => void }) {
  return (
    <div className="ws-pane-body ws-list">
      {notes.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--on-surface-variant)" }}>노트 없음</div>
      ) : notes.map((n) => (
        <button key={n.id} className="ws-list-item" onClick={() => onSelect(n)}>
          <span className="ws-list-icon">N</span>
          <div className="ws-list-text">
            <div className="ws-list-title">{n.title}</div>
            <div className="ws-list-meta">{new Date(n.updated_at).toLocaleDateString("ko-KR")}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ── Resizer ── */
function Resizer({ direction, onResize }: { direction: "horizontal" | "vertical"; onResize: (delta: number) => void }) {
  const dragging = useRef(false);
  const lastPos = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    lastPos.current = direction === "horizontal" ? e.clientX : e.clientY;

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const cur = direction === "horizontal" ? ev.clientX : ev.clientY;
      onResize(cur - lastPos.current);
      lastPos.current = cur;
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      className={`ws-resizer ws-resizer-${direction}`}
      onMouseDown={onMouseDown}
    />
  );
}

/* ── Main Workspace ── */
export default function Workspace() {
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [panes, setPanes] = useState<Map<string, Pane>>(new Map());
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // Load data
  useEffect(() => {
    if (!courseId) return;
    Promise.all([
      api.get(`/courses/${courseId}`),
      api.get(`/courses/${courseId}/materials`).catch(() => ({ data: [] })),
      api.get(`/courses/${courseId}/notes`).catch(() => ({ data: [] })),
    ]).then(([cRes, mRes, nRes]) => {
      setCourse(cRes.data);
      setMaterials(mRes.data);
      setNotes(nRes.data);
      setDataLoaded(true);
    });
  }, [courseId]);

  // Initialize panes AFTER data is loaded
  useEffect(() => {
    if (!dataLoaded || initializedRef.current) return;
    initializedRef.current = true;

    const matId = searchParams.get("material");
    const newPanes = new Map<string, Pane>();

    const leftId = uid();
    const rightId = uid();

    if (matId) {
      const mat = materials.find((m) => m.id === matId);
      newPanes.set(leftId, {
        id: leftId, type: "material", title: mat?.title || "강의자료",
        resourceId: matId, url: mat?.file_url,
      });
    } else {
      newPanes.set(leftId, { id: leftId, type: "material-list", title: "강의자료" });
    }

    newPanes.set(rightId, { id: rightId, type: "note-list", title: "노트" });

    setPanes(newPanes);
    setTree({
      id: uid(),
      direction: "horizontal",
      ratio: 0.55,
      children: [
        { id: uid(), paneId: leftId },
        { id: uid(), paneId: rightId },
      ],
    });
  }, [dataLoaded, materials, searchParams]);

  // Replace pane content
  const replacePane = useCallback((paneId: string, newPane: Partial<Pane>) => {
    setPanes((prev) => {
      const next = new Map(prev);
      const existing = next.get(paneId);
      if (existing) next.set(paneId, { ...existing, ...newPane });
      return next;
    });
  }, []);

  // Split a pane
  const splitPane = useCallback((paneId: string, direction: "horizontal" | "vertical", newPaneData: Omit<Pane, "id">) => {
    const newId = uid();
    const newPane: Pane = { ...newPaneData, id: newId };

    setPanes((prev) => {
      const next = new Map(prev);
      next.set(newId, newPane);
      return next;
    });

    setTree((prev) => {
      if (!prev) return prev;
      function replace(node: TreeNode): TreeNode {
        if (isLeaf(node)) {
          if (node.paneId === paneId) {
            return {
              id: uid(),
              direction,
              ratio: 0.5,
              children: [node, { id: uid(), paneId: newId }],
            };
          }
          return node;
        }
        return { ...node, children: [replace(node.children[0]), replace(node.children[1])] };
      }
      return replace(prev);
    });
  }, []);

  // Close a pane
  const closePane = useCallback((paneId: string) => {
    setPanes((prev) => { const n = new Map(prev); n.delete(paneId); return n; });
    setTree((prev) => {
      if (!prev) return prev;
      function remove(node: TreeNode): TreeNode | null {
        if (isLeaf(node)) return node.paneId === paneId ? null : node;
        const left = remove(node.children[0]);
        const right = remove(node.children[1]);
        if (!left) return right;
        if (!right) return left;
        return { ...node, children: [left, right] };
      }
      return remove(prev);
    });
  }, []);

  // Resize handler
  const handleResize = useCallback((nodeId: string, delta: number) => {
    const container = containerRef.current;
    if (!container) return;
    setTree((prev) => {
      if (!prev) return prev;
      function update(node: TreeNode): TreeNode {
        if (isLeaf(node)) return node;
        if (node.id === nodeId) {
          const total = node.direction === "horizontal"
            ? container!.clientWidth
            : container!.clientHeight;
          const newRatio = Math.min(0.85, Math.max(0.15, node.ratio + delta / total));
          return { ...node, ratio: newRatio };
        }
        return { ...node, children: [update(node.children[0]), update(node.children[1])] };
      }
      return update(prev);
    });
  }, []);

  // Render tree
  function renderNode(node: TreeNode): React.ReactNode {
    if (isLeaf(node)) {
      const pane = panes.get(node.paneId);
      if (!pane) return null;

      return (
        <div className="ws-pane" key={node.id}>
          <div className="ws-pane-header">
            <span className="ws-pane-title">{pane.title}</span>
            <div className="ws-pane-actions">
              <button className="ws-pane-btn" title="좌우 분할"
                onClick={() => splitPane(pane.id, "horizontal", { type: "note-list", title: "노트" })}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
              </button>
              <button className="ws-pane-btn" title="상하 분할"
                onClick={() => splitPane(pane.id, "vertical", { type: "material-list", title: "강의자료" })}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/></svg>
              </button>
              <button className="ws-pane-btn" title="닫기" onClick={() => closePane(pane.id)}>&times;</button>
            </div>
          </div>
          {pane.type === "material" && (
            <MaterialViewer material={materials.find((m) => m.id === pane.resourceId)} />
          )}
          {pane.type === "note" && (
            <InlineNoteEditor
              note={notes.find((n) => n.id === pane.resourceId)}
              courseId={courseId || ""}
            />
          )}
          {pane.type === "material-list" && (
            <MaterialListPanel materials={materials} onSelect={(m) => replacePane(pane.id, {
              type: "material", title: m.title, resourceId: m.id, url: m.file_url,
            })} />
          )}
          {pane.type === "note-list" && (
            <NoteListPanel notes={notes} onSelect={(n) => replacePane(pane.id, {
              type: "note", title: n.title, resourceId: n.id,
            })} />
          )}
        </div>
      );
    }

    // Split node
    const style: React.CSSProperties = {
      display: "flex",
      flexDirection: node.direction === "horizontal" ? "row" : "column",
      width: "100%",
      height: "100%",
    };
    const firstSize = `${node.ratio * 100}%`;
    const secondSize = `${(1 - node.ratio) * 100}%`;

    return (
      <div style={style} key={node.id}>
        <div style={{ [node.direction === "horizontal" ? "width" : "height"]: firstSize, overflow: "hidden", display: "flex" }}>
          {renderNode(node.children[0])}
        </div>
        <Resizer direction={node.direction} onResize={(d) => handleResize(node.id, d)} />
        <div style={{ [node.direction === "horizontal" ? "width" : "height"]: secondSize, overflow: "hidden", display: "flex" }}>
          {renderNode(node.children[1])}
        </div>
      </div>
    );
  }

  if (!dataLoaded) {
    return (
      <div className="ws-page">
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--on-surface-variant)" }}>
          로딩 중...
        </div>
      </div>
    );
  }

  return (
    <div className="ws-page">
      <header className="ws-topbar">
        <button className="btn btn-ghost" onClick={() => navigate(`/courses/${courseId}`)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span className="ws-topbar-title">{course?.title || ""} — 워크스페이스</span>
      </header>
      <div className="ws-container" ref={containerRef}>
        {tree && renderNode(tree)}
      </div>
    </div>
  );
}
