/* ── Animation / Transition / Visual Effects (12) ── */

import type { ThemeEffect } from "./types";
import { injectEffectStyle, removeEffectStyle, createEffectDiv, removeEffectDiv } from "./engine";

/* ════════════ Animation Effects (5) ════════════ */

/* ═══ 1. Typewriter Title ═══ */
export const typewriterTitleEffect: ThemeEffect = {
  id: "typewriterTitle",
  activate() {
    injectEffectStyle("typewriterTitle", `
      h1, .page-title {
        overflow: hidden !important;
        white-space: nowrap !important;
        border-right: 2px solid var(--primary, #6C5CE7) !important;
        width: 0 !important;
        animation: pkb-typewriter 2s steps(30) 0.5s forwards, pkb-blink-cursor 0.75s step-end infinite !important;
      }
      @keyframes pkb-typewriter {
        to { width: 100%; }
      }
      @keyframes pkb-blink-cursor {
        50% { border-color: transparent; }
      }
    `);
  },
  deactivate() { removeEffectStyle("typewriterTitle"); },
};

/* ═══ 2. Fade-in on Scroll ═══ */
export const fadeInScrollEffect: ThemeEffect = {
  id: "fadeInScroll",
  activate() {
    injectEffectStyle("fadeInScroll", `
      .card, [class*="card"], .section, [class*="section"] {
        opacity: 0 !important;
        transform: translateY(30px) !important;
        transition: opacity 0.6s ease, transform 0.6s ease !important;
      }
      .pkb-fade-visible {
        opacity: 1 !important;
        transform: translateY(0) !important;
      }
    `);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("pkb-fade-visible");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    const observe = () => {
      document.querySelectorAll(".card, [class*='card'], .section, [class*='section']").forEach((el) => {
        if (!el.classList.contains("pkb-fade-visible")) observer.observe(el);
      });
    };
    observe();

    // Re-observe on DOM changes
    const mutObs = new MutationObserver(observe);
    mutObs.observe(document.body, { childList: true, subtree: true });

    (this as any)._observer = observer;
    (this as any)._mutObs = mutObs;
  },
  deactivate() {
    (this as any)._observer?.disconnect();
    (this as any)._mutObs?.disconnect();
    removeEffectStyle("fadeInScroll");
    document.querySelectorAll(".pkb-fade-visible").forEach((el) => el.classList.remove("pkb-fade-visible"));
  },
} as any;

/* ═══ 3. Parallax Scroll ═══ */
export const parallaxScrollEffect: ThemeEffect = {
  id: "parallaxScroll",
  activate(p) {
    const intensity = p.intensity || 0.3;
    const container = document.getElementById("pikabuddy-effects-layer");
    if (container) {
      const onScroll = () => {
        const y = window.scrollY * intensity;
        container.style.transform = `translateY(${y}px)`;
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      (this as any)._onScroll = onScroll;
    }
  },
  deactivate() {
    window.removeEventListener("scroll", (this as any)._onScroll);
    const container = document.getElementById("pikabuddy-effects-layer");
    if (container) container.style.transform = "";
  },
} as any;

/* ═══ 4. Pulse Element ═══ */
export const pulseElementEffect: ThemeEffect = {
  id: "pulseElement",
  activate() {
    injectEffectStyle("pulseElement", `
      .notification-badge, [class*="badge"], .pulse-target {
        animation: pkb-pulse 2s ease-in-out infinite !important;
      }
      @keyframes pkb-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
    `);
  },
  deactivate() { removeEffectStyle("pulseElement"); },
};

/* ═══ 5. Count Up ═══ */
export const countUpEffect: ThemeEffect = {
  id: "countUp",
  activate() {
    const observed = new WeakSet<Element>();

    const animateNumber = (el: HTMLElement) => {
      if (observed.has(el)) return;
      const text = el.textContent?.replace(/,/g, "") || "";
      const target = parseInt(text);
      if (isNaN(target)) return;
      observed.add(el);

      const duration = 1000;
      const start = performance.now();
      const format = (n: number) => n.toLocaleString();

      const step = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        el.textContent = format(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) animateNumber(e.target as HTMLElement);
        });
      },
      { threshold: 0.5 }
    );

    const scan = () => {
      document.querySelectorAll("[data-countup], .stat-number, .xp-value").forEach((el) => {
        if (!observed.has(el)) observer.observe(el);
      });
    };
    scan();
    const mutObs = new MutationObserver(scan);
    mutObs.observe(document.body, { childList: true, subtree: true });

    (this as any)._observer = observer;
    (this as any)._mutObs = mutObs;
  },
  deactivate() {
    (this as any)._observer?.disconnect();
    (this as any)._mutObs?.disconnect();
  },
} as any;

