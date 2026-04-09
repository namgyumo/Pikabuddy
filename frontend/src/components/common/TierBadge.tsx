import { useEffect, useState } from "react";
import api from "../../lib/api";

interface TierData {
  total_exp: number;
  tier: {
    id: string;
    base: string;
    grade: string;
    nameKo: string;
    color: string;
    display: string;
    current_min_exp: number;
    next_min_exp: number | null;
  };
}

const TIER_ICONS: Record<string, string> = {
  seed: "\u{1F331}",    // seedling
  sprout: "\u{1F33F}",  // herb
  tree: "\u{1F333}",    // deciduous tree
  bloom: "\u{1F338}",   // cherry blossom
  fruit: "\u{1F34E}",   // apple
  forest: "\u{1F332}",  // evergreen tree
};

export default function TierBadge({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<TierData | null>(null);

  useEffect(() => {
    api.get("/gamification/me/tier").then(({ data }) => setData(data)).catch(() => {});
  }, []);

  if (!data) return null;

  const { tier, total_exp } = data;
  const icon = TIER_ICONS[tier.base] || "\u{1F331}";
  const progress = tier.next_min_exp
    ? Math.min(100, Math.round(((total_exp - tier.current_min_exp) / (tier.next_min_exp - tier.current_min_exp)) * 100))
    : 100;

  if (compact) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
        <span>{icon}</span>
        <span style={{ fontWeight: 600, color: tier.color }}>{tier.display}</span>
      </div>
    );
  }

  return (
    <div style={{
      padding: "12px 16px", borderRadius: "var(--radius-md)",
      background: "var(--surface-container-low)", border: `1px solid ${tier.color}30`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: tier.color }}>{tier.display}</div>
          <div style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>{total_exp} EXP</div>
        </div>
      </div>
      <div style={{
        height: 6, borderRadius: 3, background: "var(--outline-variant)", overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: `${progress}%`, borderRadius: 3,
          background: `linear-gradient(90deg, ${tier.color}, ${tier.color}cc)`,
          transition: "width 0.5s ease",
        }} />
      </div>
      {tier.next_min_exp && (
        <div style={{ fontSize: 10, color: "var(--on-surface-variant)", marginTop: 4, textAlign: "right" }}>
          다음 등급까지 {tier.next_min_exp - total_exp} EXP
        </div>
      )}
    </div>
  );
}
