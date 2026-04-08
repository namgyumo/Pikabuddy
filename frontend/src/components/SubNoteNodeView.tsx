import { useState, useCallback } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { useNavigate, useParams } from "react-router-dom";
import type { Editor } from "@tiptap/core";
import api from "../lib/api";

interface Attrs {
  noteId: string | null;
  title: string;
}

interface Props {
  node: { attrs: Attrs };
  updateAttributes: (attrs: Partial<Attrs>) => void;
  deleteNode: () => void;
  selected: boolean;
  editor: Editor;
}

export default function SubNoteNodeView({ node, updateAttributes, deleteNode, selected, editor }: Props) {
  const { courseId, noteId: parentNoteId } = useParams<{ courseId: string; noteId: string }>();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.attrs.title);
  const [toast, setToast] = useState<string | null>(null);

  const handleOpen = useCallback(async () => {
    console.log("[SubNote] handleOpen called", {
      courseId,
      parentNoteId,
      noteId: node.attrs.noteId,
      title: node.attrs.title,
    });

    if (!courseId) {
      console.warn("[SubNote] courseId is missing, aborting");
      return;
    }

    // Already-created sub-note: navigate directly
    if (node.attrs.noteId) {
      console.log("[SubNote] Navigating to existing sub-note:", node.attrs.noteId);
      navigate(`/courses/${courseId}/notes/${node.attrs.noteId}`);
      return;
    }

    // Parent note not yet saved — show warning then remove the block
    if (!parentNoteId || parentNoteId === "new") {
      setToast("노트를 먼저 저장한 후 하위 페이지를 만들 수 있습니다.");
      setTimeout(() => deleteNode(), 2000);
      return;
    }

    setCreating(true);

    // 1) Create child note
    let childId: string;
    try {
      const { data } = await api.post(`/courses/${courseId}/notes`, {
        title: node.attrs.title,
        content: { type: "doc", content: [{ type: "paragraph" }] },
        parent_id: parentNoteId,
      });
      childId = data.id;
      console.log("[SubNote] Child note created:", childId);
    } catch (err) {
      console.error("[SubNote] Failed to create child note:", err);
      setCreating(false);
      return;
    }

    // 2) Update editor attribute (synchronous ProseMirror transaction)
    updateAttributes({ noteId: childId });

    // 3) Save parent note content (non-blocking for navigation)
    try {
      const content = editor.getJSON();
      const patched = ensureSubNoteId(content, node.attrs.title, childId);
      await api.patch(`/notes/${parentNoteId}`, { content: patched });
      console.log("[SubNote] Parent note saved with child ID");
    } catch (err) {
      console.error("[SubNote] Failed to save parent note:", err);
    }

    // 4) Navigate to child note regardless
    console.log("[SubNote] Navigating to new child:", childId);
    navigate(`/courses/${courseId}/notes/${childId}`);
  }, [courseId, parentNoteId, node.attrs.noteId, node.attrs.title, navigate, updateAttributes, editor]);

  const commitTitle = useCallback(() => {
    const t = draft.trim() || "새 하위 노트";
    updateAttributes({ title: t });
    setEditing(false);
  }, [draft, updateAttributes]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!editing) handleOpen();
    },
    [editing, handleOpen],
  );

  return (
    <NodeViewWrapper className={`sub-note-block${selected ? " selected" : ""}`}>
      <div
        className="sub-note-inner"
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !editing) {
            e.preventDefault();
            handleOpen();
          }
        }}
      >
        <div className="sub-note-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
        {editing ? (
          <input
            className="sub-note-title-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commitTitle(); }
              if (e.key === "Escape") { setDraft(node.attrs.title); setEditing(false); }
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            placeholder="하위 노트 제목"
          />
        ) : (
          <span
            className="sub-note-title"
            onDoubleClick={(e) => { e.stopPropagation(); setDraft(node.attrs.title); setEditing(true); }}
          >
            {node.attrs.title}
          </span>
        )}
        <span className="sub-note-arrow">
          {creating ? "..." : "\u203A"}
        </span>
      </div>
      {toast && (
        <div className="sub-note-toast">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{toast}</span>
        </div>
      )}
    </NodeViewWrapper>
  );
}

/** JSON tree: find subNote with matching title and null noteId, patch with newId */
function ensureSubNoteId(
  json: Record<string, unknown>,
  title: string,
  newId: string,
): Record<string, unknown> {
  if (json.type === "subNote") {
    const attrs = (json.attrs || {}) as Record<string, unknown>;
    if (attrs.noteId === newId) return json;
    if (!attrs.noteId && attrs.title === title) {
      return { ...json, attrs: { ...attrs, noteId: newId } };
    }
    return json;
  }
  if (Array.isArray(json.content)) {
    let found = false;
    const newContent = json.content.map((child: Record<string, unknown>) => {
      if (found) return child;
      const result = ensureSubNoteId(child, title, newId);
      if (result !== child) found = true;
      return result;
    });
    return { ...json, content: newContent };
  }
  return json;
}
