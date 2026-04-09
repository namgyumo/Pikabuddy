/* ── Background Effects (9) — Canvas/DOM-based ambient backgrounds ── */

import type { ThemeEffect } from "./types";
import { createEffectCanvas, removeEffectCanvas, createEffectDiv, removeEffectDiv } from "./engine";

/** Ensure hex color is always 7 chars (#RRGGBB) for safe alpha append */
function toFullHex(c: string): string {
  if (!c.startsWith("#")) return "#6C5CE7";
  if (c.length === 4) return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`;
  return c.slice(0, 7);
}

/* ═══ 1. Particles ═══ */
export const particlesEffect: ThemeEffect = {
  id: "particles",
  _raf: 0,
  activate(p) {
    const color = toFullHex(p.color || "#6C5CE7");
    const count = p.count || 30;
    const canvas = createEffectCanvas("particles");
    const ctx = canvas.getContext("2d")!;
    const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = [];
    const W = () => canvas.width;
    const H = () => canvas.height;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * W(), y: Math.random() * H(),
        vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 3 + 1, a: Math.random() * 0.5 + 0.1,
      });
    }

    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener("resize", onResize);
    (this as any)._onResize = onResize;

    const draw = () => {
      ctx.clearRect(0, 0, W(), H());
      for (const pt of particles) {
        pt.x += pt.vx; pt.y += pt.vy;
        if (pt.x < 0) pt.x = W(); if (pt.x > W()) pt.x = 0;
        if (pt.y < 0) pt.y = H(); if (pt.y > H()) pt.y = 0;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fillStyle = color + Math.round(pt.a * 255).toString(16).padStart(2, "0");
        ctx.fill();
      }
      (this as any)._raf = requestAnimationFrame(draw);
    };
    draw();
  },
  deactivate() {
    cancelAnimationFrame((this as any)._raf);
    window.removeEventListener("resize", (this as any)._onResize);
    removeEffectCanvas("particles");
  },
} as any;

/* ═══ 2. Starfield ═══ */
export const starfieldEffect: ThemeEffect = {
  id: "starfield",
  activate(p) {
    const speed = p.speed || 1;
    const density = p.density || 100;
    const canvas = createEffectCanvas("starfield");
    const ctx = canvas.getContext("2d")!;
    const stars: { x: number; y: number; z: number; px: number; py: number }[] = [];
    const W = () => canvas.width;
    const H = () => canvas.height;

    for (let i = 0; i < density; i++) {
      stars.push({ x: (Math.random() - 0.5) * W(), y: (Math.random() - 0.5) * H(), z: Math.random() * W(), px: 0, py: 0 });
    }

    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener("resize", onResize);
    (this as any)._onResize = onResize;

    const draw = () => {
      ctx.clearRect(0, 0, W(), H());
      const cx = W() / 2, cy = H() / 2;
      for (const s of stars) {
        s.z -= speed * 2;
        if (s.z <= 0) { s.z = W(); s.x = (Math.random() - 0.5) * W(); s.y = (Math.random() - 0.5) * H(); s.px = 0; s.py = 0; }
        const sx = (s.x / s.z) * W() + cx;
        const sy = (s.y / s.z) * H() + cy;
        const r = Math.max(0.3, (1 - s.z / W()) * 2.5);
        const a = Math.max(0, 1 - s.z / W());
        // Draw trail line from previous position
        if (s.px && s.py) {
          ctx.beginPath();
          ctx.moveTo(s.px, s.py);
          ctx.lineTo(sx, sy);
          ctx.strokeStyle = `rgba(200,200,255,${a * 0.3})`;
          ctx.lineWidth = r * 0.5;
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,220,255,${a})`;
        ctx.fill();
        s.px = sx; s.py = sy;
      }
      (this as any)._raf = requestAnimationFrame(draw);
    };
    draw();
  },
  deactivate() {
    cancelAnimationFrame((this as any)._raf);
    window.removeEventListener("resize", (this as any)._onResize);
    removeEffectCanvas("starfield");
  },
} as any;

