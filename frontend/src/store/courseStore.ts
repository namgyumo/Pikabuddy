import { create } from "zustand";
import api from "../lib/api";
import type { Course, Assignment } from "../types";

interface CourseState {
  courses: Course[];
  currentCourse: Course | null;
  assignments: Assignment[];
  loading: boolean;
  lastFetchedAt: number;
  fetchCourses: (force?: boolean) => Promise<void>;
  fetchCourse: (id: string) => Promise<void>;
  createCourse: (data: {
    title: string;
    description?: string;
    objectives?: string[];
  }) => Promise<Course>;
  joinCourse: (courseId: string, inviteCode: string) => Promise<void>;
  createAssignment: (
    courseId: string,
    data: {
      title: string;
      topic: string;
      difficulty?: string;
      problem_count?: number;
      ai_policy?: string;
      language?: string;
    }
  ) => Promise<Assignment>;
}

const CACHE_TTL = 30_000; // 30 seconds

export const useCourseStore = create<CourseState>((set, get) => ({
  courses: [],
  currentCourse: null,
  assignments: [],
  loading: false,
  lastFetchedAt: 0,

  fetchCourses: async (force = false) => {
    const state = get();
    // Skip if recently fetched and not forced
    if (!force && state.courses.length > 0 && Date.now() - state.lastFetchedAt < CACHE_TTL) {
      return;
    }
    // Skip if already loading
    if (state.loading) return;

    set({ loading: true });
    try {
      const { data } = await api.get("/courses");
      set({ courses: data, loading: false, lastFetchedAt: Date.now() });
    } catch {
      set({ loading: false });
    }
  },

  fetchCourse: async (id) => {
    set({ loading: true });
    try {
      const [courseRes, assignRes] = await Promise.all([
        api.get(`/courses/${id}`),
        api.get(`/courses/${id}/assignments`).catch(() => ({ data: [] })),
      ]);
      set({ currentCourse: courseRes.data, assignments: assignRes.data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createCourse: async (courseData) => {
    const { data } = await api.post("/courses", courseData);
    set((state) => ({ courses: [...state.courses, data], lastFetchedAt: Date.now() }));
    return data;
  },

  joinCourse: async (_courseId, inviteCode) => {
    await api.post(`/courses/join`, { invite_code: inviteCode });
    // Invalidate cache so next fetchCourses re-fetches
    set({ lastFetchedAt: 0 });
  },

  createAssignment: async (courseId, assignmentData) => {
    const { data } = await api.post(
      `/courses/${courseId}/assignments`,
      assignmentData
    );
    set((state) => ({ assignments: [...state.assignments, data] }));
    return data;
  },
}));
