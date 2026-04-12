/**
 * 재사용 가능한 이미지 크롭 모달
 * - react-easy-crop 사용
 * - 아바타(원형), 배너(3:1), 배경(자유) 등 다양한 비율 지원
 */
import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

interface Props {
  src: string;
  aspect?: number;          // 기본: 3 (3:1 banner). 1이면 정사각형
  cropShape?: "rect" | "round";
  outputWidth?: number;      // 출력 너비 (px). 기본: 960
  outputHeight?: number;     // 출력 높이 (px). aspect로 자동 계산
  onConfirm: (blob: Blob, dataUrl: string) => void;
  onCancel: () => void;
  title?: string;
}

function getCroppedBlob(src: string, area: Area, w: number, h: number): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      // Round pixel coordinates to prevent sub-pixel rendering mismatch
      const sx = Math.round(area.x);
      const sy = Math.round(area.y);
      const sw = Math.round(area.width);
      const sh = Math.round(area.height);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/png");
      canvas.toBlob((blob) => {
        if (blob) resolve({ blob, dataUrl });
        else reject(new Error("Canvas toBlob failed"));
      }, "image/png");
    };
    img.onerror = reject;
    img.src = src;
  });
}

export default function ImageCropModal({
  src, aspect = 3, cropShape = "rect",
  outputWidth = 960, outputHeight,
  onConfirm, onCancel, title = "이미지 자르기",
}: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedArea) return;
    setSaving(true);
    try {
      const h = outputHeight || Math.round(outputWidth / aspect);
      const { blob, dataUrl } = await getCroppedBlob(src, croppedArea, outputWidth, h);
      onConfirm(blob, dataUrl);
    } catch {
      onCancel();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10000,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "var(--surface-container-lowest, #1a1a1a)", borderRadius: 16,
        width: "min(90vw, 600px)", overflow: "hidden",
        boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
      }}>
        {/* Header */}
        <div style={{
          padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid var(--outline-variant)",
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--on-surface)" }}>{title}</span>
          <button onClick={onCancel} style={{
            border: "none", background: "transparent", cursor: "pointer",
            fontSize: 18, color: "var(--on-surface-variant)", lineHeight: 1,
          }}>&times;</button>
        </div>

        {/* Crop area */}
        <div style={{ position: "relative", height: 340, background: "#111" }}>
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Zoom slider */}
        <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>확대</span>
          <input type="range" min={1} max={3} step={0.05} value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{ flex: 1 }}
          />
        </div>

        {/* Actions */}
        <div style={{
          padding: "12px 20px", display: "flex", gap: 8, justifyContent: "flex-end",
          borderTop: "1px solid var(--outline-variant)",
        }}>
          <button className="btn btn-ghost" onClick={onCancel}
            style={{ fontSize: 13, padding: "8px 16px" }}>취소</button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={saving}
            style={{ fontSize: 13, padding: "8px 20px" }}>
            {saving ? "처리 중..." : "적용"}
          </button>
        </div>
      </div>
    </div>
  );
}
