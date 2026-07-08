import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { TAG_LABELS } from "@/lib/types";
import type { Person } from "@prisma/client";

export const CHAT_MODEL = process.env.CHAT_MODEL ?? "claude-sonnet-4-5";
export const LIGHT_MODEL = process.env.LIGHT_MODEL ?? "claude-haiku-4-5";

export function hasApiKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export function describePersonLine(p: Person): string {
  const parts = [
    `id=${p.id}`,
    p.fullName,
    p.tag ? TAG_LABELS[p.tag] : "no tag",
    p.closeness ? `closeness ${p.closeness}/5` : "no closeness rating",
  ];
  if (p.whatTheyDo) parts.push(p.whatTheyDo);
  parts.push(
    p.lastInteractedAt
      ? `last interaction ${p.lastInteractedAt.toISOString().slice(0, 10)}`
      : "no interactions yet",
  );
  return "- " + parts.join(" | ");
}

export function describePersonFull(
  p: Person & { knows?: { fullName: string }[] },
): string {
  const lines = [
    `Name: ${p.fullName}`,
    `Tag: ${p.tag ? TAG_LABELS[p.tag] : "unknown"} | Closeness: ${p.closeness ?? "unknown"}/5`,
  ];
  if (p.whatTheyDo) lines.push(`What they do: ${p.whatTheyDo}`);
  if (p.howWeMet) lines.push(`How we met: ${p.howWeMet}`);
  if (p.location) lines.push(`Location: ${p.location}`);
  if (p.birthday) lines.push(`Birthday: ${p.birthday}`);
  if (p.likes.length) lines.push(`Likes: ${p.likes.join(", ")}`);
  if (p.dislikes.length) lines.push(`Dislikes: ${p.dislikes.join(", ")}`);
  if (p.highlights.length) lines.push(`Highlights:\n${p.highlights.map((h) => `  - ${h}`).join("\n")}`);
  if (p.relationshipSummary) lines.push(`Relationship summary: ${p.relationshipSummary}`);
  if (p.knows?.length) lines.push(`Knows: ${p.knows.map((k) => k.fullName).join(", ")}`);
  return lines.join("\n");
}

/**
 * Regenerates the AI relationship summary for a person from their profile
 * and recent interactions. Called after interactions are logged or profiles
 * updated via chat.
 */
export async function refreshRelationshipSummary(personId: string) {
  if (!hasApiKey()) return;
  const person = await prisma.person.findUnique({
    where: { id: personId },
    include: {
      interactions: { orderBy: { date: "desc" }, take: 15 },
      knows: { select: { fullName: true } },
    },
  });
  if (!person) return;

  const interactionLog = person.interactions
    .map((i) => `[${i.date.toISOString().slice(0, 10)}] ${i.summary}`)
    .join("\n");

  const response = await anthropic().messages.create({
    model: LIGHT_MODEL,
    max_tokens: 400,
    system:
      "You maintain a short 'relationship summary' for a personal relationship journal. " +
      "Given a person's profile and recent interactions, write 2-4 sentences capturing: the nature and history of the relationship, " +
      "recurring themes, and any open threads worth following up on (e.g. 'recently changed jobs', 'was planning a trip to Japan'). " +
      "Write in first person from the journal owner's perspective. Output only the summary text, no preamble.",
    messages: [
      {
        role: "user",
        content: `Profile:\n${describePersonFull(person)}\n\nRecent interactions (newest first):\n${interactionLog || "(none logged yet)"}`,
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  if (text) {
    await prisma.person.update({
      where: { id: personId },
      data: { relationshipSummary: text },
    });
  }
}

/** Generates today's proactive nudges (2-3) if not already generated. */
export async function generateNudges(day: string) {
  if (!hasApiKey()) return;

  const people = await prisma.person.findMany({
    orderBy: { lastInteractedAt: "asc" },
  });
  if (people.length === 0) return;

  const context = people
    .map((p) => {
      const line = describePersonLine(p);
      return p.relationshipSummary ? `${line}\n  summary: ${p.relationshipSummary}` : line;
    })
    .join("\n");

  const response = await anthropic().messages.create({
    model: LIGHT_MODEL,
    max_tokens: 600,
    system:
      "You generate proactive relationship nudges for a personal CRM. Given the user's contacts " +
      "(with closeness ratings, last-interaction dates, and relationship summaries with open threads), " +
      `suggest 2-3 short, specific, actionable nudges. Today is ${day}. ` +
      "Prioritize open threads (follow up on a job change, a trip, an event) and close people the user hasn't talked to in a while. " +
      'Respond with ONLY a JSON array: [{"personId": "...", "text": "..."}]. ' +
      "Each text is one sentence, warm and concrete, mentioning the person by first name.",
    messages: [{ role: "user", content: `My contacts:\n${context}` }],
  });

  const raw = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return;

  let parsed: { personId?: string; text?: string }[];
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return;
  }

  const validIds = new Set(people.map((p) => p.id));
  const nudges = parsed
    .filter((n) => typeof n.text === "string" && n.text.trim())
    .slice(0, 3)
    .map((n) => ({
      day,
      text: n.text!.trim(),
      personId: n.personId && validIds.has(n.personId) ? n.personId : null,
    }));

  if (nudges.length) {
    await prisma.nudge.createMany({ data: nudges });
  }
}
