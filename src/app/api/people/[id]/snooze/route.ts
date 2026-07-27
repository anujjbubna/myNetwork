import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSessionUser, requireUser } from "@/lib/session";

const SNOOZE_DAYS = 14;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!isSessionUser(user)) return user;

  const { id } = await params;
  const snoozedUntil = new Date(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000);
  const result = await prisma.person.updateMany({
    where: { id, userId: user.id },
    data: { snoozedUntil },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, snoozedUntil: snoozedUntil.toISOString() });
}