/* ════════════ Transition Effects (3) ════════════ */

/* ═══ 6. Page Transition ═══ */
export const pageTransitionEffect: ThemeEffect = {
  id: "pageTransition",
  activate(p) {
    const type = p.type || "fade";
    const transitions: Record<string, string> = {
      fade: `
        .pkb-page-enter { opacity: 0; }
        .pkb-page-enter-active { opacity: 1; transition: opacity 0.3s ease; }
        .pkb-page-exit { opacity: 1; }
        .pkb-page-exit-active { opacity: 0; transition: opacity 0.3s ease; }
      `,
      slide: `
        .pkb-page-enter { transform: translateX(30px); opacity: 0; }
        .pkb-page-enter-active { transform: translateX(0); opacity: 1; transition: all 0.3s ease; }
        .pkb-page-exit { transform: translateX(0); opacity: 1; }
        .pkb-page-exit-active { transform: translateX(-30px); opacity: 0; transition: all 0.3s ease; }
      `,
      zoom: `
        .pkb-page-enter { transform: scale(0.95); opacity: 0; }
        .pkb-page-enter-active { transform: scale(1); opacity: 1; transition: all 0.3s ease; }
        .pkb-page-exit { transform: scale(1); opacity: 1; }
        .pkb-page-exit-active { transform: scale(1.05); opacity: 0; transition: all 0.3s ease; }
      `,
      flip: `
        .pkb-page-enter { transform: perspective(1200px) rotateY(-90deg); opacity: 0; }
        .pkb-page-enter-active { transform: perspective(1200px) rotateY(0); opacity: 1; transition: all 0.5s ease; }
        .pkb-page-exit { transform: perspective(1200px) rotateY(0); opacity: 1; }
        .pkb-page-exit-active { transform: perspective(1200px) rotateY(90deg); opacity: 0; transition: all 0.5s ease; }
      `,
    };

    // Apply enter animation to main content area on route change
    injectEffectStyle("pageTransition", `
      main, [role="main"], #root > div > div:last-child {
        animation: pkb-page-${type}-in 0.4s ease both;
      }
      @keyframes pkb-page-fade-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes pkb-page-slide-in { from { transform: translateX(20px); opacity: 0; } to { transform: none; opacity: 1; } }
      @keyframes pkb-page-zoom-in { from { transform: scale(0.96); opacity: 0; } to { transform: none; opacity: 1; } }
      @keyframes pkb-page-flip-in { from { transform: perspective(1200px) rotateY(-15deg); opacity: 0; } to { transform: none; opacity: 1; } }
      ${transitions[type] || transitions.fade}
    `);
  },
  deactivate() { removeEffectStyle("pageTransition"); },
};

/* ═══ 7. Card Flip ═══ */
export const cardFlipEffect: ThemeEffect = {
  id: "cardFlip",
  activate() {
    injectEffectStyle("cardFlip", `
      .pkb-flippable {
        perspective: 1000px;
        cursor: pointer;
      }
      .pkb-flippable-inner {
        transition: transform 0.6s;
        transform-style: preserve-3d;
      }
      .pkb-flippable.flipped .pkb-flippable-inner {
        transform: rotateY(180deg);
      }
      .pkb-flippable-front, .pkb-flippable-back {
        backface-visibility: hidden;
      }
      .pkb-flippable-back {
        transform: rotateY(180deg);
        position: absolute;
        inset: 0;
      }
    `);
  },
  deactivate() { removeEffectStyle("cardFlip"); },
};

