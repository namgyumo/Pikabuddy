import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import SubNoteNodeView from "../components/SubNoteNodeView";

/**
 * Sub-note (하위 페이지) 노드 — 노션의 "페이지 안 페이지" 기능
 * 에디터 안에 하위 노트 링크를 삽입하고 클릭하면 해당 노트로 이동
 */
export const SubNoteExtension = Node.create({
  name: "subNote",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      noteId: { default: null },
      title: { default: "새 하위 노트" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="sub-note"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-type": "sub-note" }, HTMLAttributes),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SubNoteNodeView, {
      stopEvent: ({ event }) => {
        // Allow Backspace/Delete to reach ProseMirror for node deletion
        if (event instanceof KeyboardEvent) {
          if (event.key === "Backspace" || event.key === "Delete") return false;
        }
        // Block other events so React handles clicks, inputs, etc.
        return true;
      },
    });
  },
});
