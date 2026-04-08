import "@excalidraw/excalidraw/index.css";
import { lazy, Suspense, useState } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/dist/types/excalidraw/types";

const Excalidraw = lazy(() =>
  import("@excalidraw/excalidraw").then((m) => ({ default: m.Excalidraw }))
);

interface Props {
  initialData?: string | null; // JSON string of { elements, appState, files }
  onSave: (sceneData: string, preview: string) => void;
  onClose: () => void;
}

export default function DrawingCanvas({ initialData, onSave, onClose }: Props) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const [exporting, setExporting] = useState(false);

  const parsedInitial = (() => {
    if (!initialData) return undefined;
    try { return JSON.parse(initialData); } catch { return undefined; }
  })();

  const handleSave = async () => {
    if (!api) return;
    setExporting(true);
    try {
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const elements = api.getSceneElements();
      const appState = api.getAppState();
      const files = api.getFiles();

      if (elements.length === 0) { onClose(); return; }

      const blob = await exportToBlob({
        elements,
        appState: { ...appState, exportWithDarkMode: false },
        files,
        mimeType: "image/png",
        exportPadding: 20,
      });

      const reader = new FileReader();
      reader.onload = () => {
        const sceneJson = JSON.stringify({ elements, files });
        onSave(sceneJson, reader.result as string);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error("[DrawingCanvas] export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="drawing-overlay" onClick={onClose}>
      <div className="drawing-modal" onClick={(e) => e.stopPropagation()}>
        <div className="drawing-header">
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>✏️ 그리기</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--on-surface-variant)" }}>
              도형 · 화살표 · 자유 그리기 · 텍스트 · 연결선
            </p>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="btn btn-secondary" onClick={onClose}>취소</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={exporting}>
              {exporting ? "처리 중..." : "노트에 삽입"}
            </button>
          </div>
        </div>
        <div className="drawing-canvas-wrap">
          <Suspense fallback={
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 12 }}>
              <div className="loading-spinner" />
              <p style={{ color: "var(--on-surface-variant)", fontSize: 14 }}>캔버스 로딩 중...</p>
            </div>
          }>
            <Excalidraw
              excalidrawAPI={(a) => setApi(a)}
              initialData={parsedInitial}
              theme="light"
              langCode="ko-KR"
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
