/**
 * DeadlineTimer — 과제 마감 카운트다운 타이머
 * Shows countdown when deadline is within 24 hours.
 * Becomes urgent (red + pulse) when within 1 hour.
 */
import { useState, useEffect } from "react";

interface Props {
  dueDate: string | null | undefined;
  /** Compact mode for inline display */
  compact?: boolean;
}

export default function DeadlineTimer({ dueDate, compact }: Props) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!dueDate) return;
    const target = new Date(dueDate).getTime();

    const update = () => {
      const diff = target - Date.now();
      setRemaining(diff > 0 ? diff : 0);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [dueDate]);

  if (!dueDate || remaining === null) return null;

  // Only show when within 24 hours
  const hours24 = 24 * 60 * 60 * 1000;
  if (remaining > hours24) return null;

  // Already past deadline
  if (remaining === 0) {
    return (
      <div className={`deadline-timer expired ${compact ? "compact" : ""}`}>
        <span className="deadline-icon">⏰</span>
        <span>마감됨</span>
      </div>
    );
  }

  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((remaining % (60 * 1000)) / 1000);

  const isUrgent = remaining < 60 * 60 * 1000; // < 1 hour
  const isCritical = remaining < 10 * 60 * 1000; // < 10 min

  const timeStr = hours > 0
    ? `${hours}시간 ${minutes}분 ${seconds}초`
    : `${minutes}분 ${seconds}초`;

  return (
    <div className={`deadline-timer ${isUrgent ? "urgent" : ""} ${isCritical ? "critical" : ""} ${compact ? "compact" : ""}`}>
      <span className="deadline-icon">{isCritical ? "🚨" : isUrgent ? "⚠️" : "⏳"}</span>
      <span className="deadline-text">마감까지 <strong>{timeStr}</strong></span>
    </div>
  );
}
