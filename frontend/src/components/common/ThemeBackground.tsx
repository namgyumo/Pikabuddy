import { useThemeStore } from "../../store/themeStore";

/** Theme background animation (z-index: 0, behind content) */
export default function ThemeBackground() {
  const theme = useThemeStore((s) => s.currentTheme);
  const customThemes = useThemeStore((s) => s.customThemes);

  if (theme === "default") return null;

  // Custom theme: use its animation field
  if (theme.startsWith("custom-")) {
    const custom = customThemes.find((t) => t.id === theme);
    const anim = custom?.animation;
    if (!anim || anim === "none") return null;
    return <div className={`theme-bg theme-bg-custom-${anim}`} aria-hidden="true" />;
  }

  // Built-in theme
  return <div className={`theme-bg theme-bg-${theme}`} aria-hidden="true" />;
}
