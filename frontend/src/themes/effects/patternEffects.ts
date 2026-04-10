/* ── Pattern Effects (4) — CSS/SVG-based background patterns ── */

import type { ThemeEffect } from "./types";
import { createEffectDiv, removeEffectDiv } from "./engine";

/* ═══ 1. Dot Grid ═══ */
export const dotGridEffect: ThemeEffect = {
  id: "dotGrid",
  activate(p) {
    const color = p.color || "#888888";
    const spacing = p.spacing || 24;
    createEffectDiv("dotGrid", `
      position:absolute;inset:0;
      background-image: radial-gradient(${color}40 1px, transparent 1px);
      background-size: ${spacing}px ${spacing}px;
    `);
  },
  deactivate() {
    removeEffectDiv("dotGrid");
  },
};

/* ═══ 2. Noise Texture ═══ */
export const noiseTextureEffect: ThemeEffect = {
  id: "noiseTexture",
  activate(p) {
    const opacity = p.opacity || 0.05;
    // Create an SVG filter for noise
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="0" height="0">
        <filter id="pkb-noise-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
        </filter>
      </svg>
    `;
    const div = createEffectDiv("noiseTexture", `
      position:absolute;inset:0;
      opacity:${opacity};
      filter:url(#pkb-noise-filter);
      background:white;
    `);
    // Inject SVG
    const svgContainer = document.createElement("div");
    svgContainer.id = "pikabuddy-fx-noiseTexture-svg";
    svgContainer.style.cssText = "position:absolute;width:0;height:0;";
    svgContainer.innerHTML = svg;
    div.parentElement?.appendChild(svgContainer);
  },
  deactivate() {
    removeEffectDiv("noiseTexture");
    document.getElementById("pikabuddy-fx-noiseTexture-svg")?.remove();
  },
};

/* ═══ 3. Geometric Pattern ═══ */
export const geometricPatternEffect: ThemeEffect = {
  id: "geometricPattern",
  activate(p) {
    const shape = p.shape || "hexagon";
    let bgImage = "";

    switch (shape) {
      case "triangle":
        bgImage = `
          linear-gradient(60deg, transparent 35%, rgba(100,100,100,0.06) 35%, rgba(100,100,100,0.06) 36%, transparent 36%),
          linear-gradient(-60deg, transparent 35%, rgba(100,100,100,0.06) 35%, rgba(100,100,100,0.06) 36%, transparent 36%),
          linear-gradient(180deg, transparent 68%, rgba(100,100,100,0.06) 68%, rgba(100,100,100,0.06) 69%, transparent 69%)
        `;
        break;
      case "hexagon":
        bgImage = `
          linear-gradient(30deg, rgba(100,100,100,0.05) 12%, transparent 12.5%, transparent 87%, rgba(100,100,100,0.05) 87.5%),
          linear-gradient(150deg, rgba(100,100,100,0.05) 12%, transparent 12.5%, transparent 87%, rgba(100,100,100,0.05) 87.5%),
          linear-gradient(30deg, rgba(100,100,100,0.05) 12%, transparent 12.5%, transparent 87%, rgba(100,100,100,0.05) 87.5%),
          linear-gradient(150deg, rgba(100,100,100,0.05) 12%, transparent 12.5%, transparent 87%, rgba(100,100,100,0.05) 87.5%),
          linear-gradient(60deg, rgba(120,120,120,0.04) 25%, transparent 25.5%, transparent 75%, rgba(120,120,120,0.04) 75%),
          linear-gradient(60deg, rgba(120,120,120,0.04) 25%, transparent 25.5%, transparent 75%, rgba(120,120,120,0.04) 75%)
        `;
        break;
      case "diamond":
        bgImage = `
          linear-gradient(45deg, rgba(100,100,100,0.06) 25%, transparent 25%),
          linear-gradient(-45deg, rgba(100,100,100,0.06) 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, rgba(100,100,100,0.06) 75%),
          linear-gradient(-45deg, transparent 75%, rgba(100,100,100,0.06) 75%)
        `;
        break;
      case "circle":
        bgImage = `
          radial-gradient(circle at 50% 50%, transparent 45%, rgba(100,100,100,0.06) 45%, rgba(100,100,100,0.06) 47%, transparent 47%)
        `;
        break;
    }

    createEffectDiv("geometricPattern", `
      position:absolute;inset:0;
      background-image:${bgImage};
      background-size: 48px 48px;
    `);
  },
  deactivate() {
    removeEffectDiv("geometricPattern");
  },
};

/* ═══ 4. Mouse Gradient ═══ */
export const mouseGradientEffect: ThemeEffect = {
  id: "mouseGradient",
  activate(p) {
    const c1 = p.color1 || "#6C5CE7";
    const c2 = p.color2 || "#00cec9";
    const div = createEffectDiv("mouseGradient", `
      position:absolute;inset:0;
      background: radial-gradient(600px circle at 50% 50%, ${c1}15, ${c2}08, transparent 70%);
      transition: background 0.3s ease;
    `);

    let rafId = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        div.style.background =
          `radial-gradient(600px circle at ${e.clientX}px ${e.clientY}px, ${c1}18, ${c2}0a, transparent 70%)`;
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    (this as any)._onMove = onMove;
    (this as any)._rafId = rafId;
  },
  deactivate() {
    window.removeEventListener("mousemove", (this as any)._onMove);
    cancelAnimationFrame((this as any)._rafId);
    removeEffectDiv("mouseGradient");
  },
} as any;

export const patternEffects = [
  dotGridEffect,
  noiseTextureEffect,
  geometricPatternEffect,
  mouseGradientEffect,
];
