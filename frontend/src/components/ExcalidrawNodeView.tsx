import { useRef, useState, useEffect, useCallback } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import DrawingCanvas from "./DrawingCanvas";

type Align = "left" | "center" | "right" | "float-left" | "float-right";
type HandleDir = "TL" | "T" | "TR" | "R" | "BR" | "B" | "BL" | "L";

interface TextOverlay {
  id: string;
  text: string;
  x: number; // % from left inside image
  y: number; // % from top inside image
}

interface Attrs {
  sceneData: string | null;
  preview: string | null;
  width: number;
  align: Align;
  caption: string;
  textOverlays: string; // JSON string of TextOverlay[]
}
interface Props {
  node: { attrs: Attrs };
  updateAttributes: (attrs: Partial<Attrs>) => void;
  deleteNode: () => void;
  selected: boolean;
}

const CURSORS: Record<HandleDir, string> = {
  TL: "nw-resize", T: "n-resize", TR: "ne-resize", R: "e-resize",
  BR: "se-resize", B: "s-resize", BL: "sw-resize", L: "w-resize",
};
const ALIGN_LABELS: Record<Align, string> = {
  left: "⬅", center: "⬛", right: "➡", "float-left": "↩", "float-right": "↪",
};
const ALIGN_TITLES: Record<Align, string> = {
  left: "왼쪽", center: "가운데", right: "오른쪽",
  "float-left": "왼쪽 감싸기", "float-right": "오른쪽 감싸기",
};

function delta(dir: HandleDir, dx: number, dy: number) {
  switch (dir) {
    case "L": case "TL": case "BL": return -dx;
    case "R": case "TR": case "BR": return dx;
    case "T": return -dy;
    case "B": return  dy;
  }
}

function parseOverlays(raw: string): TextOverlay[] {
  try { return JSON.parse(raw) || []; } catch { return []; }
}

