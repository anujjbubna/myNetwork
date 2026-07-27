import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/adminAuth";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const admin = await requireAdminSession();
  if (admin !== true) return admin;

  const emailQ = request.nextUrl.searchParams.get("email")?.trim().toLowerCase() ?? "";

  const users = await prisma.user.findMany({
    where: emailQ
      ? { email: { contains: emailQ, mode: "insensitive" } }
      : undefined,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      _count: { select: { people: true, llmUsages: true } },
    },
  });

  const spendByUser = await prisma.llmUsage.groupBy({
    by: ["userId"],
    where: emailQ
      ? { user: { email: { contains: emailQ, mode: "insensitive" } } }
      : undefined,
    _sum: { estimatedCostUsd: true },
    _count: { _all: true },
  });
  const spendMap = new Map(
    spendByUser.map((row) => [
      row.userId,
      {
        spend: row._sum.estimatedCostUsd
          ? new Prisma.Decimal(row._sum.estimatedCostUsd).toNumber()
          : 0,
        calls: row._count._all,
      },
    ]),
  );

  const accounts = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    createdAt: u.createdAt.toISOString(),
    profiles: u._count.people,
    llmCalls: spendMap.get(u.id)?.calls ?? u._count.llmUsages,
    estimatedSpendUsd: spendMap.get(u.id)?.spend ?? 0,
  }));

  const totals = {
    accounts: accounts.length,
    profiles: accounts.reduce((s, a) => s + a.profiles, 0),
    llmCalls: accounts.reduce((s, a) => s + a.llmCalls, 0),
    estimatedSpendUsd: accounts.reduce((s, a) => s + a.estimatedSpendUsd, 0),
  };

  return NextResponse.json({
    filter: emailQ || null,
    totals,
    accounts,
  });
}
