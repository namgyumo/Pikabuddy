import { Node, mergeAttributes } from "@tiptap/core";

export const ToggleExtension = Node.create({
  name: "toggle",
  group: "block",
  content: "block+",

  addAttributes() {
    return {
      summary: { default: "토글 제목" },
      open: { default: false },
    };
  },

  parseHTML() {
    return [{ tag: "details" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "details",
      mergeAttributes(HTMLAttributes, {
        class: "toggle-block",
        ...(HTMLAttributes.open ? { open: "" } : {}),
      }),
      [
        "summary",
        { class: "toggle-summary" },
        HTMLAttributes.summary || "토글",
      ],
      ["div", { class: "toggle-content" }, 0],
    ];
  },

  addCommands() {
    return {
      setToggle:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
            content: [{ type: "paragraph" }],
          });
        },
    };
  },
});
