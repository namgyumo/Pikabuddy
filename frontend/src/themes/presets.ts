/* ── Premium Custom Theme Presets v3 ──
 * Clean, polished themes with rich effect layering.
 * customCSS: card · heading · button · sidebar · scrollbar · selection
 * effects: 5–7 layered ambient + gamification triggers
 */

import type { CustomTheme } from "./index";

type PresetTheme = Omit<CustomTheme, "id">;

export const PRESET_THEMES: PresetTheme[] = [
  /* ═══════════════════════════════════════════════════════════
   * 1. Neon Galaxy (네온 갤럭시)
   *    Deep space · neon purple/cyan · starfield + aurora
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
      "--tertiary-light": "rgba(0,229,255,0.12)",
      "--tertiary-container": "rgba(0,229,255,0.08)",
      "--on-tertiary-container": "#00BCD4",
      "--success": "#4ADE80",
      "--success-light": "rgba(74,222,128,0.12)",
      "--warning": "#FBBF24",
      "--warning-light": "rgba(251,191,36,0.12)",
      "--error": "#F87171",
      "--error-light": "rgba(248,113,113,0.12)",
      "--surface": "#0B0E1A",
      "--surface-container-lowest": "#060812",
      "--surface-container-low": "#0F1225",
      "--surface-container": "#151830",
      "--surface-container-high": "#1C1F3B",
      "--surface-container-highest": "#222546",
      "--on-surface": "#E0E0FF",
      "--on-surface-variant": "#9B9ECF",
      "--outline-variant": "rgba(155,158,207,0.15)",
      "--editor-bg": "#06080F",
      "--shadow-sm": "0 0 8px rgba(168,85,247,0.12)",
      "--shadow": "0 0 16px rgba(168,85,247,0.15)",
      "--shadow-lg": "0 0 32px rgba(168,85,247,0.18)",
      "--shadow-ai": "0 0 24px rgba(0,229,255,0.15)",
      "--shadow-primary": "0 0 20px rgba(168,85,247,0.25)",
      "--shadow-float": "0 0 40px rgba(168,85,247,0.12), 0 0 8px rgba(0,229,255,0.08)",
      "--radius-sm": "6px",
      "--radius-md": "10px",
      "--radius-lg": "14px",
      "--radius-xl": "20px",
      "--radius-full": "9999px",
      "--font-display": "'Fira Code', monospace",
      "--font-body": "'Pretendard Variable', Pretendard, sans-serif",
      "--border-card": "1px",
      "--border-card-color": "rgba(168,85,247,0.25)",
      "--border-inner": "1px",
      "--border-inner-color": "rgba(99,102,241,0.12)",
      "--border-text": "0px",
      "--border-text-color": "transparent",
    },
    customCSS: `
h1, h2, .page-title {
  background: linear-gradient(90deg, #A855F7, #00E5FF, #6366F1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 1px;
}
h3 { color: #C4B5FD; }
.card, .assignment-card, .note-card {
  border: 1px solid rgba(168,85,247,0.2) !important;
  box-shadow: inset 0 0 30px rgba(168,85,247,0.03);
}
.card:hover, .assignment-card:hover, .note-card:hover {
  border-color: rgba(0,229,255,0.4) !important;
  box-shadow: 0 0 25px rgba(168,85,247,0.2), 0 0 50px rgba(0,229,255,0.08), inset 0 0 30px rgba(168,85,247,0.04) !important;
}
.btn-primary, button[class*="primary"] {
  box-shadow: 0 0 14px rgba(168,85,247,0.35), inset 0 1px 0 rgba(255,255,255,0.1);
}
.btn-primary:hover, button[class*="primary"]:hover {
  box-shadow: 0 0 22px rgba(168,85,247,0.5), 0 0 40px rgba(0,229,255,0.15);
}
.sidebar, [class*="sidebar"] {
  background: #060812 !important;
  border-right: 1px solid rgba(168,85,247,0.1) !important;
}
::selection { background: rgba(168,85,247,0.3); color: #E0E0FF; }
::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #A855F7, #00E5FF) !important; border-radius: 6px; }
::-webkit-scrollbar-track { background: #060812 !important; }
`,
    animation: "gradient",
    effects: {
      starfield: { enabled: true, params: { speed: 0.5, density: 100 }, layer: 0 },
      aurora: { enabled: true, params: { color1: "#A855F7", color2: "#6366F1", color3: "#00E5FF" }, layer: 0 },
      neonText: { enabled: true, params: { color: "#A855F7" }, layer: 1 },
      glow: { enabled: true, params: { color: "#A855F7", intensity: 0.3 }, layer: 2 },
      cursorGlow: { enabled: true, params: { color: "#A855F7", size: 150 }, layer: 3 },
      clickExplosion: { enabled: true, params: { emoji: "✨" }, layer: 3 },
    },
    triggers: {
      onCorrect: ["confetti", "correctBounce"],
      onWrong: ["wrongShake"],
      onLevelUp: ["levelUpCelebration", "confetti"],
      onBadge: ["badgeUnlock"],
    },
  },

  /* ═══════════════════════════════════════════════════════════
   * 2. Deep Ocean Abyss (심해 탐험)
   *    Bioluminescent deep sea · teal/purple glow · bubbles
   * ═══════════════════════════════════════════════════════════ */
  {
    name: "Deep Ocean Abyss",
    version: 1,
    preview: ["#06D6A0", "#040E1A", "#0EA5E9", "#B0E0E6"],
    variables: {
      "--primary": "#06D6A0",
      "--primary-light": "#0A2E28",
      "--primary-container": "#059669",
      "--primary-hover": "#047857",
      "--primary-fixed": "#082820",
      "--secondary": "#0EA5E9",
      "--secondary-light": "rgba(14,165,233,0.12)",
      "--tertiary": "#8B5CF6",
      "--tertiary-light": "rgba(139,92,246,0.12)",
      "--tertiary-container": "rgba(139,92,246,0.08)",
      "--on-tertiary-container": "#A78BFA",
      "--success": "#4ADE80",
      "--success-light": "rgba(74,222,128,0.12)",
      "--warning": "#FBBF24",
      "--warning-light": "rgba(251,191,36,0.12)",
      "--error": "#FB7185",
      "--error-light": "rgba(251,113,133,0.12)",
      "--surface": "#040E1A",
      "--surface-container-lowest": "#020810",
      "--surface-container-low": "#071523",
      "--surface-container": "#0B1C2E",
      "--surface-container-high": "#10243A",
      "--surface-container-highest": "#152C46",
      "--on-surface": "#B0E0E6",
      "--on-surface-variant": "#6BAFBF",
      "--outline-variant": "rgba(107,175,191,0.12)",
      "--editor-bg": "#020610",
      "--shadow-sm": "0 0 8px rgba(6,214,160,0.08)",
      "--shadow": "0 0 16px rgba(6,214,160,0.1)",
      "--shadow-lg": "0 0 32px rgba(6,214,160,0.12)",
      "--shadow-ai": "0 0 24px rgba(14,165,233,0.12)",
      "--shadow-primary": "0 0 20px rgba(6,214,160,0.18)",
      "--shadow-float": "0 0 40px rgba(6,214,160,0.08), 0 0 8px rgba(14,165,233,0.05)",
      "--radius-sm": "8px",
      "--radius-md": "12px",
      "--radius-lg": "18px",
      "--radius-xl": "24px",
      "--radius-full": "9999px",
      "--font-display": "'Pretendard Variable', Pretendard, sans-serif",
      "--font-body": "'Pretendard Variable', Pretendard, sans-serif",
      "--border-card": "1px",
      "--border-card-color": "rgba(6,214,160,0.15)",
      "--border-inner": "1px",
      "--border-inner-color": "rgba(6,214,160,0.08)",
      "--border-text": "0px",
      "--border-text-color": "transparent",
    },
    customCSS: `
h1, h2, .page-title {
  background: linear-gradient(90deg, #06D6A0, #0EA5E9, #8B5CF6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
h3 { color: #6EE7B7; }
.card, .assignment-card, .note-card {
  border: 1px solid rgba(6,214,160,0.12) !important;
  box-shadow: inset 0 0 40px rgba(6,214,160,0.02), inset 0 -20px 40px rgba(14,165,233,0.02);
}
.card:hover, .assignment-card:hover, .note-card:hover {
  border-color: rgba(6,214,160,0.3) !important;
  box-shadow: 0 0 20px rgba(6,214,160,0.12), 0 0 40px rgba(14,165,233,0.06), inset 0 0 40px rgba(6,214,160,0.03) !important;
  transform: translateY(-2px);
  transition: all 0.4s ease;
}
.btn-primary, button[class*="primary"] {
  background: linear-gradient(135deg, #059669, #0EA5E9) !important;
  box-shadow: 0 0 12px rgba(6,214,160,0.25);
}
.btn-primary:hover, button[class*="primary"]:hover {
  box-shadow: 0 0 20px rgba(6,214,160,0.4), 0 0 40px rgba(14,165,233,0.15);
}
.sidebar, [class*="sidebar"] {
  background: #020810 !important;
  border-right: 1px solid rgba(6,214,160,0.06) !important;
}
::selection { background: rgba(6,214,160,0.25); color: #B0E0E6; }
::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #06D6A0, #0EA5E9) !important; border-radius: 8px; }
::-webkit-scrollbar-track { background: #020810 !important; }
`,
    animation: "particles",
    effects: {
      bubbles: { enabled: true, params: { color: "#06D6A0", count: 18 }, layer: 0 },
      fogMist: { enabled: true, params: { density: 0.3 }, layer: 0 },
      glow: { enabled: true, params: { color: "#06D6A0", intensity: 0.25 }, layer: 1 },
      wavyText: { enabled: true, params: {}, layer: 1 },
      softShadow: { enabled: true, params: { depth: 3 }, layer: 2 },
      cursorGlow: { enabled: true, params: { color: "#06D6A0", size: 180 }, layer: 3 },
    },
    triggers: {
      onCorrect: ["confetti", "correctBounce"],
      onWrong: ["wrongShake"],
      onLevelUp: ["levelUpCelebration"],
      onCombo: ["comboCounter"],
    },
  },

  /* ═══════════════════════════════════════════════════════════
   * 3. Vintage Leather Craft (빈티지 레더)
   *    Warm light leather · stitching borders · serif fonts
   * ═══════════════════════════════════════════════════════════ */
  {
    name: "Vintage Leather Craft",
    version: 1,
    preview: ["#A0522D", "#F5EDE4", "#B8432F", "#3B2F24"],
    variables: {
      "--primary": "#A0522D",
      "--primary-light": "rgba(160,82,45,0.12)",
      "--primary-container": "rgba(160,82,45,0.10)",
      "--primary-hover": "#8B4726",
      "--primary-fixed": "#A0522D",
      "--secondary": "#907860",
      "--secondary-light": "rgba(144,120,96,0.12)",
      "--tertiary": "#B8432F",
      "--tertiary-light": "rgba(184,67,47,0.10)",
      "--tertiary-container": "rgba(184,67,47,0.06)",
      "--on-tertiary-container": "#B8432F",
      "--success": "#5A8C3C",
      "--success-light": "rgba(90,140,60,0.12)",
      "--warning": "#C08B30",
      "--warning-light": "rgba(192,139,48,0.12)",
      "--error": "#B8432F",
      "--error-light": "rgba(184,67,47,0.10)",
      "--surface": "#F5EDE4",
      "--surface-container-lowest": "#FFFBF7",
      "--surface-container-low": "#F0E6DA",
      "--surface-container": "#E8DDD0",
      "--surface-container-high": "#DFD2C3",
      "--surface-container-highest": "#FFFFFF",
      "--on-surface": "#3B2F24",
      "--on-surface-variant": "#6B5D50",
      "--outline-variant": "rgba(160,82,45,0.12)",
      "--editor-bg": "#FBF6F0",
      "--shadow-sm": "0 2px 6px rgba(59,47,36,0.08)",
      "--shadow": "0 4px 14px rgba(59,47,36,0.1)",
      "--shadow-lg": "0 8px 28px rgba(59,47,36,0.12)",
      "--shadow-ai": "0 4px 18px rgba(160,82,45,0.1)",
      "--shadow-primary": "0 4px 14px rgba(160,82,45,0.12)",
      "--shadow-float": "0 6px 20px rgba(59,47,36,0.1), 0 2px 6px rgba(59,47,36,0.06)",
      "--radius-sm": "4px",
      "--radius-md": "6px",
      "--radius-lg": "10px",
      "--radius-xl": "12px",
      "--radius-full": "9999px",
      "--font-display": "Georgia, serif",
      "--font-body": "'Nanum Myeongjo', serif",
      "--border-card": "2px",
      "--border-card-color": "rgba(160,82,45,0.3)",
      "--border-inner": "1px",
      "--border-inner-color": "rgba(160,82,45,0.12)",
      "--border-text": "0px",
      "--border-text-color": "transparent",
    },
    customCSS: `
.card, .assignment-card, .note-card {
  border: 2px dashed rgba(160,82,45,0.3) !important;
  background: linear-gradient(135deg, rgba(245,237,228,0.8), rgba(232,221,208,0.6)) !important;
  position: relative;
}
.card::before, .assignment-card::before, .note-card::before {
  content: '';
  position: absolute;
  inset: 4px;
  border: 1px dashed rgba(160,82,45,0.18);
  border-radius: inherit;
  pointer-events: none;
}
.card:hover, .assignment-card:hover, .note-card:hover {
  border-color: rgba(160,82,45,0.5) !important;
  box-shadow: 0 4px 20px rgba(160,82,45,0.1) !important;
}
h1, h2, .page-title {
  color: #6B3A1F !important;
  font-style: italic;
  letter-spacing: 0.5px;
  border-bottom: 2px dashed rgba(160,82,45,0.2);
  padding-bottom: 8px;
}
h3 { color: #A0522D; }
.btn-primary, button[class*="primary"] {
  border: 2px dashed rgba(255,255,255,0.35) !important;
  background: linear-gradient(135deg, #A0522D, #C07040) !important;
  color: #FFF8F0 !important;
}
.sidebar, [class*="sidebar"] {
  background: rgba(232,221,208,0.5) !important;
  border-right: 2px dashed rgba(160,82,45,0.15) !important;
}
::selection { background: rgba(160,82,45,0.2); color: #3B2F24; }
::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #C07040, #A0522D) !important; border-radius: 4px; }
::-webkit-scrollbar-track { background: #F0E6DA !important; }
`,
    animation: "particles",
    effects: {
      particles: { enabled: true, params: { color: "#C09870", count: 12 }, layer: 0 },
      noiseTexture: { enabled: true, params: { opacity: 0.04 }, layer: 0 },
      fadeInScroll: { enabled: true, params: {}, layer: 1 },
      drawBorder: { enabled: true, params: {}, layer: 1 },
      softShadow: { enabled: true, params: { depth: 2 }, layer: 2 },
    },
    triggers: {
      onCorrect: ["correctBounce"],
      onWrong: ["wrongShake"],
      onLevelUp: ["levelUpCelebration"],
    },
  },

  /* ═══════════════════════════════════════════════════════════
   * 4. Matrix Terminal (매트릭스 터미널)
   *    Hacker black/green · monospace · code rain + glow
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
      "--secondary-light": "rgba(74,222,128,0.12)",
      "--tertiary": "#A3E635",
      "--tertiary-light": "rgba(163,230,53,0.12)",
      "--tertiary-container": "rgba(163,230,53,0.08)",
      "--on-tertiary-container": "#84CC16",
      "--success": "#4ADE80",
      "--success-light": "rgba(74,222,128,0.12)",
      "--warning": "#FACC15",
      "--warning-light": "rgba(250,204,21,0.12)",
      "--error": "#EF4444",
      "--error-light": "rgba(239,68,68,0.12)",
      "--surface": "#030A01",
      "--surface-container-lowest": "#010500",
      "--surface-container-low": "#051205",
      "--surface-container": "#081A08",
      "--surface-container-high": "#0C220B",
      "--surface-container-highest": "#102C0F",
      "--on-surface": "#86EFAC",
      "--on-surface-variant": "#4ADE80",
      "--outline-variant": "rgba(74,222,128,0.1)",
      "--editor-bg": "#000000",
      "--shadow-sm": "0 0 8px rgba(34,197,94,0.08)",
      "--shadow": "0 0 16px rgba(34,197,94,0.1)",
      "--shadow-lg": "0 0 32px rgba(34,197,94,0.12)",
      "--shadow-ai": "0 0 24px rgba(163,230,53,0.1)",
      "--shadow-primary": "0 0 20px rgba(34,197,94,0.2)",
      "--shadow-float": "0 0 40px rgba(34,197,94,0.08), 0 0 10px rgba(34,197,94,0.04)",
      "--radius-sm": "2px",
      "--radius-md": "4px",
      "--radius-lg": "6px",
      "--radius-xl": "8px",
      "--radius-full": "9999px",
      "--font-display": "'Fira Code', monospace",
      "--font-body": "'Fira Code', monospace",
      "--border-card": "1px",
      "--border-card-color": "rgba(34,197,94,0.2)",
      "--border-inner": "1px",
      "--border-inner-color": "rgba(34,197,94,0.1)",
      "--border-text": "0px",
      "--border-text-color": "transparent",
    },
    customCSS: `
* { font-family: 'Fira Code', 'Consolas', monospace !important; }
h1, h2, .page-title {
  text-shadow: 0 0 8px rgba(34,197,94,0.5), 0 0 16px rgba(34,197,94,0.2);
  letter-spacing: 2px;
  text-transform: uppercase;
}
h3 { color: #4ADE80; text-shadow: 0 0 4px rgba(34,197,94,0.3); }
.card, .assignment-card, .note-card {
  border: 1px solid rgba(34,197,94,0.2) !important;
  background: rgba(5,18,5,0.92) !important;
  box-shadow: inset 0 0 30px rgba(34,197,94,0.02);
}
.card:hover, .assignment-card:hover, .note-card:hover {
  border-color: rgba(34,197,94,0.5) !important;
  box-shadow: 0 0 20px rgba(34,197,94,0.15), inset 0 0 30px rgba(34,197,94,0.03) !important;
}
.btn-primary, button[class*="primary"] {
  text-transform: uppercase;
  letter-spacing: 2px;
  box-shadow: 0 0 12px rgba(34,197,94,0.3);
  border: 1px solid rgba(34,197,94,0.3) !important;
  background: rgba(5,30,5,0.9) !important;
  color: #22C55E !important;
}
.btn-primary:hover, button[class*="primary"]:hover {
  box-shadow: 0 0 18px rgba(34,197,94,0.5);
  background: rgba(34,197,94,0.15) !important;
}
.sidebar, [class*="sidebar"] {
  background: #010500 !important;
  border-right: 1px solid rgba(34,197,94,0.1) !important;
}
::selection { background: rgba(34,197,94,0.3); color: #86EFAC; }
::-webkit-scrollbar-thumb { background: #22C55E !important; border-radius: 0; }
::-webkit-scrollbar-track { background: #030A01 !important; }
`,
    animation: "none",
    effects: {
      matrixRain: { enabled: true, params: { color: "#22C55E" }, layer: 0 },
      dotGrid: { enabled: true, params: { color: "rgba(34,197,94,0.04)", spacing: 20 }, layer: 0 },
      typewriterTitle: { enabled: true, params: {}, layer: 1 },
      textScramble: { enabled: true, params: {}, layer: 1 },
      glitchText: { enabled: true, params: {}, layer: 1 },
      cursorGlow: { enabled: true, params: { color: "#22C55E", size: 120 }, layer: 2 },
      vignetteOverlay: { enabled: true, params: { intensity: 0.4 }, layer: 3 },
    },
    triggers: {
      onCorrect: ["correctBounce", "xpGain"],
      onWrong: ["wrongShake"],
      onLevelUp: ["levelUpCelebration"],
      onCombo: ["comboCounter"],
    },
  },

  /* ═══════════════════════════════════════════════════════════
   * 5. Thunderstorm (썬더스톰)
   *    Stormy dark blue · lightning flashes · indigo/gold
   * ═══════════════════════════════════════════════════════════ */
  {
    name: "Thunderstorm",
    version: 1,
    preview: ["#6366F1", "#0F1119", "#FBBF24", "#C8D6E5"],
    variables: {
      "--primary": "#6366F1",
      "--primary-light": "#1E1B4B",
      "--primary-container": "#4F46E5",
      "--primary-hover": "#4338CA",
      "--primary-fixed": "#161235",
      "--secondary": "#7C8DB5",
      "--secondary-light": "rgba(124,141,181,0.12)",
      "--tertiary": "#FBBF24",
      "--tertiary-light": "rgba(251,191,36,0.12)",
      "--tertiary-container": "rgba(251,191,36,0.08)",
      "--on-tertiary-container": "#F59E0B",
      "--success": "#34D399",
      "--success-light": "rgba(52,211,153,0.12)",
      "--warning": "#FBBF24",
      "--warning-light": "rgba(251,191,36,0.12)",
      "--error": "#F87171",
      "--error-light": "rgba(248,113,113,0.12)",
      "--surface": "#0F1119",
      "--surface-container-lowest": "#0A0B12",
      "--surface-container-low": "#151724",
      "--surface-container": "#1B1D2E",
      "--surface-container-high": "#222438",
      "--surface-container-highest": "#2A2C42",
      "--on-surface": "#C8D6E5",
      "--on-surface-variant": "#8896AA",
      "--outline-variant": "rgba(136,150,170,0.12)",
      "--editor-bg": "#08090F",
      "--shadow-sm": "0 2px 10px rgba(0,0,0,0.3)",
      "--shadow": "0 4px 24px rgba(0,0,0,0.4)",
      "--shadow-lg": "0 8px 48px rgba(0,0,0,0.5)",
      "--shadow-ai": "0 0 24px rgba(99,102,241,0.12)",
      "--shadow-primary": "0 0 20px rgba(99,102,241,0.18)",
      "--shadow-float": "0 8px 30px rgba(0,0,0,0.4), 0 0 8px rgba(99,102,241,0.06)",
      "--radius-sm": "6px",
      "--radius-md": "10px",
      "--radius-lg": "14px",
      "--radius-xl": "18px",
      "--radius-full": "9999px",
      "--font-display": "'Pretendard Variable', Pretendard, sans-serif",
      "--font-body": "'Pretendard Variable', Pretendard, sans-serif",
      "--border-card": "1px",
      "--border-card-color": "rgba(99,102,241,0.12)",
      "--border-inner": "1px",
      "--border-inner-color": "rgba(136,150,170,0.08)",
      "--border-text": "0px",
      "--border-text-color": "transparent",
    },
    customCSS: `
h1, h2, .page-title {
  background: linear-gradient(90deg, #818CF8, #FBBF24);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 0.5px;
}
h3 { color: #A5B4FC; }
.card, .assignment-card, .note-card {
  border: 1px solid rgba(99,102,241,0.1) !important;
  box-shadow: inset 0 0 30px rgba(99,102,241,0.02);
}
.card:hover, .assignment-card:hover, .note-card:hover {
  border-color: rgba(99,102,241,0.25) !important;
  box-shadow: 0 0 15px rgba(99,102,241,0.12), 0 8px 30px rgba(0,0,0,0.3) !important;
  transform: translateY(-2px);
  transition: all 0.3s ease;
}
.btn-primary, button[class*="primary"] {
  background: linear-gradient(135deg, #4F46E5, #6366F1) !important;
  box-shadow: 0 0 12px rgba(99,102,241,0.3), 0 4px 12px rgba(0,0,0,0.2);
}
.btn-primary:hover, button[class*="primary"]:hover {
  box-shadow: 0 0 20px rgba(99,102,241,0.5), 0 0 40px rgba(251,191,36,0.08);
}
.sidebar, [class*="sidebar"] {
  background: #0A0B12 !important;
  border-right: 1px solid rgba(99,102,241,0.06) !important;
}
::selection { background: rgba(99,102,241,0.3); color: #C8D6E5; }
::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #4F46E5, #6366F1) !important; border-radius: 6px; }
::-webkit-scrollbar-track { background: #0A0B12 !important; }
`,
    animation: "rain",
    effects: {
      lightning: { enabled: true, params: { frequency: 6 }, layer: 0 },
      fogMist: { enabled: true, params: { density: 0.4 }, layer: 0 },
      noiseTexture: { enabled: true, params: { opacity: 0.03 }, layer: 0 },
      vignetteOverlay: { enabled: true, params: { intensity: 0.35 }, layer: 1 },
      glow: { enabled: true, params: { color: "#6366F1", intensity: 0.2 }, layer: 2 },
      rippleClick: { enabled: true, params: { color: "#FBBF24" }, layer: 3 },
    },
    triggers: {
      onCorrect: ["confetti", "correctBounce"],
      onWrong: ["wrongShake"],
      onLevelUp: ["levelUpCelebration"],
      onCombo: ["comboCounter"],
    },
  },

  /* ═══════════════════════════════════════════════════════════
   * 6. Steampunk Workshop (스팀펑크 공방)
   *    Warm brass/copper · Victorian serif · gears & rivets
   * ═══════════════════════════════════════════════════════════ */
  {
    name: "Steampunk Workshop",
    version: 1,
    preview: ["#B87333", "#1A1510", "#DAA520", "#E8D5B5"],
    variables: {
      "--primary": "#B87333",
      "--primary-light": "#2D1E12",
      "--primary-container": "#A0622A",
      "--primary-hover": "#9A5F28",
      "--primary-fixed": "#241A0E",
      "--secondary": "#8B7355",
      "--secondary-light": "rgba(139,115,85,0.12)",
      "--tertiary": "#DAA520",
      "--tertiary-light": "rgba(218,165,32,0.12)",
      "--tertiary-container": "rgba(218,165,32,0.08)",
      "--on-tertiary-container": "#DAA520",
      "--success": "#6B8E23",
      "--success-light": "rgba(107,142,35,0.12)",
      "--warning": "#DAA520",
      "--warning-light": "rgba(218,165,32,0.12)",
      "--error": "#B22222",
      "--error-light": "rgba(178,34,34,0.12)",
      "--surface": "#1A1510",
      "--surface-container-lowest": "#100D08",
      "--surface-container-low": "#231D15",
      "--surface-container": "#2C251B",
      "--surface-container-high": "#362D22",
      "--surface-container-highest": "#40362A",
      "--on-surface": "#E8D5B5",
      "--on-surface-variant": "#B8A080",
      "--outline-variant": "rgba(184,160,128,0.12)",
      "--editor-bg": "#0D0A06",
      "--shadow-sm": "0 2px 8px rgba(0,0,0,0.3)",
      "--shadow": "0 4px 16px rgba(0,0,0,0.4)",
      "--shadow-lg": "0 8px 32px rgba(0,0,0,0.5)",
      "--shadow-ai": "0 0 20px rgba(218,165,32,0.12)",
      "--shadow-primary": "0 0 16px rgba(184,115,51,0.18)",
      "--shadow-float": "0 6px 24px rgba(0,0,0,0.4), 0 0 8px rgba(184,115,51,0.08)",
      "--radius-sm": "3px",
      "--radius-md": "5px",
      "--radius-lg": "8px",
      "--radius-xl": "12px",
      "--radius-full": "9999px",
      "--font-display": "Georgia, serif",
      "--font-body": "'Noto Sans KR', sans-serif",
      "--border-card": "2px",
      "--border-card-color": "rgba(184,115,51,0.25)",
      "--border-inner": "1px",
      "--border-inner-color": "rgba(184,115,51,0.12)",
      "--border-text": "0px",
      "--border-text-color": "transparent",
    },
    customCSS: `
h1, h2, .page-title {
  color: #DAA520 !important;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.4);
  letter-spacing: 0.5px;
  font-style: italic;
}
h3 { color: #C6A050; }
.card, .assignment-card, .note-card {
  background: linear-gradient(160deg, #2C251B, #231D15) !important;
  border: 2px solid rgba(184,115,51,0.2) !important;
  box-shadow: inset 0 0 30px rgba(184,115,51,0.02);
}
.card:hover, .assignment-card:hover, .note-card:hover {
  border-color: rgba(184,115,51,0.4) !important;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4), 0 0 10px rgba(184,115,51,0.08) !important;
  transform: translateY(-1px);
  transition: all 0.3s ease;
}
.btn-primary, button[class*="primary"] {
  background: linear-gradient(180deg, #CD7F32, #B87333, #A0622A) !important;
  border: 1px solid rgba(218,165,32,0.3) !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(218,165,32,0.2);
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}
.sidebar, [class*="sidebar"] {
  background: linear-gradient(180deg, #100D08, #1A1510) !important;
  border-right: 2px solid rgba(184,115,51,0.12) !important;
}
::selection { background: rgba(184,115,51,0.3); color: #E8D5B5; }
::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #B87333, #8B6914) !important; border-radius: 3px; }
::-webkit-scrollbar-track { background: #100D08 !important; }
`,
    animation: "particles",
    effects: {
      particles: { enabled: true, params: { color: "#B87333", count: 10 }, layer: 0 },
      noiseTexture: { enabled: true, params: { opacity: 0.05 }, layer: 0 },
      geometricPattern: { enabled: true, params: { shape: "hexagon" }, layer: 0 },
      drawBorder: { enabled: true, params: {}, layer: 1 },
      softShadow: { enabled: true, params: { depth: 4 }, layer: 2 },
      fadeInScroll: { enabled: true, params: {}, layer: 2 },
    },
    triggers: {
      onCorrect: ["correctBounce"],
      onWrong: ["wrongShake"],
      onLevelUp: ["levelUpCelebration"],
    },
  },

  /* ═══════════════════════════════════════════════════════════
   * 7. Retro Arcade (레트로 아케이드)
   *    Black + neon pink/green/yellow · pixel borders · 8-bit
   * ═══════════════════════════════════════════════════════════ */
  {
    name: "Retro Arcade",
    version: 1,
    preview: ["#FF0080", "#0A0A14", "#00FF41", "#FFE81F"],
    variables: {
      "--primary": "#FF0080",
      "--primary-light": "rgba(255,0,128,0.12)",
      "--primary-container": "#CC0066",
      "--primary-hover": "#E6006E",
      "--primary-fixed": "#200012",
      "--secondary": "#00FF41",
      "--secondary-light": "rgba(0,255,65,0.12)",
      "--tertiary": "#FFE81F",
      "--tertiary-light": "rgba(255,232,31,0.12)",
      "--tertiary-container": "rgba(255,232,31,0.08)",
      "--on-tertiary-container": "#FFD700",
      "--success": "#00FF41",
      "--success-light": "rgba(0,255,65,0.12)",
      "--warning": "#FFE81F",
      "--warning-light": "rgba(255,232,31,0.12)",
      "--error": "#FF1744",
      "--error-light": "rgba(255,23,68,0.12)",
      "--surface": "#0A0A14",
      "--surface-container-lowest": "#050508",
      "--surface-container-low": "#10101E",
      "--surface-container": "#161628",
      "--surface-container-high": "#1E1E32",
      "--surface-container-highest": "#26263C",
      "--on-surface": "#E0E0FF",
      "--on-surface-variant": "#A0A0C0",
      "--outline-variant": "rgba(160,160,192,0.12)",
      "--editor-bg": "#050508",
      "--shadow-sm": "4px 4px 0 rgba(255,0,128,0.15)",
      "--shadow": "4px 4px 0 rgba(255,0,128,0.12)",
      "--shadow-lg": "6px 6px 0 rgba(255,0,128,0.1)",
      "--shadow-ai": "0 0 20px rgba(0,255,65,0.12)",
      "--shadow-primary": "0 0 16px rgba(255,0,128,0.2)",
      "--shadow-float": "6px 6px 0 rgba(0,0,0,0.4), 0 0 16px rgba(255,0,128,0.08)",
      "--radius-sm": "0px",
      "--radius-md": "0px",
      "--radius-lg": "0px",
      "--radius-xl": "0px",
      "--radius-full": "0px",
      "--font-display": "'Fira Code', monospace",
      "--font-body": "'Fira Code', monospace",
      "--border-card": "3px",
      "--border-card-color": "rgba(255,0,128,0.3)",
      "--border-inner": "2px",
      "--border-inner-color": "rgba(0,255,65,0.1)",
      "--border-text": "0px",
      "--border-text-color": "transparent",
    },
    customCSS: `
* { font-family: 'Fira Code', 'Consolas', monospace !important; }
h1, h2, .page-title {
  color: #FFE81F !important;
  text-shadow: 0 0 8px #FFE81F, 0 0 16px rgba(255,232,31,0.4), 0 0 32px rgba(255,232,31,0.2);
  text-transform: uppercase;
  letter-spacing: 3px;
}
h3 { color: #00FF41; text-shadow: 0 0 6px rgba(0,255,65,0.4); }
.card, .assignment-card, .note-card {
  background: #10101E !important;
  border: 3px solid rgba(255,0,128,0.25) !important;
  border-radius: 0 !important;
  box-shadow: 4px 4px 0 rgba(255,0,128,0.12);
}
.card:hover, .assignment-card:hover, .note-card:hover {
  border-color: #FF0080 !important;
  box-shadow: 0 0 12px rgba(255,0,128,0.35), 0 0 24px rgba(255,0,128,0.15), 4px 4px 0 rgba(255,0,128,0.2) !important;
  transition: all 0.15s steps(3);
}
.btn-primary, button[class*="primary"] {
  background: #FF0080 !important;
  border: 2px solid #FF0080 !important;
  border-radius: 0 !important;
  text-transform: uppercase;
  letter-spacing: 2px;
  box-shadow: 3px 3px 0 rgba(0,0,0,0.5);
}
.btn-primary:hover, button[class*="primary"]:hover {
  box-shadow: 0 0 14px rgba(255,0,128,0.5), 3px 3px 0 rgba(0,0,0,0.5);
}
.btn-primary:active, button[class*="primary"]:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 rgba(0,0,0,0.5);
}
.sidebar, [class*="sidebar"] {
  background: #050508 !important;
  border-right: 3px solid rgba(0,255,65,0.12) !important;
}
::selection { background: rgba(255,0,128,0.4); color: #FFE81F; }
::-webkit-scrollbar-thumb { background: #FF0080 !important; border-radius: 0 !important; }
::-webkit-scrollbar-track { background: #050508 !important; }
`,
    animation: "none",
    effects: {
      starfield: { enabled: true, params: { speed: 0.3, density: 60 }, layer: 0 },
      dotGrid: { enabled: true, params: { color: "rgba(255,0,128,0.04)", spacing: 16 }, layer: 0 },
      neonText: { enabled: true, params: { color: "#FF0080" }, layer: 1 },
      cursorGlow: { enabled: true, params: { color: "#FF0080", size: 100 }, layer: 2 },
      clickExplosion: { enabled: true, params: { emoji: "👾" }, layer: 3 },
      vignetteOverlay: { enabled: true, params: { intensity: 0.35 }, layer: 3 },
    },
    triggers: {
      onCorrect: ["confetti", "correctBounce", "xpGain"],
      onWrong: ["wrongShake"],
      onLevelUp: ["levelUpCelebration", "confetti"],
      onCombo: ["comboCounter"],
      onBadge: ["badgeUnlock"],
    },
  },

  /* ═══════════════════════════════════════════════════════════
   * 8. Enchanted Forest (마법의 숲)
   *    Dark green · amber fireflies · mystical mist
   * ═══════════════════════════════════════════════════════════ */
  {
    name: "Enchanted Forest",
    version: 1,
    preview: ["#10B981", "#0A1A12", "#FBBF24", "#D1FAE5"],
    variables: {
      "--primary": "#10B981",
      "--primary-light": "#0A2E1E",
      "--primary-container": "#059669",
      "--primary-hover": "#047857",
      "--primary-fixed": "#062E1B",
      "--secondary": "#6B8E23",
      "--secondary-light": "rgba(107,142,35,0.12)",
      "--tertiary": "#FBBF24",
      "--tertiary-light": "rgba(251,191,36,0.12)",
      "--tertiary-container": "rgba(251,191,36,0.08)",
      "--on-tertiary-container": "#F59E0B",
      "--success": "#34D399",
      "--success-light": "rgba(52,211,153,0.12)",
      "--warning": "#FBBF24",
      "--warning-light": "rgba(251,191,36,0.12)",
      "--error": "#F87171",
      "--error-light": "rgba(248,113,113,0.12)",
      "--surface": "#0A1A12",
      "--surface-container-lowest": "#06100A",
      "--surface-container-low": "#0F2318",
      "--surface-container": "#142D1F",
      "--surface-container-high": "#1A3726",
      "--surface-container-highest": "#20412D",
      "--on-surface": "#D1FAE5",
      "--on-surface-variant": "#86EFAC",
      "--outline-variant": "rgba(134,239,172,0.1)",
      "--editor-bg": "#040E08",
      "--shadow-sm": "0 0 8px rgba(16,185,129,0.06)",
      "--shadow": "0 0 16px rgba(16,185,129,0.08)",
      "--shadow-lg": "0 0 32px rgba(16,185,129,0.1)",
      "--shadow-ai": "0 0 20px rgba(251,191,36,0.1)",
      "--shadow-primary": "0 0 16px rgba(16,185,129,0.15)",
      "--shadow-float": "0 0 30px rgba(16,185,129,0.06), 0 0 8px rgba(251,191,36,0.04)",
      "--radius-sm": "8px",
      "--radius-md": "12px",
      "--radius-lg": "16px",
      "--radius-xl": "22px",
      "--radius-full": "9999px",
      "--font-display": "'Nanum Myeongjo', serif",
      "--font-body": "'Pretendard Variable', Pretendard, sans-serif",
      "--border-card": "1px",
      "--border-card-color": "rgba(16,185,129,0.12)",
      "--border-inner": "0px",
      "--border-inner-color": "transparent",
      "--border-text": "0px",
      "--border-text-color": "transparent",
    },
    customCSS: `
h1, h2, .page-title {
  color: #86EFAC !important;
  text-shadow: 0 0 8px rgba(16,185,129,0.3), 0 0 16px rgba(16,185,129,0.1);
  font-style: italic;
}
h3 { color: #6EE7B7; }
.card, .assignment-card, .note-card {
  background: linear-gradient(160deg, rgba(15,35,24,0.9), rgba(10,26,18,0.95)) !important;
  border: 1px solid rgba(16,185,129,0.1) !important;
  box-shadow: inset 0 0 30px rgba(16,185,129,0.02);
}
.card:hover, .assignment-card:hover, .note-card:hover {
  border-color: rgba(16,185,129,0.25) !important;
  box-shadow: 0 0 12px rgba(16,185,129,0.1), 0 0 24px rgba(251,191,36,0.04) !important;
  transform: translateY(-2px);
  transition: all 0.4s ease;
}
.btn-primary, button[class*="primary"] {
  background: linear-gradient(135deg, #059669, #10B981) !important;
  box-shadow: 0 0 10px rgba(16,185,129,0.2);
}
.btn-primary:hover, button[class*="primary"]:hover {
  box-shadow: 0 0 18px rgba(16,185,129,0.35);
}
.sidebar, [class*="sidebar"] {
  background: #06100A !important;
  border-right: 1px solid rgba(16,185,129,0.06) !important;
}
::selection { background: rgba(16,185,129,0.25); color: #D1FAE5; }
::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #059669, #10B981) !important; border-radius: 8px; }
::-webkit-scrollbar-track { background: #06100A !important; }
`,
    animation: "sparkle",
    effects: {
      particles: { enabled: true, params: { color: "#FBBF24", count: 12 }, layer: 0 },
      fogMist: { enabled: true, params: { density: 0.3 }, layer: 0 },
      noiseTexture: { enabled: true, params: { opacity: 0.03 }, layer: 0 },
      glow: { enabled: true, params: { color: "#10B981", intensity: 0.2 }, layer: 1 },
      fadeInScroll: { enabled: true, params: {}, layer: 2 },
      mouseTrail: { enabled: true, params: { shape: "spark", color: "#FBBF24" }, layer: 3 },
    },
    triggers: {
      onCorrect: ["confetti", "correctBounce"],
      onWrong: ["wrongShake"],
      onLevelUp: ["levelUpCelebration"],
      onStreak: ["streakFire"],
    },
  },

  /* ═══════════════════════════════════════════════════════════
   * 9. Cosmic Voyage (우주 항해)
   *    Spaceship HUD · cyan/orange · starfield + warp
   * ═══════════════════════════════════════════════════════════ */
  {
    name: "Cosmic Voyage",
    version: 1,
    preview: ["#00D4FF", "#08080F", "#FF6B35", "#E0F0FF"],
    variables: {
      "--primary": "#00D4FF",
      "--primary-light": "#0A2535",
      "--primary-container": "#00A8CC",
      "--primary-hover": "#0090B0",
      "--primary-fixed": "#081C28",
      "--secondary": "#FF6B35",
      "--secondary-light": "rgba(255,107,53,0.12)",
      "--tertiary": "#A855F7",
      "--tertiary-light": "rgba(168,85,247,0.12)",
      "--tertiary-container": "rgba(168,85,247,0.08)",
      "--on-tertiary-container": "#C084FC",
      "--success": "#4ADE80",
      "--success-light": "rgba(74,222,128,0.12)",
      "--warning": "#FBBF24",
      "--warning-light": "rgba(251,191,36,0.12)",
      "--error": "#FF6B6B",
      "--error-light": "rgba(255,107,107,0.12)",
      "--surface": "#08080F",
      "--surface-container-lowest": "#040408",
      "--surface-container-low": "#0E0E18",
      "--surface-container": "#141422",
      "--surface-container-high": "#1A1A2C",
      "--surface-container-highest": "#222236",
      "--on-surface": "#E0F0FF",
      "--on-surface-variant": "#8AB4CC",
      "--outline-variant": "rgba(138,180,204,0.12)",
      "--editor-bg": "#040406",
      "--shadow-sm": "0 0 8px rgba(0,212,255,0.08)",
      "--shadow": "0 0 16px rgba(0,212,255,0.1)",
      "--shadow-lg": "0 0 32px rgba(0,212,255,0.12)",
      "--shadow-ai": "0 0 24px rgba(168,85,247,0.1)",
      "--shadow-primary": "0 0 20px rgba(0,212,255,0.18)",
      "--shadow-float": "0 0 30px rgba(0,212,255,0.08), 0 0 8px rgba(255,107,53,0.05)",
      "--radius-sm": "4px",
      "--radius-md": "8px",
      "--radius-lg": "12px",
      "--radius-xl": "16px",
      "--radius-full": "9999px",
      "--font-display": "'Fira Code', monospace",
      "--font-body": "'Pretendard Variable', Pretendard, sans-serif",
      "--border-card": "1px",
      "--border-card-color": "rgba(0,212,255,0.15)",
      "--border-inner": "1px",
      "--border-inner-color": "rgba(0,212,255,0.06)",
      "--border-text": "0px",
      "--border-text-color": "transparent",
    },
    customCSS: `
h1, h2, .page-title {
  background: linear-gradient(90deg, #00D4FF, #FF6B35);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-transform: uppercase;
  letter-spacing: 2px;
}
h1::before, .page-title::before {
  content: '◆ ';
  -webkit-text-fill-color: rgba(0,212,255,0.4);
  font-size: 0.6em;
}
h3 { color: #67E8F9; text-transform: uppercase; letter-spacing: 1px; }
.card, .assignment-card, .note-card {
  border: 1px solid rgba(0,212,255,0.12) !important;
  border-top: 2px solid rgba(0,212,255,0.2) !important;
  box-shadow: inset 0 0 30px rgba(0,212,255,0.02);
}
.card:hover, .assignment-card:hover, .note-card:hover {
  border-color: rgba(0,212,255,0.3) !important;
  box-shadow: 0 0 15px rgba(0,212,255,0.12), 0 8px 24px rgba(0,0,0,0.3) !important;
  transform: translateY(-2px);
  transition: all 0.3s ease;
}
.btn-primary, button[class*="primary"] {
  background: linear-gradient(135deg, #00A8CC, #00D4FF) !important;
  box-shadow: 0 0 12px rgba(0,212,255,0.25);
  text-transform: uppercase;
  letter-spacing: 1px;
}
.btn-primary:hover, button[class*="primary"]:hover {
  box-shadow: 0 0 20px rgba(0,212,255,0.4), 0 0 40px rgba(255,107,53,0.08);
}
.sidebar, [class*="sidebar"] {
  background: #040408 !important;
  border-right: 1px solid rgba(0,212,255,0.05) !important;
}
::selection { background: rgba(0,212,255,0.25); color: #E0F0FF; }
::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #00A8CC, #FF6B35) !important; border-radius: 4px; }
::-webkit-scrollbar-track { background: #040408 !important; }
`,
    animation: "particles",
    effects: {
      starfield: { enabled: true, params: { speed: 0.8, density: 80 }, layer: 0 },
      dotGrid: { enabled: true, params: { color: "rgba(0,212,255,0.03)", spacing: 24 }, layer: 0 },
      typewriterTitle: { enabled: true, params: {}, layer: 1 },
      gradientBorder: { enabled: true, params: { color1: "#00D4FF", color2: "#FF6B35" }, layer: 2 },
      cursorGlow: { enabled: true, params: { color: "#00D4FF", size: 120 }, layer: 3 },
      clickExplosion: { enabled: true, params: { emoji: "🚀" }, layer: 3 },
    },
    triggers: {
      onCorrect: ["confetti", "correctBounce"],
      onWrong: ["wrongShake"],
      onLevelUp: ["levelUpCelebration"],
      onCombo: ["comboCounter"],
    },
  },

  /* ═══════════════════════════════════════════════════════════
   * 10. Paper Craft (종이 공예)
   *     Warm cream · red/blue/green accents · notebook lines
   * ═══════════════════════════════════════════════════════════ */
  {
    name: "Paper Craft",
    version: 1,
    preview: ["#E74C3C", "#FFF9F0", "#3498DB", "#2C3E50"],
    variables: {
      "--primary": "#E74C3C",
      "--primary-light": "rgba(231,76,60,0.1)",
      "--primary-container": "#C0392B",
      "--primary-hover": "#CB4335",
      "--primary-fixed": "#F9E0DE",
      "--secondary": "#3498DB",
      "--secondary-light": "rgba(52,152,219,0.1)",
      "--tertiary": "#27AE60",
      "--tertiary-light": "rgba(39,174,96,0.1)",
      "--tertiary-container": "rgba(39,174,96,0.08)",
      "--on-tertiary-container": "#1E8449",
      "--success": "#27AE60",
      "--success-light": "rgba(39,174,96,0.1)",
      "--warning": "#F39C12",
      "--warning-light": "rgba(243,156,18,0.1)",
      "--error": "#E74C3C",
      "--error-light": "rgba(231,76,60,0.1)",
      "--surface": "#FFF9F0",
      "--surface-container-lowest": "#FFFFFF",
      "--surface-container-low": "#FFF5E6",
      "--surface-container": "#FFF0D6",
      "--surface-container-high": "#FFEBC6",
      "--surface-container-highest": "#FFFFFF",
      "--on-surface": "#2C3E50",
      "--on-surface-variant": "#566573",
      "--outline-variant": "rgba(86,101,115,0.12)",
      "--editor-bg": "#1A2332",
      "--shadow-sm": "2px 2px 0 rgba(0,0,0,0.06)",
      "--shadow": "3px 3px 0 rgba(0,0,0,0.08)",
      "--shadow-lg": "4px 4px 0 rgba(0,0,0,0.1)",
      "--shadow-ai": "0 3px 12px rgba(52,152,219,0.08)",
      "--shadow-primary": "0 3px 10px rgba(231,76,60,0.1)",
      "--shadow-float": "3px 3px 0 rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
      "--radius-sm": "4px",
      "--radius-md": "6px",
      "--radius-lg": "8px",
      "--radius-xl": "12px",
      "--radius-full": "9999px",
      "--font-display": "'Nanum Myeongjo', serif",
      "--font-body": "'Noto Sans KR', sans-serif",
      "--border-card": "1px",
      "--border-card-color": "rgba(44,62,80,0.1)",
      "--border-inner": "1px",
      "--border-inner-color": "rgba(44,62,80,0.06)",
      "--border-text": "0px",
      "--border-text-color": "transparent",
    },
    customCSS: `
h1, h2, .page-title {
  color: #2C3E50 !important;
  border-bottom: 2px solid rgba(231,76,60,0.2);
  padding-bottom: 6px;
  letter-spacing: 0.5px;
}
h3 { color: #E74C3C; }
.card, .assignment-card, .note-card {
  background: linear-gradient(135deg, #FFFFFF, #FFF9F0) !important;
  border: 1px solid rgba(44,62,80,0.08) !important;
  box-shadow: 2px 2px 0 rgba(0,0,0,0.04);
  position: relative;
}
.card::before, .assignment-card::before, .note-card::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 20px;
  height: 20px;
  background: linear-gradient(225deg, #FFF0D6 50%, rgba(44,62,80,0.05) 50%);
  pointer-events: none;
}
.card:hover, .assignment-card:hover, .note-card:hover {
  box-shadow: 4px 4px 0 rgba(0,0,0,0.06), 0 0 0 1px rgba(231,76,60,0.1) !important;
  transform: translateY(-1px) rotate(-0.3deg);
  transition: all 0.3s ease;
}
.btn-primary, button[class*="primary"] {
  background: #E74C3C !important;
  box-shadow: 2px 2px 0 rgba(0,0,0,0.08);
}
.btn-primary:hover, button[class*="primary"]:hover {
  transform: translateY(-1px);
  box-shadow: 3px 3px 0 rgba(0,0,0,0.1);
}
.sidebar, [class*="sidebar"] {
  background: linear-gradient(180deg, #FFF5E6, #FFF0D6) !important;
  border-right: 1px solid rgba(44,62,80,0.06) !important;
}
::selection { background: rgba(52,152,219,0.2); color: #2C3E50; }
::-webkit-scrollbar-thumb { background: #E74C3C !important; border-radius: 4px; }
::-webkit-scrollbar-track { background: #FFF9F0 !important; }
`,
    animation: "none",
    effects: {
      noiseTexture: { enabled: true, params: { opacity: 0.02 }, layer: 0 },
      fadeInScroll: { enabled: true, params: {}, layer: 1 },
      drawBorder: { enabled: true, params: {}, layer: 1 },
      softShadow: { enabled: true, params: { depth: 2 }, layer: 2 },
      rippleClick: { enabled: true, params: { color: "#E74C3C" }, layer: 3 },
    },
    triggers: {
      onCorrect: ["confetti", "correctBounce"],
      onWrong: ["wrongShake"],
      onLevelUp: ["levelUpCelebration"],
    },
  },

  /* ═══════════════════════════════════════════════════════════
   * 11. Northern Lights (오로라 나이트)
   *     Dark sky · cyan/purple/green aurora · snow
   * ═══════════════════════════════════════════════════════════ */
  {
    name: "Northern Lights",
    version: 1,
    preview: ["#22D3EE", "#0A0E1A", "#A855F7", "#D1FAE5"],
    variables: {
      "--primary": "#22D3EE",
      "--primary-light": "#0C2A35",
      "--primary-container": "#0891B2",
      "--primary-hover": "#06B6D4",
      "--primary-fixed": "#082830",
      "--secondary": "#A855F7",
      "--secondary-light": "rgba(168,85,247,0.12)",
      "--tertiary": "#34D399",
      "--tertiary-light": "rgba(52,211,153,0.12)",
      "--tertiary-container": "rgba(52,211,153,0.08)",
      "--on-tertiary-container": "#6EE7B7",
      "--success": "#4ADE80",
      "--success-light": "rgba(74,222,128,0.12)",
      "--warning": "#FBBF24",
      "--warning-light": "rgba(251,191,36,0.12)",
      "--error": "#FB7185",
      "--error-light": "rgba(251,113,133,0.12)",
      "--surface": "#0A0E1A",
      "--surface-container-lowest": "#060812",
      "--surface-container-low": "#0F1325",
      "--surface-container": "#151A30",
      "--surface-container-high": "#1C213B",
      "--surface-container-highest": "#232946",
      "--on-surface": "#D1FAE5",
      "--on-surface-variant": "#88CCDD",
      "--outline-variant": "rgba(136,204,221,0.12)",
      "--editor-bg": "#06080F",
      "--shadow-sm": "0 0 8px rgba(34,211,238,0.06)",
      "--shadow": "0 0 16px rgba(34,211,238,0.08)",
      "--shadow-lg": "0 0 32px rgba(34,211,238,0.1)",
      "--shadow-ai": "0 0 24px rgba(168,85,247,0.1)",
      "--shadow-primary": "0 0 20px rgba(34,211,238,0.12)",
      "--shadow-float": "0 0 30px rgba(34,211,238,0.06), 0 0 8px rgba(168,85,247,0.04)",
      "--radius-sm": "8px",
      "--radius-md": "12px",
      "--radius-lg": "18px",
      "--radius-xl": "24px",
      "--radius-full": "9999px",
      "--font-display": "'IBM Plex Sans KR', sans-serif",
      "--font-body": "'Pretendard Variable', Pretendard, sans-serif",
      "--border-card": "1px",
      "--border-card-color": "rgba(34,211,238,0.1)",
      "--border-inner": "0px",
      "--border-inner-color": "transparent",
      "--border-text": "0px",
      "--border-text-color": "transparent",
    },
    customCSS: `
h1, h2, .page-title {
  background: linear-gradient(90deg, #22D3EE, #A855F7, #34D399);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
h3 { color: #67E8F9; }
.card, .assignment-card, .note-card {
  border: 1px solid rgba(34,211,238,0.08) !important;
  box-shadow: inset 0 0 30px rgba(34,211,238,0.02);
}
.card:hover, .assignment-card:hover, .note-card:hover {
  border-color: rgba(34,211,238,0.2) !important;
  box-shadow: 0 0 16px rgba(34,211,238,0.1), 0 0 32px rgba(168,85,247,0.05), inset 0 0 30px rgba(34,211,238,0.02) !important;
  transform: translateY(-2px);
  transition: all 0.4s ease;
}
.btn-primary, button[class*="primary"] {
  background: linear-gradient(135deg, #0891B2, #22D3EE) !important;
  box-shadow: 0 0 12px rgba(34,211,238,0.2);
}
.btn-primary:hover, button[class*="primary"]:hover {
  box-shadow: 0 0 20px rgba(34,211,238,0.35), 0 0 40px rgba(168,85,247,0.08);
}
.sidebar, [class*="sidebar"] {
  background: #060812 !important;
  border-right: 1px solid rgba(34,211,238,0.04) !important;
}
::selection { background: rgba(34,211,238,0.25); color: #D1FAE5; }
::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #22D3EE, #A855F7) !important; border-radius: 8px; }
::-webkit-scrollbar-track { background: #060812 !important; }
`,
    animation: "snow",
    effects: {
      aurora: { enabled: true, params: { color1: "#22D3EE", color2: "#A855F7", color3: "#34D399" }, layer: 0 },
      starfield: { enabled: true, params: { speed: 0.3, density: 60 }, layer: 0 },
      noiseTexture: { enabled: true, params: { opacity: 0.02 }, layer: 0 },
      glow: { enabled: true, params: { color: "#22D3EE", intensity: 0.2 }, layer: 1 },
      fadeInScroll: { enabled: true, params: {}, layer: 2 },
      cursorGlow: { enabled: true, params: { color: "#A855F7", size: 160 }, layer: 3 },
    },
    triggers: {
      onCorrect: ["confetti", "correctBounce"],
      onWrong: ["wrongShake"],
      onLevelUp: ["levelUpCelebration"],
      onBadge: ["badgeUnlock"],
    },
  },
];
