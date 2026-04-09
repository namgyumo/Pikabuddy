import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../lib/api";
import { toast } from "../lib/toast";
import AppShell from "../components/common/AppShell";

interface QuizProblem {
  id: number;
  type: "multiple_choice" | "short_answer" | "essay";
  question: string;
  options?: string[];
  correct_answer?: string | number;
  explanation?: string;
  points: number;
  difficulty_level?: number;
}

interface GradeResult {
  question_id: number;
  correct: boolean;
  points_earned: number;
  points_possible: number;
  correct_answer?: string | number;
  explanation?: string;
}

export default function QuizEditor() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const [assignment, setAssignment] = useState<any>(null);
  const [problems, setProblems] = useState<QuizProblem[]>([]);
  const [answers, setAnswers] = useState<Record<number, string | number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<{
    score: number;
    total: number;
    percent: number;
    results: GradeResult[];
  } | null>(null);

  useEffect(() => {
    if (!assignmentId) return;
    api.get(`/assignments/${assignmentId}`).then(({ data }) => {
      setAssignment(data);
      const quizProblems = (data.problems || []).filter(
        (p: any) => p.format === "quiz"
      );
      setProblems(quizProblems);
      setLoading(false);
    });
  }, [assignmentId]);

  const handleAnswer = (qid: number, value: string | number) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const handleSubmit = async () => {
    if (!assignmentId) return;
    setSubmitting(true);
    try {
      const answerList = problems.map((p) => ({
        question_id: p.id,
        answer: answers[p.id] ?? "",
      }));
      const { data } = await api.post(
        `/assignments/${assignmentId}/quiz-grade`,
        { answers: answerList }
      );
      setResults(data);
    } catch {
      toast.error("채점에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="page-center">퀴즈를 불러오는 중...</div>
      </AppShell>
    );
  }

  if (problems.length === 0) {
    return (
      <AppShell>
        <div className="content">
          <div className="card" style={{ padding: 40, textAlign: "center" }}>
            <h2>{assignment?.title || "퀴즈"}</h2>
            <p style={{ color: "var(--on-surface-variant)", marginTop: 12 }}>
              {assignment?.generation_status === "generating"
                ? "AI가 퀴즈를 생성하고 있습니다. 잠시 후 새로고침해주세요."
                : "퀴즈 문제가 없습니다."}
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  const getResultForQuestion = (qid: number) =>
    results?.results.find((r) => r.question_id === qid);

  const answeredCount = problems.filter((p) => answers[p.id] !== undefined && answers[p.id] !== "").length;

  return (
    <AppShell>
      <div className="content" style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Header */}
        <div className="card" style={{ marginBottom: 20 }}>
          <h2>{assignment?.title || "퀴즈"}</h2>
          {assignment?.topic && (
            <p style={{ color: "var(--on-surface-variant)", marginTop: 4 }}>
              {assignment.topic}
            </p>
          )}
          <div
            className="course-meta"
            style={{ marginTop: 12 }}
          >
            <span className="badge">{problems.length}문제</span>
            <span className="badge">
              총 {problems.reduce((s, p) => s + p.points, 0)}점
            </span>
            {!results && (
              <span className="badge">
                {answeredCount}/{problems.length} 답변
              </span>
            )}
          </div>
        </div>

        {/* Results summary */}
        {results && (
          <div
            className="card"
            style={{
              marginBottom: 20,
              background:
                results.percent >= 80
                  ? "var(--success-light)"
                  : results.percent >= 60
                  ? "var(--primary-light)"
                  : "var(--error-light)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>채점 결과</h3>
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--on-surface-variant)",
                    marginTop: 4,
                  }}
                >
                  {results.score}/{results.total}점
                </p>
              </div>
              <div
                style={{
                  fontSize: 40,
                  fontWeight: 800,
                  color:
                    results.percent >= 80
                      ? "var(--success)"
                      : results.percent >= 60
                      ? "var(--primary)"
                      : "var(--error)",
                }}
              >
                {results.percent}%
              </div>
            </div>
          </div>
        )}

        {/* Questions */}
        {problems.map((p, idx) => {
          const result = getResultForQuestion(p.id);
          return (
            <div
              key={p.id}
              className="card"
              style={{
                marginBottom: 16,
                ...(result
                  ? {
                      borderLeft: `4px solid ${
                        result.correct ? "var(--success)" : "var(--error)"
                      }`,
                    }
                  : {}),
              }}
            >
              {/* Question header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <span
                  style={{
                    background: "var(--primary)",
                    color: "#fff",
                    borderRadius: "50%",
                    width: 28,
                    height: 28,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <span
                      className="badge"
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        background:
                          p.type === "multiple_choice"
                            ? "rgba(0,74,198,0.1)"
                            : p.type === "short_answer"
                            ? "rgba(16,185,129,0.1)"
                            : "rgba(99,46,205,0.1)",
                        color:
                          p.type === "multiple_choice"
                            ? "var(--primary)"
                            : p.type === "short_answer"
                            ? "var(--success)"
                            : "var(--tertiary)",
                      }}
                    >
                      {p.type === "multiple_choice"
                        ? "객관식"
                        : p.type === "short_answer"
                        ? "주관식"
                        : "서술형"}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--on-surface-variant)",
                      }}
                    >
                      {p.points}점
                    </span>
                  </div>
                  <p style={{ fontSize: 15, lineHeight: 1.6 }}>{p.question}</p>
                </div>
              </div>

              {/* Answer area */}
              {p.type === "multiple_choice" && p.options && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    marginLeft: 40,
                  }}
                >
                  {p.options.map((opt, oi) => {
                    const selected = answers[p.id] === oi;
                    const isCorrectOption = result && result.correct_answer === oi;
                    const isWrongSelected = result && selected && !result.correct;
                    return (
                      <label
                        key={oi}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 14px",
                          borderRadius: 10,
                          cursor: results ? "default" : "pointer",
                          background: isCorrectOption
                            ? "rgba(16,185,129,0.1)"
                            : isWrongSelected
                            ? "rgba(239,68,68,0.08)"
                            : selected
                            ? "var(--primary-light)"
                            : "var(--surface-container)",
                          border: `1.5px solid ${
                            isCorrectOption
                              ? "var(--success)"
                              : isWrongSelected
                              ? "var(--error)"
                              : selected
                              ? "var(--primary)"
                              : "transparent"
                          }`,
                          transition: "all 0.15s",
                        }}
                      >
                        <input
                          type="radio"
                          name={`q-${p.id}`}
                          checked={selected}
                          onChange={() => !results && handleAnswer(p.id, oi)}
                          disabled={!!results}
                          style={{ accentColor: "var(--primary)" }}
                        />
                        <span style={{ fontSize: 14 }}>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {p.type === "short_answer" && (
                <div style={{ marginLeft: 40 }}>
                  <input
                    className="input"
                    placeholder="답을 입력하세요"
                    value={(answers[p.id] as string) || ""}
                    onChange={(e) => handleAnswer(p.id, e.target.value)}
                    disabled={!!results}
                    style={{ maxWidth: 400 }}
                  />
                </div>
              )}

              {p.type === "essay" && (
                <div style={{ marginLeft: 40 }}>
                  <textarea
                    className="input"
                    placeholder="답을 서술하세요"
                    value={(answers[p.id] as string) || ""}
                    onChange={(e) => handleAnswer(p.id, e.target.value)}
                    disabled={!!results}
                    rows={5}
                    style={{ resize: "vertical", fontFamily: "inherit" }}
                  />
                </div>
              )}

              {/* Result feedback */}
              {result && (
                <div
                  style={{
                    marginTop: 14,
                    marginLeft: 40,
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: result.correct
                      ? "rgba(16,185,129,0.06)"
                      : "rgba(239,68,68,0.06)",
                    fontSize: 13,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      color: result.correct
                        ? "var(--success)"
                        : "var(--error)",
                      marginBottom: 4,
                    }}
                  >
                    {result.correct ? "정답" : "오답"} ({result.points_earned}/
                    {result.points_possible}점)
                  </div>
                  {result.explanation && (
                    <div style={{ color: "var(--on-surface-variant)" }}>
                      {result.explanation}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Submit button */}
        {!results && (
          <div style={{ textAlign: "center", marginTop: 20, marginBottom: 40 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleSubmit}
              disabled={submitting || answeredCount === 0}
            >
              {submitting
                ? "채점 중..."
                : `제출하기 (${answeredCount}/${problems.length})`}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
