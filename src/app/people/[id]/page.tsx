"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { TagBadge, ClosenessDots, timeAgo } from "@/components/badges";
import { TAG_LABELS, type PersonFull, type Tag } from "@/lib/types";

export default function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [person, setPerson] = useState<PersonFull | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/people/${id}`);
      if (!res.ok) {
        if (!cancelled) setNotFound(true);
        return;
      }
      if (!cancelled) setPerson(await res.json());
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function remove() {
    if (!confirm(`Delete ${person?.fullName} and all their interactions? This can't be undone.`))
      return;
    await fetch(`/api/people/${id}`, { method: "DELETE" });
    router.replace("/dashboard");
  }

  if (notFound) {
    return (
      <main className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-muted">Person not found.</p>
        <Link href="/dashboard" className="text-accent font-medium text-sm">
          Back to dashboard
        </Link>
      </main>
    );
  }

  if (!person) {
    return (
      <main className="flex-1 min-h-0 p-4 flex flex-col gap-4">
        <div className="h-24 rounded-2xl bg-surface-2 animate-pulse mt-10" />
        <div className="h-40 rounded-2xl bg-surface-2 animate-pulse" />
      </main>
    );
  }

  return (
    <main className="flex-1 min-h-0 flex flex-col">
      <div className="shrink-0 bg-background border-b border-border px-4 pt-2 pb-4 flex flex-col gap-4">
        <header className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            aria-label="Back"
            className="p-2 -ml-2 text-muted hover:text-foreground"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setEditing(!editing)}
            className="text-sm font-medium text-accent px-2 py-1"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
        </header>

        {!editing && (
          <>
            <section className="flex items-center gap-4">
              <Avatar name={person.fullName} size="lg" />
              <div className="min-w-0">
                <h1 className="text-xl font-bold leading-tight">{person.fullName}</h1>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <TagBadge tag={person.tag} />
                  <ClosenessDots value={person.closeness} />
                </div>
                <p className="text-xs text-muted mt-1">
                  Last interaction {timeAgo(person.lastInteractedAt)}
                </p>
              </div>
            </section>

            {person.relationshipSummary && (
              <section className="rounded-2xl bg-accent-soft p-4">
                <h2 className="text-xs font-semibold text-accent uppercase tracking-wide mb-1.5">
                  Relationship
                </h2>
                <p className="text-sm leading-relaxed line-clamp-4">{person.relationshipSummary}</p>
              </section>
            )}
          </>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 pb-8">
        {editing ? (
          <EditForm
            person={person}
            onSaved={(p) => {
              setPerson(p);
              setEditing(false);
            }}
            onDelete={remove}
          />
        ) : (
          <ProfileView person={person} />
        )}
      </div>
    </main>
  );
}

