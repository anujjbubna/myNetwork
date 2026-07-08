"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin || busy) return;
    setBusy(true);
    setError(false);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (res.ok) {
      router.replace("/");
      router.refresh();
    } else {
      setError(true);
      setPin("");
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <div className="text-4xl mb-2">&#128075;</div>
        <h1 className="text-2xl font-bold">myNetwork</h1>
        <p className="text-sm text-muted mt-1">Enter your PIN to unlock</p>
      </div>
      <form onSubmit={submit} className="flex flex-col items-center gap-4 w-full max-w-xs">
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className={`w-40 text-center text-2xl tracking-[0.5em] rounded-xl border bg-surface py-3 outline-none focus:border-accent ${
            error ? "border-red-500" : "border-border"
          }`}
          placeholder="****"
        />
        {error && <p className="text-sm text-red-500">Wrong PIN, try again</p>}
        <button
          type="submit"
          disabled={busy || !pin}
          className="w-full rounded-xl bg-accent text-accent-fg font-semibold py-3 disabled:opacity-50 active:scale-[0.98] transition"
        >
          {busy ? "Unlocking..." : "Unlock"}
        </button>
      </form>
    </main>
  );
}
