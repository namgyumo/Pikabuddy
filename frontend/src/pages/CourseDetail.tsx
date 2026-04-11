import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import api from "../lib/api";
import { useAuthStore } from "../store/authStore";
import AppShell from "../components/common/AppShell";
import { toast } from "../lib/toast";
import type { Course, Assignment, CourseMaterial } from "../types";

function getKoreanHolidays(year: number): { date: string; title: string }[] {
  const fixed = [
    { m: 1, d: 1, title: "신정" },
    { m: 3, d: 1, title: "삼일절" },
    { m: 5, d: 5, title: "어린이날" },
    { m: 6, d: 6, title: "현충일" },
    { m: 8, d: 15, title: "광복절" },
    { m: 10, d: 3, title: "개천절" },
    { m: 10, d: 9, title: "한글날" },
    { m: 12, d: 25, title: "크리스마스" },
  ];
  const lunar: Record<number, { m: number; d: number; title: string }[]> = {
    2025: [
      { m: 1, d: 28, title: "설날 연휴" }, { m: 1, d: 29, title: "설날" }, { m: 1, d: 30, title: "설날 연휴" },
      { m: 5, d: 5, title: "석가탄신일" },
      { m: 9, d: 5, title: "추석 연휴" }, { m: 9, d: 6, title: "추석" }, { m: 9, d: 7, title: "추석 연휴" },
    ],
    2026: [
      { m: 2, d: 16, title: "설날 연휴" }, { m: 2, d: 17, title: "설날" }, { m: 2, d: 18, title: "설날 연휴" },
      { m: 5, d: 24, title: "석가탄신일" },
      { m: 9, d: 24, title: "추석 연휴" }, { m: 9, d: 25, title: "추석" }, { m: 9, d: 26, title: "추석 연휴" },
    ],
  };
  const all = [...fixed, ...(lunar[year] || [])];
  return all.map((h) => ({
    date: `${year}-${String(h.m).padStart(2, "0")}-${String(h.d).padStart(2, "0")}T00:00:00`,
    title: h.title,
  }));
}

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [assignType, setAssignType] = useState<"coding" | "writing" | "both" | "quiz">("coding");
  const [language, setLanguage] = useState("python");
  const [aiPolicy, setAiPolicy] = useState("normal");
  const [problemCount, setProblemCount] = useState(5);
  const [baekjoonCount, setBaekjoonCount] = useState(0);
  const [programmersCount, setProgrammersCount] = useState(0);
  const [blockCount, setBlockCount] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [gradingStrictness, setGradingStrictness] = useState("normal");
  const [gradingNote, setGradingNote] = useState("");
  const [mcCount, setMcCount] = useState(5);
  const [saCount, setSaCount] = useState(3);
  const [essayCount, setEssayCount] = useState(2);
  const [creating, setCreating] = useState(false);
  const [qaTarget, setQaTarget] = useState("");
  const [qaMessage, setQaMessage] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [showCompleted, setShowCompleted] = useState(false);

  const reloadAssignments = useCallback(() => {
    if (!courseId) return;
    api.get(`/courses/${courseId}/assignments`).then(({ data }) => setAssignments(data)).catch(() => {});
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    Promise.all([
      api.get(`/courses/${courseId}`),
      api.get(`/courses/${courseId}/assignments`).catch(() => ({ data: [] })),
      api.get(`/courses/${courseId}/materials`).catch(() => ({ data: [] })),
    ]).then(([courseRes, assignRes, matRes]) => {
      setCourse(courseRes.data);
      setAssignments(assignRes.data);
      setMaterials(matRes.data);
      setLoading(false);
    });
  }, [courseId]);

  // 생성 중인 과제 폴링 — useEffect가 아닌 명시적 호출로만 시작
  const pollingRef = useRef<ReturnType<typeof setInterval>>();
  const startPolling = useCallback(() => {
    if (pollingRef.current || !courseId) return;
    let count = 0;
    pollingRef.current = setInterval(async () => {
      count++;
      if (count > 40) {
        clearInterval(pollingRef.current!);
        pollingRef.current = undefined;
        return;
      }
      try {
        const { data } = await api.get(`/courses/${courseId}/assignments`);
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
  }, [courseId]);

  // 컴포넌트 언마운트 시 폴링 정리
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = undefined;
      }
    };
  }, []);

  const handleCreateAssignment = async () => {
    if (!title.trim() || !topic.trim() || !courseId) return;
    setCreating(true);
    try {
      const { data } = await api.post(`/courses/${courseId}/assignments`, {
        title,
        topic,
        type: assignType,
        difficulty: "medium",
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
        ai_policy: aiPolicy,
        language: assignType !== "writing" && assignType !== "quiz" ? language : "text",
        grading_strictness: gradingStrictness,
        ...(gradingNote.trim() ? { grading_note: gradingNote.trim() } : {}),
        ...(dueDate ? { due_date: new Date(dueDate).toISOString() } : {}),
      });
      setAssignments((prev) => [data, ...prev]);
      setShowCreate(false);
      setTitle("");
      setTopic("");
      setDueDate("");
      // 생성 중인 과제가 있으면 폴링 시작
      if (data.generation_status === "generating") {
        startPolling();
      }
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="loading-spinner" style={{ marginTop: 120 }}>
          강의를 불러오는 중...
        </div>
      </AppShell>
    );
  }

  if (!course) {
    return (
      <AppShell>
        <div className="empty" style={{ marginTop: 120 }}>
          강의를 찾을 수 없습니다.
        </div>
      </AppShell>
    );
  }

  const isAdmin = user?.email?.endsWith("@pikabuddy.admin") ?? false;
  const isProfessor = user?.role === "professor";
  const isPersonal = user?.role === "personal";
  const canManage = isProfessor || isPersonal;
  const policyLabels: Record<string, string> = {
    free: "자유",
    normal: "보통",
    strict: "엄격",
    exam: "시험",
  };

  return (
    <AppShell courseTitle={course.title}>
      <main className="content">
        {/* Course Info */}
        <div className="card course-info">
          <h2>{course.title}</h2>
          {course.description && <p>{course.description}</p>}
          {course.objectives && course.objectives.length > 0 && (
            <div className="course-objectives">
              <strong>강의 목표</strong>
              <ul>
                {course.objectives.map((obj, i) => (
                  <li key={i}>{obj}</li>
                ))}
              </ul>
            </div>
          )}
          {isProfessor && (
            <div className="course-meta" style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <span className="badge badge-invite">
                초대코드: {course.invite_code}
              </span>
              <button
                className="btn btn-secondary"
                style={{ fontSize: 13, padding: "4px 12px" }}
                onClick={() => setShowQr(true)}
              >
                QR 코드
              </button>
            </div>
          )}
        </div>

        {/* Assignments */}
        <div className="page-header" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h2 className="section-title">과제 목록</h2>
            <div className="type-chips" style={{ marginBottom: 0 }}>
              <button className={`type-chip${viewMode === "list" ? " active" : ""}`} onClick={() => setViewMode("list")}>목록</button>
              <button className={`type-chip${viewMode === "calendar" ? " active" : ""}`} onClick={() => setViewMode("calendar")}>캘린더</button>
            </div>
          </div>
          {canManage && (
            <button
              className="btn btn-primary"
              onClick={() => setShowCreate(true)}
            >
              + 과제 생성
            </button>
          )}
        </div>

        {showCreate && (
          <div className="card create-form">
            <h3>새 과제 생성</h3>

            {/* 과제 유형 선택 */}
            <div className="type-chips">
              {(["coding", "writing", "both", "quiz"] as const).map((t) => (
                <button
                  key={t}
                  className={`type-chip${assignType === t ? " active" : ""}`}
                  onClick={() => setAssignType(t)}
                  type="button"
                >
                  {t === "coding" ? "코딩" : t === "writing" ? "글쓰기" : t === "both" ? "코딩+글쓰기" : "퀴즈"}
                </button>
              ))}
            </div>

            <input
              className="input"
              placeholder="과제명 (예: 포인터 실습)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              className="input"
              placeholder={assignType === "writing" ? "주제 (예: 현대 사회와 AI의 역할)" : "주제 (예: 포인터와 메모리)"}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />

            <div className="form-row">
              {assignType !== "writing" && (
                <select
                  className="input"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="python">Python</option>
                  <option value="c">C</option>
                  <option value="java">Java</option>
                  <option value="javascript">JavaScript</option>
                </select>
              )}
              <select
                className="input"
                value={aiPolicy}
                onChange={(e) => setAiPolicy(e.target.value)}
              >
                <option value="free">자유 (AI 허용)</option>
                <option value="normal">보통 (복붙 감지)</option>
                <option value="strict">엄격 (AI 제한)</option>
                <option value="exam">시험 (전부 차단)</option>
              </select>
            </div>

            {/* 문제 구성 */}
            {assignType !== "writing" && (
              <div className="problem-counts-section">
                <label style={{ fontSize: 13, color: "var(--on-surface-variant)", marginBottom: 8, display: "block" }}>
                  문제 구성
                </label>
                <div className="problem-counts-grid">
                  <div className="problem-count-item">
                    <label className="problem-count-label">일반 코딩</label>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      max={10}
                      value={problemCount}
                      onChange={(e) => setProblemCount(Number(e.target.value))}
                    />
                  </div>
                  <div className="problem-count-item">
                    <label className="problem-count-label">
                      표준 입출력형
                      <span className="problem-count-tag bj">stdin/stdout</span>
                    </label>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      max={10}
                      value={baekjoonCount}
                      onChange={(e) => setBaekjoonCount(Number(e.target.value))}
                    />
                  </div>
                  <div className="problem-count-item">
                    <label className="problem-count-label">
                      함수 구현형
                      <span className="problem-count-tag pg">함수 기반</span>
                    </label>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      max={10}
                      value={programmersCount}
                      onChange={(e) => setProgrammersCount(Number(e.target.value))}
                    />
                  </div>
                  <div className="problem-count-item">
                    <label className="problem-count-label">
                      블록 코딩
                      <span className="problem-count-tag" style={{ background: "rgba(245,158,11,0.12)", color: "#d97706" }}>Blockly</span>
                    </label>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      max={10}
                      value={blockCount}
                      onChange={(e) => setBlockCount(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 6 }}>
                  총 {problemCount + baekjoonCount + programmersCount + blockCount}문제
                </div>
              </div>
            )}
            {/* 퀴즈 설정 */}
            {assignType === "quiz" && (
              <div className="problem-counts-section">
                <label style={{ fontSize: 13, color: "var(--on-surface-variant)", marginBottom: 8, display: "block" }}>
                  퀴즈 유형별 문제 수
                </label>
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
            {/* 채점 강도 */}
            <div>
              <label style={{ fontSize: 13, color: "var(--on-surface-variant)", marginBottom: 6, display: "block" }}>
                AI 추천 점수 강도
              </label>
              <div className="form-row" style={{ gap: 0 }}>
                {([
                  { value: "mild", label: "순한맛", desc: "관대하게" },
                  { value: "normal", label: "보통맛", desc: "균형있게" },
                  { value: "strict", label: "매운맛", desc: "엄격하게" },
                ] as const).map((opt, i) => (
                  <button
                    key={opt.value}
                    className={`btn ${gradingStrictness === opt.value ? "btn-primary" : "btn-secondary"}`}
                    style={{
                      flex: 1,
                      borderRadius: i === 0 ? "10px 0 0 10px" : i === 2 ? "0 10px 10px 0" : 0,
                      fontSize: 13,
                    }}
                    onClick={() => setGradingStrictness(opt.value)}
                    type="button"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 교수 유의사항 */}
            <textarea
              className="input"
              placeholder="AI 채점 시 유의사항 (선택) — 예: 변수명 컨벤션 중시, 주제 벗어나면 큰 감점 등"
              value={gradingNote}
              onChange={(e) => setGradingNote(e.target.value)}
              rows={2}
              style={{ resize: "vertical", fontFamily: "inherit" }}
            />

            <div className="form-row">
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--on-surface-variant)" }}>
                기한
                <input
                  className="input"
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  style={{ flex: 1 }}
                />
              </label>
            </div>
            <div className="form-actions">
              <button
                className="btn btn-primary"
                onClick={handleCreateAssignment}
                disabled={creating}
              >
                {creating ? "AI가 문제를 생성 중..." : "과제 생성"}
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

        {assignments.length === 0 ? (
          <div className="empty">
            아직 과제가 없습니다.
            {canManage && (
              <>
                <br />
                "과제 생성"으로 AI가 자동 생성하는 실습 문제를 만들어보세요.
              </>
            )}
          </div>
        ) : viewMode === "calendar" ? (
          /* ── 캘린더 뷰 ── */
          (() => {
            const year = calMonth.getFullYear();
            const month = calMonth.getMonth();
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

            // 공휴일
            const holidays = getKoreanHolidays(year);
            const holidayByDate: Record<string, string[]> = {};
            const holidayDates = new Set<number>();
            for (const h of holidays) {
              const hd = new Date(h.date);
              if (hd.getFullYear() === year && hd.getMonth() === month) {
                const key = hd.getDate().toString();
                if (!holidayByDate[key]) holidayByDate[key] = [];
                holidayByDate[key].push(h.title);
                holidayDates.add(hd.getDate());
              }
            }

            // 과제를 날짜별로 그룹화
            const byDate: Record<string, Assignment[]> = {};
            for (const a of assignments) {
              if (a.due_date) {
                const d = new Date(a.due_date);
                if (d.getFullYear() === year && d.getMonth() === month) {
                  const key = d.getDate().toString();
                  if (!byDate[key]) byDate[key] = [];
                  byDate[key].push(a);
                }
              }
            }

            const cells: React.ReactNode[] = [];
            // 빈 칸
            for (let i = 0; i < firstDay; i++) {
              cells.push(<div key={`e-${i}`} className="cal-cell cal-empty" />);
            }
            // 날짜
            for (let d = 1; d <= daysInMonth; d++) {
              const isToday = `${year}-${month}-${d}` === todayStr;
              const isHoliday = holidayDates.has(d);
              const items = byDate[d.toString()] || [];
              const hols = holidayByDate[d.toString()] || [];
              cells.push(
                <div key={d} className={`cal-cell${isToday ? " cal-today" : ""}${items.length > 0 ? " cal-has-items" : ""}${isHoliday ? " cal-holiday" : ""}`}>
                  <div className={`cal-date${isHoliday ? " cal-date-holiday" : ""}`}>{d}</div>
                  <div className="cal-items">
                    {hols.map((name, hi) => (
                      <div key={`hol-${hi}`} className="cal-item cal-item-holiday" title={name}>
                        <span className="cal-item-dot" style={{ background: "var(--error)" }} />
                        <span className="cal-item-title">{name}</span>
                      </div>
                    ))}
                    {items.map((a) => {
                      const isOverdue = new Date(a.due_date!) < new Date();
                      return (
                        <div key={a.id} className={`cal-item${isOverdue ? " cal-overdue" : ""}`}
                          onClick={() => {
                            if (isPersonal) navigate(`/personal/courses/${courseId}/assignments/${a.id}`);
                            else if (isProfessor) navigate(`/courses/${courseId}/assignments/${a.id}`);
                            else if (a.type === "quiz") navigate(`/assignments/${a.id}/quiz`);
                            else if (a.type === "writing") navigate(`/assignments/${a.id}/write`);
                            else navigate(`/assignments/${a.id}/code`);
                          }}>
                          <span className="cal-item-dot" style={{
                            background: a.type === "quiz" ? "var(--warning)" : a.type === "writing" ? "var(--tertiary)" : a.type === "algorithm" ? "var(--success)" : "var(--primary)",
                          }} />
                          <span className="cal-item-title">{a.is_team_assignment ? "👥 " : ""}{a.title}</span>
                          <span className="cal-item-time">
                            {new Date(a.due_date!).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            return (
              <div className="assignment-calendar">
                <div className="cal-nav">
                  <button className="btn btn-ghost" onClick={() => setCalMonth(new Date(year, month - 1, 1))}>&lt;</button>
                  <span className="cal-nav-title">{year}년 {month + 1}월</span>
                  <button className="btn btn-ghost" onClick={() => setCalMonth(new Date(year, month + 1, 1))}>&gt;</button>
                </div>
                <div className="cal-header">
                  {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                    <div key={d} className="cal-header-cell">{d}</div>
                  ))}
                </div>
                <div className="cal-grid">{cells}</div>
                {/* 기한 없는 과제 */}
                {assignments.filter((a) => !a.due_date).length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--on-surface-variant)", marginBottom: 8 }}>기한 없음</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {assignments.filter((a) => !a.due_date).map((a) => (
                        <span key={a.id} className="badge" style={{ cursor: "pointer" }}
                          onClick={() => {
                            if (isProfessor) navigate(`/courses/${courseId}/assignments/${a.id}`);
                            else navigate(`/assignments/${a.id}/code`);
                          }}>{a.title}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          (() => {
            const activeAssignments = assignments.filter((a) => !a.has_submitted);
            const completedAssignments = assignments.filter((a) => a.has_submitted);

            const renderAssignmentCard = (a: Assignment) => {
              const isOverdue = a.due_date && new Date(a.due_date) < new Date();
              const dueLabel = a.due_date
                ? new Date(a.due_date).toLocaleDateString("ko-KR", {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })
                : null;

              return (
                <div
                  key={a.id}
                  className="card course-card"
                  onClick={() => {
                    if (isPersonal) {
                      navigate(`/personal/courses/${courseId}/assignments/${a.id}`);
                    } else if (isProfessor) {
                      navigate(`/courses/${courseId}/assignments/${a.id}`);
                    } else if (a.type === "quiz") {
                      navigate(`/assignments/${a.id}/quiz`);
                    } else if (a.type === "writing") {
                      navigate(`/assignments/${a.id}/write`);
                    } else if (a.type === "both") {
                      navigate(`/assignments/${a.id}/code`);
                    } else {
                      navigate(`/assignments/${a.id}/code`);
                    }
                  }}
                >
                  <h3 style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {a.title}
                    {a.is_team_assignment && (
                      <span className="badge" style={{ background: "rgba(99,46,205,0.1)", color: "var(--tertiary)", fontSize: 11 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 2, verticalAlign: -1 }}>
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        조별과제
                      </span>
                    )}
                    {a.has_submitted && (
                      <span className="badge" style={{ background: "rgba(16,185,129,0.1)", color: "var(--success)", fontSize: 11 }}>제출 완료</span>
                    )}
                    {a.status === "draft" && (
                      <span className="badge" style={{ background: "rgba(245,158,11,0.12)", color: "#d97706", fontSize: 11 }}>초안</span>
                    )}
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
                  </h3>
                  <p>{a.topic || "주제 없음"}</p>
                  <div className="course-meta">
                    <span className="badge" style={{
                      background: a.type === "writing" ? "rgba(99,46,205,0.1)" : a.type === "both" ? "rgba(0,74,198,0.1)" : a.type === "algorithm" ? "rgba(16,185,129,0.1)" : a.type === "quiz" ? "rgba(245,158,11,0.1)" : undefined,
                      color: a.type === "writing" ? "var(--tertiary)" : a.type === "both" ? "var(--primary)" : a.type === "algorithm" ? "var(--success)" : a.type === "quiz" ? "var(--warning)" : undefined,
                    }}>
                      {a.type === "writing" ? "글쓰기" : a.type === "both" ? "코딩+글쓰기" : a.type === "algorithm" ? "알고리즘" : a.type === "quiz" ? "퀴즈" : "코딩"}
                    </span>
                    <span className="badge badge-policy">
                      {policyLabels[a.ai_policy] || a.ai_policy}
                    </span>
                    {a.type !== "writing" && <span className="badge">{a.language}</span>}
                    {a.type !== "writing" && (
                      <span className="badge">문제 {a.problems?.length || 0}개</span>
                    )}
                    {(() => {
                      const bjCount = a.problems?.filter((p: Record<string, unknown>) => p.format === "baekjoon").length || 0;
                      const pgCount = a.problems?.filter((p: Record<string, unknown>) => p.format === "programmers").length || 0;
                      return (
                        <>
                          {bjCount > 0 && <span className="badge" style={{ background: "rgba(16,185,129,0.1)", color: "var(--success)" }}>표준 입출력 {bjCount}</span>}
                          {pgCount > 0 && <span className="badge" style={{ background: "rgba(99,46,205,0.1)", color: "var(--tertiary)" }}>함수 구현 {pgCount}</span>}
                        </>
                      );
                    })()}
                    {dueLabel && (
                      <span className="badge" style={{
                        background: isOverdue ? "rgba(220,38,38,0.08)" : undefined,
                        color: isOverdue ? "var(--error)" : undefined,
                      }}>
                        {isOverdue ? "마감됨" : `~${dueLabel}`}
                      </span>
                    )}
                  </div>
                </div>
              );
            };

            return (
              <>
                <div className="course-grid">
                  {activeAssignments.map(renderAssignmentCard)}
                </div>
                {completedAssignments.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <button
                      className="completed-toggle"
                      onClick={() => setShowCompleted(!showCompleted)}
                    >
                      <span className={`completed-toggle-arrow${showCompleted ? " open" : ""}`}>&#x25B6;</span>
                      완료된 과제 ({completedAssignments.length})
                    </button>
                    {showCompleted && (
                      <div className="course-grid" style={{ marginTop: 10 }}>
                        {completedAssignments.map(renderAssignmentCard)}
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()
        )}
        {/* ── 강의자료 ── */}
        <div style={{ marginTop: 32 }}>
          <div className="page-header">
            <h2 className="section-title">강의자료</h2>
            {canManage && (
              <button className="btn btn-primary" onClick={() => setShowUpload(true)}>+ 자료 업로드</button>
            )}
          </div>

          {showUpload && (
            <div className="card create-form" style={{ marginBottom: 16 }}>
              <h3>강의자료 업로드</h3>
              <p style={{ fontSize: 13, color: "var(--on-surface-variant)", margin: "0 0 8px" }}>
                여러 파일을 한번에 선택할 수 있습니다. (PDF, PPT, DOCX, HWP 등)
              </p>
              <input type="file" multiple accept=".pdf,.ppt,.pptx,.doc,.docx,.hwp,.hwpx,.xls,.xlsx"
                onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
                style={{ fontSize: 14, margin: "8px 0" }} />
              {uploadFiles.length > 0 && (
                <div style={{ fontSize: 13, color: "var(--on-surface-variant)", margin: "4px 0 8px" }}>
                  {uploadFiles.length}개 파일 선택됨
                  {uploadFiles.length > 1 && " (파일명이 제목으로 사용됩니다)"}
                </div>
              )}
              {uploadProgress && (
                <div style={{ fontSize: 13, color: "var(--primary)", margin: "4px 0" }}>{uploadProgress}</div>
              )}
              <div className="form-actions">
                <button className="btn btn-primary" disabled={uploading || uploadFiles.length === 0}
                  onClick={async () => {
                    if (uploadFiles.length === 0 || !courseId) return;
                    setUploading(true);
                    const uploaded: CourseMaterial[] = [];
                    try {
                      for (let i = 0; i < uploadFiles.length; i++) {
                        const file = uploadFiles[i];
                        setUploadProgress(`업로드 중... (${i + 1}/${uploadFiles.length}) ${file.name}`);
                        const title = file.name.replace(/\.[^.]+$/, "");
                        const fd = new FormData();
                        fd.append("title", title);
                        fd.append("file", file);
                        const { data } = await api.post(`/courses/${courseId}/materials`, fd, {
                          headers: { "Content-Type": "multipart/form-data" },
                        });
                        uploaded.push(data);
                      }
                      setMaterials((prev) => [...uploaded, ...prev]);
                      setShowUpload(false);
                      setUploadFiles([]);
                      setUploadProgress("");
                    } catch {
                      if (uploaded.length > 0) {
                        setMaterials((prev) => [...uploaded, ...prev]);
                      }
                      toast.error(`업로드 실패. ${uploaded.length}/${uploadFiles.length}개 완료됨.`);
                    } finally {
                      setUploading(false);
                      setUploadProgress("");
                    }
                  }}>
                  {uploading ? "업로드 중..." : `업로드${uploadFiles.length > 1 ? ` (${uploadFiles.length}개)` : ""}`}
                </button>
                <button className="btn btn-secondary" onClick={() => { setShowUpload(false); setUploadFiles([]); setUploadProgress(""); }}>취소</button>
              </div>
            </div>
          )}

          {materials.length === 0 ? (
            <div className="empty">
              강의자료가 없습니다.
              {isProfessor && <><br />"자료 업로드"로 PDF, PPT 등을 공유하세요.</>}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {materials.map((m) => {
                const sizeLabel = m.file_size < 1024 * 1024
                  ? `${Math.round(m.file_size / 1024)}KB`
                  : `${(m.file_size / (1024 * 1024)).toFixed(1)}MB`;
                const ext = m.file_name.split(".").pop()?.toUpperCase() || "";
                return (
                  <div key={m.id} className="card material-card">
                    <div className="material-icon">{ext === "PDF" ? "PDF" : ["PPTX","PPT"].includes(ext) ? "PPT" : ["DOC","DOCX"].includes(ext) ? "DOC" : ["HWP","HWPX"].includes(ext) ? "HWP" : ["XLS","XLSX"].includes(ext) ? "XLS" : "FILE"}</div>
                    <div className="material-info">
                      <div className="material-title">{m.title}</div>
                      <div className="material-meta">{m.file_name} &middot; {sizeLabel} &middot; {new Date(m.created_at).toLocaleDateString("ko-KR")}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {!canManage && (
                        <button className="btn btn-primary" style={{ fontSize: 12, padding: "4px 14px" }}
                          onClick={() => navigate(`/courses/${courseId}/notes?material=${m.id}`)}>
                          노트와 함께 보기
                        </button>
                      )}
                      <a href={m.file_url} target="_blank" rel="noreferrer"
                        className="btn btn-secondary" style={{ fontSize: 12, padding: "4px 14px", textDecoration: "none" }}>
                        다운로드
                      </a>
                      {canManage && (
                        <button className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 8px", color: "var(--error)" }}
                          onClick={async () => {
                            await api.delete(`/courses/${courseId}/materials/${m.id}`);
                            setMaterials((prev) => prev.filter((x) => x.id !== m.id));
                          }}>삭제</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Student / Personal quick links */}
        {(!isProfessor || isPersonal) && (
          <div style={{ marginTop: 32 }}>
            <div className="page-header">
              <h2 className="section-title">학습 도구</h2>
            </div>
            <div className="course-grid">
              <div
                className="card course-card"
                onClick={() => navigate(`/courses/${courseId}/notes`)}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>&#x1F4DD;</div>
                <h3>노트</h3>
                <p>강의 내용을 정리하고 AI 이해도 분석을 받아보세요.</p>
              </div>
              <div
                className="card course-card"
                onClick={() => navigate(`/courses/${courseId}/graph`)}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>&#x1F578;</div>
                <h3>지식 그래프</h3>
                <p>학습한 내용의 연결 관계를 시각적으로 확인하세요.</p>
              </div>
            </div>
          </div>
        )}

        {/* Professor quick links */}
        {isProfessor && (
          <div style={{ marginTop: 32 }}>
            <div className="page-header">
              <h2 className="section-title">관리 도구</h2>
            </div>
            <div className="course-grid">
              <div
                className="card course-card"
                onClick={() => navigate(`/courses/${courseId}/dashboard`)}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>&#x1F4CA;</div>
                <h3>대시보드</h3>
                <p>학생별 학습 현황과 AI 인사이트를 확인하세요.</p>
              </div>
              <div
                className="card course-card"
                onClick={() => navigate(`/courses/${courseId}/teams`)}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>&#x1F465;</div>
                <h3>팀 관리</h3>
                <p>리포트 등 팀 과제를 위해 팀을 편성하세요.</p>
              </div>
            </div>
          </div>
        )}

        {/* QA Toolbox (admin only) */}
        {isAdmin && assignments.length > 0 && (
          <div style={{ marginTop: 32, border: "2px solid var(--tertiary)", borderRadius: "var(--radius-md)", background: "var(--tertiary-container)", padding: 20 }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 16, color: "var(--on-tertiary-container)" }}>QA 도구 (어드민)</h2>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--on-surface-variant)", marginBottom: 6, display: "block" }}>대상 과제 선택</label>
              <select
                className="input"
                value={qaTarget}
                onChange={(e) => { setQaTarget(e.target.value); setQaMessage(""); }}
                style={{ maxWidth: 400 }}
              >
                <option value="">-- 과제 선택 --</option>
                {assignments.map((a) => (
                  <option key={a.id} value={a.id}>{a.title} {a.status === "draft" ? "(초안)" : ""}</option>
                ))}
              </select>
            </div>

            {qaTarget && (
              <>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--on-surface-variant)", marginBottom: 6, display: "block" }}>데이터 초기화</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                  <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={async () => {
                    await api.delete(`/courses/${courseId}/assignments/${qaTarget}/qa/paste-logs`);
                    setQaMessage("복붙 로그 초기화 완료");
                  }}>복붙 로그 초기화</button>
                  <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={async () => {
                    await api.delete(`/courses/${courseId}/assignments/${qaTarget}/qa/snapshots`);
                    setQaMessage("스냅샷 초기화 완료");
                  }}>스냅샷 초기화</button>
                  <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={async () => {
                    await api.delete(`/courses/${courseId}/assignments/${qaTarget}/qa/submissions`);
                    setQaMessage("제출물 초기화 완료");
                  }}>제출물 초기화</button>
                  <button style={{
                    fontSize: 13, background: "#dc2626", color: "#fff", border: "none",
                    padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 600,
                  }} onClick={async () => {
                    await api.delete(`/courses/${courseId}/assignments/${qaTarget}/qa/all`);
                    reloadAssignments();
                    setQaMessage("전체 데이터 초기화 완료");
                  }}>전체 초기화</button>
                </div>

                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--on-surface-variant)", marginBottom: 6, display: "block" }}>과제 삭제</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button style={{
                    fontSize: 13, background: "#dc2626", color: "#fff", border: "none",
                    padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 600,
                  }} onClick={() => {
                    const target = assignments.find((a) => a.id === qaTarget);
                    setConfirmDialog({
                      title: "과제 삭제",
                      message: `"${target?.title}"을(를) 삭제하시겠습니까?\n관련 제출물, 스냅샷, 분석 데이터가 모두 삭제됩니다.`,
                      onConfirm: async () => {
                        await api.delete(`/courses/${courseId}/assignments/${qaTarget}`);
                        setAssignments((prev) => prev.filter((a) => a.id !== qaTarget));
                        setQaTarget("");
                        setQaMessage("과제 삭제 완료");
                        setConfirmDialog(null);
                      },
                    });
                  }}>선택 과제 삭제</button>
                </div>
              </>
            )}

            <div style={{ borderTop: "1px solid var(--outline-variant)", marginTop: 20, paddingTop: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--error)", marginBottom: 6, display: "block" }}>위험 영역</label>
              <button style={{
                fontSize: 13, background: "#7f1d1d", color: "#fff", border: "none",
                padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 600,
              }} onClick={() => {
                setConfirmDialog({
                  title: "전체 과제 삭제",
                  message: `이 강의의 모든 과제(${assignments.length}개)를 삭제하시겠습니까?\n모든 제출물, 스냅샷, 분석 데이터가 영구 삭제됩니다.\n\n이 작업은 되돌릴 수 없습니다.`,
                  onConfirm: async () => {
                    for (const a of assignments) {
                      await api.delete(`/courses/${courseId}/assignments/${a.id}`);
                    }
                    setAssignments([]);
                    setQaTarget("");
                    setQaMessage("전체 과제 삭제 완료");
                    setConfirmDialog(null);
                  },
                });
              }}>전체 과제 삭제</button>
            </div>

            {qaMessage && (
              <div style={{
                marginTop: 12, padding: "8px 14px", borderRadius: 8, fontSize: 13,
                background: "rgba(34,197,94,0.1)", color: "#16a34a",
              }}>{qaMessage}</div>
            )}
          </div>
        )}
      </main>

      {/* QR 코드 모달 */}
      {showQr && course.invite_code && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
          onClick={() => setShowQr(false)}
        >
          <div
            style={{ background: "#fff", borderRadius: "var(--radius-lg)", padding: 32, textAlign: "center", boxShadow: "var(--shadow-lg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 4px" }}>{course.title}</h3>
            <p style={{ color: "var(--on-surface-variant)", fontSize: 13, margin: "0 0 20px" }}>
              QR을 스캔하면 강의 가입 페이지로 이동합니다.
            </p>
            <QRCodeSVG
              value={`${window.location.origin}/join/${course.invite_code}`}
              size={220}
              level="M"
            />
            <p style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 12 }}>
              초대코드: <strong>{course.invite_code}</strong>
            </p>
            <button className="btn btn-secondary" style={{ marginTop: 16, width: "100%" }} onClick={() => setShowQr(false)}>
              닫기
            </button>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 9999,
        }}>
          <div style={{
            background: "#fff", borderRadius: "var(--radius-lg)", padding: 28,
            maxWidth: 420, width: "90%", boxShadow: "var(--shadow-lg)",
          }}>
            <div style={{ fontSize: 28, textAlign: "center", marginBottom: 8 }}>&#x26A0;&#xFE0F;</div>
            <h3 style={{ margin: "0 0 8px", textAlign: "center" }}>{confirmDialog.title}</h3>
            <p style={{ whiteSpace: "pre-line", color: "var(--on-surface-variant)", fontSize: 14, textAlign: "center", lineHeight: 1.6 }}>
              {confirmDialog.message}
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDialog(null)}>취소</button>
              <button style={{
                background: "#dc2626", color: "#fff", border: "none",
                padding: "8px 24px", borderRadius: 8, cursor: "pointer", fontWeight: 600,
              }} onClick={confirmDialog.onConfirm}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
