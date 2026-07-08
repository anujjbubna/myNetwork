import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toPersonCard } from "@/lib/serialize";

export async function GET() {
  const people = await prisma.person.findMany({
    orderBy: { fullName: "asc" },
    include: { _count: { select: { interactions: true } } },
  });
  return NextResponse.json(
    people.map((p) => toPersonCard(p, { interactionCount: p._count.interactions })),
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.fullName?.trim()) {
    return NextResponse.json({ error: "fullName is required" }, { status: 400 });
  }
  const person = await prisma.person.create({
    data: {
      fullName: body.fullName.trim(),
      tag: body.tag ?? null,
      closeness: body.closeness ?? null,
      whatTheyDo: body.whatTheyDo ?? null,
      howWeMet: body.howWeMet ?? null,
      location: body.location ?? null,
      birthday: body.birthday ?? null,
      links: body.links ?? [],
      likes: body.likes ?? [],
      dislikes: body.dislikes ?? [],
      highlights: body.highlights ?? [],
    },
  });
  return NextResponse.json(toPersonCard(person), { status: 201 });
}
