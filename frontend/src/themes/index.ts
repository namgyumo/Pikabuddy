export interface ThemeDefinition {
  id: string;
  nameKo: string;
  nameEn: string;
  preview: [string, string, string, string]; // primary, surface, accent, text
}

export interface CustomTheme {
  id: string;
  name: string;
  version: number;
  variables: Record<string, string>;
  preview: [string, string, string, string];
  customCSS?: string;
  animation?: string;
  effects?: Record<string, { enabled: boolean; params: Record<string, string | number> }>;
}

/** Allowed CSS variable names for custom themes (whitelist) */
export const ALLOWED_CSS_VARIABLES = [
  "--primary",
  "--primary-light",
  "--primary-container",
  "--primary-hover",
  "--primary-fixed",
  "--secondary",
  "--secondary-light",
  "--tertiary",
  "--tertiary-light",
  "--tertiary-container",
  "--on-tertiary-container",
  "--success",
  "--success-light",
  "--warning",
  "--warning-light",
  "--error",
  "--error-light",
  "--surface",
  "--surface-container-lowest",
  "--surface-container-low",
  "--surface-container",
  "--surface-container-high",
  "--surface-container-highest",
  "--on-surface",
  "--on-surface-variant",
  "--outline-variant",
  "--editor-bg",
  "--shadow-sm",
  "--shadow",
  "--shadow-lg",
  "--shadow-ai",
  "--shadow-primary",
  "--shadow-float",
  "--radius-sm",
  "--radius-md",
  "--radius-lg",
  "--radius-xl",
  "--radius-full",
  "--font-display",
  "--font-body",
  "--border-card",
  "--border-card-color",
  "--border-inner",
  "--border-inner-color",
  "--border-text",
  "--border-text-color",
] as const;

/** Template JSON for custom theme files */
export const CUSTOM_THEME_TEMPLATE = {
  name: "My Custom Theme",
  version: 1,
  variables: {
    "--primary": "#004AC6",
    "--primary-light": "#dce4ff",
    "--primary-container": "#3770e0",
    "--primary-hover": "#003da6",
    "--secondary": "#515F74",
    "--tertiary": "#632ECD",
    "--surface": "#f5f6fa",
    "--surface-container-lowest": "#ffffff",
    "--surface-container-low": "#f0f1f6",
    "--surface-container": "#eaebf2",
    "--surface-container-high": "#e2e4ec",
    "--on-surface": "#1a1c23",
    "--on-surface-variant": "#44474f",
    "--outline-variant": "rgba(68, 71, 79, 0.15)",
    "--editor-bg": "#0f172a",
    "--success": "#10b981",
    "--warning": "#f59e0b",
    "--error": "#ef4444",
    "--border-card": "1px",
    "--border-card-color": "rgba(68, 71, 79, 0.15)",
    "--border-inner": "1px",
    "--border-inner-color": "rgba(68, 71, 79, 0.15)",
    "--border-text": "0px",
    "--border-text-color": "transparent",
  },
};

/* ── Variable groups for GUI editor ── */

export interface VariableDefinition {
  key: string;
  label: string;
  type: "color" | "slider" | "font";
  min?: number;
  max?: number;
  unit?: string;
}

export interface VariableGroup {
  id: string;
  label: string;
  variables: VariableDefinition[];
}

export const VARIABLE_GROUPS: VariableGroup[] = [
  {
    id: "primary",
    label: "주 색상",
    variables: [
      { key: "--primary", label: "메인", type: "color" },
      { key: "--primary-light", label: "밝은 톤", type: "color" },
      { key: "--primary-container", label: "컨테이너", type: "color" },
      { key: "--primary-hover", label: "호버", type: "color" },
    ],
  },
  {
    id: "accent",
    label: "보조 / 강조",
    variables: [
      { key: "--secondary", label: "보조 색상", type: "color" },
      { key: "--secondary-light", label: "보조 밝은", type: "color" },
      { key: "--tertiary", label: "강조 색상", type: "color" },
      { key: "--tertiary-light", label: "강조 밝은", type: "color" },
    ],
  },
  {
    id: "surface",
    label: "배경",
    variables: [
      { key: "--surface", label: "기본 배경", type: "color" },
      { key: "--surface-container-lowest", label: "가장 밝은", type: "color" },
      { key: "--surface-container-low", label: "밝은", type: "color" },
      { key: "--surface-container", label: "보통", type: "color" },
      { key: "--surface-container-high", label: "어두운", type: "color" },
      { key: "--editor-bg", label: "코드 에디터", type: "color" },
    ],
  },
  {
    id: "text",
    label: "텍스트",
    variables: [
      { key: "--on-surface", label: "기본 텍스트", type: "color" },
      { key: "--on-surface-variant", label: "보조 텍스트", type: "color" },
    ],
  },
  {
    id: "status",
    label: "상태",
    variables: [
      { key: "--success", label: "성공", type: "color" },
      { key: "--success-light", label: "성공 배경", type: "color" },
      { key: "--warning", label: "경고", type: "color" },
      { key: "--warning-light", label: "경고 배경", type: "color" },
      { key: "--error", label: "오류", type: "color" },
      { key: "--error-light", label: "오류 배경", type: "color" },
    ],
  },
  {
    id: "shape",
    label: "모서리",
    variables: [
      { key: "--radius-sm", label: "Small", type: "slider", min: 0, max: 20, unit: "px" },
      { key: "--radius-md", label: "Medium", type: "slider", min: 0, max: 28, unit: "px" },
      { key: "--radius-lg", label: "Large", type: "slider", min: 0, max: 36, unit: "px" },
      { key: "--radius-xl", label: "XL", type: "slider", min: 0, max: 48, unit: "px" },
    ],
  },
  {
    id: "border",
    label: "테두리",
    variables: [
      { key: "--border-card", label: "카드 외곽", type: "slider", min: 0, max: 5, unit: "px" },
      { key: "--border-card-color", label: "카드 외곽 색", type: "color" },
      { key: "--border-inner", label: "내부 요소", type: "slider", min: 0, max: 5, unit: "px" },
      { key: "--border-inner-color", label: "내부 요소 색", type: "color" },
      { key: "--border-text", label: "텍스트 장식", type: "slider", min: 0, max: 3, unit: "px" },
      { key: "--border-text-color", label: "텍스트 장식 색", type: "color" },
    ],
  },
  {
    id: "font",
    label: "글꼴",
    variables: [
      { key: "--font-display", label: "제목", type: "font" },
      { key: "--font-body", label: "본문", type: "font" },
    ],
  },
];

