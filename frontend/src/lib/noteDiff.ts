/**
 * 노트 스냅샷 diff 유틸리티
 * - Tiptap JSON → 줄 단위 텍스트 변환
 * - 스냅샷 간 diff 계산
 * - 줄 단위 수정 이력 추적 (> 버튼용)
 */

import * as Diff from "diff";
import type { NoteSnapshot } from "../types";

/* ── Types ── */

export interface NoteDiffLine {
  type: "add" | "remove" | "context";
  text: string;
  newNum: string;
  oldNum: string;
  /** 이 줄이 여러 스냅샷에 걸쳐 수정되었는지 (> 버튼 표시용) */
  hasHistory: boolean;
  /** 줄 identity key (lineHistory 맵에서 조회용) */
  identityKey: string;
}

export interface LineVersion {
  snapshotId: string;
  savedBy: string;
  savedByName: string;
  savedByAvatarUrl: string | null;
  timestamp: string;
  text: string;
  changeType: "initial" | "modified" | "added";
}

/* ── Tiptap JSON → 줄 단위 텍스트 ── */

function extractText(node: Record<string, unknown>): string {
  if (node.type === "text") {
    return (node.text as string) || "";
  }
  const children = node.content as Record<string, unknown>[] | undefined;
  if (!children || !Array.isArray(children)) return "";
  return children.map(extractText).join("");
}

function blockToLine(node: Record<string, unknown>, depth = 0): string {
  const t = node.type as string;
  const text = extractText(node);
  const children = node.content as Record<string, unknown>[] | undefined;

  switch (t) {
    case "heading": {
      const level = (node.attrs as Record<string, unknown>)?.level || 1;
      return "#".repeat(level as number) + " " + text;
    }
    case "paragraph":
      return text;
    case "bulletList":
    case "orderedList":
    case "taskList":
      if (!children) return "";
      return children
        .map((li, i) => {
          const prefix = t === "orderedList" ? `${i + 1}. ` : t === "taskList" ? "- [ ] " : "- ";
          const liChildren = li.content as Record<string, unknown>[] | undefined;
          if (!liChildren) return prefix;
          return liChildren.map((c) => prefix + extractText(c)).join("\n");
        })
        .join("\n");
    case "codeBlock":
      return "```\n" + text + "\n```";
    case "blockquote":
      if (!children) return "";
      return children.map((c) => "> " + extractText(c)).join("\n");
    case "table":
      if (!children) return "";
      return children
        .map((row) => {
          const cells = row.content as Record<string, unknown>[] | undefined;
          if (!cells) return "|";
          return "| " + cells.map((c) => extractText(c)).join(" | ") + " |";
        })
        .join("\n");
    default:
      return text;
  }
}

export function tiptapToLines(content: Record<string, unknown>): string[] {
  const children = content.content as Record<string, unknown>[] | undefined;
  if (!children || !Array.isArray(children)) return [];
  const lines: string[] = [];
  for (const block of children) {
    const converted = blockToLine(block);
    // 여러 줄로 분리되는 블록 (리스트, 테이블 등)
    for (const line of converted.split("\n")) {
      lines.push(line);
    }
  }
  return lines;
}

/* ── 두 스냅샷 간 diff ── */

export function computeNoteDiff(
  oldContent: Record<string, unknown>,
  newContent: Record<string, unknown>,
): NoteDiffLine[] {
  const oldLines = tiptapToLines(oldContent);
  const newLines = tiptapToLines(newContent);
  const oldStr = oldLines.join("\n") + (oldLines.length ? "\n" : "");
  const newStr = newLines.join("\n") + (newLines.length ? "\n" : "");

  const parts = Diff.diffLines(oldStr, newStr);
  const result: NoteDiffLine[] = [];
  let oldNum = 1;
  let newNum = 1;
  let i = 0;

  while (i < parts.length) {
    const part = parts[i];
    if (!part.added && !part.removed) {
      const lines = part.value.replace(/\n$/, "").split("\n");
      for (const line of lines) {
        result.push({
          type: "context", text: line,
          oldNum: String(oldNum++), newNum: String(newNum++),
          hasHistory: false, identityKey: "",
        });
      }
      i++;
    } else if (part.removed) {
      const removedLines = part.value.replace(/\n$/, "").split("\n");
      const nextPart = i + 1 < parts.length && parts[i + 1].added ? parts[i + 1] : null;
      const addedLines = nextPart ? nextPart.value.replace(/\n$/, "").split("\n") : [];
      const maxLen = Math.max(removedLines.length, addedLines.length);

      for (let j = 0; j < maxLen; j++) {
        if (j < removedLines.length) {
          result.push({
            type: "remove", text: removedLines[j],
            oldNum: String(oldNum++), newNum: "",
            hasHistory: false, identityKey: "",
          });
        }
        if (j < addedLines.length) {
          result.push({
            type: "add", text: addedLines[j],
            oldNum: "", newNum: String(newNum++),
            hasHistory: false, identityKey: "",
          });
        }
      }
      i += nextPart ? 2 : 1;
    } else {
      const lines = part.value.replace(/\n$/, "").split("\n");
      for (const line of lines) {
        result.push({
          type: "add", text: line,
          oldNum: "", newNum: String(newNum++),
          hasHistory: false, identityKey: "",
        });
      }
      i++;
    }
  }
  return result;
}

