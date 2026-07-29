import { prisma } from "@/lib/prisma";

/**
 * Distinct users who used the app at least once since `since`.
 * Combines lastActiveAt with chat / interaction / LLM / profile activity
 * so historical usage counts even before lastActiveAt existed.
 */
export async function countActiveUsers(since: Date, emailContains?: string) {
  const emailFilter = emailContains
    ? { email: { contains: emailContains, mode: "insensitive" as const } }
    : {};

  const [fromLastActive, fromChat, fromInteractions, fromLlm, fromPeople] =
    await Promise.all([
      prisma.user.findMany({
        where: { ...emailFilter, lastActiveAt: { gte: since } },
        select: { id: true },
      }),
      prisma.chatMessage.findMany({
        where: {
          createdAt: { gte: since },
          ...(emailContains ? { user: emailFilter } : {}),
        },
        distinct: ["userId"],
        select: { userId: true },
      }),
      prisma.interaction.findMany({
        where: {
          createdAt: { gte: since },
          ...(emailContains ? { user: emailFilter } : {}),
        },
        distinct: ["userId"],
        select: { userId: true },
      }),
      prisma.llmUsage.findMany({
        where: {
          createdAt: { gte: since },
          ...(emailContains ? { user: emailFilter } : {}),
        },
        distinct: ["userId"],
        select: { userId: true },
      }),
      prisma.person.findMany({
        where: {
          updatedAt: { gte: since },
          ...(emailContains ? { user: emailFilter } : {}),
        },
        distinct: ["userId"],
        select: { userId: true },
      }),
    ]);

  const ids = new Set<string>();
  for (const u of fromLastActive) ids.add(u.id);
  for (const row of fromChat) ids.add(row.userId);
  for (const row of fromInteractions) ids.add(row.userId);
  for (const row of fromLlm) ids.add(row.userId);
  for (const row of fromPeople) ids.add(row.userId);
  return ids.size;
}
