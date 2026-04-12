import { useState, useEffect, useCallback, useRef } from "react";
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
}

export default function GlobalContextMenu() {
  const [pos, setPos] = useState<MenuPosition | null>(null);
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
      // Don't override context menu on inputs, textareas, contenteditable, or canvas
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "CANVAS" ||
        target.isContentEditable ||
        target.closest(".graph-ctx-menu") ||
        target.closest(".ProseMirror") ||
        target.closest(".tiptap") ||
        target.closest("[data-no-ctx]")
      ) {
        return;
      }

      e.preventDefault();

      // Adjust position to keep menu in viewport
      let x = e.clientX;
      let y = e.clientY;
      const menuW = 220;
      const menuH = 350;
      if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 8;
      if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 8;
      if (x < 8) x = 8;
      if (y < 8) y = 8;

      setPos({ x, y });
    },
    []
  );

  const handleClick = useCallback(() => setPos(null), []);
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") setPos(null);
    },
    []
  );

  useEffect(() => {
    document.addEventListener("contextmenu", handleContextMenu);
    // capture phase so stopPropagation in children can't block it
    document.addEventListener("click", handleClick, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
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

  const items: MenuItem[] = [];

  // Navigation
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
    if (!isPersonal) {
      items.push({
        icon: "\u{1F4DD}",
        label: "\uB178\uD2B8",
        action: () => act(() => navigate(`/courses/${courseId}/notes`)),
      });
    }
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

  // Actions
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

  // Settings & Profile
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

  // History navigation
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

  return (
    <div
      className="global-ctx-menu"
      ref={menuRef}
      style={{ left: pos.x, top: pos.y }}
    >
      <div className="global-ctx-brand">pikabuddy</div>
      {items.map((item, i) => (
        <div key={i}>
          <button className="global-ctx-item" onClick={item.action}>
            <span className="global-ctx-icon">{item.icon}</span>
            {item.label}
          </button>
          {item.dividerAfter && <div className="global-ctx-divider" />}
        </div>
      ))}
    </div>
  );
}
