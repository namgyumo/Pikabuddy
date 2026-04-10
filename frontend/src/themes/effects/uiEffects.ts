/* ── UI Effects (18) — Element, Text, Interaction, Cursor ── */

import type { ThemeEffect } from "./types";
import { injectEffectStyle, removeEffectStyle } from "./engine";

/* ════════════ Element Style Effects (6) ════════════ */

/* ═══ 1. Glow ═══ */
export const glowEffect: ThemeEffect = {
  id: "glow",
  activate(p) {
    const color = p.color || "#6C5CE7";
    const intensity = p.intensity || 0.5;
    const spread = Math.round(intensity * 30);
    const blur = Math.round(intensity * 20);
    injectEffectStyle("glow", `
      .card, [class*="card"], .btn-primary, button[class*="primary"] {
        box-shadow: 0 0 ${blur}px ${spread}px ${color}${Math.round(intensity * 40).toString(16).padStart(2,"0")} !important;
        transition: box-shadow 0.3s ease !important;
      }
      .card:hover, [class*="card"]:hover {
        box-shadow: 0 0 ${blur + 8}px ${spread + 5}px ${color}${Math.round(intensity * 60).toString(16).padStart(2,"0")} !important;
      }
    `);
  },
  deactivate() { removeEffectStyle("glow"); },
};

/* ═══ 2. GlassMorphism ═══ */
export const glassMorphismEffect: ThemeEffect = {
  id: "glassMorphism",
  activate(p) {
    const blur = p.blur || 12;
    const opacity = p.opacity || 0.15;
    injectEffectStyle("glassMorphism", `
      .card, [class*="card"], .modal-content, [class*="panel"] {
        backdrop-filter: blur(${blur}px) !important;
        -webkit-backdrop-filter: blur(${blur}px) !important;
        background: rgba(255,255,255,${opacity}) !important;
        border: 1px solid rgba(255,255,255,${opacity + 0.1}) !important;
      }
      html[data-theme="cyberpunk"] .card, html[data-theme="coding"] .card {
        background: rgba(0,0,0,${opacity}) !important;
        border: 1px solid rgba(255,255,255,${opacity * 0.5}) !important;
      }
    `);
  },
  deactivate() { removeEffectStyle("glassMorphism"); },
};

/* ═══ 3. Gradient Border ═══ */
export const gradientBorderEffect: ThemeEffect = {
  id: "gradientBorder",
  activate(p) {
    const c1 = p.color1 || "#6C5CE7";
    const c2 = p.color2 || "#00cec9";
    injectEffectStyle("gradientBorder", `
      .card, .assignment-card, .note-card, .course-card, .student-card, .material-card, .quiz-card {
        position: relative !important;
        border: none !important;
      }
      .card::before, .assignment-card::before, .note-card::before, .course-card::before, .student-card::before, .material-card::before, .quiz-card::before {
        content: "" !important;
        position: absolute !important;
        inset: 0 !important;
        padding: 1.5px !important;
        border-radius: inherit !important;
        background: linear-gradient(135deg, ${c1}, ${c2}) !important;
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0) !important;
        mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0) !important;
        -webkit-mask-composite: xor !important;
        mask-composite: exclude !important;
        pointer-events: none !important;
        z-index: 0 !important;
      }
    `);
  },
  deactivate() { removeEffectStyle("gradientBorder"); },
};

