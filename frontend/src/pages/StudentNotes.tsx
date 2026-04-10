import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCourseStore } from "../store/courseStore";
import AppShell from "../components/common/AppShell";
import api from "../lib/api";
import type { StudentWithNotes } from "../types";

export default function StudentNotes() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const currentCourse = useCourseStore((s) => s.currentCourse);
  const fetchCourse = useCourseStore((s) => s.fetchCourse);

  const [studentNotes, setStudentNotes] = useState<StudentWithNotes[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (courseId && (!currentCourse || currentCourse.id !== courseId)) {
      fetchCourse(courseId);
    }
  }, [courseId, currentCourse, fetchCourse]);

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    api.get(`/courses/${courseId}/student-notes`)
      .then(({ data }) => {
        setStudentNotes(data);
        // 첫 번째 학생 자동 펼침
        if (data.length > 0) {
          setExpandedStudents(new Set([data[0].student.id]));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [courseId]);

  const toggleStudent = (studentId: string) => {
    setExpandedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const openNote = (studentId: string, noteId: string) => {
    navigate(`/courses/${courseId}/student-notes/${studentId}/${noteId}`);
  };

  return (
    <AppShell courseTitle={currentCourse?.title}>
      <div className="student-notes-page">
        <div className="student-notes-header">
          <h2>학생 노트 관리</h2>
          <p className="student-notes-desc">학생들의 노트를 열람하고 코멘트를 달 수 있습니다.</p>
        </div>

        {loading ? (
          <div className="student-notes-loading">불러오는 중...</div>
        ) : studentNotes.length === 0 ? (
          <div className="student-notes-empty">
            <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
            <div>아직 등록된 학생이 없거나 작성된 노트가 없습니다.</div>
          </div>
        ) : (
          <div className="student-notes-list">
            {studentNotes.map(({ student, notes }) => {
              const isExpanded = expandedStudents.has(student.id);
              return (
                <div key={student.id} className="student-notes-card">
                  <button className="student-notes-card-header" onClick={() => toggleStudent(student.id)}>
                    <div className="student-notes-avatar">
                      {student.avatar_url ? (
                        <img src={student.avatar_url} alt="" />
                      ) : (
                        <span>{student.name?.charAt(0)?.toUpperCase() || "?"}</span>
                      )}
                    </div>
                    <div className="student-notes-info">
                      <span className="student-notes-name">{student.name}</span>
                      <span className="student-notes-count">{notes.length}개 노트</span>
                    </div>
                    <span className={`student-notes-chevron${isExpanded ? " open" : ""}`}>&#9654;</span>
                  </button>

                  {isExpanded && (
                    <div className="student-notes-note-list">
                      {notes.length === 0 ? (
                        <div className="student-notes-no-notes">작성된 노트가 없습니다.</div>
                      ) : (
                        notes.map((note) => (
                          <button
                            key={note.id}
                            className="student-notes-note-item"
                            onClick={() => openNote(student.id, note.id)}
                          >
                            <div className="student-notes-note-title">{note.title}</div>
                            <div className="student-notes-note-meta">
                              {note.understanding_score !== null && (
                                <span className="student-notes-score">
                                  이해도 {note.understanding_score}점
                                </span>
                              )}
                              {note.comment_count > 0 && (
                                <span className="student-notes-comments">
                                  💬 {note.comment_count}
                                </span>
                              )}
                              <span className="student-notes-date">
                                {new Date(note.updated_at).toLocaleDateString("ko-KR")}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
