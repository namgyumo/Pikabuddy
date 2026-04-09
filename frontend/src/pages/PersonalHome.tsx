import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/common/AppShell";
import { useAuthStore } from "../store/authStore";
import { useTutorialStore } from "../store/tutorialStore";
import { getTutorialKey } from "../lib/tutorials";
import api from "../lib/api";
import type { Course, Assignment } from "../types";

interface Material {
  id: string;
  title: string;
  file_name: string;
  file_url: string;
  created_at: string;
}

export default function PersonalHome() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [course, setCourse] = useState<Course | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  // 과제 모달
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [assignType, setAssignType] = useState<"coding" | "writing" | "both">("coding");
  const [difficulty, setDifficulty] = useState("medium");
  const [language, setLanguage] = useState("python");
  const [problemCount, setProblemCount] = useState(5);
  const [baekjoonCount, setBaekjoonCount] = useState(0);
  const [programmersCount, setProgrammersCount] = useState(0);
  const [creating, setCreating] = useState(false);

  // 자료 업로드
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const tutorialStart = useTutorialStore((s) => s.start);
  const tutorialCompleted = useTutorialStore((s) => s.isCompleted);

  useEffect(() => {
    (async () => {
      try {
        const { data: courses } = await api.get("/courses");
        const personal = courses.find((c: Course & { is_personal?: boolean }) => c.is_personal);
        if (personal) {
          setCourse(personal);
          const [asgnsRes, matsRes] = await Promise.all([
            api.get(`/courses/${personal.id}/assignments`),
            api.get(`/courses/${personal.id}/materials`).catch(() => ({ data: [] })),
          ]);
          setAssignments(asgnsRes.data);
          setMaterials(matsRes.data);
        }
      } catch {
        // 가상 코스 아직 없을 수 있음
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 생성 중인 과제 폴링
  const pollingRef = useRef<ReturnType<typeof setInterval>>();
  const startPolling = useCallback(() => {
    if (pollingRef.current || !course) return;
    let count = 0;
    pollingRef.current = setInterval(async () => {
      count++;
      if (count > 40) {
        clearInterval(pollingRef.current!);
        pollingRef.current = undefined;
        return;
      }
      try {
        const { data } = await api.get(`/courses/${course.id}/assignments`);
        const stillGenerating = data.some(
          (a: any) => a.generation_status === "generating"
        );
        setAssignments(data);
        if (!stillGenerating) {
          clearInterval(pollingRef.current!);
          pollingRef.current = undefined;
        }
      } catch { /* ignore */ }
    }, 8000);
  }, [course]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = undefined;
      }
    };
  }, []);

  const handleCreate = async () => {
    if (!course || !title.trim() || !topic.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post(`/courses/${course.id}/assignments`, {
        title,
        topic,
        difficulty,
        language,
        problem_count: assignType !== "writing" ? problemCount : 0,
        baekjoon_count: assignType !== "writing" ? baekjoonCount : 0,
        programmers_count: assignType !== "writing" ? programmersCount : 0,
        type: assignType,
        ai_policy: "free",
      });
      setAssignments((prev) => [data, ...prev]);
      setShowModal(false);
      setTitle("");
      setTopic("");
      if (data.generation_status === "generating") {
        startPolling();
      }
    } catch {
      alert("과제 생성에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  };

  const handleUpload = async () => {
    if (!course || !uploadFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("title", uploadTitle || uploadFile.name);
      const { data } = await api.post(`/courses/${course.id}/materials`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMaterials((prev) => [data, ...prev]);
      setShowUpload(false);
      setUploadTitle("");
      setUploadFile(null);
    } catch {
      alert("업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };


  useEffect(() => {
    if (!loading && user && !tutorialCompleted(getTutorialKey("personal", user.id))) {
      const timer = setTimeout(() => tutorialStart(), 500);
      return () => clearTimeout(timer);
    }
  }, [loading, user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <AppShell><div className="page-center">로딩 중...</div></AppShell>;

  const typeLabel = (t: string) => {
    if (t === "coding") return "코딩";
    if (t === "writing") return "글쓰기";
    if (t === "both") return "코딩+글쓰기";
    if (t === "algorithm") return "알고리즘";
    return t;
  };

  return (
    <AppShell>
      <div className="content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h1 className="page-title" style={{ marginBottom: 0 }}>내 학습 공간</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setShowUpload(true)}>
              + 자료 업로드
            </button>
            <button className="btn btn-primary" onClick={() => setShowModal(true)} data-tutorial="create-assignment">
              + 과제 만들기
            </button>
          </div>
        </div>
        <p className="page-subtitle">직접 과제를 만들고, AI와 함께 학습하세요.</p>

        {/* 빠른 액션 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
          <div className="card course-card" style={{ padding: 20, textAlign: "center" }} onClick={() => setShowModal(true)}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>&#x1F4DD;</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>새 과제</div>
            <div style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 4 }}>AI가 문제를 생성</div>
          </div>
          {course && (
            <>
              <div className="card course-card" style={{ padding: 20, textAlign: "center" }}
                onClick={() => navigate(`/courses/${course.id}/notes/new`)}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>&#x1F4D3;</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>노트 작성</div>
                <div style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 4 }}>학습 내용 정리</div>
              </div>
              <div className="card course-card" style={{ padding: 20, textAlign: "center" }}
                onClick={() => navigate(`/courses/${course.id}/notes`)}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>&#x1F4DA;</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>내 노트</div>
                <div style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 4 }}>작성한 노트 목록</div>
              </div>
              <div className="card course-card" style={{ padding: 20, textAlign: "center" }}
                onClick={() => navigate(`/courses/${course.id}/graph`)}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>&#x1F578;</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>지식 그래프</div>
                <div style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 4 }}>학습 연결 지도</div>
              </div>
            </>
          )}
        </div>

        {/* 자료 목록 */}
        {materials.length > 0 && (
          <>
            <h2 className="section-title">내 자료</h2>
            <div className="course-grid" style={{ marginBottom: 32 }}>
              {materials.map((m) => (
                <a key={m.id} href={m.file_url} target="_blank" rel="noreferrer" className="card course-card" style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 24 }}>&#x1F4C4;</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{m.title}</div>
                      <div style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>{m.file_name}</div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}

        {/* 과제 목록 */}
        <h2 className="section-title">내 과제</h2>
        {assignments.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: "center" }}>
            <p style={{ color: "var(--on-surface-variant)", fontSize: 14 }}>
              아직 과제가 없습니다. "과제 만들기"를 눌러 시작하세요!
            </p>
          </div>
        ) : (
          <div className="course-grid" data-tutorial="assignment-list">
            {assignments.map((a) => (
              <div
                key={a.id}
                className="card course-card"
                style={{ padding: 20 }}
                onClick={() => navigate(`/courses/${course!.id}`)}
              >
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                  {a.title}
                  {a.generation_status === "generating" && (
                    <span className="badge" style={{ background: "rgba(0,74,198,0.1)", color: "var(--primary)", fontSize: 11, animation: "pulse 1.5s infinite" }}>
                      AI 생성 중...
                    </span>
                  )}
                  {a.generation_status === "failed" && (
                    <span className="badge" style={{ background: "rgba(220,38,38,0.08)", color: "var(--error)", fontSize: 11 }}>
                      생성 실패
                    </span>
                  )}
                </h3>
                <p style={{ fontSize: 13, color: "var(--on-surface-variant)", marginBottom: 10 }}>
                  {a.topic}
                </p>
                <div className="course-meta">
                  <span className="badge">{typeLabel(a.type)}</span>
                  <span className="badge">{a.generation_status === "generating" ? "생성 중..." : `${a.problems?.length || 0}문제`}</span>
                  <span className="badge badge-invite">{a.language}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 10 }}>
                  {new Date(a.created_at).toLocaleDateString("ko-KR")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 과제 생성 모달 */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>새 과제 만들기</h2>
            <div className="form-group">
              <div>
                <label className="form-label">과제 제목</label>
                <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: Python 기초 연습" />
              </div>
              <div>
                <label className="form-label">주제</label>
                <input className="form-input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="예: 반복문과 조건문" />
              </div>
              <div>
                <label className="form-label">과제 유형</label>
                <div className="type-chips">
                  {(["coding", "writing", "both"] as const).map((t) => (
                    <button key={t} className={`type-chip${assignType === t ? " active" : ""}`} onClick={() => setAssignType(t)}>
                      {typeLabel(t)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-row">
                <div>
                  <label className="form-label">난이도</label>
                  <select className="form-input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                    <option value="easy">쉬움</option>
                    <option value="medium">보통</option>
                    <option value="hard">어려움</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">언어</label>
                  <select className="form-input" value={language} onChange={(e) => setLanguage(e.target.value)}>
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="c">C</option>
                    <option value="java">Java</option>
                  </select>
                </div>
              </div>
              {assignType !== "writing" && (
                <div className="problem-counts-section">
                  <label className="form-label">문제 구성</label>
                  <div className="problem-counts-grid">
                    <div className="problem-count-item">
                      <label className="problem-count-label">일반 코딩</label>
                      <input className="form-input" type="number" min={0} max={10} value={problemCount} onChange={(e) => setProblemCount(Number(e.target.value))} />
                    </div>
                    <div className="problem-count-item">
                      <label className="problem-count-label">
                        백준 형식
                        <span className="problem-count-tag bj">stdin/stdout</span>
                      </label>
                      <input className="form-input" type="number" min={0} max={10} value={baekjoonCount} onChange={(e) => setBaekjoonCount(Number(e.target.value))} />
                    </div>
                    <div className="problem-count-item">
                      <label className="problem-count-label">
                        프로그래머스 형식
                        <span className="problem-count-tag pg">함수 기반</span>
                      </label>
                      <input className="form-input" type="number" min={0} max={10} value={programmersCount} onChange={(e) => setProgrammersCount(Number(e.target.value))} />
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 6 }}>
                    총 {problemCount + baekjoonCount + programmersCount}문제
                  </div>
                </div>
              )}
            </div>
            <div className="form-actions">
              <button className="btn-ghost" onClick={() => setShowModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating || !title.trim() || !topic.trim()}>
                {creating ? "AI가 생성 중..." : "생성"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 자료 업로드 모달 */}
      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h2>자료 업로드</h2>
            <div className="form-group">
              <div>
                <label className="form-label">자료 제목 (선택)</label>
                <input className="form-input" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="파일명이 기본 제목이 됩니다" />
              </div>
              <div>
                <label className="form-label">파일 선택</label>
                <input
                  className="form-input"
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  style={{ padding: "8px 10px" }}
                />
                {uploadFile && (
                  <div style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 6 }}>
                    {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-ghost" onClick={() => { setShowUpload(false); setUploadFile(null); }}>취소</button>
              <button className="btn btn-primary" onClick={handleUpload} disabled={uploading || !uploadFile}>
                {uploading ? "업로드 중..." : "업로드"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
