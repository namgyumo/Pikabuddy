import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { SLASH_ITEMS } from "./SlashCommandExtension";
import type { SlashItem } from "./SlashCommandExtension";

/**
 * Block Handle Extension
 *
 * 각 블록 왼쪽에 호버 시 핸들 표시.
 * - 편집 모드: + 버튼 (블록 메뉴) + 드래그 핸들 (노션 스타일)
 * - 리뷰 모드: 💬 코멘트 버튼
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
    let currentBlockEl: HTMLElement | null = null;
    let currentBlockRect: DOMRect | null = null;
    let currentEditorRect: DOMRect | null = null;
    let isHandleHovered = false;
    let blockMenu: HTMLDivElement | null = null;
    let blockMenuOpen = false;

    // ── 블록 추가 메뉴 (+ 버튼 팝업) ──
    const destroyBlockMenu = () => {
      if (blockMenu) {
        blockMenu.remove();
        blockMenu = null;
      }
      blockMenuOpen = false;
    };

    const showBlockMenu = (pos: number, rect: DOMRect) => {
      destroyBlockMenu();
      blockMenuOpen = true;

      // 한번만 DOM 생성, 이후 클래스 토글로 업데이트
      blockMenu = document.createElement("div");
      blockMenu.className = "block-add-menu";
      blockMenu.style.position = "fixed";
      blockMenu.style.zIndex = "9999";

      // Position with viewport boundary detection
      const menuH = 360;
      const menuW = 260;
      let menuLeft = rect.left;
      let menuTop = rect.bottom + 4;
      if (menuTop + menuH > window.innerHeight) {
        menuTop = rect.top - menuH - 4;
        if (menuTop < 0) menuTop = Math.max(8, window.innerHeight - menuH - 8);
      }
      if (menuLeft + menuW > window.innerWidth) {
        menuLeft = window.innerWidth - menuW - 8;
      }
      if (menuLeft < 0) menuLeft = 8;
      blockMenu.style.left = `${menuLeft}px`;
      blockMenu.style.top = `${menuTop}px`;

      const searchWrap = document.createElement("div");
      searchWrap.className = "block-add-menu-search";
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "블록 검색...";
      searchWrap.appendChild(input);

      const listEl = document.createElement("div");
      listEl.className = "block-add-menu-list";

      blockMenu.appendChild(searchWrap);
      blockMenu.appendChild(listEl);
      document.body.appendChild(blockMenu);

      let selectedIdx = 0;
      let currentFiltered: SlashItem[] = [...SLASH_ITEMS];
      let itemButtons: HTMLButtonElement[] = [];

      // 아이템 버튼 생성 (한번만)
      const allButtons = SLASH_ITEMS.map((item, i) => {
        const btn = document.createElement("button");
        btn.className = "block-add-menu-item";
        btn.dataset.id = item.id;
        btn.innerHTML = `<span class="block-add-menu-icon">${item.icon}</span><div class="block-add-menu-text"><span class="block-add-menu-label">${item.label}</span><span class="block-add-menu-desc">${item.description}</span></div>`;

        btn.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectItem(item, pos);
        });
        btn.addEventListener("mouseenter", () => {
          selectedIdx = itemButtons.indexOf(btn);
          updateSelection();
        });
        return { btn, item };
      });

      const emptyEl = document.createElement("div");
      emptyEl.className = "block-add-menu-empty";
      emptyEl.textContent = "일치하는 블록 없음";

      const updateSelection = () => {
        itemButtons.forEach((b, i) => {
          b.classList.toggle("active", i === selectedIdx);
        });
        // 선택된 항목 스크롤
        itemButtons[selectedIdx]?.scrollIntoView({ block: "nearest" });
      };

      const filterItems = (query: string) => {
        const q = query.toLowerCase();
        currentFiltered = q
          ? SLASH_ITEMS.filter((it) =>
              it.label.toLowerCase().includes(q) ||
              it.description.toLowerCase().includes(q) ||
              it.keywords.some((k) => k.toLowerCase().includes(q))
            )
          : [...SLASH_ITEMS];

        // 리스트 내용 교체 (DOM 재사용)
        listEl.innerHTML = "";
        itemButtons = [];

        if (currentFiltered.length === 0) {
          listEl.appendChild(emptyEl);
        } else {
          const ids = new Set(currentFiltered.map((it) => it.id));
          for (const entry of allButtons) {
            if (ids.has(entry.item.id)) {
              listEl.appendChild(entry.btn);
              itemButtons.push(entry.btn);
            }
          }
        }

        selectedIdx = 0;
        updateSelection();
      };

      // 초기 렌더
      filterItems("");
      input.focus();

      // 입력 이벤트
      input.addEventListener("input", () => filterItems(input.value));

      input.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          selectedIdx = (selectedIdx + 1) % Math.max(currentFiltered.length, 1);
          updateSelection();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          selectedIdx = (selectedIdx - 1 + currentFiltered.length) % Math.max(currentFiltered.length, 1);
          updateSelection();
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (currentFiltered[selectedIdx]) selectItem(currentFiltered[selectedIdx], pos);
        } else if (e.key === "Escape") {
          e.preventDefault();
          destroyBlockMenu();
        }
      });

      const selectItem = (item: SlashItem, blockPos: number) => {
        destroyBlockMenu();
        const { state } = editor.view;
        const resolved = state.doc.resolve(blockPos);
        const after = resolved.after();
        editor.chain().focus().insertContentAt(after, { type: "paragraph" }).run();
        editor.commands.setTextSelection(after + 1);
        item.action(editor);
      };

      // 바깥 클릭 시 닫기
      const onClickOutside = (e: MouseEvent) => {
        if (blockMenu && !blockMenu.contains(e.target as Node)) {
          destroyBlockMenu();
          document.removeEventListener("mousedown", onClickOutside);
        }
      };
      setTimeout(() => document.addEventListener("mousedown", onClickOutside), 0);
    };

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
          <button class="block-handle-add" title="블록 추가">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <button class="block-handle-drag" title="드래그하여 이동">
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

      handle.addEventListener("mouseenter", () => { isHandleHovered = true; });
      handle.addEventListener("mouseleave", () => {
        isHandleHovered = false;
        setTimeout(() => {
          if (!isHandleHovered && !isMouseInRow && !blockMenuOpen) hideHandle();
        }, 50);
      });

      if (isReviewMode) {
        handle.querySelector(".block-handle-comment")!.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (currentBlockIndex == null) return;
          window.dispatchEvent(
            new CustomEvent("block-comment-toggle", { detail: { blockIndex: currentBlockIndex } })
          );
        });
      } else {
        // + 버튼: 블록 메뉴 표시
        handle.querySelector(".block-handle-add")!.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (currentBlockPos == null || !currentBlockRect) return;
          showBlockMenu(currentBlockPos, currentBlockRect);
        });

        // 드래그 핸들: 노션 스타일 블록 프리뷰
        const dragBtn = handle.querySelector(".block-handle-drag")!;

        dragBtn.addEventListener("mousedown", (e) => {
          e.preventDefault();
          if (!currentBlockEl) return;
          dragBtn.setAttribute("draggable", "true");
        });

        dragBtn.addEventListener("dragstart", (e) => {
          if (!currentBlockEl || !currentBlockPos) return;
          const de = e as DragEvent;

          const clone = currentBlockEl.cloneNode(true) as HTMLElement;
          clone.style.position = "absolute";
          clone.style.top = "-9999px";
          clone.style.left = "-9999px";
          clone.style.width = `${currentBlockEl.offsetWidth}px`;
          clone.style.background = "var(--surface-container-lowest, #fff)";
          clone.style.border = "1px solid var(--primary, #6366f1)";
          clone.style.borderRadius = "6px";
          clone.style.padding = "8px 12px";
          clone.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
          clone.style.opacity = "0.9";
          clone.style.maxHeight = "120px";
          clone.style.overflow = "hidden";
          document.body.appendChild(clone);

          de.dataTransfer?.setDragImage(clone, 20, 20);
          de.dataTransfer?.setData("text/plain", String(currentBlockPos));
          currentBlockEl.classList.add("block-dragging");
          setTimeout(() => clone.remove(), 0);
        });

        dragBtn.addEventListener("dragend", () => {
          document.querySelectorAll(".block-dragging").forEach((el) => el.classList.remove("block-dragging"));
          document.querySelectorAll(".block-drop-indicator").forEach((el) => el.remove());
        });
      }
    };

    let isMouseInRow = false;

    const onDocMouseMove = (event: MouseEvent) => {
      if (blockMenuOpen) return; // 메뉴 열려있으면 핸들 유지

      if (!handle || handle.style.display === "none") {
        isMouseInRow = false;
        return;
      }
      if (!currentBlockRect || !currentEditorRect) {
        isMouseInRow = false;
        return;
      }

      const { clientX, clientY } = event;
      const inRowY = clientY >= currentBlockRect.top - 8 && clientY <= currentBlockRect.bottom + 8;
      const inRowX = clientX >= currentEditorRect.left - 90 && clientX <= currentEditorRect.right + 20;

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
      if (blockMenuOpen) return; // 메뉴 열려있으면 핸들 이동 안 함

      if (!handle) createHandle();
      if (!handle) return;

      currentBlockPos = pos;
      currentBlockEl = blockEl;
      currentBlockIndex = getBlockIndex(view, blockEl);
      currentBlockRect = blockEl.getBoundingClientRect();
      currentEditorRect = view.dom.getBoundingClientRect();

      handle.style.display = "flex";
      handle.style.position = "fixed";
      // 에디터 패딩 안쪽, 글자 왼쪽 바로 옆에 배치
      handle.style.left = `${currentBlockRect.left - 54}px`;
      handle.style.top = `${currentBlockRect.top + 2}px`;
      handle.style.zIndex = "50";
      handle.style.opacity = "1";
    };

    const hideHandle = () => {
      if (blockMenuOpen) return; // 메뉴 열려있으면 숨기지 않음

      if (handle) {
        handle.style.display = "none";
        handle.style.opacity = "0";
      }
      currentBlockPos = null;
      currentBlockEl = null;
      currentBlockIndex = null;
      currentBlockRect = null;
      currentEditorRect = null;
      isMouseInRow = false;
    };

    // 드롭 처리
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (!e.dataTransfer?.types.includes("text/plain")) return;

      const editorDom = editor.view.dom;
      const children = Array.from(editorDom.children) as HTMLElement[];

      document.querySelectorAll(".block-drop-indicator").forEach((el) => el.remove());

      let closestIdx = 0;
      let closestDist = Infinity;
      for (let i = 0; i <= children.length; i++) {
        const y = i < children.length
          ? children[i].getBoundingClientRect().top
          : children[children.length - 1].getBoundingClientRect().bottom;
        const dist = Math.abs(e.clientY - y);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
        }
      }

      const indicator = document.createElement("div");
      indicator.className = "block-drop-indicator";
      const editorRect = editorDom.getBoundingClientRect();
      indicator.style.position = "fixed";
      indicator.style.left = `${editorRect.left}px`;
      indicator.style.width = `${editorRect.width}px`;
      indicator.style.height = "2px";
      indicator.style.background = "var(--primary, #6366f1)";
      indicator.style.borderRadius = "1px";
      indicator.style.zIndex = "100";
      indicator.style.pointerEvents = "none";

      if (closestIdx < children.length) {
        indicator.style.top = `${children[closestIdx].getBoundingClientRect().top - 1}px`;
      } else {
        indicator.style.top = `${children[children.length - 1].getBoundingClientRect().bottom - 1}px`;
      }
      document.body.appendChild(indicator);
      indicator.setAttribute("data-drop-index", String(closestIdx));
    };

    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      document.querySelectorAll(".block-drop-indicator").forEach((el) => {
        const dropIdx = parseInt(el.getAttribute("data-drop-index") || "0");
        el.remove();

        const fromPosStr = e.dataTransfer?.getData("text/plain");
        if (!fromPosStr) return;

        const fromPos = parseInt(fromPosStr);
        const { state } = editor.view;
        const fromResolved = state.doc.resolve(fromPos);
        const fromNode = fromResolved.nodeAfter;
        if (!fromNode) return;

        const fromIndex = fromResolved.index(0);
        let targetIndex = dropIdx;
        if (targetIndex > fromIndex) targetIndex--;
        if (targetIndex === fromIndex) return;

        const { tr } = editor.view.state;
        const fromStart = fromResolved.before(1);
        const fromEnd = fromStart + fromNode.nodeSize;

        tr.delete(fromStart, fromEnd);

        let insertPos: number;
        if (targetIndex === 0) {
          insertPos = 0;
        } else {
          let pos = 0;
          for (let i = 0; i < targetIndex && i < tr.doc.childCount; i++) {
            pos += tr.doc.child(i).nodeSize;
          }
          insertPos = pos;
        }

        tr.insert(insertPos, fromNode);
        editor.view.dispatch(tr);
      });

      document.querySelectorAll(".block-dragging").forEach((el) => el.classList.remove("block-dragging"));
    };

    return [
      new Plugin({
        key: new PluginKey("blockHandle"),
        props: {
          handleDOMEvents: {
            mousemove(view, event) {
              const target = event.target as HTMLElement;
              if (!target) return false;
              if (target.closest(".block-handle") || target.closest(".block-add-menu")) return false;

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
            mouseleave() {
              return false;
            },
            dragover(view, event) {
              onDragOver(event);
              return false;
            },
            drop(view, event) {
              onDrop(event);
              return true;
            },
          },
        },
        view() {
          return {
            destroy() {
              document.removeEventListener("mousemove", onDocMouseMove);
              document.querySelectorAll(".block-drop-indicator").forEach((el) => el.remove());
              destroyBlockMenu();
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
