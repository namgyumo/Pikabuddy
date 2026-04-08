import { NodeViewWrapper } from "@tiptap/react";
import { useNavigate, useParams } from "react-router-dom";
import { useCallback } from "react";

interface Props {
  node: { attrs: { noteId: string | null; title: string } };
}

export default function NoteLinkNodeView({ node }: Props) {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (node.attrs.noteId && courseId) {
        navigate(`/courses/${courseId}/notes/${node.attrs.noteId}`);
      }
    },
    [node.attrs.noteId, courseId, navigate],
  );

  return (
    <NodeViewWrapper as="span" className="note-link-inline">
      <span className="note-link-chip" onClick={handleClick} role="button" tabIndex={0}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        {node.attrs.title || "링크된 노트"}
      </span>
    </NodeViewWrapper>
  );
}
