import { useState, useEffect, useRef, useCallback, memo, lazy, Suspense } from "react";
import {
  ALLOWED_CSS_VARIABLES,
  ALLOWED_CSS_SET,
  VARIABLE_GROUPS,
  FONT_OPTIONS,
  ANIMATION_PRESETS,
  THEMES,
  sanitizeCSS,
  toHex,
  getCurrentVariableValues,
  loadGoogleFont,
} from "../../themes";
import type { VariableGroup, VariableDefinition } from "../../themes";
import { useThemeStore } from "../../store/themeStore";
import type { CustomTheme } from "../../themes";
import type { EffectsState } from "../../themes/effects";
import { effectManager } from "../../themes/effects";
import EffectsPanel from "./EffectsPanel";

interface Props {
  onClose: () => void;
  editingTheme?: CustomTheme | null;
}

type Tab = "gui" | "json" | "css" | "effects" | "assets";

export default function ThemeEditor({ onClose, editingTheme }: Props) {
  const { saveCustomTheme, setTheme } = useThemeStore();
  const prevThemeRef = useRef(useThemeStore.getState().currentTheme);

  const [tab, setTab] = useState<Tab>("gui");
  const [name, setName] = useState(editingTheme?.name || "My Theme");
  const [variables, setVariables] = useState<Record<string, string>>(() => {
    if (editingTheme) return { ...editingTheme.variables };
    return getCurrentVariableValues();
  });
  const [customCSS, setCustomCSS] = useState(editingTheme?.customCSS || "");
  const [animation, setAnimation] = useState(editingTheme?.animation || "none");
  const [effectsState, setEffectsState] = useState<EffectsState>(
    () => editingTheme?.effects || effectManager.loadState()
  );

  // JSON tab state
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  // GUI accordion
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["primary", "surface"]));

  // Live preview: apply variables + CSS to document (debounced with rAF)
  const rafRef = useRef(0);
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = document.documentElement;
      el.removeAttribute("data-theme");
      for (const [key, value] of Object.entries(variables)) {
        if (ALLOWED_CSS_SET.has(key)) {
          el.style.setProperty(key, value);
        }
      }
      let styleEl = document.getElementById("pikabuddy-custom-css") as HTMLStyleElement | null;
      if (customCSS) {
        if (!styleEl) {
          styleEl = document.createElement("style");
          styleEl.id = "pikabuddy-custom-css";
          document.head.appendChild(styleEl);
        }
        styleEl.textContent = sanitizeCSS(customCSS);
      } else if (styleEl) {
        styleEl.textContent = "";
      }
    });
    return () => cancelAnimationFrame(rafRef.current);
  }, [variables, customCSS]);

  // Sync JSON when switching to JSON tab
  useEffect(() => {
    if (tab === "json") {
      const hasEffects = Object.values(effectsState).some((c) => c.enabled);
      setJsonText(JSON.stringify({
        name, version: 1, variables,
        customCSS: customCSS || undefined,
        animation: animation !== "none" ? animation : undefined,
        effects: hasEffects ? effectsState : undefined,
      }, null, 2));
      setJsonError(null);
    }
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Throttled variable change — apply to DOM immediately, batch React state
  const pendingRef = useRef<Record<string, string>>({});
  const flushTimerRef = useRef(0);
  const handleVariableChange = useCallback((key: string, value: string) => {
    // Immediate DOM update (no React re-render)
    if (ALLOWED_CSS_SET.has(key)) {
      document.documentElement.style.setProperty(key, value);
    }
    pendingRef.current[key] = value;
    cancelAnimationFrame(flushTimerRef.current);
    flushTimerRef.current = requestAnimationFrame(() => {
      const batch = { ...pendingRef.current };
      pendingRef.current = {};
      setVariables((prev) => ({ ...prev, ...batch }));
    });
  }, []);

  const handleJsonApply = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed.name && typeof parsed.name === "string") setName(parsed.name);
      if (parsed.variables && typeof parsed.variables === "object") {
        // Validate keys
        const cleaned: Record<string, string> = {};
        const allowed = ALLOWED_CSS_VARIABLES as readonly string[];
        for (const [k, v] of Object.entries(parsed.variables)) {
          if (allowed.includes(k) && typeof v === "string") cleaned[k] = v;
        }
        setVariables(cleaned);
      }
      if (typeof parsed.customCSS === "string") setCustomCSS(parsed.customCSS);
      if (typeof parsed.animation === "string") setAnimation(parsed.animation);
      if (parsed.effects && typeof parsed.effects === "object") {
        setEffectsState(parsed.effects);
        effectManager.applyState(parsed.effects);
      }
      setJsonError(null);
    } catch {
      setJsonError("JSON 형식이 올바르지 않습니다.");
    }
  };

  const handleSave = () => {
    // Save effects state
    effectManager.saveState(effectsState);
    effectManager.applyState(effectsState);

    const theme = saveCustomTheme({
      id: editingTheme?.id,
      name: name.trim() || "My Theme",
      variables,
      customCSS: customCSS || undefined,
      animation: animation !== "none" ? animation : undefined,
      effects: Object.keys(effectsState).length > 0 ? effectsState : undefined,
    });
    setTheme(theme.id);
    onClose();
  };

  const handleCancel = () => {
    // Revert: clear inline styles and restore previous theme
    const el = document.documentElement;
    ALLOWED_CSS_VARIABLES.forEach((v) => el.style.removeProperty(v));
    document.getElementById("pikabuddy-custom-css")?.remove();
    // Restore previous effects state
    effectManager.disableAll();
    const prevEffects = effectManager.loadState();
    effectManager.applyState(prevEffects);
    setTheme(prevThemeRef.current);
    onClose();
  };

  const handleExport = () => {
    const hasEffects = Object.values(effectsState).some((c) => c.enabled);
    const data = {
      name, version: 1, variables,
      customCSS: customCSS || undefined,
      animation: animation !== "none" ? animation : undefined,
      effects: hasEffects ? effectsState : undefined,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/\s+/g, "-").toLowerCase()}.pikabuddy-theme.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadBuiltinTheme = (themeId: string, themeName: string) => {
    const el = document.documentElement;
    // Clear inline styles so computed values come from the theme stylesheet
    ALLOWED_CSS_VARIABLES.forEach((v) => el.style.removeProperty(v));
    if (themeId === "default") {
      el.removeAttribute("data-theme");
    } else {
      el.setAttribute("data-theme", themeId);
    }
    // Force reflow so getComputedStyle reads the new theme
    void el.offsetHeight;
    const vars = getCurrentVariableValues();
    // Remove data-theme — the editor's useEffect will re-apply as inline styles
    el.removeAttribute("data-theme");
    setVariables(vars);
    if (name === "My Theme" || name.endsWith("(커스텀)")) {
      setName(`${themeName} (커스텀)`);
    }
  };

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "gui", label: "GUI 에디터", icon: "🎨" },
    { key: "effects", label: "이펙트", icon: "✨" },
    { key: "assets", label: "에셋", icon: "🖼️" },
    { key: "json", label: "JSON", icon: "{ }" },
    { key: "css", label: "CSS", icon: "</>" },
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10000,
      background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "var(--surface-container-lowest)", borderRadius: 20,
        width: "min(95vw, 740px)", maxHeight: "90vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 25px 80px rgba(0,0,0,0.35), 0 0 0 1px var(--outline-variant)",
      }}>
        {/* Header with gradient accent */}
        <div style={{
          background: "linear-gradient(135deg, var(--primary), var(--tertiary, var(--primary-container)))",
          padding: "18px 24px 14px",
          display: "flex", alignItems: "center", gap: 14,
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", inset: 0, opacity: 0.08,
            background: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)",
          }} />
          <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>
              {editingTheme?.id ? "테마 편집" : "새 커스텀 테마"}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 3 }}>
              실시간 미리보기 · 변경사항이 바로 적용됩니다
            </div>
          </div>
          <button onClick={handleExport} style={btnHeaderGhost}>내보내기</button>
          <button onClick={handleCancel} style={btnHeaderGhost}>취소</button>
          <button onClick={handleSave} style={btnHeaderSave}>저장</button>
        </div>

        {/* Theme name + Tabs combined bar */}
        <div style={{
          padding: "12px 24px 0",
          background: "var(--surface-container-lowest)",
          borderBottom: "1px solid var(--outline-variant)",
        }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="테마 이름을 입력하세요"
            style={{
              width: "100%", padding: "9px 14px", border: "1.5px solid var(--outline-variant)",
              borderRadius: 10, fontSize: 14, fontWeight: 600, boxSizing: "border-box",
              background: "var(--surface-container-low)", color: "var(--on-surface)",
              transition: "border-color 0.15s",
              outline: "none",
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = "var(--primary)"}
            onBlur={(e) => e.currentTarget.style.borderColor = "var(--outline-variant)"}
          />
          <div style={{
            display: "flex", gap: 4, marginTop: 12, paddingBottom: 0,
          }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: "8px 14px", border: "none", cursor: "pointer",
                  borderRadius: "10px 10px 0 0",
                  background: tab === t.key
                    ? "var(--surface-container-low)"
                    : "transparent",
                  fontSize: 12, fontWeight: tab === t.key ? 700 : 500,
                  color: tab === t.key ? "var(--primary)" : "var(--on-surface-variant)",
                  transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: 5,
                  borderBottom: tab === t.key ? "2px solid var(--primary)" : "2px solid transparent",
                  marginBottom: -1,
                }}
              >
                <span style={{ fontSize: 13, lineHeight: 1 }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: "auto", padding: "16px 24px" }}>
          {/* ═══ GUI Tab ═══ */}
          {tab === "gui" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {/* Load from built-in theme */}
              <div style={{
                border: "1px solid var(--outline-variant)", borderRadius: 12,
                padding: "14px 16px", marginBottom: 6,
                background: "var(--surface-container-low)",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "var(--on-surface)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 15 }}>🎯</span> 기본 테마에서 시작
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => loadBuiltinTheme(t.id, t.nameKo)}
                      style={{
                        padding: "6px 12px 6px 8px", borderRadius: 20, cursor: "pointer",
                        border: "1.5px solid var(--outline-variant)",
                        background: "var(--surface-container-lowest)",
                        color: "var(--on-surface)", fontSize: 12, fontWeight: 500,
                        display: "flex", alignItems: "center", gap: 7,
                        transition: "all 0.2s",
                      }}
                      title={t.nameEn}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.preview[0]; e.currentTarget.style.boxShadow = `0 2px 8px ${t.preview[0]}33`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--outline-variant)"; e.currentTarget.style.boxShadow = "none"; }}
                    >
                      {/* 4-color mini preview strip */}
                      <span style={{
                        display: "flex", borderRadius: 10, overflow: "hidden",
                        width: 32, height: 16, flexShrink: 0,
                        border: "1px solid var(--outline-variant)",
                      }}>
                        {t.preview.map((c, i) => (
                          <span key={i} style={{ width: 8, height: 16, background: c }} />
                        ))}
                      </span>
                      {t.nameKo}
                    </button>
                  ))}
                </div>
              </div>

              {VARIABLE_GROUPS.map((group) => (
                <VariableGroupPanel
                  key={group.id}
                  group={group}
                  isOpen={openGroups.has(group.id)}
                  variables={variables}
                  onToggle={toggleGroup}
                  onChange={handleVariableChange}
                />
              ))}

              {/* Animation preset */}
              <div style={{
                border: "1px solid var(--outline-variant)", borderRadius: 12,
                padding: "14px 16px", marginTop: 6,
                background: "var(--surface-container-low)",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "var(--on-surface)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 15 }}>🎬</span> 배경 애니메이션
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {ANIMATION_PRESETS.map((a) => {
                    const active = animation === a.id;
                    return (
                    <button
                      key={a.id}
                      onClick={() => setAnimation(a.id)}
                      style={{
                        padding: "6px 16px", borderRadius: 20,
                        border: active ? "1.5px solid var(--primary)" : "1.5px solid var(--outline-variant)",
                        background: active ? "var(--primary)" : "var(--surface-container-lowest)",
                        color: active ? "#fff" : "var(--on-surface)",
                        fontSize: 12, fontWeight: active ? 600 : 500,
                        cursor: "pointer", transition: "all 0.2s",
                        boxShadow: active ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
                      }}
                    >
                      {a.label}
                    </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ═══ Effects Tab ═══ */}
          {tab === "effects" && (
            <EffectsPanel effectsState={effectsState} onChange={setEffectsState} />
          )}

          {/* ═══ Assets Tab ═══ */}
          {tab === "assets" && (
            <AssetPanel effectsState={effectsState} onChange={setEffectsState} />
          )}

          {/* ═══ JSON Tab ═══ */}
          {tab === "json" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{
                fontSize: 12, color: "var(--on-surface-variant)",
                padding: "10px 14px", borderRadius: 10,
                background: "var(--surface-container-low)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: 16 }}>💡</span>
                JSON을 직접 편집한 후 "적용" 버튼을 클릭하세요. GUI 에디터와 동기화됩니다.
              </div>
              <div style={{
                border: "1.5px solid var(--outline-variant)", borderRadius: 12, overflow: "hidden",
              }}>
                <div style={{
                  padding: "6px 14px", fontSize: 11, fontWeight: 600,
                  background: "var(--surface-container-high)", color: "var(--on-surface-variant)",
                  fontFamily: "monospace", display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span style={{ fontSize: 12 }}>{ }</span> theme.json
                </div>
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  spellCheck={false}
                  style={{
                    width: "100%", minHeight: 340, padding: 14, border: "none",
                    fontSize: 13, fontFamily: "'Fira Code', Consolas, monospace",
                    lineHeight: 1.6, resize: "vertical", boxSizing: "border-box",
                    background: "var(--surface-container)", color: "var(--on-surface)",
                    tabSize: 2, outline: "none",
                  }}
                />
              </div>
              {jsonError && (
                <div style={{
                  fontSize: 12, color: "var(--error)", padding: "8px 12px",
                  background: "var(--error-light)", borderRadius: 8,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span>⚠️</span> {jsonError}
                </div>
              )}
              <button onClick={handleJsonApply} style={{ ...btnPrimary, alignSelf: "flex-start" }}>
                적용
              </button>
            </div>
          )}

          {/* ═══ CSS Tab ═══ */}
          {tab === "css" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{
                fontSize: 12, color: "var(--on-surface-variant)", lineHeight: 1.5,
                padding: "10px 14px", borderRadius: 10,
                background: "var(--surface-container-low)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
                <span>
                  CSS를 직접 작성하여 앱 스타일을 오버라이드합니다.{" "}
                  <code style={{ background: "var(--surface-container)", padding: "1px 5px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                    var(--primary)
                  </code>{" "}
                  등 CSS 변수를 사용하면 GUI 설정과 연동됩니다.
                </span>
              </div>
              <div style={{
                border: "1.5px solid var(--outline-variant)", borderRadius: 12, overflow: "hidden",
              }}>
                <div style={{
                  padding: "6px 14px", fontSize: 11, fontWeight: 600,
                  background: "var(--surface-container-high)", color: "var(--on-surface-variant)",
                  fontFamily: "monospace", display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span style={{ fontSize: 12 }}>&lt;/&gt;</span> custom.css
                </div>
                <textarea
                  value={customCSS}
                  onChange={(e) => setCustomCSS(e.target.value)}
                  spellCheck={false}
                  placeholder={`/* 예시: 카드에 글래스 효과 */
.card {
  backdrop-filter: blur(12px);
  background: rgba(255,255,255,0.1) !important;
  border: 1px solid rgba(255,255,255,0.2);
}

/* 버튼 스타일 변경 */
.btn-primary {
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}`}
                  style={{
                    width: "100%", minHeight: 320, padding: 14, border: "none",
                    fontSize: 13, fontFamily: "'Fira Code', Consolas, monospace",
                    lineHeight: 1.6, resize: "vertical", boxSizing: "border-box",
                    background: "var(--surface-container)", color: "var(--on-surface)",
                    tabSize: 2, outline: "none",
                  }}
                />
              </div>
              <div style={{
                padding: "8px 12px", borderRadius: 8,
                background: "var(--surface-container-low)", fontSize: 11, color: "var(--on-surface-variant)",
                lineHeight: 1.5, display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: 13, flexShrink: 0 }}>🔒</span>
                <span><strong>보안:</strong> @import, expression(), javascript: 등 위험 구문은 자동 제거됩니다.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Inline button styles ── */

const btnHeaderGhost: React.CSSProperties = {
  padding: "6px 14px", border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: 8, background: "rgba(255,255,255,0.1)", color: "#fff",
  fontSize: 12, fontWeight: 500, cursor: "pointer",
  backdropFilter: "blur(4px)", transition: "all 0.15s",
  position: "relative", zIndex: 1,
};

const btnHeaderSave: React.CSSProperties = {
  padding: "7px 20px", border: "none", borderRadius: 8,
  background: "rgba(255,255,255,0.95)", color: "var(--primary)",
  fontSize: 13, fontWeight: 700, cursor: "pointer",
  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  transition: "all 0.15s", position: "relative", zIndex: 1,
};

const btnGhost: React.CSSProperties = {
  padding: "6px 14px", border: "1px solid var(--outline-variant)",
  borderRadius: 8, background: "transparent", color: "var(--on-surface)",
  fontSize: 13, fontWeight: 500, cursor: "pointer",
};

const btnPrimary: React.CSSProperties = {
  padding: "7px 18px", border: "none", borderRadius: 8,
  background: "var(--primary)", color: "#fff",
  fontSize: 13, fontWeight: 600, cursor: "pointer",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
};

/* ── Memoized sub-components to prevent unnecessary re-renders ── */

const GROUP_ICONS: Record<string, string> = {
  primary: "🔵", accent: "🟣", surface: "◻️", text: "Aa",
  status: "🚦", shape: "◆", border: "▣", font: "🔤",
};

const VariableGroupPanel = memo(function VariableGroupPanel({
  group, isOpen, variables, onToggle, onChange,
}: {
  group: VariableGroup;
  isOpen: boolean;
  variables: Record<string, string>;
  onToggle: (id: string) => void;
  onChange: (key: string, value: string) => void;
}) {
  // Build mini color preview from color variables
  const colorVars = group.variables.filter((v) => v.type === "color").slice(0, 5);
  return (
    <div style={{
      border: "1px solid var(--outline-variant)", borderRadius: 12, overflow: "hidden",
      transition: "box-shadow 0.2s",
      boxShadow: isOpen ? "0 2px 12px rgba(0,0,0,0.06)" : "none",
    }}>
      <button
        onClick={() => onToggle(group.id)}
        style={{
          width: "100%", padding: "11px 14px", border: "none",
          background: isOpen ? "var(--surface-container-low)" : "transparent",
          cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
          fontSize: 13, fontWeight: 600, color: "var(--on-surface)",
          transition: "background 0.15s",
        }}
      >
        <span style={{
          width: 22, height: 22, borderRadius: 6,
          background: isOpen ? "var(--primary)" : "var(--surface-container)",
          color: isOpen ? "#fff" : "var(--on-surface-variant)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, flexShrink: 0,
          transition: "all 0.2s",
        }}>
          {GROUP_ICONS[group.id] || "●"}
        </span>
        <span style={{ flex: 1, textAlign: "left" }}>{group.label}</span>
        {/* Mini color preview strip */}
        {colorVars.length > 0 && !isOpen && (
          <span style={{ display: "flex", gap: 2, marginRight: 4 }}>
            {colorVars.map((v) => (
              <span key={v.key} style={{
                width: 14, height: 14, borderRadius: 4,
                background: variables[v.key] || "#ccc",
                border: "1px solid var(--outline-variant)",
              }} />
            ))}
          </span>
        )}
        <span style={{
          transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 0.2s", fontSize: 10, color: "var(--on-surface-variant)",
        }}>&#9654;</span>
      </button>

      {isOpen && (
        <div style={{ padding: "10px 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {group.variables.map((v) => (
            <VariableInput key={v.key} def={v} value={variables[v.key]} onChange={onChange} />
          ))}
        </div>
      )}
    </div>
  );
});

function parseSliderVal(val: string | undefined): number {
  if (!val) return 8;
  return parseInt(val) || 0;
}

const FONT_GROUPS: { label: string; start: number; end: number }[] = [
  { label: "── 한국어 산세리프 ──", start: 0, end: 20 },
  { label: "── 한국어 세리프/명조 ──", start: 20, end: 25 },
  { label: "── 영문 산세리프 ──", start: 25, end: 35 },
  { label: "── 영문 세리프 ──", start: 35, end: 40 },
  { label: "── 코딩 / 모노스페이스 ──", start: 40, end: 44 },
  { label: "── 시스템 ──", start: 44, end: 45 },
];

const VariableInput = memo(function VariableInput({
  def, value, onChange,
}: {
  def: VariableDefinition;
  value: string | undefined;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 12, color: "var(--on-surface-variant)", minWidth: 80, fontWeight: 500 }}>
        {def.label}
      </span>

      {def.type === "color" && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
          <label style={{
            width: 36, height: 36, borderRadius: 8, cursor: "pointer",
            background: value || "#000000",
            border: "2px solid var(--outline-variant)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(255,255,255,0.1)",
            flexShrink: 0, position: "relative", overflow: "hidden",
            transition: "box-shadow 0.15s",
          }}>
            <input
              type="color"
              value={toHex(value || "#000000")}
              onChange={(e) => onChange(def.key, e.target.value)}
              style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
            />
          </label>
          <input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(def.key, e.target.value)}
            style={{
              flex: 1, padding: "6px 10px", border: "1.5px solid var(--outline-variant)",
              borderRadius: 8, fontSize: 12, fontFamily: "'JetBrains Mono', Consolas, monospace",
              boxSizing: "border-box",
              background: "var(--surface-container-lowest)", color: "var(--on-surface)",
              outline: "none", transition: "border-color 0.15s",
            }}
            placeholder={def.key}
            onFocus={(e) => e.currentTarget.style.borderColor = "var(--primary)"}
            onBlur={(e) => e.currentTarget.style.borderColor = "var(--outline-variant)"}
          />
        </div>
      )}

      {def.type === "slider" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <input
            type="range"
            min={def.min ?? 0}
            max={def.max ?? 20}
            step={1}
            value={parseSliderVal(value)}
            onChange={(e) => onChange(def.key, `${e.target.value}${def.unit || "px"}`)}
            style={{ flex: 1, accentColor: "var(--primary)" }}
          />
          <span style={{
            fontSize: 12, fontFamily: "'JetBrains Mono', Consolas, monospace",
            minWidth: 40, textAlign: "right", color: "var(--on-surface)",
            padding: "3px 6px", borderRadius: 6,
            background: "var(--surface-container)", fontWeight: 500,
          }}>
            {value || `${def.min ?? 0}${def.unit || "px"}`}
          </span>
        </div>
      )}

      {def.type === "font" && (
        <select
          value={value || ""}
          onChange={(e) => {
            const v = e.target.value;
            if (v) loadGoogleFont(v);
            onChange(def.key, v);
          }}
          style={{
            flex: 1, padding: "7px 10px", border: "1.5px solid var(--outline-variant)",
            borderRadius: 8, fontSize: 12, boxSizing: "border-box",
            background: "var(--surface-container-lowest)", color: "var(--on-surface)",
            fontFamily: value || "inherit", outline: "none",
            transition: "border-color 0.15s",
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = "var(--primary)"}
          onBlur={(e) => e.currentTarget.style.borderColor = "var(--outline-variant)"}
        >
          <option value="">기본값</option>
          {FONT_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {FONT_OPTIONS.slice(g.start, g.end).map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      )}
    </div>
  );
});

/* ── Asset Panel — dedicated UI for cursor / background / mascot ── */

const ASSET_EFFECTS = ["customCursorImage", "backgroundImage", "mascotSprite"] as const;

const ASSET_SECTIONS: {
  id: typeof ASSET_EFFECTS[number];
  icon: string;
  title: string;
  desc: string;
  fields: { key: string; label: string; type: "image" | "number" | "select"; min?: number; max?: number; step?: number; default: string | number; options?: { value: string; label: string }[] }[];
}[] = [
  {
    id: "customCursorImage", icon: "🖱️", title: "커서 이미지",
    desc: "마우스 커서를 나만의 이미지로 교체합니다 (32x32px PNG 권장)",
    fields: [
      { key: "default", label: "기본 커서", type: "image", default: "" },
      { key: "pointer", label: "포인터 (버튼/링크)", type: "image", default: "" },
      { key: "text", label: "텍스트 (입력 영역)", type: "image", default: "" },
    ],
  },
  {
    id: "backgroundImage", icon: "🏞️", title: "배경 미디어",
    desc: "배경에 이미지/GIF/동영상(mp4, webm)을 오버레이합니다",
    fields: [
      { key: "url", label: "이미지/GIF/영상", type: "image", default: "" },
      { key: "opacity", label: "불투명도", type: "number", min: 0.02, max: 1, step: 0.02, default: 0.15 },
      { key: "blendMode", label: "블렌드 모드", type: "select", default: "normal", options: [
        { value: "normal", label: "기본" }, { value: "multiply", label: "곱하기" },
        { value: "screen", label: "스크린" }, { value: "overlay", label: "오버레이" },
        { value: "soft-light", label: "소프트 라이트" }, { value: "luminosity", label: "광도" },
      ]},
      { key: "size", label: "크기", type: "select", default: "cover", options: [
        { value: "cover", label: "채우기" }, { value: "contain", label: "맞추기" },
        { value: "auto", label: "원본" }, { value: "200px", label: "타일 (200px)" }, { value: "400px", label: "타일 (400px)" },
      ]},
      { key: "position", label: "위치", type: "select", default: "center", options: [
        { value: "center", label: "가운데" }, { value: "top", label: "위" },
        { value: "bottom", label: "아래" }, { value: "left", label: "왼쪽" }, { value: "right", label: "오른쪽" },
      ]},
    ],
  },
  {
    id: "mascotSprite", icon: "🐾", title: "마스코트 스프라이트",
    desc: "30개 행동 함수 + JSON 스크립트로 캐릭터를 제어합니다",
    fields: [
      { key: "spriteUrl", label: "스프라이트 시트", type: "image", default: "" },
      { key: "frameCount", label: "프레임 수", type: "number", min: 1, max: 32, step: 1, default: 4 },
      { key: "frameWidth", label: "프레임 너비 (px)", type: "number", min: 16, max: 512, step: 8, default: 64 },
      { key: "frameHeight", label: "프레임 높이 (px)", type: "number", min: 16, max: 512, step: 8, default: 64 },
      { key: "fps", label: "프레임 속도 (fps)", type: "number", min: 1, max: 30, step: 1, default: 8 },
      { key: "scale", label: "크기 배율", type: "number", min: 0.5, max: 4, step: 0.25, default: 1 },
      { key: "layout", label: "시트 배치", type: "select", default: "horizontal", options: [
        { value: "horizontal", label: "가로 (1행)" },
        { value: "vertical", label: "세로 (1열)" },
        { value: "grid", label: "격자 (N×M)" },
      ]},
      { key: "cols", label: "격자 열 수", type: "number", min: 1, max: 32, step: 1, default: 4 },
      { key: "posX", label: "오른쪽 여백 (px)", type: "number", min: 0, max: 500, step: 10, default: 20 },
      { key: "posY", label: "아래쪽 여백 (px)", type: "number", min: 0, max: 500, step: 10, default: 20 },
    ],
  },
];

const DEFAULT_SCRIPT_EXAMPLE = `{
  "sprites": {
    "idle": { "url": "", "frameCount": 4, "frameWidth": 64, "frameHeight": 64, "fps": 6 },
    "walk": { "url": "", "frameCount": 6, "frameWidth": 64, "frameHeight": 64, "fps": 10, "layout": "vertical" },
    "happy": { "url": "", "frameCount": 12, "frameWidth": 64, "frameHeight": 64, "fps": 8, "layout": "grid", "cols": 4 }
  },
  "onStart": [
    { "action": "spawn", "params": { "name": "idle" } },
    { "action": "say", "params": { "text": "안녕! 👋", "duration": 2000 } },
    { "action": "bounce", "params": { "height": 15, "count": 2 } }
  ],
  "loop": [
    { "action": "playSprite", "params": { "name": "idle" } },
    { "action": "idle", "params": { "duration": 8000 } },
    { "action": "playSprite", "params": { "name": "walk" } },
    { "action": "wander", "params": { "steps": 2 } }
  ],
  "reactions": {
    "onClick": [
      { "action": "playSprite", "params": { "name": "happy" } },
      { "action": "bounce", "params": { "height": 20, "count": 2 } },
      { "action": "emote", "params": { "emoji": "😊" } }
    ],
    "onCorrect": [
      { "action": "playSprite", "params": { "name": "happy" } },
      { "action": "jump", "params": { "height": 40 } },
      { "action": "dance", "params": { "duration": 1500 } }
    ],
    "onWrong": [
      { "action": "shake" },
      { "action": "emote", "params": { "emoji": "😢" } }
    ]
  }
}`;

const MASCOT_ACTIONS_HELP = [
  ["이동", "moveTo, walkTo, patrol, wander, follow, orbit"],
  ["애니메이션", "bounce, jump, spin, shake, wave, dance, nod, float, surprise"],
  ["표시", "flip, setScale, setOpacity, hide, show"],
  ["소통", "say, emote"],
  ["제어", "sleep, idle, wait, stop"],
  ["스프라이트", "addSprite, playSprite, setSpriteSheet, spawn, kill"],
];

const ImageCropModal = lazy(() => import("../common/ImageCropModal"));

function AssetPanel({ effectsState, onChange }: { effectsState: EffectsState; onChange: (s: EffectsState) => void }) {
  const [scriptText, setScriptText] = useState(
    () => String(effectsState.mascotSprite?.params?.script || "")
  );
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [scriptApplied, setScriptApplied] = useState(false);
  const [bgCropSrc, setBgCropSrc] = useState<string | null>(null);

  // Debounce effect application to prevent rapid mascot restarts during slider drags
  const applyTimerRef = useRef(0);
  const pendingStateRef = useRef<EffectsState | null>(null);

  const flushApply = useCallback(() => {
    if (pendingStateRef.current) {
      effectManager.applyState(pendingStateRef.current);
      pendingStateRef.current = null;
    }
  }, []);

  const debouncedOnChange = useCallback((next: EffectsState) => {
    onChange(next); // React state updates immediately (for UI)
    pendingStateRef.current = next;
    clearTimeout(applyTimerRef.current);
    applyTimerRef.current = window.setTimeout(flushApply, 300);
  }, [onChange, flushApply]);

  // Immediate apply (bypasses debounce — for toggle/script apply)
  const immediateOnChange = useCallback((next: EffectsState) => {
    clearTimeout(applyTimerRef.current);
    pendingStateRef.current = null;
    onChange(next);
    effectManager.applyState(next);
  }, [onChange]);

  // Cleanup timer on unmount
  useEffect(() => () => clearTimeout(applyTimerRef.current), []);

  const toggle = (id: string, enabled: boolean) => {
    const current = effectsState[id] || { enabled: false, params: {} };
    const section = ASSET_SECTIONS.find((s) => s.id === id)!;
    const defaults: Record<string, string | number> = {};
    for (const f of section.fields) defaults[f.key] = f.default;
    immediateOnChange({ ...effectsState, [id]: { ...current, params: current.params && Object.keys(current.params).length ? current.params : defaults, enabled } });
  };

  const updateParam = (id: string, key: string, value: string | number) => {
    const section = ASSET_SECTIONS.find((s) => s.id === id)!;
    const defaults: Record<string, string | number> = {};
    for (const f of section.fields) defaults[f.key] = f.default;
    const current = effectsState[id] || { enabled: true, params: defaults };
    debouncedOnChange({ ...effectsState, [id]: { ...current, enabled: true, params: { ...defaults, ...current.params, [key]: value } } });
  };

  const applyScript = () => {
    const trimmed = scriptText.trim();
    if (!trimmed) {
      const section = ASSET_SECTIONS.find((s) => s.id === "mascotSprite")!;
      const defaults: Record<string, string | number> = {};
      for (const f of section.fields) defaults[f.key] = f.default;
      const current = effectsState.mascotSprite || { enabled: true, params: defaults };
      immediateOnChange({ ...effectsState, mascotSprite: { ...current, enabled: true, params: { ...defaults, ...current.params, script: "" } } });
      setScriptError(null);
      setScriptApplied(true);
      setTimeout(() => setScriptApplied(false), 1500);
      return;
    }
    try {
      JSON.parse(trimmed);
      const section = ASSET_SECTIONS.find((s) => s.id === "mascotSprite")!;
      const defaults: Record<string, string | number> = {};
      for (const f of section.fields) defaults[f.key] = f.default;
      const current = effectsState.mascotSprite || { enabled: true, params: defaults };
      immediateOnChange({ ...effectsState, mascotSprite: { ...current, enabled: true, params: { ...defaults, ...current.params, script: trimmed } } });
      setScriptError(null);
      setScriptApplied(true);
      setTimeout(() => setScriptApplied(false), 1500);
    } catch {
      setScriptError("JSON 형식이 올바르지 않습니다.");
    }
  };

  const loadDefaultScript = () => {
    setScriptText(DEFAULT_SCRIPT_EXAMPLE);
    setScriptError(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12, color: "var(--on-surface-variant)", lineHeight: 1.5 }}>
        커서, 배경 미디어(이미지/GIF/동영상), 마스코트 캐릭터를 설정합니다.
      </div>

      {ASSET_SECTIONS.map((section) => {
        const config = effectsState[section.id];
        const enabled = config?.enabled || false;
        const params = config?.params || {};

        return (
          <div key={section.id} style={{
            border: "1px solid var(--outline-variant)", borderRadius: 12, overflow: "hidden",
          }}>
            <div style={{
              padding: "12px 16px", display: "flex", alignItems: "center", gap: 10,
              background: enabled ? "var(--surface-container-low)" : "transparent",
            }}>
              <span style={{ fontSize: 20 }}>{section.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--on-surface)" }}>{section.title}</div>
                <div style={{ fontSize: 11, color: "var(--on-surface-variant)", marginTop: 1 }}>{section.desc}</div>
              </div>
              <button
                onClick={() => toggle(section.id, !enabled)}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: "none",
                  background: enabled ? "var(--primary)" : "var(--outline-variant)",
                  cursor: "pointer", position: "relative", flexShrink: 0, transition: "background 0.2s",
                }}
              >
                <span style={{
                  position: "absolute", top: 3, left: enabled ? 22 : 3,
                  width: 18, height: 18, borderRadius: "50%", background: "#fff",
                  transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }} />
              </button>
            </div>

            {enabled && (
              <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                {section.fields.map((field) => {
                  // Hide "cols" field unless layout is "grid"
                  if (field.key === "cols" && String(params["layout"] || "horizontal") !== "grid") return null;
                  return (
                  <div key={field.key}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--on-surface-variant)", marginBottom: 4 }}>
                      {field.label}
                    </div>
                    {field.type === "image" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <input
                            type="text" value={String(params[field.key] || "")}
                            onChange={(e) => updateParam(section.id, field.key, e.target.value)}
                            placeholder="이미지 URL 입력"
                            style={{
                              flex: 1, padding: "6px 10px", border: "1px solid var(--outline-variant)",
                              borderRadius: 8, fontSize: 12, fontFamily: "monospace",
                              background: "var(--surface-container-lowest)", color: "var(--on-surface)", minWidth: 0,
                            }}
                          />
                          <label style={{
                            padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                            border: "1px solid var(--outline-variant)", background: "var(--surface-container-low)",
                            color: "var(--primary)", cursor: "pointer", whiteSpace: "nowrap",
                          }}>
                            파일
                            <input type="file" accept="image/*,video/mp4,video/webm" style={{ display: "none" }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = () => {
                                  const dataUrl = reader.result as string;
                                  // 배경 이미지 + 이미지 파일이면 크롭 모달
                                  if (section.id === "backgroundImage" && field.key === "url" && file.type.startsWith("image/")) {
                                    setBgCropSrc(dataUrl);
                                  } else {
                                    updateParam(section.id, field.key, dataUrl);
                                  }
                                };
                                reader.readAsDataURL(file);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          {params[field.key] && (
                            <button onClick={() => updateParam(section.id, field.key, "")} title="제거"
                              style={{
                                width: 28, height: 28, borderRadius: 6, border: "1px solid var(--outline-variant)",
                                background: "transparent", color: "var(--error)", cursor: "pointer",
                                fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
                              }}>&times;</button>
                          )}
                        </div>
                        {params[field.key] && (
                          <img src={String(params[field.key])} alt=""
                            style={{
                              maxWidth: 160, maxHeight: 64, objectFit: "contain", borderRadius: 6,
                              border: "1px solid var(--outline-variant)",
                              background: "repeating-conic-gradient(var(--outline-variant) 0% 25%, transparent 0% 50%) 50% / 12px 12px",
                            }}
                          />
                        )}
                      </div>
                    )}
                    {field.type === "number" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="range" min={field.min ?? 0} max={field.max ?? 100} step={field.step ?? 1}
                          value={Number(params[field.key] ?? field.default)}
                          onChange={(e) => updateParam(section.id, field.key, parseFloat(e.target.value))}
                          style={{ flex: 1, accentColor: "var(--primary)" }}
                        />
                        <span style={{ fontSize: 12, fontFamily: "monospace", minWidth: 40, textAlign: "right", color: "var(--on-surface)" }}>
                          {params[field.key] ?? field.default}
                        </span>
                      </div>
                    )}
                    {field.type === "select" && (
                      <select value={String(params[field.key] || field.default)}
                        onChange={(e) => updateParam(section.id, field.key, e.target.value)}
                        style={{
                          width: "100%", padding: "6px 10px", border: "1px solid var(--outline-variant)",
                          borderRadius: 8, fontSize: 12, background: "var(--surface-container-lowest)",
                          color: "var(--on-surface)",
                        }}
                      >
                        {field.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* ═══ Mascot Behavior Script Editor ═══ */}
      {effectsState.mascotSprite?.enabled && (
        <div style={{
          border: "1px solid var(--outline-variant)", borderRadius: 12, overflow: "hidden",
        }}>
          <div style={{
            padding: "12px 16px", background: "var(--surface-container-low)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 18 }}>📜</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--on-surface)" }}>행동 스크립트</div>
              <div style={{ fontSize: 11, color: "var(--on-surface-variant)", marginTop: 1 }}>
                JSON으로 마스코트 행동을 프로그래밍합니다 (30개 함수)
              </div>
            </div>
          </div>

          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Action reference */}
            <div style={{
              padding: "8px 10px", borderRadius: 8,
              background: "var(--surface-container)", fontSize: 11,
              color: "var(--on-surface-variant)", lineHeight: 1.6,
            }}>
              {MASCOT_ACTIONS_HELP.map(([cat, actions]) => (
                <div key={cat}>
                  <strong>{cat}:</strong> <code style={{
                    fontSize: 10, background: "var(--surface-container-high)",
                    padding: "1px 4px", borderRadius: 3,
                  }}>{actions}</code>
                </div>
              ))}
            </div>

            {/* Script textarea */}
            <textarea
              value={scriptText}
              onChange={(e) => { setScriptText(e.target.value); setScriptError(null); }}
              spellCheck={false}
              placeholder={DEFAULT_SCRIPT_EXAMPLE}
              style={{
                width: "100%", minHeight: 200, padding: 10,
                border: "1px solid var(--outline-variant)", borderRadius: 8,
                fontSize: 11, fontFamily: "'Fira Code', Consolas, monospace",
                lineHeight: 1.5, resize: "vertical", boxSizing: "border-box",
                background: "var(--surface-container)", color: "var(--on-surface)",
                tabSize: 2,
              }}
            />

            {scriptError && (
              <div style={{
                fontSize: 11, color: "var(--error)", padding: "4px 8px",
                background: "var(--error-light, #fef2f2)", borderRadius: 6,
              }}>
                {scriptError}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button type="button" onClick={applyScript} style={{
                padding: "7px 18px", border: "none", borderRadius: 8,
                background: scriptApplied ? "var(--success, #22c55e)" : "var(--primary)", color: "#fff",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                transition: "background 0.2s, transform 0.1s",
                position: "relative", zIndex: 1,
              }}>
                {scriptApplied ? "적용 완료!" : "적용"}
              </button>
              <button type="button" onClick={loadDefaultScript} style={{
                padding: "6px 14px", border: "1px solid var(--outline-variant)", borderRadius: 8,
                background: "transparent", color: "var(--on-surface)",
                fontSize: 12, fontWeight: 500, cursor: "pointer",
              }}>
                기본 예시 불러오기
              </button>
              {scriptText.trim() && (
                <button type="button" onClick={() => { setScriptText(""); updateParam("mascotSprite", "script", ""); setScriptError(null); }} style={{
                  padding: "6px 14px", border: "1px solid var(--outline-variant)", borderRadius: 8,
                  background: "transparent", color: "var(--error)",
                  fontSize: 12, fontWeight: 500, cursor: "pointer",
                }}>
                  초기화
                </button>
              )}
            </div>

            <div style={{
              padding: "6px 10px", borderRadius: 6, fontSize: 10,
              background: "var(--surface-container-low)", color: "var(--on-surface-variant)",
              lineHeight: 1.5,
            }}>
              스크립트가 비어있으면 기본 행동이 적용됩니다.
              콘솔에서 <code style={{ fontSize: 10 }}>__pikabuddyMascot</code>으로 직접 제어할 수도 있습니다.
            </div>
          </div>
        </div>
      )}

      <div style={{
        padding: "10px 14px", borderRadius: 8, marginTop: 4,
        background: "var(--surface-container-low)", fontSize: 11,
        color: "var(--on-surface-variant)", lineHeight: 1.6,
      }}>
        <strong>스프라이트 시트:</strong> 가로로 프레임을 나열한 한 장의 이미지 (예: 4프레임 64x64 = 256x64px)<br/>
        <strong>배경 미디어:</strong> GIF/mp4/webm도 지원 (동영상은 자동 반복 재생)<br/>
        <strong>커서:</strong> 32x32px 투명 배경 PNG 권장 &middot; <strong>큰 파일:</strong> 외부 URL 사용 권장
      </div>

      {bgCropSrc && (
        <Suspense fallback={null}>
          <ImageCropModal
            src={bgCropSrc}
            aspect={16 / 9}
            outputWidth={1920}
            title="배경 이미지 자르기"
            onConfirm={(_blob, dataUrl) => {
              updateParam("backgroundImage", "url", dataUrl);
              setBgCropSrc(null);
            }}
            onCancel={() => setBgCropSrc(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
