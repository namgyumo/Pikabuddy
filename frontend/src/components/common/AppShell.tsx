import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useMessengerStore } from "../../store/messengerStore";
import { useNotificationStore } from "../../store/notificationStore";
import { useCourseStore } from "../../store/courseStore";
import TierBadge from "./TierBadge";
import ThemeBackground from "./ThemeBackground";
import NotificationBell from "./NotificationBell";
import GlobalContextMenu from "./GlobalContextMenu";
import { useRealtimeNotifications } from "../../lib/useRealtimeNotifications";

interface Props {
  children: React.ReactNode;
  courseTitle?: string;
}

export default function AppShell({ children, courseTitle }: Props) {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const isProfessor = user?.role === "professor";
  const isPersonal = user?.role === "personal";
  const unreadCount = useMessengerStore((s) => s.unreadCount);
  const fetchUnreadCount = useMessengerStore((s) => s.fetchUnreadCount);
  const unreadPollRef = useRef<ReturnType<typeof setInterval>>();

  const totalUnreadMessages = useNotificationStore((s) => s.totalUnreadMessages);
  const messengerCourseId = useNotificationStore((s) => s.messengerCourseId);
  const fetchTotalUnread = useNotificationStore((s) => s.fetchTotalUnread);
  const fetchMessengerCourse = useNotificationStore((s) => s.fetchMessengerCourse);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);

  const courses = useCourseStore((s) => s.courses);
  const fetchCourses = useCourseStore((s) => s.fetchCourses);
  // 메신저 바로가기: messengerCourseId 우선, 없으면 첫 번째 비개인 코스
  const nonPersonalCourse = courses.find(c => !c.is_personal);
  const messengerLink = messengerCourseId || nonPersonalCourse?.id || null;

  // Supabase Realtime 구독 — 메시지/코멘트 즉시 알림
  useRealtimeNotifications(user?.id);

  const homeLink = isProfessor ? "/professor" : isPersonal ? "/personal" : "/student";
  const isActive = (path: string) => location.pathname.includes(path);

  // Extract courseId from URL for contextual navigation
  const courseIdMatch = location.pathname.match(/\/courses\/([^/]+)/);
  const courseId = courseIdMatch ? courseIdMatch[1] : null;

  // 메신저 바로가기용 코스 + 전체 안 읽은 수 + 코스 목록 + 알림
  useEffect(() => {
    if (!isPersonal) {
      fetchMessengerCourse();
      fetchTotalUnread();
      fetchNotifications(); // 초기 로드 시 알림도 바로 가져옴
      if (courses.length === 0) fetchCourses();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPersonal]);

  // 30초 폴링으로 안 읽은 메시지 수 갱신
  useEffect(() => {
    if (unreadPollRef.current) clearInterval(unreadPollRef.current);
    if (courseId && !isPersonal) {
      fetchUnreadCount(courseId);
      unreadPollRef.current = setInterval(() => fetchUnreadCount(courseId), 30000);
    }
    return () => { if (unreadPollRef.current) clearInterval(unreadPollRef.current); };
  }, [courseId, isPersonal, fetchUnreadCount]);

  return (
    <div className="app-shell">
      {/* Mobile hamburger */}
      <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? "\u2715" : "\u2630"}
      </button>
      {/* Mobile overlay */}
      <ThemeBackground />
      <div className={`sidebar-overlay${sidebarOpen ? " open" : ""}`} onClick={() => setSidebarOpen(false)} />
      {/* Sidebar */}
      <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="sidebar-brand" data-tutorial="sidebar-brand">
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
              {/* 메신저 바로가기 (강의 밖에서도 접근) */}
              {!courseId && messengerLink && (
                <Link
                  to={`/courses/${messengerLink}/messenger`}
                  className={`sidebar-link ${isActive("messenger") ? "active" : ""}`}
                >
                  <span className="sidebar-link-icon">&#x1F4AC;</span>
                  Messenger
                  {totalUnreadMessages > 0 && <span className="sidebar-badge">{totalUnreadMessages}</span>}
                </Link>
              )}
              {!courseId && (
                <Link
                  to="/all-notes"
                  className={`sidebar-link ${location.pathname === "/all-notes" ? "active" : ""}`}
                >
                  <span className="sidebar-link-icon">&#x1F4DD;</span>
                  Notes
                </Link>
              )}
              {courseId && (
                <>
                  <Link
                    to={`/courses/${courseId}/dashboard`}
                    className={`sidebar-link ${isActive("dashboard") ? "active" : ""}`}
                    data-tutorial="sidebar-dashboard"
                  >
                    <span className="sidebar-link-icon">&#x1F4CA;</span>
                    Dashboard
                  </Link>
                  <Link
                    to={`/courses/${courseId}`}
                    className={`sidebar-link ${!isActive("dashboard") && !isActive("assignments") && !isActive("student-notes") && !isActive("messenger") && isActive("courses") ? "active" : ""}`}
                  >
                    <span className="sidebar-link-icon">&#x1F4DD;</span>
                    Curriculum
                  </Link>
                  <Link
                    to={`/courses/${courseId}/student-notes`}
                    className={`sidebar-link ${isActive("student-notes") ? "active" : ""}`}
                  >
                    <span className="sidebar-link-icon">&#x1F4D3;</span>
                    Student Notes
                  </Link>
                  <Link
                    to={`/courses/${courseId}/messenger`}
                    className={`sidebar-link ${isActive("messenger") ? "active" : ""}`}
                  >
                    <span className="sidebar-link-icon">&#x1F4AC;</span>
                    Messenger
                    {unreadCount > 0 && <span className="sidebar-badge">{unreadCount}</span>}
                  </Link>
                </>
              )}
            </>
          ) : isPersonal ? (
            <>
              <Link
                to={homeLink}
                className={`sidebar-link ${location.pathname === homeLink ? "active" : ""}`}
              >
                <span className="sidebar-link-icon">&#x1F4CA;</span>
                Dashboard
              </Link>
              {courseId && (
                <>
                  <Link
                    to={`/courses/${courseId}/notes`}
                    className={`sidebar-link ${isActive("notes") ? "active" : ""}`}
                    data-tutorial="sidebar-notes"
                  >
                    <span className="sidebar-link-icon">&#x1F4DD;</span>
                    Notes
                  </Link>
                  <Link
                    to={`/courses/${courseId}/graph`}
                    className={`sidebar-link ${isActive("graph") ? "active" : ""}`}
                  >
                    <span className="sidebar-link-icon">&#x1F578;</span>
                    Graph
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
              {/* 메신저 바로가기 (강의 밖에서도 접근) */}
              {!courseId && messengerLink && (
                <Link
                  to={`/courses/${messengerLink}/messenger`}
                  className={`sidebar-link ${isActive("messenger") ? "active" : ""}`}
                >
                  <span className="sidebar-link-icon">&#x1F4AC;</span>
                  Messenger
                  {totalUnreadMessages > 0 && <span className="sidebar-badge">{totalUnreadMessages}</span>}
                </Link>
              )}
              {!courseId && (
                <Link
                  to="/all-notes"
                  className={`sidebar-link ${location.pathname === "/all-notes" ? "active" : ""}`}
                >
                  <span className="sidebar-link-icon">&#x1F4DD;</span>
                  Notes
                </Link>
              )}
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
                    data-tutorial="sidebar-notes"
                  >
                    <span className="sidebar-link-icon">&#x1F4DD;</span>
                    Notes
                  </Link>
                  <Link
                    to={`/courses/${courseId}/messenger`}
                    className={`sidebar-link ${isActive("messenger") ? "active" : ""}`}
                  >
                    <span className="sidebar-link-icon">&#x1F4AC;</span>
                    Messenger
                    {unreadCount > 0 && <span className="sidebar-badge">{unreadCount}</span>}
                  </Link>
                </>
              )}
            </>
          )}
        </nav>

        <div className="sidebar-bottom">
          {!isProfessor && (
            <div style={{ padding: "8px 16px" }} data-tutorial="sidebar-tier">
              <TierBadge compact />
            </div>
          )}
          <Link
            to="/settings"
            className={`sidebar-link ${location.pathname === "/settings" ? "active" : ""}`}
            data-tutorial="sidebar-settings"
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
            <NotificationBell />
            <div className="topnav-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          </div>
        </header>

        {children}
      </div>
      <GlobalContextMenu />
    </div>
  );
}
