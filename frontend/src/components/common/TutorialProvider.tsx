import { Joyride, STATUS, EVENTS } from "react-joyride";
import type { EventData, Controls } from "react-joyride";
import { useAuthStore } from "../../store/authStore";
import { useTutorialStore } from "../../store/tutorialStore";
import { getTutorialKey, getTutorialSteps } from "../../lib/tutorials";

export default function TutorialProvider() {
  const user = useAuthStore((s) => s.user);
  const { running, stepIndex, setStepIndex, markCompleted, stop } = useTutorialStore();

  const role = user?.role;
  const tutorialKey = getTutorialKey(role, user?.id);
  const steps = getTutorialSteps(role);

  const handleEvent = (data: EventData, _controls: Controls) => {
    const { status, index, type } = data;

    // Tour finished or skipped → mark done
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      markCompleted(tutorialKey);
      return;
    }

    // Tour end event
    if (type === EVENTS.TOUR_END) {
      stop();
      return;
    }

    // Target not found → skip to next step or finish
    if (type === EVENTS.TARGET_NOT_FOUND) {
      if (index + 1 < steps.length) {
        setStepIndex(index + 1);
      } else {
        markCompleted(tutorialKey);
      }
      return;
    }

    // Advance to next step
    if (type === EVENTS.STEP_AFTER) {
      setStepIndex(index + 1);
    }
  };

  if (!user || steps.length === 0) return null;

  return (
    <Joyride
      steps={steps}
      stepIndex={stepIndex}
      run={running}
      continuous
      buttons={["back", "primary", "skip"]}
      showProgress
      onEvent={handleEvent}
      locale={{
        back: "이전",
        close: "닫기",
        last: "완료",
        next: "다음",
        skip: "건너뛰기",
      }}
      primaryColor="#004AC6"
      textColor="#333"
      backgroundColor="#fff"
      spotlightRadius={12}
      zIndex={10000}
      styles={{
        tooltip: {
          borderRadius: 12,
          padding: "20px 24px",
          fontSize: 14,
        },
        buttonNext: {
          borderRadius: 8,
          padding: "8px 20px",
          fontSize: 13,
          fontWeight: 600,
        },
        buttonBack: {
          color: "#666",
          fontSize: 13,
        },
        buttonSkip: {
          color: "#999",
          fontSize: 12,
        },
      }}
    />
  );
}
