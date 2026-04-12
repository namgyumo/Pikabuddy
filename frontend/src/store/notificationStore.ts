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

interface NotificationState {
  unreadMessages: number;
  unresolvedComments: number;
  total: number;
  items: NotificationItem[];
  loading: boolean;
  open: boolean;
  messengerCourseId: string | null;
  totalUnreadMessages: number;

  fetchNotifications: () => Promise<void>;
  fetchTotalUnread: () => Promise<void>;
  fetchMessengerCourse: () => Promise<void>;
  markRead: () => Promise<void>;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadMessages: 0,
  unresolvedComments: 0,
  total: 0,
  items: [],
  loading: false,
  open: false,
  messengerCourseId: null,
  totalUnreadMessages: 0,

  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get("/notifications");
      set({
        unreadMessages: data.unread_messages,
        unresolvedComments: data.unresolved_comments,
        total: data.total,
        items: data.items,
        loading: false,
        totalUnreadMessages: data.unread_messages,
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
    try {
      await api.post("/notifications/mark-read");
      set({ unreadMessages: 0, unresolvedComments: 0, total: 0, items: [], totalUnreadMessages: 0 });
    } catch {
      // silent
    }
  },

  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
