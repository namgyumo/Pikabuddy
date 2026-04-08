import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import ExcalidrawNodeView from "../components/ExcalidrawNodeView";

export const ExcalidrawExtension = Node.create({
  name: "excalidraw",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      sceneData: { default: null },
      preview:   { default: null },
      width:     { default: 100 },   // % of container (10~100)
      align:     { default: "center" }, // "left" | "center" | "right" | "float-left" | "float-right"
      caption:      { default: "" },
      textOverlays: { default: "[]" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="excalidraw"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-type": "excalidraw" }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ExcalidrawNodeView);
  },
});
