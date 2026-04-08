import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import AppShell from "../components/common/AppShell";
import api from "../lib/api";

export default function Settings() {
  const user = useAuthStore((s) => s.user);
  const fetchUser = useAuthStore((s) => s.fetchUser);

  const [name, setName] = useState(user?.name || "");
  const [school, setSchool] = useState(user?.school || "");
  const [department, setDepartment] = useState(user?.department || "");
  const [studentId, setStudentId] = useState(user?.student_id || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = async () => {
    const update: Record<string, string> = {};
    if (name && name !== user?.name) update.name = name;
    if (school !== (user?.school || "")) update.school = school;
    if (department !== (user?.department || "")) update.department = department;
    if (studentId !== (user?.student_id || "")) update.student_id = studentId;

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
          프로필 정보를 수정할 수 있습니다.
        </p>

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

          {/* Role (read-only) */}
          <div>
            <label style={labelStyle}>역할</label>
            <input
              type="text"
              value={user?.role === "professor" ? "교수" : user?.role === "student" ? "학생" : "미설정"}
              disabled
              style={{ ...inputStyle, background: "var(--surface-container)", color: "var(--on-surface-variant)" }}
            />
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
