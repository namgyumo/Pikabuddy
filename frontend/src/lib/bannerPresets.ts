/** Course banner presets — CSS gradients, no external dependency */
export interface BannerPreset {
  id: string;
  label: string;
  gradient: string;
}

export const BANNER_PRESETS: BannerPreset[] = [
  { id: "ocean", label: "Ocean", gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { id: "sunset", label: "Sunset", gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
  { id: "forest", label: "Forest", gradient: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" },
  { id: "midnight", label: "Midnight", gradient: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" },
  { id: "peach", label: "Peach", gradient: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)" },
  { id: "sky", label: "Sky", gradient: "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)" },
  { id: "lavender", label: "Lavender", gradient: "linear-gradient(135deg, #c3cfe2 0%, #f5f7fa 100%)" },
  { id: "fire", label: "Fire", gradient: "linear-gradient(135deg, #f12711 0%, #f5af19 100%)" },
  { id: "aurora", label: "Aurora", gradient: "linear-gradient(135deg, #00c6fb 0%, #005bea 100%)" },
  { id: "rose", label: "Rose", gradient: "linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)" },
  { id: "mint", label: "Mint", gradient: "linear-gradient(135deg, #96fbc4 0%, #f9f586 100%)" },
  { id: "cosmos", label: "Cosmos", gradient: "linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)" },
];

/** Check if a banner_url is a gradient preset ID (starts with "gradient:") */
export function isGradientBanner(url: string | null | undefined): boolean {
  return !!url && url.startsWith("gradient:");
}

/** Get the CSS background value for a banner_url */
export function getBannerStyle(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("gradient:")) {
    const presetId = url.slice("gradient:".length);
    const preset = BANNER_PRESETS.find((p) => p.id === presetId);
    return preset?.gradient || BANNER_PRESETS[0].gradient;
  }
  return `url(${url}) center/cover no-repeat`;
}

/** Resolve effective banner: custom > default */
export function getEffectiveBanner(course: { banner_url?: string | null; custom_banner_url?: string | null }): string | null {
  return course.custom_banner_url || course.banner_url || null;
}
