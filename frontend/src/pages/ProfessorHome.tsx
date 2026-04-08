import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCourseStore } from "../store/courseStore";
import AppShell from "../components/common/AppShell";

export default function ProfessorHome() {
  const { courses, fetchCourses, createCourse, loading } = useCourseStore();

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [objectives, setObjectives] = useState("");

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    await createCourse({
      title,
      description: description || undefined,
      objectives: objectives
        ? objectives.split("\n").filter((o) => o.trim())
        : undefined,
    });
    setShowCreate(false);
    setTitle("");
    setDescription("");
    setObjectives("");
  };

  return (
    <AppShell>
      <main className="content">
        <h1 className="page-title">강의 관리</h1>
        <p className="page-subtitle">
          과목을 개설하고, AI 파워드 과제를 관리하세요.
        </p>

        <div className="page-header">
          <h2 className="section-title">내 강의 목록</h2>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
          >
            + 새 강의 개설
          </button>
        </div>

        {showCreate && (
          <div className="card create-form">
            <h2>새 강의 생성</h2>
            <input
              className="input"
              placeholder="강의명 (예: C 프로그래밍)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              className="input"
              placeholder="강의 설명 (선택)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <textarea
              className="input"
              placeholder="강의 목표 (줄바꿈으로 구분)"
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              rows={3}
            />
            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleCreate}>
                생성
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowCreate(false)}
              >
                취소
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-spinner">강의를 불러오는 중...</div>
        ) : courses.length === 0 ? (
          <div className="empty">
            아직 생성된 강의가 없습니다.
            <br />
            위의 "새 강의 개설" 버튼으로 시작하세요.
          </div>
        ) : (
          <div className="course-grid">
            {courses.map((course) => (
              <Link
                key={course.id}
                to={`/courses/${course.id}`}
                className="card course-card"
              >
                <h3>{course.title}</h3>
                <p>{course.description || "설명 없음"}</p>
                <div className="course-meta">
                  <span className="badge badge-invite">
                    {course.invite_code}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}
