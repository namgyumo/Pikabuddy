import { Node, mergeAttributes } from "@tiptap/core";

export type CalloutType = "info" | "warning" | "tip" | "danger";

export const CalloutExtension = Node.create({
  name: "callout",
  group: "block",
  content: "block+",

  addAttributes() {
    return {
      type: { default: "info" as CalloutType },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const type = HTMLAttributes.type || "info";
    const icons: Record<string, string> = {
      info: "\u{2139}\u{FE0F}",
      warning: "\u{26A0}\u{FE0F}",
      tip: "\u{1F4A1}",
      danger: "\u{1F6A8}",
    };
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-callout": type,
        class: `callout callout-${type}`,
      }),
      ["span", { class: "callout-icon" }, icons[type] || icons.info],
      ["div", { class: "callout-content" }, 0],
    ];
  },

  addCommands() {
    return {
      setCallout:
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
