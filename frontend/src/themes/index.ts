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
  effects?: Record<string, { enabled: boolean; params: Record<string, string | number>; layer?: number }>;
  triggers?: Record<string, string[]>;
  isPreset?: boolean;
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

/** O(1) lookup set for CSS variable validation */
export const ALLOWED_CSS_SET = new Set<string>(ALLOWED_CSS_VARIABLES);

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
      { key: "--font-display", label: "제목 (사이드바·제목·버튼)", type: "font" },
      { key: "--font-body", label: "본문 (텍스트·설명·입력)", type: "font" },
    ],
  },
];

export const FONT_OPTIONS = [
  // ── 한국어 산세리프 ──  (0–19)
  { value: "'Pretendard Variable', Pretendard, sans-serif", label: "Pretendard (기본)" },
  { value: "'Noto Sans KR', sans-serif", label: "Noto Sans KR" },
  { value: "'IBM Plex Sans KR', sans-serif", label: "IBM Plex Sans KR" },
  { value: "'Nanum Gothic', sans-serif", label: "나눔고딕" },
  { value: "'Gothic A1', sans-serif", label: "Gothic A1" },
  { value: "'Gowun Dodum', sans-serif", label: "고운돋움" },
  { value: "'Spoqa Han Sans Neo', sans-serif", label: "스포카 한 산스" },
  { value: "'Do Hyeon', sans-serif", label: "도현" },
  { value: "'Jua', sans-serif", label: "주아" },
  { value: "'Sunflower', sans-serif", label: "해바라기" },
  { value: "'Black Han Sans', sans-serif", label: "블랙 한 산스" },
  { value: "'Gamja Flower', cursive", label: "감자꽃" },
  { value: "'Cute Font', cursive", label: "큐트폰트" },
  { value: "'Poor Story', cursive", label: "푸어스토리" },
  { value: "'Stylish', sans-serif", label: "스타일리시" },
  { value: "'Dongle', sans-serif", label: "동글" },
  { value: "'Gaegu', cursive", label: "개구" },
  { value: "'Single Day', cursive", label: "싱글데이" },
  { value: "'Hi Melody', cursive", label: "하이멜로디" },
  { value: "'Yeon Sung', cursive", label: "연성" },
  // ── 한국어 세리프/명조 ──  (20–24)
  { value: "'Nanum Myeongjo', serif", label: "나눔명조" },
  { value: "'Noto Serif KR', serif", label: "Noto Serif KR" },
  { value: "'Gowun Batang', serif", label: "고운바탕" },
  { value: "'Song Myung', serif", label: "송명" },
  { value: "'Hahmlet', serif", label: "함렛" },
  // ── 한국어 손글씨/장식 ──  (25–34)
  { value: "'Nanum Pen Script', cursive", label: "나눔펜스크립트" },
  { value: "'East Sea Dokdo', cursive", label: "동해독도" },
  { value: "'Dokdo', cursive", label: "독도" },
  { value: "'Orbit', sans-serif", label: "오비트" },
  { value: "'Bagel Fat One', cursive", label: "베이글 팻 원" },
  { value: "'Black And White Picture', sans-serif", label: "흑백사진" },
  { value: "'Gugi', sans-serif", label: "구기" },
  { value: "'Kirang Haerang', cursive", label: "기랑해랑" },
  { value: "'Nanum Brush Script', cursive", label: "나눔붓글씨" },
  { value: "'Grandiflora One', serif", label: "그란디플로라" },
  // ── 영문 산세리프 ──  (35–48)
  { value: "'Inter', sans-serif", label: "Inter" },
  { value: "'Poppins', sans-serif", label: "Poppins" },
  { value: "'Raleway', sans-serif", label: "Raleway" },
  { value: "'Montserrat', sans-serif", label: "Montserrat" },
  { value: "'Outfit', sans-serif", label: "Outfit" },
  { value: "'Space Grotesk', sans-serif", label: "Space Grotesk" },
  { value: "'DM Sans', sans-serif", label: "DM Sans" },
  { value: "'Nunito', sans-serif", label: "Nunito" },
  { value: "'Quicksand', sans-serif", label: "Quicksand" },
  { value: "'Comfortaa', cursive", label: "Comfortaa" },
  { value: "'Manrope', sans-serif", label: "Manrope" },
  { value: "'Plus Jakarta Sans', sans-serif", label: "Plus Jakarta Sans" },
  { value: "'Figtree', sans-serif", label: "Figtree" },
  { value: "'Lexend', sans-serif", label: "Lexend" },
  // ── 영문 세리프 ──  (49–55)
  { value: "'Playfair Display', serif", label: "Playfair Display" },
  { value: "'Merriweather', serif", label: "Merriweather" },
  { value: "'Lora', serif", label: "Lora" },
  { value: "'Libre Baskerville', serif", label: "Libre Baskerville" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "'Cormorant Garamond', serif", label: "Cormorant Garamond" },
  { value: "'Crimson Pro', serif", label: "Crimson Pro" },
  // ── 영문 디스플레이/장식 ──  (56–69)
  { value: "'Abril Fatface', serif", label: "Abril Fatface" },
  { value: "'Lobster', cursive", label: "Lobster" },
  { value: "'Pacifico', cursive", label: "Pacifico" },
  { value: "'Righteous', sans-serif", label: "Righteous" },
  { value: "'Bebas Neue', sans-serif", label: "Bebas Neue" },
  { value: "'Oswald', sans-serif", label: "Oswald" },
  { value: "'Titan One', cursive", label: "Titan One" },
  { value: "'Bangers', cursive", label: "Bangers" },
  { value: "'Bungee', sans-serif", label: "Bungee" },
  { value: "'Permanent Marker', cursive", label: "Permanent Marker" },
  { value: "'Fredoka', sans-serif", label: "Fredoka" },
  { value: "'Lilita One', sans-serif", label: "Lilita One" },
  { value: "'Rubik Vinyl', sans-serif", label: "Rubik Vinyl" },
  { value: "'Bungee Shade', sans-serif", label: "Bungee Shade" },
  // ── 영문 손글씨 ──  (70–80)
  { value: "'Caveat', cursive", label: "Caveat" },
  { value: "'Dancing Script', cursive", label: "Dancing Script" },
  { value: "'Sacramento', cursive", label: "Sacramento" },
  { value: "'Great Vibes', cursive", label: "Great Vibes" },
  { value: "'Satisfy', cursive", label: "Satisfy" },
  { value: "'Architects Daughter', cursive", label: "Architects Daughter" },
  { value: "'Patrick Hand', cursive", label: "Patrick Hand" },
  { value: "'Indie Flower', cursive", label: "Indie Flower" },
  { value: "'Shadows Into Light', cursive", label: "Shadows Into Light" },
  { value: "'Gloria Hallelujah', cursive", label: "Gloria Hallelujah" },
  { value: "'Amatic SC', cursive", label: "Amatic SC" },
  // ── 픽셀/레트로 ──  (81–86)
  { value: "'Press Start 2P', monospace", label: "Press Start 2P" },
  { value: "'VT323', monospace", label: "VT323" },
  { value: "'Silkscreen', monospace", label: "Silkscreen" },
  { value: "'Special Elite', cursive", label: "Special Elite" },
  { value: "'Rock Salt', cursive", label: "Rock Salt" },
  { value: "'Courier Prime', monospace", label: "Courier Prime" },
  // ── 코딩/모노스페이스 ──  (87–90)
  { value: "'Fira Code', monospace", label: "Fira Code" },
  { value: "'JetBrains Mono', monospace", label: "JetBrains Mono" },
  { value: "'Source Code Pro', monospace", label: "Source Code Pro" },
  { value: "'D2Coding', monospace", label: "D2Coding" },
  // ── 시스템 ──  (91)
  { value: "system-ui, sans-serif", label: "시스템 기본" },
];

/** Dynamically load a Google Font by name (idempotent) */
const _loadedFonts = new Set<string>();
export function loadGoogleFont(fontFamily: string) {
  // Extract font name from CSS value like "'Poppins', sans-serif"
  const match = fontFamily.match(/^'([^']+)'/);
  const name = match ? match[1] : fontFamily.split(",")[0].trim().replace(/'/g, "");
  if (!name || _loadedFonts.has(name)) return;
  // Skip system/local fonts
  const skipList = ["system-ui", "Georgia", "Pretendard", "Pretendard Variable"];
  if (skipList.includes(name)) return;
  _loadedFonts.add(name);
  const encoded = name.replace(/ /g, "+");
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@300;400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

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
