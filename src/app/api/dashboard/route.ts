import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toPersonCard } from "@/lib/serialize";
import { generateNudges, hasApiKey } from "@/lib/ai";
import type { NudgeData } from "@/lib/types";
import { isSessionUser, requireUser } from "@/lib/session";

const RECONNECT_AFTER_DAYS = 30;

export async function GET() {
  const user = await requireUser();
  if (!isSessionUser(user)) return user;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const reconnectCutoff = new Date(now.getTime() - RECONNECT_AFTER_DAYS * 24 * 60 * 60 * 1000);
  const windowStart = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  const recentInteractions = await prisma.interaction.findMany({
    where: { userId: user.id, date: { gte: windowStart } },
    include: { people: { select: { id: true } } },
  });
  const scores = new Map<string, { score: number; count: number }>();
  for (const i of recentInteractions) {
    const ageDays = (now.getTime() - i.date.getTime()) / (24 * 60 * 60 * 1000);
    const weight = Math.exp(-ageDays / 45);
    for (const p of i.people) {
      const cur = scores.get(p.id) ?? { score: 0, count: 0 };
      scores.set(p.id, { score: cur.score + weight, count: cur.count + 1 });
    }
  }
  const topIds = [...scores.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 5)
    .map(([id]) => id);
  const topPeopleRaw = await prisma.person.findMany({
    where: { userId: user.id, id: { in: topIds } },
  });
  const topPeople = topIds
    .map((id) => topPeopleRaw.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => toPersonCard(p, { interactionCount: scores.get(p.id)?.count }));

  const reconnectRaw = await prisma.person.findMany({
    where: {
      userId: user.id,
      OR: [{ snoozedUntil: null }, { snoozedUntil: { lt: now } }],
      AND: {
        OR: [{ lastInteractedAt: null }, { lastInteractedAt: { lt: reconnectCutoff } }],
      },
    },
    orderBy: [{ lastInteractedAt: { sort: "asc", nulls: "first" } }],
    take: 5,
  });
  const reconnectPeople = reconnectRaw.map((p) => toPersonCard(p));

  if (hasApiKey()) {
    const existingToday = await prisma.nudge.count({
      where: { userId: user.id, day: today },
    });
    if (existingToday === 0) {
      try {
        await generateNudges(today, user.id);
      } catch (err) {
        console.error("Nudge generation failed:", err);
      }
    }
  }
  const nudgesRaw = await prisma.nudge.findMany({
    where: { userId: user.id, day: today, dismissed: false },
    include: { person: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: "asc" },
  });
  const nudges: NudgeData[] = nudgesRaw.map((n) => ({
    id: n.id,
    text: n.text,
    personId: n.personId,
    personName: n.person?.fullName ?? null,
  }));

  const totalPeople = await prisma.person.count({ where: { userId: user.id } });

  return NextResponse.json({ topPeople, reconnectPeople, nudges, totalPeople });
}
