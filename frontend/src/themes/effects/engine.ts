/* ── Effect Engine — Central manager for all theme effects ── */

import type { ThemeEffect, EffectsState } from "./types";

const EFFECTS_STORAGE_KEY = "pikabuddy-theme-effects";

class EffectManager {
  private effects = new Map<string, ThemeEffect>();
  private active = new Map<string, ThemeEffect>();
  private container: HTMLDivElement | null = null;

  /** Register an effect implementation */
  register(effect: ThemeEffect) {
    this.effects.set(effect.id, effect);
  }

  /** Ensure the effects DOM container exists */
  getContainer(): HTMLDivElement {
    if (this.container && document.body.contains(this.container)) return this.container;
    let el = document.getElementById("pikabuddy-effects-layer") as HTMLDivElement | null;
    if (!el) {
      el = document.createElement("div");
      el.id = "pikabuddy-effects-layer";
      el.style.cssText =
        "position:fixed;inset:0;pointer-events:none;z-index:1;";
      document.body.prepend(el);
    }
    this.container = el;
    return el;
  }

  /** Activate a single effect with params */
  enable(id: string, params: Record<string, any>) {
    if (this.active.has(id)) this.disable(id);
    const effect = this.effects.get(id);
    if (!effect) return;
    try {
      effect.activate(params);
      this.active.set(id, effect);
    } catch (e) {
      console.warn(`[EffectManager] Failed to activate "${id}":`, e);
    }
  }

  /** Deactivate a single effect */
  disable(id: string) {
    const effect = this.active.get(id);
    if (effect) {
      try {
        effect.deactivate();
      } catch (e) {
        console.warn(`[EffectManager] Failed to deactivate "${id}":`, e);
      }
      this.active.delete(id);
    }
  }

  /** Trigger an event-based effect */
  trigger(id: string, data?: any) {
    const effect = this.active.get(id) || this.effects.get(id);
    if (effect?.trigger) {
      effect.trigger(data);
    }
  }

  /** Disable all active effects */
  disableAll() {
    const ids = [...this.active.keys()];
    for (const id of ids) {
      this.disable(id);
    }
  }

  /** Apply full effects state */
  applyState(state: EffectsState) {
    // Disable effects that are no longer enabled
    const activeIds = [...this.active.keys()];
    for (const id of activeIds) {
      if (!state[id]?.enabled) this.disable(id);
    }
    // Enable effects that should be on
    for (const [id, config] of Object.entries(state)) {
      if (config.enabled) {
        this.enable(id, config.params);
      }
    }
  }

  /** Check if an effect is currently active */
  isActive(id: string): boolean {
    return this.active.has(id);
  }

  /** Save state to localStorage */
  saveState(state: EffectsState) {
    localStorage.setItem(EFFECTS_STORAGE_KEY, JSON.stringify(state));
  }

  /** Load state from localStorage */
  loadState(): EffectsState {
    try {
      const raw = localStorage.getItem(EFFECTS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }
}

// Singleton
export const effectManager = new EffectManager();

// Expose globally for gamification triggers from any component
(window as any).__pikabuddyEffects = effectManager;

/* ── Helpers for effect implementations ── */

export function createEffectCanvas(id: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.id = `pikabuddy-fx-${id}`;
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  effectManager.getContainer().appendChild(canvas);
  return canvas;
}

export function removeEffectCanvas(id: string) {
  document.getElementById(`pikabuddy-fx-${id}`)?.remove();
}

export function createEffectDiv(id: string, css?: string): HTMLDivElement {
  const div = document.createElement("div");
  div.id = `pikabuddy-fx-${id}`;
  if (css) div.style.cssText = css;
  effectManager.getContainer().appendChild(div);
  return div;
}

export function removeEffectDiv(id: string) {
  document.getElementById(`pikabuddy-fx-${id}`)?.remove();
}

export function injectEffectStyle(id: string, css: string) {
  let el = document.getElementById(`pikabuddy-fxcss-${id}`) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = `pikabuddy-fxcss-${id}`;
    document.head.appendChild(el);
  }
  el.textContent = css;
}

export function removeEffectStyle(id: string) {
  document.getElementById(`pikabuddy-fxcss-${id}`)?.remove();
}
