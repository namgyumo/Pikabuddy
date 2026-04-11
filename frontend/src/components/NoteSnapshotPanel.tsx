/**
 * 노트 스냅샷 히스토리 패널
 * - 스냅샷 타임라인 (누가 언제 저장)
 * - 스냅샷 간 diff 뷰 (+ / -)
 * - 여러 번 수정된 줄에 > 버튼 → 이전 수정 이력 펼침
 */

import { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import type { NoteSnapshot } from "../types";
import {
  computeNoteDiff,
  buildLineHistory,
  enrichDiffWithHistory,
  type NoteDiffLine,
  type LineVersion,
} from "../lib/noteDiff";

interface Props {
  noteId: string;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function Avatar({ name, url, size = 20 }: { name: string; url?: string | null; size?: number }) {
  if (url) {
    return <img src={url} alt="" style={{ width: size, height: size, borderRadius: "50%" }} />;
  }
  return (
    <span style={{
      width: size, height: size, borderRadius: "50%", background: "var(--primary)",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontSize: size * 0.5, fontWeight: 700, flexShrink: 0,
    }}>
      {name.charAt(0)}
    </span>
  );
}

export default function NoteSnapshotPanel({ noteId }: Props) {
  const [snapshots, setSnapshots] = useState<NoteSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // diff 관련
  const [diffLines, setDiffLines] = useState<NoteDiffLine[]>([]);
  const [lineHistory, setLineHistory] = useState<Map<string, LineVersion[]>>(new Map());
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());

  // 스냅샷 전체 content 캐시
  const [snapshotContents, setSnapshotContents] = useState<Map<string, Record<string, unknown>>>(new Map());

  const fetchSnapshots = useCallback(async () => {
    try {
      const { data } = await api.get(`/notes/${noteId}/snapshots`);
      setSnapshots(data);
      if (data.length > 0) setSelectedIdx(0);
    } catch { /* */ }
    setLoading(false);
  }, [noteId]);

  useEffect(() => { fetchSnapshots(); }, [fetchSnapshots]);

  // 선택된 스냅샷의 content 로드 + diff 계산
  useEffect(() => {
    if (selectedIdx === null || snapshots.length === 0) return;

    const selected = snapshots[selectedIdx];
    // 스냅샷은 desc 정렬이므로 "이전"은 selectedIdx + 1
    const prevSnap = selectedIdx + 1 < snapshots.length ? snapshots[selectedIdx + 1] : null;

    const fetchAndDiff = async () => {
      const cache = new Map(snapshotContents);

      // 선택된 스냅샷 content 로드
      if (!cache.has(selected.id)) {
        try {
          const { data } = await api.get(`/notes/${noteId}/snapshots/${selected.id}`);
          cache.set(selected.id, data.content);
        } catch { return; }
      }

      // 이전 스냅샷 content 로드
      if (prevSnap && !cache.has(prevSnap.id)) {
        try {
          const { data } = await api.get(`/notes/${noteId}/snapshots/${prevSnap.id}`);
          cache.set(prevSnap.id, data.content);
        } catch { return; }
      }

      setSnapshotContents(cache);

      const newContent = cache.get(selected.id) || {};
      const oldContent = prevSnap ? (cache.get(prevSnap.id) || {}) : {};

      // diff 계산
      const diff = computeNoteDiff(oldContent, newContent);

      // 전체 히스토리 계산을 위해 모든 스냅샷 content 필요 (lazy load)
      const allContents: NoteSnapshot[] = [];
      // 오래된 순서로 (reversed)
      for (let i = snapshots.length - 1; i >= 0; i--) {
        const s = snapshots[i];
        let content = cache.get(s.id);
        if (!content) {
          try {
            const { data } = await api.get(`/notes/${noteId}/snapshots/${s.id}`);
            content = data.content;
            cache.set(s.id, content!);
          } catch { content = {}; }
        }
        allContents.push({ ...s, content });
      }

      setSnapshotContents(new Map(cache));

      const { lineHistory: lh, currentIdentities } = buildLineHistory(allContents);
      setLineHistory(lh);

      // 현재 선택된 스냅샷의 identities를 사용해 enrichment
      // currentIdentities는 가장 최신 스냅샷 기준이므로,
      // selectedIdx > 0 이면 해당 시점까지만의 identities를 계산
      // 간략화: selectedIdx === 0 (최신)일 때만 정확한 identity 매칭
      if (selectedIdx === 0) {
        const enriched = enrichDiffWithHistory(diff, lh, currentIdentities);
        setDiffLines(enriched);
      } else {
        // 이전 스냅샷 선택 시에는 hasHistory 없이 표시
        setDiffLines(diff);
      }
    };

    fetchAndDiff();
    setExpandedLines(new Set());
  }, [selectedIdx, snapshots, noteId]);

  const toggleExpand = (key: string) => {
    setExpandedLines((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (loading) {
    return <div style={{ padding: 16, fontSize: 13, color: "var(--on-surface-variant)" }}>스냅샷 로딩 중...</div>;
  }

  if (snapshots.length === 0) {
    return (
      <div style={{ padding: 16, fontSize: 13, color: "var(--on-surface-variant)", textAlign: "center" }}>
        <p style={{ marginBottom: 8 }}>저장 히스토리가 없습니다.</p>
        <p style={{ fontSize: 12 }}>팀 노트를 저장하면 자동으로 스냅샷이 기록됩니다.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* 타임라인 */}
      <div style={{
        borderBottom: "1px solid var(--outline-variant)", padding: "8px 0",
        maxHeight: 200, overflowY: "auto", flexShrink: 0,
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--on-surface-variant)", padding: "0 12px 6px", letterSpacing: "0.02em" }}>
          저장 히스토리 ({snapshots.length})
        </div>
        {snapshots.map((s, idx) => (
          <button
            key={s.id}
            onClick={() => setSelectedIdx(idx)}
            style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              padding: "6px 12px", border: "none", cursor: "pointer", textAlign: "left",
              background: selectedIdx === idx ? "var(--primary-container)" : "transparent",
              borderLeft: selectedIdx === idx ? "3px solid var(--primary)" : "3px solid transparent",
            }}
          >
            <Avatar name={s.saved_by_name} url={s.saved_by_avatar_url} size={22} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--on-surface)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.saved_by_name}
              </div>
              <div style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>
                {relativeTime(s.created_at)}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Diff 뷰 */}
      <div style={{ flex: 1, overflowY: "auto", fontSize: 12, fontFamily: "Consolas, 'Courier New', monospace" }}>
        {selectedIdx !== null && snapshots.length > 0 && (
          <div style={{ padding: "8px 0" }}>
            <div style={{ padding: "0 12px 8px", fontSize: 11, color: "var(--on-surface-variant)", borderBottom: "1px solid var(--outline-variant)" }}>
              {selectedIdx + 1 < snapshots.length
                ? `${snapshots[selectedIdx + 1].saved_by_name}의 저장 → ${snapshots[selectedIdx].saved_by_name}의 저장`
                : "첫 번째 저장 (전체 추가)"}
            </div>
            {diffLines.map((line, i) => (
              <div key={i}>
                <div style={{
                  display: "flex", alignItems: "stretch",
                  background: line.type === "add"
                    ? "rgba(0, 180, 0, 0.08)"
                    : line.type === "remove"
                      ? "rgba(220, 0, 0, 0.08)"
                      : "transparent",
                  borderLeft: line.type === "add"
                    ? "3px solid rgba(0, 160, 0, 0.5)"
                    : line.type === "remove"
                      ? "3px solid rgba(200, 0, 0, 0.5)"
                      : "3px solid transparent",
                }}>
                  {/* 줄 번호 */}
                  <span style={{ width: 28, textAlign: "right", padding: "2px 4px", color: "var(--on-surface-variant)", opacity: 0.5, flexShrink: 0, fontSize: 10 }}>
                    {line.oldNum}
                  </span>
                  <span style={{ width: 28, textAlign: "right", padding: "2px 4px", color: "var(--on-surface-variant)", opacity: 0.5, flexShrink: 0, fontSize: 10 }}>
                    {line.newNum}
                  </span>
                  {/* +/- 마커 */}
                  <span style={{
                    width: 16, textAlign: "center", padding: "2px 0", flexShrink: 0, fontWeight: 700,
                    color: line.type === "add" ? "green" : line.type === "remove" ? "red" : "transparent",
                  }}>
                    {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
                  </span>
                  {/* 내용 */}
                  <span style={{ flex: 1, padding: "2px 4px", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {line.text || " "}
                  </span>
                  {/* > 버튼 (여러 번 수정된 줄) */}
                  {line.hasHistory && line.identityKey && (
                    <button
                      onClick={() => toggleExpand(line.identityKey)}
                      style={{
                        width: 22, flexShrink: 0, border: "none", cursor: "pointer",
                        background: expandedLines.has(line.identityKey) ? "var(--primary-container)" : "transparent",
                        color: "var(--primary)", fontWeight: 700, fontSize: 12,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                      title="이전 수정 내역 보기"
                    >
                      {expandedLines.has(line.identityKey) ? "\u25BC" : "\u25B6"}
                    </button>
                  )}
                </div>

                {/* 확장된 이전 수정 내역 */}
                {line.hasHistory && line.identityKey && expandedLines.has(line.identityKey) && (
                  <div style={{
                    marginLeft: 72, borderLeft: "2px solid var(--primary-container)",
                    background: "var(--surface-container-lowest)", padding: "4px 0",
                  }}>
                    {(lineHistory.get(line.identityKey) || []).map((ver, vi) => (
                      <div key={vi} style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "3px 8px", fontSize: 11,
                      }}>
                        <Avatar name={ver.savedByName} url={ver.savedByAvatarUrl} size={14} />
                        <span style={{ color: "var(--on-surface-variant)", fontWeight: 600, whiteSpace: "nowrap" }}>
                          {ver.savedByName}
                        </span>
                        <span style={{ color: "var(--on-surface-variant)", opacity: 0.6, whiteSpace: "nowrap", fontSize: 10 }}>
                          {relativeTime(ver.timestamp)}
                        </span>
                        <span style={{
                          flex: 1, whiteSpace: "pre-wrap", wordBreak: "break-all",
                          color: ver.changeType === "initial" ? "var(--on-surface-variant)" : "var(--on-surface)",
                          fontStyle: ver.changeType === "initial" ? "italic" : "normal",
                        }}>
                          {ver.text || " "}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {diffLines.length === 0 && (
              <div style={{ padding: 16, textAlign: "center", color: "var(--on-surface-variant)", fontSize: 12 }}>
                변경 사항 없음
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