/* ═══ 4. Card Tilt ═══ */
export const cardTiltEffect: ThemeEffect = {
  id: "cardTilt",
  activate(p) {
    const maxAngle = p.intensity || 5;

    let rafId = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const el = e.target as HTMLElement;
        if (!el || typeof el.closest !== "function") return;
        const target = el.closest<HTMLElement>(".card, [class*='card']");
        if (!target) return;
        const rect = target.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        target.style.transform = `perspective(800px) rotateX(${-y * maxAngle}deg) rotateY(${x * maxAngle}deg)`;
        target.style.transition = "transform 0.1s ease";
      });
    };

    const onLeave = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!el || typeof el.closest !== "function") return;
      const target = el.closest<HTMLElement>(".card, [class*='card']");
      if (target) {
        target.style.transform = "";
        target.style.transition = "transform 0.5s ease";
      }
    };

    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave, true);
    (this as any)._onMove = onMove;
    (this as any)._onLeave = onLeave;
    (this as any)._rafId = rafId;

    injectEffectStyle("cardTilt", `
      .card, [class*="card"] { transform-style: preserve-3d; }
    `);
  },
  deactivate() {
    document.removeEventListener("mousemove", (this as any)._onMove);
    document.removeEventListener("mouseleave", (this as any)._onLeave, true);
    cancelAnimationFrame((this as any)._rafId);
    removeEffectStyle("cardTilt");
    document.querySelectorAll<HTMLElement>(".card, [class*='card']").forEach((el) => {
      el.style.transform = "";
    });
  },
} as any;

/* ═══ 5. Soft Shadow ═══ */
export const softShadowEffect: ThemeEffect = {
  id: "softShadow",
  activate(p) {
    const depth = p.depth || 3;
    const layers: string[] = [];
    for (let i = 1; i <= depth; i++) {
      const y = i * 2;
      const blur = i * 6;
      const spread = -i;
      const alpha = 0.03 + (depth - i) * 0.01;
      layers.push(`0 ${y}px ${blur}px ${spread}px rgba(0,0,0,${alpha})`);
    }
    injectEffectStyle("softShadow", `
      .card, [class*="card"], .modal-content {
        box-shadow: ${layers.join(",")} !important;
      }
    `);
  },
  deactivate() { removeEffectStyle("softShadow"); },
};

/* ═══ 6. Draw Border ═══ */
export const drawBorderEffect: ThemeEffect = {
  id: "drawBorder",
  activate() {
    injectEffectStyle("drawBorder", `
      .card, [class*="card"], button {
        position: relative !important;
        overflow: hidden !important;
      }
      .card::after, [class*="card"]::after {
        content: "" !important;
        position: absolute !important;
        inset: 0 !important;
        border: 2px solid var(--primary, #6C5CE7) !important;
        border-radius: inherit !important;
        opacity: 0 !important;
        clip-path: polygon(0 0, 0 0, 0 0, 0 0) !important;
        transition: clip-path 0.5s ease, opacity 0.2s ease !important;
        pointer-events: none !important;
      }
      .card:hover::after, [class*="card"]:hover::after {
        opacity: 1 !important;
        clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%) !important;
      }
    `);
  },
  deactivate() { removeEffectStyle("drawBorder"); },
};

/* ════════════ Text Effects (5) ════════════ */

/* ═══ 7. Glitch Text ═══ */
export const glitchTextEffect: ThemeEffect = {
  id: "glitchText",
  activate() {
    injectEffectStyle("glitchText", `
      h1, h2, .page-title {
        position: relative !important;
        animation: pkb-glitch 6s infinite !important;
      }
      @keyframes pkb-glitch {
        0%, 95%, 100% { transform: none; }
        96% { transform: translate(-1px, 0.5px); }
        97% { transform: translate(1px, -0.5px); }
        98% { transform: none; }
      }
    `);
  },
  deactivate() { removeEffectStyle("glitchText"); },
};

/* ═══ 8. Rainbow Text ═══ */
export const rainbowTextEffect: ThemeEffect = {
  id: "rainbowText",
  activate() {
    injectEffectStyle("rainbowText", `
      h1, h2, .page-title {
        background: linear-gradient(90deg, #ff6b6b, #ffa348, #ffd43b, #69db7c, #4dabf7, #9775fa, #e599f7, #ff6b6b) !important;
        background-size: 300% auto !important;
        -webkit-background-clip: text !important;
        background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        animation: pkb-rainbow-flow 8s linear infinite !important;
      }
      @keyframes pkb-rainbow-flow {
        to { background-position: 300% center; }
      }
    `);
  },
  deactivate() { removeEffectStyle("rainbowText"); },
};

