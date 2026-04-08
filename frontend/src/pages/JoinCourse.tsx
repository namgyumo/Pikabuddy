import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuthStore } from "../store/authStore";

interface CoursePreview {
  id: string;
  title: string;
  description: string | null;
  objectives: string[] | null;
}

export default function JoinCourse() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const navigate = useNavigate();

  const [course, setCourse] = useState<CoursePreview | null>(null);
  const [fetching, setFetching] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!inviteCode) return;
    api
      .get(`/courses/by-invite/${inviteCode}`)
      .then(({ data }) => setCourse(data))
      .catch(() => setNotFound(true))
      .finally(() => setFetching(false));
  }, [inviteCode]);

  const handleJoin = async () => {
    if (!inviteCode) return;
    setJoining(true);
    setError("");
    try {
      await api.post("/courses/join", { invite_code: inviteCode });
      setJoined(true);
      setTimeout(() => navigate("/student"), 1500);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "가입 중 오류가 발생했습니다.";
      if (msg.includes("이미 참여")) {
        setError("이미 참여한 강의입니다.");
        setTimeout(() => navigate("/student"), 1500);
      } else {
        setError(msg);
      }
    } finally {
      setJoining(false);
    }
  };

  const handleLoginAndJoin = () => {
    if (inviteCode) sessionStorage.setItem("pending_invite", inviteCode);
    signInWithGoogle();
  };

  if (fetching || loading) {
    return (
      <div className="page-center">
        <div className="loading-spinner">강의 정보를 불러오는 중...</div>
      </div>
    );
  }

  if (notFound || !course) {
    return (
      <div className="page-center" style={{ flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 48 }}>🔍</div>
        <h2>유효하지 않은 초대 코드입니다.</h2>
        <p style={{ color: "var(--on-surface-variant)" }}>QR 코드를 다시 확인해주세요.</p>
      </div>
    );
  }

  return (
    <div className="page-center" style={{ padding: 24 }}>
      <div
        className="card"
        style={{ maxWidth: 480, width: "100%", padding: 32, textAlign: "center" }}
      >
        <div style={{ fontSize: 48, marginBottom: 8 }}>🎓</div>
        <h2 style={{ margin: "0 0 8px" }}>{course.title}</h2>
        {course.description && (
          <p style={{ color: "var(--on-surface-variant)", marginBottom: 16 }}>
            {course.description}
          </p>
        )}
        {course.objectives && course.objectives.length > 0 && (
          <div style={{ textAlign: "left", marginBottom: 20, background: "var(--surface-variant)", borderRadius: "var(--radius-md)", padding: "12px 16px" }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--on-surface-variant)" }}>강의 목표</p>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {course.objectives.map((obj, i) => (
                <li key={i} style={{ fontSize: 14, color: "var(--on-surface)", marginBottom: 4 }}>{obj}</li>
              ))}
            </ul>
          </div>
        )}

        {joined ? (
          <div style={{ color: "#16a34a", fontWeight: 600, fontSize: 16 }}>
            ✅ 강의에 참여했습니다! 잠시 후 이동합니다...
          </div>
        ) : error ? (
          <div style={{ color: error.includes("이미") ? "#16a34a" : "var(--error)", fontWeight: 600, marginBottom: 16 }}>
            {error.includes("이미") ? "✅ " : "⚠️ "}{error}
          </div>
        ) : null}

        {!joined && (
          <>
            {!user ? (
              <>
                <p style={{ fontSize: 14, color: "var(--on-surface-variant)", marginBottom: 20 }}>
                  이 강의에 참여하려면 로그인이 필요합니다.
                </p>
                <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleLoginAndJoin}>
                  Google로 로그인 후 가입하기
                </button>
              </>
            ) : user.role !== "student" ? (
              <p style={{ color: "var(--on-surface-variant)", fontSize: 14 }}>
                학생 계정으로만 강의에 참여할 수 있습니다.
              </p>
            ) : (
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={handleJoin}
                  disabled={joining}
                >
                  {joining ? "참여 중..." : "가입하기"}
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => navigate("/student")}
                >
                  돌아가기
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
