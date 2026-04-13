import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useAuthStore } from "../store/authStore";
import AppShell from "../components/common/AppShell";
import ThemePicker from "../components/settings/ThemePicker";
import { getBadgeToastEnabled, setBadgeToastEnabled } from "../components/common/BadgeToast";
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
  const [recoverMsg, setRecoverMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // (test account management removed)

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

        {/* ── 가이드 ── */}
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "var(--on-surface)" }}>가이드</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
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

        {/* ── 알림 설정 ── */}
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "var(--on-surface)" }}>알림</h2>
        <div className="card" style={{ padding: "14px 18px", marginBottom: 28 }}>
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>배지 획득 알림</div>
              <div style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 2 }}>
                도전과제 달성 시 화면 상단에 알림을 표시합니다.
              </div>
            </div>
            <input
              type="checkbox"
              defaultChecked={getBadgeToastEnabled()}
              onChange={(e) => setBadgeToastEnabled(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: "var(--primary)", cursor: "pointer" }}
            />
          </label>
        </div>

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
            <button
              style={{ marginTop: 8, padding: "6px 14px", fontSize: 12, borderRadius: 6, border: "1px solid var(--outline-variant)", background: "var(--surface-container-low)", cursor: "pointer", color: "var(--on-surface)" }}
              onClick={async () => {
                setRecoverMsg(null);
                try {
                  const { data } = await api.post("/auth/recover-enrollments");
                  setRecoverMsg({ type: data.recovered > 0 ? "success" : "success", text: data.message });
                } catch { setRecoverMsg({ type: "error", text: "복구에 실패했습니다." }); }
              }}
            >
              수강 등록 복구 (역할 변경으로 사라진 강의 복구)
            </button>
            {recoverMsg && (
              <div style={{
                marginTop: 6, padding: "8px 12px", borderRadius: 6, fontSize: 12,
                background: recoverMsg.type === "success" ? "var(--success-light, #ecfdf5)" : "var(--error-light, #fef2f2)",
                color: recoverMsg.type === "success" ? "var(--success, #10b981)" : "var(--error, #ef4444)",
              }}>
                {recoverMsg.text}
              </div>
            )}
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

      {/* 테스트 계정 관리 섹션 제거됨 */}
      {false && (
        <div>
          {/* 대상 계정 선택 */}
          <div style={{ marginBottom: 16, padding: 14, borderRadius: "var(--radius-sm)", background: "var(--surface-container-lowest)", border: "1px solid var(--outline-variant)" }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>관리 대상 계정 지정</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>교수 계정</label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", fontSize: 13, borderRadius: "var(--radius-sm)", border: "1px solid var(--outline-variant)", background: "var(--surface-container-lowest)", color: "var(--on-surface)" }}
                >
                  <option value="">자동 감지 (@pikabuddy.admin)</option>
                  {allUsers.filter(u => u.role === "professor").map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>학생 계정</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", fontSize: 13, borderRadius: "var(--radius-sm)", border: "1px solid var(--outline-variant)", background: "var(--surface-container-lowest)", color: "var(--on-surface)" }}
                >
                  <option value="">자동 감지 (@pikabuddy.admin)</option>
                  {allUsers.filter(u => u.role === "student").map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
            </div>
            {(selectedTeacherId || selectedStudentId) && (
              <button
                onClick={() => { setSelectedTeacherId(""); setSelectedStudentId(""); }}
                className="btn btn-ghost"
                style={{ fontSize: 11, padding: "4px 10px", marginTop: 8 }}
              >
                선택 초기화 (자동 감지로 되돌리기)
              </button>
            )}
          </div>

          {/* 현재 상태 */}
          {testStatus && (
            <div style={{ marginBottom: 16, padding: 14, borderRadius: "var(--radius-sm)", background: "var(--surface-container-low)", fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>현재 데이터 상태</span>
                <button onClick={refreshStatus} className="btn btn-ghost" style={{ fontSize: 11, padding: "2px 8px" }}>새로고침</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
                {testStatus.teacher && <div>강의 <b>{testStatus.teacher.courses}</b>개</div>}
                {testStatus.counts?.assignments != null && <div>과제 <b>{testStatus.counts.assignments}</b>개</div>}
                {testStatus.counts?.notes != null && <div>노트 <b>{testStatus.counts.notes}</b>개</div>}
                {testStatus.counts?.submissions != null && <div>제출물 <b>{testStatus.counts.submissions}</b>개</div>}
                {testStatus.counts?.messages != null && <div>메시지 <b>{testStatus.counts.messages}</b>개</div>}
                {testStatus.student && <div>수강 <b>{testStatus.student.enrollments}</b>개</div>}
              </div>
              {/* EXP 정보 */}
              {testStatus.exp && (
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--outline-variant)" }}>
                  <div style={{ display: "flex", gap: 20 }}>
                    {testStatus.exp.teacher && (
                      <div>교수 EXP: <b>{testStatus.exp.teacher.total_exp}</b> ({testStatus.exp.teacher.tier})</div>
                    )}
                    {testStatus.exp.student && (
                      <div>학생 EXP: <b>{testStatus.exp.student.total_exp}</b> ({testStatus.exp.student.tier})</div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 20, marginTop: 4 }}>
                    <div>교수 배지: <b>{testStatus.counts?.badges?.teacher ?? 0}</b>개</div>
                    <div>학생 배지: <b>{testStatus.counts?.badges?.student ?? 0}</b>개</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── 초기화 섹션 ── */}
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>초기화</div>

          {/* 기본 상태 저장 */}
          <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: "var(--radius-sm)", background: "var(--surface-container-lowest)", border: "1px solid var(--outline-variant)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>기본 초기화 상태</div>
                <div style={{ fontSize: 11, color: "var(--on-surface-variant)", marginTop: 2 }}>
                  {hasDefault.exists
                    ? `저장됨 (${new Date(hasDefault.saved_at!).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })})`
                    : "저장된 상태 없음"}
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!confirm("현재 상태를 기본 초기화 상태로 저장하시겠습니까?\n이후 '초기화' 버튼을 누르면 이 상태로 돌아옵니다.")) return;
                  setResetting(true); setResetResult(null);
                  try {
                    await api.post(`/seed/save-default${seedParams()}`);
                    setResetResult({ type: "success", text: "현재 상태가 기본 초기화 상태로 저장되었습니다." });
                    const r = await api.get("/seed/has-default");
                    setHasDefault(r.data);
                  } catch (err: any) {
                    setResetResult({ type: "error", text: err?.response?.data?.detail || "저장 실패" });
                  } finally { setResetting(false); }
                }}
                disabled={resetting}
                className="btn btn-primary" style={{ fontSize: 12, padding: "6px 14px", whiteSpace: "nowrap" }}
              >
                현재 상태 저장
              </button>
            </div>
          </div>

          {/* 3개 초기화 버튼 */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <button
              onClick={async () => {
                if (!hasDefault.exists) { setResetResult({ type: "error", text: "먼저 '현재 상태 저장'을 해주세요." }); return; }
                if (!confirm("저장된 기본 상태로 초기화하시겠습니까?\n현재 데이터가 모두 삭제되고 저장된 상태로 복원됩니다.")) return;
                setResetting(true); setResetResult(null);
                try {
                  await api.post(`/seed/reset-to-default${seedParams()}`);
                  setResetResult({ type: "success", text: "저장된 기본 상태로 초기화 완료!" });
                  refreshStatus();
                } catch (err: any) {
                  setResetResult({ type: "error", text: err?.response?.data?.detail || "초기화 실패" });
                } finally { setResetting(false); }
              }}
              disabled={resetting}
              className="btn btn-primary" style={{ fontSize: 13, padding: "8px 16px", opacity: resetting ? 0.6 : 1 }}
            >
              {resetting ? "처리 중..." : "초기화"}
            </button>
            <button
              onClick={async () => {
                if (!confirm("시드 데이터(파워 초기화)로 되돌리시겠습니까?\n모든 데이터가 삭제되고 기본 데모 데이터로 재설정됩니다.")) return;
                setResetting(true); setResetResult(null);
                try {
                  const res = await api.post(`/seed/reset${seedParams()}`);
                  setResetResult({ type: "success", text: `파워 초기화 완료! 강의 ${res.data.data.courses}, 과제 ${res.data.data.assignments}, 노트 ${res.data.data.notes}, 메시지 ${res.data.data.messages}개` });
                  refreshStatus();
                } catch (err: any) {
                  setResetResult({ type: "error", text: err?.response?.data?.detail || "초기화 실패" });
                } finally { setResetting(false); }
              }}
              disabled={resetting}
              className="btn" style={{ background: "var(--error)", color: "#fff", fontSize: 13, padding: "8px 16px", opacity: resetting ? 0.6 : 1 }}
            >
              파워 초기화 (시드)
            </button>
            <button
              onClick={async () => {
                if (!confirm("모든 데이터를 완전히 삭제하시겠습니까?\n빈 상태가 됩니다.")) return;
                setResetting(true); setResetResult(null);
                try {
                  await api.post(`/seed/clean${seedParams()}`);
                  setResetResult({ type: "success", text: "전체 삭제 완료. 빈 상태입니다." });
                  refreshStatus();
                } catch (err: any) {
                  setResetResult({ type: "error", text: err?.response?.data?.detail || "삭제 실패" });
                } finally { setResetting(false); }
              }}
              disabled={resetting}
              className="btn btn-ghost" style={{ fontSize: 13, padding: "8px 16px", border: "1px solid var(--error)", color: "var(--error)" }}
            >
              전체 삭제
            </button>
          </div>

          {/* 초기화 설명 */}
          <div style={{ fontSize: 11, color: "var(--on-surface-variant)", marginBottom: 16, lineHeight: 1.6, padding: "0 4px" }}>
            <b>초기화</b> = 저장한 기본 상태로 복원 &nbsp;|&nbsp; <b>파워 초기화</b> = 코드에 정의된 시드 데이터로 완전 리셋 &nbsp;|&nbsp; <b>전체 삭제</b> = 데이터 전부 삭제 (빈 상태)
          </div>

          {resetResult && (
            <div style={{
              marginBottom: 16, padding: "10px 14px", borderRadius: "var(--radius-sm)", fontSize: 13,
              background: resetResult.type === "success" ? "var(--success-light)" : "var(--error-light)",
              color: resetResult.type === "success" ? "var(--success)" : "var(--error)", lineHeight: 1.5,
            }}>
              {resetResult.text}
            </div>
          )}

          {/* ── 부분 초기화 ── */}
          <div style={{ marginTop: 8, paddingTop: 16, borderTop: "1px solid var(--outline-variant)" }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>부분 초기화</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {[
                { key: "assignments", label: "과제" },
                { key: "submissions", label: "제출물" },
                { key: "notes", label: "노트" },
                { key: "messages", label: "메시지" },
                { key: "exp", label: "EXP" },
                { key: "badges", label: "배지" },
                { key: "enrollments", label: "수강" },
              ].map(({ key, label }) => (
                <label key={key} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                  borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: 13,
                  border: `1px solid ${partialTargets.has(key) ? "var(--primary)" : "var(--outline-variant)"}`,
                  background: partialTargets.has(key) ? "var(--primary-light, rgba(0,74,198,0.08))" : "var(--surface-container-lowest)",
                  color: partialTargets.has(key) ? "var(--primary)" : "var(--on-surface)",
                  fontWeight: partialTargets.has(key) ? 600 : 400,
                }}>
                  <input
                    type="checkbox"
                    checked={partialTargets.has(key)}
                    onChange={() => setPartialTargets(prev => {
                      const next = new Set(prev);
                      if (next.has(key)) next.delete(key); else next.add(key);
                      return next;
                    })}
                    style={{ display: "none" }}
                  />
                  {label}
                </label>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={async () => {
                  if (partialTargets.size === 0) return;
                  const targets = [...partialTargets];
                  if (!confirm(`선택 항목 초기화: ${targets.join(", ")}\n해당 데이터가 삭제됩니다.`)) return;
                  setResetting(true); setResetResult(null);
                  try {
                    const res = await api.post(`/seed/partial-reset${seedParams()}`, { targets });
                    setResetResult({ type: "success", text: res.data.message });
                    setPartialTargets(new Set());
                    refreshStatus();
                  } catch (err: any) {
                    setResetResult({ type: "error", text: err?.response?.data?.detail || "부분 초기화 실패" });
                  } finally { setResetting(false); }
                }}
                disabled={resetting || partialTargets.size === 0}
                className="btn" style={{
                  fontSize: 13, padding: "8px 16px",
                  background: partialTargets.size > 0 ? "var(--warning, #f59e0b)" : "var(--surface-container)",
                  color: partialTargets.size > 0 ? "#fff" : "var(--on-surface-variant)",
                  opacity: resetting ? 0.6 : 1,
                }}
              >
                선택 항목 초기화 ({partialTargets.size})
              </button>
              {partialTargets.size > 0 && (
                <button onClick={() => setPartialTargets(new Set())} className="btn btn-ghost" style={{ fontSize: 12, padding: "6px 10px" }}>
                  선택 해제
                </button>
              )}
            </div>
            <div style={{ fontSize: 11, color: "var(--on-surface-variant)", marginTop: 8 }}>
              과제를 초기화하면 제출물도 함께 삭제됩니다.
            </div>
          </div>

          {/* ── EXP 설정 ── */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--outline-variant)" }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>EXP / 티어 직접 설정</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>교수 EXP</label>
                <input
                  type="number"
                  min={0}
                  placeholder={testStatus?.exp?.teacher?.total_exp?.toString() || "0"}
                  value={teacherExp}
                  onChange={(e) => setTeacherExp(e.target.value)}
                  className="input"
                  style={{ width: "100%", padding: "8px 12px", fontSize: 13 }}
                />
                {testStatus?.exp?.teacher && (
                  <div style={{ fontSize: 11, color: "var(--on-surface-variant)", marginTop: 2 }}>
                    현재: {testStatus.exp.teacher.total_exp} ({testStatus.exp.teacher.tier})
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>학생 EXP</label>
                <input
                  type="number"
                  min={0}
                  placeholder={testStatus?.exp?.student?.total_exp?.toString() || "0"}
                  value={studentExp}
                  onChange={(e) => setStudentExp(e.target.value)}
                  className="input"
                  style={{ width: "100%", padding: "8px 12px", fontSize: 13 }}
                />
                {testStatus?.exp?.student && (
                  <div style={{ fontSize: 11, color: "var(--on-surface-variant)", marginTop: 2 }}>
                    현재: {testStatus.exp.student.total_exp} ({testStatus.exp.student.tier})
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={async () => {
                const tExp = teacherExp ? parseInt(teacherExp) : undefined;
                const sExp = studentExp ? parseInt(studentExp) : undefined;
                if (tExp === undefined && sExp === undefined) return;
                setResetting(true); setResetResult(null);
                try {
                  const payload: any = {};
                  if (tExp !== undefined) payload.teacher_exp = tExp;
                  if (sExp !== undefined) payload.student_exp = sExp;
                  const res = await api.post(`/seed/set-exp${seedParams()}`, payload);
                  setResetResult({ type: "success", text: "EXP 설정 완료!" });
                  setTeacherExp(""); setStudentExp("");
                  refreshStatus();
                } catch (err: any) {
                  setResetResult({ type: "error", text: err?.response?.data?.detail || "EXP 설정 실패" });
                } finally { setResetting(false); }
              }}
              disabled={resetting || (!teacherExp && !studentExp)}
              className="btn btn-primary" style={{ fontSize: 13, padding: "8px 16px" }}
            >
              EXP 적용
            </button>
            <div style={{ fontSize: 11, color: "var(--on-surface-variant)", marginTop: 6 }}>
              티어는 EXP에 따라 자동 계산됩니다. (Bronze 0 ~ Diamond 5000+)
            </div>
          </div>

          {/* ── 스냅샷 관리 ── */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--outline-variant)" }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>스냅샷 (상태 저장/복원)</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                type="text"
                placeholder="스냅샷 이름 (예: 발표용 데이터)"
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
                className="input"
                style={{ flex: 1, padding: "8px 12px", fontSize: 13 }}
              />
              <button
                onClick={async () => {
                  if (!snapshotName.trim()) return;
                  setSnapshotLoading(true);
                  try {
                    await api.post(`/seed/snapshot${seedParams()}`, { name: snapshotName.trim() });
                    setSnapshotName("");
                    const r = await api.get("/seed/snapshots");
                    setSnapshots(r.data);
                    setResetResult({ type: "success", text: "스냅샷 저장 완료!" });
                  } catch (err: any) {
                    setResetResult({ type: "error", text: err?.response?.data?.detail || "저장 실패" });
                  } finally { setSnapshotLoading(false); }
                }}
                disabled={snapshotLoading || !snapshotName.trim()}
                className="btn btn-primary" style={{ fontSize: 13, padding: "8px 16px", whiteSpace: "nowrap" }}
              >
                {snapshotLoading ? "저장 중..." : "스냅샷 저장"}
              </button>
            </div>

            {snapshots.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {snapshots.map((s) => (
                  <div key={s.id} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                    background: "var(--surface-container-lowest)", borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--outline-variant)",
                  }}>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{s.name}</span>
                    <span style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>
                      {new Date(s.created_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <button
                      onClick={async () => {
                        if (!confirm(`'${s.name}' 스냅샷으로 복원하시겠습니까?\n현재 데이터가 모두 삭제됩니다.`)) return;
                        setSnapshotLoading(true);
                        try {
                          await api.post(`/seed/snapshot/${s.id}/restore${seedParams()}`);
                          setResetResult({ type: "success", text: `'${s.name}' 스냅샷으로 복원 완료!` });
                          refreshStatus();
                        } catch (err: any) {
                          setResetResult({ type: "error", text: err?.response?.data?.detail || "복원 실패" });
                        } finally { setSnapshotLoading(false); }
                      }}
                      className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }}
                    >
                      복원
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`'${s.name}' 스냅샷을 삭제하시겠습니까?`)) return;
                        try {
                          await api.delete(`/seed/snapshot/${s.id}`);
                          setSnapshots(prev => prev.filter(x => x.id !== s.id));
                        } catch { /* ignore */ }
                      }}
                      className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 8px", color: "var(--error)" }}
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "var(--on-surface-variant)", padding: "8px 0" }}>
                저장된 스냅샷이 없습니다.
              </div>
            )}
          </div>
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
