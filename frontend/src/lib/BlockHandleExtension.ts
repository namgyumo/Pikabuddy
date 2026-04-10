import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

/**
 * Block Handle Extension
 *
 * 각 블록(paragraph, heading, list 등) 왼쪽에 호버 시 핸들을 표시.
 * - 편집 모드: + 버튼 + 드래그 핸들 (Notion 스타일)
 * - 리뷰 모드: 💬 코멘트 버튼 (교수가 학생 노트 리뷰 시)
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

    const createHandle = () => {
      handle = document.createElement("div");
      handle.className = "block-handle";

      if (isReviewMode) {
        // 리뷰 모드: 코멘트 버튼만
        handle.innerHTML = `
          <button class="block-handle-comment" title="이 블록에 코멘트 달기">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        `;
      } else {
        // 편집 모드: + 버튼 + 드래그 핸들
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

      if (isReviewMode) {
        // 코멘트 버튼 클릭 → 커스텀 이벤트 발생
        handle.querySelector(".block-handle-comment")!.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (currentBlockIndex == null) return;
          window.dispatchEvent(
            new CustomEvent("block-comment-toggle", { detail: { blockIndex: currentBlockIndex } })
          );
        });
      } else {
        // + button: insert paragraph below and open slash menu
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

      const editorRect = view.dom.getBoundingClientRect();
      const blockRect = blockEl.getBoundingClientRect();

      handle.style.display = "flex";
      handle.style.position = "fixed";
      handle.style.left = `${editorRect.left - 52}px`;
      handle.style.top = `${blockRect.top + 2}px`;
      handle.style.zIndex = "50";
    };

    const hideHandle = () => {
      if (handle) handle.style.display = "none";
      currentBlockPos = null;
      currentBlockIndex = null;
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

              if (!blockEl) {
                hideHandle();
                return false;
              }

              const pos = view.posAtDOM(blockEl, 0);
              if (pos == null) {
                hideHandle();
                return false;
              }

              const resolved = view.state.doc.resolve(pos);
              const blockStart = resolved.before(1);

              showHandle(view, blockEl, blockStart);
              return false;
            },
            mouseleave(_view, event) {
              const related = event.relatedTarget as HTMLElement | null;
              if (related?.closest(".block-handle")) return false;
              hideHandle();
              return false;
            },
          },
        },
        view() {
          return {
            destroy() {
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
