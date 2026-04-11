import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCourseStore } from "../store/courseStore";
import { useAuthStore } from "../store/authStore";
import { useTutorialStore } from "../store/tutorialStore";
import { getTutorialKey } from "../lib/tutorials";
import api from "../lib/api";
import { toast } from "../lib/toast";
import AppShell from "../components/common/AppShell";
import { SkeletonList } from "../components/common/Skeleton";

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

function getKoreanHolidays(year: number): { date: string; title: string }[] {
  const fixed = [
    { m: 1, d: 1, title: "신정" }, { m: 3, d: 1, title: "삼일절" },
    { m: 5, d: 5, title: "어린이날" }, { m: 6, d: 6, title: "현충일" },
    { m: 8, d: 15, title: "광복절" }, { m: 10, d: 3, title: "개천절" },
    { m: 10, d: 9, title: "한글날" }, { m: 12, d: 25, title: "크리스마스" },
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
  return [...fixed, ...(lunar[year] || [])].map((h) => ({
    date: `${year}-${String(h.m).padStart(2, "0")}-${String(h.d).padStart(2, "0")}T00:00:00`,
    title: h.title,
  }));
}

export default function ProfessorHome() {
  const { courses, fetchCourses, createCourse, loading } = useCourseStore();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [objectives, setObjectives] = useState("");

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

  const tutorialStart = useTutorialStore((s) => s.start);
  const tutorialCompleted = useTutorialStore((s) => s.isCompleted);

  useEffect(() => {
    fetchCourses();
    api.get("/calendar").then(({ data }) => {
      const items: CalendarItem[] = [
        ...(data.assignments || []).map((a: CalendarItem) => ({ ...a, kind: "assignment" as const })),
        ...(data.events || []).map((e: CalendarItem) => ({ ...e, kind: "event" as const })),
      ];
      setCalItems(items);
    }).catch(() => {});
  }, [fetchCourses]);

  useEffect(() => {
    if (user && !tutorialCompleted(getTutorialKey("professor", user.id))) {
      const timer = setTimeout(() => tutorialStart(), 500);
      return () => clearTimeout(timer);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

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
            data-tutorial="create-course"
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
          <SkeletonList count={3} />
        ) : courses.length === 0 ? (
          <div className="empty">
            아직 생성된 강의가 없습니다.
            <br />
            위의 "새 강의 개설" 버튼으로 시작하세요.
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
                <div className="course-meta">
                  <span className="badge badge-invite">
                    {course.invite_code}
                  </span>
                </div>
              </Link>
            ))}
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
                <input className="input" value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} placeholder="시험, 과제 마감 등" />
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

            const byDate: Record<string, CalendarItem[]> = {};
            for (const item of allItems) {
              const dateStr = item.kind === "assignment" ? item.due_date : item.event_date;
              if (!dateStr) continue;
              const startD = new Date(dateStr);
              const endD = item.end_date ? new Date(item.end_date) : startD;
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

            const holidayDates = new Set<number>();
            for (const h of holidays) {
              const d = new Date(h.date);
              if (d.getFullYear() === year && d.getMonth() === month) holidayDates.add(d.getDate());
            }

            const cells: React.ReactNode[] = [];
            for (let i = 0; i < firstDay; i++) cells.push(<div key={`e-${i}`} className="cal-cell cal-empty" />);
            for (let d = 1; d <= daysInMonth; d++) {
              const isToday = `${year}-${month}-${d}` === todayStr;
              const isHoliday = holidayDates.has(d);
              const items = byDate[d.toString()] || [];
              cells.push(
                <div key={d} className={`cal-cell${isToday ? " cal-today" : ""}${items.length > 0 ? " cal-has-items" : ""}${isHoliday ? " cal-holiday" : ""}`}>
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
                              navigate(`/courses/${item.course_id}`);
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
                  {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                    <div key={d} className="cal-header-cell">{d}</div>
                  ))}
                </div>
                <div className="cal-grid">{cells}</div>
              </div>
            );
          })()}
        </div>
      </main>
    </AppShell>
  );
}
