/* ── MascotController — 30 behavior functions + JSON script execution ── */

export interface MascotAction {
  action: string;
  params?: Record<string, any>;
  /** Delay (ms) before executing this action */
  delay?: number;
}

export interface MascotReactions {
  onClick?: MascotAction[];
  onHover?: MascotAction[];
  onCorrect?: MascotAction[];
  onWrong?: MascotAction[];
  onLevelUp?: MascotAction[];
  onIdle?: MascotAction[];
}

/** Sprite sheet layout: horizontal (default), vertical, or grid */
export type SpriteLayout = "horizontal" | "vertical" | "grid";

/** Named sprite sheet configuration */
export interface SpriteSheetConfig {
  url: string;
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  fps?: number;
  /** Optional scale override for this sprite */
  scale?: number;
  /** Layout: "horizontal" (1 row), "vertical" (1 column), "grid" (cols x rows) */
  layout?: SpriteLayout;
  /** Columns per row — only used when layout is "grid" */
  cols?: number;
}

export interface MascotScript {
  /** Named sprite sheets (e.g. { idle: {...}, walk: {...}, attack: {...} }) */
  sprites?: Record<string, SpriteSheetConfig>;
  /** Actions to run on startup (sequentially) */
  onStart?: MascotAction[];
  /** Looping patrol/behavior */
  loop?: MascotAction[];
  /** Event reactions */
  reactions?: MascotReactions;
}

/** Easing helpers */
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Sanitize sprite URL */
function sanitizeSpriteUrl(raw: string): string {
  if (!raw) return "";
  if (raw.startsWith("data:image/")) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  return "";
}

/**
 * MascotController — Provides 30 functions to control a mascot DOM element.
 * Designed to be driven by JSON scripts or programmatic calls.
 */
export class MascotController {
  private el: HTMLElement;
  private _animId = 0;
  private _loopRunning = false;
  private _stopped = false;
  private _speechEl: HTMLElement | null = null;
  private _emoteEl: HTMLElement | null = null;
  private _facing: "left" | "right" = "right";

  /** Registry of named sprite sheets */
  private _sprites = new Map<string, SpriteSheetConfig>();
  /** Currently active sprite name */
  private _currentSprite: string | null = null;
  /** Base scale from the effect params */
  private _baseScale = 1;
  /** Whether the mascot element is alive (visible in DOM) */
  private _alive = true;
  /** Script generation — increments on each runFullScript to cancel previous */
  private _scriptGen = 0;
  /** Saved script for resuming after drag interruption */
  private _activeScript: MascotScript | null = null;

  constructor(element: HTMLElement) {
    this.el = element;
  }

  /* ═══════════ Sprite Management (6) ═══════════ */

  /** Register a named sprite sheet */
  addSprite(name: string, config: SpriteSheetConfig) {
    const url = sanitizeSpriteUrl(config.url);
    if (!url) { console.warn(`[MascotController] Invalid sprite URL for "${name}"`); return; }
    this._sprites.set(name, { ...config, url });
  }

  /** Register multiple sprites at once from a map */
  addSprites(sprites: Record<string, SpriteSheetConfig>) {
    for (const [name, config] of Object.entries(sprites)) {
      this.addSprite(name, config);
    }
  }

  /** Switch to a named sprite sheet — swaps the CSS animation + background */
  playSprite(name: string) {
    const config = this._sprites.get(name);
    if (!config) { console.warn(`[MascotController] Sprite "${name}" not registered`); return; }
    this._currentSprite = name;
    this._applySpriteSheet(config);
  }

  /** Low-level: directly set sprite sheet (no name registration needed) */
  setSpriteSheet(url: string, frameCount: number, frameWidth: number, frameHeight: number, fps = 8) {
    const safeUrl = sanitizeSpriteUrl(url);
    if (!safeUrl) return;
    this._applySpriteSheet({ url: safeUrl, frameCount, frameWidth, frameHeight, fps });
  }

