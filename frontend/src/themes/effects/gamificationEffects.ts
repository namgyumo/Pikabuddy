/* ── Gamification Effects (12) — Event-triggered educational effects ── */

import type { ThemeEffect } from "./types";
import { injectEffectStyle, removeEffectStyle } from "./engine";

/* ═══ 1. Confetti ═══ */
export const confettiEffect: ThemeEffect = {
  id: "confetti",
  activate() {
    // Just registers — fires on trigger()
    injectEffectStyle("confetti", `
      .pkb-confetti-piece {
        position: fixed;
        pointer-events: none;
        z-index: 100000;
        animation: pkb-confetti-fall var(--dur) ease-out forwards;
      }
      @keyframes pkb-confetti-fall {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
      }
    `);
  },
  deactivate() { removeEffectStyle("confetti"); },
  trigger() {
    const colors = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#6C5CE7", "#FD79A8", "#00CEC9", "#FDCB6E", "#E17055"];
    for (let i = 0; i < 60; i++) {
      const el = document.createElement("div");
      el.className = "pkb-confetti-piece";
      const size = Math.random() * 8 + 4;
      const shapes = ["50%", "0"];
      const dur = Math.random() * 2 + 1.5;
      el.style.cssText = `
        left:${Math.random() * 100}vw; top:-10px;
        width:${size}px; height:${size * 0.6}px;
        background:${colors[Math.random() * colors.length | 0]};
        border-radius:${shapes[Math.random() * 2 | 0]};
        --dur:${dur}s;
        animation-delay:${Math.random() * 0.5}s;
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), (dur + 0.5) * 1000);
    }
  },
};

/* ═══ 2. Streak Fire ═══ */
export const streakFireEffect: ThemeEffect = {
  id: "streakFire",
  activate() {
    injectEffectStyle("streakFire", `
      .pkb-fire-particle {
        position: fixed;
        pointer-events: none;
        z-index: 100000;
        border-radius: 50%;
        animation: pkb-fire-rise var(--dur) ease-out forwards;
      }
      @keyframes pkb-fire-rise {
        0% { transform: translateY(0) scale(1); opacity: 1; }
        100% { transform: translateY(-80px) scale(0); opacity: 0; }
      }
    `);
  },
  deactivate() { removeEffectStyle("streakFire"); },
  trigger(data?: { streak?: number }) {
    const streak = data?.streak || 3;
    const intensity = Math.min(streak * 5, 30);
    const colors = ["#FF4500", "#FF6347", "#FFD700", "#FF8C00"];

    for (let i = 0; i < intensity; i++) {
      const el = document.createElement("div");
      el.className = "pkb-fire-particle";
      const size = Math.random() * 8 + 4;
      const dur = Math.random() * 0.8 + 0.4;
      const side = Math.random() > 0.5 ? "left" : "right";
      const pos = Math.random() * 30;
      el.style.cssText = `
        ${side}:${pos}%; bottom:0;
        width:${size}px; height:${size}px;
        background:${colors[Math.random() * colors.length | 0]};
        --dur:${dur}s;
        animation-delay:${Math.random() * 0.3}s;
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), (dur + 0.3) * 1000);
    }
  },
};

