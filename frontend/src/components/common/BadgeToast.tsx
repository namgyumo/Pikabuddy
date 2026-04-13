import { useEffect, useState, useRef } from "react";
import api from "../../lib/api";

interface EarnedBadge {
  id: string;
  name: string;
  icon: string;
  desc: string;
  rarity: string;
  earned_at: string;
}

const RARITY_COLORS: Record<string, string> = {
  common: "#9CA3AF",
  rare: "#3B82F6",
  legendary: "#F59E0B",
  hidden: "#8B5CF6",
};

const RARITY_NAMES: Record<string, string> = {
  common: "일반",
  rare: "희귀",
  legendary: "전설",
  hidden: "숨김",
};

export function getBadgeToastEnabled(): boolean {
  return localStorage.getItem("badge_toast_enabled") !== "false";
}

export function setBadgeToastEnabled(v: boolean) {
  localStorage.setItem("badge_toast_enabled", v ? "true" : "false");
}

export default function BadgeToast() {
  const [queue, setQueue] = useState<EarnedBadge[]>([]);
  const [current, setCurrent] = useState<EarnedBadge | null>(null);
  const [visible, setVisible] = useState(false);
  const lastChecked = useRef(localStorage.getItem("badge_last_checked") || new Date().toISOString());
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // Poll for new badges every 15 seconds
  useEffect(() => {
    if (!getBadgeToastEnabled()) return;

    const check = async () => {
      try {
        const { data } = await api.get(`/gamification/me/new-badges?after=${lastChecked.current}`);
        if (data && data.length > 0) {
          const now = new Date().toISOString();
          lastChecked.current = now;
          localStorage.setItem("badge_last_checked", now);
          setQueue((prev) => [...prev, ...data]);
        }
      } catch {
        // ignore
      }
    };

    // Initial check after 2s
    const initial = setTimeout(check, 2000);
    const interval = setInterval(check, 15000);

    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, []);

  // Process queue
  useEffect(() => {
    if (!getBadgeToastEnabled()) return;
    if (current || queue.length === 0) return;

    const next = queue[0];
    setQueue((prev) => prev.slice(1));
    setCurrent(next);
    setVisible(true);

    timer.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setCurrent(null), 400); // wait for exit animation
    }, 4000);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [queue, current]);

  if (!current) return null;

  const rarityColor = RARITY_COLORS[current.rarity] || RARITY_COLORS.common;
  const rarityName = RARITY_NAMES[current.rarity] || "일반";

  const isLegendary = current.rarity === "legendary" || current.rarity === "hidden";

  return (
    <div
      style={{
        position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)",
        zIndex: 10000, pointerEvents: "none",
        animation: visible ? "badgeSlideIn 0.5s ease-out" : "badgeSlideOut 0.4s ease-in forwards",
      }}
    >
      {/* Confetti for legendary/hidden badges */}
      {isLegendary && visible && (
        <div style={{ position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }}>
          {Array.from({ length: 24 }).map((_, i) => {
            const colors = ["#f59e0b", "#ef4444", "#3b82f6", "#22c55e", "#8b5cf6", "#ec4899"];
            const c = colors[i % colors.length];
            const x = (Math.random() - 0.5) * 300;
            const y = -(Math.random() * 200 + 60);
            const r = Math.random() * 720;
            const delay = Math.random() * 0.3;
            const size = 6 + Math.random() * 6;
            return (
              <div key={i} style={{
                position: "absolute", width: size, height: size,
                background: c, borderRadius: Math.random() > 0.5 ? "50%" : "1px",
                animation: `confettiFall 1.2s ${delay}s ease-out forwards`,
                ["--cx" as string]: `${x}px`,
                ["--cy" as string]: `${y}px`,
                ["--cr" as string]: `${r}deg`,
              }} />
            );
          })}
        </div>
      )}

      <div
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 20px", borderRadius: 16,
          background: "var(--surface)", border: `2px solid ${rarityColor}`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.18), 0 0 20px ${rarityColor}40`,
          pointerEvents: "auto", minWidth: 280,
        }}
      >
        {/* Icon with glow */}
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: `${rarityColor}15`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, boxShadow: `0 0 12px ${rarityColor}30`,
          animation: "badgePulse 1.5s ease-in-out infinite",
        }}>
          {current.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: rarityColor, fontWeight: 700, marginBottom: 2 }}>
            {rarityName} 배지 획득!
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--on-surface)" }}>
            {current.name}
          </div>
          <div style={{ fontSize: 11, color: "var(--on-surface-variant)", marginTop: 1 }}>
            {current.desc}
          </div>
        </div>
        {/* Sparkle */}
        <div style={{ fontSize: 20, animation: "badgeSpin 2s linear infinite" }}>
          {current.rarity === "legendary" ? "\u2728" : current.rarity === "rare" ? "\u2B50" : "\u2714\uFE0F"}
        </div>
      </div>

      <style>{`
        @keyframes badgeSlideIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-40px) scale(0.8); }
          to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes badgeSlideOut {
          from { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
          to { opacity: 0; transform: translateX(-50%) translateY(-30px) scale(0.9); }
        }
        @keyframes badgePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes badgeSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes confettiFall {
          0% { opacity: 1; transform: translate(0, 0) rotate(0deg); }
          100% { opacity: 0; transform: translate(var(--cx), var(--cy)) rotate(var(--cr)); }
        }
      `}</style>
    </div>
  );
}
