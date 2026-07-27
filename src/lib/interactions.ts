import { prisma } from "@/lib/prisma";

/** Creates an interaction, links people, and bumps their lastInteractedAt. */
export async function logInteraction(input: {
  userId: string;
  personIds: string[];
  date: Date;
  rawText: string;
  summary: string;
}) {
  const owned = await prisma.person.findMany({
    where: { id: { in: input.personIds }, userId: input.userId },
    select: { id: true },
  });
  const personIds = owned.map((p) => p.id);
  if (!personIds.length) {
    throw new Error("No valid people for this user");
  }

  const interaction = await prisma.interaction.create({
    data: {
      userId: input.userId,
      date: input.date,
      rawText: input.rawText,
      summary: input.summary,
      people: { connect: personIds.map((id) => ({ id })) },
    },
    include: { people: { select: { id: true, fullName: true } } },
  });

  await prisma.person.updateMany({
    where: {
      userId: input.userId,
      id: { in: personIds },
      OR: [{ lastInteractedAt: null }, { lastInteractedAt: { lt: input.date } }],
    },
    data: { lastInteractedAt: input.date },
  });

  return interaction;
}
