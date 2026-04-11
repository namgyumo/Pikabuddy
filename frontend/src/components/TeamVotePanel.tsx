import { useState, useEffect } from "react";
import type { VoteStatus } from "../lib/useTeamVote";

interface Props {
  voteStatus: VoteStatus | null;
  loading: boolean;
  onInitiateVote: () => void;
  onCastVote: (response: "approve" | "reject") => void;
}

export default function TeamVotePanel({ voteStatus, loading, onInitiateVote, onCastVote }: Props) {
  const vote = voteStatus?.vote;
  const members = voteStatus?.team_members || [];
  const responses = voteStatus?.responses || [];
  const myResponse = voteStatus?.my_response;

  // Countdown
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    if (!vote || vote.status !== "pending") return;
    const update = () => {
      const deadline = new Date(vote.deadline).getTime();
      const now = Date.now();
      const diff = Math.max(0, deadline - now);
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${m}:${String(s).padStart(2, "0")}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [vote?.deadline, vote?.status]);

  // Still loading initial status
  if (!voteStatus) {
    return (
      <div style={{ padding: 20, borderRadius: 12, background: "var(--surface-container)", textAlign: "center" }}>
        <span style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>투표 상태 확인 중...</span>
      </div>
    );
  }

  // No vote yet
  if (!vote) {
    return (
      <div style={{
        padding: 20, borderRadius: 12,
        background: "var(--surface-container)", border: "1px solid var(--outline-variant)",
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
          조별과제 제출
        </div>
        <p style={{ fontSize: 13, color: "var(--on-surface-variant)", margin: "0 0 14px" }}>
          팀원 {members.length}명의 투표로 제출됩니다.
        </p>
        <button className="btn btn-primary" onClick={onInitiateVote} disabled={loading}
          style={{ width: "100%" }}>
          {loading ? "처리 중..." : "제출 투표 시작"}
        </button>
      </div>
    );
  }

  // Approved
  if (vote.status === "approved") {
    return (
      <div style={{
        padding: 20, borderRadius: 12,
        background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 20 }}>&#10003;</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#16a34a" }}>팀 제출 완료!</span>
        </div>
        <p style={{ fontSize: 13, color: "var(--on-surface-variant)", margin: 0 }}>
          {vote.initiated_by_name}님이 발의한 제출이 승인되었습니다.
        </p>
        {renderResponses()}
      </div>
    );
  }

  // Rejected
  if (vote.status === "rejected") {
    return (
      <div style={{
        padding: 20, borderRadius: 12,
        background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 20, color: "#dc2626" }}>&#10007;</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#dc2626" }}>투표 부결</span>
        </div>
        <p style={{ fontSize: 13, color: "var(--on-surface-variant)", margin: "0 0 14px" }}>
          제출이 부결되었습니다. 다시 투표를 시작할 수 있습니다.
        </p>
        {renderResponses()}
        <button className="btn btn-primary" onClick={onInitiateVote} disabled={loading}
          style={{ width: "100%", marginTop: 14 }}>
          {loading ? "처리 중..." : "다시 투표 시작"}
        </button>
      </div>
    );
  }

  // Pending
  return (
    <div style={{
      padding: 20, borderRadius: 12,
      background: "var(--surface-container)", border: "1px solid var(--primary)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>제출 투표 진행 중</div>
          <div style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 2 }}>
            {vote.initiated_by_name}님이 발의
          </div>
        </div>
        <div style={{
          padding: "4px 12px", borderRadius: 20, fontSize: 14, fontWeight: 700,
          background: "rgba(0,74,198,0.1)", color: "var(--primary)",
          fontVariantNumeric: "tabular-nums",
        }}>
          {remaining}
        </div>
      </div>

      {/* Vote buttons */}
      {!myResponse ? (
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <button className="btn btn-primary" style={{ flex: 1 }}
            onClick={() => onCastVote("approve")} disabled={loading}>
            제출하기
          </button>
          <button className="btn" style={{
            flex: 1, background: "rgba(220,38,38,0.1)", color: "#dc2626",
            border: "1px solid rgba(220,38,38,0.3)", borderRadius: 8, fontWeight: 600, cursor: "pointer",
          }} onClick={() => onCastVote("reject")} disabled={loading}>
            취소하기
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <div style={{
            padding: "8px 14px", borderRadius: 8, fontSize: 13,
            background: myResponse === "approve" ? "rgba(34,197,94,0.1)" : "rgba(220,38,38,0.08)",
            color: myResponse === "approve" ? "#16a34a" : "#dc2626",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span>{myResponse === "approve" ? "제출에 찬성했습니다" : "제출에 반대했습니다"}</span>
            <button style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 12, textDecoration: "underline", color: "var(--on-surface-variant)",
            }} onClick={() => onCastVote(myResponse === "approve" ? "reject" : "approve")} disabled={loading}>
              변경
            </button>
          </div>
        </div>
      )}

      {renderResponses()}
    </div>
  );

  function renderResponses() {
    return (
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 12, color: "var(--on-surface-variant)", marginBottom: 6 }}>
          투표 현황 ({responses.length}/{members.length})
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {members.map((m) => {
            const resp = responses.find((r) => r.student_id === m.student_id);
            return (
              <div key={m.student_id} style={{
                display: "flex", alignItems: "center", gap: 8, fontSize: 13,
                padding: "4px 8px", borderRadius: 6,
                background: resp ? (resp.response === "approve" ? "rgba(34,197,94,0.06)" : "rgba(220,38,38,0.06)") : "transparent",
              }}>
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt="" style={{ width: 20, height: 20, borderRadius: "50%" }} />
                ) : (
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, color: "var(--primary)",
                  }}>{(m.name || "?")[0]}</div>
                )}
                <span style={{ flex: 1 }}>{m.name}</span>
                {resp ? (
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: resp.response === "approve" ? "#16a34a" : "#dc2626",
                  }}>{resp.response === "approve" ? "찬성" : "반대"}</span>
                ) : (
                  <span style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>대기</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}