/* ═══ 9. Text Scramble ═══ */
export const textScrambleEffect: ThemeEffect = {
  id: "textScramble",
  activate() {
    const chars = "■◆▲●★◇▽○☆◈";
    const observed = new WeakSet<Element>();

    const scramble = (el: HTMLElement) => {
      if (observed.has(el)) return;
      observed.add(el);
      const original = el.textContent || "";
      let frame = 0;
      const totalFrames = original.length * 3;

      const animate = () => {
        let result = "";
        for (let i = 0; i < original.length; i++) {
          if (original[i] === " ") { result += " "; continue; }
          if (frame > i * 3) result += original[i];
          else result += chars[Math.random() * chars.length | 0];
        }
        el.textContent = result;
        frame++;
        if (frame <= totalFrames) requestAnimationFrame(animate);
      };
      animate();
    };

    let scrambleTimer = 0;
    const observer = new MutationObserver(() => {
      clearTimeout(scrambleTimer);
      scrambleTimer = window.setTimeout(() => {
        document.querySelectorAll<HTMLElement>("h1, h2, .page-title").forEach(scramble);
      }, 200);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll<HTMLElement>("h1, h2, .page-title").forEach(scramble);
    (this as any)._observer = observer;
  },
  deactivate() {
    (this as any)._observer?.disconnect();
  },
} as any;

/* ═══ 10. Wavy Text ═══ */
export const wavyTextEffect: ThemeEffect = {
  id: "wavyText",
  activate() {
    injectEffectStyle("wavyText", `
      h1, h2, .page-title {
        display: inline-flex !important;
        animation: pkb-wavy 3s ease-in-out infinite !important;
      }
      @keyframes pkb-wavy {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-2px); }
      }
    `);
  },
  deactivate() { removeEffectStyle("wavyText"); },
};

/* ═══ 11. Neon Text ═══ */
export const neonTextEffect: ThemeEffect = {
  id: "neonText",
  activate(p) {
    const color = p.color || "#6C5CE7";
    injectEffectStyle("neonText", `
      h1, h2, .page-title {
        text-shadow:
          0 0 4px ${color}80,
          0 0 8px ${color}50,
          0 0 16px ${color}30 !important;
        animation: pkb-neon-flicker 4s ease-in-out infinite alternate !important;
      }
      @keyframes pkb-neon-flicker {
        0%, 18%, 22%, 25%, 53%, 57%, 100% { opacity: 1; }
        20%, 24%, 55% { opacity: 0.92; }
      }
    `);
  },
  deactivate() { removeEffectStyle("neonText"); },
};

/* ════════════ Interaction Effects (2) ════════════ */

/* ═══ 12. Ripple Click ═══ */
export const rippleClickEffect: ThemeEffect = {
  id: "rippleClick",
  activate(p) {
    const color = p.color || "#6C5CE7";
    injectEffectStyle("rippleClick", `
      .pkb-ripple {
        position: absolute;
        border-radius: 50%;
        background: ${color}40;
        transform: scale(0);
        animation: pkb-ripple-expand 0.6s ease-out forwards;
        pointer-events: none;
      }
      @keyframes pkb-ripple-expand {
        to { transform: scale(4); opacity: 0; }
      }
    `);

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const btn = target.closest("button, a, .card, [class*='card']") as HTMLElement | null;
      if (!btn) return;

      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement("span");
      ripple.className = "pkb-ripple";
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;

      const pos = getComputedStyle(btn).position;
      if (pos === "static") btn.style.position = "relative";
      btn.style.overflow = "hidden";
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    };
    document.addEventListener("click", onClick, true);
    (this as any)._onClick = onClick;
  },
  deactivate() {
    document.removeEventListener("click", (this as any)._onClick, true);
    removeEffectStyle("rippleClick");
  },
} as any;

/* ═══ 13. Magnetic Button ═══ */
export const magneticButtonEffect: ThemeEffect = {
  id: "magneticButton",
  activate(p) {
    const strength = p.strength || 0.12;
    let buttons: HTMLElement[] = [];
    let cacheTime = 0;

    let rafId = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const now = Date.now();
        if (now - cacheTime > 1000) {
          buttons = Array.from(document.querySelectorAll<HTMLElement>(".btn-primary, button[class*='primary']"));
          cacheTime = now;
        }
        for (const btn of buttons) {
          if (!btn.isConnected) continue;
          const rect = btn.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dx = e.clientX - cx;
          const dy = e.clientY - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 60) {
            btn.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
            btn.style.transition = "transform 0.2s ease";
          } else {
            btn.style.transform = "";
            btn.style.transition = "transform 0.4s ease";
          }
        }
      });
    };
    document.addEventListener("mousemove", onMove, { passive: true });
    (this as any)._onMove = onMove;
    (this as any)._rafId = rafId;
  },
  deactivate() {
    document.removeEventListener("mousemove", (this as any)._onMove);
    cancelAnimationFrame((this as any)._rafId);
    document.querySelectorAll<HTMLElement>(".btn-primary, button[class*='primary']").forEach((b) => {
      b.style.transform = "";
    });
  },
} as any;

