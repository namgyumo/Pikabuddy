// ── Global Toast System ──
// Usage: import { toast } from "../lib/toast";
//        toast.success("저장 완료!");
//        toast.error("실패했습니다.");
//        toast.info("정보 메시지");

type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let nextId = 0;
let containerEl: HTMLDivElement | null = null;

const ICONS: Record<ToastType, string> = {
  success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
};

const COLORS: Record<ToastType, { bg: string; border: string; text: string }> = {
  success: { bg: "#f0fdf4", border: "#86efac", text: "#166534" },
  error: { bg: "#fef2f2", border: "#fca5a5", text: "#991b1b" },
  warning: { bg: "#fffbeb", border: "#fcd34d", text: "#92400e" },
  info: { bg: "#eff6ff", border: "#93c5fd", text: "#1e40af" },
};

function ensureContainer(): HTMLDivElement {
  if (containerEl && document.body.contains(containerEl)) return containerEl;
  containerEl = document.createElement("div");
  containerEl.id = "toast-container";
  Object.assign(containerEl.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: "99999",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    pointerEvents: "none",
    maxWidth: "380px",
    width: "100%",
  });
  document.body.appendChild(containerEl);
  return containerEl;
}

function showToast(item: ToastItem) {
  const container = ensureContainer();
  const colors = COLORS[item.type];

  const el = document.createElement("div");
  el.setAttribute("data-toast-id", String(item.id));
  Object.assign(el.style, {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 16px",
    borderRadius: "12px",
    background: colors.bg,
    border: `1.5px solid ${colors.border}`,
    color: colors.text,
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: `"Pretendard", "Noto Sans KR", -apple-system, sans-serif`,
    boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
    pointerEvents: "auto",
    cursor: "pointer",
    transform: "translateX(120%)",
    transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease",
    opacity: "0",
    maxWidth: "100%",
    lineHeight: "1.4",
  });

  el.innerHTML = `
    <span style="flex-shrink:0;display:flex;align-items:center">${ICONS[item.type]}</span>
    <span style="flex:1;word-break:keep-all">${item.message}</span>
  `;

  el.addEventListener("click", () => removeToast(el));
  container.appendChild(el);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.transform = "translateX(0)";
      el.style.opacity = "1";
    });
  });

  // Auto-remove
  const duration = item.type === "error" ? 4500 : 3000;
  setTimeout(() => removeToast(el), duration);
}

function removeToast(el: HTMLElement) {
  el.style.transform = "translateX(120%)";
  el.style.opacity = "0";
  setTimeout(() => el.remove(), 350);
}

function createToast(type: ToastType, message: string) {
  const item: ToastItem = { id: nextId++, message, type };
  showToast(item);
}

export const toast = {
  success: (msg: string) => createToast("success", msg),
  error: (msg: string) => createToast("error", msg),
  info: (msg: string) => createToast("info", msg),
  warning: (msg: string) => createToast("warning", msg),
};
