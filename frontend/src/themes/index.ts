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
  },
};

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
