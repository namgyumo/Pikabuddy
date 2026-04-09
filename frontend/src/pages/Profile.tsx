import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AppShell from "../components/common/AppShell";
import api from "../lib/api";

interface PublicProfile {
  id: string;
  name: string;
  role: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  social_links: Record<string, string> | null;
  profile_color: string | null;
  school: string | null;
  department: string | null;
  created_at: string;
}

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    api.get(`/auth/profile/${userId}`).then(({ data }) => setProfile(data)).catch(() => {}).finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <AppShell><div className="page-center">로딩 중...</div></AppShell>;
  if (!profile) return <AppShell><div className="page-center">프로필을 찾을 수 없습니다.</div></AppShell>;

  const color = profile.profile_color || "#004AC6";
  const roleLabel = profile.role === "professor" ? "교수" : profile.role === "student" ? "학생" : profile.role === "personal" ? "개인" : "";

  return (
    <AppShell>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        {/* 배너 */}
        <div style={{
          height: 180, borderRadius: "0 0 var(--radius-lg) var(--radius-lg)",
          background: profile.banner_url ? `url(${profile.banner_url}) center/cover` : `linear-gradient(135deg, ${color}, ${color}88)`,
        }} />

        {/* 아바타 + 정보 */}
        <div style={{ padding: "0 32px", marginTop: -48 }}>
          <div style={{
            width: 96, height: 96, borderRadius: "50%", overflow: "hidden",
            border: `4px solid var(--surface-container-lowest)`,
            background: "var(--surface-container)", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 36, fontWeight: 700, color,
          }}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              profile.name?.charAt(0)?.toUpperCase() || "U"
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700 }}>{profile.name}</h1>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
              <span className="badge" style={{ background: `${color}20`, color }}>{roleLabel}</span>
              {profile.school && <span style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>{profile.school}</span>}
              {profile.department && <span style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>· {profile.department}</span>}
            </div>
          </div>

          {profile.bio && (
            <p style={{ marginTop: 16, fontSize: 14, color: "var(--on-surface-variant)", lineHeight: 1.6 }}>
              {profile.bio}
            </p>
          )}

          {/* 소셜 링크 */}
          {profile.social_links && Object.keys(profile.social_links).length > 0 && (
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              {profile.social_links.github && (
                <a href={profile.social_links.github} target="_blank" rel="noreferrer"
                  style={{ fontSize: 13, color: "var(--primary)", textDecoration: "none" }}>
                  GitHub
                </a>
              )}
              {profile.social_links.blog && (
                <a href={profile.social_links.blog} target="_blank" rel="noreferrer"
                  style={{ fontSize: 13, color: "var(--primary)", textDecoration: "none" }}>
                  Blog
                </a>
              )}
            </div>
          )}

          <div style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 20 }}>
            가입일: {new Date(profile.created_at).toLocaleDateString("ko-KR")}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