/* ── 줄 단위 수정 이력 추적 (> 확장 버튼용) ── */

export function buildLineHistory(
  snapshots: NoteSnapshot[],
): { lineHistory: Map<string, LineVersion[]>; currentIdentities: string[] } {
  if (snapshots.length === 0) {
    return { lineHistory: new Map(), currentIdentities: [] };
  }

  // 오래된 순서로 정렬
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const lineHistory = new Map<string, LineVersion[]>();
  let nextId = 0;
  const makeKey = () => `line_${nextId++}`;

  // 첫 스냅샷 초기화
  const firstSnap = sorted[0];
  const firstLines = tiptapToLines(firstSnap.content || {});
  let currentIdentities: string[] = [];

  for (const line of firstLines) {
    const key = makeKey();
    currentIdentities.push(key);
    lineHistory.set(key, [
      {
        snapshotId: firstSnap.id,
        savedBy: firstSnap.saved_by,
        savedByName: firstSnap.saved_by_name,
        savedByAvatarUrl: firstSnap.saved_by_avatar_url,
        timestamp: firstSnap.created_at,
        text: line,
        changeType: "initial",
      },
    ]);
  }

  // 연속 스냅샷 쌍 처리
  for (let si = 1; si < sorted.length; si++) {
    const prevSnap = sorted[si - 1];
    const currSnap = sorted[si];
    const oldLines = tiptapToLines(prevSnap.content || {});
    const newLines = tiptapToLines(currSnap.content || {});
    const oldStr = oldLines.join("\n") + (oldLines.length ? "\n" : "");
    const newStr = newLines.join("\n") + (newLines.length ? "\n" : "");

    const parts = Diff.diffLines(oldStr, newStr);
    const newIdentities: string[] = [];
    let oldIdx = 0;
    let pi = 0;

    while (pi < parts.length) {
      const part = parts[pi];
      if (!part.added && !part.removed) {
        // 변경 없는 줄 → identity 유지
        const count = part.value.replace(/\n$/, "").split("\n").length;
        for (let j = 0; j < count; j++) {
          newIdentities.push(currentIdentities[oldIdx] || makeKey());
          oldIdx++;
        }
        pi++;
      } else if (part.removed) {
        const removedCount = part.value.replace(/\n$/, "").split("\n").length;
        const nextPart = pi + 1 < parts.length && parts[pi + 1].added ? parts[pi + 1] : null;

        if (nextPart) {
          // 수정 (remove + add 쌍)
          const addedTextLines = nextPart.value.replace(/\n$/, "").split("\n");
          const matchCount = Math.min(removedCount, addedTextLines.length);

          // 매칭되는 줄 → 기존 identity에 새 버전 추가
          for (let j = 0; j < matchCount; j++) {
            const key = currentIdentities[oldIdx + j] || makeKey();
            newIdentities.push(key);
            const versions = lineHistory.get(key) || [];
            versions.push({
              snapshotId: currSnap.id,
              savedBy: currSnap.saved_by,
              savedByName: currSnap.saved_by_name,
              savedByAvatarUrl: currSnap.saved_by_avatar_url,
              timestamp: currSnap.created_at,
              text: addedTextLines[j],
              changeType: "modified",
            });
            lineHistory.set(key, versions);
          }

          // 추가된 줄이 더 많으면 새 identity
          for (let j = matchCount; j < addedTextLines.length; j++) {
            const key = makeKey();
            newIdentities.push(key);
            lineHistory.set(key, [
              {
                snapshotId: currSnap.id,
                savedBy: currSnap.saved_by,
                savedByName: currSnap.saved_by_name,
                savedByAvatarUrl: currSnap.saved_by_avatar_url,
                timestamp: currSnap.created_at,
                text: addedTextLines[j],
                changeType: "added",
              },
            ]);
          }

          oldIdx += removedCount;
          pi += 2;
        } else {
          // 순수 삭제 → identity 소멸
          oldIdx += removedCount;
          pi++;
        }
      } else {
        // 순수 추가
        const addedTextLines = part.value.replace(/\n$/, "").split("\n");
        for (const line of addedTextLines) {
          const key = makeKey();
          newIdentities.push(key);
          lineHistory.set(key, [
            {
              snapshotId: currSnap.id,
              savedBy: currSnap.saved_by,
              savedByName: currSnap.saved_by_name,
              savedByAvatarUrl: currSnap.saved_by_avatar_url,
              timestamp: currSnap.created_at,
              text: line,
              changeType: "added",
            },
          ]);
        }
        pi++;
      }
    }

    currentIdentities = newIdentities;
  }

  return { lineHistory, currentIdentities };
}

/**
 * diff 결과에 lineHistory 정보를 합침.
 * 선택된 스냅샷과 이전 스냅샷 간의 diff에 > 버튼 여부를 추가.
 */
export function enrichDiffWithHistory(
  diffLines: NoteDiffLine[],
  lineHistory: Map<string, LineVersion[]>,
  currentIdentities: string[],
): NoteDiffLine[] {
  let newLineIdx = 0;
  return diffLines.map((line) => {
    if (line.type === "add" || line.type === "context") {
      const key = currentIdentities[newLineIdx] || "";
      newLineIdx++;
      const versions = lineHistory.get(key) || [];
      return { ...line, identityKey: key, hasHistory: versions.length > 1 };
    }
    return line;
  });
}
