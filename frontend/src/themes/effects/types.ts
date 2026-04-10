/* ── Theme Effect System — Type Definitions ── */

export type EffectCategory =
  | "background"
  | "pattern"
  | "element"
  | "text"
  | "interaction"
  | "cursor"
  | "animation"
  | "transition"
  | "visual"
  | "gamification";

export interface EffectParam {
  key: string;
  label: string;
  type: "color" | "number" | "select" | "emoji";
  default: string | number;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
}

export interface EffectDefinition {
  id: string;
  name: string;
  description: string;
  category: EffectCategory;
  params: EffectParam[];
  mode: "ambient" | "event"; // ambient = always-on, event = triggered
  icon: string;
}

export interface EffectConfig {
  enabled: boolean;
  params: Record<string, string | number>;
  layer?: number; // z-index priority: lower = behind, higher = front (default 0)
}

export type EffectsState = Record<string, EffectConfig>;

/** Maps app events to the effects they should trigger */
export type TriggerMap = Record<string, string[]>;

export interface ThemeEffect {
  id: string;
  activate(params: Record<string, any>): void;
  deactivate(): void;
  trigger?(data?: any): void;
  /** If implemented, called by the unified animation loop instead of per-effect RAF */
  tick?(dt: number): void;
}

export const CATEGORY_LABELS: Record<EffectCategory, string> = {
  background: "배경 효과",
  pattern: "배경 패턴",
  element: "요소 스타일",
  text: "텍스트 효과",
  interaction: "인터랙션",
  cursor: "커서 효과",
  animation: "애니메이션",
  transition: "페이지/전환",
  visual: "색상/시각",
  gamification: "게이미피케이션",
};

export const CATEGORY_ICONS: Record<EffectCategory, string> = {
  background: "🌌",
  pattern: "🔳",
  element: "✨",
  text: "🔤",
  interaction: "👆",
  cursor: "🖱️",
  animation: "🎬",
  transition: "🔄",
  visual: "🎨",
  gamification: "🎮",
};