/* ═══ 8. Skeleton Shimmer ═══ */
export const skeletonShimmerEffect: ThemeEffect = {
  id: "skeletonShimmer",
  activate(p) {
    const style = p.style || "wave";
    const styles: Record<string, string> = {
      wave: `
        .skeleton, [class*="skeleton"], [class*="loading-placeholder"] {
          background: linear-gradient(90deg,
            var(--surface-container-low, #f0f0f0) 25%,
            var(--surface-container-high, #e0e0e0) 50%,
            var(--surface-container-low, #f0f0f0) 75%
          ) !important;
          background-size: 200% 100% !important;
          animation: pkb-shimmer-wave 1.5s infinite !important;
        }
        @keyframes pkb-shimmer-wave { to { background-position: -200% 0; } }
      `,
      pulse: `
        .skeleton, [class*="skeleton"], [class*="loading-placeholder"] {
          animation: pkb-shimmer-pulse 1.5s ease-in-out infinite !important;
        }
        @keyframes pkb-shimmer-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `,
      gradient: `
        .skeleton, [class*="skeleton"], [class*="loading-placeholder"] {
          background: linear-gradient(90deg,
            #ff000020, #ff770020, #ffdd0020, #00ff0020, #0099ff20, #6633ff20
          ) !important;
          background-size: 300% 100% !important;
          animation: pkb-shimmer-gradient 2s linear infinite !important;
        }
        @keyframes pkb-shimmer-gradient { to { background-position: -300% 0; } }
      `,
    };
    injectEffectStyle("skeletonShimmer", styles[style] || styles.wave);
  },
  deactivate() { removeEffectStyle("skeletonShimmer"); },
};

/* ════════════ Visual Effects (4) ════════════ */

/* ═══ 9. Chromatic Aberration ═══ */
export const chromaticAberrationEffect: ThemeEffect = {
  id: "chromaticAberration",
  activate() {
    injectEffectStyle("chromaticAberration", `
      h1, h2, .page-title {
        position: relative !important;
        text-shadow:
          -1px 0 rgba(255, 0, 0, 0.15),
          1px 0 rgba(0, 0, 255, 0.15) !important;
      }
      img, .card-image, [class*="avatar"] {
        position: relative !important;
      }
      img::after, .card-image::after {
        content: "" !important;
        position: absolute !important;
        inset: 0 !important;
        background: linear-gradient(90deg, rgba(255,0,0,0.03), transparent, rgba(0,0,255,0.03)) !important;
        pointer-events: none !important;
      }
    `);
  },
  deactivate() { removeEffectStyle("chromaticAberration"); },
};

/* ═══ 10. Color Shift on Scroll ═══ */
export const colorShiftScrollEffect: ThemeEffect = {
  id: "colorShiftScroll",
  activate() {
    const onScroll = () => {
      const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight || 1);
      const hue = Math.round(scrollPercent * 60); // shift by up to 60deg
      document.documentElement.style.setProperty("--pkb-hue-shift", `${hue}deg`);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    (this as any)._onScroll = onScroll;

    injectEffectStyle("colorShiftScroll", `
      .card, [class*="card"], button[class*="primary"] {
        filter: hue-rotate(var(--pkb-hue-shift, 0deg));
        transition: filter 0.3s ease;
      }
    `);
  },
  deactivate() {
    window.removeEventListener("scroll", (this as any)._onScroll);
    document.documentElement.style.removeProperty("--pkb-hue-shift");
    removeEffectStyle("colorShiftScroll");
  },
} as any;

/* ═══ 11. Invert Hover ═══ */
export const invertHoverEffect: ThemeEffect = {
  id: "invertHover",
  activate() {
    injectEffectStyle("invertHover", `
      button:hover, .card:hover, [class*="card"]:hover {
        filter: invert(1) hue-rotate(180deg) !important;
        transition: filter 0.3s ease !important;
      }
    `);
  },
  deactivate() { removeEffectStyle("invertHover"); },
};

/* ═══ 12. Vignette Overlay ═══ */
export const vignetteOverlayEffect: ThemeEffect = {
  id: "vignetteOverlay",
  activate(p) {
    const intensity = p.intensity || 0.3;
    createEffectDiv("vignetteOverlay", `
      position:absolute;inset:0;
      box-shadow: inset 0 0 ${100 + intensity * 200}px ${intensity * 100}px rgba(0,0,0,${intensity});
      pointer-events:none;
    `);
  },
  deactivate() {
    removeEffectDiv("vignetteOverlay");
  },
};

export const animationEffects = [
  typewriterTitleEffect, fadeInScrollEffect, parallaxScrollEffect,
  pulseElementEffect, countUpEffect,
  pageTransitionEffect, cardFlipEffect, skeletonShimmerEffect,
  chromaticAberrationEffect, colorShiftScrollEffect,
  invertHoverEffect, vignetteOverlayEffect,
];
