import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function Landing() {
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const adminLogin = useAuthStore((s) => s.adminLogin);
  const navigate = useNavigate();

  const [showAdmin, setShowAdmin] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [adminPw, setAdminPw] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  const handleAdminLogin = async () => {
    if (!adminId.trim() || !adminPw.trim()) return;
    setAdminLoading(true);
    setAdminError("");
    try {
      await adminLogin(adminId, adminPw);
      const user = useAuthStore.getState().user;
      if (user?.role === "professor") navigate("/professor");
      else if (user?.role === "student") navigate("/student");
      else navigate("/select-role");
    } catch {
      setAdminError("아이디 또는 비밀번호가 올바르지 않습니다.");
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="logo">pikabuddy</div>
      </header>

      <main className="landing-hero">
        <h1>
          AI가 학습 과정을 분석하는
          <br />
          <span>차세대 교육 플랫폼</span>
        </h1>
        <p className="landing-sub">
          코딩 &middot; 글쓰기 &middot; 노트를 하나의 플랫폼에서.
          <br />
          AI가 결과가 아닌 과정을 분석합니다.
        </p>

        <button className="btn btn-primary btn-lg" onClick={signInWithGoogle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google로 시작하기
        </button>

        <div className="admin-login-toggle">
          <button
            className="btn btn-ghost"
            onClick={() => setShowAdmin(!showAdmin)}
            style={{ fontSize: 13, color: "var(--text-light)" }}
          >
            {showAdmin ? "관리자 로그인 닫기" : "관리자 로그인"}
          </button>
        </div>

        {showAdmin && (
          <div className="admin-login-form">
            <input
              className="input"
              placeholder="아이디"
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
            />
            <input
              className="input"
              type="password"
              placeholder="비밀번호"
              value={adminPw}
              onChange={(e) => setAdminPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
            />
            {adminError && (
              <p className="admin-login-error">{adminError}</p>
            )}
            <button
              className="btn btn-primary"
              onClick={handleAdminLogin}
              disabled={adminLoading}
              style={{ width: "100%" }}
            >
              {adminLoading ? "로그인 중..." : "로그인"}
            </button>
          </div>
        )}

        <div className="landing-features">
          <div className="feature-card">
            <div className="feature-icon feature-icon-blue">
              <span>&#x1F4CA;</span>
            </div>
            <h3>지능형 학습의 모든 것</h3>
            <p>코드 스냅샷과 복붙 감지로 학습 과정을 투명하게 기록합니다.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon feature-icon-purple">
              <span>&#x1F916;</span>
            </div>
            <h3>AI 피드백 & 튜터링</h3>
            <p>코드 분석, 소크라테스 튜터, 노트 갭 분석을 AI가 실시간 제공합니다.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon feature-icon-green">
              <span>&#x1F3AF;</span>
            </div>
            <h3>통합 대시보드</h3>
            <p>교수 대시보드에서 학생별 이해도와 클래스 인사이트를 확인합니다.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
