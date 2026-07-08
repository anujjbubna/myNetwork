import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SNOOZE_DAYS = 14;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const snoozedUntil = new Date(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000);
  await prisma.person.update({ where: { id }, data: { snoozedUntil } });
  return NextResponse.json({ ok: true, snoozedUntil: snoozedUntil.toISOString() });
}