/* ════════════ Cursor Effects (5) ════════════ */

/* ═══ 14. Mouse Trail ═══ */
export const mouseTrailEffect: ThemeEffect = {
  id: "mouseTrail",
  activate(p) {
    const shape = p.shape || "dot";
    const color = p.color || "#6C5CE7";
    const particles: HTMLDivElement[] = [];
    const maxParticles = 10;
    let lastTime = 0;

    const shapes: Record<string, string> = {
      dot: `width:4px;height:4px;border-radius:50%;background:${color};`,
      star: `width:8px;height:8px;background:${color};clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);`,
      spark: `width:6px;height:6px;background:${color};clip-path:polygon(50% 0%,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0% 50%,40% 40%);`,
    };

    const onMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastTime < 40) return;
      lastTime = now;
      const dot = document.createElement("div");
      dot.style.cssText = `
        position:fixed;left:${e.clientX}px;top:${e.clientY}px;
        ${shapes[shape] || shapes.dot}
        pointer-events:none;z-index:99999;
        opacity:0.6;transition:all 0.4s ease;transform:translate(-50%,-50%);
      `;
      document.body.appendChild(dot);
      particles.push(dot);

      requestAnimationFrame(() => {
        dot.style.opacity = "0";
        dot.style.transform = "translate(-50%,-50%) scale(0.2)";
      });
      setTimeout(() => dot.remove(), 400);
      if (particles.length > maxParticles) {
        particles.shift()?.remove();
      }
    };

    document.addEventListener("mousemove", onMove);
    (this as any)._onMove = onMove;
    (this as any)._particles = particles;
  },
  deactivate() {
    document.removeEventListener("mousemove", (this as any)._onMove);
    ((this as any)._particles as HTMLDivElement[])?.forEach((p) => p.remove());
  },
} as any;

/* ═══ 15. Cursor Glow ═══ */
export const cursorGlowEffect: ThemeEffect = {
  id: "cursorGlow",
  activate(p) {
    const color = p.color || "#6C5CE7";
    const size = p.size || 150;
    const glow = document.createElement("div");
    glow.id = "pikabuddy-fx-cursorGlow";
    glow.style.cssText = `
      position:fixed;width:${size}px;height:${size}px;
      border-radius:50%;pointer-events:none;z-index:99998;
      background:radial-gradient(circle, ${color}15, ${color}06, transparent 70%);
      transform:translate(-50%,-50%);
      transition:left 0.15s ease, top 0.15s ease;
    `;
    document.body.appendChild(glow);

    const onMove = (e: MouseEvent) => {
      glow.style.left = `${e.clientX}px`;
      glow.style.top = `${e.clientY}px`;
    };
    document.addEventListener("mousemove", onMove);
    (this as any)._onMove = onMove;
  },
  deactivate() {
    document.removeEventListener("mousemove", (this as any)._onMove);
    document.getElementById("pikabuddy-fx-cursorGlow")?.remove();
  },
} as any;

