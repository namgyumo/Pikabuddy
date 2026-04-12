import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import api from "../lib/api";
import AppShell from "../components/common/AppShell";

interface HistoryItem {
  type: "message" | "comment" | "system";
  id: string;
  course_id?: string;
  course_title?: string;
  sender_id?: string;
  sender_name?: string;
  sender_avatar?: string | null;
  note_id?: string;
  student_id?: string;
  note_title?: string;
  commenter_name?: string;
  commenter_avatar?: string | null;
  block_index?: number | null;
  preview: string;
  created_at: string;
  is_read: boolean;
  system_kind?: string;
}

type FilterType = "all" | "message" | "comment" | "system";

export default function Notifications() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    api.get("/notifications/history").then(({ data }) => {
      setItems(data.items);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? items : items.filter((i) => i.type === filter);

  const handleClick = (item: HistoryItem) => {
    if (item.type === "message" && item.course_id && item.sender_id) {
      navigate(`/courses/${item.course_id}/messenger/${item.sender_id}`);
    } else if (item.type === "comment" && item.note_id && item.course_id) {
      if (user?.role === "professor" && item.student_id) {
        navigate(`/courses/${item.course_id}/student-notes/${item.student_id}/${item.note_id}`);
      } else {
        navigate(`/courses/${item.course_id}/notes/${item.note_id}`);
      }
    } else if (item.type === "system" && item.course_id) {
      navigate(`/courses/${item.course_id}`);
    }
  };

  const timeLabel = (dateStr: string): string => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "방금";
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}일 전`;
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  const groupByDate = (list: HistoryItem[]) => {
    const groups: { label: string; items: HistoryItem[] }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    for (const item of list) {
      const d = new Date(item.created_at);
      d.setHours(0, 0, 0, 0);
      let label: string;
      if (d.getTime() === today.getTime()) label = "오늘";
      else if (d.getTime() === yesterday.getTime()) label = "어제";
      else label = d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });

      const last = groups[groups.length - 1];
      if (last && last.label === label) {
        last.items.push(item);
      } else {
        groups.push({ label, items: [item] });
      }
    }
    return groups;
  };

  const systemKindIcon = (kind?: string) => {
    if (kind === "deadline") return "⏰";
    if (kind === "new_material") return "📄";
    return "📢";
  };

  const systemKindLabel = (kind?: string) => {
    if (kind === "deadline") return "마감 임박";
    if (kind === "new_material") return "새 자료";
    return "새 과제";
  };

  const groups = groupByDate(filtered);
  const counts = {
    all: items.length,
    message: items.filter((i) => i.type === "message").length,
    comment: items.filter((i) => i.type === "comment").length,
    system: items.filter((i) => i.type === "system").length,
  };

  return (
    <AppShell>
      <main className="content">
        <h1 className="page-title">전체 알림</h1>
        <p className="page-subtitle">이때까지 받은 알림을 확인하세요.</p>

        <div className="type-chips" style={{ marginBottom: 16 }}>
          <button className={`type-chip${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")}>
            전체 ({counts.all})
          </button>
          <button className={`type-chip${filter === "message" ? " active" : ""}`} onClick={() => setFilter("message")}>
            메시지 ({counts.message})
          </button>
          <button className={`type-chip${filter === "comment" ? " active" : ""}`} onClick={() => setFilter("comment")}>
            코멘트 ({counts.comment})
          </button>
          <button className={`type-chip${filter === "system" ? " active" : ""}`} onClick={() => setFilter("system")}>
            시스템 ({counts.system})
          </button>
        </div>

        {loading ? (
          <div className="empty">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="empty">알림이 없습니다.</div>
        ) : (
          <div className="notif-history-list">
            {groups.map((group) => (
              <div key={group.label}>
                <div className="notif-history-date">{group.label}</div>
                {group.items.map((item) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    className={`notif-history-item${!item.is_read ? " unread" : ""}`}
                    onClick={() => handleClick(item)}
                  >
                    <div className="notif-history-avatar">
                      {item.type === "message" ? (
                        item.sender_avatar ? <img src={item.sender_avatar} alt="" /> : <span>{item.sender_name?.charAt(0)?.toUpperCase() || "?"}</span>
                      ) : item.type === "system" ? (
                        <span className="notif-system-icon">{systemKindIcon(item.system_kind)}</span>
                      ) : (
                        item.commenter_avatar ? <img src={item.commenter_avatar} alt="" /> : <span>{item.commenter_name?.charAt(0)?.toUpperCase() || "?"}</span>
                      )}
                    </div>
                    <div className="notif-history-content">
                      <div className="notif-history-top">
                        <strong>
                          {item.type === "message" ? item.sender_name
                            : item.type === "system" ? (item.course_title || "시스템")
                            : item.commenter_name}
                        </strong>
                        <span className={`notification-item-tag ${
                          item.type === "message" ? "msg"
                          : item.type === "system" ? (item.system_kind === "deadline" ? "deadline" : "material")
                          : "cmt"
                        }`}>
                          {item.type === "message" ? "메시지"
                            : item.type === "system" ? systemKindLabel(item.system_kind)
                            : "코멘트"}
                        </span>
                        <span className="notif-history-time">{timeLabel(item.created_at)}</span>
                      </div>
                      <div className="notif-history-preview">{item.preview}</div>
                      <div className="notif-history-meta">
                        {item.type === "message" && item.course_title && <span>{item.course_title}</span>}
                        {item.type === "comment" && item.note_title && (
                          <span>{item.note_title}{item.block_index != null ? ` > 블록 ${item.block_index + 1}` : ""}</span>
                        )}
                        {item.type === "system" && item.course_title && <span>{item.course_title}</span>}
                      </div>
                    </div>
                    {!item.is_read && <div className="notif-history-dot" />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}
