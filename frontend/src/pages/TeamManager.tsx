import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import AppShell from "../components/common/AppShell";
import type { Team, Course, Assignment } from "../types";

interface EnrolledStudent {
  id: string;
  name: string;
  avatar_url: string | null;
  student_id: string;
}

export default function TeamManager() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(true);

  // 생성/수정 다이얼로그
  const [showDialog, setShowDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // 삭제 확인
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);

  // 조별과제 생성
  const [teamAssignments, setTeamAssignments] = useState<Assignment[]>([]);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignTitle, setAssignTitle] = useState("");
  const [assignTopic, setAssignTopic] = useState("");
  const [assignType, setAssignType] = useState<"writing" | "coding" | "both" | "quiz">("writing");
  const [assignLanguage, setAssignLanguage] = useState("python");
  const [assignAiPolicy, setAssignAiPolicy] = useState("normal");
  const [assignProblemCount, setAssignProblemCount] = useState(3);
  const [assignDueDate, setAssignDueDate] = useState("");
  const [assignGradingStrictness, setAssignGradingStrictness] = useState("normal");
  const [assignGradingNote, setAssignGradingNote] = useState("");
  const [creatingAssign, setCreatingAssign] = useState(false);

  const fetchData = useCallback(async () => {
    if (!courseId) return;
    try {
      const [teamsRes, courseRes, dashRes, assignRes] = await Promise.all([
        api.get(`/courses/${courseId}/teams`),
        api.get(`/courses/${courseId}`),
        api.get(`/courses/${courseId}/dashboard`).catch(() => ({ data: { students: [] } })),
        api.get(`/courses/${courseId}/assignments`).catch(() => ({ data: [] })),
      ]);
      setTeams(teamsRes.data);
      setCourse(courseRes.data);
      // 조별과제만 필터
      setTeamAssignments((assignRes.data || []).filter((a: Assignment) => a.is_team_assignment));
      // 대시보드에서 수강생 목록 추출
      const enrolled = (dashRes.data.students || []).map((s: Record<string, unknown>) => {
        const stu = (s.student || s) as Record<string, unknown>;
        return {
          id: (stu.id || s.student_id || s.id) as string,
          name: (stu.name || s.name || "") as string,
          avatar_url: (stu.avatar_url || null) as string | null,
          student_id: (stu.id || s.student_id || "") as string,
        };
      });
      setStudents(enrolled);
    } catch { /* */ }
    setLoading(false);
  }, [courseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditingTeam(null);
    setTeamName("");
    setSelectedMembers(new Set());
    setShowDialog(true);
  };

  const openEdit = (team: Team) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setSelectedMembers(new Set((team.members || []).map((m) => m.student_id)));
    setShowDialog(true);
  };

  const toggleMember = (studentId: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const handleSave = async () => {
    if (!courseId || !teamName.trim() || selectedMembers.size === 0) return;
    setSaving(true);
    try {
      const payload = { name: teamName.trim(), member_ids: [...selectedMembers] };
      if (editingTeam) {
        await api.patch(`/courses/${courseId}/teams/${editingTeam.id}`, payload);
      } else {
        await api.post(`/courses/${courseId}/teams`, payload);
      }
      setShowDialog(false);
      await fetchData();
    } catch { /* */ }
    setSaving(false);
  };

  const handleCreateAssignment = async () => {
    if (!courseId || !assignTitle.trim() || !assignTopic.trim()) return;
    setCreatingAssign(true);
    try {
      const { data } = await api.post(`/courses/${courseId}/assignments`, {
        title: assignTitle.trim(),
        topic: assignTopic.trim(),
        type: assignType,
        difficulty: "medium",
        problem_count: assignType !== "writing" && assignType !== "quiz" ? assignProblemCount : 0,
        ai_policy: assignAiPolicy,
        language: assignType !== "writing" && assignType !== "quiz" ? assignLanguage : "text",
        grading_strictness: assignGradingStrictness,
        ...(assignGradingNote.trim() ? { grading_note: assignGradingNote.trim() } : {}),
        ...(assignDueDate ? { due_date: new Date(assignDueDate).toISOString() } : {}),
        is_team_assignment: true,
      });
      setTeamAssignments((prev) => [data, ...prev]);
      setShowAssignForm(false);
      setAssignTitle("");
      setAssignTopic("");
      setAssignDueDate("");
      setAssignGradingNote("");
    } catch { /* */ }
    setCreatingAssign(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !courseId) return;
    try {
      await api.delete(`/courses/${courseId}/teams/${deleteTarget.id}`);
      setDeleteTarget(null);
      await fetchData();
    } catch { /* */ }
  };

  if (loading) {
    return (
      <AppShell courseTitle={course?.title}>
        <div className="loading-spinner" style={{ marginTop: 120 }}>팀 정보를 불러오는 중...</div>
      </AppShell>
    );
  }

  return (
    <AppShell courseTitle={course?.title}>
      <main className="content">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h1 className="page-title" style={{ marginBottom: 0 }}>팀 관리</h1>
        </div>
        <p className="page-subtitle">리포트 등 팀 과제를 위해 팀을 편성하고 공유 노트를 할당하세요.</p>

        <div className="page-header">
          <h2 className="section-title">팀 목록 ({teams.length}개)</h2>
          <button className="btn btn-primary" onClick={openCreate}>+ 새 팀 생성</button>
        </div>

        {teams.length === 0 ? (
          <div className="empty">
            아직 생성된 팀이 없습니다.
            <br />
            "새 팀 생성"을 눌러 수강생을 그룹으로 나누세요.
          </div>
        ) : (
          <div className="course-grid">
            {teams.map((team) => (
              <div key={team.id} className="card course-card" style={{ cursor: "default" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <h3 style={{ margin: 0 }}>{team.name}</h3>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: 12, padding: "4px 8px" }}
                      onClick={() => openEdit(team)}
                    >
                      수정
                    </button>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: 12, padding: "4px 8px", color: "var(--error)" }}
                      onClick={() => setDeleteTarget(team)}
                    >
                      삭제
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {(team.members || []).map((m) => (
                    <span
                      key={m.student_id}
                      className="badge"
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      {m.avatar_url ? (
                        <img
                          src={m.avatar_url}
                          alt=""
                          style={{ width: 16, height: 16, borderRadius: "50%" }}
                        />
                      ) : (
                        <span style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--primary)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 9, fontWeight: 700 }}>
                          {m.name.charAt(0)}
                        </span>
                      )}
                      {m.name}
                    </span>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 8, marginBottom: 0 }}>
                  {new Date(team.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })} 생성
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── 조별과제 섹션 ── */}
        <div style={{ marginTop: 40 }}>
          <div className="page-header">
            <h2 className="section-title">조별과제 ({teamAssignments.length}개)</h2>
            <button
              className="btn btn-primary"
              onClick={() => setShowAssignForm(true)}
              disabled={teams.length === 0}
              title={teams.length === 0 ? "먼저 팀을 생성하세요" : undefined}
            >
              + 조별과제 생성
            </button>
          </div>

          {showAssignForm && (
            <div className="card create-form" style={{ marginBottom: 16 }}>
              <h3>새 조별과제 생성</h3>
              <p style={{ fontSize: 13, color: "var(--on-surface-variant)", margin: "0 0 12px" }}>
                팀 단위로 수행하는 과제입니다. 생성 시 모든 팀에 동일하게 배정됩니다.
              </p>

              {/* 과제 유형 */}
              <div className="type-chips" style={{ marginBottom: 12 }}>
                {(["writing", "coding", "both", "quiz"] as const).map((t) => (
                  <button
                    key={t}
                    className={`type-chip${assignType === t ? " active" : ""}`}
                    onClick={() => setAssignType(t)}
                    type="button"
                  >
                    {t === "writing" ? "글쓰기" : t === "coding" ? "코딩" : t === "both" ? "코딩+글쓰기" : "퀴즈"}
                  </button>
                ))}
              </div>

              <input
                className="input"
                placeholder="과제명 (예: 팀 프로젝트 보고서)"
                value={assignTitle}
                onChange={(e) => setAssignTitle(e.target.value)}
                autoFocus
              />
              <input
                className="input"
                placeholder={assignType === "writing" ? "주제 (예: 현대 사회와 AI의 역할)" : "주제 (예: 알고리즘 성능 비교)"}
                value={assignTopic}
                onChange={(e) => setAssignTopic(e.target.value)}
                style={{ marginTop: 8 }}
              />

              <div className="form-row" style={{ marginTop: 8 }}>
                {assignType !== "writing" && assignType !== "quiz" && (
                  <>
                    <select
                      className="input"
                      value={assignLanguage}
                      onChange={(e) => setAssignLanguage(e.target.value)}
                    >
                      <option value="python">Python</option>
                      <option value="c">C</option>
                      <option value="java">Java</option>
                      <option value="javascript">JavaScript</option>
                    </select>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--on-surface-variant)" }}>
                      문제 수
                      <input
                        className="input"
                        type="number"
                        min={1}
                        max={10}
                        value={assignProblemCount}
                        onChange={(e) => setAssignProblemCount(Number(e.target.value))}
                        style={{ width: 60 }}
                      />
                    </label>
                  </>
                )}
                <select
                  className="input"
                  value={assignAiPolicy}
                  onChange={(e) => setAssignAiPolicy(e.target.value)}
                >
                  <option value="free">자유 (AI 허용)</option>
                  <option value="normal">보통 (복붙 감지)</option>
                  <option value="strict">엄격 (AI 제한)</option>
                </select>
              </div>

              {/* 채점 강도 */}
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 13, color: "var(--on-surface-variant)", marginBottom: 6, display: "block" }}>
                  AI 채점 강도
                </label>
                <div className="form-row" style={{ gap: 0 }}>
                  {([
                    { value: "mild", label: "순한맛" },
                    { value: "normal", label: "보통맛" },
                    { value: "strict", label: "매운맛" },
                  ] as const).map((opt, i) => (
                    <button
                      key={opt.value}
                      className={`btn ${assignGradingStrictness === opt.value ? "btn-primary" : "btn-secondary"}`}
                      style={{
                        flex: 1,
                        borderRadius: i === 0 ? "10px 0 0 10px" : i === 2 ? "0 10px 10px 0" : 0,
                        fontSize: 13,
                      }}
                      onClick={() => setAssignGradingStrictness(opt.value)}
                      type="button"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                className="input"
                placeholder="AI 채점 시 유의사항 (선택)"
                value={assignGradingNote}
                onChange={(e) => setAssignGradingNote(e.target.value)}
                rows={2}
                style={{ resize: "vertical", fontFamily: "inherit", marginTop: 8 }}
              />

              <div className="form-row" style={{ marginTop: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--on-surface-variant)" }}>
                  기한
                  <input
                    className="input"
                    type="datetime-local"
                    value={assignDueDate}
                    onChange={(e) => setAssignDueDate(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </label>
              </div>

              <div className="form-actions" style={{ marginTop: 12 }}>
                <button
                  className="btn btn-primary"
                  onClick={handleCreateAssignment}
                  disabled={creatingAssign || !assignTitle.trim() || !assignTopic.trim()}
                >
                  {creatingAssign ? "생성 중..." : "조별과제 생성"}
                </button>
                <button className="btn btn-secondary" onClick={() => setShowAssignForm(false)}>취소</button>
              </div>
            </div>
          )}

          {teamAssignments.length === 0 && !showAssignForm ? (
            <div className="empty">
              아직 조별과제가 없습니다.
              {teams.length > 0
                ? <><br />"조별과제 생성"으로 팀 단위 과제를 만들어보세요.</>
                : <><br />먼저 위에서 팀을 생성한 후 조별과제를 만들 수 있습니다.</>
              }
            </div>
          ) : (
            <div className="course-grid">
              {teamAssignments.map((a) => {
                const dueLabel = a.due_date
                  ? new Date(a.due_date).toLocaleDateString("ko-KR", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })
                  : null;
                const isOverdue = a.due_date ? new Date(a.due_date) < new Date() : false;

                return (
                  <div
                    key={a.id}
                    className="card course-card"
                    onClick={() => navigate(`/courses/${courseId}/assignments/${a.id}`)}
                  >
                    <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {a.title}
                      <span className="badge" style={{ background: "rgba(99,46,205,0.1)", color: "var(--tertiary)", fontSize: 11 }}>
                        조별과제
                      </span>
                      {a.status === "draft" && (
                        <span className="badge" style={{ background: "rgba(245,158,11,0.12)", color: "#d97706", fontSize: 11 }}>초안</span>
                      )}
                      {a.generation_status === "generating" && (
                        <span className="badge" style={{ background: "rgba(0,74,198,0.1)", color: "var(--primary)", fontSize: 11, animation: "pulse 1.5s infinite" }}>
                          AI 생성 중...
                        </span>
                      )}
                    </h3>
                    <p>{a.topic || "주제 없음"}</p>
                    <div className="course-meta">
                      <span className="badge">
                        {a.type === "writing" ? "글쓰기" : a.type === "both" ? "코딩+글쓰기" : a.type === "quiz" ? "퀴즈" : "코딩"}
                      </span>
                      {a.type !== "writing" && (
                        <span className="badge">문제 {a.problems?.length || 0}개</span>
                      )}
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
              })}
            </div>
          )}
        </div>
      </main>

      {/* 생성/수정 다이얼로그 */}
      {showDialog && (
        <div className="confirm-overlay" onClick={() => setShowDialog(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, width: "90vw" }}>
            <h3 className="confirm-title">{editingTeam ? "팀 수정" : "새 팀 생성"}</h3>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>팀 이름</label>
              <input
                className="input"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="예: 1조, Team Alpha..."
                style={{ width: "100%" }}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
                팀원 선택 ({selectedMembers.size}명)
              </label>
              <div style={{
                maxHeight: 240, overflowY: "auto", border: "1px solid var(--outline-variant)",
                borderRadius: "var(--radius-sm)", padding: 4,
              }}>
                {students.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--on-surface-variant)", padding: 8 }}>수강생이 없습니다.</p>
                ) : (
                  students.map((s) => (
                    <label
                      key={s.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
                        borderRadius: "var(--radius-sm)", cursor: "pointer",
                        background: selectedMembers.has(s.id) ? "var(--primary-container)" : "transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.has(s.id)}
                        onChange={() => toggleMember(s.id)}
                      />
                      {s.avatar_url ? (
                        <img src={s.avatar_url} alt="" style={{ width: 20, height: 20, borderRadius: "50%" }} />
                      ) : (
                        <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--primary)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700 }}>
                          {s.name.charAt(0)}
                        </span>
                      )}
                      <span style={{ fontSize: 13 }}>{s.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="confirm-actions">
              <button className="btn btn-secondary" onClick={() => setShowDialog(false)}>취소</button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving || !teamName.trim() || selectedMembers.size === 0}
              >
                {saving ? "저장 중..." : editingTeam ? "수정" : "생성"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 */}
      {deleteTarget && (
        <div className="confirm-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </div>
            <h3 className="confirm-title">팀 삭제</h3>
            <p className="confirm-desc">
              <strong>{deleteTarget.name}</strong> 팀을 삭제합니다.
              <br />팀 멤버 정보가 삭제되며, 공유 노트의 팀 연결이 해제됩니다.
            </p>
            <div className="confirm-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>취소</button>
              <button className="btn btn-danger" onClick={confirmDelete}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
