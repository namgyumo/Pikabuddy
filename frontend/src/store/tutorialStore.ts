import { create } from "zustand";

interface TutorialState {
  running: boolean;
  stepIndex: number;
  /** 이미 완료한 역할별 튜토리얼 키 */
  completed: Set<string>;
  start: () => void;
  stop: () => void;
  setStepIndex: (i: number) => void;
  markCompleted: (key: string) => void;
  isCompleted: (key: string) => boolean;
  resetAll: () => void;
}

const STORAGE_KEY = "pikabuddy-tutorial-done";

function loadCompleted(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveCompleted(set: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

export const useTutorialStore = create<TutorialState>((set, get) => ({
  running: false,
  stepIndex: 0,
  completed: loadCompleted(),

  start: () => set({ running: true, stepIndex: 0 }),
  stop: () => set({ running: false, stepIndex: 0 }),
  setStepIndex: (i) => set({ stepIndex: i }),

  markCompleted: (key) => {
    const next = new Set(get().completed);
    next.add(key);
    saveCompleted(next);
    set({ completed: next, running: false, stepIndex: 0 });
  },

  isCompleted: (key) => get().completed.has(key),

  resetAll: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ completed: new Set(), running: false, stepIndex: 0 });
  },
}));
