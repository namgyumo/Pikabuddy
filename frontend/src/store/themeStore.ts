import { create } from "zustand";
import { ALLOWED_CSS_VARIABLES, sanitizeCSS, loadGoogleFont } from "../themes";
import type { CustomTheme } from "../themes";
import { effectManager } from "../themes/effects";

const STORAGE_KEY = "pikabuddy-theme";
const CUSTOM_THEMES_KEY = "pikabuddy-custom-themes";

interface ThemeState {
  currentTheme: string;
  customThemes: CustomTheme[];
  setTheme: (id: string) => void;
  initTheme: () => void;
  addCustomTheme: (json: unknown) => CustomTheme;
  removeCustomTheme: (id: string) => void;
  saveCustomTheme: (data: {
    id?: string;
    name: string;
    variables: Record<string, string>;
    customCSS?: string;
    animation?: string;
    effects?: Record<string, { enabled: boolean; params: Record<string, string | number>; layer?: number }>;
    triggers?: Record<string, string[]>;
  }) => CustomTheme;
}

function clearCustomStyles() {
  const el = document.documentElement;
  ALLOWED_CSS_VARIABLES.forEach((v) => el.style.removeProperty(v));
  // Remove injected custom CSS
  document.getElementById("pikabuddy-custom-css")?.remove();
}

function applyCustomStyles(variables: Record<string, string>, customCSS?: string) {
  const el = document.documentElement;
  Object.entries(variables).forEach(([key, value]) => {
    if ((ALLOWED_CSS_VARIABLES as readonly string[]).includes(key)) {
      el.style.setProperty(key, value);
      // Auto-load Google Fonts when font variables are set
      if ((key === "--font-display" || key === "--font-body") && value) {
        loadGoogleFont(value);
      }
    }
  });
  // Inject custom CSS if present
  if (customCSS) {
    let styleEl = document.getElementById("pikabuddy-custom-css") as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "pikabuddy-custom-css";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = sanitizeCSS(customCSS);
  }
}

function loadCustomThemes(): CustomTheme[] {
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomThemes(themes: CustomTheme[]) {
  localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes));
}

