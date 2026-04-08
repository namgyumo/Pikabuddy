import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { MathInlineView, MathBlockView } from "../components/MathNodeView";

/**
 * Inline math node: triggered by $formula$ or toolbar button
 */
export const MathInline = Node.create({
  name: "mathInline",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      formula: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="math-inline"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes({ "data-type": "math-inline" }, HTMLAttributes),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathInlineView);
  },

  addInputRules() {
    return [
      // Match $...$ but not $$...$$
      {
        find: /(?<!\$)\$([^$\n]+)\$$/,
        handler: ({ state, range, match }) => {
          const formula = match[1];
          if (!formula?.trim()) return;
          const node = state.schema.nodes.mathInline.create({ formula });
          const tr = state.tr.replaceWith(range.from, range.to, node);
          return tr;
        },
      },
    ];
  },
});

/**
 * Block math node: triggered by $$formula$$ or toolbar button
 */
export const MathBlock = Node.create({
  name: "mathBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      formula: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="math-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-type": "math-block" }, HTMLAttributes),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathBlockView);
  },

  addInputRules() {
    return [
      // Match $$...$$ at beginning of line
      {
        find: /^\$\$([^$]+)\$\$$/,
        handler: ({ state, range, match }) => {
          const formula = match[1];
          if (!formula?.trim()) return;
          const node = state.schema.nodes.mathBlock.create({ formula });
          const tr = state.tr.replaceWith(range.from, range.to, node);
          return tr;
        },
      },
    ];
  },
});
