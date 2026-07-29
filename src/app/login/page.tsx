"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

const ERROR_MESSAGES: Record<string, string> = {
  invite: "You need a valid invite to join. Ask the admin for a link.",
  email: "Google did not return an email address.",
  AccessDenied: "Access denied. You need a valid invite to join.",
  OAuthAccountNotLinked: "Could not link your Google account. Try again.",
  Configuration: "Auth is not configured. Check Google OAuth env vars.",
  Default: "Something went wrong signing in. Try again.",
};

function LoginForm() {
  const router = useRouter();
  const { status } = useSession();
  const searchParams = useSearchParams();
  const inviteFromUrl = searchParams.get("invite") ?? "";
  const errorCode = searchParams.get("error") ?? "";

  const [inviteCode, setInviteCode] = useState(inviteFromUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    errorCode ? ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.Default : "",
  );

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  async function continueWithGoogle() {
    if (busy) return;
    setBusy(true);
    setError("");

    const code = inviteCode.trim();
    if (code) {
      const res = await fetch("/api/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        setError("Could not save invite code. Try again.");
        setBusy(false);
        return;
      }
    } else {
      await fetch("/api/auth/invite", { method: "DELETE" });
    }

    await signIn("google", { callbackUrl: "/" });
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">myNetwork</h1>
        <p className="text-sm text-muted mt-1">
          Sign in with Google. New accounts need an invite.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 w-full max-w-xs">
        <label className="w-full text-sm text-muted">
          Invite code
          <span className="text-muted/70"> (optional if you already have an account)</span>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-base outline-none focus:border-accent"
            placeholder="Paste invite code"
          />
        </label>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        <button
          type="button"
          onClick={continueWithGoogle}
          disabled={busy}
          className="w-full rounded-xl bg-accent text-accent-fg font-semibold py-3 disabled:opacity-50 active:scale-[0.98] transition flex items-center justify-center gap-2"
        >
          <GoogleIcon />
          {busy ? "Redirecting..." : "Continue with Google"}
        </button>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        opacity=".9"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        opacity=".75"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        opacity=".85"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        opacity=".95"
      />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1 flex items-center justify-center p-6">
          <p className="text-muted text-sm">Loading...</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
