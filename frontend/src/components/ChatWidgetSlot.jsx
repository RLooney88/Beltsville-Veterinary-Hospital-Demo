import React, { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, PawPrint, CheckCircle2 } from "lucide-react";
import { useSmartSite } from "../context/SmartSiteContext";
import { contact, practice } from "../site/siteConfig";

const API = process.env.REACT_APP_BACKEND_URL || "";

const QUICK_PROMPTS = [
  "What are your hours?",
  "Book an appointment",
  "My rabbit won't eat",
];

// Typewriter: animates `text` character by character into state.
function useTypewriter(text, speedMs = 14) {
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setShown("");
    setDone(false);
    if (!text) { setDone(true); return; }
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, speedMs);
    return () => clearInterval(id);
  }, [text, speedMs]);
  return { shown, done };
}

function AssistantMessage({ content, isBookingConfirm, animate }) {
  const { shown, done } = useTypewriter(animate ? content : "", 14);
  const display = animate ? shown : content;
  return (
    <div
      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
        isBookingConfirm
          ? "bg-clinic-sage/60 text-clinic-forest rounded-bl-md border border-clinic-forest/20"
          : "bg-sand-100 text-clinic-navy rounded-bl-md"
      }`}
    >
      {isBookingConfirm && (
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] font-bold text-clinic-forest/80 mb-1">
          <CheckCircle2 className="h-3 w-3" /> Appointment booked
        </div>
      )}
      {display}
      {animate && !done && (
        <span className="inline-block w-[2px] h-[0.9em] align-[-0.1em] ml-0.5 bg-clinic-navy/60 animate-pulse" />
      )}
    </div>
  );
}

export default function ChatWidgetSlot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const { sessionToken, track, clearNonce } = useSmartSite();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // When the visitor clears intent (footer "Clear"), reset the conversation so
  // the demo starts from a clean slate and no stale chat re-applies intent.
  const firstClear = useRef(true);
  useEffect(() => {
    if (firstClear.current) {
      firstClear.current = false;
      return;
    }
    setMessages([]);
    setInput("");
  }, [clearNonce]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setLoading(true);
    track({ signalType: "chat_intent", label: `chat:${trimmed.slice(0, 60)}`, strength: 1 });
    try {
      const res = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_token: sessionToken || "anon", message: trimmed }),
      });
      const data = await res.json();
      const reply = data.reply || "";
      const isBooking = reply.includes("Booking received");
      setMessages((prev) => [...prev, { role: "assistant", content: reply, isBookingConfirm: isBooking, animate: true }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `Something went wrong. Please call us at ${contact.phone}.`,
        animate: true,
      }]);
    }
    setLoading(false);
  }, [loading, sessionToken, track]);

  const onSubmit = (e) => {
    e.preventDefault();
    const text = input;
    setInput("");
    sendMessage(text);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 h-14 w-14 rounded-full bg-clinic-red hover:bg-clinic-red-hover text-white shadow-xl shadow-clinic-red/30 grid place-items-center transition-transform hover:scale-105"
        data-testid="chat-widget-trigger"
        aria-label="Open chat"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-40 w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-sand-300/60 flex flex-col overflow-hidden"
      style={{ height: "min(560px, calc(100vh - 6rem))" }}
      data-testid="chat-widget"
    >
      {/* Header */}
      <div className="bg-clinic-navy text-sand-50 px-5 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-clinic-red grid place-items-center">
            <PawPrint className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="font-display font-bold text-sm">{practice.shortName}</div>
            <div className="text-[11px] text-sand-100/70">Ask us anything or book a visit</div>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
          data-testid="chat-widget-close"
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" data-testid="chat-messages">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="h-12 w-12 rounded-full bg-clinic-peach grid place-items-center mx-auto mb-3">
              <PawPrint className="h-5 w-5 text-clinic-red" />
            </div>
            <div className="font-display font-bold text-clinic-navy text-sm">How can we help?</div>
            <p className="text-xs text-clinic-mist mt-1.5 max-w-[240px] mx-auto">
              Ask about our services, hours, urgent signs, or book an appointment right here.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-xs bg-clinic-sage/50 text-clinic-forest rounded-full px-3 py-1.5 hover:bg-clinic-sage transition-colors"
                  data-testid={`chat-quick-${q.slice(0, 10)}`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            data-testid={`chat-msg-${i}`}
          >
            {m.role === "user" ? (
              <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed bg-clinic-red text-white rounded-br-md whitespace-pre-wrap">
                {m.content}
              </div>
            ) : (
              <AssistantMessage
                content={m.content}
                isBookingConfirm={m.isBookingConfirm}
                animate={m.animate}
              />
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start" data-testid="chat-typing">
            <div className="bg-sand-100 rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5">
              <span className="h-2 w-2 rounded-full bg-clinic-mist/60 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-2 w-2 rounded-full bg-clinic-mist/60 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-2 w-2 rounded-full bg-clinic-mist/60 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t border-sand-300/60 px-3 py-3 shrink-0">
        <form onSubmit={onSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a question or say 'book a visit'..."
            className="flex-1 bg-sand-100 rounded-full px-4 py-2.5 text-sm text-clinic-navy placeholder:text-clinic-mist/60 outline-none focus:ring-2 focus:ring-clinic-red/30"
            data-testid="chat-input"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="h-10 w-10 rounded-full bg-clinic-red hover:bg-clinic-red-hover disabled:opacity-40 disabled:hover:bg-clinic-red text-white grid place-items-center transition-colors"
            data-testid="chat-send"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}


