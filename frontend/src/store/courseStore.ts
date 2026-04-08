import { create } from "zustand";
import api from "../lib/api";
import type { Course, Assignment } from "../types";

interface CourseState {
  courses: Course[];
  currentCourse: Course | null;
  assignments: Assignment[];
  loading: boolean;
  fetchCourses: () => Promise<void>;
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

export const useCourseStore = create<CourseState>((set) => ({
  courses: [],
  currentCourse: null,
  assignments: [],
  loading: false,

  fetchCourses: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get("/courses");
      set({ courses: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchCourse: async (id) => {
    set({ loading: true });
    try {
      const { data: course } = await api.get(`/courses/${id}`);
      const { data: assignments } = await api.get(`/courses/${id}/assignments`).catch(() => ({ data: [] }));
      set({ currentCourse: course, assignments, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createCourse: async (courseData) => {
    const { data } = await api.post("/courses", courseData);
    set((state) => ({ courses: [...state.courses, data] }));
    return data;
  },

  joinCourse: async (_courseId, inviteCode) => {
    await api.post(`/courses/join`, { invite_code: inviteCode });
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
