/* ── Premium Custom Theme Presets ──
 * Each preset showcases the full power of PikaBuddy's 5-layer theme engine:
 *   1. GUI variables  — 47 CSS variables (colors, radius, fonts, shadows, borders)
 *   2. Custom CSS      — injected CSS for fine-grained card/heading/button styling
 *   3. Animation       — preset animation (particles, snow, sparkle, gradient, rain)
 *   4. Effects (layer) — ambient visual effects with z-index priority ordering
 *   5. Triggers        — event-driven effects (onCorrect, onWrong, onLevelUp, etc.)
 */

import type { CustomTheme } from "./index";

type PresetTheme = Omit<CustomTheme, "id">;

export const PRESET_THEMES: PresetTheme[] = [
  /* ═══════════════════════════════════════════════════════════
   * 1. Neon Galaxy (네온 갤럭시)
   *    Dark space theme with neon purple/cyan accents
   * ═══════════════════════════════════════════════════════════ */
  {
    name: "Neon Galaxy",
    version: 1,
    preview: ["#A855F7", "#0B0E1A", "#00E5FF", "#E0E0FF"],
    variables: {
      "--primary": "#A855F7",
      "--primary-light": "#2D1B69",
      "--primary-container": "#7C3AED",
      "--primary-hover": "#9333EA",
      "--primary-fixed": "#1E1045",
      "--secondary": "#6366F1",
      "--secondary-light": "#1E1B4B",
      "--tertiary": "#00E5FF",
      "--tertiary-light": "#0C2D33",
      "--tertiary-container": "rgba(0, 229, 255, 0.08)",
      "--on-tertiary-container": "#00BCD4",
      "--success": "#4ADE80",
      "--success-light": "#0A2618",
      "--warning": "#FBBF24",
      "--warning-light": "#2A1F0A",
      "--error": "#F87171",
      "--error-light": "#2D0F0F",
      "--surface": "#0B0E1A",
      "--surface-container-lowest": "#060812",
      "--surface-container-low": "#0F1225",
      "--surface-container": "#151830",
      "--surface-container-high": "#1C1F3B",
      "--surface-container-highest": "#0B0E1A",
      "--on-surface": "#E0E0FF",
      "--on-surface-variant": "#9B9ECF",
      "--outline-variant": "rgba(155, 158, 207, 0.15)",
      "--editor-bg": "#06080F",
      "--shadow-sm": "0 2px 8px rgba(168, 85, 247, 0.15)",
      "--shadow": "0 4px 20px rgba(168, 85, 247, 0.2)",
      "--shadow-lg": "0 8px 40px rgba(168, 85, 247, 0.25)",
      "--shadow-ai": "0 4px 24px rgba(0, 229, 255, 0.2)",
      "--shadow-primary": "0 4px 20px rgba(168, 85, 247, 0.3)",
      "--shadow-float": "0 8px 40px rgba(168, 85, 247, 0.15), 0 2px 8px rgba(0, 229, 255, 0.1)",
      "--radius-sm": "6px",
      "--radius-md": "10px",
      "--radius-lg": "14px",
      "--radius-xl": "20px",
      "--radius-full": "9999px",
      "--font-display": "'Fira Code', monospace",
      "--font-body": "'Pretendard Variable', Pretendard, sans-serif",
      "--border-card": "1px",
      "--border-card-color": "rgba(168, 85, 247, 0.25)",
      "--border-inner": "1px",
      "--border-inner-color": "rgba(99, 102, 241, 0.15)",
      "--border-text": "0px",
      "--border-text-color": "transparent",
    },
    customCSS: `
/* Neon Galaxy — glowing card borders & neon heading accents */
.card, .assignment-card, .note-card {
  background: linear-gradient(135deg, rgba(168,85,247,0.05), rgba(0,229,255,0.03)) !important;
  backdrop-filter: blur(8px);
}
.card:hover, .assignment-card:hover, .note-card:hover {
  box-shadow: 0 0 20px rgba(168,85,247,0.3), 0 0 40px rgba(0,229,255,0.1) !important;
}
h1, h2, h3, .page-title {
  text-shadow: 0 0 8px rgba(168,85,247,0.3);
}
.btn-primary, button[class*="primary"] {
  box-shadow: 0 0 15px rgba(168,85,247,0.4), inset 0 1px 0 rgba(255,255,255,0.1);
}
::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #A855F7, #6366F1) !important;
}
`,
    animation: "gradient",
    effects: {
      starfield: { enabled: true, params: { speed: 0.5, density: 80 }, layer: 0 },
      aurora: { enabled: true, params: { color1: "#A855F7", color2: "#6366F1", color3: "#00E5FF" }, layer: 1 },
      gradientBorder: { enabled: true, params: { color1: "#A855F7", color2: "#00E5FF" }, layer: 2 },
    },
    triggers: {
      onCorrect: ["confetti", "correctBounce"],
      onWrong: ["wrongShake"],
      onLevelUp: ["levelUpCelebration", "confetti"],
      onBadge: ["badgeUnlock"],
    },
  },

  /* ═══════════════════════════════════════════════════════════
   * 2. Ocean Deep (깊은 바다)
   *    Deep marine blue with glass morphism
   * ═══════════════════════════════════════════════════════════ */
  {
    name: "Ocean Deep",
    version: 1,
    preview: ["#0EA5E9", "#0A1929", "#06B6D4", "#CBD5E1"],
    variables: {
      "--primary": "#0EA5E9",
      "--primary-light": "#0C2D4A",
      "--primary-container": "#0284C7",
      "--primary-hover": "#0369A1",
      "--primary-fixed": "#082240",
      "--secondary": "#0891B2",
      "--secondary-light": "#0C2A33",
      "--tertiary": "#06B6D4",
      "--tertiary-light": "#0A2E38",
      "--tertiary-container": "rgba(6, 182, 212, 0.08)",
      "--on-tertiary-container": "#22D3EE",
      "--success": "#34D399",
      "--success-light": "#0A2E20",
      "--warning": "#FBBF24",
      "--warning-light": "#2A1F0A",
      "--error": "#FB7185",
      "--error-light": "#2D1015",
      "--surface": "#0A1929",
      "--surface-container-lowest": "#060F1E",
      "--surface-container-low": "#0E2137",
      "--surface-container": "#122A44",
      "--surface-container-high": "#183350",
      "--surface-container-highest": "#0A1929",
      "--on-surface": "#CBD5E1",
      "--on-surface-variant": "#7DA2C4",
      "--outline-variant": "rgba(125, 162, 196, 0.15)",
      "--editor-bg": "#050D18",
      "--shadow-sm": "0 2px 10px rgba(14, 165, 233, 0.1)",
      "--shadow": "0 4px 24px rgba(14, 165, 233, 0.12)",
      "--shadow-lg": "0 8px 48px rgba(14, 165, 233, 0.15)",
      "--shadow-ai": "0 4px 24px rgba(6, 182, 212, 0.15)",
      "--shadow-primary": "0 4px 20px rgba(14, 165, 233, 0.2)",
      "--shadow-float": "0 12px 40px rgba(14, 165, 233, 0.12), 0 2px 8px rgba(6, 182, 212, 0.06)",
      "--radius-sm": "8px",
      "--radius-md": "12px",
      "--radius-lg": "18px",
      "--radius-xl": "24px",
      "--radius-full": "9999px",
      "--font-display": "'Pretendard Variable', Pretendard, sans-serif",
      "--font-body": "'Pretendard Variable', Pretendard, sans-serif",
      "--border-card": "1px",
      "--border-card-color": "rgba(14, 165, 233, 0.15)",
      "--border-inner": "0px",
      "--border-inner-color": "transparent",
      "--border-text": "0px",
      "--border-text-color": "transparent",
    },
    customCSS: `
/* Ocean Deep — frosted glass cards with water-like effects */
.card, .assignment-card, .note-card {
  background: rgba(14, 33, 55, 0.6) !important;
  backdrop-filter: blur(16px) saturate(1.4);
  border: 1px solid rgba(14, 165, 233, 0.1) !important;
}
.card:hover, .assignment-card:hover {
  border-color: rgba(14, 165, 233, 0.3) !important;
  transform: translateY(-2px);
  transition: all 0.3s ease;
}
.sidebar, .nav, [class*="sidebar"] {
  background: rgba(6, 15, 30, 0.8) !important;
  backdrop-filter: blur(20px);
}
.btn-primary, button[class*="primary"] {
  background: linear-gradient(135deg, #0EA5E9, #06B6D4) !important;
}
::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #0EA5E9, #0891B2) !important;
  border-radius: 10px;
}
`,
    animation: "particles",
    effects: {
      bubbles: { enabled: true, params: { color: "#0EA5E9", count: 15 }, layer: 0 },
      glassMorphism: { enabled: true, params: { blur: 12, opacity: 0.12 }, layer: 2 },
      fogMist: { enabled: true, params: { color: "#0EA5E9", density: 0.4 }, layer: 1 },
    },
    triggers: {
      onCorrect: ["rippleClick", "correctBounce"],
      onWrong: ["wrongShake"],
      onLevelUp: ["levelUpCelebration"],
      onCombo: ["comboCounter"],
    },
  },

  /* ═══════════════════════════════════════════════════════════
   * 3. Cherry Blossom Garden (벚꽃 정원)
   *    Soft sakura pink with petal shower
   * ═══════════════════════════════════════════════════════════ */
  {
    name: "Cherry Blossom",
    version: 1,
    preview: ["#EC4899", "#FFF5F8", "#F472B6", "#4A1D2E"],
    variables: {
      "--primary": "#EC4899",
      "--primary-light": "#FDE8F0",
      "--primary-container": "#F472B6",
      "--primary-hover": "#DB2777",
      "--primary-fixed": "#FCE7F3",
      "--secondary": "#A855F7",
      "--secondary-light": "#F3E8FF",
      "--tertiary": "#F59E0B",
      "--tertiary-light": "#FEF3C7",
      "--tertiary-container": "rgba(245, 158, 11, 0.08)",
      "--on-tertiary-container": "#D97706",
      "--success": "#34D399",
      "--success-light": "#ECFDF5",
      "--warning": "#FBBF24",
      "--warning-light": "#FFFBEB",
      "--error": "#F87171",
      "--error-light": "#FEF2F2",
      "--surface": "#FFF5F8",
      "--surface-container-lowest": "#FFFFFF",
      "--surface-container-low": "#FFF0F5",
      "--surface-container": "#FFE4ED",
      "--surface-container-high": "#FFD6E4",
      "--surface-container-highest": "#FFFFFF",
      "--on-surface": "#4A1D2E",
      "--on-surface-variant": "#8B4563",
      "--outline-variant": "rgba(139, 69, 99, 0.12)",
      "--editor-bg": "#1A0A12",
      "--shadow-sm": "0 2px 8px rgba(236, 72, 153, 0.08)",
      "--shadow": "0 4px 16px rgba(236, 72, 153, 0.1)",
      "--shadow-lg": "0 8px 32px rgba(236, 72, 153, 0.12)",
      "--shadow-ai": "0 4px 20px rgba(168, 85, 247, 0.1)",
      "--shadow-primary": "0 4px 16px rgba(236, 72, 153, 0.15)",
      "--shadow-float": "0 8px 30px rgba(236, 72, 153, 0.08), 0 2px 8px rgba(236, 72, 153, 0.04)",
      "--radius-sm": "10px",
      "--radius-md": "16px",
      "--radius-lg": "22px",
      "--radius-xl": "28px",
      "--radius-full": "9999px",
      "--font-display": "'Nanum Myeongjo', serif",
      "--font-body": "'Noto Sans KR', sans-serif",
      "--border-card": "1px",
      "--border-card-color": "rgba(236, 72, 153, 0.15)",
      "--border-inner": "1px",
      "--border-inner-color": "rgba(236, 72, 153, 0.08)",
      "--border-text": "0px",
      "--border-text-color": "transparent",
    },
    customCSS: `
/* Cherry Blossom — soft, rounded aesthetic with petal accents */
.card, .assignment-card, .note-card {
  background: linear-gradient(145deg, #FFFFFF, #FFF0F5) !important;
  border-radius: 20px !important;
}
.card:hover, .assignment-card:hover {
  box-shadow: 0 8px 30px rgba(236, 72, 153, 0.15) !important;
  transform: translateY(-3px);
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}
h1, h2, .page-title {
  background: linear-gradient(135deg, #EC4899, #A855F7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.btn-primary, button[class*="primary"] {
  background: linear-gradient(135deg, #EC4899, #F472B6) !important;
  border-radius: 14px !important;
}
::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #EC4899, #F9A8D4) !important;
  border-radius: 10px;
}
`,
    animation: "sparkle",
    effects: {
      cherryBlossom: { enabled: true, params: {}, layer: 0 },
      softShadow: { enabled: true, params: { depth: 3 }, layer: 2 },
      fadeInScroll: { enabled: true, params: {}, layer: 1 },
    },
    triggers: {
      onCorrect: ["confetti", "correctBounce"],
      onWrong: ["wrongShake"],
      onLevelUp: ["levelUpCelebration"],
      onStreak: ["streakFire"],
    },
  },

  /* ═══════════════════════════════════════════════════════════
   * 4. Matrix Terminal (매트릭스 터미널)
   *    Black/green hacker theme with code rain
   * ═══════════════════════════════════════════════════════════ */
  {
    name: "Matrix Terminal",
    version: 1,
    preview: ["#22C55E", "#030A01", "#4ADE80", "#86EFAC"],
    variables: {
      "--primary": "#22C55E",
      "--primary-light": "#0A2614",
      "--primary-container": "#16A34A",
      "--primary-hover": "#15803D",
      "--primary-fixed": "#052E16",
      "--secondary": "#4ADE80",
      "--secondary-light": "#0D3320",
      "--tertiary": "#A3E635",
      "--tertiary-light": "#1A2E0A",
      "--tertiary-container": "rgba(163, 230, 53, 0.08)",
      "--on-tertiary-container": "#84CC16",
      "--success": "#4ADE80",
      "--success-light": "#052E16",
      "--warning": "#FACC15",
      "--warning-light": "#2D2A05",
      "--error": "#EF4444",
      "--error-light": "#2D0F0F",
      "--surface": "#030A01",
      "--surface-container-lowest": "#010500",
      "--surface-container-low": "#051205",
      "--surface-container": "#081A08",
      "--surface-container-high": "#0C220B",
      "--surface-container-highest": "#030A01",
      "--on-surface": "#86EFAC",
      "--on-surface-variant": "#4ADE80",
      "--outline-variant": "rgba(74, 222, 128, 0.1)",
      "--editor-bg": "#000000",
      "--shadow-sm": "0 2px 8px rgba(34, 197, 94, 0.1)",
      "--shadow": "0 0 20px rgba(34, 197, 94, 0.08)",
      "--shadow-lg": "0 0 40px rgba(34, 197, 94, 0.1)",
      "--shadow-ai": "0 0 24px rgba(163, 230, 53, 0.12)",
      "--shadow-primary": "0 0 20px rgba(34, 197, 94, 0.2)",
      "--shadow-float": "0 0 40px rgba(34, 197, 94, 0.08), 0 0 10px rgba(34, 197, 94, 0.04)",
      "--radius-sm": "2px",
      "--radius-md": "4px",
      "--radius-lg": "6px",
      "--radius-xl": "8px",
      "--radius-full": "9999px",
      "--font-display": "'Fira Code', monospace",
      "--font-body": "'Fira Code', monospace",
      "--border-card": "1px",
      "--border-card-color": "rgba(34, 197, 94, 0.2)",
      "--border-inner": "1px",
      "--border-inner-color": "rgba(34, 197, 94, 0.1)",
      "--border-text": "0px",
      "--border-text-color": "transparent",
    },
    customCSS: `
/* Matrix Terminal — monospace everywhere, terminal green glow */
* { font-family: 'Fira Code', 'Consolas', monospace !important; }
.card, .assignment-card, .note-card {
  border: 1px solid rgba(34, 197, 94, 0.2) !important;
  background: rgba(5, 18, 5, 0.9) !important;
}
.card:hover, .assignment-card:hover {
  border-color: rgba(34, 197, 94, 0.5) !important;
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.15), inset 0 0 20px rgba(34, 197, 94, 0.03) !important;
}
h1, h2, h3, .page-title {
  text-shadow: 0 0 6px rgba(34, 197, 94, 0.4), 0 0 12px rgba(34, 197, 94, 0.15);
  letter-spacing: 1px;
}
.btn-primary, button[class*="primary"] {
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 0 10px rgba(34, 197, 94, 0.3);
}
::-webkit-scrollbar-thumb { background: #22C55E !important; }
::-webkit-scrollbar-track { background: #030A01 !important; }
::selection { background: rgba(34, 197, 94, 0.3); color: #86EFAC; }
`,
    animation: "none",
    effects: {
      matrixRain: { enabled: true, params: { color: "#22C55E" }, layer: 0 },
      typewriterTitle: { enabled: true, params: {}, layer: 1 },
      cursorGlow: { enabled: true, params: { color: "#22C55E", size: 120 }, layer: 2 },
    },
    triggers: {
      onCorrect: ["correctBounce", "xpGain"],
      onWrong: ["wrongShake"],
      onLevelUp: ["levelUpCelebration"],
      onCombo: ["comboCounter"],
    },
  },

  /* ═══════════════════════════════════════════════════════════
   * 5. Sunset Warmth (선셋 카페)
   *    Warm amber tones with floating golden particles
   * ═══════════════════════════════════════════════════════════ */
  {
    name: "Sunset Warmth",
    version: 1,
    preview: ["#EA580C", "#FFFAF5", "#F59E0B", "#431407"],
    variables: {
      "--primary": "#EA580C",
      "--primary-light": "#FFF1E6",
      "--primary-container": "#F97316",
      "--primary-hover": "#C2410C",
      "--primary-fixed": "#FFEDD5",
      "--secondary": "#D97706",
      "--secondary-light": "#FEF3C7",
      "--tertiary": "#DC2626",
      "--tertiary-light": "#FEE2E2",
      "--tertiary-container": "rgba(220, 38, 38, 0.08)",
      "--on-tertiary-container": "#B91C1C",
      "--success": "#16A34A",
      "--success-light": "#F0FDF4",
      "--warning": "#F59E0B",
      "--warning-light": "#FFFBEB",
      "--error": "#DC2626",
      "--error-light": "#FEF2F2",
      "--surface": "#FFFAF5",
      "--surface-container-lowest": "#FFFFFF",
      "--surface-container-low": "#FFF5EB",
      "--surface-container": "#FFEFDD",
      "--surface-container-high": "#FFE8CC",
      "--surface-container-highest": "#FFFFFF",
      "--on-surface": "#431407",
      "--on-surface-variant": "#7C4A2D",
      "--outline-variant": "rgba(124, 74, 45, 0.12)",
      "--editor-bg": "#1C0A02",
      "--shadow-sm": "0 2px 8px rgba(234, 88, 12, 0.08)",
      "--shadow": "0 4px 20px rgba(234, 88, 12, 0.1)",
      "--shadow-lg": "0 8px 40px rgba(234, 88, 12, 0.12)",
      "--shadow-ai": "0 4px 20px rgba(245, 158, 11, 0.12)",
      "--shadow-primary": "0 4px 16px rgba(234, 88, 12, 0.15)",
      "--shadow-float": "0 8px 30px rgba(234, 88, 12, 0.08), 0 2px 8px rgba(245, 158, 11, 0.05)",
      "--radius-sm": "6px",
      "--radius-md": "10px",
      "--radius-lg": "14px",
      "--radius-xl": "18px",
      "--radius-full": "9999px",
      "--font-display": "'Nanum Myeongjo', serif",
      "--font-body": "'Pretendard Variable', Pretendard, sans-serif",
      "--border-card": "0px",
      "--border-card-color": "transparent",
      "--border-inner": "0px",
      "--border-inner-color": "transparent",
      "--border-text": "2px",
      "--border-text-color": "rgba(234, 88, 12, 0.15)",
    },
    customCSS: `
/* Sunset Warmth — golden glow cards with warm gradients */
.card, .assignment-card, .note-card {
  background: linear-gradient(155deg, #FFFFFF, #FFF5EB) !important;
  box-shadow: 0 4px 20px rgba(234, 88, 12, 0.06);
}
.card:hover, .assignment-card:hover {
  box-shadow: 0 8px 30px rgba(234, 88, 12, 0.12) !important;
  transform: translateY(-2px);
  transition: all 0.3s ease;
}
h1, h2, .page-title {
  background: linear-gradient(135deg, #EA580C, #F59E0B);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.sidebar, [class*="sidebar"] {
  background: linear-gradient(180deg, #FFFAF5, #FFEFDD) !important;
}
.btn-primary, button[class*="primary"] {
  background: linear-gradient(135deg, #EA580C, #F97316) !important;
  box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25);
}
::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #EA580C, #F59E0B) !important;
}
`,
    animation: "particles",
    effects: {
      particles: { enabled: true, params: { color: "#F59E0B", count: 15 }, layer: 0 },
      softShadow: { enabled: true, params: { depth: 4 }, layer: 1 },
      fadeInScroll: { enabled: true, params: {}, layer: 2 },
    },
    triggers: {
      onCorrect: ["confetti", "correctBounce"],
      onWrong: ["wrongShake"],
      onLevelUp: ["levelUpCelebration"],
      onDaily: ["dailyReward"],
    },
  },

  /* ═══════════════════════════════════════════════════════════
   * 6. Arctic Aurora (북극 오로라)
   *    Icy white-blue with aurora & snowfall
   * ═══════════════════════════════════════════════════════════ */
  {
    name: "Arctic Aurora",
    version: 1,
    preview: ["#6366F1", "#F0F4FF", "#818CF8", "#1E1B4B"],
    variables: {
      "--primary": "#6366F1",
      "--primary-light": "#E0E7FF",
      "--primary-container": "#818CF8",
      "--primary-hover": "#4F46E5",
      "--primary-fixed": "#EEF2FF",
      "--secondary": "#8B5CF6",
      "--secondary-light": "#EDE9FE",
      "--tertiary": "#06B6D4",
      "--tertiary-light": "#CFFAFE",
      "--tertiary-container": "rgba(6, 182, 212, 0.08)",
      "--on-tertiary-container": "#0891B2",
      "--success": "#10B981",
      "--success-light": "#D1FAE5",
      "--warning": "#F59E0B",
      "--warning-light": "#FEF3C7",
      "--error": "#F43F5E",
      "--error-light": "#FFE4E6",
      "--surface": "#F0F4FF",
      "--surface-container-lowest": "#FFFFFF",
      "--surface-container-low": "#EBF0FE",
      "--surface-container": "#E0E8FC",
      "--surface-container-high": "#D4DEFA",
      "--surface-container-highest": "#FFFFFF",
      "--on-surface": "#1E1B4B",
      "--on-surface-variant": "#4338CA",
      "--outline-variant": "rgba(67, 56, 202, 0.1)",
      "--editor-bg": "#0F0D2E",
      "--shadow-sm": "0 2px 10px rgba(99, 102, 241, 0.08)",
      "--shadow": "0 4px 24px rgba(99, 102, 241, 0.1)",
      "--shadow-lg": "0 12px 48px rgba(99, 102, 241, 0.12)",
      "--shadow-ai": "0 4px 24px rgba(6, 182, 212, 0.1)",
      "--shadow-primary": "0 4px 20px rgba(99, 102, 241, 0.15)",
      "--shadow-float": "0 12px 40px rgba(99, 102, 241, 0.08), 0 4px 12px rgba(129, 140, 248, 0.06)",
      "--radius-sm": "8px",
      "--radius-md": "14px",
      "--radius-lg": "20px",
      "--radius-xl": "26px",
      "--radius-full": "9999px",
      "--font-display": "'IBM Plex Sans KR', sans-serif",
      "--font-body": "'Pretendard Variable', Pretendard, sans-serif",
      "--border-card": "1px",
      "--border-card-color": "rgba(99, 102, 241, 0.1)",
      "--border-inner": "0px",
      "--border-inner-color": "transparent",
      "--border-text": "0px",
      "--border-text-color": "transparent",
    },
    customCSS: `
/* Arctic Aurora — frosted glass with icy shimmer */
.card, .assignment-card, .note-card {
  background: rgba(255, 255, 255, 0.7) !important;
  backdrop-filter: blur(20px) saturate(1.5);
  border: 1px solid rgba(99, 102, 241, 0.08) !important;
}
.card:hover, .assignment-card:hover {
  background: rgba(255, 255, 255, 0.85) !important;
  border-color: rgba(99, 102, 241, 0.2) !important;
  box-shadow: 0 12px 40px rgba(99, 102, 241, 0.12), 0 0 0 1px rgba(129, 140, 248, 0.1) !important;
  transform: translateY(-3px);
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.sidebar, [class*="sidebar"] {
  background: rgba(240, 244, 255, 0.8) !important;
  backdrop-filter: blur(24px);
}
.btn-primary, button[class*="primary"] {
  background: linear-gradient(135deg, #6366F1, #818CF8) !important;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
}
::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #818CF8, #6366F1) !important;
}
`,
    animation: "snow",
    effects: {
      aurora: { enabled: true, params: { color1: "#6366F1", color2: "#818CF8", color3: "#06B6D4" }, layer: 0 },
      glassMorphism: { enabled: true, params: { blur: 16, opacity: 0.12 }, layer: 2 },
      fadeInScroll: { enabled: true, params: {}, layer: 1 },
    },
    triggers: {
      onCorrect: ["confetti", "correctBounce"],
      onWrong: ["wrongShake"],
      onLevelUp: ["levelUpCelebration"],
      onRankUp: ["rankUpAnimation"],
    },
  },

  /* ═══════════════════════════════════════════════════════════
   * 7. Candy Pop (캔디 팝)
   *    Vivid and playful with rainbow accents
   * ═══════════════════════════════════════════════════════════ */
  {
    name: "Candy Pop",
    version: 1,
    preview: ["#E040FB", "#FFF9FE", "#FF6D00", "#3B0764"],
    variables: {
      "--primary": "#E040FB",
      "--primary-light": "#FAE0FF",
      "--primary-container": "#CE35E8",
      "--primary-hover": "#C026D3",
      "--primary-fixed": "#FDF4FF",
      "--secondary": "#FF6D00",
      "--secondary-light": "#FFF3E0",
      "--tertiary": "#00BFA5",
      "--tertiary-light": "#E0F2F1",
      "--tertiary-container": "rgba(0, 191, 165, 0.08)",
      "--on-tertiary-container": "#00897B",
      "--success": "#00C853",
      "--success-light": "#E8F5E9",
      "--warning": "#FFD600",
      "--warning-light": "#FFFDE7",
      "--error": "#FF1744",
      "--error-light": "#FFEBEE",
      "--surface": "#FFF9FE",
      "--surface-container-lowest": "#FFFFFF",
      "--surface-container-low": "#FFF3FC",
      "--surface-container": "#FFECFA",
      "--surface-container-high": "#FFE0F7",
      "--surface-container-highest": "#FFFFFF",
      "--on-surface": "#3B0764",
      "--on-surface-variant": "#7B1FA2",
      "--outline-variant": "rgba(123, 31, 162, 0.1)",
      "--editor-bg": "#1A0030",
      "--shadow-sm": "0 2px 8px rgba(224, 64, 251, 0.1)",
      "--shadow": "0 4px 20px rgba(224, 64, 251, 0.12)",
      "--shadow-lg": "0 8px 36px rgba(224, 64, 251, 0.15)",
      "--shadow-ai": "0 4px 20px rgba(255, 109, 0, 0.12)",
      "--shadow-primary": "0 4px 16px rgba(224, 64, 251, 0.2)",
      "--shadow-float": "0 8px 30px rgba(224, 64, 251, 0.1), 0 2px 8px rgba(255, 109, 0, 0.06)",
      "--radius-sm": "12px",
      "--radius-md": "18px",
      "--radius-lg": "24px",
      "--radius-xl": "32px",
      "--radius-full": "9999px",
      "--font-display": "'Nanum Gothic', sans-serif",
      "--font-body": "'Noto Sans KR', sans-serif",
      "--border-card": "2px",
      "--border-card-color": "rgba(224, 64, 251, 0.2)",
      "--border-inner": "2px",
      "--border-inner-color": "rgba(224, 64, 251, 0.1)",
      "--border-text": "0px",
      "--border-text-color": "transparent",
    },
    customCSS: `
/* Candy Pop — ultra-rounded, colorful and fun */
.card, .assignment-card, .note-card {
  background: linear-gradient(135deg, #FFFFFF 0%, #FFF3FC 100%) !important;
  border: 2px solid rgba(224, 64, 251, 0.15) !important;
  border-radius: 24px !important;
}
.card:hover, .assignment-card:hover {
  border-color: rgba(224, 64, 251, 0.4) !important;
  box-shadow: 0 0 0 4px rgba(224, 64, 251, 0.08), 0 8px 30px rgba(224, 64, 251, 0.15) !important;
  transform: translateY(-3px);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
h1, h2, .page-title {
  background: linear-gradient(135deg, #E040FB, #FF6D00, #00BFA5);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.btn-primary, button[class*="primary"] {
  background: linear-gradient(135deg, #E040FB, #FF6D00) !important;
  border-radius: 18px !important;
  font-weight: 700;
}
::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #E040FB, #FF6D00) !important;
  border-radius: 10px;
}
::selection { background: rgba(224, 64, 251, 0.25); }
`,
    animation: "sparkle",
    effects: {
      dotGrid: { enabled: true, params: { color: "#E040FB", spacing: 24 }, layer: 0 },
      rippleClick: { enabled: true, params: { color: "#E040FB" }, layer: 1 },
      softShadow: { enabled: true, params: { depth: 3 }, layer: 2 },
    },
    triggers: {
      onCorrect: ["confetti", "correctBounce"],
      onWrong: ["wrongShake"],
      onLevelUp: ["levelUpCelebration"],
      onBadge: ["badgeUnlock"],
      onStreak: ["comboCounter"],
    },
  },

  /* ═══════════════════════════════════════════════════════════
   * 8. Forest Zen (포레스트 젠)
   *    Calm natural green with minimal, mindful aesthetic
   * ═══════════════════════════════════════════════════════════ */
  {
    name: "Forest Zen",
    version: 1,
    preview: ["#059669", "#F0FDF4", "#34D399", "#064E3B"],
    variables: {
      "--primary": "#059669",
      "--primary-light": "#D1FAE5",
      "--primary-container": "#10B981",
      "--primary-hover": "#047857",
      "--primary-fixed": "#A7F3D0",
      "--secondary": "#6B7280",
      "--secondary-light": "#F3F4F6",
      "--tertiary": "#0D9488",
      "--tertiary-light": "#CCFBF1",
      "--tertiary-container": "rgba(13, 148, 136, 0.08)",
      "--on-tertiary-container": "#0F766E",
      "--success": "#22C55E",
      "--success-light": "#F0FDF4",
      "--warning": "#EAB308",
      "--warning-light": "#FEFCE8",
      "--error": "#DC2626",
      "--error-light": "#FEF2F2",
      "--surface": "#F0FDF4",
      "--surface-container-lowest": "#FFFFFF",
      "--surface-container-low": "#ECFDF5",
      "--surface-container": "#D1FAE5",
      "--surface-container-high": "#A7F3D0",
      "--surface-container-highest": "#FFFFFF",
      "--on-surface": "#064E3B",
      "--on-surface-variant": "#047857",
      "--outline-variant": "rgba(4, 120, 87, 0.1)",
      "--editor-bg": "#022C22",
      "--shadow-sm": "0 2px 8px rgba(5, 150, 105, 0.06)",
      "--shadow": "0 4px 20px rgba(5, 150, 105, 0.08)",
      "--shadow-lg": "0 8px 40px rgba(5, 150, 105, 0.1)",
      "--shadow-ai": "0 4px 20px rgba(13, 148, 136, 0.1)",
      "--shadow-primary": "0 4px 16px rgba(5, 150, 105, 0.12)",
      "--shadow-float": "0 8px 30px rgba(5, 150, 105, 0.06), 0 2px 8px rgba(5, 150, 105, 0.03)",
      "--radius-sm": "8px",
      "--radius-md": "12px",
      "--radius-lg": "16px",
      "--radius-xl": "20px",
      "--radius-full": "9999px",
      "--font-display": "'Noto Sans KR', sans-serif",
      "--font-body": "'Pretendard Variable', Pretendard, sans-serif",
      "--border-card": "1px",
      "--border-card-color": "rgba(5, 150, 105, 0.1)",
      "--border-inner": "0px",
      "--border-inner-color": "transparent",
      "--border-text": "0px",
      "--border-text-color": "transparent",
    },
    customCSS: `
/* Forest Zen — natural, calm aesthetic */
.card, .assignment-card, .note-card {
  background: linear-gradient(160deg, #FFFFFF, #F0FDF4) !important;
  border: 1px solid rgba(5, 150, 105, 0.08) !important;
}
.card:hover, .assignment-card:hover {
  border-color: rgba(5, 150, 105, 0.2) !important;
  box-shadow: 0 8px 24px rgba(5, 150, 105, 0.08) !important;
  transform: translateY(-2px);
  transition: all 0.35s ease;
}
h1, h2, .page-title {
  color: #064E3B !important;
}
.btn-primary, button[class*="primary"] {
  background: linear-gradient(135deg, #059669, #10B981) !important;
}
::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #059669, #34D399) !important;
  border-radius: 8px;
}
`,
    animation: "particles",
    effects: {
      particles: { enabled: true, params: { color: "#34D399", count: 10 }, layer: 0 },
      softShadow: { enabled: true, params: { depth: 2 }, layer: 1 },
      fadeInScroll: { enabled: true, params: {}, layer: 2 },
    },
    triggers: {
      onCorrect: ["confetti", "correctBounce"],
      onWrong: ["wrongShake"],
      onLevelUp: ["levelUpCelebration"],
    },
  },

  /* ═══════════════════════════════════════════════════════════
   * 9. Rose Gold (로즈 골드)
   *    Elegant warm pink-gold with refined luxury feel
   * ═══════════════════════════════════════════════════════════ */
  {
    name: "Rose Gold",
    version: 1,
    preview: ["#B45309", "#FFF7ED", "#D97706", "#451A03"],
    variables: {
      "--primary": "#B45309",
      "--primary-light": "#FEF3C7",
      "--primary-container": "#D97706",
      "--primary-hover": "#92400E",
      "--primary-fixed": "#FDE68A",
      "--secondary": "#9CA3AF",
      "--secondary-light": "#F9FAFB",
      "--tertiary": "#DB2777",
      "--tertiary-light": "#FCE7F3",
      "--tertiary-container": "rgba(219, 39, 119, 0.08)",
      "--on-tertiary-container": "#BE185D",
      "--success": "#059669",
      "--success-light": "#ECFDF5",
      "--warning": "#F59E0B",
      "--warning-light": "#FFFBEB",
      "--error": "#DC2626",
      "--error-light": "#FEF2F2",
      "--surface": "#FFF7ED",
      "--surface-container-lowest": "#FFFFFF",
      "--surface-container-low": "#FFFBF5",
      "--surface-container": "#FEF3E2",
      "--surface-container-high": "#FDECD0",
      "--surface-container-highest": "#FFFFFF",
      "--on-surface": "#451A03",
      "--on-surface-variant": "#78350F",
      "--outline-variant": "rgba(120, 53, 15, 0.1)",
      "--editor-bg": "#1C0F02",
      "--shadow-sm": "0 2px 8px rgba(180, 83, 9, 0.06)",
      "--shadow": "0 4px 20px rgba(180, 83, 9, 0.08)",
      "--shadow-lg": "0 8px 36px rgba(180, 83, 9, 0.1)",
      "--shadow-ai": "0 4px 20px rgba(219, 39, 119, 0.08)",
      "--shadow-primary": "0 4px 16px rgba(180, 83, 9, 0.12)",
      "--shadow-float": "0 8px 30px rgba(180, 83, 9, 0.06), 0 2px 8px rgba(219, 39, 119, 0.04)",
      "--radius-sm": "6px",
      "--radius-md": "10px",
      "--radius-lg": "14px",
      "--radius-xl": "18px",
      "--radius-full": "9999px",
      "--font-display": "'Nanum Myeongjo', serif",
      "--font-body": "'Pretendard Variable', Pretendard, sans-serif",
      "--border-card": "1px",
      "--border-card-color": "rgba(180, 83, 9, 0.08)",
      "--border-inner": "0px",
      "--border-inner-color": "transparent",
      "--border-text": "0px",
      "--border-text-color": "transparent",
    },
    customCSS: `
/* Rose Gold — elegant luxury with warm metallic tones */
.card, .assignment-card, .note-card {
  background: linear-gradient(150deg, #FFFFFF, #FFF7ED) !important;
}
.card:hover, .assignment-card:hover {
  box-shadow: 0 8px 28px rgba(180, 83, 9, 0.1) !important;
  transform: translateY(-2px);
  transition: all 0.3s ease;
}
h1, h2, .page-title {
  background: linear-gradient(135deg, #B45309, #D97706);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.btn-primary, button[class*="primary"] {
  background: linear-gradient(135deg, #B45309, #D97706) !important;
  box-shadow: 0 4px 12px rgba(180, 83, 9, 0.2);
}
::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #B45309, #D97706) !important;
}
`,
    animation: "sparkle",
    effects: {
      softShadow: { enabled: true, params: { depth: 3 }, layer: 0 },
      drawBorder: { enabled: true, params: {}, layer: 1 },
    },
    triggers: {
      onCorrect: ["confetti", "correctBounce"],
      onWrong: ["wrongShake"],
      onLevelUp: ["levelUpCelebration"],
    },
  },

  /* ═══════════════════════════════════════════════════════════
   * 10. Lavender Dream (라벤더 드림)
   *     Soft purple pastel with dreamy, gentle vibes
   * ═══════════════════════════════════════════════════════════ */
  {
    name: "Lavender Dream",
    version: 1,
    preview: ["#7C3AED", "#FAF5FF", "#A78BFA", "#4C1D95"],
    variables: {
      "--primary": "#7C3AED",
      "--primary-light": "#EDE9FE",
      "--primary-container": "#8B5CF6",
      "--primary-hover": "#6D28D9",
      "--primary-fixed": "#DDD6FE",
      "--secondary": "#8B5CF6",
      "--secondary-light": "#F5F3FF",
      "--tertiary": "#EC4899",
      "--tertiary-light": "#FCE7F3",
      "--tertiary-container": "rgba(236, 72, 153, 0.08)",
      "--on-tertiary-container": "#DB2777",
      "--success": "#34D399",
      "--success-light": "#ECFDF5",
      "--warning": "#FBBF24",
      "--warning-light": "#FFFBEB",
      "--error": "#F43F5E",
      "--error-light": "#FFF1F2",
      "--surface": "#FAF5FF",
      "--surface-container-lowest": "#FFFFFF",
      "--surface-container-low": "#F5EFFF",
      "--surface-container": "#EDE5FE",
      "--surface-container-high": "#E4D9FD",
      "--surface-container-highest": "#FFFFFF",
      "--on-surface": "#4C1D95",
      "--on-surface-variant": "#6D28D9",
      "--outline-variant": "rgba(109, 40, 217, 0.1)",
      "--editor-bg": "#1E0A3E",
      "--shadow-sm": "0 2px 8px rgba(124, 58, 237, 0.06)",
      "--shadow": "0 4px 20px rgba(124, 58, 237, 0.08)",
      "--shadow-lg": "0 8px 36px rgba(124, 58, 237, 0.1)",
      "--shadow-ai": "0 4px 20px rgba(236, 72, 153, 0.08)",
      "--shadow-primary": "0 4px 16px rgba(124, 58, 237, 0.12)",
      "--shadow-float": "0 8px 30px rgba(124, 58, 237, 0.06), 0 2px 8px rgba(139, 92, 246, 0.04)",
      "--radius-sm": "10px",
      "--radius-md": "14px",
      "--radius-lg": "20px",
      "--radius-xl": "26px",
      "--radius-full": "9999px",
      "--font-display": "'Nanum Gothic', sans-serif",
      "--font-body": "'Pretendard Variable', Pretendard, sans-serif",
      "--border-card": "1px",
      "--border-card-color": "rgba(124, 58, 237, 0.1)",
      "--border-inner": "1px",
      "--border-inner-color": "rgba(124, 58, 237, 0.06)",
      "--border-text": "0px",
      "--border-text-color": "transparent",
    },
    customCSS: `
/* Lavender Dream — soft, dreamy pastel */
.card, .assignment-card, .note-card {
  background: linear-gradient(145deg, #FFFFFF, #FAF5FF) !important;
  border-radius: 18px !important;
}
.card:hover, .assignment-card:hover {
  box-shadow: 0 8px 28px rgba(124, 58, 237, 0.1) !important;
  transform: translateY(-2px);
  transition: all 0.35s ease;
}
h1, h2, .page-title {
  background: linear-gradient(135deg, #7C3AED, #EC4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.btn-primary, button[class*="primary"] {
  background: linear-gradient(135deg, #7C3AED, #8B5CF6) !important;
  border-radius: 14px !important;
}
::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #8B5CF6, #A78BFA) !important;
  border-radius: 10px;
}
`,
    animation: "sparkle",
    effects: {
      softShadow: { enabled: true, params: { depth: 2 }, layer: 0 },
      fadeInScroll: { enabled: true, params: {}, layer: 1 },
      rippleClick: { enabled: true, params: { color: "#8B5CF6" }, layer: 2 },
    },
    triggers: {
      onCorrect: ["confetti", "correctBounce"],
      onWrong: ["wrongShake"],
      onLevelUp: ["levelUpCelebration"],
    },
  },

  /* ═══════════════════════════════════════════════════════════
   * 11. Midnight Studio (미드나잇 스튜디오)
   *    Professional dark with refined blue accents
   * ═══════════════════════════════════════════════════════════ */
  {
    name: "Midnight Studio",
    version: 1,
    preview: ["#3B82F6", "#111827", "#60A5FA", "#E5E7EB"],
    variables: {
      "--primary": "#3B82F6",
      "--primary-light": "#172554",
      "--primary-container": "#2563EB",
      "--primary-hover": "#1D4ED8",
      "--primary-fixed": "#0F1D3D",
      "--secondary": "#6B7280",
      "--secondary-light": "#1F2937",
      "--tertiary": "#8B5CF6",
      "--tertiary-light": "#1E1245",
      "--tertiary-container": "rgba(139, 92, 246, 0.08)",
      "--on-tertiary-container": "#A78BFA",
      "--success": "#22C55E",
      "--success-light": "#052E16",
      "--warning": "#EAB308",
      "--warning-light": "#2D2905",
      "--error": "#EF4444",
      "--error-light": "#2D0F0F",
      "--surface": "#111827",
      "--surface-container-lowest": "#0B1120",
      "--surface-container-low": "#1A2332",
      "--surface-container": "#1F2A3D",
      "--surface-container-high": "#263148",
      "--surface-container-highest": "#111827",
      "--on-surface": "#E5E7EB",
      "--on-surface-variant": "#9CA3AF",
      "--outline-variant": "rgba(156, 163, 175, 0.12)",
      "--editor-bg": "#0A0F1C",
      "--shadow-sm": "0 2px 8px rgba(0, 0, 0, 0.3)",
      "--shadow": "0 4px 20px rgba(0, 0, 0, 0.4)",
      "--shadow-lg": "0 8px 40px rgba(0, 0, 0, 0.5)",
      "--shadow-ai": "0 4px 24px rgba(139, 92, 246, 0.15)",
      "--shadow-primary": "0 4px 20px rgba(59, 130, 246, 0.2)",
      "--shadow-float": "0 12px 40px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(59, 130, 246, 0.05)",
      "--radius-sm": "4px",
      "--radius-md": "8px",
      "--radius-lg": "12px",
      "--radius-xl": "16px",
      "--radius-full": "9999px",
      "--font-display": "'IBM Plex Sans KR', sans-serif",
      "--font-body": "'Pretendard Variable', Pretendard, sans-serif",
      "--border-card": "1px",
      "--border-card-color": "rgba(59, 130, 246, 0.1)",
      "--border-inner": "1px",
      "--border-inner-color": "rgba(156, 163, 175, 0.08)",
      "--border-text": "0px",
      "--border-text-color": "transparent",
    },
    customCSS: `
/* Midnight Studio — clean, professional dark mode */
.card, .assignment-card, .note-card {
  background: linear-gradient(145deg, #1A2332, #1F2A3D) !important;
  border: 1px solid rgba(59, 130, 246, 0.08) !important;
}
.card:hover, .assignment-card:hover {
  border-color: rgba(59, 130, 246, 0.2) !important;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.1) !important;
  transform: translateY(-2px);
  transition: all 0.25s ease;
}
.sidebar, [class*="sidebar"] {
  background: #0B1120 !important;
  border-right: 1px solid rgba(59, 130, 246, 0.08);
}
.btn-primary, button[class*="primary"] {
  background: #3B82F6 !important;
  box-shadow: 0 2px 10px rgba(59, 130, 246, 0.25);
}
.btn-primary:hover, button[class*="primary"]:hover {
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.35);
}
::-webkit-scrollbar-thumb {
  background: #374151 !important;
  border-radius: 6px;
}
::-webkit-scrollbar-thumb:hover { background: #4B5563 !important; }
::selection { background: rgba(59, 130, 246, 0.3); }
`,
    animation: "particles",
    effects: {
      particles: { enabled: true, params: { color: "#3B82F6", count: 15 }, layer: 0 },
      glow: { enabled: true, params: { color: "#3B82F6", intensity: 0.3 }, layer: 2 },
      drawBorder: { enabled: true, params: {}, layer: 1 },
      fadeInScroll: { enabled: true, params: {}, layer: 1 },
    },
    triggers: {
      onCorrect: ["correctBounce", "xpGain"],
      onWrong: ["wrongShake"],
      onLevelUp: ["levelUpCelebration"],
      onCombo: ["comboCounter"],
    },
  },
];
