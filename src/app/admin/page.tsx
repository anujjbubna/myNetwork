"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AccountRow = {
  id: string;
  email: string | null;
  name: string | null;
  createdAt: string;
  profiles: number;
  llmCalls: number;
  estimatedSpendUsd: number;
};

type Totals = {
  accounts: number;
  profiles: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  llmCalls: number;
  estimatedSpendUsd: number;
};

type InviteRow = {
  id: string;
  code: string;
  createdAt: string;
  expiresAt: string | null;
  usedAt: string | null;
  usedByEmail: string | null;
  usedByName: string | null;
};

type Tab = "metrics" | "invites";

function formatUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(n);
}

function inviteUrl(code: string) {
  return `${window.location.origin}/login?invite=${code}`;
}

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("metrics");
  const [emailQuery, setEmailQuery] = useState("");
  const [appliedEmail, setAppliedEmail] = useState("");
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyInvite, setBusyInvite] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const loadStats = useCallback(async (email: string) => {
    setError("");
    const qs = email ? `?email=${encodeURIComponent(email)}` : "";
    const res = await fetch(`/api/admin/stats${qs}`);
    if (res.status === 401) {
      router.replace("/admin/login");
      return;
    }
    if (!res.ok) {
      setError("Could not load metrics.");
      return;
    }
    const data = await res.json();
    setAccounts(data.accounts);
    setTotals(data.totals);
  }, [router]);

  const loadInvites = useCallback(async () => {
    const res = await fetch("/api/admin/invites");
    if (res.status === 401) {
      router.replace("/admin/login");
      return;
    }
    if (!res.ok) {
      setError("Could not load invites.");
      return;
    }
    setInvites(await res.json());
  }, [router]);

  useEffect(() => {
    (async () => {
      await Promise.all([loadStats(""), loadInvites()]);
      setLoading(false);
    })();
  }, [loadStats, loadInvites]);

  async function applyFilter(e: React.FormEvent) {
    e.preventDefault();
    const q = emailQuery.trim();
    setAppliedEmail(q);
    await loadStats(q);
  }

  async function clearFilter() {
    setEmailQuery("");
    setAppliedEmail("");
    await loadStats("");
  }

  async function createInvite() {
    if (busyInvite) return;
    setBusyInvite(true);
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) await loadInvites();
    } finally {
      setBusyInvite(false);
    }
  }

  async function deleteInvite(id: string) {
    const res = await fetch(`/api/admin/invites?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) await loadInvites();
  }

  async function copyLink(code: string) {
    const message = [
      "You have been invited to use myNetwork. Here is the link :)",
      inviteUrl(code),
      "Hope you like it!",
    ].join("\n");
    await navigator.clipboard.writeText(message);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  async function signOut() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.replace("/admin/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="p-6">
        <p className="text-sm text-muted">Loading admin…</p>
      </main>
    );
  }

  return (
    <main className="p-6 pb-10 space-y-6 w-full">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
          {/* <p className="text-sm text-muted mt-1">
            Usage metrics and invites. Cost = actual API token counts × Anthropic list
            prices (incl. cache). Best per-account split on a shared key — not a Console invoice.
          </p> */}
        </div>
        <button
          type="button"
          onClick={signOut}
          className="text-sm text-muted font-medium shrink-0"
        >
          Sign out
        </button>
      </header>

      <div className="flex gap-1 p-1 rounded-xl border border-border bg-surface">
        <TabButton active={tab === "metrics"} onClick={() => setTab("metrics")}>
          Metrics
        </TabButton>
        <TabButton active={tab === "invites"} onClick={() => setTab("invites")}>
          Invites
        </TabButton>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {tab === "metrics" && (
        <section className="space-y-6">
          <form onSubmit={applyFilter} className="flex gap-2">
            <input
              type="search"
              value={emailQuery}
              onChange={(e) => setEmailQuery(e.target.value)}
              placeholder="Filter by account email"
              className="flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="rounded-xl bg-accent text-accent-fg text-sm font-semibold px-3 py-2"
            >
              Search
            </button>
            {appliedEmail && (
              <button
                type="button"
                onClick={clearFilter}
                className="rounded-xl border border-border text-sm px-3 py-2"
              >
                Clear
              </button>
            )}
          </form>

          {appliedEmail ? (
            <p className="text-xs text-muted">
              Showing accounts matching “{appliedEmail}”
            </p>
          ) : (
            <p className="text-xs text-muted">
              Default: totals across all accounts
            </p>
          )}

          {totals && (
            <div className="flex flex-col">
              <Stat label="Accounts (sum)" value={String(totals.accounts)} />
              <Stat label="Total LLM calls" value={String(totals.llmCalls)} />
              <Stat label="Total est. cost (list price)" value={formatUsd(totals.estimatedSpendUsd)} />
              <Stat label="Profiles" value={String(totals.profiles)} />
              <Stat
                label="Weekly active users"
                value={String(totals.weeklyActiveUsers ?? 0)}
              />
              <Stat
                label="Monthly active users"
                value={String(totals.monthlyActiveUsers ?? 0)}
              />
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-3">
              {appliedEmail ? "Matching accounts" : "All accounts"}
            </h2>
            {accounts.length === 0 ? (
              <p className="text-sm text-muted">No accounts found.</p>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm text-left min-w-[28rem]">
                  <thead>
                    <tr className="border-b border-border text-muted">
                      <th className="py-2 pr-3 font-medium">Email</th>
                      <th className="py-2 pr-3 font-medium text-right">Profiles</th>
                      <th className="py-2 pr-3 font-medium text-right">Calls</th>
                      <th className="py-2 font-medium text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((a) => (
                      <tr key={a.id} className="border-b border-border/60">
                        <td className="py-2.5 pr-3">
                          <div className="font-medium truncate max-w-[14rem]">
                            {a.email ?? a.name ?? a.id}
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">
                          {a.profiles}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">
                          {a.llmCalls}
                        </td>
                        <td className="py-2.5 text-right tabular-nums">
                          {formatUsd(a.estimatedSpendUsd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {tab === "invites" && (
        <section>
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Invite codes
            </h2>
            <button
              type="button"
              onClick={createInvite}
              disabled={busyInvite}
              className="rounded-lg bg-accent text-accent-fg text-sm font-semibold px-3 py-1.5 disabled:opacity-50"
            >
              {busyInvite ? "Creating…" : "New invite"}
            </button>
          </div>

          {invites.length === 0 ? (
            <p className="text-sm text-muted">
              No invites yet. Create one to share a signup link.
            </p>
          ) : (
            <ul className="space-y-3">
              {invites.map((inv) => (
                <li
                  key={inv.id}
                  className="rounded-xl border border-border bg-surface px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <code className="text-sm font-medium break-all">{inv.code}</code>
                      <p className="text-xs text-muted mt-1">
                        {inv.usedAt
                          ? `Used by ${inv.usedByEmail ?? inv.usedByName ?? "someone"}`
                          : "Unused"}
                        {" · "}
                        created {new Date(inv.createdAt).toLocaleDateString("en-US")}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!inv.usedAt && (
                        <>
                          <button
                            type="button"
                            onClick={() => copyLink(inv.code)}
                            className="text-xs font-medium text-accent"
                          >
                            {copied === inv.code ? "Copied" : "Copy invite"}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteInvite(inv.id)}
                            className="text-xs font-medium text-red-500"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
        active ? "bg-accent text-accent-fg" : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-4 mb-4 last:mb-0">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-lg font-semibold tabular-nums mt-1">{value}</div>
    </div>
  );
}
