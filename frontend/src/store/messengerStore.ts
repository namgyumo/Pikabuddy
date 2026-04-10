import { create } from "zustand";
import api from "../lib/api";
import type { ConversationItem, Message } from "../types";

interface MessengerState {
  conversations: ConversationItem[];
  messages: Message[];
  loading: boolean;
  sending: boolean;
  activePartnerId: string | null;
  activeCourseId: string | null;
  unreadCount: number;

  fetchConversations: (courseId: string) => Promise<void>;
  fetchMessages: (courseId: string, partnerId: string) => Promise<void>;
  sendMessage: (courseId: string, partnerId: string, content: string) => Promise<void>;
  fetchUnreadCount: (courseId: string) => Promise<void>;
  pollMessages: (courseId: string, partnerId: string) => Promise<void>;
  setActive: (courseId: string, partnerId: string | null) => void;
  reset: () => void;
}

export const useMessengerStore = create<MessengerState>((set, get) => ({
  conversations: [],
  messages: [],
  loading: false,
  sending: false,
  activePartnerId: null,
  activeCourseId: null,
  unreadCount: 0,

  fetchConversations: async (courseId) => {
    set({ loading: true });
    try {
      const { data } = await api.get(`/courses/${courseId}/messenger/conversations`);
      set({ conversations: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchMessages: async (courseId, partnerId) => {
    set({ loading: true });
    try {
      const { data } = await api.get(`/courses/${courseId}/messenger/${partnerId}`);
      set({ messages: data, loading: false, activePartnerId: partnerId, activeCourseId: courseId });
    } catch {
      set({ loading: false });
    }
  },

  sendMessage: async (courseId, partnerId, content) => {
    set({ sending: true });
    try {
      const { data } = await api.post(`/courses/${courseId}/messenger/${partnerId}`, { content });
      set((s) => ({ messages: [...s.messages, data], sending: false }));
      // 대화 목록도 갱신
      get().fetchConversations(courseId);
    } catch {
      set({ sending: false });
    }
  },

  fetchUnreadCount: async (courseId) => {
    try {
      const { data } = await api.get(`/courses/${courseId}/messenger/unread-count`);
      set({ unreadCount: data.count || 0 });
    } catch {
      // silent
    }
  },

  pollMessages: async (courseId, partnerId) => {
    // 현재 활성 대화만 폴링
    const state = get();
    if (state.activeCourseId !== courseId || state.activePartnerId !== partnerId) return;
    try {
      const { data } = await api.get(`/courses/${courseId}/messenger/${partnerId}`);
      set({ messages: data });
    } catch {
      // silent
    }
  },

  setActive: (courseId, partnerId) => {
    set({ activeCourseId: courseId, activePartnerId: partnerId });
  },

  reset: () => {
    set({
      conversations: [],
      messages: [],
      loading: false,
      sending: false,
      activePartnerId: null,
      activeCourseId: null,
      unreadCount: 0,
    });
  },
}));
