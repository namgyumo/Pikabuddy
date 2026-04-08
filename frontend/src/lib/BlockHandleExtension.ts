import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

/**
 * Block Handle Extension
 *
 * 각 블록(paragraph, heading, list 등) 왼쪽에 호버 시 드래그 핸들(⠿)과
 * + 버튼을 표시하는 Notion 스타일의 블록 UI를 추가합니다.
 *
 * 순수 DOM 조작으로 구현 — 에디터 위에 오버레이로 핸들을 띄움
 */
export const BlockHandleExtension = Extension.create({
  name: "blockHandle",

  addProseMirrorPlugins() {
    const editor = this.editor;

    let handle: HTMLDivElement | null = null;
    let currentBlockPos: number | null = null;

    const createHandle = () => {
      handle = document.createElement("div");
      handle.className = "block-handle";
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
      handle.style.display = "none";
      document.body.appendChild(handle);

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

        // Move cursor to end of the inserted paragraph (after the "/")
        const newPos = after + 2; // after paragraph open + text node
        editor.commands.setTextSelection(newPos);
      });
    };

    const showHandle = (view: any, blockEl: HTMLElement, pos: number) => {
      if (!handle) createHandle();
      if (!handle) return;

      currentBlockPos = pos;

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
    };

    return [
      new Plugin({
        key: new PluginKey("blockHandle"),
        props: {
          handleDOMEvents: {
            mousemove(view, event) {
              const target = event.target as HTMLElement;
              if (!target) return false;

              // Don't show handle when hovering the handle itself
              if (target.closest(".block-handle")) return false;

              // Find the top-level block element under cursor
              const editorDom = view.dom;
              let blockEl: HTMLElement | null = null;

              // Walk up from target to find a direct child of the editor
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

              // Get the ProseMirror position of this block
              const pos = view.posAtDOM(blockEl, 0);
              if (pos == null) {
                hideHandle();
                return false;
              }

              // Resolve to get the start of the top-level node
              const resolved = view.state.doc.resolve(pos);
              const blockStart = resolved.before(1);

              showHandle(view, blockEl, blockStart);
              return false;
            },
            mouseleave(_view, event) {
              // Only hide if not moving to the handle
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
