import { useEffect, useState } from "react";
import api from "../../lib/api";

interface TierInfo {
  id: string;
  base: string;
  grade: string;
  nameKo: string;
  color: string;
  display: string;
  current_min_exp: number;
  next_min_exp: number | null;
}

interface TierData {
  total_exp: number;
  tier: TierInfo;
}

interface ExpLog {
  event_type: string;
  label: string;
  exp: number;
  created_at: string;
}

interface Breakdown {
  event_type: string;
  label: string;
  total_exp: number;
}

interface RoadmapItem extends TierInfo {
  min_exp: number;
  achieved: boolean;
}

interface DetailData {
  total_exp: number;
  tier: TierInfo;
  recent_logs: ExpLog[];
  breakdown: Breakdown[];
  roadmap: RoadmapItem[];
}

interface BadgeItem {
  id: string;
  name: string;
  desc: string;
  category: string;
  rarity: string;
  icon: string;
  earned: boolean;
  earned_at: string | null;
}

interface CategoryInfo {
  id: string;
  name: string;
  icon: string;
  order: number;
}

interface AchievementData {
  badges: BadgeItem[];
  categories: CategoryInfo[];
  rarities: Record<string, { name: string; color: string }>;
  total: number;
  earned_count: number;
}

const TIER_ICONS: Record<string, string> = {
  seed: "\u{1F331}",
  sprout: "\u{1F33F}",
  tree: "\u{1F333}",
  bloom: "\u{1F338}",
  fruit: "\u{1F34E}",
  forest: "\u{1F332}",
};

export default function TierBadge({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<TierData | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    api.get("/gamification/me/tier").then(({ data }) => setData(data)).catch((err) => console.error("[TierBadge] tier fetch failed:", err));
  }, []);

  if (!data) return null;

  const { tier, total_exp } = data;
  const icon = TIER_ICONS[tier.base] || "\u{1F331}";
  const progress = tier.next_min_exp
    ? Math.min(100, Math.round(((total_exp - tier.current_min_exp) / (tier.next_min_exp - tier.current_min_exp)) * 100))
    : 100;

  if (compact) {
    return (
      <>
        <div
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}
          onClick={() => setShowDetail(true)}
          title="티어 상세 보기"
        >
          <span>{icon}</span>
          <span style={{ fontWeight: 600, color: tier.color }}>{tier.display}</span>
          <span style={{ color: "var(--on-surface-variant)", fontSize: 10 }}>{total_exp} EXP</span>
        </div>
        {showDetail && <TierDetailModal onClose={() => setShowDetail(false)} />}
      </>
    );
  }

  return (
    <>
      <div
        style={{
          padding: "12px 16px", borderRadius: "var(--radius-md)", cursor: "pointer",
          background: "var(--surface-container-low)", border: `1px solid ${tier.color}30`,
        }}
        onClick={() => setShowDetail(true)}
        title="티어 상세 보기"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 24 }}>{icon}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: tier.color }}>{tier.display}</div>
            <div style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>{total_exp} EXP</div>
          </div>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: "var(--outline-variant)", overflow: "hidden" }}>
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
      {showDetail && <TierDetailModal onClose={() => setShowDetail(false)} />}
    </>
  );
}


// ── Detail Modal ──

function TierDetailModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"tier" | "achievements">("tier");
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [achievements, setAchievements] = useState<AchievementData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/gamification/me/detail")
      .then(({ data }) => setDetail(data))
      .catch((err) => console.error("[TierBadge] detail fetch failed:", err))
      .finally(() => setLoading(false));
  }, []);

  const loadAchievements = () => {
    if (achievements) return;
    api.get("/gamification/me/achievements")
      .then(({ data }) => setAchievements(data))
      .catch((err) => console.error("[TierBadge] achievements fetch failed:", err));
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--surface)", borderRadius: "var(--radius-lg)",
          padding: 0, maxWidth: 520, width: "92vw", maxHeight: "85vh",
          overflow: "hidden", boxShadow: "var(--shadow-lg)",
          display: "flex", flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tab bar */}
        <div style={{
          display: "flex", borderBottom: "1px solid var(--outline-variant)",
          background: "var(--surface-container-low)",
        }}>
          <button
            onClick={() => setTab("tier")}
            style={{
              flex: 1, padding: "12px 0", border: "none", background: "none",
              cursor: "pointer", fontSize: 13, fontWeight: tab === "tier" ? 700 : 400,
              color: tab === "tier" ? "var(--primary)" : "var(--on-surface-variant)",
              borderBottom: tab === "tier" ? "2px solid var(--primary)" : "2px solid transparent",
            }}
          >
            티어 정보
          </button>
          <button
            onClick={() => { setTab("achievements"); loadAchievements(); }}
            style={{
              flex: 1, padding: "12px 0", border: "none", background: "none",
              cursor: "pointer", fontSize: 13, fontWeight: tab === "achievements" ? 700 : 400,
              color: tab === "achievements" ? "var(--primary)" : "var(--on-surface-variant)",
              borderBottom: tab === "achievements" ? "2px solid var(--primary)" : "2px solid transparent",
            }}
          >
            도전과제
          </button>
        </div>

        {/* Content */}
        <div style={{ overflow: "auto", flex: 1, padding: 20 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--on-surface-variant)" }}>
              로딩 중...
            </div>
          ) : tab === "tier" ? (
            <TierTab detail={detail} />
          ) : (
            <AchievementsTab data={achievements} />
          )}
        </div>

        {/* Close */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--outline-variant)" }}>
          <button
            onClick={onClose}
            style={{
              width: "100%", padding: "10px 0", borderRadius: "var(--radius-md)",
              border: "1px solid var(--outline-variant)", background: "var(--surface-container-low)",
              color: "var(--on-surface)", cursor: "pointer", fontSize: 13, fontWeight: 500,
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}


// ── Tier Tab ──

function TierTab({ detail }: { detail: DetailData | null }) {
  if (!detail) return null;

  const { tier, total_exp } = detail;
  const icon = TIER_ICONS[tier.base] || "\u{1F331}";
  const progress = tier.next_min_exp
    ? Math.min(100, Math.round(((total_exp - tier.current_min_exp) / (tier.next_min_exp - tier.current_min_exp)) * 100))
    : 100;

  // Group roadmap by base tier
  const groupedRoadmap: { base: string; nameKo: string; color: string; icon: string; items: RoadmapItem[] }[] = [];
  for (const item of detail.roadmap) {
    const last = groupedRoadmap[groupedRoadmap.length - 1];
    if (last && last.base === item.base) {
      last.items.push(item);
    } else {
      groupedRoadmap.push({
        base: item.base, nameKo: item.nameKo, color: item.color,
        icon: TIER_ICONS[item.base] || "\u{1F331}",
        items: [item],
      });
    }
  }

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 36 }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, color: tier.color }}>{tier.display}</div>
          <div style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>총 {total_exp} EXP</div>
        </div>
      </div>

      {/* Progress */}
      {tier.next_min_exp ? (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4, color: "var(--on-surface-variant)" }}>
            <span>{tier.display}</span>
            <span>다음 등급까지 {tier.next_min_exp - total_exp} EXP</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: "var(--outline-variant)", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${progress}%`, borderRadius: 4,
              background: `linear-gradient(90deg, ${tier.color}, ${tier.color}cc)`,
              transition: "width 0.5s ease",
            }} />
          </div>
          <div style={{ fontSize: 11, color: "var(--on-surface-variant)", marginTop: 4, textAlign: "right" }}>
            {total_exp} / {tier.next_min_exp} EXP ({progress}%)
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 20, padding: "8px 12px", borderRadius: 8, background: `${tier.color}15`, color: tier.color, fontSize: 13, fontWeight: 600 }}>
          최고 등급 달성!
        </div>
      )}

      {/* Breakdown */}
      {detail.breakdown.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>활동별 EXP</div>
          {detail.breakdown.map((b) => (
            <div key={b.event_type} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
              <span style={{ color: "var(--on-surface-variant)" }}>{b.label}</span>
              <span style={{ fontWeight: 600 }}>+{b.total_exp} EXP</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent logs */}
      {detail.recent_logs.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>최근 활동</div>
          <div style={{ maxHeight: 140, overflow: "auto" }}>
            {detail.recent_logs.map((log, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0" }}>
                <span style={{ color: "var(--on-surface-variant)" }}>{log.label}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontWeight: 600, color: tier.color }}>+{log.exp}</span>
                  <span style={{ color: "var(--outline)", fontSize: 10 }}>
                    {new Date(log.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Roadmap */}
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>티어 로드맵</div>
        {groupedRoadmap.map((group) => {
          const isCurrentBase = tier.base === group.base;
          return (
            <div key={group.base} style={{
              padding: "8px 12px", borderRadius: 8, marginBottom: 6,
              background: isCurrentBase ? `${group.color}12` : "var(--surface-container-low)",
              border: isCurrentBase ? `1px solid ${group.color}40` : "1px solid transparent",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span>{group.icon}</span>
                <span style={{ fontWeight: 600, fontSize: 13, color: group.color }}>{group.nameKo}</span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {group.items.map((item) => {
                  const isCurrent = tier.id === item.id;
                  return (
                    <div key={item.id} style={{
                      padding: "2px 8px", borderRadius: 4, fontSize: 11,
                      fontWeight: isCurrent ? 700 : 400,
                      background: item.achieved ? `${group.color}25` : "var(--surface-container)",
                      color: item.achieved ? group.color : "var(--outline)",
                      border: isCurrent ? `1.5px solid ${group.color}` : "none",
                    }}>
                      {item.grade} ({item.min_exp})
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}


// ── Achievements Tab ──

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

function AchievementsTab({ data }: { data: AchievementData | null }) {
  const [filter, setFilter] = useState<"all" | "earned" | "unearned">("all");
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  if (!data) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "var(--on-surface-variant)" }}>
        로딩 중...
      </div>
    );
  }

  const { badges, categories, earned_count, total } = data;

  const filtered = badges.filter((b) => {
    if (filter === "earned") return b.earned;
    if (filter === "unearned") return !b.earned;
    return true;
  });

  // Group by category
  const grouped: Record<string, BadgeItem[]> = {};
  for (const b of filtered) {
    grouped[b.category] = grouped[b.category] || [];
    grouped[b.category].push(b);
  }

  return (
    <>
      {/* Summary */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 16, padding: "10px 14px", borderRadius: 8,
        background: "var(--surface-container-low)",
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {earned_count} / {total}
          </div>
          <div style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>달성한 배지</div>
        </div>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: `conic-gradient(var(--primary) ${(earned_count / Math.max(total, 1)) * 360}deg, var(--outline-variant) 0deg)`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: "50%",
            background: "var(--surface-container-low)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700,
          }}>
            {Math.round((earned_count / Math.max(total, 1)) * 100)}%
          </div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {([["all", "전체"], ["earned", "달성"], ["unearned", "미달성"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              padding: "4px 12px", borderRadius: 12, fontSize: 12, border: "none",
              cursor: "pointer", fontWeight: filter === key ? 600 : 400,
              background: filter === key ? "var(--primary)" : "var(--surface-container)",
              color: filter === key ? "var(--on-primary)" : "var(--on-surface-variant)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Badge categories */}
      {categories.map((cat) => {
        const catBadges = grouped[cat.id];
        if (!catBadges || catBadges.length === 0) return null;

        const catEarned = catBadges.filter((b) => b.earned).length;
        const isExpanded = expandedCat === cat.id;

        return (
          <div key={cat.id} style={{ marginBottom: 8 }}>
            <button
              onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 12px", borderRadius: 8, border: "1px solid var(--outline-variant)",
                background: isExpanded ? "var(--surface-container)" : "var(--surface-container-low)",
                cursor: "pointer", fontSize: 13,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>{cat.icon}</span>
                <span style={{ fontWeight: 600 }}>{cat.name}</span>
                <span style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>
                  {catEarned}/{catBadges.length}
                </span>
              </div>
              <span style={{ fontSize: 10, color: "var(--on-surface-variant)", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                &#x25BC;
              </span>
            </button>

            {isExpanded && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 4px" }}>
                {catBadges.map((badge) => (
                  <BadgeCard key={badge.id} badge={badge} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {Object.keys(grouped).length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--on-surface-variant)", fontSize: 13 }}>
          {filter === "earned" ? "아직 달성한 배지가 없습니다." : "모든 배지를 달성했습니다!"}
        </div>
      )}
    </>
  );
}


function BadgeCard({ badge }: { badge: BadgeItem }) {
  const rarityColor = RARITY_COLORS[badge.rarity] || RARITY_COLORS.common;
  const rarityName = RARITY_NAMES[badge.rarity] || "일반";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
      borderRadius: 8, background: badge.earned ? "var(--surface-container-low)" : "var(--surface)",
      border: badge.earned ? `1px solid ${rarityColor}40` : "1px solid var(--outline-variant)",
      opacity: badge.earned ? 1 : 0.55,
    }}>
      <span style={{
        fontSize: 22, width: 36, height: 36, display: "flex",
        alignItems: "center", justifyContent: "center",
        borderRadius: 8, background: badge.earned ? `${rarityColor}15` : "var(--surface-container)",
        filter: badge.earned ? "none" : "grayscale(100%)",
      }}>
        {badge.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{badge.name}</span>
          <span style={{
            fontSize: 9, padding: "1px 5px", borderRadius: 4,
            background: `${rarityColor}20`, color: rarityColor, fontWeight: 600,
          }}>
            {rarityName}
          </span>
        </div>
        <div style={{ fontSize: 11, color: "var(--on-surface-variant)", marginTop: 1 }}>
          {badge.desc}
        </div>
        {badge.earned && badge.earned_at && (
          <div style={{ fontSize: 9, color: "var(--outline)", marginTop: 2 }}>
            {new Date(badge.earned_at).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" })} 달성
          </div>
        )}
      </div>
      {badge.earned && (
        <span style={{ fontSize: 14, color: rarityColor }}>&#x2714;</span>
      )}
    </div>
  );
}
