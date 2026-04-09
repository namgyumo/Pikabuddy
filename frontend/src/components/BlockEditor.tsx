import { useEffect, useRef, useState, Component, type ReactNode } from "react";

// ── Error Boundary ──
interface EBProps { children: ReactNode }
interface EBState { error: string | null }
class BlockEditorErrorBoundary extends Component<EBProps, EBState> {
  state: EBState = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, textAlign: "center", color: "var(--error, #d32f2f)" }}>
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>블록 에디터 로드 실패</p>
          <p style={{ fontSize: 13, color: "var(--on-surface-variant, #666)" }}>{this.state.error}</p>
          <button onClick={() => this.setState({ error: null })}
            style={{ marginTop: 12, padding: "6px 16px", borderRadius: 8, border: "1px solid #ccc", cursor: "pointer", background: "#f5f5f5" }}>
            다시 시도
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface BlockEditorProps {
  language: string;
  onCodeChange: (code: string) => void;
}

// ── Dynamic loader (avoids Monaco AMD conflict) ──
let blocklyCore: typeof import("blockly/core") | null = null;
let pyGen: typeof import("blockly/python") | null = null;
let jsGen: typeof import("blockly/javascript") | null = null;
let loadPromise: Promise<void> | null = null;
let customBlocksRegistered = false;

function loadBlockly(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const w = window as Record<string, unknown>;
    const saved = { define: w.define, require: w.require };
    try {
      w.define = undefined;
      w.require = undefined;
      blocklyCore = await import("blockly/core");
      await import("blockly/blocks");
      pyGen = await import("blockly/python");
      jsGen = await import("blockly/javascript");
      const ko = await import("blockly/msg/ko");
      if (blocklyCore.setLocale) blocklyCore.setLocale(ko.default || ko);
    } finally {
      w.define = saved.define;
      w.require = saved.require;
    }
  })();
  return loadPromise;
}

/** Register custom I/O blocks + generators */
function registerCustomBlocks() {
  if (customBlocksRegistered || !blocklyCore || !pyGen || !jsGen) return;
  customBlocksRegistered = true;

  const Blockly = blocklyCore;

  // ── 출력하기 (print) ──
  Blockly.Blocks["io_print"] = {
    init(this: Blockly.Block) {
      this.appendValueInput("TEXT").setCheck(null).appendField("출력하기");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour("#4C97FF");
      this.setTooltip("값을 화면에 출력합니다");
    },
  };
  pyGen.pythonGenerator.forBlock["io_print"] = function (block: Blockly.Block) {
    const val = pyGen!.pythonGenerator.valueToCode(block, "TEXT", 0) || "''";
    return `print(${val})\n`;
  };
  jsGen.javascriptGenerator.forBlock["io_print"] = function (block: Blockly.Block) {
    const val = jsGen!.javascriptGenerator.valueToCode(block, "TEXT", 0) || "''";
    return `console.log(${val});\n`;
  };

  // ── 입력받기 (text input) ──
  Blockly.Blocks["io_input_text"] = {
    init(this: Blockly.Block) {
      this.appendDummyInput().appendField("입력받기").appendField(new Blockly.FieldTextInput("입력하세요"), "PROMPT");
      this.setOutput(true, "String");
      this.setColour("#4C97FF");
      this.setTooltip("사용자에게 글자를 입력받습니다");
    },
  };
  pyGen.pythonGenerator.forBlock["io_input_text"] = function (block: Blockly.Block) {
    const prompt = block.getFieldValue("PROMPT") || "";
    return [`input('${prompt}')`, 0];
  };
  jsGen.javascriptGenerator.forBlock["io_input_text"] = function (block: Blockly.Block) {
    const prompt = block.getFieldValue("PROMPT") || "";
    return [`prompt('${prompt}')`, 0];
  };

  // ── 숫자 입력받기 (number input) ──
  Blockly.Blocks["io_input_number"] = {
    init(this: Blockly.Block) {
      this.appendDummyInput().appendField("숫자 입력받기").appendField(new Blockly.FieldTextInput("숫자를 입력하세요"), "PROMPT");
      this.setOutput(true, "Number");
      this.setColour("#4C97FF");
      this.setTooltip("사용자에게 숫자를 입력받습니다");
    },
  };
  pyGen.pythonGenerator.forBlock["io_input_number"] = function (block: Blockly.Block) {
    const prompt = block.getFieldValue("PROMPT") || "";
    return [`int(input('${prompt}'))`, 0];
  };
  jsGen.javascriptGenerator.forBlock["io_input_number"] = function (block: Blockly.Block) {
    const prompt = block.getFieldValue("PROMPT") || "";
    return [`parseInt(prompt('${prompt}'), 10)`, 0];
  };

  // ── 줄바꿈 출력 (print with newline explicit) ──
  Blockly.Blocks["io_print_line"] = {
    init(this: Blockly.Block) {
      this.appendValueInput("TEXT").setCheck(null).appendField("한 줄 출력하기");
      this.appendValueInput("END").setCheck("String").appendField("끝문자");
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour("#4C97FF");
      this.setTooltip("끝문자를 지정해서 출력합니다");
    },
  };
  pyGen.pythonGenerator.forBlock["io_print_line"] = function (block: Blockly.Block) {
    const val = pyGen!.pythonGenerator.valueToCode(block, "TEXT", 0) || "''";
    const end = pyGen!.pythonGenerator.valueToCode(block, "END", 0);
    return end ? `print(${val}, end=${end})\n` : `print(${val})\n`;
  };
  jsGen.javascriptGenerator.forBlock["io_print_line"] = function (block: Blockly.Block) {
    const val = jsGen!.javascriptGenerator.valueToCode(block, "TEXT", 0) || "''";
    return `console.log(${val});\n`;
  };
}

