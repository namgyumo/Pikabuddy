// ── Custom Confirm Dialog ──
// Usage: import { customConfirm } from "../lib/confirm";
//        if (await customConfirm("삭제하시겠습니까?")) { ... }

export function customConfirm(
  message: string,
  options?: { confirmText?: string; cancelText?: string; danger?: boolean }
): Promise<boolean> {
  const { confirmText = "확인", cancelText = "취소", danger = false } = options ?? {};

  return new Promise((resolve) => {
    // Overlay
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: "100000",
      background: "rgba(0,0,0,0.45)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      opacity: "0",
      transition: "opacity 0.2s ease",
    });

    // Dialog
    const dialog = document.createElement("div");
    Object.assign(dialog.style, {
      background: "var(--surface-container-high, #fff)",
      border: "1px solid var(--outline-variant, rgba(0,0,0,0.1))",
      borderRadius: "16px",
      padding: "24px",
      maxWidth: "360px",
      width: "90%",
      boxShadow: "0 16px 48px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.1)",
      transform: "scale(0.95) translateY(8px)",
      transition: "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease",
      opacity: "0",
      fontFamily: `"Pretendard Variable", Pretendard, "Noto Sans KR", sans-serif`,
    });

    // Message
    const msg = document.createElement("p");
    Object.assign(msg.style, {
      margin: "0 0 20px 0",
      fontSize: "15px",
      fontWeight: "500",
      lineHeight: "1.5",
      color: "var(--on-surface, #1a1c23)",
      wordBreak: "keep-all",
    });
    msg.textContent = message;

    // Button row
    const btnRow = document.createElement("div");
    Object.assign(btnRow.style, {
      display: "flex",
      gap: "8px",
      justifyContent: "flex-end",
    });

    const btnBase = {
      padding: "8px 18px",
      borderRadius: "10px",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      border: "none",
      transition: "all 0.15s ease",
      fontFamily: "inherit",
    };

    // Cancel button
    const cancelBtn = document.createElement("button");
    Object.assign(cancelBtn.style, {
      ...btnBase,
      background: "var(--surface-container, #f0f0f0)",
      color: "var(--on-surface-variant, #666)",
    });
    cancelBtn.textContent = cancelText;

    // Confirm button
    const confirmBtn = document.createElement("button");
    Object.assign(confirmBtn.style, {
      ...btnBase,
      background: danger ? "var(--error, #dc2626)" : "var(--primary, #004AC6)",
      color: "#fff",
    });
    confirmBtn.textContent = confirmText;

    const close = (result: boolean) => {
      overlay.style.opacity = "0";
      dialog.style.transform = "scale(0.95) translateY(8px)";
      dialog.style.opacity = "0";
      setTimeout(() => overlay.remove(), 200);
      resolve(result);
    };

    cancelBtn.onclick = () => close(false);
    confirmBtn.onclick = () => close(true);
    overlay.onclick = (e) => { if (e.target === overlay) close(false); };

    // Key handler
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { close(false); document.removeEventListener("keydown", onKey); }
      if (e.key === "Enter") { close(true); document.removeEventListener("keydown", onKey); }
    };
    document.addEventListener("keydown", onKey);

    btnRow.append(cancelBtn, confirmBtn);
    dialog.append(msg, btnRow);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.style.opacity = "1";
        dialog.style.transform = "scale(1) translateY(0)";
        dialog.style.opacity = "1";
        confirmBtn.focus();
      });
    });
  });
}
