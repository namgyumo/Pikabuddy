/* ── Effect Registry — All 58 Effect Definitions ── */

import type { EffectDefinition } from "./types";

export const EFFECT_DEFINITIONS: EffectDefinition[] = [
  /* ═══════════ 1. Background Effects (9) ═══════════ */
  {
    id: "particles",
    name: "파티클",
    description: "부유하는 파티클이 화면을 떠다닙니다",
    category: "background",
    mode: "ambient",
    icon: "🫧",
    params: [
      { key: "color", label: "색상", type: "color", default: "#6C5CE7" },
      { key: "count", label: "개수", type: "number", default: 30, min: 10, max: 100, step: 5 },
    ],
  },
  {
    id: "starfield",
    name: "별 이동",
    description: "별이 다가오듯 흐르는 우주 배경",
    category: "background",
    mode: "ambient",
    icon: "🌟",
    params: [
      { key: "speed", label: "속도", type: "number", default: 1, min: 0.5, max: 3, step: 0.25 },
      { key: "density", label: "밀도", type: "number", default: 100, min: 50, max: 300, step: 25 },
    ],
  },
  {
    id: "aurora",
    name: "오로라",
    description: "오로라 물결 효과",
    category: "background",
    mode: "ambient",
    icon: "🌈",
    params: [
      { key: "color1", label: "색상 1", type: "color", default: "#00ff87" },
      { key: "color2", label: "색상 2", type: "color", default: "#60efff" },
      { key: "color3", label: "색상 3", type: "color", default: "#ff00e5" },
    ],
  },
  {
    id: "matrixRain",
    name: "매트릭스",
    description: "코드 문자가 떨어지는 매트릭스 효과",
    category: "background",
    mode: "ambient",
    icon: "🟢",
    params: [
      { key: "color", label: "색상", type: "color", default: "#00ff00" },
    ],
  },
  {
    id: "bubbles",
    name: "거품",
    description: "투명한 거품이 아래에서 위로 떠오릅니다",
    category: "background",
    mode: "ambient",
    icon: "🫧",
    params: [
      { key: "color", label: "색상", type: "color", default: "#6C5CE7" },
      { key: "count", label: "개수", type: "number", default: 20, min: 5, max: 50, step: 5 },
    ],
  },
  {
    id: "cherryBlossom",
    name: "벚꽃",
    description: "벚꽃잎이 떨어지는 효과",
    category: "background",
    mode: "ambient",
    icon: "🌸",
    params: [],
  },
  {
    id: "autumnLeaves",
    name: "낙엽",
    description: "낙엽이 바람에 흩날리며 떨어집니다",
    category: "background",
    mode: "ambient",
    icon: "🍂",
    params: [],
  },
  {
    id: "lightning",
    name: "번개",
    description: "간헐적 번개 섬광 효과",
    category: "background",
    mode: "ambient",
    icon: "⚡",
    params: [
      { key: "frequency", label: "빈도 (초)", type: "number", default: 5, min: 3, max: 15, step: 1 },
    ],
  },
  {
    id: "fogMist",
    name: "안개",
    description: "안개/미스트 효과",
    category: "background",
    mode: "ambient",
    icon: "🌫️",
    params: [
      { key: "density", label: "밀도", type: "number", default: 0.5, min: 0.1, max: 1, step: 0.1 },
    ],
  },

  /* ═══════════ 2. Pattern Effects (4) ═══════════ */
  {
    id: "dotGrid",
    name: "도트 그리드",
    description: "규칙적인 도트 격자 패턴",
    category: "pattern",
    mode: "ambient",
    icon: "⚫",
    params: [
      { key: "color", label: "색상", type: "color", default: "#888888" },
      { key: "spacing", label: "간격 (px)", type: "number", default: 24, min: 12, max: 48, step: 4 },
    ],
  },
  {
    id: "noiseTexture",
    name: "노이즈 질감",
    description: "필름 같은 미세한 노이즈 오버레이",
    category: "pattern",
    mode: "ambient",
    icon: "📺",
    params: [
      { key: "opacity", label: "불투명도", type: "number", default: 0.05, min: 0.01, max: 0.2, step: 0.01 },
    ],
  },
  {
    id: "geometricPattern",
    name: "기하학 패턴",
    description: "기하학 도형 반복 패턴",
    category: "pattern",
    mode: "ambient",
    icon: "🔷",
    params: [
      {
        key: "shape", label: "도형", type: "select", default: "hexagon",
        options: [
          { value: "triangle", label: "삼각형" },
          { value: "hexagon", label: "육각형" },
          { value: "diamond", label: "마름모" },
          { value: "circle", label: "원형" },
        ],
      },
    ],
  },
  {
    id: "mouseGradient",
    name: "마우스 그라디언트",
    description: "마우스를 따라다니는 그라데이션",
    category: "pattern",
    mode: "ambient",
    icon: "🎯",
    params: [
      { key: "color1", label: "색상 1", type: "color", default: "#6C5CE7" },
      { key: "color2", label: "색상 2", type: "color", default: "#00cec9" },
    ],
  },

  /* ═══════════ 3. Element Style Effects (6) ═══════════ */
  {
    id: "glow",
    name: "발광",
    description: "UI 요소에 발광 효과",
    category: "element",
    mode: "ambient",
    icon: "💡",
    params: [
      { key: "color", label: "색상", type: "color", default: "#6C5CE7" },
      { key: "intensity", label: "강도", type: "number", default: 0.5, min: 0.1, max: 1, step: 0.1 },
    ],
  },
  {
    id: "glassMorphism",
    name: "유리 효과",
    description: "카드에 프로스트 유리 효과",
    category: "element",
    mode: "ambient",
    icon: "🪟",
    params: [
      { key: "blur", label: "블러 (px)", type: "number", default: 12, min: 4, max: 24, step: 2 },
      { key: "opacity", label: "불투명도", type: "number", default: 0.15, min: 0.05, max: 0.5, step: 0.05 },
    ],
  },
  {
    id: "gradientBorder",
    name: "그라디언트 테두리",
    description: "요소 테두리에 그라데이션",
    category: "element",
    mode: "ambient",
    icon: "🌈",
    params: [
      { key: "color1", label: "색상 1", type: "color", default: "#6C5CE7" },
      { key: "color2", label: "색상 2", type: "color", default: "#00cec9" },
    ],
  },
  {
    id: "cardTilt",
    name: "카드 3D 기울기",
    description: "마우스에 따라 카드가 기울어짐",
    category: "element",
    mode: "ambient",
    icon: "🃏",
    params: [
      { key: "intensity", label: "각도", type: "number", default: 10, min: 5, max: 20, step: 1 },
    ],
  },
  {
    id: "softShadow",
    name: "다층 그림자",
    description: "부드러운 다층 그림자",
    category: "element",
    mode: "ambient",
    icon: "🌑",
    params: [
      { key: "depth", label: "깊이", type: "number", default: 3, min: 1, max: 5, step: 1 },
    ],
  },
  {
    id: "drawBorder",
    name: "그리기 테두리",
    description: "호버 시 테두리가 그려지는 애니메이션",
    category: "element",
    mode: "ambient",
    icon: "✏️",
    params: [],
  },

  /* ═══════════ 4. Text Effects (5) ═══════════ */
  {
    id: "glitchText",
    name: "글리치",
    description: "디지털 글리치/깨짐 효과",
    category: "text",
    mode: "ambient",
    icon: "📟",
    params: [],
  },
  {
    id: "rainbowText",
    name: "무지개 텍스트",
    description: "무지개 그라데이션 텍스트",
    category: "text",
    mode: "ambient",
    icon: "🌈",
    params: [],
  },
  {
    id: "textScramble",
    name: "해독 텍스트",
    description: "문자가 해독되듯 나타남",
    category: "text",
    mode: "ambient",
    icon: "🔐",
    params: [],
  },
  {
    id: "wavyText",
    name: "물결 텍스트",
    description: "글자가 물결치는 효과",
    category: "text",
    mode: "ambient",
    icon: "🌊",
    params: [],
  },
  {
    id: "neonText",
    name: "네온 텍스트",
    description: "네온사인 발광 효과",
    category: "text",
    mode: "ambient",
    icon: "💜",
    params: [
      { key: "color", label: "색상", type: "color", default: "#6C5CE7" },
    ],
  },

  /* ═══════════ 5. Interaction Effects (2) ═══════════ */
  {
    id: "rippleClick",
    name: "클릭 물결",
    description: "클릭 시 물결이 퍼지는 효과",
    category: "interaction",
    mode: "ambient",
    icon: "💧",
    params: [
      { key: "color", label: "색상", type: "color", default: "#6C5CE7" },
    ],
  },
  {
    id: "magneticButton",
    name: "자기 버튼",
    description: "커서 방향으로 끌리는 버튼",
    category: "interaction",
    mode: "ambient",
    icon: "🧲",
    params: [
      { key: "strength", label: "강도", type: "number", default: 0.3, min: 0.1, max: 0.6, step: 0.05 },
    ],
  },

  /* ═══════════ 6. Cursor Effects (5) ═══════════ */
  {
    id: "mouseTrail",
    name: "마우스 궤적",
    description: "마우스 이동 경로에 궤적",
    category: "cursor",
    mode: "ambient",
    icon: "✨",
    params: [
      {
        key: "shape", label: "모양", type: "select", default: "dot",
        options: [
          { value: "dot", label: "점" },
          { value: "star", label: "별" },
          { value: "spark", label: "불꽃" },
        ],
      },
      { key: "color", label: "색상", type: "color", default: "#6C5CE7" },
    ],
  },
  {
    id: "cursorGlow",
    name: "커서 후광",
    description: "커서 주변 빛나는 후광",
    category: "cursor",
    mode: "ambient",
    icon: "🔆",
    params: [
      { key: "color", label: "색상", type: "color", default: "#6C5CE7" },
      { key: "size", label: "크기 (px)", type: "number", default: 200, min: 100, max: 400, step: 25 },
    ],
  },
  {
    id: "customCursor",
    name: "커스텀 커서",
    description: "커서 모양 변경",
    category: "cursor",
    mode: "ambient",
    icon: "🖱️",
    params: [
      {
        key: "shape", label: "모양", type: "select", default: "crosshair",
        options: [
          { value: "crosshair", label: "십자선" },
          { value: "star", label: "별" },
          { value: "heart", label: "하트" },
          { value: "pikachu", label: "피카츄" },
        ],
      },
    ],
  },
  {
    id: "clickExplosion",
    name: "클릭 폭발",
    description: "클릭 시 이모지 폭발",
    category: "cursor",
    mode: "ambient",
    icon: "💥",
    params: [
      { key: "emoji", label: "이모지", type: "emoji", default: "⚡" },
    ],
  },
  {
    id: "trailEmoji",
    name: "이모지 꼬리",
    description: "마우스에 이모지가 따라다님",
    category: "cursor",
    mode: "ambient",
    icon: "✨",
    params: [
      { key: "emoji", label: "이모지", type: "emoji", default: "✨" },
    ],
  },

  /* ═══════════ 7. Animation Effects (5) ═══════════ */
  {
    id: "typewriterTitle",
    name: "타이핑 애니메이션",
    description: "타이틀이 타이핑되듯 나타남",
    category: "animation",
    mode: "ambient",
    icon: "⌨️",
    params: [],
  },
  {
    id: "fadeInScroll",
    name: "스크롤 페이드인",
    description: "스크롤 시 요소가 페이드인",
    category: "animation",
    mode: "ambient",
    icon: "📜",
    params: [],
  },
  {
    id: "parallaxScroll",
    name: "패럴랙스",
    description: "스크롤 시 배경이 느리게 이동",
    category: "animation",
    mode: "ambient",
    icon: "🏔️",
    params: [
      { key: "intensity", label: "강도", type: "number", default: 0.3, min: 0.1, max: 0.8, step: 0.1 },
    ],
  },
  {
    id: "pulseElement",
    name: "맥박 효과",
    description: "요소가 맥박처럼 확대/축소",
    category: "animation",
    mode: "ambient",
    icon: "💓",
    params: [],
  },
  {
    id: "countUp",
    name: "카운트업",
    description: "숫자가 0에서 목표값까지 애니메이션",
    category: "animation",
    mode: "ambient",
    icon: "🔢",
    params: [],
  },

  /* ═══════════ 8. Transition Effects (3) ═══════════ */
  {
    id: "pageTransition",
    name: "페이지 전환",
    description: "페이지 전환 애니메이션",
    category: "transition",
    mode: "ambient",
    icon: "📄",
    params: [
      {
        key: "type", label: "유형", type: "select", default: "fade",
        options: [
          { value: "fade", label: "페이드" },
          { value: "slide", label: "슬라이드" },
          { value: "zoom", label: "줌" },
          { value: "flip", label: "뒤집기" },
        ],
      },
    ],
  },
  {
    id: "cardFlip",
    name: "카드 뒤집기",
    description: "카드 클릭 시 3D 뒤집기",
    category: "transition",
    mode: "ambient",
    icon: "🔄",
    params: [],
  },
  {
    id: "skeletonShimmer",
    name: "로딩 시머",
    description: "로딩 스켈레톤 시머 스타일",
    category: "transition",
    mode: "ambient",
    icon: "⏳",
    params: [
      {
        key: "style", label: "스타일", type: "select", default: "wave",
        options: [
          { value: "wave", label: "웨이브" },
          { value: "pulse", label: "펄스" },
          { value: "gradient", label: "그라디언트" },
        ],
      },
    ],
  },

  /* ═══════════ 9. Visual Effects (4) ═══════════ */
  {
    id: "chromaticAberration",
    name: "색수차",
    description: "RGB 분리 색수차 효과",
    category: "visual",
    mode: "ambient",
    icon: "🔴",
    params: [],
  },
  {
    id: "colorShiftScroll",
    name: "색상 전환 스크롤",
    description: "스크롤에 따라 색상 변화",
    category: "visual",
    mode: "ambient",
    icon: "🎨",
    params: [],
  },
  {
    id: "invertHover",
    name: "반전 호버",
    description: "호버 시 색상 반전",
    category: "visual",
    mode: "ambient",
    icon: "🔁",
    params: [],
  },
  {
    id: "vignetteOverlay",
    name: "비네팅",
    description: "화면 모서리 어두움 효과",
    category: "visual",
    mode: "ambient",
    icon: "🔲",
    params: [
      { key: "intensity", label: "강도", type: "number", default: 0.3, min: 0.1, max: 0.8, step: 0.1 },
    ],
  },

  /* ═══════════ 10. Gamification Effects (12) ═══════════ */
  {
    id: "confetti",
    name: "폭죽/색종이",
    description: "정답/완료 시 색종이가 터짐",
    category: "gamification",
    mode: "event",
    icon: "🎉",
    params: [],
  },
  {
    id: "streakFire",
    name: "연속 불꽃",
    description: "연속 정답 시 불꽃 효과",
    category: "gamification",
    mode: "event",
    icon: "🔥",
    params: [
      { key: "threshold", label: "시작 연속수", type: "number", default: 3, min: 2, max: 10, step: 1 },
    ],
  },
  {
    id: "xpGain",
    name: "XP 획득",
    description: "경험치 획득 팝업 애니메이션",
    category: "gamification",
    mode: "event",
    icon: "⭐",
    params: [],
  },
  {
    id: "levelUpCelebration",
    name: "레벨업 축하",
    description: "레벨업 시 화면 전체 연출",
    category: "gamification",
    mode: "event",
    icon: "🆙",
    params: [],
  },
  {
    id: "timerPulse",
    name: "타이머 긴박감",
    description: "시간 임박 시 긴박한 효과",
    category: "gamification",
    mode: "event",
    icon: "⏰",
    params: [],
  },
  {
    id: "wrongShake",
    name: "오답 흔들림",
    description: "오답 시 화면 흔들림",
    category: "gamification",
    mode: "event",
    icon: "❌",
    params: [],
  },
  {
    id: "correctBounce",
    name: "정답 바운스",
    description: "정답 시 통통 바운스",
    category: "gamification",
    mode: "event",
    icon: "✅",
    params: [],
  },
  {
    id: "comboCounter",
    name: "콤보 카운터",
    description: "연속 정답 콤보 표시",
    category: "gamification",
    mode: "event",
    icon: "🔢",
    params: [],
  },
  {
    id: "badgeUnlock",
    name: "뱃지 해금",
    description: "뱃지 획득 팝업 애니메이션",
    category: "gamification",
    mode: "event",
    icon: "🏅",
    params: [],
  },
  {
    id: "rankUpAnimation",
    name: "등급 상승",
    description: "티어 승급 연출",
    category: "gamification",
    mode: "event",
    icon: "👑",
    params: [],
  },
  {
    id: "dailyReward",
    name: "일일 보상",
    description: "일일 보상 오프닝 애니메이션",
    category: "gamification",
    mode: "event",
    icon: "🎁",
    params: [],
  },
  {
    id: "leaderboardShift",
    name: "순위 변동",
    description: "리더보드 순위 슬라이드",
    category: "gamification",
    mode: "event",
    icon: "📊",
    params: [],
  },

  /* ═══════════ 11. Image/Asset Effects (3) ═══════════ */
  {
    id: "customCursorImage",
    name: "커서 이미지",
    description: "나만의 커서 이미지 (기본/포인터/텍스트 상태별)",
    category: "asset",
    mode: "ambient",
    icon: "🖱️",
    params: [
      { key: "default", label: "기본 커서", type: "image", default: "" },
      { key: "pointer", label: "포인터 커서", type: "image", default: "" },
      { key: "text", label: "텍스트 커서", type: "image", default: "" },
    ],
  },
  {
    id: "backgroundImage",
    name: "배경 미디어",
    description: "배경 이미지/GIF/동영상(mp4, webm) 오버레이",
    category: "asset",
    mode: "ambient",
    icon: "🏞️",
    params: [
      { key: "url", label: "이미지/GIF/영상", type: "image", default: "" },
      { key: "opacity", label: "불투명도", type: "number", default: 0.15, min: 0.02, max: 1, step: 0.02 },
      {
        key: "blendMode", label: "블렌드", type: "select", default: "normal",
        options: [
          { value: "normal", label: "기본" },
          { value: "multiply", label: "곱하기" },
          { value: "screen", label: "스크린" },
          { value: "overlay", label: "오버레이" },
          { value: "soft-light", label: "소프트 라이트" },
          { value: "luminosity", label: "광도" },
        ],
      },
      {
        key: "size", label: "크기", type: "select", default: "cover",
        options: [
          { value: "cover", label: "채우기" },
          { value: "contain", label: "맞추기" },
          { value: "auto", label: "원본" },
          { value: "200px", label: "타일 (200px)" },
          { value: "400px", label: "타일 (400px)" },
        ],
      },
      {
        key: "position", label: "위치", type: "select", default: "center",
        options: [
          { value: "center", label: "가운데" },
          { value: "top", label: "위" },
          { value: "bottom", label: "아래" },
          { value: "left", label: "왼쪽" },
          { value: "right", label: "오른쪽" },
        ],
      },
    ],
  },
  {
    id: "mascotSprite",
    name: "마스코트 스프라이트",
    description: "움직이는 캐릭터 마스코트 — 30개 행동 함수 + JSON 스크립트",
    category: "asset",
    mode: "ambient",
    icon: "🐾",
    params: [
      { key: "spriteUrl", label: "스프라이트 시트", type: "image", default: "" },
      { key: "frameCount", label: "프레임 수", type: "number", default: 4, min: 1, max: 32, step: 1 },
      { key: "frameWidth", label: "프레임 너비", type: "number", default: 64, min: 16, max: 512, step: 8 },
      { key: "frameHeight", label: "프레임 높이", type: "number", default: 64, min: 16, max: 512, step: 8 },
      { key: "fps", label: "프레임 속도", type: "number", default: 8, min: 1, max: 30, step: 1 },
      { key: "scale", label: "크기 배율", type: "number", default: 1, min: 0.5, max: 4, step: 0.25 },
      {
        key: "layout", label: "시트 배치", type: "select", default: "horizontal",
        options: [
          { value: "horizontal", label: "가로 (1행)" },
          { value: "vertical", label: "세로 (1열)" },
          { value: "grid", label: "격자 (N×M)" },
        ],
      },
      { key: "cols", label: "격자 열 수", type: "number", default: 4, min: 1, max: 32, step: 1 },
      { key: "posX", label: "X 위치 (px)", type: "number", default: 20, min: 0, max: 500, step: 10 },
      { key: "posY", label: "Y 위치 (px)", type: "number", default: 20, min: 0, max: 500, step: 10 },
      { key: "script", label: "행동 스크립트 (JSON)", type: "textarea", default: "" },
    ],
  },
];

/** Pre-computed category → definitions map (avoids re-creation per render) */
const _categoryMap = new Map<string, EffectDefinition[]>();
for (const def of EFFECT_DEFINITIONS) {
  const list = _categoryMap.get(def.category) || [];
  list.push(def);
  _categoryMap.set(def.category, list);
}

export function getEffectsByCategory() {
  return _categoryMap;
}

export function getEffectDef(id: string) {
  return EFFECT_DEFINITIONS.find((d) => d.id === id);
}
