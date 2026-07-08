import { prisma } from "@/lib/prisma";

/** Creates an interaction, links people, and bumps their lastInteractedAt. */
export async function logInteraction(input: {
  personIds: string[];
  date: Date;
  rawText: string;
  summary: string;
}) {
  const interaction = await prisma.interaction.create({
    data: {
      date: input.date,
      rawText: input.rawText,
      summary: input.summary,
      people: { connect: input.personIds.map((id) => ({ id })) },
    },
    include: { people: { select: { id: true, fullName: true } } },
  });

  await prisma.person.updateMany({
    where: {
      id: { in: input.personIds },
      OR: [{ lastInteractedAt: null }, { lastInteractedAt: { lt: input.date } }],
    },
    data: { lastInteractedAt: input.date },
  });

  return interaction;
}
