import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";
import AppShell from "../components/common/AppShell";
import { toast } from "../lib/toast";
import { customConfirm } from "../lib/confirm";
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

interface SubmissionBrief {
  id: string;
  assignment_id: string;
  submitted_at: string;
  problem_index?: number;
  status: string;
  ai_analyses?: { score: number | null; final_score: number | null; feedback: string | null }[];
}

interface DashboardStats {
  totalAssignments: number;
  totalSubmissions: number;
  totalNotes: number;
  avgScore: number | null;
  bestScore: number | null;
  solvedProblems: number;
  totalProblems: number;
  recentSubmissions: (SubmissionBrief & { assignmentTitle: string })[];
  scoreHistory: { date: string; score: number }[];
  perAssignment: { name: string; score: number; count: number }[];
}

export default function PersonalHome() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [course, setCourse] = useState<Course | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalAssignments: 0, totalSubmissions: 0, totalNotes: 0,
    avgScore: null, bestScore: null, solvedProblems: 0, totalProblems: 0,
    recentSubmissions: [], scoreHistory: [], perAssignment: [],
  });

  // Tab
  const [tab, setTab] = useState<"dashboard" | "assignments" | "materials">("dashboard");

  // Create assignment modal
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [assignType, setAssignType] = useState<"coding" | "writing" | "both" | "quiz">("coding");
  const [difficulty, setDifficulty] = useState("medium");
  const [language, setLanguage] = useState("python");
  const [problemCount, setProblemCount] = useState(5);
  const [baekjoonCount, setBaekjoonCount] = useState(0);
  const [programmersCount, setProgrammersCount] = useState(0);
  const [blockCount, setBlockCount] = useState(0);
  const [mcCount, setMcCount] = useState(5);
  const [saCount, setSaCount] = useState(3);
  const [essayCount, setEssayCount] = useState(2);
  const [creating, setCreating] = useState(false);

  // Upload material modal
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const tutorialStart = useTutorialStore((s) => s.start);
  const tutorialCompleted = useTutorialStore((s) => s.isCompleted);

  // Load data
  useEffect(() => {
    (async () => {
      try {
        const { data: courses } = await api.get("/courses");
        const personal = courses.find((c: Course & { is_personal?: boolean }) => c.is_personal);
        if (personal) {
          setCourse(personal);
          const [asgnsRes, matsRes, notesRes] = await Promise.all([
            api.get(`/courses/${personal.id}/assignments`),
            api.get(`/courses/${personal.id}/materials`).catch(() => ({ data: [] })),
            api.get(`/courses/${personal.id}/notes`).catch(() => ({ data: [] })),
          ]);
          setAssignments(asgnsRes.data);
          setMaterials(matsRes.data);

          // Build dashboard stats
          const allSubs: (SubmissionBrief & { assignmentTitle: string })[] = [];
          const scoresByDate = new Map<string, number[]>();
          const perAssign: { name: string; score: number; count: number }[] = [];
          let totalProblems = 0;
          const solvedProblemSet = new Set<string>();

          for (const a of asgnsRes.data as Assignment[]) {
            totalProblems += a.problems?.length || 0;
            try {
              const { data: subs } = await api.get(`/courses/${personal.id}/assignments/${a.id}/submissions`);
              const scores: number[] = [];
              for (const s of subs) {
                const sc = s.ai_analyses?.[0]?.final_score ?? s.ai_analyses?.[0]?.score ?? null;
                allSubs.push({ ...s, assignmentTitle: a.title });
                if (sc != null) {
                  scores.push(sc);
                  const day = new Date(s.submitted_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
                  if (!scoresByDate.has(day)) scoresByDate.set(day, []);
                  scoresByDate.get(day)!.push(sc);
                }
                if (s.problem_index != null) solvedProblemSet.add(`${a.id}_${s.problem_index}`);
              }
              if (scores.length > 0) {
                perAssign.push({
                  name: a.title.length > 10 ? a.title.slice(0, 10) + "…" : a.title,
                  score: Math.round(scores.reduce((x, y) => x + y, 0) / scores.length),
                  count: subs.length,
                });
              }
            } catch { /* skip */ }
          }

          allSubs.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
          const allScores = allSubs
            .map((s) => s.ai_analyses?.[0]?.final_score ?? s.ai_analyses?.[0]?.score ?? null)
            .filter((s): s is number => s !== null);

          const scoreHistory = [...scoresByDate.entries()]
            .map(([date, scores]) => ({
              date,
              score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
            }))
            .slice(-14);

          setStats({
            totalAssignments: asgnsRes.data.length,
            totalSubmissions: allSubs.length,
            totalNotes: notesRes.data.length,
            avgScore: allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : null,
            bestScore: allScores.length > 0 ? Math.max(...allScores) : null,
            solvedProblems: solvedProblemSet.size,
            totalProblems,
            recentSubmissions: allSubs.slice(0, 8),
            scoreHistory,
            perAssignment: perAssign,
          });
        }
      } catch {
        // virtual course may not exist yet
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Polling for generating assignments
  const pollingRef = useRef<ReturnType<typeof setInterval>>();
  const startPolling = useCallback(() => {
    if (pollingRef.current || !course) return;
    let count = 0;
    pollingRef.current = setInterval(async () => {
      count++;
      if (count > 40) { clearInterval(pollingRef.current!); pollingRef.current = undefined; return; }
      try {
        const { data } = await api.get(`/courses/${course.id}/assignments`);
        setAssignments(data);
        if (!data.some((a: any) => a.generation_status === "generating")) {
          clearInterval(pollingRef.current!);
          pollingRef.current = undefined;
        }
      } catch { /* ignore */ }
    }, 8000);
  }, [course]);

  useEffect(() => {
    return () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = undefined; } };
  }, []);

  const handleCreate = async () => {
    if (!course || !title.trim() || !topic.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post(`/courses/${course.id}/assignments`, {
        title, topic, difficulty, language,
        problem_count: assignType !== "writing" && assignType !== "quiz" ? problemCount : 0,
        baekjoon_count: assignType !== "writing" && assignType !== "quiz" ? baekjoonCount : 0,
        programmers_count: assignType !== "writing" && assignType !== "quiz" ? programmersCount : 0,
        block_count: assignType !== "writing" && assignType !== "quiz" ? blockCount : 0,
        ...(assignType === "quiz" ? {
          quiz_count: mcCount + saCount + essayCount,
          mc_count: mcCount,
          sa_count: saCount,
          essay_count: essayCount,
        } : {}),
        type: assignType, ai_policy: "free",
      });
      setAssignments((prev) => [data, ...prev]);
      setShowModal(false);
      setTitle(""); setTopic("");
      if (data.generation_status === "generating") startPolling();
    } catch { toast.error("챌린지 생성에 실패했습니다."); }
    finally { setCreating(false); }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!course) return;
    if (!(await customConfirm("이 챌린지를 삭제하시겠습니까?", { danger: true, confirmText: "삭제" }))) return;
    try {
      await api.delete(`/courses/${course.id}/assignments/${assignmentId}`);
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    } catch { toast.error("삭제에 실패했습니다."); }
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
      setShowUpload(false); setUploadTitle(""); setUploadFile(null);
    } catch { toast.error("업로드에 실패했습니다."); }
    finally { setUploading(false); }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!course) return;
    if (!(await customConfirm("이 자료를 삭제하시겠습니까?", { danger: true, confirmText: "삭제" }))) return;
    try {
      await api.delete(`/courses/${course.id}/materials/${materialId}`);
      setMaterials((prev) => prev.filter((m) => m.id !== materialId));
    } catch { toast.error("삭제에 실패했습니다."); }
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
    if (t === "quiz") return "퀴즈";
    return t;
  };

  const getScore = (s: SubmissionBrief) => s.ai_analyses?.[0]?.final_score ?? s.ai_analyses?.[0]?.score ?? null;

  return (
    <AppShell>
      <div className="content">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h1 className="page-title" style={{ marginBottom: 0 }}>내 학습 공간</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setShowUpload(true)}>+ 자료</button>
            <button className="btn btn-primary" onClick={() => setShowModal(true)} data-tutorial="create-assignment">+ 챌린지 만들기</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "2px solid var(--outline-variant)", paddingBottom: 0 }}>
          {(["dashboard", "assignments", "materials"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "10px 20px", border: "none", background: "transparent", cursor: "pointer",
              fontSize: 14, fontWeight: tab === t ? 700 : 500,
              color: tab === t ? "var(--primary)" : "var(--on-surface-variant)",
              borderBottom: tab === t ? "2px solid var(--primary)" : "2px solid transparent",
              marginBottom: -2, transition: "all 0.15s",
            }}>
              {t === "dashboard" ? "대시보드" : t === "assignments" ? `챌린지 (${assignments.length})` : `자료 (${materials.length})`}
            </button>
          ))}
        </div>

        {/* ═══════ DASHBOARD TAB ═══════ */}
        {tab === "dashboard" && (
          <>
            {/* Stats cards */}
            <div className="stats-grid" style={{ marginBottom: 28 }}>
              <div className="card" style={{ padding: 20, textAlign: "center" }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: "var(--primary)" }}>{stats.totalAssignments}</div>
                <div style={{ fontSize: 13, color: "var(--on-surface-variant)", marginTop: 4 }}>챌린지</div>
              </div>
              <div className="card" style={{ padding: 20, textAlign: "center" }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: "var(--primary)" }}>{stats.totalSubmissions}</div>
                <div style={{ fontSize: 13, color: "var(--on-surface-variant)", marginTop: 4 }}>제출</div>
              </div>
              <div className="card" style={{ padding: 20, textAlign: "center" }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: stats.avgScore != null && stats.avgScore >= 80 ? "var(--success)" : "var(--primary)" }}>
                  {stats.avgScore != null ? `${stats.avgScore}` : "-"}
                </div>
                <div style={{ fontSize: 13, color: "var(--on-surface-variant)", marginTop: 4 }}>평균 점수</div>
              </div>
              <div className="card" style={{ padding: 20, textAlign: "center" }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: "var(--primary)" }}>{stats.totalNotes}</div>
                <div style={{ fontSize: 13, color: "var(--on-surface-variant)", marginTop: 4 }}>노트</div>
              </div>
            </div>

            {/* Progress bar */}
            {stats.totalProblems > 0 && (
              <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>문제 풀이 진행률</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)" }}>
                    {stats.solvedProblems}/{stats.totalProblems}
                  </span>
                </div>
                <div style={{ height: 10, borderRadius: 5, background: "var(--surface-container-high)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 5,
                    width: `${Math.round(stats.solvedProblems / stats.totalProblems * 100)}%`,
                    background: "var(--primary)", transition: "width 0.5s",
                  }} />
                </div>
              </div>
            )}

            {/* Charts row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
              {/* Score trend */}
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>점수 추이</h3>
                {stats.scoreHistory.length > 1 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={stats.scoreHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--on-surface-variant)" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--on-surface-variant)" />
                      <Tooltip />
                      <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--on-surface-variant)", fontSize: 13 }}>
                    데이터가 부족합니다
                  </div>
                )}
              </div>

              {/* Per-assignment scores */}
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>챌린지별 평균</h3>
                {stats.perAssignment.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={stats.perAssignment}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--on-surface-variant)" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--on-surface-variant)" />
                      <Tooltip />
                      <Bar dataKey="score" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--on-surface-variant)", fontSize: 13 }}>
                    데이터가 부족합니다
                  </div>
                )}
              </div>
            </div>

            {/* Recent submissions */}
            <div className="card" style={{ padding: 20, marginBottom: 28 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>최근 제출</h3>
              {stats.recentSubmissions.length === 0 ? (
                <div style={{ color: "var(--on-surface-variant)", fontSize: 13 }}>아직 제출 기록이 없습니다.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {stats.recentSubmissions.map((s) => {
                    const sc = getScore(s);
                    return (
                      <div key={s.id} style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "8px 12px",
                        borderRadius: 8, background: "var(--surface-container)", fontSize: 13,
                      }}>
                        <span style={{ fontWeight: 600, flex: 1 }}>{s.assignmentTitle}</span>
                        <span style={{ color: "var(--on-surface-variant)", fontSize: 12 }}>
                          {s.problem_index != null && `#${s.problem_index + 1}`}
                        </span>
                        {sc != null ? (
                          <span style={{ fontWeight: 600, color: sc >= 80 ? "var(--success)" : sc >= 60 ? "var(--primary)" : "var(--error)", minWidth: 40, textAlign: "right" }}>
                            {sc}점
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--on-surface-variant)", minWidth: 40, textAlign: "right" }}>
                            {s.status === "analyzing" ? "분석중" : "-"}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: "var(--on-surface-variant)", minWidth: 80, textAlign: "right" }}>
                          {new Date(s.submitted_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick links */}
            {course && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
                <div className="card course-card" style={{ padding: 20, textAlign: "center" }} onClick={() => setShowModal(true)}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>&#x1F4DD;</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>새 챌린지</div>
                </div>
                <div className="card course-card" style={{ padding: 20, textAlign: "center" }}
                  onClick={() => navigate(`/courses/${course.id}/notes/new`)}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>&#x1F4D3;</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>노트 작성</div>
                </div>
                <div className="card course-card" style={{ padding: 20, textAlign: "center" }}
                  onClick={() => navigate(`/courses/${course.id}/notes`)}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>&#x1F4DA;</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>내 노트</div>
                </div>
                <div className="card course-card" style={{ padding: 20, textAlign: "center" }}
                  onClick={() => navigate(`/courses/${course.id}/graph`)}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>&#x1F578;</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>지식 그래프</div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════ ASSIGNMENTS TAB ═══════ */}
        {tab === "assignments" && (
          <>
            {assignments.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: "center" }}>
                <p style={{ color: "var(--on-surface-variant)", fontSize: 14 }}>
                  아직 챌린지가 없습니다. "챌린지 만들기"를 눌러 시작하세요!
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }} data-tutorial="assignment-list">
                {assignments.map((a) => {
                  const totalP = a.problems?.length || 0;
                  return (
                    <div key={a.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 16, padding: "16px 20px",
                        cursor: "pointer",
                      }}
                        onClick={() => navigate(`/personal/courses/${course!.id}/assignments/${a.id}`)}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, fontSize: 15 }}>{a.title}</span>
                            {a.generation_status === "generating" && (
                              <span className="badge" style={{ background: "rgba(0,74,198,0.1)", color: "var(--primary)", fontSize: 11, animation: "pulse 1.5s infinite" }}>
                                AI 생성 중...
                              </span>
                            )}
                            {a.generation_status === "failed" && (
                              <span className="badge" style={{ background: "rgba(220,38,38,0.08)", color: "var(--error)", fontSize: 11 }}>
                                {a.rubric?.fail_reason === "ai_overloaded" ? "AI 서버 과부하 — 잠시 후 다시 시도해주세요" : "생성 실패"}
                              </span>
                            )}
                          </div>
                          {a.topic && <div style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>{a.topic}</div>}
                          <div className="course-meta" style={{ marginTop: 8 }}>
                            <span className="badge">{typeLabel(a.type)}</span>
                            <span className="badge">{a.generation_status === "generating" ? "생성 중..." : `${totalP}문제`}</span>
                            <span className="badge badge-invite">{a.language}</span>
                            <span style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>
                              {new Date(a.created_at).toLocaleDateString("ko-KR")}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }} onClick={(e) => e.stopPropagation()}>
                          <button className="btn btn-primary" style={{ fontSize: 13, padding: "6px 16px" }}
                            onClick={() => navigate(a.type === "quiz" ? `/assignments/${a.id}/quiz` : a.type === "writing" ? `/assignments/${a.id}/write` : `/assignments/${a.id}/code`)}>
                            풀기
                          </button>
                          <button className="btn btn-ghost" style={{ fontSize: 13, padding: "6px 12px", color: "var(--error)" }}
                            onClick={() => handleDeleteAssignment(a.id)}>
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ═══════ MATERIALS TAB ═══════ */}
        {tab === "materials" && (
          <>
            {materials.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: "center" }}>
                <p style={{ color: "var(--on-surface-variant)", fontSize: 14 }}>
                  아직 업로드한 자료가 없습니다.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {materials.map((m) => (
                  <div key={m.id} className="card" style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 24 }}>&#x1F4C4;</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{m.title}</div>
                      <div style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>
                        {m.file_name} &middot; {new Date(m.created_at).toLocaleDateString("ko-KR")}
                      </div>
                    </div>
                    <a href={m.file_url} target="_blank" rel="noreferrer"
                      className="btn btn-secondary" style={{ fontSize: 12, padding: "4px 14px", textDecoration: "none" }}>
                      다운로드
                    </a>
                    <button className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 8px", color: "var(--error)" }}
                      onClick={() => handleDeleteMaterial(m.id)}>삭제</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══════ CREATE ASSIGNMENT MODAL ═══════ */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>새 챌린지 만들기</h2>
            <div className="form-group">
              <div>
                <label className="form-label">챌린지 제목</label>
                <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: Python 기초 연습" />
              </div>
              <div>
                <label className="form-label">주제</label>
                <input className="form-input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="예: 반복문과 조건문" />
              </div>
              <div>
                <label className="form-label">챌린지 유형</label>
                <div className="type-chips">
                  {(["coding", "writing", "both", "quiz"] as const).map((t) => (
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
              {assignType !== "writing" && assignType !== "quiz" && (
                <div className="problem-counts-section">
                  <label className="form-label">문제 구성</label>
                  <div className="problem-counts-grid">
                    <div className="problem-count-item">
                      <label className="problem-count-label">일반 코딩</label>
                      <input className="form-input" type="number" min={0} max={10} value={problemCount} onChange={(e) => setProblemCount(Number(e.target.value))} />
                    </div>
                    <div className="problem-count-item">
                      <label className="problem-count-label">표준 입출력형<span className="problem-count-tag bj">stdin/stdout</span></label>
                      <input className="form-input" type="number" min={0} max={10} value={baekjoonCount} onChange={(e) => setBaekjoonCount(Number(e.target.value))} />
                    </div>
                    <div className="problem-count-item">
                      <label className="problem-count-label">함수 구현형<span className="problem-count-tag pg">함수 기반</span></label>
                      <input className="form-input" type="number" min={0} max={10} value={programmersCount} onChange={(e) => setProgrammersCount(Number(e.target.value))} />
                    </div>
                    <div className="problem-count-item">
                      <label className="problem-count-label">블록 코딩<span className="problem-count-tag" style={{ background: "rgba(245,158,11,0.12)", color: "#d97706" }}>Blockly</span></label>
                      <input className="form-input" type="number" min={0} max={10} value={blockCount} onChange={(e) => setBlockCount(Number(e.target.value))} />
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 6 }}>
                    총 {problemCount + baekjoonCount + programmersCount + blockCount}문제
                  </div>
                </div>
              )}
              {assignType === "quiz" && (
                <div className="problem-counts-section">
                  <label className="form-label">퀴즈 유형별 문제 수</label>
                  <div className="problem-counts-grid">
                    <div className="problem-count-item">
                      <label className="problem-count-label">
                        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--primary)", marginRight: 6 }} />
                        객관식
                      </label>
                      <input className="input problem-count-input" type="number" min={0} max={20}
                        value={mcCount} onChange={(e) => setMcCount(Math.max(0, Number(e.target.value)))} />
                    </div>
                    <div className="problem-count-item">
                      <label className="problem-count-label">
                        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--success)", marginRight: 6 }} />
                        주관식
                      </label>
                      <input className="input problem-count-input" type="number" min={0} max={20}
                        value={saCount} onChange={(e) => setSaCount(Math.max(0, Number(e.target.value)))} />
                    </div>
                    <div className="problem-count-item">
                      <label className="problem-count-label">
                        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--tertiary)", marginRight: 6 }} />
                        서술형
                      </label>
                      <input className="input problem-count-input" type="number" min={0} max={10}
                        value={essayCount} onChange={(e) => setEssayCount(Math.max(0, Number(e.target.value)))} />
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 6 }}>
                    총 {mcCount + saCount + essayCount}문제
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

      {/* ═══════ UPLOAD MATERIAL MODAL ═══════ */}
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
                <input className="form-input" type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)} style={{ padding: "8px 10px" }} />
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