  /** Spawn the mascot (make visible). Optionally switch to a named sprite first. */
  async spawn(spriteName?: string): Promise<void> {
    if (spriteName) this.playSprite(spriteName);
    this._alive = true;
    this._stopped = false;
    this.el.style.display = "";
    this.el.style.opacity = "0";
    void this.el.offsetHeight;
    this.el.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    this.el.style.opacity = "1";
    this.el.style.transform = this._facing === "left" ? "scaleX(-1)" : "";
    await this._wait(300);
    this.el.style.transition = "";
  }

  /** Kill the mascot (fade out + shrink, then hide). */
  async kill(): Promise<void> {
    this._alive = false;
    this.stop();
    this.el.style.transition = "opacity 0.4s ease, transform 0.4s ease";
    this.el.style.opacity = "0";
    this.el.style.transform = (this._facing === "left" ? "scaleX(-1) " : "") + "scale(0.3)";
    await this._wait(400);
    this.el.style.display = "none";
    this.el.style.transition = "";
  }

  /** Set the base scale (used for sprite sheet calculations) */
  setBaseScale(scale: number) {
    this._baseScale = scale;
  }

  /** Get current sprite name */
  getCurrentSprite(): string | null {
    return this._currentSprite;
  }

  /** Get all registered sprite names */
  getSpriteNames(): string[] {
    return [...this._sprites.keys()];
  }

  /* ═══════════ Movement (6) ═══════════ */

  /** Instantly move to absolute position (px from viewport edges) */
  moveTo(x: number, y: number) {
    this.el.style.right = `${x}px`;
    this.el.style.bottom = `${y}px`;
  }

