import type { Person, Interaction } from "@prisma/client";
import type { PersonCardData, PersonFull, InteractionData } from "./types";

export function toPersonCard(
  p: Person,
  extra?: { interactionCount?: number },
): PersonCardData {
  return {
    id: p.id,
    fullName: p.fullName,
    tag: p.tag,
    closeness: p.closeness,
    whatTheyDo: p.whatTheyDo,
    lastInteractedAt: p.lastInteractedAt?.toISOString() ?? null,
    ...(extra?.interactionCount !== undefined
      ? { interactionCount: extra.interactionCount }
      : {}),
  };
}

type PersonWithRelations = Person & {
  knows: { id: string; fullName: string }[];
  interactions: (Interaction & { people: { id: string; fullName: string }[] })[];
};

export function toPersonFull(p: PersonWithRelations): PersonFull {
  return {
    ...toPersonCard(p),
    howWeMet: p.howWeMet,
    location: p.location,
    birthday: p.birthday,
    links: p.links,
    likes: p.likes,
    dislikes: p.dislikes,
    highlights: p.highlights,
    relationshipSummary: p.relationshipSummary,
    snoozedUntil: p.snoozedUntil?.toISOString() ?? null,
    knows: p.knows.map((k) => ({ id: k.id, fullName: k.fullName })),
    interactions: p.interactions.map(toInteraction),
    createdAt: p.createdAt.toISOString(),
  };
}

export function toInteraction(
  i: Interaction & { people: { id: string; fullName: string }[] },
): InteractionData {
  return {
    id: i.id,
    date: i.date.toISOString(),
    summary: i.summary,
    rawText: i.rawText,
    people: i.people.map((p) => ({ id: p.id, fullName: p.fullName })),
  };
}
