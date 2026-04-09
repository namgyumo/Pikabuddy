import type { Step } from "react-joyride";

/** 교수 홈 튜토리얼 — 홈 화면에 존재하는 요소만 타겟팅 */
export const professorSteps: Step[] = [
  {
    target: "[data-tutorial='sidebar-brand']",
    content: "pikabuddy에 오신 것을 환영합니다! 사이드바에서 주요 메뉴를 확인할 수 있어요.",
    placement: "right",
    disableBeacon: true,
  },
  {
    target: "[data-tutorial='create-course']",
    content: "여기서 새 강의를 개설할 수 있습니다. 강의명, 설명, 학습 목표를 입력하세요.",
    placement: "bottom",
  },
  {
    target: "[data-tutorial='sidebar-tier']",
    content: "학습 활동으로 경험치를 쌓고 티어를 올려보세요!",
    placement: "right",
  },
  {
    target: "[data-tutorial='sidebar-settings']",
    content: "설정에서 프로필, 테마, 역할 변경 등을 할 수 있습니다. 튜토리얼을 여기서 끝나요. 강의를 만들어보세요!",
    placement: "right",
  },
];

/** 학생 홈 튜토리얼 */
export const studentSteps: Step[] = [
  {
    target: "[data-tutorial='sidebar-brand']",
    content: "pikabuddy에 오신 것을 환영합니다! AI가 학습을 도와드릴게요.",
    placement: "right",
    disableBeacon: true,
  },
  {
    target: "[data-tutorial='join-course']",
    content: "교수님이 공유한 초대 코드로 강의에 참여할 수 있습니다.",
    placement: "bottom",
  },
  {
    target: "[data-tutorial='sidebar-tier']",
    content: "학습 활동으로 경험치를 쌓고 티어를 올려보세요!",
    placement: "right",
  },
  {
    target: "[data-tutorial='sidebar-settings']",
    content: "설정에서 프로필과 테마를 변경할 수 있습니다. 초대 코드로 강의에 참여해보세요!",
    placement: "right",
  },
];

/** 개인 모드 튜토리얼 */
export const personalSteps: Step[] = [
  {
    target: "[data-tutorial='sidebar-brand']",
    content: "개인 학습 모드에 오신 것을 환영합니다! 혼자서도 AI와 함께 공부할 수 있어요.",
    placement: "right",
    disableBeacon: true,
  },
  {
    target: "[data-tutorial='create-assignment']",
    content: "원하는 주제로 문제를 생성하세요. AI가 자동으로 문제를 만들어줍니다.",
    placement: "bottom",
  },
  {
    target: "[data-tutorial='sidebar-tier']",
    content: "학습 활동으로 경험치를 쌓고 티어를 올려보세요!",
    placement: "right",
  },
  {
    target: "[data-tutorial='sidebar-settings']",
    content: "설정에서 테마를 바꾸거나, 다른 역할로 전환할 수 있습니다. 과제를 만들어보세요!",
    placement: "right",
  },
];

/** 역할별 튜토리얼 키 매핑 (userId 포함) */
export function getTutorialKey(role: string | null | undefined, userId?: string): string {
  const base = role === "professor" ? "professor" : role === "personal" ? "personal" : "student";
  return userId ? `tutorial-${base}-${userId}` : `tutorial-${base}`;
}

/** 역할별 스텝 매핑 */
export function getTutorialSteps(role: string | null | undefined): Step[] {
  if (role === "professor") return professorSteps;
  if (role === "personal") return personalSteps;
  return studentSteps;
}
