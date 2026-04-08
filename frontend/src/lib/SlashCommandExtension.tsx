import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { createRoot } from "react-dom/client";
import { useState, useEffect, useRef, useCallback } from "react";

/** Slash command items — each block type the user can insert */
export interface SlashItem {
  id: string;
  label: string;
  description: string;
  icon: string;
  keywords: string[];
  action: (editor: any) => void;
}

const SLASH_ITEMS: SlashItem[] = [
  {
    id: "paragraph",
    label: "텍스트",
    description: "일반 텍스트 블록",
    icon: "Aa",
    keywords: ["text", "paragraph", "텍스트"],
    action: (e) => e.chain().focus().setParagraph().run(),
  },
  {
    id: "h1",
    label: "제목 1",
    description: "큰 제목",
    icon: "H1",
    keywords: ["heading", "h1", "제목"],
    action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: "h2",
    label: "제목 2",
    description: "중간 제목",
    icon: "H2",
    keywords: ["heading", "h2", "제목"],
    action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: "h3",
    label: "제목 3",
    description: "작은 제목",
    icon: "H3",
    keywords: ["heading", "h3", "제목"],
    action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: "bullet",
    label: "글머리 목록",
    description: "순서 없는 목록",
    icon: "•",
    keywords: ["bullet", "list", "ul", "목록"],
    action: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    id: "ordered",
    label: "번호 목록",
    description: "순서 있는 목록",
    icon: "1.",
    keywords: ["ordered", "number", "list", "ol", "번호"],
    action: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "task",
    label: "체크리스트",
    description: "할 일 목록",
    icon: "\u2611",
    keywords: ["task", "todo", "check", "체크"],
    action: (e) => e.chain().focus().toggleTaskList().run(),
  },
  {
    id: "quote",
    label: "인용",
    description: "인용 블록",
    icon: "\u201C",
    keywords: ["quote", "blockquote", "인용"],
    action: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "code",
    label: "코드 블록",
    description: "코드 입력 블록",
    icon: "{ }",
    keywords: ["code", "codeblock", "코드"],
    action: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: "divider",
    label: "구분선",
    description: "수평 구분선",
    icon: "\u2014",
    keywords: ["divider", "hr", "line", "구분선"],
    action: (e) => e.chain().focus().setHorizontalRule().run(),
  },
  {
    id: "table",
    label: "표",
    description: "3\u00D73 표 삽입",
    icon: "\u229E",
    keywords: ["table", "표"],
    action: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: "image",
    label: "이미지",
    description: "이미지 URL로 삽입",
    icon: "\uD83D\uDDBC",
    keywords: ["image", "img", "이미지"],
    action: (e) => {
      const url = prompt("이미지 URL을 입력하세요");
      if (url) e.chain().focus().setImage({ src: url }).run();
    },
  },
  {
    id: "math-inline",
    label: "인라인 수식",
    description: "문장 안 LaTeX 수식",
    icon: "\u2211",
    keywords: ["math", "latex", "수식", "inline"],
    action: (e) => e.chain().focus().insertContent({ type: "mathInline", attrs: { formula: "" } }).run(),
  },
  {
    id: "math-block",
    label: "수식 블록",
    description: "큰 LaTeX 수식",
    icon: "\u222B",
    keywords: ["math", "latex", "수식", "block"],
    action: (e) => e.chain().focus().insertContent({ type: "mathBlock", attrs: { formula: "" } }).run(),
  },
  {
    id: "sub-note",
    label: "하위 페이지",
    description: "노트 안에 새 페이지 만들기",
    icon: "\uD83D\uDCC4",
    keywords: ["page", "sub", "하위", "페이지", "노트"],
    action: (e) => e.chain().focus().insertContent({ type: "subNote", attrs: { noteId: null, title: "새 하위 노트" } }).run(),
  },
  {
    id: "drawing",
    label: "그리기",
    description: "도형/화살표/자유 드로잉",
    icon: "\u270F\uFE0F",
    keywords: ["draw", "excalidraw", "그리기"],
    action: (e) => e.chain().focus().insertContent({ type: "excalidraw", attrs: { sceneData: null, preview: null } }).run(),
  },
];

