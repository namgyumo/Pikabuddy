import { useState, useEffect, useRef, useCallback } from "react";
import {
  ALLOWED_CSS_VARIABLES,
  VARIABLE_GROUPS,
  FONT_OPTIONS,
  ANIMATION_PRESETS,
  THEMES,
  sanitizeCSS,
  toHex,
  getCurrentVariableValues,
} from "../../themes";
import { useThemeStore } from "../../store/themeStore";
import type { CustomTheme } from "../../themes";
import type { EffectsState } from "../../themes/effects";
import { effectManager } from "../../themes/effects";
import EffectsPanel from "./EffectsPanel";

interface Props {
  onClose: () => void;
  editingTheme?: CustomTheme | null;
}

type Tab = "gui" | "json" | "css" | "effects";

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
        if ((ALLOWED_CSS_VARIABLES as readonly string[]).includes(key)) {
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
    if ((ALLOWED_CSS_VARIABLES as readonly string[]).includes(key)) {
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

  const parseSliderValue = (val: string | undefined): number => {
    if (!val) return 8;
    return parseInt(val) || 0;
  };

  const tabs: { key: Tab; label: string; desc: string }[] = [
    { key: "gui", label: "GUI 에디터", desc: "시각적 도구" },
    { key: "effects", label: "이펙트", desc: "55개 효과" },
    { key: "json", label: "JSON 편집", desc: "변수 직접 편집" },
    { key: "css", label: "CSS 주입", desc: "고급 커스텀" },
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10000,
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "var(--surface-container-lowest)", borderRadius: 16,
        width: "min(95vw, 720px)", maxHeight: "90vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 24px", borderBottom: "1px solid var(--outline-variant)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {editingTheme?.id ? "테마 편집" : "새 커스텀 테마"}
            </div>
            <div style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 2 }}>
              실시간으로 변경사항이 적용됩니다
            </div>
          </div>
          <button onClick={handleExport} style={btnGhost}>내보내기</button>
          <button onClick={handleCancel} style={btnGhost}>취소</button>
          <button onClick={handleSave} style={btnPrimary}>저장</button>
        </div>

        {/* Theme name */}
        <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--outline-variant)" }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="테마 이름"
            style={{
              width: "100%", padding: "8px 12px", border: "1px solid var(--outline-variant)",
              borderRadius: 8, fontSize: 14, fontWeight: 600, boxSizing: "border-box",
              background: "var(--surface-container-low)", color: "var(--on-surface)",
            }}
          />
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", borderBottom: "1px solid var(--outline-variant)", padding: "0 24px",
        }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "10px 16px", border: "none", background: "transparent", cursor: "pointer",
                fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
                color: tab === t.key ? "var(--primary)" : "var(--on-surface-variant)",
                borderBottom: tab === t.key ? "2px solid var(--primary)" : "2px solid transparent",
                marginBottom: -1, transition: "all 0.15s",
              }}
            >
              {t.label}
              <span style={{ display: "block", fontSize: 10, fontWeight: 400, marginTop: 1, opacity: 0.7 }}>
                {t.desc}
              </span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: "auto", padding: "16px 24px" }}>
          {/* ═══ GUI Tab ═══ */}
          {tab === "gui" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {/* Load from built-in theme */}
              <div style={{
                border: "1px solid var(--outline-variant)", borderRadius: 10,
                padding: "10px 14px", marginBottom: 4,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--on-surface)" }}>
                  기본 테마에서 시작
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => loadBuiltinTheme(t.id, t.nameKo)}
                      style={{
                        padding: "5px 12px", borderRadius: 16, cursor: "pointer",
                        border: "1px solid var(--outline-variant)",
                        background: "var(--surface-container-low)",
                        color: "var(--on-surface)", fontSize: 12, fontWeight: 500,
                        display: "flex", alignItems: "center", gap: 6,
                        transition: "all 0.15s",
                      }}
                      title={t.nameEn}
                    >
                      <span style={{
                        width: 10, height: 10, borderRadius: "50%",
                        background: t.preview[0], border: "1px solid var(--outline-variant)",
                        flexShrink: 0,
                      }} />
                      {t.nameKo}
                    </button>
                  ))}
                </div>
              </div>

              {VARIABLE_GROUPS.map((group) => {
                const isOpen = openGroups.has(group.id);
                return (
                  <div key={group.id} style={{
                    border: "1px solid var(--outline-variant)", borderRadius: 10, overflow: "hidden",
                  }}>
                    <button
                      onClick={() => toggleGroup(group.id)}
                      style={{
                        width: "100%", padding: "10px 14px", border: "none",
                        background: isOpen ? "var(--surface-container-low)" : "transparent",
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                        fontSize: 13, fontWeight: 600, color: "var(--on-surface)",
                        transition: "background 0.15s",
                      }}
                    >
                      <span style={{
                        transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                        transition: "transform 0.2s", fontSize: 11,
                      }}>&#9654;</span>
                      {group.label}
                      <span style={{ fontSize: 11, color: "var(--on-surface-variant)", fontWeight: 400 }}>
                        ({group.variables.length})
                      </span>
                    </button>

                    {isOpen && (
                      <div style={{ padding: "8px 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                        {group.variables.map((v) => (
                          <div key={v.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 12, color: "var(--on-surface-variant)", minWidth: 80 }}>
                              {v.label}
                            </span>

                            {v.type === "color" && (
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                                <input
                                  type="color"
                                  value={toHex(variables[v.key] || "#000000")}
                                  onChange={(e) => handleVariableChange(v.key, e.target.value)}
                                  style={{ width: 32, height: 28, border: "none", cursor: "pointer", borderRadius: 4, padding: 0 }}
                                />
                                <input
                                  type="text"
                                  value={variables[v.key] || ""}
                                  onChange={(e) => handleVariableChange(v.key, e.target.value)}
                                  style={{
                                    flex: 1, padding: "4px 8px", border: "1px solid var(--outline-variant)",
                                    borderRadius: 6, fontSize: 12, fontFamily: "monospace", boxSizing: "border-box",
                                    background: "var(--surface-container-lowest)", color: "var(--on-surface)",
                                  }}
                                  placeholder={v.key}
                                />
                              </div>
                            )}

                            {v.type === "slider" && (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                                <input
                                  type="range"
                                  min={v.min ?? 0}
                                  max={v.max ?? 20}
                                  step={1}
                                  value={parseSliderValue(variables[v.key])}
                                  onChange={(e) => handleVariableChange(v.key, `${e.target.value}${v.unit || "px"}`)}
                                  style={{ flex: 1 }}
                                />
                                <span style={{ fontSize: 12, fontFamily: "monospace", minWidth: 36, textAlign: "right", color: "var(--on-surface)" }}>
                                  {variables[v.key] || `${v.min ?? 0}${v.unit || "px"}`}
                                </span>
                              </div>
                            )}

                            {v.type === "font" && (
                              <select
                                value={variables[v.key] || ""}
                                onChange={(e) => handleVariableChange(v.key, e.target.value)}
                                style={{
                                  flex: 1, padding: "4px 8px", border: "1px solid var(--outline-variant)",
                                  borderRadius: 6, fontSize: 12, boxSizing: "border-box",
                                  background: "var(--surface-container-lowest)", color: "var(--on-surface)",
                                }}
                              >
                                <option value="">기본값</option>
                                {FONT_OPTIONS.map((f) => (
                                  <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Animation preset */}
              <div style={{
                border: "1px solid var(--outline-variant)", borderRadius: 10,
                padding: "12px 14px", marginTop: 4,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--on-surface)" }}>
                  배경 애니메이션
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {ANIMATION_PRESETS.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setAnimation(a.id)}
                      style={{
                        padding: "6px 14px", borderRadius: 20, border: "1px solid var(--outline-variant)",
                        background: animation === a.id ? "var(--primary)" : "transparent",
                        color: animation === a.id ? "#fff" : "var(--on-surface)",
                        fontSize: 12, fontWeight: animation === a.id ? 600 : 400,
                        cursor: "pointer", transition: "all 0.15s",
                      }}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ Effects Tab ═══ */}
          {tab === "effects" && (
            <EffectsPanel effectsState={effectsState} onChange={setEffectsState} />
          )}

          {/* ═══ JSON Tab ═══ */}
          {tab === "json" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>
                JSON을 직접 편집한 후 "적용" 버튼을 클릭하세요. GUI 에디터와 동기화됩니다.
              </div>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                spellCheck={false}
                style={{
                  width: "100%", minHeight: 360, padding: 14, border: "1px solid var(--outline-variant)",
                  borderRadius: 10, fontSize: 13, fontFamily: "'Fira Code', Consolas, monospace",
                  lineHeight: 1.6, resize: "vertical", boxSizing: "border-box",
                  background: "var(--surface-container)", color: "var(--on-surface)",
                  tabSize: 2,
                }}
              />
              {jsonError && (
                <div style={{ fontSize: 12, color: "var(--error)", padding: "6px 10px", background: "var(--error-light)", borderRadius: 6 }}>
                  {jsonError}
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
              <div style={{ fontSize: 12, color: "var(--on-surface-variant)", lineHeight: 1.5 }}>
                CSS를 직접 작성하여 앱 스타일을 오버라이드합니다.
                <code style={{ background: "var(--surface-container)", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>
                  var(--primary)
                </code> 등 CSS 변수를 사용하면 GUI 설정과 연동됩니다.
              </div>
              <div style={{
                border: "1px solid var(--outline-variant)", borderRadius: 10, overflow: "hidden",
              }}>
                <div style={{
                  padding: "8px 14px", fontSize: 11, fontWeight: 600,
                  background: "var(--surface-container-high)", color: "var(--on-surface-variant)",
                  fontFamily: "monospace",
                }}>
                  custom.css
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
                lineHeight: 1.5,
              }}>
                <strong>보안:</strong> @import, expression(), javascript: 등 위험 구문은 자동 제거됩니다.
                CSS는 스타일링만 가능하므로 보안 위험이 거의 없습니다.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Inline button styles ── */

const btnGhost: React.CSSProperties = {
  padding: "6px 14px", border: "1px solid var(--outline-variant)",
  borderRadius: 8, background: "transparent", color: "var(--on-surface)",
  fontSize: 13, fontWeight: 500, cursor: "pointer",
};

const btnPrimary: React.CSSProperties = {
  padding: "6px 18px", border: "none", borderRadius: 8,
  background: "var(--primary)", color: "#fff",
  fontSize: 13, fontWeight: 600, cursor: "pointer",
};
