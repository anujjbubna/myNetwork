"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, password }),
    });
    if (res.ok) {
      router.replace("/admin");
      router.refresh();
    } else {
      setError("Invalid id or password");
      setPassword("");
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-sm text-muted mt-1">Metrics and invites only</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3 w-full max-w-xs">
        <label className="text-sm text-muted">
          Admin id
          <input
            type="text"
            autoComplete="username"
            value={id}
            onChange={(e) => setId(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 outline-none focus:border-accent"
          />
        </label>
        <label className="text-sm text-muted">
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 outline-none focus:border-accent"
          />
        </label>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={busy || !id || !password}
          className="w-full rounded-xl bg-accent text-accent-fg font-semibold py-3 disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
