import { create } from "zustand";
import { supabase } from "../lib/supabase";
import api from "../lib/api";
import type { User } from "../types";

// Admin token stored outside Supabase session
let adminToken: string | null = null;
export function getAdminToken() { return adminToken; }

interface AuthState {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  adminLogin: (username: string, password: string) => Promise<void>;
  selectRole: (role: "professor" | "student") => Promise<void>;
  fetchUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  signInWithGoogle: async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth/callback" },
    });
  },

  adminLogin: async (username: string, password: string) => {
    const { data } = await api.post("/auth/admin-login", { username, password });
    // Store token for api interceptor
    adminToken = data.access_token;
    sessionStorage.setItem("admin_token", data.access_token);
    set({ user: data.user, loading: false });
  },

  selectRole: async (role) => {
    const { data } = await api.post("/auth/role", { role });
    set((state) => ({
      user: state.user ? { ...state.user, role: data.role } : null,
    }));
  },

  fetchUser: async () => {
    try {
      // Check admin token first
      const savedToken = sessionStorage.getItem("admin_token");
      if (savedToken) {
        adminToken = savedToken;
        const { data } = await api.get("/auth/me");
        set({ user: data, loading: false });
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        set({ user: null, loading: false });
        return;
      }

      await api.post("/auth/callback", {
        access_token: session.access_token,
      });
      const { data } = await api.get("/auth/me");
      set({ user: data, loading: false });
    } catch {
      adminToken = null;
      sessionStorage.removeItem("admin_token");
      set({ user: null, loading: false });
    }
  },

  signOut: async () => {
    adminToken = null;
    sessionStorage.removeItem("admin_token");
    await supabase.auth.signOut();
    set({ user: null });
  },
}));
