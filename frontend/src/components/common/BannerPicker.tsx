/**
 * 배너 선택 피커 — 그라디언트 프리셋 + 이미지 업로드 (크롭 포함)
 */
import { useState, useRef } from "react";
import { BANNER_PRESETS } from "../../lib/bannerPresets";
import ImageCropModal from "./ImageCropModal";
import api from "../../lib/api";

interface Props {
  current: string;                    // 현재 선택된 배너 값
  onChange: (value: string) => void;  // 선택 변경 (gradient:xxx 또는 URL)
  onSave: (value: string | null) => Promise<void>;
  onCancel: () => void;
  uploadEndpoint?: string;            // 이미지 업로드 엔드포인트 (기본: /auth/banner)
}

export default function BannerPicker({ current, onChange, onSave, onCancel, uploadEndpoint = "/auth/banner" }: Props) {
  const [saving, setSaving] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropConfirm = async (blob: Blob) => {
    setUploading(true);
    setCropSrc(null);
    try {
      const formData = new FormData();
      formData.append("file", blob, "banner.png");
      const { data } = await api.post(uploadEndpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange(data.banner_url);
    } catch {
      /* ignore */
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(current || null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="banner-picker-backdrop" onClick={onCancel} />
      <div className="banner-picker-dropdown">
        <div className="banner-picker-title">배너 선택</div>
        <div className="banner-preset-grid">
          {BANNER_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`banner-preset-item${current === `gradient:${p.id}` ? " active" : ""}`}
              style={{ background: p.gradient }}
              onClick={() => onChange(`gradient:${p.id}`)}
              title={p.label}
            />
          ))}
        </div>

        {/* 이미지 업로드 */}
        <div style={{ marginTop: 10 }}>
          <button
            className="btn btn-ghost"
            style={{
              width: "100%", fontSize: 12, padding: "7px 0",
              border: "1px dashed var(--outline-variant)", borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "업로드 중..." : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                이미지 업로드
              </>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileSelect} />
        </div>

        {/* 현재 이미지 미리보기 */}
        {current && !current.startsWith("gradient:") && (
          <div style={{
            marginTop: 8, borderRadius: 8, overflow: "hidden",
            border: "2px solid var(--primary)", height: 48,
            backgroundImage: `url(${current})`, backgroundSize: "cover", backgroundPosition: "center",
          }} />
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button className="btn btn-primary" style={{ flex: 1, fontSize: 13, padding: "6px 0" }}
            onClick={handleSave} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </button>
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: "6px 8px" }}
            onClick={onCancel}>취소</button>
        </div>
      </div>

      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          aspect={3}
          outputWidth={960}
          title="배너 이미지 자르기"
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </>
  );
}
