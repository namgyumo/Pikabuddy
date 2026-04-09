import { useRef, useState } from "react";
import { THEMES, CUSTOM_THEME_TEMPLATE } from "../../themes";
import { useThemeStore } from "../../store/themeStore";
import type { CustomTheme } from "../../themes";
import ThemeEditor from "./ThemeEditor";

export default function ThemePicker() {
  const { currentTheme, setTheme, customThemes, addCustomTheme, removeCustomTheme } =
    useThemeStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<CustomTheme | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json") && !file.name.endsWith(".pikabuddy-theme.json")) {
      setError(".json 또는 .pikabuddy-theme.json 파일만 업로드할 수 있습니다.");
      return;
    }

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const theme = addCustomTheme(json);
      setTheme(theme.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "파일을 읽을 수 없습니다.");
    }

    // Reset input so same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([JSON.stringify(CUSTOM_THEME_TEMPLATE, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-theme.pikabuddy-theme.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const openNewEditor = () => {
    setEditingTheme(null);
    setEditorOpen(true);
  };

  const openEditEditor = (theme: CustomTheme) => {
    setEditingTheme(theme);
    setEditorOpen(true);
  };

  return (
    <div className="theme-picker">
      {/* Built-in Themes */}
      <div className="theme-picker-grid">
        {THEMES.map((theme) => {
          const isActive = currentTheme === theme.id;
          return (
            <button
              key={theme.id}
              className={`theme-card${isActive ? " active" : ""}`}
              onClick={() => setTheme(theme.id)}
              title={theme.nameEn}
            >
              <div className="theme-card-preview">
                <div className="theme-preview-sidebar" style={{ background: theme.preview[3] }}>
                  <div className="theme-preview-dot" style={{ background: theme.preview[0] }} />
                  <div className="theme-preview-dot" style={{ background: theme.preview[2], opacity: 0.5 }} />
                  <div className="theme-preview-dot" style={{ background: theme.preview[2], opacity: 0.3 }} />
                </div>
                <div className="theme-preview-main" style={{ background: theme.preview[1] }}>
                  <div className="theme-preview-header" style={{ background: theme.preview[0], opacity: 0.9 }} />
                  <div className="theme-preview-line" style={{ background: theme.preview[3], opacity: 0.15 }} />
                  <div className="theme-preview-line short" style={{ background: theme.preview[3], opacity: 0.1 }} />
                  <div className="theme-preview-accent" style={{ background: theme.preview[2], opacity: 0.2 }} />
                </div>
              </div>
              <span className="theme-card-name">{theme.nameKo}</span>
              {isActive && (
                <span className="theme-card-check">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="7" fill="var(--primary)" />
                    <path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom Themes Section */}
      <div className="custom-theme-section">
        <div className="custom-theme-header">
          <h4 className="custom-theme-title">커스텀 테마</h4>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn-template-download" onClick={handleDownloadTemplate}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v8m0 0L4 6.5m3 2.5l3-2.5M2 11h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              템플릿
            </button>
          </div>
        </div>

        {/* Create new + uploaded custom themes */}
        <div className="theme-picker-grid" style={{ marginBottom: 12 }}>
          {/* New theme card */}
          <button
            className="theme-card"
            onClick={openNewEditor}
            title="새 커스텀 테마 만들기"
            style={{ border: "2px dashed var(--outline-variant)" }}
          >
            <div className="theme-card-preview" style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--surface-container-low)",
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <span className="theme-card-name" style={{ color: "var(--primary)" }}>만들기</span>
          </button>

          {customThemes.map((theme) => {
            const isActive = currentTheme === theme.id;
            return (
              <div key={theme.id} className="custom-theme-card-wrap">
                <button
                  className={`theme-card${isActive ? " active" : ""}`}
                  onClick={() => setTheme(theme.id)}
                  title={theme.name}
                >
                  <div className="theme-card-preview">
                    <div className="theme-preview-sidebar" style={{ background: theme.preview[3] }}>
                      <div className="theme-preview-dot" style={{ background: theme.preview[0] }} />
                      <div className="theme-preview-dot" style={{ background: theme.preview[2], opacity: 0.5 }} />
                      <div className="theme-preview-dot" style={{ background: theme.preview[2], opacity: 0.3 }} />
                    </div>
                    <div className="theme-preview-main" style={{ background: theme.preview[1] }}>
                      <div className="theme-preview-header" style={{ background: theme.preview[0], opacity: 0.9 }} />
                      <div className="theme-preview-line" style={{ background: theme.preview[3], opacity: 0.15 }} />
                      <div className="theme-preview-line short" style={{ background: theme.preview[3], opacity: 0.1 }} />
                      <div className="theme-preview-accent" style={{ background: theme.preview[2], opacity: 0.2 }} />
                    </div>
                  </div>
                  <span className="theme-card-name">{theme.name}</span>
                  {isActive && (
                    <span className="theme-card-check">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="7" fill="var(--primary)" />
                        <path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </button>
                {/* Edit + Delete buttons */}
                <button
                  className="custom-theme-edit"
                  onClick={() => openEditEditor(theme)}
                  title="편집"
                  style={{
                    position: "absolute", top: 4, right: 24, width: 20, height: 20,
                    borderRadius: "50%", border: "none", cursor: "pointer",
                    background: "var(--surface-container-high)", color: "var(--on-surface-variant)",
                    fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center",
                    opacity: 0, transition: "opacity 0.15s",
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                  </svg>
                </button>
                <button
                  className="custom-theme-delete"
                  onClick={() => removeCustomTheme(theme.id)}
                  title="삭제"
                >
                  &times;
                </button>
              </div>
            );
          })}
        </div>

        {/* Upload area */}
        <div
          className="custom-theme-upload"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleUpload}
            style={{ display: "none" }}
          />
          <div className="custom-theme-upload-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 16V4m0 0L8 8m4-4l4 4M4 18h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="custom-theme-upload-text">
            <span className="custom-theme-upload-label">.pikabuddy-theme.json 파일 업로드</span>
            <span className="custom-theme-upload-hint">클릭하여 파일 선택</span>
          </div>
        </div>

        {error && <div className="custom-theme-error">{error}</div>}
      </div>

      {/* Theme Editor Modal */}
      {editorOpen && (
        <ThemeEditor
          onClose={() => setEditorOpen(false)}
          editingTheme={editingTheme}
        />
      )}
    </div>
  );
}
