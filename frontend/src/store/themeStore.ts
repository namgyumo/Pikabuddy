import { create } from "zustand";
import { ALLOWED_CSS_VARIABLES } from "../themes";
import type { CustomTheme } from "../themes";

const STORAGE_KEY = "pikabuddy-theme";
const CUSTOM_THEMES_KEY = "pikabuddy-custom-themes";

interface ThemeState {
  currentTheme: string;
  customThemes: CustomTheme[];
  setTheme: (id: string) => void;
  initTheme: () => void;
  addCustomTheme: (json: unknown) => CustomTheme;
  removeCustomTheme: (id: string) => void;
}

function clearCustomStyles() {
  const el = document.documentElement;
  ALLOWED_CSS_VARIABLES.forEach((v) => el.style.removeProperty(v));
}

function applyCustomStyles(variables: Record<string, string>) {
  const el = document.documentElement;
  Object.entries(variables).forEach(([key, value]) => {
    if ((ALLOWED_CSS_VARIABLES as readonly string[]).includes(key)) {
      el.style.setProperty(key, value);
    }
  });
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
    // Basic injection prevention: no semicolons, no url(), no expression()
    if (/[;{}]|url\s*\(|expression\s*\(/i.test(value)) {
      throw new Error(`${key}에 허용되지 않는 문자가 포함되어 있습니다.`);
    }
    cleaned[key] = value;
  }

  if (Object.keys(cleaned).length === 0) {
    throw new Error("최소 1개 이상의 CSS 변수가 필요합니다.");
  }

  return { name: obj.name as string, version: 1, variables: cleaned };
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
      applyCustomStyles(custom.variables);
    } else if (id === "default") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", id);
    }

    localStorage.setItem(STORAGE_KEY, id);
    set({ currentTheme: id });
  },

  initTheme: () => {
    const saved = localStorage.getItem(STORAGE_KEY) || "default";
    const customs = loadCustomThemes();
    const custom = customs.find((t) => t.id === saved);

    if (custom) {
      applyCustomStyles(custom.variables);
    } else if (saved !== "default") {
      document.documentElement.setAttribute("data-theme", saved);
    }

    set({ currentTheme: saved, customThemes: customs });
  },

  addCustomTheme: (json: unknown) => {
    const validated = validateThemeJson(json);
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const theme: CustomTheme = {
      id,
      name: validated.name,
      version: validated.version,
      variables: validated.variables,
      preview: extractPreview(validated.variables),
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
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem(STORAGE_KEY, "default");
      set({ customThemes: updated, currentTheme: "default" });
    } else {
      set({ customThemes: updated });
    }
  },
}));
