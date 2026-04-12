import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Citation (인용) — 출처가 있는 인용 블록
 * 붙여넣기 감지를 우회하며, 각주로 출처를 표시한다.
 */
export const CitationExtension = Node.create({
  name: "citation",
  group: "block",
  content: "block+",

  addAttributes() {
    return {
      source: { default: "" },
      sourceUrl: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'blockquote[data-type="citation"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "blockquote",
      mergeAttributes({ "data-type": "citation", class: "citation-block" }, HTMLAttributes),
      ["div", { class: "citation-content" }, 0],
      [
        "footer",
        { class: "citation-source" },
        HTMLAttributes.sourceUrl
          ? ["a", { href: HTMLAttributes.sourceUrl, target: "_blank", rel: "noopener" }, HTMLAttributes.source || HTMLAttributes.sourceUrl]
          : HTMLAttributes.source || "",
      ],
    ];
  },

  addCommands() {
    return {
      insertCitation:
        (attrs?: { source?: string; sourceUrl?: string }) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: "citation",
              attrs: { source: attrs?.source || "", sourceUrl: attrs?.sourceUrl || "" },
              content: [{ type: "paragraph" }],
            })
            .run();
        },
    } as any;
  },
});
