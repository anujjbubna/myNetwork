"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CarouselPersonCard } from "@/components/PersonCard";
import { timeAgo } from "@/components/badges";
import type { DashboardData } from "@/lib/types";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function snooze(personId: string) {
    setData((d) =>
      d ? { ...d, reconnectPeople: d.reconnectPeople.filter((p) => p.id !== personId) } : d,
    );
    await fetch(`/api/people/${personId}/snooze`, { method: "POST" });
    const res = await fetch("/api/dashboard");
    if (res.ok) setData(await res.json());
  }

  async function dismissNudge(id: string) {
    setData((d) => (d ? { ...d, nudges: d.nudges.filter((n) => n.id !== id) } : d));
    await fetch(`/api/nudges/${id}/dismiss`, { method: "POST" });
  }

  return (
    <main className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-6 p-4 pb-8">
      <header className="pt-2">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {data && (
          <p className="text-sm text-muted mt-0.5">
            {data.totalPeople} {data.totalPeople === 1 ? "person" : "people"} in your network
          </p>
        )}
      </header>

      {error && (
        <p className="text-sm text-red-500">Couldn&apos;t load the dashboard. Pull to refresh.</p>
      )}

      {!data && !error && (
        <div className="flex flex-col gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-surface-2 animate-pulse" />
          ))}
        </div>
      )}

      {data && data.totalPeople === 0 && (
        <div className="rounded-2xl border border-border bg-surface p-6 text-center">
          <div className="text-3xl mb-2">&#127793;</div>
          <p className="font-medium">Your network is empty</p>
          <p className="text-sm text-muted mt-1">
            Head to the chat and tell me about someone - &quot;Met Sarah at Ethan&apos;s party,
            she&apos;s a designer&quot; - and I&apos;ll take it from there.
          </p>
          <Link
            href="/"
            className="inline-block mt-4 rounded-xl bg-accent text-accent-fg text-sm font-semibold px-4 py-2"
          >
            Open chat
          </Link>
        </div>
      )}

      {data && data.nudges.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">
            Nudges
          </h2>
          <div className="flex flex-col gap-2">
            {data.nudges.map((n) => (
              <div
                key={n.id}
                className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-3"
              >
                <span className="text-lg leading-none mt-0.5">&#10024;</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{n.text}</p>
                  {n.personId && (
                    <Link
                      href={`/people/${n.personId}`}
                      className="text-xs font-medium text-accent mt-1 inline-block"
                    >
                      View {n.personName ?? "profile"} &rarr;
                    </Link>
                  )}
                </div>
                <button
                  onClick={() => dismissNudge(n.id)}
                  aria-label="Dismiss nudge"
                  className="text-muted hover:text-foreground p-1 -m-1"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {data && data.topPeople.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">
            Most interacted
          </h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4">
            {data.topPeople.map((p) => (
              <CarouselPersonCard
                key={p.id}
                person={p}
                footer={
                  p.interactionCount
                    ? `${p.interactionCount} in 6mo`
                    : undefined
                }
              />
            ))}
          </div>
        </section>
      )}

      {data && data.reconnectPeople.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">
            Time to reconnect
          </h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4">
            {data.reconnectPeople.map((p) => (
              <CarouselPersonCard
                key={p.id}
                person={p}
                footer={`last ${timeAgo(p.lastInteractedAt)}`}
                onSnooze={() => snooze(p.id)}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
