import { create } from "zustand";
import api from "../lib/api";

export interface NotificationItem {
  type: "message" | "comment" | "deadline" | "new_material";
  id: string;
  // message fields
  course_id?: string;
  course_title?: string;
  sender_id?: string;
  sender_name?: string;
  sender_avatar?: string | null;
  // comment fields
  note_id?: string;
  student_id?: string;
  note_title?: string;
  commenter_name?: string;
  commenter_avatar?: string | null;
  block_index?: number | null;
  // deadline fields
  assignment_title?: string;
  due_date?: string;
  // common
  preview: string;
  created_at: string;
}

// sessionStorage 키 — "모두 읽음" 시점 저장
const DISMISS_KEY = "notif_dismissed_at";

function getDismissedAt(): number {
  const v = sessionStorage.getItem(DISMISS_KEY);
  return v ? Number(v) : 0;
}

function setDismissedAt() {
  sessionStorage.setItem(DISMISS_KEY, String(Date.now()));
}

interface NotificationState {
  unreadMessages: number;
  unresolvedComments: number;
  upcomingDeadlines: number;
  newMaterials: number;
  total: number;
  items: NotificationItem[];
  loading: boolean;
  open: boolean;
  markedRead: boolean;
  messengerCourseId: string | null;
  totalUnreadMessages: number;

  fetchNotifications: () => Promise<void>;
  fetchTotalUnread: () => Promise<void>;
  fetchMessengerCourse: () => Promise<void>;
  markRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadMessages: 0,
  unresolvedComments: 0,
  upcomingDeadlines: 0,
  newMaterials: 0,
  total: 0,
  items: [],
  loading: false,
  open: false,
  markedRead: false,
  messengerCourseId: null,
  totalUnreadMessages: 0,

  fetchNotifications: async () => {
    // 패널이 열려있으면 폴링 스킵 (깜빡임 방지)
    if (get().open) return;
    set({ loading: true });
    try {
      const { data } = await api.get("/notifications");
      // "모두 읽음" 이후의 아이템만 표시
      const dismissedAt = getDismissedAt();
      let filtered: NotificationItem[] = data.items;
      if (dismissedAt > 0) {
        filtered = filtered.filter((item: NotificationItem) => new Date(item.created_at).getTime() > dismissedAt);
      }
      const msgCount = filtered.filter((i: NotificationItem) => i.type === "message").length;
      const cmtCount = filtered.filter((i: NotificationItem) => i.type === "comment").length;
      const dlCount = filtered.filter((i: NotificationItem) => i.type === "deadline").length;
      const matCount = filtered.filter((i: NotificationItem) => i.type === "new_material").length;
      const total = msgCount + cmtCount + dlCount + matCount;
      set({
        unreadMessages: msgCount,
        unresolvedComments: cmtCount,
        upcomingDeadlines: dlCount,
        newMaterials: matCount,
        total,
        items: filtered,
        loading: false,
        markedRead: false,
        totalUnreadMessages: msgCount,
      });
    } catch {
      set({ loading: false });
    }
  },

  fetchTotalUnread: async () => {
    try {
      const { data } = await api.get("/messenger/total-unread");
      set({ totalUnreadMessages: data.count || 0 });
    } catch {
      // silent
    }
  },

  fetchMessengerCourse: async () => {
    try {
      const { data } = await api.get("/messenger/recent-course");
      set({ messengerCourseId: data.course_id || null });
    } catch {
      // silent
    }
  },

  markRead: async () => {
    if (get().markedRead) return;
    set({ markedRead: true });
    try {
      await api.post("/notifications/mark-read");
      const s = get();
      const remainingTotal = s.upcomingDeadlines + s.newMaterials;
      set({
        unreadMessages: 0,
        unresolvedComments: 0,
        total: remainingTotal,
        totalUnreadMessages: 0,
      });
    } catch {
      // silent
    }
  },

  clearAll: async () => {
    try {
      await api.post("/notifications/mark-read");
      setDismissedAt();
      set({
        unreadMessages: 0,
        unresolvedComments: 0,
        upcomingDeadlines: 0,
        newMaterials: 0,
        total: 0,
        items: [],
        markedRead: true,
        totalUnreadMessages: 0,
      });
    } catch {
      // silent
    }
  },

  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
