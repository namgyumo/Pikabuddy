import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import api from "../lib/api";
import { renderMarkdown } from "../lib/markdown";
import AppShell from "../components/common/AppShell";
import type { DashboardData } from "../types";

export default function Dashboard() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [insights, setInsights] = useState<{
    insights: string[];
    common_struggles: string[];
    recommendations: string[];
  } | null>(null);
  const [kickTarget, setKickTarget] = useState<{ id: string; name: string } | null>(null);
  const [kicking, setKicking] = useState(false);
  const [rewardTarget, setRewardTarget] = useState<{ id: string; name: string } | null>(null);
  const [rewardAmount, setRewardAmount] = useState(10);
  const [rewardReason, setRewardReason] = useState("");
  const [rewarding, setRewarding] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    api
      .get(`/courses/${courseId}/dashboard`)
      .then(({ data }) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || "대시보드를 불러오지 못했습니다.");
        setLoading(false);
      });
    api
      .get(`/courses/${courseId}/insights`)
      .then(({ data }) => setInsights(data))
      .catch(() => {});
  }, [courseId]);

  const handleKick = async () => {
    if (!kickTarget || !courseId) return;
    setKicking(true);
    try {
      await api.delete(`/courses/${courseId}/students/${kickTarget.id}`);
      setData((prev) =>
        prev
          ? {
              ...prev,
              students: prev.students.filter((s) => s.student.id !== kickTarget.id),
              student_count: prev.student_count - 1,
            }
          : prev
      );
      setKickTarget(null);
    } catch (err: any) {
      alert(err?.response?.data?.detail || "추방에 실패했습니다.");
    } finally {
      setKicking(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="loading-spinner" style={{ marginTop: 120 }}>
          대시보드를 불러오는 중...
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <main className="content">
          <div className="empty" style={{ marginTop: 120 }}>
            {error || "대시보드 데이터를 불러올 수 없습니다."}
          </div>
        </main>
      </AppShell>
    );
  }

  const chartData = data.students.map((s) => ({
    name: s.student.name,
    "코드 점수": s.avg_score,
    "이해도": s.avg_understanding,
  }));

  return (
    <AppShell>
      <main className="content">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">클래스 전체 학습 현황을 확인하세요.</p>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">평균 이해도</div>
            <div className="stat-value">{data.avg_class_score}%</div>
          </div>
          <div className="stat-card stat-warning">
            <div className="stat-label">위험 학생</div>
            <div className="stat-value">{data.at_risk_count}명</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">수강생</div>
            <div className="stat-value">{data.student_count}명</div>
          </div>
        </div>

        {insights && (
          <div className="card insights-card">
            <h2>&#x2728; AI Recommendation</h2>
            <div className="rendered-markdown">
              {insights.insights.map((ins, i) => (
                <div key={i} dangerouslySetInnerHTML={{ __html: renderMarkdown(ins) }} />
              ))}
              {insights.common_struggles.length > 0 && (
                <>
                  <h3>공통 어려움</h3>
                  {insights.common_struggles.map((s, i) => (
                    <div key={i} dangerouslySetInnerHTML={{ __html: renderMarkdown(s) }} />
                  ))}
                </>
              )}
              {insights.recommendations.length > 0 && (
                <>
                  <h3>추천 사항</h3>
                  {insights.recommendations.map((r, i) => (
                    <div key={i} dangerouslySetInnerHTML={{ __html: renderMarkdown(r) }} />
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {chartData.length > 0 && (
          <div className="card">
            <h2 className="section-title">클래스 인사이트</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eaebf2" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 13, fill: "#515F74" }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 13, fill: "#515F74" }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "none",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Bar
                  dataKey="코드 점수"
                  fill="#004AC6"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="이해도"
                  fill="#632ECD"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="card">
          <h2 className="section-title">학생 목록</h2>
          {data.students.length === 0 ? (
            <div className="empty">아직 수강생이 없습니다.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>코드 점수</th>
                  <th>이해도</th>
                  <th>복붙</th>
                  <th>갭</th>
                  <th>상태</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((s) => (
                  <tr
                    key={s.student.id}
                    style={{ cursor: "pointer" }}
                    onClick={() =>
                      navigate(
                        `/courses/${courseId}/dashboard/students/${s.student.id}`
                      )
                    }
                  >
                    <td style={{ fontWeight: 600 }}>{s.student.name}</td>
                    <td>{s.avg_score}%</td>
                    <td>{s.avg_understanding}%</td>
                    <td>{s.paste_count}회</td>
                    <td>
                      <span className={`badge badge-${s.gap_level}`}>
                        {s.gap_level === "high"
                          ? "높음"
                          : s.gap_level === "medium"
                            ? "중간"
                            : "낮음"}
                      </span>
                    </td>
                    <td style={{ fontSize: 18 }}>
                      {s.status === "warning" ? "⚠️" : "✅"}
                    </td>
                    <td style={{ display: "flex", gap: 4 }}>
                      <button
                        className="btn btn-sm"
                        style={{
                          background: "var(--primary)",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          padding: "4px 10px",
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRewardTarget({ id: s.student.id, name: s.student.name });
                          setRewardAmount(10);
                          setRewardReason("");
                        }}
                      >
                        EXP
                      </button>
                      <button
                        className="btn btn-sm"
                        style={{
                          background: "var(--danger, #ef4444)",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          padding: "4px 10px",
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setKickTarget({ id: s.student.id, name: s.student.name });
                        }}
                      >
                        추방
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {kickTarget && (
          <div className="modal-overlay" onClick={() => !kicking && setKickTarget(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
              <h3 style={{ margin: "0 0 12px" }}>학생 추방</h3>
              <p style={{ margin: "0 0 8px", color: "var(--text-secondary, #64748b)" }}>
                <strong>{kickTarget.name}</strong> 학생을 이 강의에서 추방하시겠습니까?
              </p>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--danger, #ef4444)" }}>
                추방된 학생은 이 강의의 과제, 노트 등에 접근할 수 없게 됩니다.
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setKickTarget(null)}
                  disabled={kicking}
                >
                  취소
                </button>
                <button
                  className="btn"
                  style={{ background: "var(--danger, #ef4444)", color: "#fff", border: "none" }}
                  onClick={handleKick}
                  disabled={kicking}
                >
                  {kicking ? "처리 중..." : "추방"}
                </button>
              </div>
            </div>
          </div>
        )}
        {rewardTarget && (
          <div className="modal-overlay" onClick={() => !rewarding && setRewardTarget(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
              <h3 style={{ margin: "0 0 12px" }}>EXP 보상</h3>
              <p style={{ margin: "0 0 12px", color: "var(--text-secondary, #64748b)" }}>
                <strong>{rewardTarget.name}</strong> 학생에게 보너스 EXP를 부여합니다.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600 }}>EXP 양 (1~500)</label>
                <input
                  className="input"
                  type="number"
                  min={1} max={500}
                  value={rewardAmount}
                  onChange={(e) => setRewardAmount(Math.min(500, Math.max(1, Number(e.target.value))))}
                />
                <label style={{ fontSize: 12, fontWeight: 600 }}>사유 (선택)</label>
                <input
                  className="input"
                  placeholder="우수 활동, 발표 참여 등"
                  value={rewardReason}
                  onChange={(e) => setRewardReason(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setRewardTarget(null)}
                  disabled={rewarding}
                >
                  취소
                </button>
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    setRewarding(true);
                    try {
                      await api.post("/gamification/award", {
                        student_id: rewardTarget.id,
                        amount: rewardAmount,
                        reason: rewardReason || "교수 보상",
                      });
                      setRewardTarget(null);
                    } catch {}
                    setRewarding(false);
                  }}
                  disabled={rewarding}
                >
                  {rewarding ? "처리 중..." : `+${rewardAmount} EXP 부여`}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
