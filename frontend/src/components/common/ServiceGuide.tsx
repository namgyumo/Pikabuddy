import { useState, useRef, useEffect } from "react";
import api from "../../lib/api";
import { renderMarkdown } from "../../lib/markdown";

export default function ServiceGuide() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // Don't close if clicking the toggle button
        const btn = (e.target as HTMLElement).closest(".guide-toggle-btn");
        if (!btn) setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);
    try {
      const { data } = await api.post("/agents/guide", { message: q });
      setMessages((prev) => [...prev, { role: "ai", text: data.answer }]);
    } catch {
      setMessages((prev) => [...prev, { role: "ai", text: "응답 중 오류가 발생했습니다." }]);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    try { await api.delete("/agents/guide/history"); } catch { /* */ }
    setMessages([]);
  };

  return (
    <>
      {/* Toggle button */}
      <button
        className="guide-toggle-btn"
        onClick={() => setOpen((v) => !v)}
        title="PikaBuddy 가이드"
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 34,
          height: 34,
          borderRadius: 10,
          border: "none",
          cursor: "pointer",
          background: open ? "var(--primary, #4C97FF)" : "var(--surface-container, #f0f0f0)",
          color: open ? "#fff" : "var(--on-surface-variant, #64748b)",
          transition: "all 0.2s",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a8 8 0 0 1 8 8c0 3.5-2 5-3.5 6.5C15 18 15 19.5 15 21H9c0-1.5 0-3-1.5-4.5C6 15 4 13.5 4 10a8 8 0 0 1 8-8z" />
          <line x1="9" y1="21" x2="15" y2="21" />
          <line x1="10" y1="24" x2="14" y2="24" />
        </svg>
        {/* Subtle sparkle dot */}
        <span style={{
          position: "absolute", top: 4, right: 4, width: 6, height: 6,
          borderRadius: "50%", background: "#FBBF24",
          boxShadow: "0 0 4px rgba(251,191,36,0.6)",
        }} />
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          className="guide-panel"
          style={{
            position: "fixed",
            top: 56,
            right: 16,
            width: 380,
            maxHeight: "calc(100vh - 72px)",
            background: "var(--surface, #fff)",
            borderRadius: 16,
            boxShadow: "0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)",
            display: "flex",
            flexDirection: "column",
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--outline-variant, #e5e7eb)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 28, height: 28, borderRadius: 8,
                background: "linear-gradient(135deg, #4C97FF, #7C3AED)",
                color: "#fff", fontSize: 13, fontWeight: 700,
              }}>AI</span>
              <span style={{ fontWeight: 700, fontSize: 14, color: "var(--on-surface, #1f2937)" }}>
                PikaBuddy 가이드
              </span>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {messages.length > 0 && (
                <button
                  onClick={clearHistory}
                  title="대화 초기화"
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--on-surface-variant, #9ca3af)", fontSize: 16,
                    padding: "2px 6px", borderRadius: 6,
                  }}
                >↺</button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--on-surface-variant, #9ca3af)", fontSize: 18,
                  padding: "2px 6px", borderRadius: 6,
                }}
              >&times;</button>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "12px 16px",
            display: "flex", flexDirection: "column", gap: 10,
            minHeight: 200, maxHeight: "calc(100vh - 200px)",
          }}>
            {messages.length === 0 && !loading && (
              <div style={{
                textAlign: "center", padding: "32px 16px",
                color: "var(--on-surface-variant, #9ca3af)",
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, margin: "0 auto 12px",
                  background: "linear-gradient(135deg, #4C97FF22, #7C3AED22)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22,
                }}>?</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: "var(--on-surface, #374151)" }}>
                  무엇이든 물어보세요!
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                  과제 제출 방법, 노트 사용법, 티어 시스템 등<br />
                  PikaBuddy 사용법을 안내해 드려요.
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 16 }}>
                  {["과제 제출 방법 알려줘", "티어는 어떻게 올려?", "노트에서 표 삽입하는 법", "코드 에디터 사용법 알려줘"].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); }}
                      style={{
                        padding: "6px 12px", borderRadius: 99, border: "1px solid var(--outline-variant, #e5e7eb)",
                        background: "var(--surface-container, #f9fafb)", cursor: "pointer",
                        fontSize: 12, color: "var(--on-surface, #374151)",
                        transition: "background 0.15s",
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = "var(--surface-container-high, #f3f4f6)")}
                      onMouseOut={(e) => (e.currentTarget.style.background = "var(--surface-container, #f9fafb)")}
                    >{q}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
              }}>
                <div style={{
                  maxWidth: "85%",
                  padding: "10px 14px",
                  borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: msg.role === "user"
                    ? "var(--primary, #4C97FF)"
                    : "var(--surface-container, #f3f4f6)",
                  color: msg.role === "user" ? "#fff" : "var(--on-surface, #1f2937)",
                  fontSize: 13,
                  lineHeight: 1.6,
                  wordBreak: "break-word",
                }}>
                  {msg.role === "ai" ? (
                    <div className="rendered-markdown" style={{ fontSize: 13 }}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }} />
                  ) : msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                <div style={{
                  padding: "10px 14px", borderRadius: "14px 14px 14px 4px",
                  background: "var(--surface-container, #f3f4f6)",
                  fontSize: 13, color: "var(--on-surface-variant, #9ca3af)",
                }}>
                  <span className="chat-dots" style={{ display: "inline-flex", gap: 3 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", animation: "guide-dot 1s infinite 0s" }} />
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", animation: "guide-dot 1s infinite 0.2s" }} />
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", animation: "guide-dot 1s infinite 0.4s" }} />
                  </span>
                  <style>{`@keyframes guide-dot { 0%,60%,100% { opacity: 0.3; } 30% { opacity: 1; } }`}</style>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: "10px 12px",
            borderTop: "1px solid var(--outline-variant, #e5e7eb)",
            display: "flex",
            gap: 8,
          }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="사용법을 물어보세요..."
              disabled={loading}
              style={{
                flex: 1, padding: "9px 14px", borderRadius: 10,
                border: "1px solid var(--outline-variant, #e5e7eb)",
                background: "var(--surface-container, #f9fafb)",
                fontSize: 13, outline: "none",
                color: "var(--on-surface, #1f2937)",
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: 10, border: "none",
                background: input.trim() ? "var(--primary, #4C97FF)" : "var(--surface-container, #e5e7eb)",
                color: input.trim() ? "#fff" : "var(--on-surface-variant, #9ca3af)",
                cursor: input.trim() ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
