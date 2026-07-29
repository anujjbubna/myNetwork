import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

export type SessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role: UserRole;
};

const ACTIVE_TOUCH_MS = 60 * 60 * 1000; // at most once per hour

/** Returns the logged-in Google user or a 401 Response. */
export async function requireUser(): Promise<SessionUser | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  // Fire-and-forget activity touch for WAU/MAU
  void touchLastActive(userId);

  return {
    id: userId,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
    role: session.user.role ?? "USER",
  };
}

async function touchLastActive(userId: string) {
  try {
    const cutoff = new Date(Date.now() - ACTIVE_TOUCH_MS);
    await prisma.user.updateMany({
      where: {
        id: userId,
        OR: [{ lastActiveAt: null }, { lastActiveAt: { lt: cutoff } }],
      },
      data: { lastActiveAt: new Date() },
    });
  } catch (err) {
    console.error("Failed to touch lastActiveAt:", err);
  }
}

export function isSessionUser(
  value: SessionUser | NextResponse,
): value is SessionUser {
  return !(value instanceof NextResponse);
}
