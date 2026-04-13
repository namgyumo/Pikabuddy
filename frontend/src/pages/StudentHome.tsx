import { useEffect, useState, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCourseStore } from "../store/courseStore";
import { useAuthStore } from "../store/authStore";
import api from "../lib/api";
import AppShell from "../components/common/AppShell";
import { toast } from "../lib/toast";
import { SkeletonList } from "../components/common/Skeleton";
import { getBannerStyle, getEffectiveBanner } from "../lib/bannerPresets";
import BannerPicker from "../components/common/BannerPicker";
import { getKoreanHolidays } from "../lib/holidays";

interface CalendarItem {
  id: string;
  title: string;
  kind: "assignment" | "event" | "holiday";
  type?: string;
  due_date?: string;
  event_date?: string;
  end_date?: string;
  course_id?: string;
  course_title?: string;
  color?: string;
  description?: string;
}

interface TodoItem {
  id: string;
  title: string;
  kind: "assignment";
  type?: string;
  due_date?: string;
  course_id?: string;
  course_title?: string;
  language?: string;
  ai_policy?: string;
  problem_count?: number;
}

export default function StudentHome() {
  const { courses, fetchCourses, loading } = useCourseStore();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [showJoin, setShowJoin] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);

  // 캘린더
  const [calItems, setCalItems] = useState<CalendarItem[]>([]);
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventEndDate, setNewEventEndDate] = useState("");
  const [newEventColor, setNewEventColor] = useState("primary");
  const [addingEvent, setAddingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarItem | null>(null);

  // 할 일
  const [todos, setTodos] = useState<TodoItem[]>([]);

  // 배너 커스텀
  const [bannerEditId, setBannerEditId] = useState<string | null>(null);
  const [bannerPick, setBannerPick] = useState("");
  const [hiddenBanners, setHiddenBanners] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("pikabuddy_hidden_banners") || "[]"); } catch { return []; }
  });
  const toggleBannerHide = (courseId: string) => {
    setHiddenBanners(prev => {
      const next = prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId];
      localStorage.setItem("pikabuddy_hidden_banners", JSON.stringify(next));
      return next;
    });
  };

  // 강의 정보 모달
  const [courseInfo, setCourseInfo] = useState<any>(null);
  const infoCache = useRef<Record<string, any>>({}).current;

  useEffect(() => {
    // Fire all independent requests in parallel
    fetchCourses();
    Promise.all([
      api.get("/calendar").catch(() => ({ data: { assignments: [], events: [] } })),
      api.get("/todos").catch(() => ({ data: [] })),
    ]).then(([calRes, todosRes]) => {
      // Calendar
      const calData = calRes.data;
      const items: CalendarItem[] = [
        ...(calData.assignments || []).map((a: CalendarItem) => ({ ...a, kind: "assignment" as const })),
        ...(calData.events || []).map((e: CalendarItem) => ({ ...e, kind: "event" as const })),
      ];
      setCalItems(items);

      // 과제 마감 1일 전 알림
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      for (const a of calData.assignments || []) {
        if (a.due_date) {
          const due = new Date(a.due_date);
          if (due > now && due <= tomorrow) {
            const notifKey = `deadline-notif-${a.id}-${due.toDateString()}`;
            if (!sessionStorage.getItem(notifKey)) {
              sessionStorage.setItem(notifKey, "1");
              const hours = Math.round((due.getTime() - now.getTime()) / (60 * 60 * 1000));
              toast.warning(`"${a.title}" 마감이 ${hours}시간 남았습니다!`);
            }
          }
        }
      }

      // Todos
      setTodos(todosRes.data);
    });
  }, [fetchCourses]);

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
          <div className="course-grid">
            {courses.map((course) => {
              const effectiveBanner = getEffectiveBanner(course);
              return (
                <div key={course.id} className="card course-card" style={{ position: "relative" }}>
                  {effectiveBanner && !hiddenBanners.includes(course.id) && (
                    <div className="course-card-banner" style={{ background: getBannerStyle(effectiveBanner) }} />
                  )}
                  <Link to={`/courses/${course.id}`} className="course-card-link">
                    <h3>{course.title}</h3>
                    <p>{course.description || "설명 없음"}</p>
                  </Link>
                  <button
                    className="course-info-btn"
                    title="강의 정보"
                    onClick={(e) => {
                      e.preventDefault();
                      if (infoCache[course.id]) { setCourseInfo(infoCache[course.id]); return; }
                      setCourseInfo({ title: course.title, description: course.description, _loading: true });
                      api.get(`/courses/${course.id}/info`).then(({ data }) => { infoCache[course.id] = data; setCourseInfo(data); }).catch(() => toast.error("정보 로드 실패"));
                    }}
                  >
                    ···
                  </button>
                  <button
                    className="banner-edit-btn"
                    title="배너 변경"
                    onClick={(e) => { e.preventDefault(); setBannerEditId(course.id); setBannerPick(getEffectiveBanner(course) || ""); }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  {effectiveBanner && (
                    <button
                      className="banner-hide-btn"
                      title={hiddenBanners.includes(course.id) ? "배너 표시" : "배너 숨기기"}
                      onClick={(e) => { e.preventDefault(); toggleBannerHide(course.id); }}
                    >
                      {hiddenBanners.includes(course.id) ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  )}
                  {bannerEditId === course.id && (
                    <BannerPicker
                      current={bannerPick}
                      onChange={setBannerPick}
                      onSave={async (value) => {
                        try {
                          await api.patch(`/courses/${course.id}/my-banner`, { banner_url: value });
                          const updated = courses.map((c) => c.id === course.id ? { ...c, custom_banner_url: value } : c);
                          useCourseStore.setState({ courses: updated, lastFetchedAt: Date.now() });
                          setBannerEditId(null);
                        } catch { toast.error("배너 변경 실패"); }
                      }}
                      onCancel={() => setBannerEditId(null)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
        {/* ── 캘린더 ── */}
        <div style={{ marginTop: 32 }}>
          <div className="page-header">
            <h2 className="section-title">일정 캘린더</h2>
            <button className="btn btn-secondary" onClick={() => { setShowAddEvent(true); setEditingEvent(null); setNewEventDate(""); setNewEventEndDate(""); setNewEventTitle(""); setNewEventColor("primary"); }}>
              + 일정 추가
            </button>
          </div>

          {showAddEvent && (
            <div className="card" style={{ marginBottom: 16, padding: 16, display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 150 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--on-surface-variant)", display: "block", marginBottom: 4 }}>일정 제목</label>
                <input className="input" value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} placeholder="시험 준비, 과제 시작 등" />
              </div>
              <div style={{ minWidth: 180 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--on-surface-variant)", display: "block", marginBottom: 4 }}>시작 날짜</label>
                <input className="input" type="datetime-local" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} />
              </div>
              <div style={{ minWidth: 180 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--on-surface-variant)", display: "block", marginBottom: 4 }}>종료 날짜 (선택)</label>
                <input className="input" type="datetime-local" value={newEventEndDate} onChange={(e) => setNewEventEndDate(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--on-surface-variant)", display: "block", marginBottom: 4 }}>색상</label>
                <select className="input" value={newEventColor} onChange={(e) => setNewEventColor(e.target.value)} style={{ width: 100 }}>
                  <option value="primary">파랑</option>
                  <option value="success">초록</option>
                  <option value="warning">노랑</option>
                  <option value="error">빨강</option>
                  <option value="tertiary">보라</option>
                </select>
              </div>
              <button className="btn btn-primary" disabled={!newEventTitle.trim() || !newEventDate || addingEvent}
                onClick={async () => {
                  setAddingEvent(true);
                  try {
                    const payload: any = {
                      title: newEventTitle.trim(),
                      event_date: new Date(newEventDate).toISOString(),
                      color: newEventColor,
                    };
                    if (newEventEndDate) payload.end_date = new Date(newEventEndDate).toISOString();
                    if (editingEvent) {
                      await api.patch(`/events/${editingEvent.id}`, payload);
                      setCalItems((prev) => prev.map((it) => it.id === editingEvent.id ? { ...it, ...payload, kind: "event" } : it));
                    } else {
                      const { data } = await api.post("/events", payload);
                      setCalItems((prev) => [...prev, { ...data, kind: "event" }]);
                    }
                    setShowAddEvent(false);
                    setEditingEvent(null);
                  } catch { toast.error(editingEvent ? "일정 수정 실패" : "일정 추가 실패"); }
                  finally { setAddingEvent(false); }
                }}>{addingEvent ? "..." : editingEvent ? "수정" : "추가"}</button>
              {editingEvent && (
                <button className="btn btn-ghost" style={{ color: "var(--error)" }}
                  onClick={async () => {
                    if (!confirm("이 일정을 삭제하시겠습니까?")) return;
                    try {
                      await api.delete(`/events/${editingEvent.id}`);
                      setCalItems((prev) => prev.filter((it) => it.id !== editingEvent.id));
                      setShowAddEvent(false);
                      setEditingEvent(null);
                      toast.success("일정이 삭제되었습니다");
                    } catch { toast.error("삭제 실패"); }
                  }}>삭제</button>
              )}
              <button className="btn btn-ghost" onClick={() => { setShowAddEvent(false); setEditingEvent(null); }}>취소</button>
            </div>
          )}

          {(() => {
            const year = calMonth.getFullYear();
            const month = calMonth.getMonth();
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

            // 공휴일 추가
            const holidays = getKoreanHolidays(year);
            const allItems: CalendarItem[] = [
              ...calItems,
              ...holidays.map((h) => ({
                id: `holiday-${h.date}`,
                title: h.title,
                kind: "holiday" as const,
                event_date: h.date,
                color: "error",
              })),
            ];

            // 날짜별 그룹화
            const byDate: Record<string, CalendarItem[]> = {};
            for (const item of allItems) {
              const dateStr = item.kind === "assignment" ? item.due_date : item.event_date;
              if (!dateStr) continue;
              const startD = new Date(dateStr);
              const endD = item.end_date ? new Date(item.end_date) : startD;
              // 기간 일정: 시작~종료 사이 모든 날짜에 표시
              const cur = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate());
              const last = new Date(endD.getFullYear(), endD.getMonth(), endD.getDate());
              while (cur <= last) {
                if (cur.getFullYear() === year && cur.getMonth() === month) {
                  const key = cur.getDate().toString();
                  if (!byDate[key]) byDate[key] = [];
                  if (!byDate[key].includes(item)) byDate[key].push(item);
                }
                cur.setDate(cur.getDate() + 1);
              }
            }

            // 공휴일 날짜 세트
            const holidayDates = new Set<number>();
            for (const h of holidays) {
              const d = new Date(h.date);
              if (d.getFullYear() === year && d.getMonth() === month) {
                holidayDates.add(d.getDate());
              }
            }

            const cells: React.ReactNode[] = [];
            for (let i = 0; i < firstDay; i++) cells.push(<div key={`e-${i}`} className="cal-cell cal-empty" />);
            for (let d = 1; d <= daysInMonth; d++) {
              const isToday = `${year}-${month}-${d}` === todayStr;
              const isHoliday = holidayDates.has(d);
              const dayOfWeek = (firstDay + d - 1) % 7;
              const items = byDate[d.toString()] || [];
              cells.push(
                <div key={d} className={`cal-cell${isToday ? " cal-today" : ""}${items.length > 0 ? " cal-has-items" : ""}${isHoliday ? " cal-holiday" : ""}${dayOfWeek === 0 ? " cal-sunday" : ""}${dayOfWeek === 6 ? " cal-saturday" : ""}`}>
                  <div className={`cal-date${isHoliday ? " cal-date-holiday" : ""}`}>{d}</div>
                  <div className="cal-items">
                    {items.map((item) => {
                      const isAssignment = item.kind === "assignment";
                      const isHol = item.kind === "holiday";
                      const colorVar = isAssignment
                        ? (item.type === "quiz" ? "var(--warning)" : item.type === "writing" ? "var(--tertiary)" : item.type === "algorithm" ? "var(--success)" : "var(--primary)")
                        : isHol ? "var(--error)" : `var(--${item.color || "primary"})`;
                      const isOverdue = isAssignment && item.due_date && new Date(item.due_date) < new Date();
                      return (
                        <div key={item.id} className={`cal-item${isOverdue ? " cal-overdue" : ""}${isHol ? " cal-item-holiday" : ""}`}
                          title={isAssignment ? `${item.course_title} — ${item.title}` : (item.description || item.title)}
                          style={{ cursor: isHol ? "default" : "pointer" }}
                          onClick={() => {
                            if (isAssignment && item.course_id) {
                              if (item.type === "quiz") navigate(`/assignments/${item.id}/quiz`);
                              else if (item.type === "writing") navigate(`/assignments/${item.id}/write`);
                              else navigate(`/assignments/${item.id}/code`);
                            } else if (item.kind === "event") {
                              setEditingEvent(item);
                              setNewEventTitle(item.title);
                              const toLocal = (iso?: string) => {
                                if (!iso) return "";
                                const d = new Date(iso);
                                d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                                return d.toISOString().slice(0, 16);
                              };
                              setNewEventDate(toLocal(item.event_date));
                              setNewEventEndDate(toLocal(item.end_date));
                              setNewEventColor(item.color || "primary");
                              setShowAddEvent(true);
                            }
                          }}>
                          <span className="cal-item-dot" style={{ background: colorVar }} />
                          <span className="cal-item-title">
                            {isAssignment && item.course_title && <span style={{ opacity: 0.7, fontSize: "0.85em" }}>{item.course_title} </span>}
                            {item.title}
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
                  {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
                    <div key={d} className={`cal-header-cell${i === 0 ? " cal-header-sun" : ""}${i === 6 ? " cal-header-sat" : ""}`}>{d}</div>
                  ))}
                </div>
                <div className="cal-grid">{cells}</div>
              </div>
            );
          })()}
        </div>
        {/* ── 할 일 ── */}
        {todos.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h2 className="section-title">할 일</h2>
            <div className="course-grid">
              {todos.map((todo) => {
                const now = new Date();
                const due = todo.due_date ? new Date(todo.due_date) : null;
                const hoursLeft = due ? (due.getTime() - now.getTime()) / (60 * 60 * 1000) : null;
                const urgency = hoursLeft !== null && hoursLeft < 0 ? "urgent" : hoursLeft !== null && hoursLeft < 48 ? "soon" : "normal";
                const dueLabel = due
                  ? due.toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                  : null;
                const dotColor = todo.type === "quiz" ? "var(--warning)" : todo.type === "writing" ? "var(--tertiary)" : todo.type === "algorithm" ? "var(--success)" : "var(--primary)";

                const typeLabel = todo.type === "quiz" ? "퀴즈" : todo.type === "writing" ? "글쓰기" : todo.type === "both" ? "코딩+글쓰기" : todo.type === "algorithm" ? "알고리즘" : "코딩";
                const typeBg = todo.type === "writing" ? "rgba(99,46,205,0.1)" : todo.type === "both" ? "rgba(0,74,198,0.1)" : todo.type === "algorithm" ? "rgba(16,185,129,0.1)" : todo.type === "quiz" ? "rgba(245,158,11,0.1)" : "rgba(0,74,198,0.06)";
                const typeColor = todo.type === "writing" ? "var(--tertiary)" : todo.type === "both" ? "var(--primary)" : todo.type === "algorithm" ? "var(--success)" : todo.type === "quiz" ? "var(--warning)" : "var(--primary)";
                const policyLabels: Record<string, string> = { free: "자유", normal: "보통", strict: "엄격", exam: "시험" };

                return (
                  <div key={todo.id} className="card course-card todo-card-item" onClick={() => {
                    if (todo.kind === "assignment" && todo.course_id) {
                      if (todo.type === "quiz") navigate(`/assignments/${todo.id}/quiz`);
                      else if (todo.type === "writing") navigate(`/assignments/${todo.id}/write`);
                      else navigate(`/assignments/${todo.id}/code`);
                    }
                  }}>
                    <h3>{todo.title}</h3>
                    <p>{todo.course_title}</p>
                    <div className="course-meta">
                      <span className="badge" style={{ background: typeBg, color: typeColor }}>{typeLabel}</span>
                      {todo.ai_policy && <span className="badge badge-policy">{policyLabels[todo.ai_policy] || todo.ai_policy}</span>}
                      {todo.language && todo.type !== "writing" && todo.type !== "quiz" && <span className="badge">{todo.language}</span>}
                      {todo.problem_count != null && todo.problem_count > 0 && todo.type !== "writing" && (
                        <span className="badge">문제 {todo.problem_count}개</span>
                      )}
                      {dueLabel && (
                        <span className="badge" style={{
                          background: urgency === "urgent" ? "rgba(220,38,38,0.08)" : urgency === "soon" ? "rgba(245,158,11,0.1)" : undefined,
                          color: urgency === "urgent" ? "var(--error)" : urgency === "soon" ? "#d97706" : undefined,
                        }}>
                          {hoursLeft !== null && hoursLeft < 0 ? "마감됨" : `~${dueLabel}`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* 강의 정보 모달 */}
      {courseInfo && (
        <div className="course-info-modal-backdrop" onClick={() => setCourseInfo(null)}>
          <div className="course-info-modal" onClick={(e) => e.stopPropagation()}>
            <div className="course-info-modal-header">
              <h3>{courseInfo.title}</h3>
              <button className="course-info-modal-close" onClick={() => setCourseInfo(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="course-info-modal-body">
              {courseInfo._loading ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "var(--on-surface-variant)", fontSize: 14 }}>
                  <div className="page-loading-spinner" style={{ width: 28, height: 28, margin: "0 auto 12px" }} />
                  불러오는 중...
                </div>
              ) : (<>
              <div className="info-stats">
                <div className="info-stat-card">
                  <div className="info-stat-value">{courseInfo.student_count}</div>
                  <div className="info-stat-label">수강생</div>
                </div>
                <div className="info-stat-card">
                  <div className="info-stat-value">{courseInfo.assignment_count}</div>
                  <div className="info-stat-label">과제</div>
                </div>
                <div className="info-stat-card">
                  <div className="info-stat-value">{courseInfo.note_count}</div>
                  <div className="info-stat-label">노트</div>
                </div>
              </div>
              {courseInfo.description && (
                <div className="info-section">
                  <div className="info-section-label">설명</div>
                  <div className="info-section-value">{courseInfo.description}</div>
                </div>
              )}
              <div className="info-section">
                <div className="info-section-label">교수</div>
                <div className="info-section-value">{courseInfo.professor_name}</div>
              </div>
              <div className="info-section">
                <div className="info-section-label">개설일</div>
                <div className="info-section-value">{new Date(courseInfo.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}</div>
              </div>
              {courseInfo.objectives && courseInfo.objectives.length > 0 && (
                <>
                  <div className="info-divider" />
                  <div className="info-section">
                    <div className="info-section-label">강의 목표</div>
                    <ul className="info-objectives-list">
                      {courseInfo.objectives.map((obj: string, i: number) => (
                        <li key={i}>{obj}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
              </>)}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
