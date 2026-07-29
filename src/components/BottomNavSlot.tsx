"use client";

import { useSyncExternalStore } from "react";
import { BottomNav } from "@/components/BottomNav";

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/** Renders nav only after hydration so usePathname can't mismatch SSR HTML. */
export function BottomNavSlot() {
  const isClient = useIsClient();
  if (!isClient) return null;
  return <BottomNav />;
}
