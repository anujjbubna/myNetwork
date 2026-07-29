"use client";

import dynamic from "next/dynamic";

const BottomNav = dynamic(
  () => import("@/components/BottomNav").then((m) => m.BottomNav),
  { ssr: false },
);

/** Loads BottomNav only on the client so usePathname can't mismatch SSR HTML. */
export function BottomNavSlot() {
  return <BottomNav />;
}
