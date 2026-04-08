import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

interface Props {
  children: React.ReactNode;
  courseTitle?: string;
}

export default function AppShell({ children, courseTitle }: Props) {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const location = useLocation();
  const navigate = useNavigate();
  const isProfessor = user?.role === "professor";

  const homeLink = isProfessor ? "/professor" : "/student";
  const isActive = (path: string) => location.pathname.includes(path);

  // Extract courseId from URL for contextual navigation
  const courseIdMatch = location.pathname.match(/\/courses\/([^/]+)/);
  const courseId = courseIdMatch ? courseIdMatch[1] : null;

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Link to={homeLink}>
            <div className="sidebar-brand-name">pikabuddy</div>
          </Link>
          {courseTitle && (
            <div className="sidebar-brand-sub">{courseTitle}</div>
          )}
        </div>

        <nav className="sidebar-nav">
          {isProfessor ? (
            <>
              <Link
                to={homeLink}
                className={`sidebar-link ${location.pathname === homeLink ? "active" : ""}`}
              >
                <span className="sidebar-link-icon">&#x1F4DA;</span>
                Classroom
              </Link>
              {courseId && (
                <>
                  <Link
                    to={`/courses/${courseId}/dashboard`}
                    className={`sidebar-link ${isActive("dashboard") ? "active" : ""}`}
                  >
                    <span className="sidebar-link-icon">&#x1F4CA;</span>
                    Dashboard
                  </Link>
                  <Link
                    to={`/courses/${courseId}`}
                    className={`sidebar-link ${!isActive("dashboard") && !isActive("assignments") && isActive("courses") ? "active" : ""}`}
                  >
                    <span className="sidebar-link-icon">&#x1F4DD;</span>
                    Curriculum
                  </Link>
                </>
              )}
            </>
          ) : (
            <>
              <Link
                to={homeLink}
                className={`sidebar-link ${location.pathname === homeLink ? "active" : ""}`}
              >
                <span className="sidebar-link-icon">&#x1F4DA;</span>
                Classroom
              </Link>
              {courseId && (
                <>
                  <Link
                    to={`/courses/${courseId}`}
                    className={`sidebar-link ${isActive("courses") && !isActive("notes") ? "active" : ""}`}
                  >
                    <span className="sidebar-link-icon">&#x1F4CB;</span>
                    Curriculum
                  </Link>
                  <Link
                    to={`/courses/${courseId}/notes`}
                    className={`sidebar-link ${isActive("notes") ? "active" : ""}`}
                  >
                    <span className="sidebar-link-icon">&#x1F4DD;</span>
                    Notes
                  </Link>
                </>
              )}
            </>
          )}
        </nav>

        <div className="sidebar-bottom">
          <Link
            to="/settings"
            className={`sidebar-link ${location.pathname === "/settings" ? "active" : ""}`}
          >
            <span className="sidebar-link-icon">&#x2699;</span>
            Settings
          </Link>
          <button className="sidebar-link" onClick={() => { signOut(); navigate("/"); }}>
            <span className="sidebar-link-icon">&#x1F6AA;</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-area">
        <header className="topnav">
          <div className="topnav-left">
            {user && (
              <span style={{ fontSize: 14, color: "var(--on-surface-variant)" }}>
                {user.name}
              </span>
            )}
          </div>
          <div className="topnav-right">
            <div className="topnav-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
