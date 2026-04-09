/* ── Theme Effects — Central entry point ── */

export { effectManager } from "./engine";
export { EFFECT_DEFINITIONS, getEffectsByCategory, getEffectDef } from "./registry";
export type { EffectCategory, EffectParam, EffectDefinition, EffectConfig, EffectsState, ThemeEffect } from "./types";
export { CATEGORY_LABELS, CATEGORY_ICONS } from "./types";

// Import all effect implementations
import { backgroundEffects } from "./backgroundEffects";
import { patternEffects } from "./patternEffects";
import { uiEffects } from "./uiEffects";
import { animationEffects } from "./animationEffects";
import { gamificationEffects } from "./gamificationEffects";
import { effectManager } from "./engine";

// Register all effects
const allEffects = [
  ...backgroundEffects,
  ...patternEffects,
  ...uiEffects,
  ...animationEffects,
  ...gamificationEffects,
];

for (const effect of allEffects) {
  effectManager.register(effect);
}

/** Initialize effects from localStorage */
export function initEffects() {
  const state = effectManager.loadState();
  effectManager.applyState(state);
}

/** Convenience: trigger a gamification effect from any component */
export function triggerEffect(id: string, data?: any) {
  effectManager.trigger(id, data);
}
