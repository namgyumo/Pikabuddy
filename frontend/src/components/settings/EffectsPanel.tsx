/* ── EffectsPanel — Toggle/configure all 55 theme effects ── */

import { useState, useCallback, memo } from "react";
import {
  EFFECT_DEFINITIONS,
  getEffectsByCategory,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  effectManager,
} from "../../themes/effects";
import type { EffectsState, EffectDefinition, EffectCategory } from "../../themes/effects";

interface Props {
  effectsState: EffectsState;
  onChange: (state: EffectsState) => void;
}

const CATEGORY_ORDER: EffectCategory[] = [
  "background", "pattern", "element", "text", "interaction",
  "cursor", "asset", "animation", "transition", "visual", "gamification",
];

export default function EffectsPanel({ effectsState, onChange }: Props) {
  const [openCats, setOpenCats] = useState<Set<string>>(new Set(["background"]));
  const [testingId, setTestingId] = useState<string | null>(null);
  const byCategory = getEffectsByCategory();

  const toggleCat = (cat: string) => {
    setOpenCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const toggleEffect = useCallback((id: string, def: EffectDefinition) => {
    const current = effectsState[id];
    const enabled = !current?.enabled;
    const params = current?.params || getDefaultParams(def);
    const next = { ...effectsState, [id]: { enabled, params } };
    onChange(next);

    // Live preview
    if (enabled) effectManager.enable(id, params);
    else effectManager.disable(id);
  }, [effectsState, onChange]);

  const updateParam = useCallback((id: string, key: string, value: string | number, def: EffectDefinition) => {
    const current = effectsState[id] || { enabled: true, params: getDefaultParams(def) };
    const params = { ...current.params, [key]: value };
    const next = { ...effectsState, [id]: { ...current, params } };
    onChange(next);

    // Live update
    if (current.enabled) effectManager.enable(id, params);
  }, [effectsState, onChange]);

  const testEvent = (id: string) => {
    setTestingId(id);
    effectManager.trigger(id);
    setTimeout(() => setTestingId(null), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {/* Performance warning */}
      {countEnabled(effectsState) >= 5 && (
        <div style={{
          padding: "10px 14px", borderRadius: 10, fontSize: 12,
          background: "var(--warning-light, #fff8eb)", color: "var(--warning, #f59e0b)",
          marginBottom: 4, display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          다수의 이펙트가 활성화되어 있습니다. 성능에 영향을 줄 수 있습니다.
        </div>
      )}

      {CATEGORY_ORDER.map((cat) => {
        const defs = byCategory.get(cat);
        if (!defs) return null;
        const isOpen = openCats.has(cat);
        const activeCount = defs.filter((d) => effectsState[d.id]?.enabled).length;

        return (
          <div key={cat} style={{
            border: "1px solid var(--outline-variant)", borderRadius: 12, overflow: "hidden",
            transition: "box-shadow 0.2s",
            boxShadow: isOpen ? "0 2px 12px rgba(0,0,0,0.06)" : "none",
          }}>
            {/* Category Header */}
            <button
              onClick={() => toggleCat(cat)}
              style={{
                width: "100%", padding: "11px 14px", border: "none",
                background: isOpen ? "var(--surface-container-low)" : "transparent",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                fontSize: 13, fontWeight: 600, color: "var(--on-surface)",
                transition: "background 0.15s",
              }}
            >
              <span style={{
                width: 24, height: 24, borderRadius: 6,
                background: isOpen ? "var(--primary)" : "var(--surface-container)",
                color: isOpen ? "#fff" : "var(--on-surface-variant)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, flexShrink: 0, transition: "all 0.2s",
              }}>{CATEGORY_ICONS[cat]}</span>
              <span style={{ flex: 1, textAlign: "left" }}>{CATEGORY_LABELS[cat]}</span>
              {activeCount > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 7px",
                  borderRadius: 10, background: "var(--primary)", color: "#fff",
                }}>
                  {activeCount}
                </span>
              )}
              <span style={{
                fontSize: 11, fontWeight: 400,
                color: "var(--on-surface-variant)",
              }}>
                {defs.length}개
              </span>
              <span style={{
                transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.2s", fontSize: 10, color: "var(--on-surface-variant)",
              }}>&#9654;</span>
            </button>

            {/* Effect List */}
            {isOpen && (
              <div style={{ padding: "4px 10px 10px" }}>
                {defs.map((def) => (
                  <EffectItem
                    key={def.id}
                    def={def}
                    config={effectsState[def.id]}
                    isTesting={testingId === def.id}
                    onToggle={toggleEffect}
                    onParamChange={updateParam}
                    onTest={testEvent}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Quick info */}
      <div style={{
        padding: "8px 12px", borderRadius: 8, marginTop: 4,
        background: "var(--surface-container-low)", fontSize: 11,
        color: "var(--on-surface-variant)", lineHeight: 1.5,
      }}>
        <strong>Ambient</strong> 이펙트는 항상 표시됩니다.
        <strong> Event</strong> 이펙트는 정답/오답 등 특정 이벤트 발생 시 트리거됩니다.
        "테스트" 버튼으로 미리 확인할 수 있습니다.
      </div>
    </div>
  );
}

/* ── Helpers ── */

function getDefaultParams(def: EffectDefinition): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  for (const p of def.params) {
    params[p.key] = p.default;
  }
  return params;
}

function countEnabled(state: EffectsState): number {
  return Object.values(state).filter((c) => c.enabled).length;
}

/* ── Memoized Effect Item — only re-renders when its own config/testing state changes ── */
const EffectItem = memo(function EffectItem({
  def, config, isTesting, onToggle, onParamChange, onTest,
}: {
  def: EffectDefinition;
  config: EffectsState[string] | undefined;
  isTesting: boolean;
  onToggle: (id: string, def: EffectDefinition) => void;
  onParamChange: (id: string, key: string, value: string | number, def: EffectDefinition) => void;
  onTest: (id: string) => void;
}) {
  const enabled = config?.enabled || false;
  const params = config?.params || getDefaultParams(def);
  const isEvent = def.mode === "event";

  return (
    <div style={{
      padding: "8px 6px", borderBottom: "1px solid var(--outline-variant)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16, width: 24, textAlign: "center" }}>{def.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--on-surface)" }}>
            {def.name}
          </div>
          <div style={{
            fontSize: 11, color: "var(--on-surface-variant)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {def.description}
          </div>
        </div>

        {isEvent && (
          <button
            onClick={() => onTest(def.id)}
            disabled={isTesting}
            style={{
              padding: "3px 8px", borderRadius: 6, fontSize: 11,
              border: "1px solid var(--outline-variant)",
              background: isTesting ? "var(--primary-light)" : "transparent",
              color: "var(--primary)", cursor: "pointer", fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            {isTesting ? "..." : "테스트"}
          </button>
        )}

        <button
          onClick={() => onToggle(def.id, def)}
          style={{
            width: 40, height: 22, borderRadius: 11, border: "none",
            background: enabled ? "var(--primary)" : "var(--outline-variant)",
            cursor: "pointer", position: "relative", flexShrink: 0,
            transition: "background 0.2s",
          }}
        >
          <span style={{
            position: "absolute", top: 2,
            left: enabled ? 20 : 2,
            width: 18, height: 18, borderRadius: "50%",
            background: "#fff", transition: "left 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }} />
        </button>
      </div>

      {enabled && def.params.length > 0 && (
        <div style={{
          marginTop: 8, marginLeft: 32,
          display: "flex", flexDirection: "column", gap: 6,
        }}>
          {def.params.map((param) => (
            <div key={param.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "var(--on-surface-variant)", minWidth: 56 }}>
                {param.label}
              </span>

              {param.type === "color" && (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <input
                    type="color"
                    value={String(params[param.key] || param.default)}
                    onChange={(e) => onParamChange(def.id, param.key, e.target.value, def)}
                    style={{ width: 28, height: 24, border: "none", cursor: "pointer", padding: 0, borderRadius: 4 }}
                  />
                  <input
                    type="text"
                    value={String(params[param.key] || param.default)}
                    onChange={(e) => onParamChange(def.id, param.key, e.target.value, def)}
                    style={{
                      width: 80, padding: "2px 6px", border: "1px solid var(--outline-variant)",
                      borderRadius: 4, fontSize: 11, fontFamily: "monospace",
                      background: "var(--surface-container-lowest)", color: "var(--on-surface)",
                    }}
                  />
                </div>
              )}

              {param.type === "number" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                  <input
                    type="range"
                    min={param.min ?? 0}
                    max={param.max ?? 100}
                    step={param.step ?? 1}
                    value={Number(params[param.key] ?? param.default)}
                    onChange={(e) => onParamChange(def.id, param.key, parseFloat(e.target.value), def)}
                    style={{ flex: 1, accentColor: "var(--primary)" }}
                  />
                  <span style={{ fontSize: 11, fontFamily: "monospace", minWidth: 32, textAlign: "right", color: "var(--on-surface)" }}>
                    {params[param.key] ?? param.default}
                  </span>
                </div>
              )}

              {param.type === "select" && (
                <select
                  value={String(params[param.key] || param.default)}
                  onChange={(e) => onParamChange(def.id, param.key, e.target.value, def)}
                  style={{
                    flex: 1, padding: "3px 6px", border: "1px solid var(--outline-variant)",
                    borderRadius: 4, fontSize: 11,
                    background: "var(--surface-container-lowest)", color: "var(--on-surface)",
                  }}
                >
                  {param.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}

              {param.type === "emoji" && (
                <input
                  type="text"
                  value={String(params[param.key] || param.default)}
                  onChange={(e) => onParamChange(def.id, param.key, e.target.value, def)}
                  maxLength={4}
                  style={{
                    width: 50, padding: "2px 6px", border: "1px solid var(--outline-variant)",
                    borderRadius: 4, fontSize: 16, textAlign: "center",
                    background: "var(--surface-container-lowest)",
                  }}
                />
              )}

              {param.type === "image" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input
                      type="text"
                      value={String(params[param.key] || "")}
                      onChange={(e) => onParamChange(def.id, param.key, e.target.value, def)}
                      placeholder="이미지 URL 또는 파일 업로드"
                      style={{
                        flex: 1, padding: "3px 6px", border: "1px solid var(--outline-variant)",
                        borderRadius: 4, fontSize: 10, fontFamily: "monospace",
                        background: "var(--surface-container-lowest)", color: "var(--on-surface)",
                        minWidth: 0,
                      }}
                    />
                    <label style={{
                      padding: "3px 8px", borderRadius: 4, fontSize: 10, fontWeight: 500,
                      border: "1px solid var(--outline-variant)",
                      background: "var(--surface-container-low)",
                      color: "var(--primary)", cursor: "pointer", whiteSpace: "nowrap",
                    }}>
                      파일
                      <input
                        type="file"
                        accept="image/*,video/mp4,video/webm"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            onParamChange(def.id, param.key, reader.result as string, def);
                          };
                          reader.readAsDataURL(file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {params[param.key] && (
                      <button
                        onClick={() => onParamChange(def.id, param.key, "", def)}
                        title="제거"
                        style={{
                          width: 22, height: 22, borderRadius: 4, border: "1px solid var(--outline-variant)",
                          background: "transparent", color: "var(--error)", cursor: "pointer",
                          fontSize: 14, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >&times;</button>
                    )}
                  </div>
                  {params[param.key] && (
                    <img
                      src={String(params[param.key])}
                      alt=""
                      style={{
                        maxWidth: 120, maxHeight: 48, objectFit: "contain", borderRadius: 4,
                        border: "1px solid var(--outline-variant)",
                        background: "repeating-conic-gradient(var(--outline-variant) 0% 25%, transparent 0% 50%) 50% / 12px 12px",
                      }}
                    />
                  )}
                </div>
              )}

              {param.type === "textarea" && (
                <textarea
                  value={String(params[param.key] || param.default)}
                  onChange={(e) => onParamChange(def.id, param.key, e.target.value, def)}
                  spellCheck={false}
                  placeholder="JSON 스크립트 입력..."
                  style={{
                    flex: 1, minHeight: 80, padding: "4px 6px",
                    border: "1px solid var(--outline-variant)", borderRadius: 4,
                    fontSize: 10, fontFamily: "'Fira Code', Consolas, monospace",
                    lineHeight: 1.5, resize: "vertical", boxSizing: "border-box",
                    background: "var(--surface-container-lowest)", color: "var(--on-surface)",
                    tabSize: 2,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
