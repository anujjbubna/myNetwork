"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChatPersonCard } from "@/components/PersonCard";
import type { ChatMessageData } from "@/lib/types";

const SUGGESTIONS = [
  "Had coffee with Sarah today, she just got back from Japan",
  "Who haven't I talked to in a while?",
  "I feel like having ice cream - who'd be up for it?",
  "Who did I meet at Ethan's party?",
];

/* Minimal typings for the Web Speech API */
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [i: number]: { isFinal: boolean; [j: number]: { transcript: string } } };
}

function getSpeechRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | (new () => SpeechRecognitionLike)
    | undefined;
  return Ctor ? new Ctor() : null;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessageData[] | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const speechSupported = useSyncExternalStore(
    () => () => {},
    () => Boolean(getSpeechRecognition()),
    () => false,
  );
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const baseTextRef = useRef("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/chat")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setMessages(data);
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  function toggleMic() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = getSpeechRecognition();
    if (!rec) return;
    recognitionRef.current = rec;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    baseTextRef.current = input ? input.trimEnd() + " " : "";
    rec.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(baseTextRef.current + transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    setListening(true);
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    recognitionRef.current?.stop();
    setInput("");
    setSending(true);
    const optimistic: ChatMessageData = {
      id: `tmp-${crypto.randomUUID()}`,
      role: "user",
      content,
      people: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...(m ?? []), optimistic]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });
      const reply = await res.json();
      if (!res.ok) throw new Error(reply.error);
      setMessages((m) => [...(m ?? []), reply]);
    } catch {
      setMessages((m) => [
        ...(m ?? []),
        {
          id: `err-${crypto.randomUUID()}`,
          role: "assistant",
          content: "Something went wrong - please try that again.",
          people: [],
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <h1 className="text-lg font-bold">myNetwork</h1>
      </header>

      <div className="flex-1 flex flex-col gap-3 p-4 overflow-y-auto">
        {messages === null && (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 rounded-2xl bg-surface-2 animate-pulse w-2/3" />
            ))}
          </div>
        )}

        {messages !== null && messages.length === 0 && (
          <div className="flex-1 flex flex-col justify-center gap-6 py-8">
            <div className="text-center">
              <div className="text-4xl mb-3">&#128172;</div>
              <h2 className="text-xl font-semibold">Tell me about your people</h2>
              <p className="text-sm text-muted mt-1 max-w-xs mx-auto">
                Log what you did together, ask who to reconnect with, or search your
                memories.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-sm rounded-xl border border-border bg-surface px-3.5 py-2.5 hover:bg-surface-2 active:scale-[0.99] transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages?.map((m) => (
          <div key={m.id} className={m.role === "user" ? "self-end max-w-[85%]" : "self-start max-w-[92%] w-full"}>
            <div
              className={
                m.role === "user"
                  ? "rounded-2xl rounded-br-md bg-accent text-accent-fg px-3.5 py-2.5 text-[15px] whitespace-pre-wrap"
                  : "rounded-2xl rounded-bl-md bg-surface border border-border px-3.5 py-2.5 text-[15px] whitespace-pre-wrap"
              }
            >
              {m.content}
            </div>
            {m.people.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-2">
                {m.people.map((p) => (
                  <ChatPersonCard key={p.id} person={p} />
                ))}
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="self-start rounded-2xl rounded-bl-md bg-surface border border-border px-4 py-3">
            <span className="inline-flex gap-1">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-[57px] z-30 border-t border-border bg-background/95 backdrop-blur p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder={listening ? "Listening..." : "Log an interaction or ask anything"}
            className="flex-1 resize-none rounded-2xl border border-border bg-surface px-3.5 py-2.5 text-[15px] outline-none focus:border-accent max-h-32"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          {speechSupported && (
            <button
              type="button"
              onClick={toggleMic}
              aria-label={listening ? "Stop listening" : "Speak"}
              className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center border transition ${
                listening
                  ? "bg-red-500 border-red-500 text-white animate-pulse"
                  : "bg-surface border-border text-muted hover:text-foreground"
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm6-3a6 6 0 0 1-12 0m6 6v3"
                />
              </svg>
            </button>
          )}
          <button
            type="submit"
            disabled={!input.trim() || sending}
            aria-label="Send"
            className="shrink-0 w-11 h-11 rounded-full bg-accent text-accent-fg flex items-center justify-center disabled:opacity-40 active:scale-95 transition"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h13m-6-7 7 7-7 7" />
            </svg>
          </button>
        </form>
      </div>
    </main>
  );
}