/* ═══ 3. Aurora ═══ */
export const auroraEffect: ThemeEffect = {
  id: "aurora",
  activate(p) {
    const colors = [toFullHex(p.color1 || "#00ff87"), toFullHex(p.color2 || "#60efff"), toFullHex(p.color3 || "#ff00e5")];
    const canvas = createEffectCanvas("aurora");
    const ctx = canvas.getContext("2d")!;
    let t = 0;
    const W = () => canvas.width;
    const H = () => canvas.height;

    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener("resize", onResize);
    (this as any)._onResize = onResize;

    const draw = () => {
      ctx.clearRect(0, 0, W(), H());
      t += 0.005;
      for (let i = 0; i < colors.length; i++) {
        ctx.beginPath();
        ctx.moveTo(0, H() * 0.3);
        for (let x = 0; x <= W(); x += 4) {
          const y = H() * 0.15 + Math.sin(x * 0.003 + t + i * 2) * H() * 0.08
            + Math.sin(x * 0.007 + t * 1.5 + i) * H() * 0.04;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W(), 0);
        ctx.lineTo(0, 0);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, 0, W(), 0);
        grad.addColorStop(0, colors[i] + "00");
        grad.addColorStop(0.3, colors[i] + "30");
        grad.addColorStop(0.5, colors[i] + "50");
        grad.addColorStop(0.7, colors[i] + "30");
        grad.addColorStop(1, colors[i] + "00");
        ctx.fillStyle = grad;
        ctx.fill();
      }
      (this as any)._raf = requestAnimationFrame(draw);
    };
    draw();
  },
  deactivate() {
    cancelAnimationFrame((this as any)._raf);
    window.removeEventListener("resize", (this as any)._onResize);
    removeEffectCanvas("aurora");
  },
} as any;

/* ═══ 4. Matrix Rain ═══ */
export const matrixRainEffect: ThemeEffect = {
  id: "matrixRain",
  activate(p) {
    const color = toFullHex(p.color || "#00ff00");
    const canvas = createEffectCanvas("matrixRain");
    const ctx = canvas.getContext("2d")!;
    const fontSize = 14;
    const chars = "01アイウエオカキクケコサシスセソABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let columns: number[];
    // Track character fade for each column position
    let grid: { ch: string; age: number }[][] = [];
    const W = () => canvas.width;
    const H = () => canvas.height;
    const maxAge = 20;

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const cols = Math.ceil(W() / fontSize);
      const rows = Math.ceil(H() / fontSize);
      columns = Array(cols).fill(0).map(() => Math.random() * rows | 0);
      grid = Array(cols).fill(null).map(() => Array(rows).fill(null).map(() => ({ ch: "", age: maxAge })));
    };
    init();
    window.addEventListener("resize", init);
    (this as any)._onResize = init;

    const draw = () => {
      ctx.clearRect(0, 0, W(), H());
      ctx.font = `${fontSize}px monospace`;
      const cols = Math.ceil(W() / fontSize);
      const rows = Math.ceil(H() / fontSize);

      for (let i = 0; i < cols; i++) {
        // Place new character at head
        const row = columns[i];
        if (row < rows && grid[i]) {
          grid[i][row] = { ch: chars[Math.random() * chars.length | 0], age: 0 };
        }
        // Draw all alive characters
        if (grid[i]) {
          for (let r = 0; r < rows; r++) {
            const cell = grid[i][r];
            if (cell.age < maxAge && cell.ch) {
              const alpha = Math.max(0, 1 - cell.age / maxAge);
              const brightness = cell.age === 0 ? 1 : alpha * 0.7;
              ctx.fillStyle = cell.age === 0 ? "#fff" : color + Math.round(brightness * 255).toString(16).padStart(2, "0");
              ctx.fillText(cell.ch, i * fontSize, r * fontSize);
              cell.age++;
            }
          }
        }
        if (columns[i] * fontSize > H() && Math.random() > 0.975) columns[i] = 0;
        columns[i]++;
      }
      (this as any)._raf = requestAnimationFrame(draw);
    };
    draw();
  },
  deactivate() {
    cancelAnimationFrame((this as any)._raf);
    window.removeEventListener("resize", (this as any)._onResize);
    removeEffectCanvas("matrixRain");
  },
} as any;