// ── Category icon SVGs (inline, colorless - colored by CSS) ──
const CAT_ICONS: Record<string, string> = {
  입출력: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
  반복: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
  조건: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3l6 6-6 6"/><path d="M18 3l-6 6 6 6"/></svg>`,
  계산: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>`,
  글자: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9.5" y1="4" x2="9.5" y2="20"/><line x1="14.5" y1="4" x2="14.5" y2="20"/><line x1="7" y1="20" x2="17" y2="20"/></svg>`,
  리스트: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>`,
  변수: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 16l2.5-8h3L16 16"/><line x1="9" y1="13" x2="15" y2="13"/></svg>`,
  함수: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3c-1.5 0-3 1-3 3.5S6.5 10 8 10c-1.5 0-3 1.5-3 3.5S6.5 21 8 21"/><path d="M16 3c1.5 0 3 1 3 3.5S17.5 10 16 10c1.5 0 3 1.5 3 3.5S17.5 21 16 21"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`,
};

const CAT_COLORS: Record<string, string> = {
  입출력: "#4C97FF",
  반복: "#9966FF",
  조건: "#FF8C1A",
  계산: "#40BF4A",
  글자: "#CF63CF",
  리스트: "#FF6680",
  변수: "#FF8C1A",
  함수: "#FF4D6A",
};

// ── Toolbox definition ──
const TOOLBOX = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category", name: "입출력", colour: "#4C97FF",
      contents: [
        { kind: "block", type: "io_print" },
        { kind: "block", type: "io_print_line" },
        { kind: "block", type: "io_input_text" },
        { kind: "block", type: "io_input_number" },
        { kind: "block", type: "text_print" },
        { kind: "block", type: "text_prompt_ext" },
      ],
    },
    {
      kind: "category", name: "반복", colour: "#9966FF",
      contents: [
        { kind: "block", type: "controls_repeat_ext" },
        { kind: "block", type: "controls_whileUntil" },
        { kind: "block", type: "controls_for" },
        { kind: "block", type: "controls_forEach" },
        { kind: "block", type: "controls_flow_statements" },
      ],
    },
    {
      kind: "category", name: "조건", colour: "#FF8C1A",
      contents: [
        { kind: "block", type: "controls_if" },
        { kind: "block", type: "controls_ifelse" },
        { kind: "block", type: "logic_compare" },
        { kind: "block", type: "logic_operation" },
        { kind: "block", type: "logic_negate" },
        { kind: "block", type: "logic_boolean" },
        { kind: "block", type: "logic_ternary" },
      ],
    },
    {
      kind: "category", name: "계산", colour: "#40BF4A",
      contents: [
        { kind: "block", type: "math_number" },
        { kind: "block", type: "math_arithmetic" },
        { kind: "block", type: "math_single" },
        { kind: "block", type: "math_trig" },
        { kind: "block", type: "math_round" },
        { kind: "block", type: "math_modulo" },
        { kind: "block", type: "math_constrain" },
        { kind: "block", type: "math_random_int" },
        { kind: "block", type: "math_random_float" },
      ],
    },
    {
      kind: "category", name: "글자", colour: "#CF63CF",
      contents: [
        { kind: "block", type: "text" },
        { kind: "block", type: "text_join" },
        { kind: "block", type: "text_append" },
        { kind: "block", type: "text_length" },
        { kind: "block", type: "text_isEmpty" },
        { kind: "block", type: "text_indexOf" },
        { kind: "block", type: "text_charAt" },
        { kind: "block", type: "text_getSubstring" },
        { kind: "block", type: "text_changeCase" },
        { kind: "block", type: "text_trim" },
      ],
    },
    {
      kind: "category", name: "리스트", colour: "#FF6680",
      contents: [
        { kind: "block", type: "lists_create_empty" },
        { kind: "block", type: "lists_create_with" },
        { kind: "block", type: "lists_repeat" },
        { kind: "block", type: "lists_length" },
        { kind: "block", type: "lists_isEmpty" },
        { kind: "block", type: "lists_indexOf" },
        { kind: "block", type: "lists_getIndex" },
        { kind: "block", type: "lists_setIndex" },
        { kind: "block", type: "lists_sort" },
        { kind: "block", type: "lists_reverse" },
      ],
    },
    { kind: "category", name: "변수", colour: "#FF8C1A", custom: "VARIABLE" },
    { kind: "category", name: "함수", colour: "#FF4D6A", custom: "PROCEDURE" },
  ],
};

