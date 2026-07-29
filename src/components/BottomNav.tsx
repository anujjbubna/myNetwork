"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const tabs = [
  {
    href: "/",
    label: "Chat",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 10.5h8m-8 3.5h5m-9.4 4.6L4 21l.9-3.4A8.5 8.5 0 1 1 8 20.1l-2.4-1.5z"
        />
      </svg>
    ),
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM5 20a7 7 0 0 1 14 0"
        />
      </svg>
    ),
  },
  {
    href: "/search",
    label: "Search",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-4.35-4.35M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14z"
        />
      </svg>
    ),
  },
];

const NAV_HEIGHT = "calc(3.5rem + env(safe-area-inset-bottom, 0px))";

/** Client-only bottom nav — never SSR'd (avoids usePathname hydration mismatches with Proxy). */
export function BottomNav() {
  const pathname = usePathname();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // Mobile keyboard shrinks the visual viewport; hide nav so the input can sit above it
      const covered = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboardOpen(covered > 120);
    };

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  if (pathname === "/login" || pathname.startsWith("/admin")) return null;

  return (
    <>
      <div
        className="shrink-0 w-full transition-[height] duration-150"
        style={{ height: keyboardOpen ? 0 : NAV_HEIGHT }}
        aria-hidden
      />
      <nav
        aria-hidden={keyboardOpen}
        className={`fixed bottom-0 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 border-t border-border bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)] transition-transform duration-150 ${
          keyboardOpen ? "translate-y-full pointer-events-none" : ""
        }`}
      >
        <div className="flex h-14 w-full">
          {tabs.map((tab) => {
            const active =
              tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                prefetch={false}
                tabIndex={keyboardOpen ? -1 : undefined}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
                  active ? "text-accent" : "text-muted hover:text-foreground"
                }`}
              >
                {tab.icon}
                {tab.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            tabIndex={keyboardOpen ? -1 : undefined}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium text-muted hover:text-foreground transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 5.25 5.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"
              />
            </svg>
            Sign out
          </button>
        </div>
      </nav>
    </>
  );
}
