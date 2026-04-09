/**
 * 시험 모드 훅 — 전체화면 강제, 화면 캡쳐(백엔드 프록시), 이탈 감지, 재입장 차단
 */
import { useEffect, useRef, useCallback, useState } from "react";
import api from "./api";

interface ExamConfig {
  exam_mode: boolean;
  screenshot_interval: number;
  max_violations: number;
  screenshot_quality: number;
  fullscreen_required: boolean;
}

interface UseExamModeOptions {
  assignmentId: string;
  enabled: boolean;
}

export function useExamMode({ assignmentId, enabled }: UseExamModeOptions) {
  const [config, setConfig] = useState<ExamConfig | null>(null);
  const [violations, setViolations] = useState(0);
  const [examEnded, setExamEnded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarning, setShowWarning] = useState("");
  const [alreadyEnded, setAlreadyEnded] = useState(false); // 재입장 차단

  const captureIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const endedRef = useRef(false);
  const violationsRef = useRef(0);

  // 시험 설정 로드 + 재입장 체크
  useEffect(() => {
    if (!enabled || !assignmentId) return;
    api.get(`/exam/config/${assignmentId}`).then(({ data }) => setConfig(data)).catch(() => {});
    api.get(`/exam/status/${assignmentId}`).then(({ data }) => {
      if (data.ended) {
        setAlreadyEnded(true);
        setExamEnded(true);
      }
    }).catch(() => {});
  }, [enabled, assignmentId]);

  // 캡쳐 중단
  const stopCapture = useCallback(() => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = undefined;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // 시험 종료 처리
  const endExam = useCallback(async (reason: string = "시험 종료") => {
    if (endedRef.current) return;
    endedRef.current = true;
    setExamEnded(true);
    stopCapture();
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    try {
      await api.post("/exam/violation", {
        assignment_id: assignmentId,
        violation_type: "forced_end",
        violation_count: violationsRef.current,
        detail: reason,
      });
    } catch { /* ignore */ }
  }, [assignmentId, stopCapture]);

  // 스크린샷 캡쳐 + 백엔드 프록시 업로드
  const captureAndUpload = useCallback(async () => {
    if (!streamRef.current || !videoRef.current || !canvasRef.current || !config || endedRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", config.screenshot_quality)
      );
      if (!blob) return;

      const formData = new FormData();
      formData.append("assignment_id", assignmentId);
      formData.append("file", blob, "screenshot.jpg");

      await api.post("/exam/screenshot", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } catch (e) {
      console.warn("[Exam] 스크린샷 업로드 실패:", e);
    }
  }, [assignmentId, config]);

  // 위반 기록
  const recordViolation = useCallback(
    async (type: string, detail: string = "") => {
      if (!config || endedRef.current) return;
      const newCount = violationsRef.current + 1;
      violationsRef.current = newCount;
      setViolations(newCount);

      try {
        await api.post("/exam/violation", {
          assignment_id: assignmentId,
          violation_type: type,
          violation_count: newCount,
          detail,
        });
      } catch { /* ignore */ }

      if (newCount >= config.max_violations) {
        endExam(`${config.max_violations}회 이탈로 자동 종료`);
      } else {
        const remaining = config.max_violations - newCount;
        setShowWarning(
          `⚠️ 화면 이탈 감지 (${newCount}/${config.max_violations}회). ${remaining}회 남음`
        );
        setTimeout(() => setShowWarning(""), 5000);
      }
    },
    [config, assignmentId, endExam]
  );

  // 전체화면 진입
  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch { /* ignore */ }
  }, []);

  // 시험 시작
  const startExam = useCallback(async () => {
    if (!config) return false;

    // 서버에 시험 시작 요청 (재입장 차단 체크)
    try {
      await api.post("/exam/start", { assignment_id: assignmentId });
    } catch (e: any) {
      if (e?.response?.status === 403) {
        setAlreadyEnded(true);
        setExamEnded(true);
        return false;
      }
    }

    if (config.fullscreen_required) await enterFullscreen();

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" } as any,
        audio: false,
      });
      streamRef.current = stream;

      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      videoRef.current = video;
      canvasRef.current = document.createElement("canvas");

      // 주기적 캡쳐 시작
      captureAndUpload();
      captureIntervalRef.current = setInterval(captureAndUpload, config.screenshot_interval * 1000);

      stream.getVideoTracks()[0].onended = () => {
        recordViolation("fullscreen_exit", "화면 공유 중단");
      };

      return true;
    } catch {
      return false;
    }
  }, [config, assignmentId, enterFullscreen, captureAndUpload, recordViolation]);

  // 이탈 감지 + 페이지 떠남 = 시험 종료
  useEffect(() => {
    if (!enabled || !config || endedRef.current) return;

    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull && streamRef.current) {
        recordViolation("fullscreen_exit", "전체화면 해제");
        setTimeout(() => enterFullscreen(), 500);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && streamRef.current) {
        recordViolation("tab_switch", "탭 전환");
      }
    };

    const handleBlur = () => {
      if (streamRef.current) {
        recordViolation("window_blur", "창 포커스 이탈");
      }
    };

    // 페이지 떠남 = 시험 종료
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (streamRef.current && !endedRef.current) {
        endExam("페이지 이탈로 시험 종료");
        e.preventDefault();
        e.returnValue = "시험이 진행 중입니다. 나가면 시험이 종료됩니다.";
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled, config, recordViolation, enterFullscreen, endExam]);

  // 컴포넌트 언마운트 시 시험 종료
  useEffect(() => {
    return () => {
      if (streamRef.current && !endedRef.current) {
        endExam("페이지 이탈로 시험 종료");
      }
      stopCapture();
    };
  }, [stopCapture, endExam]);

  return {
    config,
    violations,
    examEnded,
    alreadyEnded,
    isFullscreen,
    showWarning,
    startExam,
    endExam,
    stopCapture,
  };
}