// ── Injected CSS ──
let styleInjected = false;
function injectBlocklyStyles() {
  if (styleInjected) return;
  styleInjected = true;
  const s = document.createElement("style");
  s.textContent = `
    /* ═══ PikaBuddy Block Editor — Scratch/Entry Inspired ═══ */
    .blocklySvg { background: #F8F9FB !important; }
    .blocklyMainBackground { stroke: none !important; }

    /* ── Toolbox Sidebar ── */
    .blocklyToolboxDiv {
      background: linear-gradient(180deg, #FAFBFF 0%, #F3F4FA 100%) !important;
      border-right: 1.5px solid #E8EAF0 !important;
      box-shadow: none !important;
      padding: 8px 0 !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      width: auto !important;
      min-width: 0 !important;
    }
    .blocklyToolboxDiv::-webkit-scrollbar { width: 4px; }
    .blocklyToolboxDiv::-webkit-scrollbar-thumb { background: #D0D0D0; border-radius: 4px; }
    .blocklyToolboxContents {
      display: flex !important;
      flex-direction: column !important;
      gap: 2px !important;
      padding: 4px 8px !important;
    }

    /* ── Category Row ── */
    .blocklyTreeRow {
      padding: 9px 14px 9px 12px !important;
      margin: 0 !important;
      border-radius: 10px !important;
      height: auto !important;
      line-height: 1 !important;
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      gap: 9px !important;
      cursor: pointer !important;
      transition: all 0.15s ease !important;
      min-height: 0 !important;
      white-space: nowrap !important;
      border-left: 3px solid transparent !important;
    }
    .blocklyTreeRow:hover {
      background: rgba(0,0,0,0.04) !important;
    }
    .blocklyTreeSelected {
      background: rgba(76,151,255,0.10) !important;
      border-left-color: var(--blockly-cat-color, #4C97FF) !important;
    }

    /* ── Category Icon (colored circle) ── */
    .blocklyTreeIcon {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 26px !important;
      height: 26px !important;
      border-radius: 8px !important;
      flex-shrink: 0 !important;
      margin: 0 !important;
      background: var(--blockly-cat-color, #4C97FF) !important;
      color: #fff !important;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1) !important;
    }
    .blocklyTreeIcon svg {
      width: 15px !important;
      height: 15px !important;
    }

    /* ── Category Label ── */
    .blocklyTreeLabel {
      font-size: 13px !important;
      font-weight: 700 !important;
      font-family: "Pretendard", "Noto Sans KR", -apple-system, sans-serif !important;
      color: #37474F !important;
      letter-spacing: -0.2px !important;
    }
    .blocklyTreeSelected .blocklyTreeLabel {
      color: #1565C0 !important;
    }

    /* ── Flyout ── */
    .blocklyFlyoutBackground { fill: #F5F6FA !important; fill-opacity: 0.98 !important; }

    /* ── Block text ── */
    .blocklyText {
      font-size: 13px !important;
      font-family: "Pretendard", "Noto Sans KR", -apple-system, sans-serif !important;
      font-weight: 500 !important;
    }
    .blocklyEditableText:hover > rect {
      stroke: rgba(255,255,255,0.5) !important;
      stroke-width: 1.5 !important;
    }

    /* ── Trashcan ── */
    .blocklyTrash {
      opacity: 0.35 !important;
      transition: all 0.25s ease !important;
      transform-origin: center bottom !important;
    }
    .blocklyTrash:hover { opacity: 0.8 !important; transform: scale(1.1) !important; }

    /* ── Scrollbar ── */
    .blocklyScrollbarHandle { rx: 5 !important; ry: 5 !important; fill: #CBD5E1 !important; }
    .blocklyScrollbarHandle:hover { fill: #94A3B8 !important; }
    .blocklyScrollbarBackground { fill: transparent !important; }

    /* ── Zoom controls ── */
    .blocklyZoom > image { opacity: 0.3 !important; transition: opacity 0.15s !important; }
    .blocklyZoom > image:hover { opacity: 0.8 !important; }

    /* ── Grid ── */
    .blocklyGridLine { stroke: #EBEDF0 !important; }

    /* ── Connections ── */
    .blocklyHighlightedConnectionPath { stroke: #FFCA28 !important; stroke-width: 4px !important; }
    .blocklySelected > .blocklyPath { filter: brightness(1.06) drop-shadow(0 0 4px rgba(0,0,0,0.12)) !important; }
    .blocklyDragging > .blocklyPath { filter: drop-shadow(0 8px 20px rgba(0,0,0,0.18)) !important; }
    .blocklyInsertionMarker > .blocklyPath {
      fill: #FFCA28 !important; fill-opacity: 0.35 !important;
      stroke: #FFB300 !important; stroke-width: 2px !important;
    }
  `;
  document.head.appendChild(s);
}