function ProfileView({ person }: { person: PersonFull }) {
  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border border-border bg-surface divide-y divide-border">
        {person.whatTheyDo && <Field label="What they do" value={person.whatTheyDo} />}
        {person.howWeMet && <Field label="How we met" value={person.howWeMet} />}
        {person.location && <Field label="Location" value={person.location} />}
        {person.birthday && <Field label="Birthday" value={person.birthday} />}
        {person.links.length > 0 && (
          <div className="p-3.5">
            <div className="text-xs font-medium text-muted mb-1">Links</div>
            <div className="flex flex-col gap-1">
              {person.links.map((l) => (
                <a
                  key={l}
                  href={l.startsWith("http") ? l : `https://${l}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-accent truncate"
                >
                  {l}
                </a>
              ))}
            </div>
          </div>
        )}
        {!person.whatTheyDo &&
          !person.howWeMet &&
          !person.location &&
          !person.birthday &&
          person.links.length === 0 && (
            <p className="p-3.5 text-sm text-muted">
              No details yet - mention them in chat and I&apos;ll fill this in.
            </p>
          )}
      </section>

      {(person.likes.length > 0 || person.dislikes.length > 0) && (
        <section className="flex flex-col gap-3">
          {person.likes.length > 0 && <ChipList label="Likes" items={person.likes} />}
          {person.dislikes.length > 0 && <ChipList label="Dislikes" items={person.dislikes} />}
        </section>
      )}

      {person.highlights.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">
            Highlights
          </h2>
          <ul className="rounded-2xl border border-border bg-surface p-4 flex flex-col gap-2">
            {person.highlights.map((h, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="text-accent shrink-0">&bull;</span>
                {h}
              </li>
            ))}
          </ul>
        </section>
      )}

      {person.knows.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">
            Knows
          </h2>
          <div className="flex flex-wrap gap-2">
            {person.knows.map((k) => (
              <Link
                key={k.id}
                href={`/people/${k.id}`}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm hover:bg-surface-2"
              >
                {k.fullName}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">
          Interactions ({person.interactions.length})
        </h2>
        {person.interactions.length === 0 ? (
          <p className="text-sm text-muted">
            None yet. Tell the chat what you did together.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {person.interactions.map((i) => (
              <div key={i.id} className="rounded-2xl border border-border bg-surface p-3.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted">
                    {new Date(i.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  {i.people.length > 1 && (
                    <span className="text-[11px] text-muted">
                      with {i.people.filter((p) => p.id !== person.id).map((p) => p.fullName).join(", ")}
                    </span>
                  )}
                </div>
                <p className="text-sm">{i.summary}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3.5">
      <div className="text-xs font-medium text-muted mb-0.5">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function ChipList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">{label}</h2>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full bg-surface-2 border border-border px-2.5 py-1 text-xs"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function EditForm({
  person,
  onSaved,
  onDelete,
}: {
  person: PersonFull;
  onSaved: (p: PersonFull) => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState({
    fullName: person.fullName,
    tag: person.tag ?? "",
    closeness: person.closeness ?? 0,
    whatTheyDo: person.whatTheyDo ?? "",
    howWeMet: person.howWeMet ?? "",
    location: person.location ?? "",
    birthday: person.birthday ?? "",
    links: person.links.join("\n"),
    likes: person.likes.join(", "),
    dislikes: person.dislikes.join(", "),
    highlights: person.highlights.join("\n"),
  });
  const [saving, setSaving] = useState(false);

  const splitList = (s: string, sep: RegExp) =>
    s.split(sep).map((x) => x.trim()).filter(Boolean);

  async function save() {
    if (!form.fullName.trim() || saving) return;
    setSaving(true);
    const res = await fetch(`/api/people/${person.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: form.fullName.trim(),
        tag: form.tag || null,
        closeness: form.closeness || null,
        whatTheyDo: form.whatTheyDo.trim() || null,
        howWeMet: form.howWeMet.trim() || null,
        location: form.location.trim() || null,
        birthday: form.birthday.trim() || null,
        links: splitList(form.links, /\n/),
        likes: splitList(form.likes, /[,\n]/),
        dislikes: splitList(form.dislikes, /[,\n]/),
        highlights: splitList(form.highlights, /\n/),
      }),
    });
    setSaving(false);
    if (res.ok) onSaved(await res.json());
  }

  const inputCls =
    "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent";

  return (
    <div className="flex flex-col gap-4">
      <LabeledInput label="Full name">
        <input
          className={inputCls}
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        />
      </LabeledInput>

      <LabeledInput label="Tag">
        <div className="flex gap-1.5 flex-wrap">
          {(Object.keys(TAG_LABELS) as Tag[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setForm({ ...form, tag: form.tag === t ? "" : t })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition ${
                form.tag === t
                  ? "bg-accent text-accent-fg border-accent"
                  : "bg-surface border-border text-muted"
              }`}
            >
              {TAG_LABELS[t]}
            </button>
          ))}
        </div>
      </LabeledInput>

      <LabeledInput label={`Closeness${form.closeness ? ` (${form.closeness}/5)` : ""}`}>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setForm({ ...form, closeness: form.closeness === n ? 0 : n })}
              className={`w-10 h-10 rounded-xl border text-sm font-semibold transition ${
                form.closeness >= n
                  ? "bg-accent text-accent-fg border-accent"
                  : "bg-surface border-border text-muted"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </LabeledInput>

      <LabeledInput label="What they do">
        <input
          className={inputCls}
          value={form.whatTheyDo}
          onChange={(e) => setForm({ ...form, whatTheyDo: e.target.value })}
        />
      </LabeledInput>
      <LabeledInput label="How we met">
        <input
          className={inputCls}
          value={form.howWeMet}
          onChange={(e) => setForm({ ...form, howWeMet: e.target.value })}
        />
      </LabeledInput>
      <LabeledInput label="Location">
        <input
          className={inputCls}
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />
      </LabeledInput>
      <LabeledInput label="Birthday">
        <input
          className={inputCls}
          placeholder="e.g. March 14"
          value={form.birthday}
          onChange={(e) => setForm({ ...form, birthday: e.target.value })}
        />
      </LabeledInput>
      <LabeledInput label="Links (one per line)">
        <textarea
          className={inputCls}
          rows={2}
          value={form.links}
          onChange={(e) => setForm({ ...form, links: e.target.value })}
        />
      </LabeledInput>
      <LabeledInput label="Likes (comma-separated)">
        <textarea
          className={inputCls}
          rows={2}
          value={form.likes}
          onChange={(e) => setForm({ ...form, likes: e.target.value })}
        />
      </LabeledInput>
      <LabeledInput label="Dislikes (comma-separated)">
        <textarea
          className={inputCls}
          rows={2}
          value={form.dislikes}
          onChange={(e) => setForm({ ...form, dislikes: e.target.value })}
        />
      </LabeledInput>
      <LabeledInput label="Highlights (one per line)">
        <textarea
          className={inputCls}
          rows={4}
          value={form.highlights}
          onChange={(e) => setForm({ ...form, highlights: e.target.value })}
        />
      </LabeledInput>

      <button
        onClick={save}
        disabled={saving || !form.fullName.trim()}
        className="rounded-xl bg-accent text-accent-fg font-semibold py-3 disabled:opacity-50 active:scale-[0.98] transition"
      >
        {saving ? "Saving..." : "Save"}
      </button>
      <button onClick={onDelete} className="text-sm text-red-500 font-medium py-2">
        Delete person
      </button>
    </div>
  );
}

function LabeledInput({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-muted uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}
