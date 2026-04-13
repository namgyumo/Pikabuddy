import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

interface MenuPosition {
  x: number;
  y: number;
}

interface MenuItem {
  icon: string;
  label: string;
  action: () => void;
  dividerAfter?: boolean;
  danger?: boolean;
}

interface EditorContext {
  inEditor: boolean;
  editorEl: HTMLElement | null;
}

export default function GlobalContextMenu() {
  const [pos, setPos] = useState<MenuPosition | null>(null);
  const [editorCtx, setEditorCtx] = useState<EditorContext>({ inEditor: false, editorEl: null });
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  const isProfessor = user?.role === "professor";
  const isPersonal = user?.role === "personal";

  // Extract courseId from URL
  const courseIdMatch = location.pathname.match(/\/courses\/([^/]+)/);
  const courseId = courseIdMatch ? courseIdMatch[1] : null;

  const homeLink = isProfessor ? "/professor" : isPersonal ? "/personal" : "/student";

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't override on inputs, textareas, canvas, or graph menu
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "CANVAS" ||
        target.closest(".graph-ctx-menu") ||
        target.closest("[data-no-ctx]")
      ) {
        return;
      }

      e.preventDefault();

      // Detect if inside a ProseMirror/tiptap editor
      const proseMirror = target.closest(".ProseMirror") || target.closest(".tiptap");
      setEditorCtx({
        inEditor: !!proseMirror,
        editorEl: proseMirror as HTMLElement | null,
      });

      setPos({ x: e.clientX, y: e.clientY });
    },
    []
  );

  // Reposition menu after render to stay in viewport & update maxHeight
  useLayoutEffect(() => {
    if (!pos || !menuRef.current) return;
    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    let x = pos.x;
    let y = pos.y;
    if (x + rect.width > window.innerWidth - 8) x = window.innerWidth - rect.width - 8;
    if (y + rect.height > window.innerHeight - 8) y = window.innerHeight - rect.height - 8;
    if (x < 8) x = 8;
    if (y < 8) y = 8;
    menu.style.left = x + "px";
    menu.style.top = y + "px";
    // dynamic max-height so scroll always reaches the bottom
    menu.style.maxHeight = `${window.innerHeight - y - 8}px`;
  }, [pos]);

  const handleClick = useCallback((e: MouseEvent) => {
    if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
    setPos(null);
  }, []);
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") setPos(null);
    },
    []
  );

  useEffect(() => {
    // Use capture phase so we intercept before ProseMirror or browser defaults
    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("click", handleClick, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleContextMenu, handleClick, handleKeyDown]);

  // Close on navigation
  useEffect(() => setPos(null), [location.pathname]);

  if (!pos || !user) return null;

  const act = (fn: () => void) => {
    fn();
    setPos(null);
  };

  // Helper to get tiptap editor instance from DOM
  const getEditor = () => {
    if (!editorCtx.editorEl) return null;
    // Access the editor instance via the React wrapper
    const editorView = (editorCtx.editorEl as any)?.pmViewDesc?.view
      || (editorCtx.editorEl as any)?.editor;
    // Try the __tiptapEditor approach
    const wrapper = editorCtx.editorEl.closest("[data-tiptap-editor]") || editorCtx.editorEl.parentElement;
    return (wrapper as any)?.__tiptapEditor || (editorCtx.editorEl as any)?.__tiptapEditor || editorView || null;
  };

  // Dispatch editor command via DOM event
  const editorCmd = (cmd: string, args?: Record<string, unknown>) => {
    act(() => {
      window.dispatchEvent(new CustomEvent("ctx-editor-cmd", { detail: { cmd, args } }));
    });
  };

  const items: MenuItem[] = [];

  /* inline icon-button row flags — rendered separately */
  let editorFormatRow = false;
  let editorAlignRow = false;

  if (editorCtx.inEditor) {
    // ── Editor context menu (compact) ──
    editorFormatRow = true; // B I U S rendered as icon row
    items.push({
      icon: "H1",
      label: "제목 1",
      action: () => editorCmd("toggleHeading", { level: 1 }),
    });
    items.push({
      icon: "H2",
      label: "제목 2",
      action: () => editorCmd("toggleHeading", { level: 2 }),
    });
    items.push({
      icon: "Aa",
      label: "본문",
      action: () => editorCmd("setParagraph"),
      dividerAfter: true,
    });
    items.push({
      icon: "\u2022",
      label: "글머리 목록",
      action: () => editorCmd("toggleBulletList"),
    });
    items.push({
      icon: "1.",
      label: "번호 목록",
      action: () => editorCmd("toggleOrderedList"),
    });
    items.push({
      icon: "\u2611",
      label: "체크리스트",
      action: () => editorCmd("toggleTaskList"),
      dividerAfter: true,
    });
    items.push({
      icon: "\u229E",
      label: "표 삽입",
      action: () => editorCmd("insertTable", { rows: 3, cols: 3, withHeaderRow: true }),
    });
    items.push({
      icon: "\u275D",
      label: "인용",
      action: () => editorCmd("toggleBlockquote"),
    });
    items.push({
      icon: "\u2014",
      label: "구분선",
      action: () => editorCmd("setHorizontalRule"),
      dividerAfter: true,
    });
    editorAlignRow = true; // ← ↔ → rendered as icon row
    items.push({
      icon: "\u{1F5D1}",
      label: "블록 삭제",
      action: () => editorCmd("deleteNode"),
      danger: true,
    });
  } else {
    // ── General context menu ──
    items.push({
      icon: "\u{1F3E0}",
      label: "\uD648\uC73C\uB85C \uAC00\uAE30",
      action: () => act(() => navigate(homeLink)),
    });

    if (courseId) {
      items.push({
        icon: "\u{1F4CB}",
        label: "\uCEE4\uB9AC\uD050\uB7FC",
        action: () => act(() => navigate(`/courses/${courseId}`)),
      });
      items.push({
        icon: "\u{1F4DD}",
        label: "\uB178\uD2B8",
        action: () => act(() => navigate(`/courses/${courseId}/notes`)),
      });
      if (isProfessor) {
        items.push({
          icon: "\u{1F4CA}",
          label: "\uB300\uC2DC\uBCF4\uB4DC",
          action: () => act(() => navigate(`/courses/${courseId}/dashboard`)),
        });
      }
      items.push({
        icon: "\u{1F578}\uFE0F",
        label: "\uB178\uD2B8 \uC9C0\uB3C4",
        action: () => act(() => navigate(`/courses/${courseId}/graph`)),
        dividerAfter: true,
      });
    } else {
      items[items.length - 1].dividerAfter = true;
    }

    items.push({
      icon: "\u{1F517}",
      label: "\uD398\uC774\uC9C0 \uB9C1\uD06C \uBCF5\uC0AC",
      action: () =>
        act(() => {
          navigator.clipboard.writeText(window.location.href);
        }),
    });

    items.push({
      icon: "\u{1F504}",
      label: "\uC0C8\uB85C\uACE0\uCE68",
      action: () => act(() => window.location.reload()),
      dividerAfter: true,
    });

    items.push({
      icon: "\u2699\uFE0F",
      label: "\uC124\uC815",
      action: () => act(() => navigate("/settings")),
    });

    items.push({
      icon: "\u{1F464}",
      label: "\uD504\uB85C\uD544",
      action: () => act(() => navigate(`/profile/${user.id}`)),
    });

    items.push({
      icon: "\u2B05\uFE0F",
      label: "\uB4A4\uB85C \uAC00\uAE30",
      action: () => act(() => navigate(-1 as any)),
    });
    items.push({
      icon: "\u27A1\uFE0F",
      label: "\uC55E\uC73C\uB85C \uAC00\uAE30",
      action: () => act(() => navigate(1 as any)),
    });
  }

  // max-height = viewport bottom minus menu top, with padding
  const maxH = Math.max(200, window.innerHeight - Math.min(pos.y, window.innerHeight - 200) - 12);

  return (
    <div
      className="global-ctx-menu"
      ref={menuRef}
      style={{ left: pos.x, top: pos.y, maxHeight: maxH }}
    >
      <div className="global-ctx-brand">{editorCtx.inEditor ? "편집" : "pikabuddy"}</div>

      {/* B I U S — compact icon row */}
      {editorFormatRow && (
        <>
          <div className="ctx-icon-row">
            <button className="ctx-icon-btn" onClick={() => editorCmd("toggleBold")} title="굵게"><strong>B</strong></button>
            <button className="ctx-icon-btn" onClick={() => editorCmd("toggleItalic")} title="기울임"><em>I</em></button>
            <button className="ctx-icon-btn" onClick={() => editorCmd("toggleUnderline")} title="밑줄"><u>U</u></button>
            <button className="ctx-icon-btn" onClick={() => editorCmd("toggleStrike")} title="취소선"><s>S</s></button>
          </div>
          <div className="global-ctx-divider" />
        </>
      )}

      {items.map((item, i) => (
        <div key={i}>
          <button
            className={`global-ctx-item${item.danger ? " ctx-danger" : ""}`}
            onClick={item.action}
          >
            <span className="global-ctx-icon">{item.icon}</span>
            {item.label}
          </button>
          {item.dividerAfter && <div className="global-ctx-divider" />}
          {/* Alignment icon row — after the divider before delete */}
          {item.dividerAfter && editorAlignRow && i === items.length - 2 && (
            <>
              <div className="ctx-icon-row">
                <button className="ctx-icon-btn" onClick={() => editorCmd("setTextAlign", { alignment: "left" })} title="왼쪽">{"\u2190"}</button>
                <button className="ctx-icon-btn" onClick={() => editorCmd("setTextAlign", { alignment: "center" })} title="가운데">{"\u2194"}</button>
                <button className="ctx-icon-btn" onClick={() => editorCmd("setTextAlign", { alignment: "right" })} title="오른쪽">{"\u2192"}</button>
              </div>
              <div className="global-ctx-divider" />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
