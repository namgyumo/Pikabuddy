import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import ErrorBoundary from "./components/common/ErrorBoundary";
import TutorialProvider from "./components/common/TutorialProvider";
import "./App.css";

// Lazy-loaded pages
const Landing = lazy(() => import("./pages/Landing"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const SelectRole = lazy(() => import("./pages/SelectRole"));
const ProfessorHome = lazy(() => import("./pages/ProfessorHome"));
const StudentHome = lazy(() => import("./pages/StudentHome"));
const CodeEditor = lazy(() => import("./pages/CodeEditor"));
const WritingEditor = lazy(() => import("./pages/WritingEditor"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NoteEditor = lazy(() => import("./pages/NoteEditor"));
const NotesList = lazy(() => import("./pages/NotesList"));
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const StudentDetail = lazy(() => import("./pages/StudentDetail"));
const AssignmentDetail = lazy(() => import("./pages/AssignmentDetail"));
const Settings = lazy(() => import("./pages/Settings"));
const JoinCourse = lazy(() => import("./pages/JoinCourse"));
const Workspace = lazy(() => import("./pages/Workspace"));
const NoteGraph = lazy(() => import("./pages/NoteGraph"));
const PersonalHome = lazy(() => import("./pages/PersonalHome"));
const PersonalAssignmentDetail = lazy(() => import("./pages/PersonalAssignmentDetail"));
const QuizEditor = lazy(() => import("./pages/QuizEditor"));
const Profile = lazy(() => import("./pages/Profile"));
const Messenger = lazy(() => import("./pages/Messenger"));
const StudentNotes = lazy(() => import("./pages/StudentNotes"));
const TeamManager = lazy(() => import("./pages/TeamManager"));
const AllNotes = lazy(() => import("./pages/AllNotes"));
const AllNotesGraph = lazy(() => import("./pages/AllNotesGraph"));
const NotFound = lazy(() => import("./pages/NotFound"));

function PageLoader() {
  return (
    <div className="page-loading">
      <div className="page-loading-spinner" />
    </div>
  );
}

function ProtectedRoute({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: "professor" | "student" | "personal";
}) {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  const isAdmin = user?.email?.endsWith("@pikabuddy.admin") ?? false;

  if (loading) return <div className="page-center">로딩 중...</div>;
  if (!user) return <Navigate to="/" />;
  if (role && user.role !== role && !isAdmin) return <Navigate to="/" />;
  return <>{children}</>;
}

export default function App() {
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // ── 로그인 만료 감지 표시 ──
  useEffect(() => {
    const handler = () => {
      // Show session expired overlay
      const existing = document.getElementById("session-expired-toast");
      if (existing) return;
      const el = document.createElement("div");
      el.id = "session-expired-toast";
      el.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:12px 20px;background:#ef4444;color:#fff;font-size:14px;font-weight:600;gap:12px;animation:slideDown .3s ease";
      el.innerHTML = `<span>로그인이 만료되었습니다. 다시 로그인해 주세요.</span><button onclick="window.location.href='/'" style="padding:4px 14px;border-radius:6px;border:none;background:#fff;color:#ef4444;font-weight:600;cursor:pointer;font-size:13px">로그인</button>`;
      document.body.appendChild(el);
    };
    window.addEventListener("session-expired", handler);
    return () => window.removeEventListener("session-expired", handler);
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <TutorialProvider />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/join/:inviteCode" element={<JoinCourse />} />
            <Route
              path="/select-role"
              element={
                <ProtectedRoute>
                  <SelectRole />
                </ProtectedRoute>
              }
            />
            <Route
              path="/professor"
              element={
                <ProtectedRoute role="professor">
                  <ProfessorHome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student"
              element={
                <ProtectedRoute role="student">
                  <StudentHome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/personal"
              element={
                <ProtectedRoute role="personal">
                  <PersonalHome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:courseId"
              element={
                <ProtectedRoute>
                  <CourseDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assignments/:assignmentId/code"
              element={
                <ProtectedRoute>
                  <CodeEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assignments/:assignmentId/quiz"
              element={
                <ProtectedRoute>
                  <QuizEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assignments/:assignmentId/write"
              element={
                <ProtectedRoute>
                  <WritingEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:courseId/dashboard"
              element={
                <ProtectedRoute role="professor">
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:courseId/dashboard/students/:studentId"
              element={
                <ProtectedRoute role="professor">
                  <StudentDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:courseId/assignments/:assignmentId"
              element={
                <ProtectedRoute role="professor">
                  <AssignmentDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/personal/courses/:courseId/assignments/:assignmentId"
              element={
                <ProtectedRoute role="personal">
                  <PersonalAssignmentDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/all-notes"
              element={
                <ProtectedRoute>
                  <AllNotes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/all-notes/graph"
              element={
                <ProtectedRoute>
                  <AllNotesGraph />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:courseId/notes"
              element={
                <ProtectedRoute>
                  <NotesList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:courseId/notes/:noteId"
              element={
                <ProtectedRoute>
                  <NoteEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:courseId/graph"
              element={
                <ProtectedRoute>
                  <NoteGraph />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:courseId/workspace"
              element={
                <ProtectedRoute>
                  <Workspace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:courseId/messenger"
              element={
                <ProtectedRoute>
                  <Messenger />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:courseId/messenger/:partnerId"
              element={
                <ProtectedRoute>
                  <Messenger />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:courseId/teams"
              element={
                <ProtectedRoute role="professor">
                  <TeamManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:courseId/student-notes"
              element={
                <ProtectedRoute role="professor">
                  <StudentNotes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:courseId/student-notes/:studentId/:noteId"
              element={
                <ProtectedRoute role="professor">
                  <NoteEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/:userId"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            {/* 404 catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
