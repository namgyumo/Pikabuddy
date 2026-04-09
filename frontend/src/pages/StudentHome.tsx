import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCourseStore } from "../store/courseStore";
import { useAuthStore } from "../store/authStore";
import { useTutorialStore } from "../store/tutorialStore";
import { getTutorialKey } from "../lib/tutorials";
import api from "../lib/api";
import AppShell from "../components/common/AppShell";
import { toast } from "../lib/toast";
import { SkeletonList } from "../components/common/Skeleton";

export default function StudentHome() {
  const { courses, fetchCourses, loading } = useCourseStore();
  const user = useAuthStore((s) => s.user);

  const [showJoin, setShowJoin] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);

  const tutorialStart = useTutorialStore((s) => s.start);
  const tutorialCompleted = useTutorialStore((s) => s.isCompleted);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    if (user && !tutorialCompleted(getTutorialKey("student", user.id))) {
      const timer = setTimeout(() => tutorialStart(), 500);
      return () => clearTimeout(timer);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setJoining(true);
    try {
      await api.post(`/courses/join`, {
        invite_code: inviteCode,
      });
      setShowJoin(false);
      setInviteCode("");
      fetchCourses();
    } catch {
      toast.error("참여에 실패했습니다. 초대 코드를 확인해주세요.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <AppShell>
      <main className="content">
        <h1 className="page-title">내 강의</h1>
        <p className="page-subtitle">
          참여한 강의에서 코딩 실습, AI 튜터, 노트 작성을 시작하세요.
        </p>

        <div className="page-header">
          <h2 className="section-title">참여 중인 강의</h2>
          <button
            className="btn btn-primary"
            onClick={() => setShowJoin(true)}
            data-tutorial="join-course"
          >
            + 초대코드로 참여
          </button>
        </div>

        {showJoin && (
          <div className="card create-form">
            <h2>강의 참여</h2>
            <input
              className="input"
              placeholder="초대 코드를 입력하세요"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />
            <div className="form-actions">
              <button
                className="btn btn-primary"
                onClick={handleJoin}
                disabled={joining}
              >
                {joining ? "참여 중..." : "참여"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowJoin(false)}
              >
                취소
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <SkeletonList count={3} />
        ) : courses.length === 0 ? (
          <div className="empty">
            참여한 강의가 없습니다.
            <br />
            교수에게 초대 코드를 받아 참여하세요.
          </div>
        ) : (
          <div className="course-grid" data-tutorial="course-list">
            {courses.map((course) => (
              <Link
                key={course.id}
                to={`/courses/${course.id}`}
                className="card course-card"
              >
                <h3>{course.title}</h3>
                <p>{course.description || "설명 없음"}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}
