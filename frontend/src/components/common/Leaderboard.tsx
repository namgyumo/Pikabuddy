import { useEffect, useState } from "react";
import api from "../../lib/api";

interface LeaderEntry {
  user_id: string;
  name: string;
  avatar_url: string | null;
  exp: number;
  tier: string;
  rank: number;
  is_me: boolean;
}

const TIER_ICONS: Record<string, string> = {
  seed: "\u{1F331}", sprout: "\u{1F33F}", tree: "\u{1F333}",
  bloom: "\u{1F338}", fruit: "\u{1F34E}", forest: "\u{1F332}",
};

const RANK_STYLES: Record<number, { bg: string; color: string; icon: string }> = {
  1: { bg: "linear-gradient(135deg, #fbbf24, #f59e0b)", color: "#78350f", icon: "\u{1F947}" },
  2: { bg: "linear-gradient(135deg, #d1d5db, #9ca3af)", color: "#374151", icon: "\u{1F948}" },
  3: { bg: "linear-gradient(135deg, #fdba74, #f97316)", color: "#7c2d12", icon: "\u{1F949}" },
};

export default function Leaderboard({ courseId }: { courseId: string }) {
  const [board, setBoard] = useState<LeaderEntry[]>([]);
  const [period, setPeriod] = useState<"week" | "month" | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/gamification/leaderboard/${courseId}?period=${period}`)
      .then(({ data }) => setBoard(data))
      .catch(() => setBoard([]))
      .finally(() => setLoading(false));
  }, [courseId, period]);

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>EXP Leaderboard</h3>
        <div style={{ display: "flex", gap: 4 }}>
          {([["week", "주간"], ["month", "월간"], ["all", "전체"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              style={{
                padding: "3px 10px", borderRadius: 8, fontSize: 11, border: "none",
                cursor: "pointer", fontWeight: period === key ? 600 : 400,
                background: period === key ? "var(--primary)" : "var(--surface-container)",
                color: period === key ? "var(--on-primary)" : "var(--on-surface-variant)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 24, color: "var(--on-surface-variant)", fontSize: 13 }}>
          로딩 중...
        </div>
      ) : board.length === 0 ? (
        <div style={{ textAlign: "center", padding: 24, color: "var(--on-surface-variant)", fontSize: 13 }}>
          아직 활동이 없습니다.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {board.map((entry) => {
            const rankStyle = RANK_STYLES[entry.rank];
            const tierBase = entry.tier?.split("_")[0] || "seed";
            const tierIcon = TIER_ICONS[tierBase] || "\u{1F331}";

            return (
              <div
                key={entry.user_id}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: 10,
                  background: entry.is_me ? "var(--primary-light, rgba(99,102,241,0.06))" : "var(--surface-container-low)",
                  border: entry.is_me ? "1px solid var(--primary)" : "1px solid transparent",
                }}
              >
                {/* Rank */}
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: rankStyle ? 16 : 12, fontWeight: 700,
                  background: rankStyle?.bg || "var(--surface-container)",
                  color: rankStyle?.color || "var(--on-surface-variant)",
                }}>
                  {rankStyle ? rankStyle.icon : entry.rank}
                </div>

                {/* Avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "var(--surface-container)", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 600, color: "var(--on-surface-variant)",
                  overflow: "hidden",
                }}>
                  {entry.avatar_url ? (
                    <img src={entry.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    entry.name?.charAt(0)?.toUpperCase() || "?"
                  )}
                </div>

                {/* Name + tier */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: entry.is_me ? 700 : 500, fontSize: 13,
                    color: entry.is_me ? "var(--primary)" : "var(--on-surface)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {entry.name} {entry.is_me && "(나)"}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--on-surface-variant)" }}>
                    {tierIcon} {entry.tier?.replace("_", " ")}
                  </div>
                </div>

                {/* EXP */}
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--primary)" }}>
                  {entry.exp.toLocaleString()} EXP
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
