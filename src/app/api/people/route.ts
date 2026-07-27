import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toPersonCard } from "@/lib/serialize";
import { isSessionUser, requireUser } from "@/lib/session";
import type { ContactTag } from "@prisma/client";

const VALID_TAGS = new Set(["FAMILY", "FRIEND", "ACQUAINTANCE", "BUSINESS"]);

export async function GET(request: NextRequest) {
  const user = await requireUser();
  if (!isSessionUser(user)) return user;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const tagParam = request.nextUrl.searchParams.get("tag")?.trim().toUpperCase() ?? "";
  const tag = VALID_TAGS.has(tagParam) ? (tagParam as ContactTag) : null;

  const where: Record<string, unknown> = { userId: user.id };
  if (tag) where.tag = tag;
  if (q) {
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { whatTheyDo: { contains: q, mode: "insensitive" } },
      { howWeMet: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
      { relationshipSummary: { contains: q, mode: "insensitive" } },
      { likes: { hasSome: [q] } },
      { dislikes: { hasSome: [q] } },
      { highlights: { hasSome: [q] } },
    ];
  }

  const people = await prisma.person.findMany({
    where,
    orderBy: [{ fullName: "asc" }],
    include: { _count: { select: { interactions: true } } },
  });
  return NextResponse.json(
    people.map((p) => toPersonCard(p, { interactionCount: p._count.interactions })),
  );
}

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!isSessionUser(user)) return user;

  const body = await request.json();
  if (!body.fullName?.trim()) {
    return NextResponse.json({ error: "fullName is required" }, { status: 400 });
  }
  const person = await prisma.person.create({
    data: {
      userId: user.id,
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