/* ═══ 3. XP Gain ═══ */
export const xpGainEffect: ThemeEffect = {
  id: "xpGain",
  activate() {
    injectEffectStyle("xpGain", `
      .pkb-xp-popup {
        position: fixed;
        pointer-events: none;
        z-index: 100000;
        font-size: 20px;
        font-weight: 800;
        color: #FFD700;
        text-shadow: 0 0 10px rgba(255,215,0,0.5), 0 2px 4px rgba(0,0,0,0.3);
        animation: pkb-xp-float 1.5s ease-out forwards;
      }
      @keyframes pkb-xp-float {
        0% { transform: translateY(0) scale(0.5); opacity: 0; }
        20% { transform: translateY(-10px) scale(1.2); opacity: 1; }
        40% { transform: translateY(-20px) scale(1); }
        100% { transform: translateY(-80px); opacity: 0; }
      }
    `);
  },
  deactivate() { removeEffectStyle("xpGain"); },
  trigger(data?: { amount?: number; x?: number; y?: number }) {
    const amount = data?.amount || 50;
    const el = document.createElement("div");
    el.className = "pkb-xp-popup";
    el.textContent = `+${amount} XP`;
    el.style.left = `${data?.x || window.innerWidth / 2}px`;
    el.style.top = `${data?.y || window.innerHeight / 2}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  },
};

/* ═══ 4. Level Up Celebration ═══ */
export const levelUpCelebrationEffect: ThemeEffect = {
  id: "levelUpCelebration",
  activate() {
    injectEffectStyle("levelUpCelebration", `
      .pkb-levelup-overlay {
        position: fixed;
        inset: 0;
        z-index: 100001;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,0.6);
        animation: pkb-levelup-bg 2s ease forwards;
        pointer-events: none;
      }
      .pkb-levelup-text {
        font-size: 48px;
        font-weight: 900;
        color: #FFD700;
        text-shadow: 0 0 30px rgba(255,215,0,0.8), 0 0 60px rgba(255,215,0,0.4);
        animation: pkb-levelup-pop 2s ease forwards;
      }
      @keyframes pkb-levelup-bg {
        0% { opacity: 0; }
        20% { opacity: 1; }
        80% { opacity: 1; }
        100% { opacity: 0; }
      }
      @keyframes pkb-levelup-pop {
        0% { transform: scale(0) rotate(-10deg); opacity: 0; }
        30% { transform: scale(1.3) rotate(3deg); opacity: 1; }
        50% { transform: scale(1) rotate(0); }
        80% { transform: scale(1); opacity: 1; }
        100% { transform: scale(1.5); opacity: 0; }
      }
    `);
  },
  deactivate() { removeEffectStyle("levelUpCelebration"); },
  trigger(data?: { level?: number }) {
    const level = data?.level || "UP";
    const overlay = document.createElement("div");
    overlay.className = "pkb-levelup-overlay";
    overlay.innerHTML = `<div class="pkb-levelup-text">LEVEL ${level}!</div>`;
    document.body.appendChild(overlay);

    // Also fire confetti
    confettiEffect.trigger?.();

    setTimeout(() => overlay.remove(), 2200);
  },
};

/* ═══ 5. Timer Pulse ═══ */
export const timerPulseEffect: ThemeEffect = {
  id: "timerPulse",
  activate() {
    injectEffectStyle("timerPulse", `
      .pkb-timer-urgent, .timer-urgent, [data-urgent="true"] {
        color: #ef4444 !important;
        animation: pkb-timer-pulse 0.5s ease-in-out infinite !important;
      }
      @keyframes pkb-timer-pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.15); opacity: 0.7; }
      }
    `);
  },
  deactivate() { removeEffectStyle("timerPulse"); },
  trigger() {
    // Flash screen border red briefly
    const flash = document.createElement("div");
    flash.style.cssText = `
      position:fixed;inset:0;z-index:99999;pointer-events:none;
      border:3px solid #ef4444;animation:pkb-timer-flash 1s ease forwards;
    `;
    injectEffectStyle("timerPulse-flash", `
      @keyframes pkb-timer-flash {
        0%,30%,60% { border-color: #ef4444; opacity: 1; }
        15%,45%,100% { border-color: transparent; opacity: 0; }
      }
    `);
    document.body.appendChild(flash);
    setTimeout(() => { flash.remove(); removeEffectStyle("timerPulse-flash"); }, 1000);
  },
};

/* ═══ 6. Wrong Shake ═══ */
export const wrongShakeEffect: ThemeEffect = {
  id: "wrongShake",
  activate() {
    injectEffectStyle("wrongShake", `
      @keyframes pkb-shake {
        0%, 100% { transform: translateX(0); }
        10%, 50%, 90% { transform: translateX(-6px); }
        30%, 70% { transform: translateX(6px); }
      }
      .pkb-shaking {
        animation: pkb-shake 0.5s ease !important;
        border-color: #ef4444 !important;
      }
    `);
  },
  deactivate() { removeEffectStyle("wrongShake"); },
  trigger(data?: { target?: string }) {
    const selector = data?.target || "main, [role='main']";
    document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      el.classList.add("pkb-shaking");
      setTimeout(() => el.classList.remove("pkb-shaking"), 500);
    });
  },
};

/* ═══ 7. Correct Bounce ═══ */
export const correctBounceEffect: ThemeEffect = {
  id: "correctBounce",
  activate() {
    injectEffectStyle("correctBounce", `
      @keyframes pkb-bounce {
        0%, 100% { transform: translateY(0); }
        30% { transform: translateY(-15px); }
        50% { transform: translateY(-5px); }
        70% { transform: translateY(-8px); }
      }
      .pkb-bouncing {
        animation: pkb-bounce 0.6s ease !important;
      }
    `);
  },
  deactivate() { removeEffectStyle("correctBounce"); },
  trigger(data?: { target?: string }) {
    const selector = data?.target || ".card, [class*='card']";
    const el = document.querySelector<HTMLElement>(selector);
    if (el) {
      el.classList.add("pkb-bouncing");
      setTimeout(() => el.classList.remove("pkb-bouncing"), 600);
    }
  },
};

/* ═══ 8. Combo Counter ═══ */
export const comboCounterEffect: ThemeEffect = {
  id: "comboCounter",
  activate() {
    injectEffectStyle("comboCounter", `
      .pkb-combo {
        position: fixed;
        top: 15%;
        right: 5%;
        z-index: 100000;
        pointer-events: none;
        font-size: 36px;
        font-weight: 900;
        animation: pkb-combo-pop 1.5s ease forwards;
      }
      @keyframes pkb-combo-pop {
        0% { transform: scale(0.3) rotate(-5deg); opacity: 0; }
        20% { transform: scale(1.4) rotate(3deg); opacity: 1; }
        40% { transform: scale(1) rotate(0); }
        80% { opacity: 1; }
        100% { transform: translateY(-30px); opacity: 0; }
      }
    `);
  },
  deactivate() { removeEffectStyle("comboCounter"); },
  trigger(data?: { count?: number }) {
    const count = data?.count || 3;
    const colors = ["#FFD700", "#FF6347", "#FF4500", "#FF1493", "#9400D3"];
    const color = colors[Math.min(count - 1, colors.length - 1)];
    const el = document.createElement("div");
    el.className = "pkb-combo";
    el.style.color = color;
    el.style.textShadow = `0 0 20px ${color}80, 0 4px 8px rgba(0,0,0,0.3)`;
    el.textContent = `COMBO x${count}!`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  },
};

/* ═══ 9. Badge Unlock ═══ */
export const badgeUnlockEffect: ThemeEffect = {
  id: "badgeUnlock",
  activate() {
    injectEffectStyle("badgeUnlock", `
      .pkb-badge-unlock-overlay {
        position: fixed;
        inset: 0;
        z-index: 100001;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        background: rgba(0,0,0,0.5);
        animation: pkb-badge-bg 2.5s ease forwards;
        pointer-events: none;
      }
      .pkb-badge-icon {
        font-size: 64px;
        animation: pkb-badge-spin 2.5s ease forwards;
      }
      .pkb-badge-label {
        font-size: 18px;
        font-weight: 700;
        color: #FFD700;
        text-shadow: 0 0 10px rgba(255,215,0,0.6);
        animation: pkb-badge-text 2.5s ease forwards;
      }
      @keyframes pkb-badge-bg {
        0% { opacity: 0; } 15% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; }
      }
      @keyframes pkb-badge-spin {
        0% { transform: scale(0) rotate(-180deg); opacity: 0; }
        25% { transform: scale(1.3) rotate(10deg); opacity: 1; }
        40% { transform: scale(1) rotate(0); }
        60% { transform: scale(1); filter: brightness(1); }
        65% { filter: brightness(2); }
        70% { filter: brightness(1); }
        100% { transform: scale(1.2); opacity: 0; }
      }
      @keyframes pkb-badge-text {
        0%, 20% { opacity: 0; transform: translateY(10px); }
        35% { opacity: 1; transform: translateY(0); }
        80% { opacity: 1; }
        100% { opacity: 0; }
      }
    `);
  },
  deactivate() { removeEffectStyle("badgeUnlock"); },
  trigger(data?: { icon?: string; name?: string }) {
    const icon = data?.icon || "🏅";
    const name = data?.name || "새 뱃지 획득!";
    const overlay = document.createElement("div");
    overlay.className = "pkb-badge-unlock-overlay";
    overlay.innerHTML = `<div class="pkb-badge-icon">${icon}</div><div class="pkb-badge-label">${name}</div>`;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 2700);
  },
};

/* ═══ 10. Rank Up Animation ═══ */
export const rankUpAnimationEffect: ThemeEffect = {
  id: "rankUpAnimation",
  activate() {
    injectEffectStyle("rankUpAnimation", `
      .pkb-rankup-overlay {
        position: fixed;
        inset: 0;
        z-index: 100001;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,0.7);
        animation: pkb-rankup-bg 3s ease forwards;
        pointer-events: none;
      }
      .pkb-rankup-old {
        font-size: 48px;
        animation: pkb-rankup-shatter 3s ease forwards;
      }
      .pkb-rankup-new {
        font-size: 64px;
        position: absolute;
        animation: pkb-rankup-appear 3s ease forwards;
      }
      .pkb-rankup-label {
        font-size: 16px;
        font-weight: 700;
        color: #FFD700;
        margin-top: 80px;
        animation: pkb-rankup-text 3s ease forwards;
      }
      @keyframes pkb-rankup-bg {
        0% { opacity:0; } 10% { opacity:1; } 85% { opacity:1; } 100% { opacity:0; }
      }
      @keyframes pkb-rankup-shatter {
        0%, 30% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.5) rotate(15deg); opacity: 0; }
        100% { opacity: 0; }
      }
      @keyframes pkb-rankup-appear {
        0%, 45% { transform: scale(0); opacity: 0; }
        60% { transform: scale(1.3); opacity: 1; }
        70% { transform: scale(1); }
        85% { opacity: 1; }
        100% { transform: scale(1.2); opacity: 0; }
      }
      @keyframes pkb-rankup-text {
        0%, 55% { opacity: 0; } 65% { opacity: 1; } 85% { opacity: 1; } 100% { opacity: 0; }
      }
    `);
  },
  deactivate() { removeEffectStyle("rankUpAnimation"); },
  trigger(data?: { from?: string; to?: string }) {
    const from = data?.from || "🥈";
    const to = data?.to || "🥇";
    const overlay = document.createElement("div");
    overlay.className = "pkb-rankup-overlay";
    overlay.innerHTML = `
      <div class="pkb-rankup-old">${from}</div>
      <div class="pkb-rankup-new">${to}</div>
      <div class="pkb-rankup-label">RANK UP!</div>
    `;
    document.body.appendChild(overlay);
    confettiEffect.trigger?.();
    setTimeout(() => overlay.remove(), 3200);
  },
};

/* ═══ 11. Daily Reward ═══ */
export const dailyRewardEffect: ThemeEffect = {
  id: "dailyReward",
  activate() {
    injectEffectStyle("dailyReward", `
      .pkb-reward-overlay {
        position: fixed;
        inset: 0;
        z-index: 100001;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        background: rgba(0,0,0,0.5);
        animation: pkb-reward-bg 3s ease forwards;
        pointer-events: none;
      }
      .pkb-reward-box {
        font-size: 72px;
        animation: pkb-reward-shake 3s ease forwards;
      }
      .pkb-reward-item {
        font-size: 48px;
        position: absolute;
        animation: pkb-reward-reveal 3s ease forwards;
      }
      .pkb-reward-label {
        font-size: 16px;
        font-weight: 700;
        color: #FFD700;
        animation: pkb-reward-text 3s ease forwards;
      }
      @keyframes pkb-reward-bg {
        0% { opacity:0; } 10% { opacity:1; } 85% { opacity:1; } 100% { opacity:0; }
      }
      @keyframes pkb-reward-shake {
        0%, 10% { transform: scale(1); }
        15% { transform: rotate(-5deg) scale(1.05); }
        20% { transform: rotate(5deg) scale(1.05); }
        25% { transform: rotate(-5deg) scale(1.1); }
        30% { transform: rotate(5deg) scale(1.1); }
        35% { transform: scale(1.3); opacity: 1; }
        45% { transform: scale(0); opacity: 0; }
        100% { opacity: 0; }
      }
      @keyframes pkb-reward-reveal {
        0%, 40% { transform: scale(0); opacity: 0; }
        55% { transform: scale(1.3); opacity: 1; }
        65% { transform: scale(1); }
        85% { opacity: 1; }
        100% { opacity: 0; transform: translateY(-20px); }
      }
      @keyframes pkb-reward-text {
        0%, 50% { opacity: 0; } 60% { opacity: 1; } 85% { opacity: 1; } 100% { opacity: 0; }
      }
    `);
  },
  deactivate() { removeEffectStyle("dailyReward"); },
  trigger(data?: { reward?: string }) {
    const reward = data?.reward || "⭐";
    const overlay = document.createElement("div");
    overlay.className = "pkb-reward-overlay";
    overlay.innerHTML = `
      <div class="pkb-reward-box">🎁</div>
      <div class="pkb-reward-item">${reward}</div>
      <div class="pkb-reward-label">일일 보상!</div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 3200);
  },
};

