/* ── EffectsPanel — Toggle/configure all 55 theme effects ── */

import { useState, useCallback } from "react";
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
  "cursor", "animation", "transition", "visual", "gamification",
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
          padding: "8px 12px", borderRadius: 8, fontSize: 12,
          background: "var(--warning-light, #fff8eb)", color: "var(--warning, #f59e0b)",
          marginBottom: 4,
        }}>
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
            border: "1px solid var(--outline-variant)", borderRadius: 10, overflow: "hidden",
          }}>
            {/* Category Header */}
            <button
              onClick={() => toggleCat(cat)}
              style={{
                width: "100%", padding: "10px 14px", border: "none",
                background: isOpen ? "var(--surface-container-low)" : "transparent",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                fontSize: 13, fontWeight: 600, color: "var(--on-surface)",
              }}
            >
              <span style={{
                transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.2s", fontSize: 11,
              }}>&#9654;</span>
              <span>{CATEGORY_ICONS[cat]}</span>
              <span>{CATEGORY_LABELS[cat]}</span>
              <span style={{
                fontSize: 11, fontWeight: 400,
                color: activeCount > 0 ? "var(--primary)" : "var(--on-surface-variant)",
              }}>
                {activeCount > 0 ? `${activeCount}/${defs.length} 활성` : `${defs.length}개`}
              </span>
            </button>

            {/* Effect List */}
            {isOpen && (
              <div style={{ padding: "4px 10px 10px" }}>
                {defs.map((def) => {
                  const config = effectsState[def.id];
                  const enabled = config?.enabled || false;
                  const params = config?.params || getDefaultParams(def);
                  const isEvent = def.mode === "event";

                  return (
                    <div key={def.id} style={{
                      padding: "8px 6px", borderBottom: "1px solid var(--outline-variant)",
                    }}>
                      {/* Effect header with toggle */}
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

                        {/* Test button for event effects */}
                        {isEvent && (
                          <button
                            onClick={() => testEvent(def.id)}
                            disabled={testingId === def.id}
                            style={{
                              padding: "3px 8px", borderRadius: 6, fontSize: 11,
                              border: "1px solid var(--outline-variant)",
                              background: testingId === def.id ? "var(--primary-light)" : "transparent",
                              color: "var(--primary)", cursor: "pointer", fontWeight: 500,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {testingId === def.id ? "..." : "테스트"}
                          </button>
                        )}

                        {/* Toggle switch */}
                        <button
                          onClick={() => toggleEffect(def.id, def)}
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

                      {/* Params (shown when enabled and has params) */}
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
                                    onChange={(e) => updateParam(def.id, param.key, e.target.value, def)}
                                    style={{ width: 28, height: 24, border: "none", cursor: "pointer", padding: 0, borderRadius: 4 }}
                                  />
                                  <input
                                    type="text"
                                    value={String(params[param.key] || param.default)}
                                    onChange={(e) => updateParam(def.id, param.key, e.target.value, def)}
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
                                    onChange={(e) => updateParam(def.id, param.key, parseFloat(e.target.value), def)}
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
                                  onChange={(e) => updateParam(def.id, param.key, e.target.value, def)}
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
                                  onChange={(e) => updateParam(def.id, param.key, e.target.value, def)}
                                  maxLength={4}
                                  style={{
                                    width: 50, padding: "2px 6px", border: "1px solid var(--outline-variant)",
                                    borderRadius: 4, fontSize: 16, textAlign: "center",
                                    background: "var(--surface-container-lowest)",
                                  }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
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
