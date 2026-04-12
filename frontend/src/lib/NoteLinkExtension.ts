import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import NoteLinkNodeView from "../components/NoteLinkNodeView";

/**
 * [[노트 링크]] — 옵시디언 스타일 노트 간 상호 참조
 * 인라인 노드로 에디터 안에 다른 노트 링크를 삽입
 */
export const NoteLinkExtension = Node.create({
  name: "noteLink",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      noteId: { default: null },
      title: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="note-link"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes({ "data-type": "note-link" }, HTMLAttributes),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(NoteLinkNodeView, {
      stopEvent: ({ event }) => {
        // Allow keyboard events to pass through for node selection/deletion
        if (event instanceof KeyboardEvent) return false;
        // Block mouse events so React handles clicks (navigation)
        return true;
      },
    });
  },
});