// ── 개별 텍스트 오버레이 ──────────────────────────────────
function TextOverlayItem({
  ov, imageRef, onUpdate, onDelete,
}: {
  ov: TextOverlay;
  imageRef: React.RefObject<HTMLDivElement | null>;
  onUpdate: (id: string, changes: Partial<TextOverlay>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(ov.text === "");
  const [draft, setDraft]   = useState(ov.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (editing) textareaRef.current?.focus(); }, [editing]);

  const startDrag = (e: React.MouseEvent) => {
    if (editing) return;
    e.preventDefault(); e.stopPropagation();
    const el = imageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const startX = e.clientX; const startY = e.clientY;
    const ox = ov.x; const oy = ov.y;

    const onMove = (ev: MouseEvent) => {
      const nx = ox + ((ev.clientX - startX) / rect.width)  * 100;
      const ny = oy + ((ev.clientY - startY) / rect.height) * 100;
      onUpdate(ov.id, {
        x: Math.max(0, Math.min(95, nx)),
        y: Math.max(0, Math.min(95, ny)),
      });
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const commit = () => {
    if (draft.trim() === "") { onDelete(ov.id); return; }
    onUpdate(ov.id, { text: draft });
    setEditing(false);
  };

  return (
    <div
      className="ex-text-overlay"
      style={{ left: `${ov.x}%`, top: `${ov.y}%` }}
      onMouseDown={startDrag}
      onDoubleClick={e => { e.stopPropagation(); setEditing(true); setDraft(ov.text); }}
    >
      {editing ? (
        <textarea
          ref={textareaRef}
          className="ex-text-overlay-input"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); }
            if (e.key === "Escape") { if (ov.text === "") onDelete(ov.id); else setEditing(false); }
          }}
          onBlur={commit}
          onClick={e => e.stopPropagation()}
          rows={1}
        />
      ) : (
        <>
          <span className="ex-text-overlay-text">{ov.text}</span>
          <button
            className="ex-text-overlay-del"
            onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onDelete(ov.id); }}
            title="텍스트 삭제"
          >×</button>
        </>
      )}
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────
export default function ExcalidrawNodeView({ node, updateAttributes, deleteNode, selected }: Props) {
  const { sceneData, preview, width, align, caption, textOverlays: rawOverlays } = node.attrs;
  const [editing, setEditing]         = useState(!preview);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft]     = useState(caption);
  const [overlays, setOverlays]         = useState<TextOverlay[]>(() => parseOverlays(rawOverlays ?? "[]"));

  const wrapRef      = useRef<HTMLDivElement>(null);
  const widthRef     = useRef(width);

  // rawOverlays가 외부에서 바뀌면 로컬 상태 동기화
  useEffect(() => { setOverlays(parseOverlays(rawOverlays ?? "[]")); }, [rawOverlays]);

  const saveOverlays = useCallback((next: TextOverlay[]) => {
    setOverlays(next);
    updateAttributes({ textOverlays: JSON.stringify(next) });
  }, [updateAttributes]);

  const addTextOverlay = () => {
    const id = crypto.randomUUID();
    saveOverlays([...overlays, { id, text: "", x: 40, y: 40 }]);
  };

  const updateOverlay = useCallback((id: string, changes: Partial<TextOverlay>) => {
    setOverlays(prev => {
      const next = prev.map(o => o.id === id ? { ...o, ...changes } : o);
      // position 드래그 중엔 attr 저장 안 함 (onUp에서만)
      if ("text" in changes) updateAttributes({ textOverlays: JSON.stringify(next) });
      return next;
    });
  }, [updateAttributes]);

  const deleteOverlay = useCallback((id: string) => {
    saveOverlays(overlays.filter(o => o.id !== id));
  }, [overlays, saveOverlays]);

  // ── 리사이즈 핸들 드래그 ─────────────────────────────
  const startResize = (dir: HandleDir, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX; const startY = e.clientY;
    const container = wrapRef.current?.closest(".note-editor") as HTMLElement
                   ?? wrapRef.current?.parentElement as HTMLElement;
    const containerW = container?.offsetWidth ?? 800;
    const startPx = wrapRef.current ? wrapRef.current.offsetWidth : (containerW * width / 100);

    const onMove = (ev: MouseEvent) => {
      const d = delta(dir, ev.clientX - startX, ev.clientY - startY);
      const newPx  = Math.max(80, startPx + d);
      const newPct = Math.min(100, Math.round((newPx / containerW) * 100));
      widthRef.current = newPct;
      if (wrapRef.current) wrapRef.current.style.width = `${newPct}%`;
    };
    const onUp = () => {
      updateAttributes({ width: widthRef.current });
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  if (editing) {
    return (
      <NodeViewWrapper>
        <DrawingCanvas
          initialData={sceneData}
          onSave={(newScene, newPreview) => {
            updateAttributes({ sceneData: newScene, preview: newPreview });
            setEditing(false);
          }}
          onClose={() => { if (!preview) deleteNode(); else setEditing(false); }}
        />
      </NodeViewWrapper>
    );
  }

  const isFloat = align === "float-left" || align === "float-right";

  const outerStyle: React.CSSProperties = isFloat
    ? { display: "block" }
    : { display: "flex", justifyContent: align, margin: "8px 0" };

  const innerStyle: React.CSSProperties = isFloat
    ? {
        float: align === "float-left" ? "left" : "right",
        margin: align === "float-left" ? "4px 16px 8px 0" : "4px 0 8px 16px",
        width: `${width}%`,
        position: "relative",
      }
    : { width: `${width}%`, position: "relative" };

  const handleCaptionSave = () => {
    updateAttributes({ caption: captionDraft });
    setEditingCaption(false);
  };

  return (
    <NodeViewWrapper contentEditable={false}>
      {/* ── TipTap 드래그 핸들 (블록 위치 이동) ── */}
      <div className="ex-drag-handle" data-drag-handle title="드래그로 이동">⠿</div>

      <div style={outerStyle}>
        <div
          ref={wrapRef}
          className={`excalidraw-node ${selected ? "selected" : ""}`}
          style={innerStyle}
          onDoubleClick={() => setEditing(true)}
        >
          <img src={preview!} alt="그리기" className="excalidraw-preview" draggable={false} />

          {/* ── 오버레이 툴바 (이미지 위에 float) ── */}
          <div className="ex-overlay-toolbar">
            <span className="ex-tbar-label">정렬</span>
            {(["left","center","right","float-left","float-right"] as Align[]).map(a => (
              <button key={a}
                className={`ex-tbar-btn ${align === a ? "active" : ""}`}
                title={ALIGN_TITLES[a]}
                onMouseDown={e => { e.preventDefault(); e.stopPropagation(); updateAttributes({ align: a }); }}>
                {ALIGN_LABELS[a]}
              </button>
            ))}
            <div className="ex-tbar-sep" />

            <span className="ex-tbar-label">크기</span>
            {[25, 50, 75, 100].map(w => (
              <button key={w}
                className={`ex-tbar-btn ${width === w ? "active" : ""}`}
                title={`${w}%`}
                onMouseDown={e => { e.preventDefault(); e.stopPropagation(); widthRef.current = w; updateAttributes({ width: w }); }}>
                {w}%
              </button>
            ))}
            <div className="ex-tbar-sep" />

            <button className="ex-tbar-btn" title="텍스트 추가 (T)"
              onMouseDown={e => { e.preventDefault(); e.stopPropagation(); addTextOverlay(); }}>T+</button>
            <button className="ex-tbar-btn" title="캡션 편집"
              onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setEditingCaption(v => !v); setCaptionDraft(caption); }}>📝</button>
            <button className="ex-tbar-btn" title="편집 (더블클릭)"
              onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setEditing(true); }}>✏️</button>
            <button className="ex-tbar-btn danger" title="삭제"
              onMouseDown={e => { e.preventDefault(); e.stopPropagation(); deleteNode(); }}>🗑</button>
          </div>

          {/* ── 텍스트 오버레이 ── */}
          {overlays.map(ov => (
            <TextOverlayItem
              key={ov.id}
              ov={ov}
              imageRef={wrapRef}
              onUpdate={updateOverlay}
              onDelete={deleteOverlay}
            />
          ))}

          {/* ── 8방향 리사이즈 핸들 ── */}
          {(["TL","T","TR","R","BR","B","BL","L"] as HandleDir[]).map(dir => (
            <div
              key={dir}
              className={`rh rh-${dir}`}
              style={{ cursor: CURSORS[dir] }}
              onMouseDown={e => startResize(dir, e)}
            />
          ))}
        </div>

        {/* ── 캡션 ── */}
        {editingCaption ? (
          <div className="ex-caption-edit">
            <input
              autoFocus
              className="ex-caption-input"
              value={captionDraft}
              placeholder="캡션을 입력하세요..."
              onChange={e => setCaptionDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") handleCaptionSave();
                if (e.key === "Escape") setEditingCaption(false);
              }}
            />
            <button className="ex-caption-save"   onMouseDown={e => { e.preventDefault(); handleCaptionSave(); }}>확인</button>
            <button className="ex-caption-cancel" onMouseDown={e => { e.preventDefault(); setEditingCaption(false); }}>취소</button>
          </div>
        ) : caption ? (
          <div
            className="ex-caption"
            style={{ textAlign: isFloat ? (align === "float-left" ? "left" : "right") : (align as React.CSSProperties["textAlign"]) }}
            onDoubleClick={() => { setEditingCaption(true); setCaptionDraft(caption); }}
            title="더블클릭으로 캡션 편집"
          >
            {caption}
          </div>
        ) : null}

        {isFloat && <div style={{ clear: "both" }} />}
      </div>
    </NodeViewWrapper>
  );
}
