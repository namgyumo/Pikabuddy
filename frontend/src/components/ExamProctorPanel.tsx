/**
 * 교수용 시험 감독 패널 — 학생별 스크린샷 타임라인 + 위반 기록
 */
import { useEffect, useState, useCallback } from "react";
import api from "../lib/api";

interface StudentSummary {
  student_id: string;
  name: string;
  email: string;
  screenshot_count: number;
  violation_count: number;
}

interface Screenshot {
  id: string;
  student_id: string;
  r2_key: string;
  view_url: string;
  captured_at: string;
  file_size_kb: number;
}

interface Violation {
  id: string;
  student_id: string;
  violation_type: string;
  violation_count: number;
  detail: string;
  created_at: string;
}

interface Props {
  assignmentId: string;
}

const violationLabel: Record<string, string> = {
  fullscreen_exit: "전체화면 해제",
  tab_switch: "탭 전환",
  window_blur: "창 이탈",
  forced_end: "강제 종료",
};

export default function ExamProctorPanel({ assignmentId }: Props) {
  const [summary, setSummary] = useState<StudentSummary[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);

  // 키보드 탐색 (← → Esc)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (viewingIndex === null || screenshots.length === 0) return;
    if (e.key === "ArrowLeft") setViewingIndex((i) => Math.max(0, (i ?? 0) - 1));
    else if (e.key === "ArrowRight") setViewingIndex((i) => Math.min(screenshots.length - 1, (i ?? 0) + 1));
    else if (e.key === "Escape") setViewingIndex(null);
  }, [viewingIndex, screenshots.length]);

  useEffect(() => {
    if (viewingIndex !== null) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [viewingIndex, handleKeyDown]);

  // 학생 요약 로드
  useEffect(() => {
    setLoading(true);
    api.get(`/exam/summary/${assignmentId}`)
      .then(({ data }) => setSummary(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assignmentId]);

  // 학생 선택 시 스크린샷 + 위반 로드
  useEffect(() => {
    if (!selectedStudent) {
      setScreenshots([]);
      setViolations([]);
      return;
    }
    Promise.all([
      api.get(`/exam/screenshots/${assignmentId}?student_id=${selectedStudent}`),
      api.get(`/exam/violations/${assignmentId}?student_id=${selectedStudent}`),
    ]).then(([ssRes, vRes]) => {
      setScreenshots(ssRes.data || []);
      setViolations(vRes.data || []);
    }).catch(() => {});
  }, [assignmentId, selectedStudent]);

  if (loading) return <p style={{ color: "var(--on-surface-variant)", padding: 16 }}>로딩 중...</p>;
  if (summary.length === 0) return <p style={{ color: "var(--on-surface-variant)", padding: 16 }}>시험 기록이 없습니다.</p>;

  return (
    <div>
      {/* 학생 목록 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {summary.map((s) => (
          <button
            key={s.student_id}
            onClick={() => setSelectedStudent(s.student_id === selectedStudent ? null : s.student_id)}
            style={{
              padding: "8px 14px", borderRadius: 8, border: "1px solid var(--outline-variant)",
              background: s.student_id === selectedStudent ? "var(--primary)" : "var(--surface-container)",
              color: s.student_id === selectedStudent ? "var(--on-primary)" : "var(--on-surface)",
              cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 8,
            }}
          >
            <span>{s.name}</span>
            <span style={{
              fontSize: 11, padding: "2px 6px", borderRadius: 10,
              background: s.violation_count > 0 ? "var(--error)" : "var(--primary-container)",
              color: s.violation_count > 0 ? "var(--on-error)" : "var(--on-primary-container)",
            }}>
              {s.violation_count > 0 ? `위반 ${s.violation_count}` : `캡쳐 ${s.screenshot_count}`}
            </span>
          </button>
        ))}
      </div>

      {/* 선택된 학생 상세 */}
      {selectedStudent && (
        <div>
          {/* 위반 기록 */}
          {violations.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 14, color: "var(--error)", marginBottom: 8 }}>
                위반 기록 ({violations.length}건)
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {violations.map((v) => (
                  <div key={v.id} style={{
                    padding: "6px 12px", borderRadius: 6, fontSize: 12,
                    background: v.violation_type === "forced_end" ? "var(--error-container)" : "var(--surface-container)",
                    color: v.violation_type === "forced_end" ? "var(--on-error-container)" : "var(--on-surface)",
                    display: "flex", gap: 12, alignItems: "center",
                  }}>
                    <span style={{ fontWeight: 600, minWidth: 100 }}>
                      {violationLabel[v.violation_type] || v.violation_type}
                    </span>
                    <span style={{ color: "var(--on-surface-variant)" }}>
                      {new Date(v.created_at).toLocaleTimeString("ko-KR")}
                    </span>
                    {v.detail && <span style={{ color: "var(--on-surface-variant)", fontSize: 11 }}>— {v.detail}</span>}
                    <span style={{
                      marginLeft: "auto", fontSize: 11, fontWeight: 600,
                      color: "var(--error)",
                    }}>
                      {v.violation_count}회
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 스크린샷 타임라인 */}
          <h4 style={{ fontSize: 14, color: "var(--on-surface)", marginBottom: 8 }}>
            스크린샷 타임라인 ({screenshots.length}장)
          </h4>
          {screenshots.length === 0 ? (
            <p style={{ color: "var(--on-surface-variant)", fontSize: 13 }}>스크린샷이 없습니다.</p>
          ) : (
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 10,
            }}>
              {screenshots.map((s, idx) => (
                <div
                  key={s.id}
                  onClick={() => setViewingIndex(idx)}
                  style={{
                    borderRadius: 8, overflow: "hidden", cursor: "pointer",
                    border: "1px solid var(--outline-variant)",
                    background: "var(--surface-container)",
                    transition: "transform 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <img
                    src={s.view_url}
                    alt={`캡쳐 ${s.captured_at}`}
                    style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }}
                    loading="lazy"
                  />
                  <div style={{ padding: "6px 8px", fontSize: 11, color: "var(--on-surface-variant)" }}>
                    {new Date(s.captured_at).toLocaleTimeString("ko-KR")}
                    <span style={{ float: "right" }}>{s.file_size_kb}KB</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 이미지 확대 모달 — < > 탐색 */}
      {viewingIndex !== null && viewingIndex >= 0 && viewingIndex < screenshots.length && (
        <div
          onClick={() => setViewingIndex(null)}
          style={{
            position: "fixed", top: 0, bottom: 0, left: 260, right: 0, zIndex: 10000,
            background: "rgba(0,0,0,0.85)", display: "flex",
            alignItems: "center", justifyContent: "center", cursor: "zoom-out",
          }}
        >
          {/* 이전 버튼 */}
          <button
            onClick={(e) => { e.stopPropagation(); setViewingIndex(Math.max(0, viewingIndex - 1)); }}
            disabled={viewingIndex <= 0}
            style={{
              position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
              width: 44, height: 44, borderRadius: "50%", border: "none", cursor: "pointer",
              background: viewingIndex > 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
              color: viewingIndex > 0 ? "#fff" : "#666",
              fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >&lsaquo;</button>
          {/* 이미지 */}
          <img
            src={screenshots[viewingIndex].view_url}
            alt="스크린샷 확대"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "calc(100vw - 380px)", maxHeight: "90vh", borderRadius: 8, cursor: "default" }}
          />
          {/* 다음 버튼 */}
          <button
            onClick={(e) => { e.stopPropagation(); setViewingIndex(Math.min(screenshots.length - 1, viewingIndex + 1)); }}
            disabled={viewingIndex >= screenshots.length - 1}
            style={{
              position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
              width: 44, height: 44, borderRadius: "50%", border: "none", cursor: "pointer",
              background: viewingIndex < screenshots.length - 1 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
              color: viewingIndex < screenshots.length - 1 ? "#fff" : "#666",
              fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >&rsaquo;</button>
          {/* 하단 정보 */}
          <div style={{
            position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
            color: "rgba(255,255,255,0.7)", fontSize: 13, textAlign: "center",
          }}>
            {viewingIndex + 1} / {screenshots.length}
            <span style={{ marginLeft: 12 }}>
              {new Date(screenshots[viewingIndex].captured_at).toLocaleString("ko-KR")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
