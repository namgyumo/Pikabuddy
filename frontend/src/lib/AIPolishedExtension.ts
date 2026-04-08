import { Node, mergeAttributes } from "@tiptap/core";

/**
 * AI 다듬기 구간 마킹 노드.
 * - 학생 뷰: 일반 블록과 동일하게 렌더링 (시각적 차이 없음)
 * - 교수자/AI 뷰: .show-ai-marks 클래스가 에디터에 있을 때 보라색 좌측 선 + 뱃지 표시
 * - 분석 시: 백엔드에서 이 노드를 제거하고 학생 원본만 평가
 */
export const AIPolishedExtension = Node.create({
  name: "aiPolished",
  group: "block",
  content: "block+",
  defining: true,
  isolating: false,

  addAttributes() {
    return {
      timestamp: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'section[data-ai-polished]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(
        { "data-ai-polished": "true", class: "ai-polished-block" },
        { "data-timestamp": HTMLAttributes.timestamp }
      ),
      0,
    ];
  },
});
