import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import Landing from "./pages/Landing";
import AuthCallback from "./pages/AuthCallback";
import SelectRole from "./pages/SelectRole";
import ProfessorHome from "./pages/ProfessorHome";
import StudentHome from "./pages/StudentHome";
import CodeEditor from "./pages/CodeEditor";
import WritingEditor from "./pages/WritingEditor";
import Dashboard from "./pages/Dashboard";
import NoteEditor from "./pages/NoteEditor";
import NotesList from "./pages/NotesList";
import CourseDetail from "./pages/CourseDetail";
import StudentDetail from "./pages/StudentDetail";
import AssignmentDetail from "./pages/AssignmentDetail";
import Settings from "./pages/Settings";
import JoinCourse from "./pages/JoinCourse";
import Workspace from "./pages/Workspace";
import NoteGraph from "./pages/NoteGraph";
import PersonalHome from "./pages/PersonalHome";
import Profile from "./pages/Profile";
import TutorialProvider from "./components/common/TutorialProvider";
import "./App.css";

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

  return (
    <BrowserRouter>
      <TutorialProvider />
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
      </Routes>
    </BrowserRouter>
  );
}