export const FONT_OPTIONS = [
  { value: "'Pretendard Variable', Pretendard, sans-serif", label: "Pretendard (기본)" },
  { value: "'Noto Sans KR', sans-serif", label: "Noto Sans KR" },
  { value: "'IBM Plex Sans KR', sans-serif", label: "IBM Plex Sans KR" },
  { value: "system-ui, sans-serif", label: "시스템 기본" },
  { value: "'Fira Code', monospace", label: "Fira Code" },
  { value: "'Nanum Gothic', sans-serif", label: "나눔 고딕" },
  { value: "'Nanum Myeongjo', serif", label: "나눔 명조" },
  { value: "Georgia, serif", label: "Georgia" },
];

export const ANIMATION_PRESETS = [
  { id: "none", label: "없음" },
  { id: "particles", label: "떠다니는 입자" },
  { id: "rain", label: "비" },
  { id: "sparkle", label: "반짝임" },
  { id: "snow", label: "눈" },
  { id: "gradient", label: "그라디언트 흐름" },
] as const;

/** Sanitize user CSS — strip JS injection vectors, keep valid CSS */
export function sanitizeCSS(css: string): string {
  return css
    .replace(/@import\b[^;]*;/gi, "")
    .replace(/expression\s*\(/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/behavior\s*:/gi, "")
    .replace(/-moz-binding\s*:/gi, "")
    .replace(/<\/?script[^>]*>/gi, "");
}

/** Convert rgb()/rgba() or hex to 7-char hex */
export function toHex(color: string): string {
  if (color.startsWith("#")) return color.slice(0, 7);
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) {
    return "#" + [m[1], m[2], m[3]].map((n) => parseInt(n).toString(16).padStart(2, "0")).join("");
  }
  return "#000000";
}

/** Read current computed CSS variable values */
export function getCurrentVariableValues(): Record<string, string> {
  const style = getComputedStyle(document.documentElement);
  const values: Record<string, string> = {};
  for (const key of ALLOWED_CSS_VARIABLES) {
    const val = style.getPropertyValue(key).trim();
    if (val) values[key] = val;
  }
  return values;
}

export const THEMES: ThemeDefinition[] = [
  {
    id: "default",
    nameKo: "기본",
    nameEn: "Default",
    preview: ["#004AC6", "#f5f6fa", "#632ECD", "#1a1c23"],
  },
  {
    id: "spring",
    nameKo: "봄",
    nameEn: "Spring",
    preview: ["#D4618C", "#FFF8F5", "#8B5E3C", "#3D2B1F"],
  },
  {
    id: "summer",
    nameKo: "여름",
    nameEn: "Summer",
    preview: ["#0891B2", "#F0FDFA", "#0D9488", "#134E4A"],
  },
  {
    id: "fall",
    nameKo: "가을",
    nameEn: "Fall",
    preview: ["#C2410C", "#FFFBF5", "#92400E", "#431407"],
  },
  {
    id: "winter",
    nameKo: "겨울",
    nameEn: "Winter",
    preview: ["#6366F1", "#F5F7FF", "#818CF8", "#1E1B4B"],
  },
  {
    id: "retro",
    nameKo: "복고",
    nameEn: "Retro",
    preview: ["#8B6914", "#FAF6EE", "#6B4423", "#3C2415"],
  },
  {
    id: "cyberpunk",
    nameKo: "사이버틱",
    nameEn: "Cyberpunk",
    preview: ["#E040FB", "#0D0D1A", "#00E5FF", "#E0E0FF"],
  },
  {
    id: "playful",
    nameKo: "발랄",
    nameEn: "Playful",
    preview: ["#F97316", "#FFFDF7", "#EAB308", "#422006"],
  },
  {
    id: "flower",
    nameKo: "꽃",
    nameEn: "Flower",
    preview: ["#BE185D", "#FFF5F7", "#A855F7", "#4A1D2E"],
  },
  {
    id: "coding",
    nameKo: "코딩",
    nameEn: "Coding",
    preview: ["#10B981", "#0F172A", "#3B82F6", "#E2E8F0"],
  },
  {
    id: "anime",
    nameKo: "애니메",
    nameEn: "Anime",
    preview: ["#8B5CF6", "#FEF5FF", "#EC4899", "#2E1065"],
  },
];
