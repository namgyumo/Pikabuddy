import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useNotificationStore } from "../../store/notificationStore";
import { useAuthStore } from "../../store/authStore";
import type { NotificationItem } from "../../store/notificationStore";

export default function NotificationBell() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { total, items, open, loading, unreadMessages, unresolvedComments, fetchNotifications, markRead, clearAll, toggle, setOpen } = useNotificationStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  // 30초 폴링
  useEffect(() => {
    fetchNotifications();
    pollRef.current = setInterval(fetchNotifications, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchNotifications]);

  // 패널 열릴 때 읽음 처리 (딜레이)
  useEffect(() => {
    if (!open) return;
    if (unreadMessages === 0 && unresolvedComments === 0) return;
    const timer = setTimeout(() => markRead(), 1500);
    return () => clearTimeout(timer);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (user?.role === "professor" && item.student_id) {
        navigate(`/courses/${item.course_id}/student-notes/${item.student_id}/${item.note_id}`, {
          state: { fromNotification: true, commentBlockIndex: item.block_index },
        });
      } else {
        navigate(`/courses/${item.course_id}/notes/${item.note_id}`, {
          state: { fromNotification: true, commentBlockIndex: item.block_index },
        });
      }
    } else if ((item.type === "deadline" || item.type === "unsubmitted") && item.course_id) {
      navigate(`/courses/${item.course_id}/assignments/${item.id}`);
    } else if (item.type === "new_material" && item.course_id) {
      navigate(`/courses/${item.course_id}`);
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
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {total > 0 && <span className="notification-panel-count">{total}개</span>}
              {items.length > 0 && (
                <button className="notification-clear-btn" onClick={clearAll} title="모두 읽음">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  모두 읽음
                </button>
              )}
            </div>
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
                  ) : item.type === "deadline" ? (
                    <span className="notification-deadline-icon">&#x23F0;</span>
                  ) : item.type === "unsubmitted" ? (
                    <span className="notification-unsubmitted-icon">&#x1F4E2;</span>
                  ) : item.type === "new_material" ? (
                    <span className="notification-material-icon">&#x1F4C4;</span>
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
                    ) : item.type === "deadline" ? (
                      <>
                        <strong>{item.assignment_title}</strong>
                        <span className="notification-item-tag deadline">마감 임박</span>
                      </>
                    ) : item.type === "unsubmitted" ? (
                      <>
                        <strong>{item.assignment_title}</strong>
                        <span className="notification-item-tag unsubmitted">미제출</span>
                      </>
                    ) : item.type === "new_material" ? (
                      <>
                        <strong>{item.course_title}</strong>
                        <span className="notification-item-tag material">새 자료</span>
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
                    {(item.type === "deadline" || item.type === "unsubmitted") && item.course_title && (
                      <span>{item.course_title}</span>
                    )}
                    {item.type === "new_material" && item.course_title && (
                      <span>{item.course_title}</span>
                    )}
                    <span>{timeAgo(item.created_at)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button className="notification-panel-footer" onClick={() => { setOpen(false); navigate("/notifications"); }}>
            전체 알림 보기
          </button>
        </div>
      )}
    </div>
  );
}
