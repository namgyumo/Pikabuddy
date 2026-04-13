import axios from "axios";
import { supabase } from "./supabase";
import { getAdminToken } from "../store/authStore";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8001/api",
  headers: { "Content-Type": "application/json" },
});

// ── Session token cache ──
// supabase.auth.getSession() is async and costs ~50-200ms per call.
// Cache the token and only re-fetch when it's about to expire or missing.
let cachedToken: string | null = null;
let tokenExpiresAt = 0; // epoch ms
let pendingFetch: Promise<string | null> | null = null;

async function getSessionToken(): Promise<string | null> {
  const now = Date.now();
  // Re-use cached token if it's still valid (with 60s buffer)
  if (cachedToken && tokenExpiresAt - now > 60_000) {
    return cachedToken;
  }
  // Deduplicate concurrent calls — share a single in-flight promise
  if (pendingFetch) return pendingFetch;
  pendingFetch = (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        cachedToken = session.access_token;
        tokenExpiresAt = (session.expires_at ?? 0) * 1000;
        return cachedToken;
      }
      cachedToken = null;
      tokenExpiresAt = 0;
      return null;
    } finally {
      pendingFetch = null;
    }
  })();
  return pendingFetch;
}

// Listen for auth state changes to keep cache in sync
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.access_token) {
    cachedToken = session.access_token;
    tokenExpiresAt = (session.expires_at ?? 0) * 1000;
  } else {
    cachedToken = null;
    tokenExpiresAt = 0;
  }
});

api.interceptors.request.use(async (config) => {
  // Admin token takes priority
  const adminToken = getAdminToken() || sessionStorage.getItem("admin_token");
  if (adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
    return config;
  }

  const token = await getSessionToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── 로그인 만료 감지 (401/403 응답) ──
let sessionExpiredShown = false;
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error.response?.status;
    if ((status === 401 || status === 403) && !sessionExpiredShown) {
      sessionExpiredShown = true;
      // Clear cache
      cachedToken = null;
      tokenExpiresAt = 0;
      // Try to refresh session
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          // Session truly expired — notify user (once)
          window.dispatchEvent(new CustomEvent("session-expired"));
        } else {
          // Session refreshed successfully — retry silently
          sessionExpiredShown = false;
          cachedToken = session.access_token;
          tokenExpiresAt = (session.expires_at ?? 0) * 1000;
          error.config.headers.Authorization = `Bearer ${session.access_token}`;
          return api(error.config);
        }
      } catch {
        window.dispatchEvent(new CustomEvent("session-expired"));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
