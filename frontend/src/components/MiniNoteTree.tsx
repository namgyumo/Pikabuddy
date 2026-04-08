import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../lib/api";
import type { Note } from "../types";

interface TreeNode {
  id: string;
  title: string;
  score: number | null;
  children: TreeNode[];
}

function buildTree(notes: Note[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  for (const n of notes) {
    map.set(n.id, {
      id: n.id,
      title: n.title,
      score: n.understanding_score,
      children: [],
    });
  }
  const roots: TreeNode[] = [];
  for (const n of notes) {
    const node = map.get(n.id)!;
    if (n.parent_id && map.has(n.parent_id)) {
      map.get(n.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function scoreColor(score: number | null): string {
  if (score == null) return "var(--on-surface-variant)";
  if (score < 40) return "#ef4444";
  if (score < 60) return "#f59e0b";
  if (score < 80) return "#3b82f6";
  return "#22c55e";
}

function TreeItem({ node, currentId, courseId, navigate, depth }: {
  node: TreeNode;
  currentId: string | undefined;
  courseId: string;
  navigate: (path: string) => void;
  depth: number;
}) {
  const [open, setOpen] = useState(true);
  const isCurrent = node.id === currentId;

  return (
    <div className="mini-tree-item">
      <div
        className={`mini-tree-row${isCurrent ? " current" : ""}`}
        style={{ paddingLeft: 8 + depth * 16 }}
        onClick={() => navigate(`/courses/${courseId}/notes/${node.id}`)}
      >
        {node.children.length > 0 ? (
          <button
            className={`mini-tree-toggle${open ? " open" : ""}`}
            onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M3 2l4 3-4 3z" />
            </svg>
          </button>
        ) : (
          <span className="mini-tree-dot" style={{ color: scoreColor(node.score) }} />
        )}
        <span className="mini-tree-title">{node.title}</span>
        {node.score != null && (
          <span className="mini-tree-score" style={{ color: scoreColor(node.score) }}>
            {node.score}%
          </span>
        )}
      </div>
      {open && node.children.length > 0 && (
        <div className="mini-tree-children">
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              currentId={currentId}
              courseId={courseId}
              navigate={navigate}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MiniNoteTree() {
  const { courseId, noteId } = useParams<{ courseId: string; noteId: string }>();
  const navigate = useNavigate();
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [backlinks, setBacklinks] = useState<{ id: string; title: string }[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    if (!courseId) return;
    api.get(`/courses/${courseId}/notes`).then(({ data }) => {
      setTree(buildTree(data));
    });
  }, [courseId]);

  useEffect(() => {
    if (!noteId || noteId === "new") return;
    Promise.all([
      api.get(`/notes/${noteId}/backlinks`).catch(() => ({ data: [] })),
      api.get(`/notes/${noteId}/recommendations`).catch(() => ({ data: [] })),
    ]).then(([bl, rec]) => {
      setBacklinks(bl.data);
      setRecommendations(rec.data);
    });
  }, [noteId]);

  if (!courseId) return null;

  return (
    <div className="mini-tree-panel">
      {/* Tree */}
      <div className="mini-tree-section">
        <h4 className="mini-tree-heading">노트 구조</h4>
        {tree.map((node) => (
          <TreeItem
            key={node.id}
            node={node}
            currentId={noteId}
            courseId={courseId}
            navigate={navigate}
            depth={0}
          />
        ))}
        {tree.length === 0 && (
          <div className="mini-tree-empty">노트가 없습니다</div>
        )}
      </div>

      {/* Backlinks */}
      {backlinks.length > 0 && (
        <div className="mini-tree-section">
          <h4 className="mini-tree-heading">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 7h3a5 5 0 0 1 0 10h-3m-6 0H6a5 5 0 0 1 0-10h3"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            백링크 ({backlinks.length})
          </h4>
          {backlinks.map((bl) => (
            <div
              key={bl.id}
              className="mini-tree-backlink"
              onClick={() => navigate(`/courses/${courseId}/notes/${bl.id}`)}
            >
              {bl.title}
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mini-tree-section">
          <h4 className="mini-tree-heading">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
            관련 노트
          </h4>
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="mini-tree-backlink"
              onClick={() => navigate(`/courses/${courseId}/notes/${rec.id}`)}
            >
              <span>{rec.title}</span>
              <span className="mini-tree-sim">{Math.round(rec.similarity * 100)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Graph link */}
      <button
        className="mini-tree-graph-btn"
        onClick={() => navigate(`/courses/${courseId}/graph`)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/>
          <circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/>
          <line x1="8.5" y1="7.5" x2="15.5" y2="16.5"/>
          <line x1="15.5" y1="7.5" x2="8.5" y2="16.5"/>
        </svg>
        전체 그래프 보기
      </button>
    </div>
  );
}
