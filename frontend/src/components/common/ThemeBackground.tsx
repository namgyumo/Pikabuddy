import { useThemeStore } from "../../store/themeStore";

/** 테마별 배경 애니메이션 (z-index: 0, 컨텐츠 뒤) */
export default function ThemeBackground() {
  const theme = useThemeStore((s) => s.currentTheme);

  if (theme === "default") return null;

  return <div className={`theme-bg theme-bg-${theme}`} aria-hidden="true" />;
}
