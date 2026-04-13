import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import { createLowlight } from "lowlight";

/* 9개 언어만 개별 import — 번들 크기 최적화 */
import python from "highlight.js/lib/languages/python";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import csharp from "highlight.js/lib/languages/csharp";
import rust from "highlight.js/lib/languages/rust";
import go from "highlight.js/lib/languages/go";
import x86asm from "highlight.js/lib/languages/x86asm";

/** 서비스에서 지원하는 9개 언어 */
export const CODE_LANGUAGES: { id: string; label: string }[] = [
  { id: "python", label: "Python" },
  { id: "c", label: "C" },
  { id: "cpp", label: "C++" },
  { id: "java", label: "Java" },
  { id: "javascript", label: "JavaScript" },
  { id: "csharp", label: "C#" },
  { id: "rust", label: "Rust" },
  { id: "go", label: "Go" },
  { id: "x86asm", label: "ASM" },
];

/** lowlight 인스턴스 — 지원 언어만 등록 */
const lowlight = createLowlight();
lowlight.register("python", python);
lowlight.register("c", c);
lowlight.register("cpp", cpp);
lowlight.register("java", java);
lowlight.register("javascript", javascript);
lowlight.register("csharp", csharp);
lowlight.register("rust", rust);
lowlight.register("go", go);
lowlight.register("x86asm", x86asm);

/** 코드 블록 NodeView — 언어 선택 드롭다운 포함 */
function CodeBlockView({ node, updateAttributes }: any) {
  const lang = node.attrs.language || "";

  return (
    <NodeViewWrapper className="code-block-wrapper">
      <div className="code-block-header" contentEditable={false}>
        <select
          className="code-block-lang-select"
          value={lang}
          onChange={(e) => updateAttributes({ language: e.target.value })}
        >
          <option value="">언어 선택</option>
          {CODE_LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
      <pre>
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  );
}

/** TipTap CodeBlock 확장 — lowlight 문법 강조 + 언어 선택 UI */
export const CodeBlockExtension = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
}).configure({
  lowlight,
  defaultLanguage: null,
  HTMLAttributes: { class: "code-block" },
});
