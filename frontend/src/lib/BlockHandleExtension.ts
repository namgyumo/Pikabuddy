import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

/**
 * Block Handle Extension
 *
 * 각 블록 왼쪽에 호버 시 핸들 표시.
 * - 편집 모드: + 버튼 + 드래그 핸들
 * - 리뷰 모드: 💬 코멘트 버튼
 *
 * 핸들의 호버 범위는 블록의 행(row) 전체로 확장됨 —
 * 셀 밖으로 나가도 같은 줄이면 핸들이 유지됩니다.
 */
export const BlockHandleExtension = Extension.create({
  name: "blockHandle",

  addOptions() {
    return {
      isReviewMode: false,
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    const isReviewMode = this.options.isReviewMode;

    let handle: HTMLDivElement | null = null;
    let currentBlockPos: number | null = null;
    let currentBlockIndex: number | null = null;
    let currentBlockRect: DOMRect | null = null;
    let currentEditorRect: DOMRect | null = null;
    let isHandleHovered = false;

    const createHandle = () => {
      handle = document.createElement("div");
      handle.className = "block-handle";

      if (isReviewMode) {
        handle.innerHTML = `
          <button class="block-handle-comment" title="이 블록에 코멘트 달기">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        `;
      } else {
        handle.innerHTML = `
          <button class="block-handle-add" title="블록 추가 (/)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <button class="block-handle-drag" title="드래그하여 이동" draggable="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
              <circle cx="9" cy="10" r="1.5"/><circle cx="15" cy="10" r="1.5"/>
              <circle cx="9" cy="15" r="1.5"/><circle cx="15" cy="15" r="1.5"/>
              <circle cx="9" cy="20" r="1.5"/><circle cx="15" cy="20" r="1.5"/>
            </svg>
          </button>
        `;
      }

      handle.style.display = "none";
      document.body.appendChild(handle);

      // 핸들 위에 마우스 올리면 사라지지 않게
      handle.addEventListener("mouseenter", () => { isHandleHovered = true; });
      handle.addEventListener("mouseleave", () => {
        isHandleHovered = false;
        // 약간의 딜레이 후 마우스가 행 범위 밖이면 숨김
        setTimeout(() => {
          if (!isHandleHovered && !isMouseInRow) hideHandle();
        }, 50);
      });

      if (isReviewMode) {
        handle.querySelector(".block-handle-comment")!.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (currentBlockIndex == null) return;
          window.dispatchEvent(
            new CustomEvent("block-comment-toggle", { detail: { blockIndex: currentBlockIndex } })
          );
        });
      } else {
        handle.querySelector(".block-handle-add")!.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (currentBlockPos == null) return;

          const { state } = editor.view;
          const resolved = state.doc.resolve(currentBlockPos);
          const after = resolved.after();

          editor
            .chain()
            .focus()
            .insertContentAt(after, { type: "paragraph", content: [{ type: "text", text: "/" }] })
            .run();

          const newPos = after + 2;
          editor.commands.setTextSelection(newPos);
        });
      }
    };

    let isMouseInRow = false;

    // 문서 전체 mousemove — 같은 행(row) 범위 안이면 핸들 유지
    const onDocMouseMove = (event: MouseEvent) => {
      if (!handle || handle.style.display === "none") {
        isMouseInRow = false;
        return;
      }
      if (!currentBlockRect || !currentEditorRect) {
        isMouseInRow = false;
        return;
      }

      const { clientX, clientY } = event;
      // 행 범위: 블록의 Y 범위 (위아래 여유 8px)
      const inRowY = clientY >= currentBlockRect.top - 8 && clientY <= currentBlockRect.bottom + 8;
      // X 범위: 핸들 왼쪽부터 에디터 오른쪽까지 (넉넉하게)
      const inRowX = clientX >= currentEditorRect.left - 80 && clientX <= currentEditorRect.right + 20;

      isMouseInRow = inRowY && inRowX;

      if (!isMouseInRow && !isHandleHovered) {
        hideHandle();
      }
    };

    document.addEventListener("mousemove", onDocMouseMove);

    const getBlockIndex = (view: any, blockEl: HTMLElement): number => {
      const pmDom = view.dom;
      const children = Array.from(pmDom.children);
      return children.indexOf(blockEl);
    };

    const showHandle = (view: any, blockEl: HTMLElement, pos: number) => {
      if (!handle) createHandle();
      if (!handle) return;

      currentBlockPos = pos;
      currentBlockIndex = getBlockIndex(view, blockEl);
      currentBlockRect = blockEl.getBoundingClientRect();
      currentEditorRect = view.dom.getBoundingClientRect();

      handle.style.display = "flex";
      handle.style.position = "fixed";
      handle.style.left = `${currentEditorRect.left - 52}px`;
      handle.style.top = `${currentBlockRect.top + 2}px`;
      handle.style.zIndex = "50";
      handle.style.opacity = "1";
    };

    const hideHandle = () => {
      if (handle) {
        handle.style.display = "none";
        handle.style.opacity = "0";
      }
      currentBlockPos = null;
      currentBlockIndex = null;
      currentBlockRect = null;
      currentEditorRect = null;
      isMouseInRow = false;
    };

    return [
      new Plugin({
        key: new PluginKey("blockHandle"),
        props: {
          handleDOMEvents: {
            mousemove(view, event) {
              const target = event.target as HTMLElement;
              if (!target) return false;

              if (target.closest(".block-handle")) return false;

              const editorDom = view.dom;
              let blockEl: HTMLElement | null = null;

              let el: HTMLElement | null = target;
              while (el && el !== editorDom) {
                if (el.parentElement === editorDom) {
                  blockEl = el;
                  break;
                }
                el = el.parentElement;
              }

              if (!blockEl) return false;

              const pos = view.posAtDOM(blockEl, 0);
              if (pos == null) return false;

              const resolved = view.state.doc.resolve(pos);
              const blockStart = resolved.before(1);

              showHandle(view, blockEl, blockStart);
              return false;
            },
            // mouseleave는 더 이상 즉시 숨기지 않음 — onDocMouseMove가 행 범위 체크
            mouseleave() {
              return false;
            },
          },
        },
        view() {
          return {
            destroy() {
              document.removeEventListener("mousemove", onDocMouseMove);
              if (handle) {
                handle.remove();
                handle = null;
              }
            },
          };
        },
      }),
    ];
  },
});
