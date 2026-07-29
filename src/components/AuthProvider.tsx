"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

export function AuthProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <div className="flex flex-col h-full min-h-0">{children}</div>
    </SessionProvider>
  );
}
