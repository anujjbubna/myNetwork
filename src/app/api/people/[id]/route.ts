import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toPersonFull } from "@/lib/serialize";

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
  const { id } = await params;
  const person = await prisma.person.findUnique({
    where: { id },
    include: personInclude,
  });
  if (!person) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(toPersonFull(person));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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
    data.knows = { set: (body.knowsIds as string[]).map((kid) => ({ id: kid })) };
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
  const { id } = await params;
  await prisma.person.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
