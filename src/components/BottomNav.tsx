"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/",
    label: "Chat",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM5 20a7 7 0 0 1 14 0"
        />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <nav className="sticky bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-lg mx-auto flex">
        {tabs.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                active ? "text-accent" : "text-muted hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