function validateThemeJson(json: unknown): {
  name: string;
  version: number;
  variables: Record<string, string>;
  customCSS?: string;
  animation?: string;
  effects?: Record<string, { enabled: boolean; params: Record<string, string | number>; layer?: number }>;
  triggers?: Record<string, string[]>;
} {
  if (!json || typeof json !== "object") {
    throw new Error("올바른 JSON 형식이 아닙니다.");
  }
  const obj = json as Record<string, unknown>;

  if (typeof obj.name !== "string" || !obj.name.trim()) {
    throw new Error("테마 이름(name)이 필요합니다.");
  }
  if (obj.version !== 1) {
    throw new Error("지원하는 버전은 1입니다.");
  }
  if (!obj.variables || typeof obj.variables !== "object") {
    throw new Error("variables 객체가 필요합니다.");
  }

  const vars = obj.variables as Record<string, unknown>;
  const cleaned: Record<string, string> = {};
  const allowed = ALLOWED_CSS_VARIABLES as readonly string[];

  for (const [key, value] of Object.entries(vars)) {
    if (!allowed.includes(key)) {
      throw new Error(`허용되지 않는 CSS 변수: ${key}`);
    }
    if (typeof value !== "string") {
      throw new Error(`${key}의 값은 문자열이어야 합니다.`);
    }
    if (/[;{}]|url\s*\(|expression\s*\(/i.test(value)) {
      throw new Error(`${key}에 허용되지 않는 문자가 포함되어 있습니다.`);
    }
    cleaned[key] = value;
  }

  if (Object.keys(cleaned).length === 0) {
    throw new Error("최소 1개 이상의 CSS 변수가 필요합니다.");
  }

  const result: ReturnType<typeof validateThemeJson> = {
    name: obj.name as string, version: 1, variables: cleaned,
  };
  if (typeof obj.customCSS === "string" && obj.customCSS) result.customCSS = obj.customCSS;
  if (typeof obj.animation === "string" && obj.animation) result.animation = obj.animation;
  if (obj.effects && typeof obj.effects === "object") result.effects = obj.effects as typeof result.effects;
  if (obj.triggers && typeof obj.triggers === "object") result.triggers = obj.triggers as typeof result.triggers;
  return result;
}

function extractPreview(
  variables: Record<string, string>
): [string, string, string, string] {
  return [
    variables["--primary"] || "#004AC6",
    variables["--surface"] || "#f5f6fa",
    variables["--tertiary"] || variables["--secondary"] || "#632ECD",
    variables["--on-surface"] || "#1a1c23",
  ];
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  currentTheme: "default",
  customThemes: loadCustomThemes(),

  setTheme: (id: string) => {
    // Clear any previous custom inline styles
    clearCustomStyles();

    const custom = get().customThemes.find((t) => t.id === id);
    if (custom) {
      // Custom theme: remove data-theme, apply inline styles
      document.documentElement.removeAttribute("data-theme");
      applyCustomStyles(custom.variables, custom.customCSS);
      // Always disable all effects first to prevent stacking
      effectManager.disableAll();
      // Apply effects for this custom theme
      if (custom.effects) {
        effectManager.saveState(custom.effects);
        effectManager.applyState(custom.effects);
      }
      // Apply trigger mappings
      effectManager.setTriggers(custom.triggers ?? {});
    } else if (id === "default") {
      document.documentElement.removeAttribute("data-theme");
      effectManager.disableAll();
      effectManager.setTriggers({});
    } else {
      document.documentElement.setAttribute("data-theme", id);
      effectManager.disableAll();
      effectManager.setTriggers({});
    }

    localStorage.setItem(STORAGE_KEY, id);
    set({ currentTheme: id });
  },

  initTheme: () => {
    const saved = localStorage.getItem(STORAGE_KEY) || "default";
    const customs = loadCustomThemes();
    const custom = customs.find((t) => t.id === saved);

    if (custom) {
      applyCustomStyles(custom.variables, custom.customCSS);
      // Load effects for custom theme
      if (custom.effects) {
        effectManager.applyState(custom.effects);
      } else {
        const savedEffects = effectManager.loadState();
        effectManager.applyState(savedEffects);
      }
      effectManager.setTriggers(custom.triggers ?? {});
    } else if (saved !== "default") {
      document.documentElement.setAttribute("data-theme", saved);
    }

    set({ currentTheme: saved, customThemes: customs });
  },

  addCustomTheme: (json: unknown) => {
    const validated = validateThemeJson(json);
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const obj = json as Record<string, unknown>;
    const theme: CustomTheme = {
      id,
      name: validated.name,
      version: validated.version,
      variables: validated.variables,
      preview: extractPreview(validated.variables),
      customCSS: validated.customCSS,
      animation: validated.animation,
      effects: validated.effects,
      triggers: validated.triggers,
      isPreset: obj.isPreset === true ? true : undefined,
    };

    const updated = [...get().customThemes, theme];
    saveCustomThemes(updated);
    set({ customThemes: updated });
    return theme;
  },

  removeCustomTheme: (id: string) => {
    const current = get().currentTheme;
    const updated = get().customThemes.filter((t) => t.id !== id);
    saveCustomThemes(updated);

    // If removing the currently active custom theme, reset to default
    if (current === id) {
      clearCustomStyles();
      effectManager.disableAll();
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem(STORAGE_KEY, "default");
      set({ customThemes: updated, currentTheme: "default" });
    } else {
      set({ customThemes: updated });
    }
  },

  saveCustomTheme: (data) => {
    const existing = data.id ? get().customThemes.find((t) => t.id === data.id) : null;
    const preview: [string, string, string, string] = [
      data.variables["--primary"] || "#004AC6",
      data.variables["--surface"] || "#f5f6fa",
      data.variables["--tertiary"] || data.variables["--secondary"] || "#632ECD",
      data.variables["--on-surface"] || "#1a1c23",
    ];

    if (existing) {
      // Update existing
      const updated: CustomTheme = {
        ...existing,
        name: data.name,
        variables: data.variables,
        customCSS: data.customCSS,
        animation: data.animation,
        effects: data.effects,
        triggers: data.triggers,
        preview,
      };
      const list = get().customThemes.map((t) => (t.id === existing.id ? updated : t));
      saveCustomThemes(list);
      set({ customThemes: list });
      return updated;
    } else {
      // Create new
      const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const theme: CustomTheme = {
        id,
        name: data.name,
        version: 1,
        variables: data.variables,
        customCSS: data.customCSS,
        animation: data.animation,
        effects: data.effects,
        triggers: data.triggers,
        preview,
      };
      const list = [...get().customThemes, theme];
      saveCustomThemes(list);
      set({ customThemes: list });
      return theme;
    }
  },
}));
