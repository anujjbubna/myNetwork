"use client";

import { useCallback, useEffect, useState, useEffectEvent } from "react";
import { ChatPersonCard } from "@/components/PersonCard";
import { TAG_LABELS, type PersonCardData, type Tag } from "@/lib/types";

const TAGS: (Tag | "ALL")[] = ["ALL", "FAMILY", "FRIEND", "ACQUAINTANCE", "BUSINESS"];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [tag, setTag] = useState<Tag | "ALL">("ALL");
  const [people, setPeople] = useState<PersonCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async (q: string, selectedTag: Tag | "ALL") => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (selectedTag !== "ALL") params.set("tag", selectedTag);
      const qs = params.toString();
      const res = await fetch(`/api/people${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error();
      setPeople(await res.json());
    } catch {
      setError(true);
      setPeople([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onFiltersChange = useEffectEvent((q: string, selectedTag: Tag | "ALL") => {
    void load(q, selectedTag);
  });

  useEffect(() => {
    onFiltersChange(debouncedQuery, tag);
  }, [debouncedQuery, tag]);

  return (
    <main className="flex-1 flex flex-col gap-4 p-4 pb-8">
      <header className="pt-2">
        <h1 className="text-2xl font-bold">Search</h1>
        <p className="text-sm text-muted mt-0.5">Find people in your network</p>
      </header>

      <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-background/95 backdrop-blur space-y-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name, job, place, likes…"
          autoFocus
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-base outline-none focus:border-accent"
        />
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {TAGS.map((t) => {
            const active = tag === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTag(t)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-accent text-accent-fg"
                    : "bg-surface border border-border text-muted"
                }`}
              >
                {t === "ALL" ? "All" : TAG_LABELS[t]}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500">Couldn&apos;t load people. Try again.</p>
      )}

      {loading && people.length === 0 && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-surface-2 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && !error && people.length === 0 && (
        <div className="rounded-2xl border border-border bg-surface p-6 text-center">
          <p className="font-medium">No matches</p>
          <p className="text-sm text-muted mt-1">
            {debouncedQuery || tag !== "ALL"
              ? "Try a different name, keyword, or tag."
              : "Your network is empty — add people through chat."}
          </p>
        </div>
      )}

      {people.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted">
            {people.length} {people.length === 1 ? "person" : "people"}
            {loading ? " · updating…" : ""}
          </p>
          {people.map((person) => (
            <ChatPersonCard key={person.id} person={person} />
          ))}
        </div>
      )}
    </main>
  );
}
