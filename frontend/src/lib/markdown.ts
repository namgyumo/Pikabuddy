import { marked } from "marked";

marked.setOptions({ breaks: true });

/** Strip wrapping code fences and render markdown to HTML */
export function renderMarkdown(text: string): string {
  let s = text.trim();
  // Remove wrapping ```...``` block (Gemini sometimes wraps entire output)
  if (s.startsWith("```")) {
    const firstNewline = s.indexOf("\n");
    if (firstNewline !== -1) {
      s = s.slice(firstNewline + 1);
    }
    if (s.endsWith("```")) {
      s = s.slice(0, -3);
    }
    s = s.trim();
  }
  return marked.parse(s) as string;
}
