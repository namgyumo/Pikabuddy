/* ── Effect Engine — Unified animation loop with auto performance tuning ── */

import type { ThemeEffect, EffectsState, TriggerMap } from "./types";

const EFFECTS_STORAGE_KEY = "pikabuddy-theme-effects";

/* ═══ Performance Monitor ═══ */
class PerformanceMonitor {
  private samples: number[] = [];
  private _budget = 1.0; // 1.0 = full quality, 0.0 = minimum
  private readonly WINDOW = 60; // sample window (frames)
  private readonly LOW_FPS = 30;
  private readonly RECOVER_FPS = 50;

  push(fps: number) {
    this.samples.push(fps);
    if (this.samples.length > this.WINDOW) this.samples.shift();
    if (this.samples.length < 10) return; // need enough data

    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    if (avg < this.LOW_FPS && this._budget > 0.25) {
      this._budget = Math.max(0.25, this._budget - 0.15);
    } else if (avg > this.RECOVER_FPS && this._budget < 1.0) {
      this._budget = Math.min(1.0, this._budget + 0.05);
    }
  }

  /** Particle budget multiplier: 0.25 – 1.0 */
  get budget() { return this._budget; }

  reset() { this.samples = []; this._budget = 1.0; }
}

/* ═══ Effect Manager ═══ */
class EffectManager {
  private effects = new Map<string, ThemeEffect>();
  private active = new Map<string, ThemeEffect>();
  private container: HTMLDivElement | null = null;
  private triggerMap: TriggerMap = {};

  // Unified animation loop
  private _raf = 0;
  private _running = false;
  private _lastTime = 0;
  private _paused = false; // tab visibility pause

  // Performance
  private perf = new PerformanceMonitor();
  private _fpsTime = 0;
  private _fpsFrames = 0;

  constructor() {
    // Pause when tab is hidden
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          this._paused = true;
        } else {
          this._paused = false;
          this._lastTime = 0; // reset dt so we don't get a huge jump
        }
      });
    }
  }

  /** Current particle budget multiplier (0.25 – 1.0) */
  get particleBudget(): number { return this.perf.budget; }

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

  /* ── Unified Animation Loop ── */

  private startLoop() {
    if (this._running) return;
    this._running = true;
    this._lastTime = 0;
    this._fpsTime = performance.now();
    this._fpsFrames = 0;

    const loop = (now: number) => {
      if (!this._running) return;
      this._raf = requestAnimationFrame(loop);

      // Tab hidden → skip rendering entirely
      if (this._paused) return;

      const dt = this._lastTime ? Math.min(now - this._lastTime, 50) : 16; // cap dt at 50ms
      this._lastTime = now;

      // FPS measurement
      this._fpsFrames++;
      const elapsed = now - this._fpsTime;
      if (elapsed >= 1000) {
        this.perf.push(this._fpsFrames / (elapsed / 1000));
        this._fpsFrames = 0;
        this._fpsTime = now;
      }

      // Tick all active effects that use the unified loop
      for (const effect of this.active.values()) {
        if (effect.tick) {
          try {
            effect.tick(dt);
          } catch (e) {
            console.warn(`[EffectEngine] tick error on "${effect.id}":`, e);
          }
        }
      }
    };

    this._raf = requestAnimationFrame(loop);
  }

  private stopLoop() {
    this._running = false;
    cancelAnimationFrame(this._raf);
    this.perf.reset();
  }

  private updateLoop() {
    // Count effects that need the unified loop
    const needsLoop = [...this.active.values()].some((e) => !!e.tick);
    if (needsLoop && !this._running) this.startLoop();
    if (!needsLoop && this._running) this.stopLoop();
  }

  /* ── Effect lifecycle ── */

  /** Activate a single effect with params */
  enable(id: string, params: Record<string, any>) {
    if (this.active.has(id)) this.disable(id);
    const effect = this.effects.get(id);
    if (!effect) return;
    try {
      effect.activate(params);
      this.active.set(id, effect);
      this.updateLoop();
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
      this.updateLoop();
    }
  }

  /** Trigger an event-based effect */
  trigger(id: string, data?: any) {
    const isActive = this.active.has(id);
    const effect = this.active.get(id) || this.effects.get(id);
    if (!effect?.trigger) return;

    // If not active, temporarily activate to inject CSS styles needed by trigger
    if (!isActive) {
      try { effect.activate({}); } catch { /* ignore */ }
    }
    effect.trigger(data);
    // Schedule cleanup if we temporarily activated
    if (!isActive) {
      setTimeout(() => {
        if (!this.active.has(id)) {
          try { effect.deactivate(); } catch { /* ignore */ }
        }
      }, 5000);
    }
  }

  /** Disable all active effects */
  disableAll() {
    const ids = [...this.active.keys()];
    for (const id of ids) {
      this.disable(id);
    }
    // stopLoop is called by updateLoop inside disable
  }

  /** Apply full effects state — respects layer ordering (lower layer renders first / behind) */
  applyState(state: EffectsState) {
    // Disable effects that are no longer enabled
    const activeIds = [...this.active.keys()];
    for (const id of activeIds) {
      if (!state[id]?.enabled) this.disable(id);
    }
    // Sort by layer so lower-layer effects render first (behind)
    const sorted = Object.entries(state)
      .filter(([, config]) => config.enabled)
      .sort(([, a], [, b]) => (a.layer ?? 0) - (b.layer ?? 0));
    for (const [id, config] of sorted) {
      this.enable(id, config.params);
      // Apply z-index to the effect's canvas/div based on layer
      const el = document.getElementById(`pikabuddy-fx-${id}`);
      if (el) el.style.zIndex = String(config.layer ?? 0);
    }
  }

  /** Set trigger mappings (event name → effect IDs) */
  setTriggers(map: TriggerMap) {
    this.triggerMap = map;
  }

  /** Fire all effects mapped to an event name */
  triggerEvent(eventName: string, data?: any) {
    const ids = this.triggerMap[eventName];
    if (!ids) return;
    for (const id of ids) {
      this.trigger(id, data);
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
