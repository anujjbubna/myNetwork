import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toPersonFull } from "@/lib/serialize";
import { isSessionUser, requireUser } from "@/lib/session";

const personInclude = {
  knows: { select: { id: true, fullName: true } },
  interactions: {
    orderBy: { date: "desc" as const },
    include: { people: { select: { id: true, fullName: true } } },
  },
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!isSessionUser(user)) return user;

  const { id } = await params;
  const person = await prisma.person.findFirst({
    where: { id, userId: user.id },
    include: personInclude,
  });
  if (!person) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(toPersonFull(person));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!isSessionUser(user)) return user;

  const { id } = await params;
  const existing = await prisma.person.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();

  const scalarFields = [
    "fullName",
    "tag",
    "closeness",
    "whatTheyDo",
    "howWeMet",
    "location",
    "birthday",
    "relationshipSummary",
  ] as const;
  const arrayFields = ["links", "likes", "dislikes", "highlights"] as const;

  const data: Record<string, unknown> = {};
  for (const f of scalarFields) if (f in body) data[f] = body[f];
  for (const f of arrayFields) if (f in body) data[f] = body[f];
  if ("knowsIds" in body) {
    const knowsIds = body.knowsIds as string[];
    const owned = await prisma.person.findMany({
      where: { id: { in: knowsIds }, userId: user.id },
      select: { id: true },
    });
    data.knows = { set: owned.map((p) => ({ id: p.id })) };
  }

  const person = await prisma.person.update({
    where: { id },
    data,
    include: personInclude,
  });
  return NextResponse.json(toPersonFull(person));
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!isSessionUser(user)) return user;

  const { id } = await params;
  const result = await prisma.person.deleteMany({ where: { id, userId: user.id } });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