/** After workspace init: inject custom SVG icons into the category rows */
function applyToolboxIcons(container: HTMLElement) {
  const rows = container.querySelectorAll<HTMLElement>(".blocklyTreeRow");
  rows.forEach((row) => {
    const label = row.querySelector(".blocklyTreeLabel");
    const icon = row.querySelector(".blocklyTreeIcon");
    if (!label || !icon) return;
    const name = label.textContent?.trim() || "";
    const color = CAT_COLORS[name];
    const svgHtml = CAT_ICONS[name];
    if (color) {
      (row as HTMLElement).style.setProperty("--blockly-cat-color", color);
      (icon as HTMLElement).style.setProperty("--blockly-cat-color", color);
      (icon as HTMLElement).style.background = color;
    }
    if (svgHtml) {
      icon.innerHTML = svgHtml;
    }
  });
}

function BlockEditorInner({ language, onCodeChange }: BlockEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<unknown>(null);
  const onCodeChangeRef = useRef(onCodeChange);
  const languageRef = useRef(language);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { onCodeChangeRef.current = onCodeChange; }, [onCodeChange]);
  useEffect(() => { languageRef.current = language; }, [language]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let disposed = false;

    injectBlocklyStyles();

    (async () => {
      try {
        await loadBlockly();
        if (disposed || !blocklyCore || !pyGen || !jsGen) return;

        const Blockly = blocklyCore;
        registerCustomBlocks();

        // Generous snap radius (Scratch-like)
        if (Blockly.config) {
          Blockly.config.snapRadius = 48;
          Blockly.config.connectingSnapRadius = 68;
        }

        await new Promise((r) => setTimeout(r, 80));
        if (disposed) return;

        const workspace = Blockly.inject(el, {
          toolbox: TOOLBOX as Blockly.utils.toolbox.ToolboxDefinition,
          renderer: "zelos",
          grid: { spacing: 40, length: 2, colour: "#E8E8E8", snap: true },
          zoom: { controls: true, wheel: true, startScale: 0.9, maxScale: 2.5, minScale: 0.3, scaleSpeed: 1.15, pinch: true },
          trashcan: true,
          sounds: false,
          move: { scrollbars: { horizontal: true, vertical: true }, drag: true, wheel: true },
        });

        workspaceRef.current = workspace;
        setLoading(false);

        // Inject category icons after toolbox renders
        requestAnimationFrame(() => applyToolboxIcons(el));

        // ── Trash warning ──
        let trashWarning: HTMLDivElement | null = null;
        const showTrashWarning = () => {
          if (trashWarning) return;
          trashWarning = document.createElement("div");
          Object.assign(trashWarning.style, {
            position: "absolute", bottom: "16px", right: "16px",
            padding: "10px 18px", borderRadius: "12px",
            background: "rgba(239,68,68,0.92)", color: "#fff",
            fontSize: "13px", fontWeight: "700", pointerEvents: "none",
            fontFamily: `"Pretendard","Noto Sans KR",sans-serif`,
            boxShadow: "0 4px 16px rgba(239,68,68,0.3)",
            zIndex: "100", transition: "opacity 0.2s, transform 0.2s",
            transform: "translateY(4px)", opacity: "0",
          });
          trashWarning.textContent = "🗑️ 놓으면 삭제됩니다";
          el.appendChild(trashWarning);
          requestAnimationFrame(() => { if (trashWarning) { trashWarning.style.opacity = "1"; trashWarning.style.transform = "translateY(0)"; } });
        };
        const hideTrashWarning = () => {
          if (!trashWarning) return;
          trashWarning.style.opacity = "0";
          const w = trashWarning; setTimeout(() => w.remove(), 200);
          trashWarning = null;
        };

        workspace.addChangeListener((e: Blockly.Events.Abstract) => {
          if (e.type === Blockly.Events.BLOCK_CHANGE || e.type === Blockly.Events.BLOCK_CREATE ||
            e.type === Blockly.Events.BLOCK_DELETE || e.type === Blockly.Events.BLOCK_MOVE) {
            try {
              const code = languageRef.current === "javascript"
                ? jsGen!.javascriptGenerator.workspaceToCode(workspace)
                : pyGen!.pythonGenerator.workspaceToCode(workspace);
              onCodeChangeRef.current(code);
            } catch { /* */ }
          }
          if (e.type === Blockly.Events.BLOCK_DRAG) {
            if (!(e as Blockly.Events.BlockDrag).isStart) hideTrashWarning();
          }
        });

        // Poll trashcan lid
        let pollId: ReturnType<typeof setInterval> | null = null;
        const tc = (workspace as unknown as { trashcan?: { isLidOpen?: boolean } }).trashcan;
        if (tc) {
          pollId = setInterval(() => {
            const trashSvg = el.querySelector(".blocklyTrash") as SVGElement | null;
            if (tc.isLidOpen) {
              showTrashWarning();
              if (trashSvg) { trashSvg.style.opacity = "1"; trashSvg.style.transform = "scale(1.3)"; trashSvg.style.filter = "drop-shadow(0 0 10px rgba(239,68,68,0.5))"; }
            } else {
              hideTrashWarning();
              if (trashSvg) { trashSvg.style.opacity = ""; trashSvg.style.transform = ""; trashSvg.style.filter = ""; }
            }
          }, 100);
        }

        const origDispose = workspace.dispose.bind(workspace);
        workspace.dispose = () => { if (pollId) clearInterval(pollId); hideTrashWarning(); origDispose(); };
      } catch (err) {
        console.error("Blockly load failed:", err);
        setError(String(err));
        setLoading(false);
      }
    })();

    return () => {
      disposed = true;
      if (workspaceRef.current) { (workspaceRef.current as { dispose: () => void }).dispose(); workspaceRef.current = null; }
    };
  }, []);

  if (error) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#d32f2f" }}>
        <p style={{ fontWeight: 600 }}>블록 에디터 로드 실패</p>
        <p style={{ fontSize: 13, color: "#666" }}>{error}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", flex: 1, minHeight: 0, overflow: "hidden", background: loading ? "#F8F9FB" : undefined }}>
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 200, gap: 12, color: "#575E75" }}>
          <div style={{ width: 36, height: 36, border: "3px solid #E0E0E0", borderTopColor: "#4C97FF", borderRadius: "50%", animation: "blockly-spin 0.7s linear infinite" }} />
          <span style={{ fontSize: 14, fontWeight: 600, fontFamily: `"Pretendard","Noto Sans KR",sans-serif` }}>블록 에디터 준비 중...</span>
          <style>{`@keyframes blockly-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}

export default function BlockEditor(props: BlockEditorProps) {
  return (
    <BlockEditorErrorBoundary>
      <BlockEditorInner {...props} />
    </BlockEditorErrorBoundary>
  );
}
