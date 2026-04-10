import { create } from "zustand";
import api from "../lib/api";
import type { NoteComment, CommentCounts } from "../types";

interface CommentState {
  comments: NoteComment[];
  counts: CommentCounts;
  loading: boolean;
  submitting: boolean;

  fetchComments: (noteId: string) => Promise<void>;
  fetchCounts: (noteId: string) => Promise<void>;
  addComment: (noteId: string, body: { block_index?: number | null; parent_id?: string | null; content: string }) => Promise<NoteComment | null>;
  updateComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  resolveComment: (commentId: string, isResolved: boolean) => Promise<void>;
  reset: () => void;
}

const emptyCounts: CommentCounts = { block_counts: {}, total: 0, unresolved: 0 };

export const useCommentStore = create<CommentState>((set, get) => ({
  comments: [],
  counts: emptyCounts,
  loading: false,
  submitting: false,

  fetchComments: async (noteId) => {
    set({ loading: true });
    try {
      const { data } = await api.get(`/notes/${noteId}/comments`);
      set({ comments: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchCounts: async (noteId) => {
    try {
      const { data } = await api.get(`/notes/${noteId}/comment-counts`);
      set({ counts: data });
    } catch {
      // silent
    }
  },

  addComment: async (noteId, body) => {
    set({ submitting: true });
    try {
      const { data } = await api.post(`/notes/${noteId}/comments`, body);
      set((s) => ({ comments: [...s.comments, data], submitting: false }));
      get().fetchCounts(noteId);
      return data;
    } catch {
      set({ submitting: false });
      return null;
    }
  },

  updateComment: async (commentId, content) => {
    try {
      const { data } = await api.patch(`/comments/${commentId}`, { content });
      set((s) => ({
        comments: s.comments.map((c) => (c.id === commentId ? { ...c, ...data } : c)),
      }));
    } catch {
      // silent
    }
  },

  deleteComment: async (commentId) => {
    const comment = get().comments.find((c) => c.id === commentId);
    try {
      await api.delete(`/comments/${commentId}`);
      set((s) => ({
        comments: s.comments.filter((c) => c.id !== commentId && c.parent_id !== commentId),
      }));
      if (comment) get().fetchCounts(comment.note_id);
    } catch {
      // silent
    }
  },

  resolveComment: async (commentId, isResolved) => {
    const comment = get().comments.find((c) => c.id === commentId);
    try {
      await api.patch(`/comments/${commentId}/resolve`, { is_resolved: isResolved });
      set((s) => ({
        comments: s.comments.map((c) => (c.id === commentId ? { ...c, is_resolved: isResolved } : c)),
      }));
      if (comment) get().fetchCounts(comment.note_id);
    } catch {
      // silent
    }
  },

  reset: () => {
    set({ comments: [], counts: emptyCounts, loading: false, submitting: false });
  },
}));