/* ═══ 12. Leaderboard Shift ═══ */
export const leaderboardShiftEffect: ThemeEffect = {
  id: "leaderboardShift",
  activate() {
    injectEffectStyle("leaderboardShift", `
      .pkb-lb-shift-up {
        animation: pkb-lb-up 0.6s ease !important;
        background: rgba(16, 185, 129, 0.1) !important;
      }
      .pkb-lb-shift-down {
        animation: pkb-lb-down 0.6s ease !important;
        background: rgba(239, 68, 68, 0.1) !important;
      }
      @keyframes pkb-lb-up {
        0% { transform: translateY(40px); opacity: 0; }
        100% { transform: translateY(0); opacity: 1; }
      }
      @keyframes pkb-lb-down {
        0% { transform: translateY(-40px); opacity: 0; }
        100% { transform: translateY(0); opacity: 1; }
      }
    `);
  },
  deactivate() { removeEffectStyle("leaderboardShift"); },
  trigger(data?: { selector?: string; direction?: "up" | "down" }) {
    const selector = data?.selector || ".leaderboard-item, [class*='leaderboard'] li";
    const dir = data?.direction || "up";
    document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      el.classList.add(dir === "up" ? "pkb-lb-shift-up" : "pkb-lb-shift-down");
      setTimeout(() => el.classList.remove("pkb-lb-shift-up", "pkb-lb-shift-down"), 600);
    });
  },
};

export const gamificationEffects = [
  confettiEffect, streakFireEffect, xpGainEffect,
  levelUpCelebrationEffect, timerPulseEffect,
  wrongShakeEffect, correctBounceEffect, comboCounterEffect,
  badgeUnlockEffect, rankUpAnimationEffect,
  dailyRewardEffect, leaderboardShiftEffect,
];
