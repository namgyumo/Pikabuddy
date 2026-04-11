import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useAuthStore } from "../store/authStore";
import { useTutorialStore } from "../store/tutorialStore";
import AppShell from "../components/common/AppShell";
import ThemePicker from "../components/settings/ThemePicker";
import api from "../lib/api";

export default function Settings() {
  const user = useAuthStore((s) => s.user);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const switchRole = useAuthStore((s) => s.switchRole);
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || "");
  const [school, setSchool] = useState(user?.school || "");
  const [department, setDepartment] = useState(user?.department || "");
  const [studentId, setStudentId] = useState(user?.student_id || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [profileColor, setProfileColor] = useState(user?.profile_color || "#004AC6");
  const [socialGithub, setSocialGithub] = useState(user?.social_links?.github || "");
  const [socialBlog, setSocialBlog] = useState(user?.social_links?.blog || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [roleConfirm, setRoleConfirm] = useState<"professor" | "student" | "personal" | null>(null);

  // Test account reset
  const isTestAccount = (user?.email || "").endsWith("@pikabuddy.admin");
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Avatar crop state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const getCroppedBlob = (src: string, area: Area): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, 256, 256);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob failed"));
        }, "image/png");
      };
      img.onerror = reject;
      img.src = src;
    });
  };

  const handleCropConfirm = async () => {
    if (!cropSrc || !croppedAreaPixels) return;
    setUploading(true);
    setCropSrc(null);
    try {
      const blob = await getCroppedBlob(cropSrc, croppedAreaPixels);
      const formData = new FormData();
      formData.append("file", blob, "avatar.png");
      await api.post("/auth/avatar", formData, { headers: { "Content-Type": "multipart/form-data" } });
      await fetchUser();
      setMessage({ type: "success", text: "프로필 사진이 변경되었습니다." });
    } catch {
      setMessage({ type: "error", text: "업로드에 실패했습니다." });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const update: Record<string, string> = {};
    if (name && name !== user?.name) update.name = name;
    if (school !== (user?.school || "")) update.school = school;
    if (department !== (user?.department || "")) update.department = department;
    if (studentId !== (user?.student_id || "")) update.student_id = studentId;
    if (bio !== (user?.bio || "")) (update as Record<string, unknown>).bio = bio;
    if (profileColor !== (user?.profile_color || "#004AC6")) (update as Record<string, unknown>).profile_color = profileColor;
    const newSocial: Record<string, string> = {};
    if (socialGithub) newSocial.github = socialGithub;
    if (socialBlog) newSocial.blog = socialBlog;
    if (JSON.stringify(newSocial) !== JSON.stringify(user?.social_links || {})) {
      (update as Record<string, unknown>).social_links = newSocial;
    }

    if (Object.keys(update).length === 0) {
      setMessage({ type: "error", text: "변경된 내용이 없습니다." });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await api.patch("/auth/profile", update);
      await fetchUser();
      setMessage({ type: "success", text: "프로필이 저장되었습니다." });
    } catch {
      setMessage({ type: "error", text: "저장에 실패했습니다." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div style={{ padding: "32px 40px", maxWidth: 600 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>계정 설정</h1>
        <p style={{ color: "var(--on-surface-variant)", fontSize: 14, marginBottom: 28 }}>
          프로필 정보와 앱 외관을 설정할 수 있습니다.
        </p>

        {/* ── 튜토리얼 ── */}
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "var(--on-surface)" }}>튜토리얼</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              useTutorialStore.getState().resetAll();
              const home = user?.role === "professor" ? "/professor" : user?.role === "personal" ? "/personal" : "/student";
              navigate(home);
              setTimeout(() => useTutorialStore.getState().start(), 600);
            }}
          >
            튜토리얼 다시 보기
          </button>
          <a
            href="/guide.html"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2h7l3 3v7H2V2z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 8h4M5 10h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            PikaBuddy 사용법 가이드
          </a>
        </div>

        {/* ── 외관 설정 ── */}
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "var(--on-surface)" }}>외관</h2>
        <ThemePicker />
        <div style={{ height: 28 }} />

        {/* ── 프로필 설정 ── */}
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "var(--on-surface)" }}>프로필</h2>

        {/* 아바타 & 배너 */}
        <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 20 }}>
          <div style={{ position: "relative" }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%", overflow: "hidden",
              border: `3px solid ${profileColor}`, background: "var(--surface-container)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700,
              color: "var(--primary)",
            }}>
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                user?.name?.charAt(0)?.toUpperCase() || "U"
              )}
            </div>
            <label style={{
              position: "absolute", bottom: -2, right: -2, width: 24, height: 24,
              borderRadius: "50%", background: "var(--primary)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 12, border: "2px solid var(--surface-container-lowest)",
            }}>
              +
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileSelect} />
            </label>
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>프로필 사진</div>
            <div style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>
              {uploading ? "업로드 중..." : "클릭하여 변경"}
            </div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <label style={labelStyle}>프로필 색상</label>
            <input type="color" value={profileColor} onChange={(e) => setProfileColor(e.target.value)}
              style={{ width: 40, height: 32, border: "none", cursor: "pointer", borderRadius: 4 }} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Email (read-only) */}
          <div>
            <label style={labelStyle}>이메일</label>
            <input
              type="text"
              value={user?.email || ""}
              disabled
              style={{ ...inputStyle, background: "var(--surface-container)", color: "var(--on-surface-variant)" }}
            />
          </div>

          {/* Role (switchable) */}
          <div>
            <label style={labelStyle}>역할</label>
            <select
              value={user?.role || ""}
              onChange={(e) => {
                const newRole = e.target.value as "professor" | "student" | "personal";
                if (newRole === user?.role) return;
                setRoleConfirm(newRole);
                // 셀렉트 값 되돌리기 (확인 전까지)
                e.target.value = user?.role || "";
              }}
              style={inputStyle}
            >
              <option value="professor">교수</option>
              <option value="student">학생</option>
              <option value="personal">개인</option>
            </select>
          </div>

          {/* Name */}
          <div>
            <label style={labelStyle}>닉네임</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              style={inputStyle}
            />
          </div>

          {/* School */}
          <div>
            <label style={labelStyle}>학교</label>
            <input
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="소속 학교를 입력하세요"
              style={inputStyle}
            />
          </div>

          {/* Department */}
          <div>
            <label style={labelStyle}>학과 / 소속</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="학과 또는 소속을 입력하세요"
              style={inputStyle}
            />
          </div>

          {/* Student ID */}
          {user?.role === "student" && (
            <div>
              <label style={labelStyle}>학번</label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="학번을 입력하세요"
                style={inputStyle}
              />
            </div>
          )}

          {/* Bio */}
          <div>
            <label style={labelStyle}>자기소개</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="자기소개를 작성하세요"
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Social Links */}
          <div>
            <label style={labelStyle}>GitHub</label>
            <input
              type="text"
              value={socialGithub}
              onChange={(e) => setSocialGithub(e.target.value)}
              placeholder="https://github.com/username"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>블로그</label>
            <input
              type="text"
              value={socialBlog}
              onChange={(e) => setSocialBlog(e.target.value)}
              placeholder="https://blog.example.com"
              style={inputStyle}
            />
          </div>
        </div>

        {message && (
          <div
            style={{
              marginTop: 16,
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              fontSize: 13,
              background: message.type === "success" ? "var(--success-light)" : "var(--error-light)",
              color: message.type === "success" ? "var(--success)" : "var(--error)",
            }}
          >
            {message.text}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            marginTop: 24,
            padding: "10px 28px",
            background: "var(--primary)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-sm)",
            fontSize: 14,
            fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>

      {/* ── 테스트 계정 관리 (테스트 계정만 표시) ── */}
      {isTestAccount && (
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: "2px solid var(--outline-variant)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "var(--error)", display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            테스트 계정 관리
          </h2>
          <p style={{ fontSize: 13, color: "var(--on-surface-variant)", marginBottom: 16, lineHeight: 1.6 }}>
            테스트 데이터를 초기 상태로 되돌립니다. 교수/학생 두 테스트 계정의 모든 강의, 과제, 노트,
            제출물, AI 분석 데이터가 삭제된 후 미리 준비된 데모 데이터로 다시 채워집니다.
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={async () => {
                if (!confirm("정말 테스트 계정을 초기화하시겠습니까?\n모든 데이터가 삭제되고 시드 데이터로 재설정됩니다.")) return;
                setResetting(true);
                setResetResult(null);
                try {
                  const res = await api.post("/seed/reset");
                  setResetResult({
                    type: "success",
                    text: `초기화 완료! 강의 ${res.data.data.courses}개, 과제 ${res.data.data.assignments}개, 노트 ${res.data.data.notes}개, 제출물 ${res.data.data.submissions}개, 메시지 ${res.data.data.messages}개, 코멘트 ${res.data.data.note_comments}개, 뱃지 ${res.data.data.badges}개 생성됨`,
                  });
                } catch (err: any) {
                  setResetResult({
                    type: "error",
                    text: err?.response?.data?.detail || "초기화에 실패했습니다.",
                  });
                } finally {
                  setResetting(false);
                }
              }}
              disabled={resetting}
              style={{
                padding: "10px 24px",
                background: resetting ? "var(--on-surface-variant)" : "var(--error)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-sm)",
                fontSize: 14,
                fontWeight: 700,
                cursor: resetting ? "not-allowed" : "pointer",
                opacity: resetting ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {resetting ? (
                <>
                  <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                  초기화 중...
                </>
              ) : (
                "테스트 계정 초기화"
              )}
            </button>
            <span style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>
              현재 계정: {user?.email}
            </span>
          </div>
          {resetResult && (
            <div style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              fontSize: 13,
              background: resetResult.type === "success" ? "var(--success-light)" : "var(--error-light)",
              color: resetResult.type === "success" ? "var(--success)" : "var(--error)",
              lineHeight: 1.5,
            }}>
              {resetResult.text}
            </div>
          )}
        </div>
      )}

      {/* 아바타 크롭 모달 */}
      {cropSrc && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "var(--surface-container-lowest)", borderRadius: 16,
            width: "min(90vw, 480px)", overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--outline-variant)" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>프로필 사진 자르기</h3>
            </div>
            <div style={{ position: "relative", height: 360, background: "#111" }}>
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div style={{ padding: "12px 24px" }}>
              <label style={{ fontSize: 12, color: "var(--on-surface-variant)", marginBottom: 4, display: "block" }}>확대</label>
              <input type="range" min={1} max={3} step={0.05} value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                style={{ width: "100%" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 24px", borderTop: "1px solid var(--outline-variant)" }}>
              <button className="btn btn-ghost" onClick={() => setCropSrc(null)}>취소</button>
              <button className="btn btn-primary" onClick={handleCropConfirm}>적용</button>
            </div>
          </div>
        </div>
      )}

      {/* 역할 변경 확인 모달 */}
      {roleConfirm && (
        <div className="confirm-overlay" onClick={() => setRoleConfirm(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <polyline points="17 11 19 13 23 9"/>
              </svg>
            </div>
            <h3 className="confirm-title">역할 변경</h3>
            <p className="confirm-desc">
              <strong>{roleConfirm === "professor" ? "교수" : roleConfirm === "student" ? "학생" : "개인"}</strong> 모드로 전환하시겠습니까?
              <br />역할에 따라 사용할 수 있는 기능이 달라집니다.
            </p>
            <div className="confirm-actions">
              <button className="btn btn-secondary" onClick={() => setRoleConfirm(null)}>취소</button>
              <button className="btn btn-primary" onClick={async () => {
                const r = roleConfirm;
                setRoleConfirm(null);
                await switchRole(r);
                navigate(r === "professor" ? "/professor" : r === "personal" ? "/personal" : "/student");
              }}>변경</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--on-surface)",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "1px solid var(--outline-variant)",
  borderRadius: "var(--radius-sm)",
  fontSize: 14,
  background: "var(--surface-container-lowest)",
  color: "var(--on-surface)",
  boxSizing: "border-box",
};
