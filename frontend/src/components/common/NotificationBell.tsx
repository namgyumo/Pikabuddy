import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useNotificationStore } from "../../store/notificationStore";
import { useAuthStore } from "../../store/authStore";
import type { NotificationItem } from "../../store/notificationStore";

export default function NotificationBell() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { total, items, open, loading, fetchNotifications, toggle, setOpen } = useNotificationStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  // 30초 폴링
  useEffect(() => {
    fetchNotifications();
    pollRef.current = setInterval(fetchNotifications, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchNotifications]);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, setOpen]);

  const handleClick = (item: NotificationItem) => {
    setOpen(false);
    if (item.type === "message" && item.course_id && item.sender_id) {
      navigate(`/courses/${item.course_id}/messenger/${item.sender_id}`);
    } else if (item.type === "comment" && item.note_id && item.course_id) {
      // 코멘트 → 해당 노트로 이동 (교수는 student-notes 경로)
      if (user?.role === "professor" && item.student_id) {
        navigate(`/courses/${item.course_id}/student-notes/${item.student_id}/${item.note_id}`);
      } else {
        navigate(`/courses/${item.course_id}/notes/${item.note_id}`);
      }
    }
  };

  const timeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "방금";
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
  };

  return (
    <div className="notification-bell-wrap" ref={panelRef}>
      <button className="notification-bell-btn" onClick={toggle} title="알림">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {total > 0 && <span className="notification-bell-badge">{total > 99 ? "99+" : total}</span>}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <h4>알림</h4>
            {total > 0 && <span className="notification-panel-count">{total}개</span>}
          </div>

          <div className="notification-panel-body">
            {loading && items.length === 0 && (
              <div className="notification-empty">불러오는 중...</div>
            )}
            {!loading && items.length === 0 && (
              <div className="notification-empty">새로운 알림이 없습니다</div>
            )}
            {items.map((item) => (
              <button
                key={`${item.type}-${item.id}`}
                className="notification-item"
                onClick={() => handleClick(item)}
              >
                <div className="notification-item-avatar">
                  {item.type === "message" ? (
                    item.sender_avatar ? (
                      <img src={item.sender_avatar} alt="" />
                    ) : (
                      <span>{item.sender_name?.charAt(0)?.toUpperCase() || "?"}</span>
                    )
                  ) : (
                    item.commenter_avatar ? (
                      <img src={item.commenter_avatar} alt="" />
                    ) : (
                      <span>{item.commenter_name?.charAt(0)?.toUpperCase() || "?"}</span>
                    )
                  )}
                </div>
                <div className="notification-item-content">
                  <div className="notification-item-title">
                    {item.type === "message" ? (
                      <>
                        <strong>{item.sender_name}</strong>
                        <span className="notification-item-tag msg">메시지</span>
                      </>
                    ) : (
                      <>
                        <strong>{item.commenter_name}</strong>
                        <span className="notification-item-tag cmt">코멘트</span>
                      </>
                    )}
                  </div>
                  <div className="notification-item-preview">{item.preview}</div>
                  <div className="notification-item-meta">
                    {item.type === "message" && item.course_title && (
                      <span>{item.course_title}</span>
                    )}
                    {item.type === "comment" && item.note_title && (
                      <span>{item.note_title}{item.block_index != null ? ` > 블록 ${item.block_index + 1}` : ""}</span>
                    )}
                    <span>{timeAgo(item.created_at)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