/* ═══ 5. Bubbles ═══ */
export const bubblesEffect: ThemeEffect = {
  id: "bubbles",
  activate(p) {
    const color = toFullHex(p.color || "#6C5CE7");
    const count = p.count || 20;
    const canvas = createEffectCanvas("bubbles");
    const ctx = canvas.getContext("2d")!;
    const W = () => canvas.width;
    const H = () => canvas.height;

    const bubbles: { x: number; y: number; r: number; speed: number; wobble: number; wobbleSpeed: number }[] = [];
    for (let i = 0; i < count; i++) {
      bubbles.push({
        x: Math.random() * W(), y: H() + Math.random() * H(),
        r: Math.random() * 15 + 5, speed: Math.random() * 0.8 + 0.2,
        wobble: Math.random() * Math.PI * 2, wobbleSpeed: Math.random() * 0.02 + 0.01,
      });
    }

    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener("resize", onResize);
    (this as any)._onResize = onResize;

    const draw = () => {
      ctx.clearRect(0, 0, W(), H());
      for (const b of bubbles) {
        b.y -= b.speed;
        b.wobble += b.wobbleSpeed;
        const wx = Math.sin(b.wobble) * 20;
        if (b.y + b.r < 0) { b.y = H() + b.r; b.x = Math.random() * W(); }
        ctx.beginPath();
        ctx.arc(b.x + wx, b.y, b.r, 0, Math.PI * 2);
        ctx.strokeStyle = color + "60";
        ctx.lineWidth = 1;
        ctx.stroke();
        // highlight
        ctx.beginPath();
        ctx.arc(b.x + wx - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fill();
      }
      (this as any)._raf = requestAnimationFrame(draw);
    };
    draw();
  },
  deactivate() {
    cancelAnimationFrame((this as any)._raf);
    window.removeEventListener("resize", (this as any)._onResize);
    removeEffectCanvas("bubbles");
  },
} as any;

/* ═══ 6. Cherry Blossom ═══ */
export const cherryBlossomEffect: ThemeEffect = {
  id: "cherryBlossom",
  activate() {
    const container = createEffectDiv("cherryBlossom", "position:absolute;inset:0;overflow:hidden;");
    const petals: HTMLDivElement[] = [];
    const count = 25;

    for (let i = 0; i < count; i++) {
      const petal = document.createElement("div");
      const size = Math.random() * 10 + 6;
      const startX = Math.random() * 100;
      const duration = Math.random() * 6 + 6;
      const delay = Math.random() * 8;
      petal.style.cssText = `
        position:absolute; top:-20px; left:${startX}%;
        width:${size}px; height:${size * 0.7}px;
        background:radial-gradient(ellipse, #ffb7c5 0%, #ff8fab 60%, transparent 100%);
        border-radius:50% 0 50% 0; opacity:0.7;
        animation: pkb-fall-petal ${duration}s ${delay}s linear infinite;
      `;
      container.appendChild(petal);
      petals.push(petal);
    }

    // Inject keyframes
    let style = document.getElementById("pikabuddy-fxcss-cherryBlossom") as HTMLStyleElement;
    if (!style) {
      style = document.createElement("style");
      style.id = "pikabuddy-fxcss-cherryBlossom";
      document.head.appendChild(style);
    }
    style.textContent = `
      @keyframes pkb-fall-petal {
        0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
        10% { opacity: 0.7; }
        90% { opacity: 0.7; }
        100% { transform: translateY(${window.innerHeight + 40}px) translateX(${60}px) rotate(360deg); opacity: 0; }
      }
    `;
  },
  deactivate() {
    removeEffectDiv("cherryBlossom");
    document.getElementById("pikabuddy-fxcss-cherryBlossom")?.remove();
  },
};

/* ═══ 7. Autumn Leaves ═══ */
export const autumnLeavesEffect: ThemeEffect = {
  id: "autumnLeaves",
  activate() {
    const container = createEffectDiv("autumnLeaves", "position:absolute;inset:0;overflow:hidden;");
    const leafColors = ["#D2691E", "#CD853F", "#B22222", "#DAA520", "#8B4513"];
    const count = 20;

    for (let i = 0; i < count; i++) {
      const leaf = document.createElement("div");
      const size = Math.random() * 14 + 8;
      const color = leafColors[Math.random() * leafColors.length | 0];
      const startX = Math.random() * 100;
      const duration = Math.random() * 8 + 6;
      const delay = Math.random() * 10;
      leaf.style.cssText = `
        position:absolute; top:-30px; left:${startX}%;
        width:${size}px; height:${size * 1.2}px; opacity:0.8;
        background: ${color};
        clip-path: polygon(50% 0%, 80% 30%, 100% 50%, 80% 80%, 50% 100%, 20% 80%, 0% 50%, 20% 30%);
        animation: pkb-fall-leaf ${duration}s ${delay}s linear infinite;
      `;
      container.appendChild(leaf);
    }

    let style = document.getElementById("pikabuddy-fxcss-autumnLeaves") as HTMLStyleElement;
    if (!style) {
      style = document.createElement("style");
      style.id = "pikabuddy-fxcss-autumnLeaves";
      document.head.appendChild(style);
    }
    style.textContent = `
      @keyframes pkb-fall-leaf {
        0% { transform: translateY(0) translateX(0) rotate(0deg) scale(1); opacity: 0; }
        10% { opacity: 0.8; }
        50% { transform: translateY(${window.innerHeight / 2}px) translateX(80px) rotate(180deg) scale(0.9); }
        90% { opacity: 0.6; }
        100% { transform: translateY(${window.innerHeight + 40}px) translateX(-30px) rotate(400deg) scale(0.7); opacity: 0; }
      }
    `;
  },
  deactivate() {
    removeEffectDiv("autumnLeaves");
    document.getElementById("pikabuddy-fxcss-autumnLeaves")?.remove();
  },
};

/* ═══ 8. Lightning ═══ */
export const lightningEffect: ThemeEffect = {
  id: "lightning",
  activate(p) {
    const freq = (p.frequency || 5) * 1000;
    const flash = createEffectDiv("lightning",
      "position:absolute;inset:0;background:rgba(255,255,255,0);transition:background 0.05s;pointer-events:none;");

    const strike = () => {
      flash.style.background = `rgba(255,255,255,${0.35 + Math.random() * 0.25})`;
      setTimeout(() => { flash.style.background = "rgba(255,255,255,0)"; }, 80);
      setTimeout(() => {
        if (Math.random() > 0.4) {
          flash.style.background = `rgba(255,255,255,${0.15 + Math.random() * 0.2})`;
          setTimeout(() => { flash.style.background = "rgba(255,255,255,0)"; }, 50);
        }
      }, 150);
    };

    const loop = () => {
      strike();
      (this as any)._timer = setTimeout(loop, freq + (Math.random() - 0.5) * freq * 0.6);
    };
    // First strike after a short delay so it's immediately visible
    (this as any)._timer = setTimeout(loop, 500);
  },
  deactivate() {
    clearTimeout((this as any)._timer);
    removeEffectDiv("lightning");
  },
} as any;

/* ═══ 9. Fog / Mist ═══ */
export const fogMistEffect: ThemeEffect = {
  id: "fogMist",
  activate(p) {
    const density = p.density || 0.5;
    const container = createEffectDiv("fogMist", "position:absolute;inset:0;overflow:hidden;");

    for (let i = 0; i < 3; i++) {
      const fog = document.createElement("div");
      const dur = 20 + i * 8;
      const op = density * (0.15 + i * 0.05);
      fog.style.cssText = `
        position:absolute;
        bottom:${-10 + i * 5}%;
        left:-20%; width:140%; height:40%;
        background: radial-gradient(ellipse at center, rgba(255,255,255,${op}) 0%, transparent 70%);
        animation: pkb-fog-drift-${i} ${dur}s ease-in-out infinite;
      `;
      container.appendChild(fog);
    }

    let style = document.getElementById("pikabuddy-fxcss-fogMist") as HTMLStyleElement;
    if (!style) {
      style = document.createElement("style");
      style.id = "pikabuddy-fxcss-fogMist";
      document.head.appendChild(style);
    }
    style.textContent = `
      @keyframes pkb-fog-drift-0 {
        0%, 100% { transform: translateX(0); }
        50% { transform: translateX(8%); }
      }
      @keyframes pkb-fog-drift-1 {
        0%, 100% { transform: translateX(0); }
        50% { transform: translateX(-6%); }
      }
      @keyframes pkb-fog-drift-2 {
        0%, 100% { transform: translateX(0) translateY(0); }
        50% { transform: translateX(5%) translateY(-3%); }
      }
    `;
  },
  deactivate() {
    removeEffectDiv("fogMist");
    document.getElementById("pikabuddy-fxcss-fogMist")?.remove();
  },
};

export const backgroundEffects = [
  particlesEffect,
  starfieldEffect,
  auroraEffect,
  matrixRainEffect,
  bubblesEffect,
  cherryBlossomEffect,
  autumnLeavesEffect,
  lightningEffect,
  fogMistEffect,
];
