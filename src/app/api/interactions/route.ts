import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toInteraction } from "@/lib/serialize";
import { logInteraction } from "@/lib/interactions";
import { isSessionUser, requireUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  const user = await requireUser();
  if (!isSessionUser(user)) return user;

  const personId = request.nextUrl.searchParams.get("personId");
  const interactions = await prisma.interaction.findMany({
    where: {
      userId: user.id,
      ...(personId ? { people: { some: { id: personId, userId: user.id } } } : {}),
    },
    orderBy: { date: "desc" },
    take: 100,
    include: { people: { select: { id: true, fullName: true } } },
  });
  return NextResponse.json(interactions.map(toInteraction));
}

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!isSessionUser(user)) return user;

  const body = await request.json();
  if (!body.personIds?.length || !body.summary?.trim()) {
    return NextResponse.json(
      { error: "personIds and summary are required" },
      { status: 400 },
    );
  }
  try {
    const interaction = await logInteraction({
      userId: user.id,
      personIds: body.personIds,
      date: body.date ? new Date(body.date) : new Date(),
      rawText: body.rawText ?? body.summary,
      summary: body.summary.trim(),
    });
    return NextResponse.json(toInteraction(interaction), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid personIds" }, { status: 400 });
  }
}
