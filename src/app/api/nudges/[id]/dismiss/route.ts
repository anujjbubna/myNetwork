import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.nudge.update({ where: { id }, data: { dismissed: true } });
  return NextResponse.json({ ok: true });
}