const pluginKey = new PluginKey("slashCommand");

/**
 * React component that renders the slash command popup
 */
function SlashMenu({
  items,
  onSelect,
  onClose,
}: {
  items: SlashItem[];
  onSelect: (item: SlashItem) => void;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset index when items change
  useEffect(() => setIndex(0), [items]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[index] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => (i + 1) % items.length); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => (i - 1 + items.length) % items.length); }
      else if (e.key === "Enter") { e.preventDefault(); if (items[index]) onSelect(items[index]); }
      else if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [items, index, onSelect, onClose]);

  if (items.length === 0) {
    return (
      <div className="slash-menu">
        <div className="slash-empty">일치하는 블록 없음</div>
      </div>
    );
  }

  return (
    <div className="slash-menu" ref={listRef}>
      {items.map((item, i) => (
        <button
          key={item.id}
          className={`slash-item${i === index ? " active" : ""}`}
          onMouseDown={(e) => { e.preventDefault(); onSelect(item); }}
          onMouseEnter={() => setIndex(i)}
        >
          <span className="slash-item-icon">{item.icon}</span>
          <div className="slash-item-text">
            <span className="slash-item-label">{item.label}</span>
            <span className="slash-item-desc">{item.description}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

/**
 * TipTap Extension — slash commands (/ menu)
 */
export const SlashCommandExtension = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    const editor = this.editor;
    let popup: HTMLDivElement | null = null;
    let root: ReturnType<typeof createRoot> | null = null;
    let active = false;
    let queryFrom = 0;

    const destroy = () => {
      if (popup) {
        root?.unmount();
        root = null;
        popup.remove();
        popup = null;
      }
      active = false;
    };

    const show = (view: any, from: number, query: string) => {
      const filtered = SLASH_ITEMS.filter((item) => {
        const q = query.toLowerCase();
        return (
          item.label.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.keywords.some((k) => k.toLowerCase().includes(q))
        );
      });

      // Position popup
      const coords = view.coordsAtPos(from);
      if (!popup) {
        popup = document.createElement("div");
        popup.className = "slash-menu-container";
        document.body.appendChild(popup);
        root = createRoot(popup);
      }

      popup.style.position = "fixed";
      popup.style.left = `${coords.left}px`;
      popup.style.top = `${coords.bottom + 6}px`;
      popup.style.zIndex = "9999";

      const onSelect = (item: SlashItem) => {
        // Delete the /query text
        editor.chain().focus().deleteRange({ from: from - 1, to: view.state.selection.from }).run();
        item.action(editor);
        destroy();
      };

      root!.render(
        <SlashMenu items={filtered} onSelect={onSelect} onClose={destroy} />
      );
    };

    return [
      new Plugin({
        key: pluginKey,
        props: {
          handleKeyDown(view, event) {
            if (active && (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter")) {
              // Let the popup handle these
              return false;
            }
            if (active && event.key === "Escape") {
              destroy();
              return true;
            }
            return false;
          },
        },
        view() {
          return {
            update(view, prevState) {
              const { state } = view;
              const { selection } = state;
              const { $from } = selection;

              // Only in empty text context
              if (!selection.empty) { destroy(); return; }

              // Get text before cursor in current block
              const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, "\ufffc");

              // Check for /query pattern
              const match = textBefore.match(/\/([^\s/]*)$/);
              if (match) {
                const query = match[1];
                // Position: start of the query (after the /)
                const from = $from.pos - query.length;
                queryFrom = from;
                active = true;
                show(view, from, query);
              } else {
                if (active) destroy();
              }
            },
            destroy() {
              destroy();
            },
          };
        },
      }),
    ];
  },
});
