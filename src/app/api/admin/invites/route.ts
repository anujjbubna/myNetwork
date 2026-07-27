import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/adminAuth";

function generateCode() {
  return randomBytes(9).toString("base64url");
}

export async function GET() {
  const admin = await requireAdminSession();
  if (admin !== true) return admin;

  const invites = await prisma.invite.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      usedBy: { select: { email: true, name: true } },
    },
  });

  return NextResponse.json(
    invites.map((i) => ({
      id: i.id,
      code: i.code,
      createdAt: i.createdAt.toISOString(),
      expiresAt: i.expiresAt?.toISOString() ?? null,
      usedAt: i.usedAt?.toISOString() ?? null,
      usedByEmail: i.usedBy?.email ?? null,
      usedByName: i.usedBy?.name ?? null,
    })),
  );
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminSession();
  if (admin !== true) return admin;

  const body = await request.json().catch(() => ({}));
  const days =
    typeof body.expiresInDays === "number" && body.expiresInDays > 0
      ? body.expiresInDays
      : null;

  const invite = await prisma.invite.create({
    data: {
      code: generateCode(),
      createdById: null,
      expiresAt: days
        ? new Date(Date.now() + days * 24 * 60 * 60 * 1000)
        : null,
    },
  });

  return NextResponse.json(
    {
      id: invite.id,
      code: invite.code,
      createdAt: invite.createdAt.toISOString(),
      expiresAt: invite.expiresAt?.toISOString() ?? null,
      usedAt: null,
      usedByEmail: null,
      usedByName: null,
    },
    { status: 201 },
  );
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdminSession();
  if (admin !== true) return admin;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const existing = await prisma.invite.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.usedById) {
    return NextResponse.json(
      { error: "Cannot delete a used invite" },
      { status: 400 },
    );
  }

  await prisma.invite.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