/* ═══ 16. Custom Cursor ═══ */
export const customCursorEffect: ThemeEffect = {
  id: "customCursor",
  activate(p) {
    const shape = p.shape || "crosshair";
    const cursors: Record<string, string> = {
      crosshair: "crosshair",
      star: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><polygon points='12,0 15,9 24,9 17,14 19,24 12,18 5,24 7,14 0,9 9,9' fill='%236C5CE7'/></svg>") 12 12, auto`,
      heart: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' fill='%23E040FB'/></svg>") 12 12, auto`,
      pikachu: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'><circle cx='14' cy='14' r='12' fill='%23FFD700'/><circle cx='10' cy='11' r='2' fill='%23333'/><circle cx='18' cy='11' r='2' fill='%23333'/><circle cx='8' cy='15' r='3' fill='%23FF6B6B' opacity='0.5'/><circle cx='20' cy='15' r='3' fill='%23FF6B6B' opacity='0.5'/><path d='M11 16 Q14 19 17 16' stroke='%23333' fill='none' stroke-width='1.5'/></svg>") 14 14, auto`,
    };
    injectEffectStyle("customCursor", `
      *, *::before, *::after {
        cursor: ${cursors[shape] || cursors.crosshair} !important;
      }
    `);
  },
  deactivate() { removeEffectStyle("customCursor"); },
};

/* ═══ 17. Click Explosion ═══ */
export const clickExplosionEffect: ThemeEffect = {
  id: "clickExplosion",
  activate(p) {
    const emoji = p.emoji || "⚡";
    const onClick = (e: MouseEvent) => {
      for (let i = 0; i < 8; i++) {
        const el = document.createElement("span");
        const angle = (i / 8) * Math.PI * 2;
        const dist = 30 + Math.random() * 30;
        el.textContent = emoji;
        el.style.cssText = `
          position:fixed;left:${e.clientX}px;top:${e.clientY}px;
          font-size:16px;pointer-events:none;z-index:99999;
          transition:all 0.6s ease-out;transform:translate(-50%,-50%);opacity:1;
        `;
        document.body.appendChild(el);
        requestAnimationFrame(() => {
          el.style.left = `${e.clientX + Math.cos(angle) * dist}px`;
          el.style.top = `${e.clientY + Math.sin(angle) * dist}px`;
          el.style.opacity = "0";
          el.style.transform = "translate(-50%,-50%) scale(0.3)";
        });
        setTimeout(() => el.remove(), 600);
      }
    };
    document.addEventListener("click", onClick, true);
    (this as any)._onClick = onClick;
  },
  deactivate() {
    document.removeEventListener("click", (this as any)._onClick, true);
  },
} as any;

/* ═══ 18. Trail Emoji ═══ */
export const trailEmojiEffect: ThemeEffect = {
  id: "trailEmoji",
  activate(p) {
    const emoji = p.emoji || "✨";
    let lastTime = 0;
    const onMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastTime < 50) return;
      lastTime = now;
      const el = document.createElement("span");
      el.textContent = emoji;
      el.style.cssText = `
        position:fixed;left:${e.clientX}px;top:${e.clientY}px;
        font-size:14px;pointer-events:none;z-index:99999;
        opacity:1;transition:all 0.8s ease;transform:translate(-50%,-50%);
      `;
      document.body.appendChild(el);
      requestAnimationFrame(() => {
        el.style.opacity = "0";
        el.style.top = `${e.clientY - 20}px`;
        el.style.transform = "translate(-50%,-50%) scale(0.3) rotate(180deg)";
      });
      setTimeout(() => el.remove(), 800);
    };
    document.addEventListener("mousemove", onMove);
    (this as any)._onMove = onMove;
  },
  deactivate() {
    document.removeEventListener("mousemove", (this as any)._onMove);
  },
} as any;

export const uiEffects = [
  glowEffect, glassMorphismEffect, gradientBorderEffect,
  cardTiltEffect, softShadowEffect, drawBorderEffect,
  glitchTextEffect, rainbowTextEffect, textScrambleEffect,
  wavyTextEffect, neonTextEffect,
  rippleClickEffect, magneticButtonEffect,
  mouseTrailEffect, cursorGlowEffect, customCursorEffect,
  clickExplosionEffect, trailEmojiEffect,
];
