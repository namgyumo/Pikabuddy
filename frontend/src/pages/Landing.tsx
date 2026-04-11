import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import api from "../lib/api";

export default function Landing() {
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const adminLogin = useAuthStore((s) => s.adminLogin);
  const navigate = useNavigate();

  const [showAdmin, setShowAdmin] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [adminPw, setAdminPw] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  // Test accounts from backend
  const [testAccounts, setTestAccounts] = useState<{role: string; label: string; username: string; password: string}[]>([]);
  const [testLoading, setTestLoading] = useState<string | null>(null);
  useEffect(() => {
    api.get("/auth/test-accounts").then((r) => setTestAccounts(r.data.accounts || [])).catch(() => {});
  }, []);

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
      setAdminError("\uC544\uC774\uB514 \uB610\uB294 \uBE44\uBC00\uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleTestLogin = async (username: string, password: string, role: string) => {
    setTestLoading(role);
    setAdminError("");
    try {
      await adminLogin(username, password);
      const user = useAuthStore.getState().user;
      if (user?.role === "professor") navigate("/professor");
      else if (user?.role === "student") navigate("/student");
      else navigate("/select-role");
    } catch {
      setAdminError("\uD14C\uC2A4\uD2B8 \uACC4\uC815 \uB85C\uADF8\uC778\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
    } finally {
      setTestLoading(null);
    }
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="landing">
      {/* Header */}
      <header className="landing-header">
        <div className="logo">pikabuddy</div>
        <nav className="landing-nav">
          <button className="landing-nav-link" onClick={() => scrollTo("features")}>
            {"\uAE30\uB2A5"}
          </button>
          <button className="landing-nav-link" onClick={() => scrollTo("how-it-works")}>
            {"\uC0AC\uC6A9\uBC95"}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={signInWithGoogle}
            style={{ borderRadius: "var(--radius-full)" }}
          >
            {"\uC2DC\uC791\uD558\uAE30"}
          </button>
        </nav>
      </header>

      {/* Hero */}
      <main className="landing-hero">
        <div
          style={{
            display: "inline-block",
            padding: "6px 16px",
            borderRadius: "var(--radius-full)",
            background: "var(--tertiary-container)",
            color: "var(--on-tertiary-container)",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 24,
            animation: "fadeInUp 0.4s ease-out",
          }}
        >
          KIT {"\uBC14\uC774\uBE0C\uCF54\uB529"} 2026
        </div>
        <h1>
          AI{"\uAC00"} {"\uD559\uC2B5"} {"\uACFC\uC815\uC744"} {"\uBD84\uC11D\uD558\uB294"}
          <br />
          <span>{"\uCC28\uC138\uB300"} {"\uAD50\uC721"} {"\uD50C\uB7AB\uD3FC"}</span>
        </h1>
        <p className="landing-sub">
          {"\uCF54\uB529"} &middot; {"\uAE00\uC4F0\uAE30"} &middot; {"\uB178\uD2B8\uB97C"} {"\uD558\uB098\uC758"} {"\uD50C\uB7AB\uD3FC\uC5D0\uC11C"}.
          <br />
          AI{"\uAC00"} {"\uACB0\uACFC\uAC00"} {"\uC544\uB2CC"} <strong>{"\uACFC\uC815\uC744"}</strong> {"\uBD84\uC11D\uD569\uB2C8\uB2E4"}.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <button className="btn btn-primary btn-lg" onClick={signInWithGoogle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google{"\uB85C"} {"\uC2DC\uC791\uD558\uAE30"}
          </button>
          <button
            className="btn btn-ghost btn-lg"
            onClick={() => scrollTo("features")}
            style={{ borderRadius: "var(--radius-full)" }}
          >
            {"\uB354"} {"\uC54C\uC544\uBCF4\uAE30"} &darr;
          </button>
        </div>

        {/* Test account quick login */}
        {testAccounts.length > 0 && (
          <div style={{ marginTop: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "var(--on-surface-variant)", letterSpacing: 0.5 }}>
              {"\uD14C\uC2A4\uD2B8 \uACC4\uC815\uC73C\uB85C \uBC14\uB85C \uCCB4\uD5D8"}
            </span>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              {testAccounts.map((acc) => (
                <button
                  key={acc.role}
                  className="btn btn-ghost"
                  disabled={testLoading !== null}
                  onClick={() => handleTestLogin(acc.username, acc.password, acc.role)}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "var(--radius-full)",
                    border: "1px solid var(--outline-variant)",
                    fontSize: 13,
                    fontWeight: 600,
                    color: acc.role === "professor" ? "var(--primary)" : "var(--tertiary)",
                  }}
                >
                  {testLoading === acc.role ? "\uB85C\uADF8\uC778 \uC911..." : acc.label}
                </button>
              ))}
            </div>
            {adminError && <p style={{ color: "var(--error)", fontSize: 12, margin: 0 }}>{adminError}</p>}
          </div>
        )}

        <div className="admin-login-toggle">
          <button
            className="btn btn-ghost"
            onClick={() => setShowAdmin(!showAdmin)}
            style={{ fontSize: 13, color: "var(--text-light)" }}
          >
            {showAdmin ? "\uAD00\uB9AC\uC790 \uB85C\uADF8\uC778 \uB2EB\uAE30" : "\uAD00\uB9AC\uC790 \uB85C\uADF8\uC778"}
          </button>
        </div>

        {showAdmin && (
          <div className="admin-login-form">
            <input
              className="input"
              placeholder={"\uC544\uC774\uB514"}
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
            />
            <input
              className="input"
              type="password"
              placeholder={"\uBE44\uBC00\uBC88\uD638"}
              value={adminPw}
              onChange={(e) => setAdminPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
            />
            {adminError && <p className="admin-login-error">{adminError}</p>}
            <button
              className="btn btn-primary"
              onClick={handleAdminLogin}
              disabled={adminLoading}
              style={{ width: "100%" }}
            >
              {adminLoading ? "\uB85C\uADF8\uC778 \uC911..." : "\uB85C\uADF8\uC778"}
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="landing-stats">
          <div className="landing-stat">
            <div className="landing-stat-value">5+</div>
            <div className="landing-stat-label">AI {"\uBD84\uC11D"} {"\uAE30\uB2A5"}</div>
          </div>
          <div className="landing-stat">
            <div className="landing-stat-value">2300+</div>
            <div className="landing-stat-label">{"\uB178\uD2B8"} {"\uCE74\uD14C\uACE0\uB9AC"}</div>
          </div>
          <div className="landing-stat">
            <div className="landing-stat-value">3</div>
            <div className="landing-stat-label">{"\uD1B5\uD569"} {"\uC5D0\uB514\uD130"}</div>
          </div>
          <div className="landing-stat">
            <div className="landing-stat-value">{"\u221E"}</div>
            <div className="landing-stat-label">{"\uD559\uC2B5"} {"\uC778\uC0AC\uC774\uD2B8"}</div>
          </div>
        </div>
      </main>

      {/* Features */}
      <section className="landing-section" id="features">
        <h2 className="landing-section-title">{"\uD575\uC2EC"} {"\uAE30\uB2A5"}</h2>
        <p className="landing-section-sub">
          {"\uCF54\uB4DC"} {"\uC2A4\uB0C5\uC0F7"}, AI {"\uBD84\uC11D"}, {"\uC2E4\uC2DC\uAC04"} {"\uB300\uC2DC\uBCF4\uB4DC\uAE4C\uC9C0"}.
          {"\uD559\uC2B5"} {"\uACFC\uC815\uC758"} {"\uBAA8\uB4E0"} {"\uAC83\uC744"} {"\uD22C\uBA85\uD558\uAC8C"} {"\uAE30\uB85D\uD569\uB2C8\uB2E4"}.
        </p>

        <div className="showcase-grid">
          <div className="showcase-card">
            <div className="showcase-icon showcase-icon-blue">{"\u{1F4BB}"}</div>
            <h3>{"\uCF54\uB4DC"} {"\uC5D0\uB514\uD130"} & {"\uC2A4\uB0C5\uC0F7"}</h3>
            <p>
              {"\uD559\uC0DD\uC758"} {"\uCF54\uB529"} {"\uACFC\uC815\uC744"} {"\uC2A4\uB0C5\uC0F7\uC73C\uB85C"} {"\uAE30\uB85D\uD558\uACE0"},
              {"\uBCF5\uBD99\uC5EC\uB123\uAE30"} {"\uAC10\uC9C0"}, AI {"\uC0AC\uC6A9"} {"\uC815\uCC45"} {"\uC124\uC815\uC73C\uB85C"}
              {"\uC9C4\uC815\uD55C"} {"\uD559\uC2B5\uC744"} {"\uC720\uB3C4\uD569\uB2C8\uB2E4"}.
            </p>
            <div className="showcase-tags">
              <span className="showcase-tag">Python</span>
              <span className="showcase-tag">JavaScript</span>
              <span className="showcase-tag">C/C++</span>
              <span className="showcase-tag">Java</span>
            </div>
          </div>

          <div className="showcase-card">
            <div className="showcase-icon showcase-icon-purple">{"\u{1F916}"}</div>
            <h3>AI {"\uBD84\uC11D"} & {"\uD29C\uD130\uB9C1"}</h3>
            <p>
              {"\uCF54\uB4DC"} {"\uBD84\uC11D"}, {"\uC18C\uD06C\uB77C\uD14C\uC2A4"} {"\uD29C\uD130"}, {"\uB178\uD2B8"} {"\uAC2D"} {"\uBD84\uC11D"},
              {"\uAE00\uC4F0\uAE30"} {"\uD53C\uB4DC\uBC31"} {"\uB4F1"} {"\uB2E4\uC591\uD55C"} AI {"\uAE30\uB2A5\uC774"}
              {"\uD559\uC2B5"} {"\uD6A8\uACFC\uB97C"} {"\uADF9\uB300\uD654\uD569\uB2C8\uB2E4"}.
            </p>
            <div className="showcase-tags">
              <span className="showcase-tag purple">{"\uC18C\uD06C\uB77C\uD14C\uC2A4"}</span>
              <span className="showcase-tag purple">{"\uAC2D"} {"\uBD84\uC11D"}</span>
              <span className="showcase-tag purple">{"\uD29C\uD130\uB9C1"}</span>
            </div>
          </div>

          <div className="showcase-card">
            <div className="showcase-icon showcase-icon-green">{"\u{1F4DD}"}</div>
            <h3>{"\uB178\uD2B8"} & {"\uC9C0\uC2DD"} {"\uC9C0\uB3C4"}</h3>
            <p>
              {"\uB9AC\uCE58"} {"\uD14D\uC2A4\uD2B8"} {"\uC5D0\uB514\uD130\uB85C"} {"\uB178\uD2B8\uB97C"} {"\uC791\uC131\uD558\uACE0"},
              2300+{"\uAC1C"} {"\uCE74\uD14C\uACE0\uB9AC"} {"\uAE30\uBC18"} AI {"\uBD84\uC11D\uC73C\uB85C"}
              {"\uC9C0\uC2DD"} {"\uC5F0\uACB0"} {"\uC9C0\uB3C4\uB97C"} {"\uC790\uB3D9"} {"\uC0DD\uC131\uD569\uB2C8\uB2E4"}.
            </p>
            <div className="showcase-tags">
              <span className="showcase-tag green">{"\uD2F1\uD0ED"} {"\uC5D0\uB514\uD130"}</span>
              <span className="showcase-tag green">{"\uCE74\uD14C\uACE0\uB9AC"} AI</span>
              <span className="showcase-tag green">{"\uADF8\uB798\uD504"} {"\uC2DC\uAC01\uD654"}</span>
            </div>
          </div>

          <div className="showcase-card">
            <div className="showcase-icon showcase-icon-amber">{"\u{1F4CA}"}</div>
            <h3>{"\uAD50\uC218"} {"\uB300\uC2DC\uBCF4\uB4DC"}</h3>
            <p>
              {"\uD559\uC0DD\uBCC4"} {"\uC774\uD574\uB3C4"}, {"\uCF54\uB529"} {"\uACFC\uC815"} {"\uD1B5\uACC4"},
              {"\uD074\uB798\uC2A4"} {"\uC778\uC0AC\uC774\uD2B8\uB97C"} {"\uD55C\uB208\uC5D0"} {"\uD655\uC778\uD558\uACE0"}
              {"\uBA54\uC2E0\uC800\uB85C"} {"\uC2E4\uC2DC\uAC04"} {"\uD53C\uB4DC\uBC31\uC744"} {"\uC8FC\uACE0\uBC1B\uC2B5\uB2C8\uB2E4"}.
            </p>
            <div className="showcase-tags">
              <span className="showcase-tag">{"\uD1B5\uACC4"}</span>
              <span className="showcase-tag">{"\uBA54\uC2E0\uC800"}</span>
              <span className="showcase-tag">{"\uCF54\uBA58\uD2B8"}</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        className="landing-section"
        id="how-it-works"
        style={{ background: "var(--surface-container-low)", maxWidth: "100%", padding: "80px 24px" }}
      >
        <h2 className="landing-section-title">{"\uC0AC\uC6A9"} {"\uBC29\uBC95"}</h2>
        <p className="landing-section-sub">
          4{"\uB2E8\uACC4\uB85C"} {"\uC2DC\uC791\uD558\uB294"} {"\uC2A4\uB9C8\uD2B8"} {"\uD559\uC2B5"} {"\uD50C\uB7AB\uD3FC"}
        </p>
        <div className="steps-grid" style={{ maxWidth: 900, margin: "0 auto" }}>
          <div className="step-card">
            <div className="step-number">1</div>
            <h4>Google {"\uB85C\uADF8\uC778"}</h4>
            <p>{"\uAD6C\uAE00"} {"\uACC4\uC815\uC73C\uB85C"} {"\uAC04\uD3B8\uD558\uAC8C"} {"\uC2DC\uC791\uD558\uC138\uC694"}</p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h4>{"\uD074\uB798\uC2A4"} {"\uCC38\uC5EC"}</h4>
            <p>{"\uCD08\uB300"} {"\uCF54\uB4DC\uB85C"} {"\uD074\uB798\uC2A4\uC5D0"} {"\uCC38\uC5EC\uD558\uAC70\uB098"} {"\uAC1C\uC778"} {"\uBAA8\uB4DC"} {"\uC0AC\uC6A9"}</p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h4>{"\uD559\uC2B5"} {"\uD65C\uB3D9"}</h4>
            <p>{"\uCF54\uB529"}, {"\uAE00\uC4F0\uAE30"}, {"\uB178\uD2B8"} {"\uC791\uC131\uC744"} {"\uD55C"} {"\uACF3\uC5D0\uC11C"}</p>
          </div>
          <div className="step-card">
            <div className="step-number">4</div>
            <h4>AI {"\uC778\uC0AC\uC774\uD2B8"}</h4>
            <p>AI{"\uAC00"} {"\uD559\uC2B5"} {"\uACFC\uC815\uC744"} {"\uBD84\uC11D\uD558\uACE0"} {"\uD53C\uB4DC\uBC31"} {"\uC81C\uACF5"}</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="landing-cta">
        <h2>{"\uC9C0\uAE08"} {"\uBC14\uB85C"} {"\uC2DC\uC791\uD558\uC138\uC694"}</h2>
        <p>{"\uBB34\uB8CC\uB85C"} {"\uBAA8\uB4E0"} {"\uAE30\uB2A5\uC744"} {"\uCCB4\uD5D8\uD574"} {"\uBCF4\uC138\uC694"}.</p>
        <button className="btn btn-primary btn-lg" onClick={signInWithGoogle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Google{"\uB85C"} {"\uC2DC\uC791\uD558\uAE30"}
        </button>
      </div>

      {/* Footer */}
      <footer className="landing-footer">
        <span>pikabuddy &copy; 2026</span>
        <span>KIT {"\uBC14\uC774\uBE0C\uCF54\uB529"} {"\uACF5\uBAA8\uC804"}</span>
      </footer>
    </div>
  );
}