  /** Smoothly walk to position over `duration` ms */
  walkTo(x: number, y: number, duration = 1000): Promise<void> {
    return new Promise((resolve) => {
      const startRight = parseFloat(this.el.style.right) || 20;
      const startBottom = parseFloat(this.el.style.bottom) || 20;
      const startTime = performance.now();
      const id = ++this._animId;

      const step = (now: number) => {
        if (this._stopped || this._animId !== id) { resolve(); return; }
        const t = Math.min(1, (now - startTime) / duration);
        const e = easeInOut(t);
        this.el.style.right = `${lerp(startRight, x, e)}px`;
        this.el.style.bottom = `${lerp(startBottom, y, e)}px`;
        if (t < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  /** Patrol between waypoints. Each waypoint: { x, y, pause? (ms) } */
  async patrol(waypoints: { x: number; y: number; pause?: number }[], repeat = 1): Promise<void> {
    for (let r = 0; r < repeat && !this._stopped; r++) {
      for (const wp of waypoints) {
        if (this._stopped) return;
        // Auto-flip based on movement direction
        const curRight = parseFloat(this.el.style.right) || 0;
        if (wp.x < curRight) this.flip("right");
        else if (wp.x > curRight) this.flip("left");
        await this.walkTo(wp.x, wp.y, 1200);
        if (wp.pause && !this._stopped) await this._wait(wp.pause);
      }
    }
  }

  /** Random wandering within bounds */
  async wander(bounds = { minX: 10, maxX: 300, minY: 10, maxY: 200 }, steps = 5): Promise<void> {
    for (let i = 0; i < steps && !this._stopped; i++) {
      const x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      const y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
      const curRight = parseFloat(this.el.style.right) || 0;
      if (x < curRight) this.flip("right");
      else if (x > curRight) this.flip("left");
      await this.walkTo(x, y, 800 + Math.random() * 800);
      await this._wait(500 + Math.random() * 1500);
    }
  }

  /** Follow cursor position (runs until stop() is called) */
  follow(offset = { x: 40, y: 40 }, speed = 0.05): () => void {
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    window.addEventListener("mousemove", onMove);

    const id = ++this._animId;
    const tick = () => {
      if (this._stopped || this._animId !== id) {
        window.removeEventListener("mousemove", onMove);
        return;
      }
      const targetRight = window.innerWidth - mx + offset.x;
      const targetBottom = window.innerHeight - my + offset.y;
      const curRight = parseFloat(this.el.style.right) || 0;
      const curBottom = parseFloat(this.el.style.bottom) || 0;
      this.el.style.right = `${lerp(curRight, targetRight, speed)}px`;
      this.el.style.bottom = `${lerp(curBottom, targetBottom, speed)}px`;

      // Auto-flip
      if (targetRight < curRight - 2) this.flip("right");
      else if (targetRight > curRight + 2) this.flip("left");

      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      this._animId++;
    };
  }

  /** Orbit around a fixed point */
  async orbit(centerX: number, centerY: number, radius = 80, revolutions = 2, duration = 3000): Promise<void> {
    const startTime = performance.now();
    const id = ++this._animId;
    const totalAngle = revolutions * Math.PI * 2;

    return new Promise((resolve) => {
      const step = (now: number) => {
        if (this._stopped || this._animId !== id) { resolve(); return; }
        const t = Math.min(1, (now - startTime) / duration);
        const angle = totalAngle * easeInOut(t);
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        this.el.style.right = `${x}px`;
        this.el.style.bottom = `${y}px`;
        if (t < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  /* ═══════════ Animation (9) ═══════════ */

  /** Bounce in place */
  async bounce(height = 20, count = 3, speed = 150): Promise<void> {
    const orig = parseFloat(this.el.style.bottom) || 20;
    for (let i = 0; i < count && !this._stopped; i++) {
      await this._animateBottom(orig + height, speed);
      await this._animateBottom(orig, speed);
    }
  }

  /** Single high jump */
  async jump(height = 60, duration = 400): Promise<void> {
    const orig = parseFloat(this.el.style.bottom) || 20;
    await this._animateBottom(orig + height, duration * 0.4);
    await this._animateBottom(orig, duration * 0.6);
  }

  /** Spin N times */
  async spin(turns = 1, duration = 600): Promise<void> {
    this.el.style.transition = `transform ${duration}ms ease-in-out`;
    const scaleX = this._facing === "left" ? -1 : 1;
    this.el.style.transform = `scaleX(${scaleX}) rotate(${turns * 360}deg)`;
    await this._wait(duration);
    this.el.style.transition = "";
    this.el.style.transform = this._facing === "left" ? "scaleX(-1)" : "";
  }

  /** Horizontal shake */
  async shake(intensity = 5, duration = 500): Promise<void> {
    const startTime = performance.now();
    const id = ++this._animId;
    const origRight = parseFloat(this.el.style.right) || 20;

    return new Promise((resolve) => {
      const step = (now: number) => {
        if (this._stopped || this._animId !== id) {
          this.el.style.right = `${origRight}px`;
          resolve();
          return;
        }
        const t = (now - startTime) / duration;
        if (t >= 1) {
          this.el.style.right = `${origRight}px`;
          resolve();
          return;
        }
        const decay = 1 - t;
        const offset = Math.sin(t * Math.PI * 8) * intensity * decay;
        this.el.style.right = `${origRight + offset}px`;
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /** Wave animation (tilt back and forth) */
  async wave(count = 3, duration = 800): Promise<void> {
    const interval = duration / (count * 2);
    const scaleX = this._facing === "left" ? -1 : 1;
    for (let i = 0; i < count && !this._stopped; i++) {
      this.el.style.transition = `transform ${interval}ms ease`;
      this.el.style.transform = `scaleX(${scaleX}) rotate(-15deg)`;
      await this._wait(interval);
      this.el.style.transform = `scaleX(${scaleX}) rotate(15deg)`;
      await this._wait(interval);
    }
    this.el.style.transition = "";
    this.el.style.transform = this._facing === "left" ? "scaleX(-1)" : "";
  }

  /** Dance: bounce + spin combo */
  async dance(duration = 2000): Promise<void> {
    const end = performance.now() + duration;
    while (performance.now() < end && !this._stopped) {
      await this.bounce(15, 2, 100);
      await this.spin(1, 400);
    }
  }

  /** Nod (small up-down) */
  async nod(count = 2, speed = 200): Promise<void> {
    const orig = parseFloat(this.el.style.bottom) || 20;
    for (let i = 0; i < count && !this._stopped; i++) {
      await this._animateBottom(orig + 6, speed);
      await this._animateBottom(orig, speed);
    }
  }

  /** Float gently up and down */
  async float(amplitude = 8, duration = 3000): Promise<void> {
    const orig = parseFloat(this.el.style.bottom) || 20;
    const startTime = performance.now();
    const id = ++this._animId;

    return new Promise((resolve) => {
      const step = (now: number) => {
        if (this._stopped || this._animId !== id) { resolve(); return; }
        const t = (now - startTime) / duration;
        if (t >= 1) {
          this.el.style.bottom = `${orig}px`;
          resolve();
          return;
        }
        const offset = Math.sin(t * Math.PI * 2) * amplitude;
        this.el.style.bottom = `${orig + offset}px`;
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /** Surprise reaction (jump + shake) */
  async surprise(): Promise<void> {
    await this.jump(40, 300);
    await this.shake(8, 400);
  }

  /* ═══════════ Display (5) ═══════════ */

  /** Flip sprite horizontally */
  flip(direction?: "left" | "right") {
    if (direction) {
      this._facing = direction;
    } else {
      this._facing = this._facing === "right" ? "left" : "right";
    }
    this.el.style.transform = this._facing === "left" ? "scaleX(-1)" : "";
  }

  /** Set scale */
  setScale(scale: number) {
    const scaleX = this._facing === "left" ? -scale : scale;
    this.el.style.transform = `scaleX(${scaleX}) scaleY(${scale})`;
  }

  /** Set opacity */
  setOpacity(opacity: number) {
    this.el.style.opacity = String(Math.max(0, Math.min(1, opacity)));
  }

  /** Hide mascot (fade out) */
  async hide(duration = 300): Promise<void> {
    this.el.style.transition = `opacity ${duration}ms ease`;
    this.el.style.opacity = "0";
    await this._wait(duration);
    this.el.style.display = "none";
    this.el.style.transition = "";
  }

  /** Show mascot (fade in) */
  async show(duration = 300): Promise<void> {
    this.el.style.display = "";
    this.el.style.opacity = "0";
    // Force reflow
    void this.el.offsetHeight;
    this.el.style.transition = `opacity ${duration}ms ease`;
    this.el.style.opacity = "1";
    await this._wait(duration);
    this.el.style.transition = "";
  }

  /* ═══════════ Communication (2) ═══════════ */

  /** Show a speech bubble */
  async say(text: string, duration = 3000): Promise<void> {
    this._removeSpeech();
    const bubble = document.createElement("div");
    bubble.className = "pkb-mascot-speech";
    bubble.textContent = text;
    bubble.style.cssText = `
      position:absolute; bottom:100%; right:50%; transform:translateX(50%);
      background:var(--surface-container-lowest, #fff); color:var(--on-surface, #333);
      padding:6px 10px; border-radius:10px; font-size:12px; font-weight:500;
      white-space:nowrap; box-shadow:0 2px 8px rgba(0,0,0,0.15);
      border:1px solid var(--outline-variant, #ddd);
      pointer-events:none; opacity:0; transition:opacity 0.2s;
      margin-bottom:8px;
    `;
    this.el.appendChild(bubble);
    void bubble.offsetHeight;
    bubble.style.opacity = "1";
    this._speechEl = bubble;

    await this._wait(duration);
    if (this._speechEl === bubble) {
      bubble.style.opacity = "0";
      await this._wait(200);
      bubble.remove();
      this._speechEl = null;
    }
  }

  /** Show an emote (emoji above head) */
  async emote(emoji: string, duration = 2000): Promise<void> {
    this._removeEmote();
    const emoteEl = document.createElement("div");
    emoteEl.className = "pkb-mascot-emote";
    emoteEl.textContent = emoji;
    emoteEl.style.cssText = `
      position:absolute; bottom:100%; left:50%; transform:translateX(-50%) translateY(0);
      font-size:24px; pointer-events:none; opacity:0;
      transition:opacity 0.3s, transform 0.3s;
      margin-bottom:4px;
    `;
    this.el.appendChild(emoteEl);
    void emoteEl.offsetHeight;
    emoteEl.style.opacity = "1";
    emoteEl.style.transform = "translateX(-50%) translateY(-12px)";
    this._emoteEl = emoteEl;

    await this._wait(duration);
    if (this._emoteEl === emoteEl) {
      emoteEl.style.opacity = "0";
      await this._wait(300);
      emoteEl.remove();
      this._emoteEl = null;
    }
  }

  /* ═══════════ Control (3) ═══════════ */

  /** Sleep: dim + gentle float */
  async sleep(duration = 5000): Promise<void> {
    this.setOpacity(0.6);
    await this.emote("💤", Math.min(duration, 2000));
    await this.float(4, duration);
    this.setOpacity(1);
  }

  /** Idle: subtle breathing animation */
  async idle(duration = 5000): Promise<void> {
    const cycles = Math.max(1, Math.floor(duration / 2000));
    for (let i = 0; i < cycles && !this._stopped; i++) {
      await this.float(3, 2000);
    }
  }

  /** Stop all current animations and loops */
  stop() {
    this._stopped = true;
    this._animId++;
    this._loopRunning = false;
  }

  /** Resume: restart the saved script's loop (e.g. after drag ends) */
  resume() {
    if (!this._activeScript) return;
    this._stopped = false;
    const script = this._activeScript;
    // Only restart the loop portion — don't re-run onStart
    if (script.loop && script.loop.length > 0) {
      const gen = ++this._scriptGen;
      this._loopRunning = true;
      (async () => {
        while (this._loopRunning && !this._stopped && this._scriptGen === gen) {
          await this.runScript(script.loop!);
        }
      })();
    }
  }

  /* ═══════════ Script Execution ═══════════ */

  /** Execute a single action — automatically clears stopped state */
  async execute(action: string, params: Record<string, any> = {}): Promise<void> {
    // Clear stopped flag so the action actually runs
    // (stop() only blocks currently-running animations, not new ones)
    if (action !== "stop") this._stopped = false;
    switch (action) {
      // Movement
      case "moveTo": this.moveTo(params.x ?? 20, params.y ?? 20); break;
      case "walkTo": await this.walkTo(params.x ?? 20, params.y ?? 20, params.duration); break;
      case "patrol": await this.patrol(params.waypoints ?? [], params.repeat ?? 1); break;
      case "wander": await this.wander(params.bounds, params.steps); break;
      case "follow": this.follow(params.offset, params.speed); break;
      case "orbit": await this.orbit(params.centerX ?? 150, params.centerY ?? 150, params.radius, params.revolutions, params.duration); break;
      // Animation
      case "bounce": await this.bounce(params.height, params.count, params.speed); break;
      case "jump": await this.jump(params.height, params.duration); break;
      case "spin": await this.spin(params.turns, params.duration); break;
      case "shake": await this.shake(params.intensity, params.duration); break;
      case "wave": await this.wave(params.count, params.duration); break;
      case "dance": await this.dance(params.duration); break;
      case "nod": await this.nod(params.count, params.speed); break;
      case "float": await this.float(params.amplitude, params.duration); break;
      case "surprise": await this.surprise(); break;
      // Display
      case "flip": this.flip(params.direction); break;
      case "setScale": this.setScale(params.scale ?? 1); break;
      case "setOpacity": this.setOpacity(params.opacity ?? 1); break;
      case "hide": await this.hide(params.duration); break;
      case "show": await this.show(params.duration); break;
      // Communication
      case "say": await this.say(params.text ?? "", params.duration); break;
      case "emote": await this.emote(params.emoji ?? "❤️", params.duration); break;
      // Control
      case "sleep": await this.sleep(params.duration); break;
      case "idle": await this.idle(params.duration); break;
      case "wait": await this._wait(params.duration ?? 1000); break;
      case "stop": this.stop(); break;
      // Sprite management
      case "addSprite": if (params.name && params.config) this.addSprite(params.name, params.config); break;
      case "playSprite": if (params.name) this.playSprite(params.name); break;
      case "setSpriteSheet": this.setSpriteSheet(params.url ?? "", params.frameCount ?? 4, params.frameWidth ?? 64, params.frameHeight ?? 64, params.fps); break;
      case "spawn": await this.spawn(params.name); break;
      case "kill": await this.kill(); break;
      default:
        console.warn(`[MascotController] Unknown action: "${action}"`);
    }
  }

  /** Run a sequence of actions */
  async runScript(actions: MascotAction[]): Promise<void> {
    for (const act of actions) {
      if (this._stopped) break;
      if (act.delay) await this._wait(act.delay);
      await this.execute(act.action, act.params || {});
    }
  }

  /** Run the full mascot script (register sprites → onStart → loop).
   *  Cancels any previously running script automatically. */
  async runFullScript(script: MascotScript): Promise<void> {
    // Cancel previous script
    this.stop();
    await this._wait(20); // let previous animations exit their RAF loops

    this._stopped = false;
    this._loopRunning = false;
    this._activeScript = script;
    const gen = ++this._scriptGen;

    // Register named sprite sheets if provided
    if (script.sprites) {
      this.addSprites(script.sprites);
    }

    // Run startup sequence
    if (script.onStart) {
      await this.runScript(script.onStart);
      if (this._scriptGen !== gen) return; // cancelled by a new script
    }

    // Run loop
    if (script.loop && script.loop.length > 0) {
      this._loopRunning = true;
      while (this._loopRunning && !this._stopped && this._scriptGen === gen) {
        await this.runScript(script.loop);
      }
    }
  }

  /** Setup reaction handlers — returns cleanup function */
  setupReactions(reactions: MascotReactions): () => void {
    const handlers: (() => void)[] = [];

    if (reactions.onClick) {
      const actions = reactions.onClick;
      const handler = () => { this.runScript(actions); };
      this.el.addEventListener("click", handler);
      handlers.push(() => this.el.removeEventListener("click", handler));
    }

    if (reactions.onHover) {
      const actions = reactions.onHover;
      const handler = () => { this.runScript(actions); };
      this.el.addEventListener("mouseenter", handler);
      handlers.push(() => this.el.removeEventListener("mouseenter", handler));
    }

    // Gamification events — listen on window
    const eventMap: [keyof MascotReactions, string][] = [
      ["onCorrect", "pikabuddy:correct"],
      ["onWrong", "pikabuddy:wrong"],
      ["onLevelUp", "pikabuddy:levelup"],
    ];

    for (const [key, eventName] of eventMap) {
      const actions = reactions[key];
      if (actions) {
        const handler = () => { this.runScript(actions); };
        window.addEventListener(eventName, handler);
        handlers.push(() => window.removeEventListener(eventName, handler));
      }
    }

    // Idle timer
    if (reactions.onIdle) {
      const actions = reactions.onIdle;
      let timer = 0;
      const resetIdle = () => {
        clearTimeout(timer);
        timer = window.setTimeout(() => { this.runScript(actions); }, 30000);
      };
      window.addEventListener("mousemove", resetIdle);
      window.addEventListener("keydown", resetIdle);
      resetIdle();
      handlers.push(() => {
        clearTimeout(timer);
        window.removeEventListener("mousemove", resetIdle);
        window.removeEventListener("keydown", resetIdle);
      });
    }

    return () => {
      for (const cleanup of handlers) cleanup();
    };
  }

  /** Destroy: clean up all DOM and state */
  destroy() {
    this.stop();
    this._removeSpeech();
    this._removeEmote();
    this._sprites.clear();
    this._currentSprite = null;
  }

  /* ═══════════ Private helpers ═══════════ */

  /** Apply a sprite sheet config to the mascot element + CSS.
   *  Supports horizontal (1 row), vertical (1 column), and grid (cols × rows) layouts. */
  private _applySpriteSheet(config: SpriteSheetConfig) {
    const layout = config.layout || "horizontal";
    const scale = (config.scale ?? 1) * this._baseScale;
    const displayW = Math.round(config.frameWidth * scale);
    const displayH = Math.round(config.frameHeight * scale);
    const fps = config.fps ?? 8;
    const duration = Math.round((1000 / fps) * config.frameCount);

    let sheetW: number;
    let sheetH: number;
    let keyframesBody: string;
    let stepsValue: string;

    if (layout === "vertical") {
      sheetW = displayW;
      sheetH = config.frameCount * displayH;
      keyframesBody = `from { background-position: 0 0; } to { background-position: 0 -${sheetH}px; }`;
      stepsValue = `steps(${config.frameCount})`;
    } else if (layout === "grid") {
      const cols = config.cols ?? Math.ceil(Math.sqrt(config.frameCount));
      const rows = Math.ceil(config.frameCount / cols);
      sheetW = cols * displayW;
      sheetH = rows * displayH;
      // Generate explicit keyframe stop for each frame
      const stops: string[] = [];
      for (let i = 0; i < config.frameCount; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const pct = (i / config.frameCount) * 100;
        stops.push(`${pct.toFixed(3)}% { background-position: -${col * displayW}px -${row * displayH}px; }`);
      }
      const lastCol = (config.frameCount - 1) % cols;
      const lastRow = Math.floor((config.frameCount - 1) / cols);
      stops.push(`100% { background-position: -${lastCol * displayW}px -${lastRow * displayH}px; }`);
      keyframesBody = stops.join(" ");
      stepsValue = "steps(1)"; // jump between explicit stops
    } else {
      // horizontal (default)
      sheetW = config.frameCount * displayW;
      sheetH = displayH;
      keyframesBody = `from { background-position: 0 0; } to { background-position: -${sheetW}px 0; }`;
      stepsValue = `steps(${config.frameCount})`;
    }

    // Update element dimensions + background
    this.el.style.width = `${displayW}px`;
    this.el.style.height = `${displayH}px`;
    this.el.style.backgroundImage = `url('${config.url}')`;
    this.el.style.backgroundSize = `${sheetW}px ${sheetH}px`;

    // Update walk animation keyframes
    const styleEl = document.getElementById("pikabuddy-fxcss-mascotSprite") as HTMLStyleElement | null;
    if (styleEl) {
      const newKeyframes = `@keyframes pkb-mascot-walk { ${keyframesBody} }`;
      let css = styleEl.textContent || "";
      // Robust regex: matches @keyframes block with any number of inner { } pairs
      const kfRegex = /@keyframes pkb-mascot-walk\s*\{(?:[^{}]*\{[^}]*\})*[^{}]*\}/;
      if (kfRegex.test(css)) {
        css = css.replace(kfRegex, newKeyframes);
      } else {
        css = newKeyframes + "\n" + css;
      }
      styleEl.textContent = css;
    }

    this.el.style.animation = `pkb-mascot-walk ${duration}ms ${stepsValue} infinite`;
  }

  private _wait(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  private _animateBottom(target: number, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const start = parseFloat(this.el.style.bottom) || 0;
      const startTime = performance.now();
      const id = ++this._animId;

      const step = (now: number) => {
        if (this._stopped || this._animId !== id) { resolve(); return; }
        const t = Math.min(1, (now - startTime) / duration);
        this.el.style.bottom = `${lerp(start, target, easeInOut(t))}px`;
        if (t < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  private _removeSpeech() {
    if (this._speechEl) {
      this._speechEl.remove();
      this._speechEl = null;
    }
  }

  private _removeEmote() {
    if (this._emoteEl) {
      this._emoteEl.remove();
      this._emoteEl = null;
    }
  }
}

/** Default script for when no user script is provided */
export const DEFAULT_MASCOT_SCRIPT: MascotScript = {
  onStart: [
    { action: "say", params: { text: "안녕! 👋", duration: 2000 } },
    { action: "bounce", params: { height: 15, count: 2 } },
  ],
  loop: [
    { action: "idle", params: { duration: 8000 } },
    { action: "wander", params: { steps: 2, bounds: { minX: 10, maxX: 200, minY: 10, maxY: 60 } } },
  ],
  reactions: {
    onClick: [
      { action: "bounce", params: { height: 20, count: 2 } },
      { action: "emote", params: { emoji: "😊", duration: 1500 } },
    ],
    onHover: [
      { action: "nod" },
    ],
    onCorrect: [
      { action: "jump", params: { height: 40 } },
      { action: "emote", params: { emoji: "🎉", duration: 2000 } },
      { action: "dance", params: { duration: 1500 } },
    ],
    onWrong: [
      { action: "shake", params: { intensity: 6 } },
      { action: "emote", params: { emoji: "😢", duration: 1500 } },
    ],
    onLevelUp: [
      { action: "spin", params: { turns: 2 } },
      { action: "jump", params: { height: 60 } },
      { action: "say", params: { text: "레벨업! 🎊", duration: 3000 } },
    ],
  },
};
