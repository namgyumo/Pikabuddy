import { useState, useRef, useEffect, useCallback } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import katex from "katex";

interface MathProps {
  node: { attrs: { formula: string } };
  updateAttributes: (attrs: { formula: string }) => void;
  selected: boolean;
  deleteNode: () => void;
}

function useKatexRender(
  formula: string,
  displayMode: boolean,
  containerRef: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!formula.trim()) {
      el.textContent = "";
      const placeholder = document.createElement("span");
      placeholder.style.cssText = "color:var(--on-surface-variant);opacity:0.5";
      placeholder.textContent = displayMode ? "수식을 입력하세요" : "수식";
      el.appendChild(placeholder);
      return;
    }
    try {
      katex.render(formula, el, {
        displayMode,
        throwOnError: false,
        strict: false,
        trust: false,
      });
    } catch {
      el.textContent = "";
      const errSpan = document.createElement("span");
      errSpan.style.cssText = "color:var(--error)";
      errSpan.textContent = "수식 오류";
      el.appendChild(errSpan);
    }
  }, [formula, displayMode, containerRef]);
}

/**
 * Inline math NodeView — click to edit, blur to render
 */
export function MathInlineView({ node, updateAttributes, selected, deleteNode }: MathProps) {
  const [editing, setEditing] = useState(!node.attrs.formula);
  const [draft, setDraft] = useState(node.attrs.formula);
  const renderRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useKatexRender(node.attrs.formula, false, renderRef);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const commit = useCallback(() => {
    const f = draft.trim();
    if (!f) {
      deleteNode();
      return;
    }
    updateAttributes({ formula: f });
    setEditing(false);
  }, [draft, updateAttributes, deleteNode]);

  if (editing) {
    return (
      <NodeViewWrapper as="span" className="math-inline-wrapper editing">
        <input
          ref={inputRef}
          className="math-inline-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            if (e.key === "Escape") { setDraft(node.attrs.formula); setEditing(false); }
          }}
          placeholder="x^2 + y^2 = z^2"
          spellCheck={false}
        />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      as="span"
      className={`math-inline-wrapper${selected ? " selected" : ""}`}
      onClick={() => { setDraft(node.attrs.formula); setEditing(true); }}
      title="클릭하여 수식 편집"
    >
      <span ref={renderRef} className="math-inline-render" />
    </NodeViewWrapper>
  );
}

/**
 * Block math NodeView — click to edit, blur to render
 */
export function MathBlockView({ node, updateAttributes, selected, deleteNode }: MathProps) {
  const [editing, setEditing] = useState(!node.attrs.formula);
  const [draft, setDraft] = useState(node.attrs.formula);
  const renderRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useKatexRender(node.attrs.formula, true, renderRef);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      // Auto-resize
      const ta = textareaRef.current;
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + "px";
    }
  }, [editing, draft]);

  const commit = useCallback(() => {
    const f = draft.trim();
    if (!f) {
      deleteNode();
      return;
    }
    updateAttributes({ formula: f });
    setEditing(false);
  }, [draft, updateAttributes, deleteNode]);

  if (editing) {
    return (
      <NodeViewWrapper className="math-block-wrapper editing">
        <div className="math-block-edit-container">
          <div className="math-block-label">수식 블록 (LaTeX)</div>
          <textarea
            ref={textareaRef}
            className="math-block-input"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
            }}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); commit(); }
              if (e.key === "Escape") { setDraft(node.attrs.formula); setEditing(false); }
            }}
            placeholder="\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"
            spellCheck={false}
            rows={2}
          />
          <div className="math-block-hint">Ctrl+Enter로 확인 · Esc로 취소</div>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      className={`math-block-wrapper${selected ? " selected" : ""}`}
      onClick={() => { setDraft(node.attrs.formula); setEditing(true); }}
      title="클릭하여 수식 편집"
    >
      <div ref={renderRef} className="math-block-render" />
    </NodeViewWrapper>
  );
}
