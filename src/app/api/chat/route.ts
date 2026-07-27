import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { logInteraction } from "@/lib/interactions";
import { toPersonCard } from "@/lib/serialize";
import {
  hasApiKey,
  CHAT_MODEL,
  describePersonLine,
  describePersonFull,
  refreshRelationshipSummary,
} from "@/lib/ai";
import { trackedMessagesCreate } from "@/lib/llm";
import type { Tag } from "@/lib/types";
import { isSessionUser, requireUser } from "@/lib/session";

export async function GET() {
  const user = await requireUser();
  if (!isSessionUser(user)) return user;

  const messages = await prisma.chatMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  messages.reverse();

  const allPersonIds = [...new Set(messages.flatMap((m) => m.personIds))];
  const people = await prisma.person.findMany({
    where: { userId: user.id, id: { in: allPersonIds } },
  });
  const byId = new Map(people.map((p) => [p.id, toPersonCard(p)]));

  return NextResponse.json(
    messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      people: m.personIds.map((pid) => byId.get(pid)).filter(Boolean),
      createdAt: m.createdAt.toISOString(),
    })),
  );
}

export async function DELETE() {
  const user = await requireUser();
  if (!isSessionUser(user)) return user;

  await prisma.chatMessage.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ ok: true });
}

const VALID_TAGS = new Set(["FAMILY", "FRIEND", "ACQUAINTANCE", "BUSINESS"]);

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_person",
    description:
      "Get the full profile of a person (all fields, relationship summary, who they know) plus their 10 most recent interactions.",
    input_schema: {
      type: "object",
      properties: { personId: { type: "string" } },
      required: ["personId"],
    },
  },
  {
    name: "search_people",
    description:
      "Filter people by tag, closeness, name, or keywords in profile fields. " +
      "Use for 'close friends' (closenessMin 4), 'family' (tag FAMILY), or finding someone by what they do.",
    input_schema: {
      type: "object",
      properties: {
        tag: { type: "string", enum: ["FAMILY", "FRIEND", "ACQUAINTANCE", "BUSINESS"] },
        closenessMin: { type: "integer", minimum: 1, maximum: 5 },
        nameContains: { type: "string" },
        keywords: { type: "array", items: { type: "string" } },
      },
    },
  },
  {
    name: "search_interactions",
    description:
      "Search interaction logs and profile notes by keywords (case-insensitive, matches any keyword). " +
      "Use several related keywords to widen the net, e.g. for 'ice cream' also try 'gelato', 'dessert'. Returns matching interactions with dates and people, and people whose profile fields match.",
    input_schema: {
      type: "object",
      properties: {
        keywords: { type: "array", items: { type: "string" }, minItems: 1 },
      },
      required: ["keywords"],
    },
  },
  {
    name: "log_interaction",
    description:
      "Log an interaction with one or more people. Creates new people automatically for names not in the directory. " +
      "Use the exact personId for existing people; for new people give name and optionally tag/closeness if they can be inferred.",
    input_schema: {
      type: "object",
      properties: {
        people: {
          type: "array",
          items: {
            type: "object",
            properties: {
              personId: { type: "string", description: "id of an existing person" },
              name: { type: "string", description: "full name, for new people" },
              tag: { type: "string", enum: ["FAMILY", "FRIEND", "ACQUAINTANCE", "BUSINESS"] },
              closeness: { type: "integer", minimum: 1, maximum: 5 },
            },
          },
          minItems: 1,
        },
        date: { type: "string", description: "YYYY-MM-DD, defaults to today" },
        summary: {
          type: "string",
          description: "1-2 sentence summary of what happened / was discussed",
        },
      },
      required: ["people", "summary"],
    },
  },
  {
    name: "update_person",
    description:
      "Update a person's profile: tag, closeness, what they do, how we met, location, birthday, add likes/dislikes/highlights, links, or connect them to people they know.",
    input_schema: {
      type: "object",
      properties: {
        personId: { type: "string" },
        fullName: { type: "string" },
        tag: { type: "string", enum: ["FAMILY", "FRIEND", "ACQUAINTANCE", "BUSINESS"] },
        closeness: { type: "integer", minimum: 1, maximum: 5 },
        whatTheyDo: { type: "string" },
        howWeMet: { type: "string" },
        location: { type: "string" },
        birthday: { type: "string" },
        addLikes: { type: "array", items: { type: "string" } },
        addDislikes: { type: "array", items: { type: "string" } },
        addHighlights: { type: "array", items: { type: "string" } },
        addLinks: { type: "array", items: { type: "string" } },
        knowsPersonIds: {
          type: "array",
          items: { type: "string" },
          description: "ids of people this person knows (added, not replaced)",
        },
      },
      required: ["personId"],
    },
  },
  {
    name: "show_people",
    description:
      "Display tappable person cards alongside your reply. Call this with the people you are recommending or that matched a search, so the user can tap through to their profiles.",
    input_schema: {
      type: "object",
      properties: {
        personIds: { type: "array", items: { type: "string" }, minItems: 1 },
      },
      required: ["personIds"],
    },
  },
];

interface ToolContext {
  userId: string;
  shownPersonIds: string[];
  touchedPersonIds: Set<string>;
  rawText: string;
}

async function runTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  const { userId } = ctx;

  switch (name) {
    case "get_person": {
      const person = await prisma.person.findFirst({
        where: { id: input.personId as string, userId },
        include: {
          knows: { select: { fullName: true } },
          interactions: { orderBy: { date: "desc" }, take: 10 },
        },
      });
      if (!person) return "No person found with that id.";
      const log = person.interactions
        .map((i) => `[${i.date.toISOString().slice(0, 10)}] ${i.summary}`)
        .join("\n");
      return `${describePersonFull(person)}\n\nRecent interactions:\n${log || "(none)"}`;
    }

    case "search_people": {
      const where: Record<string, unknown>[] = [{ userId }];
      if (typeof input.tag === "string" && VALID_TAGS.has(input.tag)) {
        where.push({ tag: input.tag });
      }
      if (typeof input.closenessMin === "number") {
        where.push({ closeness: { gte: Math.min(5, Math.max(1, Math.round(input.closenessMin))) } });
      }
      if (typeof input.nameContains === "string" && input.nameContains.trim()) {
        where.push({
          fullName: { contains: input.nameContains.trim(), mode: "insensitive" as const },
        });
      }
      const keywords = ((input.keywords as string[]) ?? []).filter((k) => k.trim());
      if (keywords.length) {
        where.push({
          OR: keywords.flatMap((k) => [
            { whatTheyDo: { contains: k, mode: "insensitive" as const } },
            { howWeMet: { contains: k, mode: "insensitive" as const } },
            { relationshipSummary: { contains: k, mode: "insensitive" as const } },
            { highlights: { hasSome: [k] } },
            { likes: { hasSome: [k] } },
          ]),
        });
      }
      const people = await prisma.person.findMany({
        where: { AND: where },
        orderBy: [{ closeness: "desc" }, { fullName: "asc" }],
        take: 25,
      });
      if (!people.length) return "No people matched those filters.";
      return people.map(describePersonLine).join("\n");
    }

    case "search_interactions": {
      const keywords = (input.keywords as string[]).filter((k) => k.trim());
      const interactions = await prisma.interaction.findMany({
        where: {
          userId,
          OR: keywords.flatMap((k) => [
            { summary: { contains: k, mode: "insensitive" as const } },
            { rawText: { contains: k, mode: "insensitive" as const } },
          ]),
        },
        orderBy: { date: "desc" },
        take: 25,
        include: { people: { select: { id: true, fullName: true } } },
      });
      const people = await prisma.person.findMany({
        where: {
          userId,
          OR: keywords.flatMap((k) => [
            { likes: { hasSome: [k] } },
            { dislikes: { hasSome: [k] } },
            { whatTheyDo: { contains: k, mode: "insensitive" as const } },
            { howWeMet: { contains: k, mode: "insensitive" as const } },
            { highlights: { hasSome: [k] } },
            { relationshipSummary: { contains: k, mode: "insensitive" as const } },
          ]),
        },
        take: 25,
      });
      const iLines = interactions.map(
        (i) =>
          `[${i.date.toISOString().slice(0, 10)}] with ${i.people
            .map((p) => `${p.fullName} (id=${p.id})`)
            .join(", ")}: ${i.summary}`,
      );
      const pLines = people.map(describePersonLine);
      if (!iLines.length && !pLines.length) return "No matches found.";
      return [
        iLines.length ? `Matching interactions:\n${iLines.join("\n")}` : "",
        pLines.length ? `People with matching profile notes:\n${pLines.join("\n")}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
    }

    case "log_interaction": {
      const peopleInput = input.people as {
        personId?: string;
        name?: string;
        tag?: string;
        closeness?: number;
      }[];
      const personIds: string[] = [];
      const created: string[] = [];
      for (const p of peopleInput) {
        if (p.personId) {
          const exists = await prisma.person.findFirst({
            where: { id: p.personId, userId },
          });
          if (exists) {
            personIds.push(exists.id);
            continue;
          }
        }
        if (!p.name?.trim()) continue;
        const existing = await prisma.person.findFirst({
          where: {
            userId,
            fullName: { equals: p.name.trim(), mode: "insensitive" },
          },
        });
        if (existing) {
          personIds.push(existing.id);
        } else {
          const newPerson = await prisma.person.create({
            data: {
              userId,
              fullName: p.name.trim(),
              tag: p.tag && VALID_TAGS.has(p.tag) ? (p.tag as Tag) : null,
              closeness: p.closeness ?? null,
            },
          });
          personIds.push(newPerson.id);
          created.push(`${newPerson.fullName} (id=${newPerson.id})`);
        }
      }
      if (!personIds.length) return "Error: no valid people to log this interaction with.";

      const date = input.date ? new Date(`${input.date}T12:00:00`) : new Date();
      const interaction = await logInteraction({
        userId,
        personIds,
        date: isNaN(date.getTime()) ? new Date() : date,
        rawText: ctx.rawText,
        summary: input.summary as string,
      });
      personIds.forEach((id) => ctx.touchedPersonIds.add(id));
      ctx.shownPersonIds.push(...personIds);
      return (
        `Interaction logged (id=${interaction.id}) with ${interaction.people
          .map((p) => p.fullName)
          .join(", ")}.` +
        (created.length ? ` Newly created people: ${created.join(", ")}.` : "")
      );
    }

    case "update_person": {
      const person = await prisma.person.findFirst({
        where: { id: input.personId as string, userId },
      });
      if (!person) return "No person found with that id.";

      const data: Record<string, unknown> = {};
      if (typeof input.fullName === "string") data.fullName = input.fullName;
      if (typeof input.tag === "string" && VALID_TAGS.has(input.tag)) data.tag = input.tag;
      if (typeof input.closeness === "number")
        data.closeness = Math.min(5, Math.max(1, Math.round(input.closeness)));
      for (const f of ["whatTheyDo", "howWeMet", "location", "birthday"] as const) {
        if (typeof input[f] === "string") data[f] = input[f];
      }
      const appendUnique = (current: string[], add: unknown) => [
        ...current,
        ...((add as string[]) ?? []).filter(
          (x) => !current.some((c) => c.toLowerCase() === x.toLowerCase()),
        ),
      ];
      if (input.addLikes) data.likes = appendUnique(person.likes, input.addLikes);
      if (input.addDislikes) data.dislikes = appendUnique(person.dislikes, input.addDislikes);
      if (input.addHighlights)
        data.highlights = appendUnique(person.highlights, input.addHighlights);
      if (input.addLinks) data.links = appendUnique(person.links, input.addLinks);
      if (input.knowsPersonIds) {
        const knowsIds = (input.knowsPersonIds as string[]).filter((kid) => kid !== person.id);
        const owned = await prisma.person.findMany({
          where: { id: { in: knowsIds }, userId },
          select: { id: true },
        });
        data.knows = { connect: owned.map((p) => ({ id: p.id })) };
      }

      await prisma.person.update({ where: { id: person.id }, data });
      ctx.touchedPersonIds.add(person.id);
      return `Updated ${person.fullName}'s profile.`;
    }

    case "show_people": {
      const ids = input.personIds as string[];
      const found = await prisma.person.findMany({
        where: { userId, id: { in: ids } },
      });
      const foundIds = found.map((p) => p.id);
      ctx.shownPersonIds.push(...ids.filter((id) => foundIds.includes(id)));
      return `Will display cards for: ${found.map((p) => p.fullName).join(", ") || "(none found)"}.`;
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!isSessionUser(user)) return user;

  const { message } = await request.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }
  const userText = message.trim();
  await prisma.chatMessage.create({
    data: { userId: user.id, role: "user", content: userText },
  });

  if (!hasApiKey()) {
    const reply =
      "I'm not connected to Claude yet - add your ANTHROPIC_API_KEY to the environment and restart, then I can log interactions and answer questions about your people.";
    const saved = await prisma.chatMessage.create({
      data: { userId: user.id, role: "assistant", content: reply },
    });
    return NextResponse.json({
      id: saved.id,
      role: "assistant",
      content: reply,
      people: [],
      createdAt: saved.createdAt.toISOString(),
    });
  }

  const [allPeople, history] = await Promise.all([
    prisma.person.findMany({ where: { userId: user.id }, orderBy: { fullName: "asc" } }),
    prisma.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  history.reverse();

  const today = new Date().toISOString().slice(0, 10);
  const directory = allPeople.map(describePersonLine).join("\n");

  const system = `You are the assistant inside "myNetwork", a personal relationship journal. The user tracks people they know, logs interactions, and reflects on relationships. Today is ${today}.

Directory of everyone the user tracks (compact; use get_person for full profiles):
${directory || "(empty - no people added yet)"}

Your jobs:
1. LOG interactions: when the user describes something they did with someone ("had lunch with Sarah, she got promoted"), call log_interaction. Extract every person mentioned. Also call update_person to capture new facts revealed about them (likes, dislikes, highlights, job, how they met, who they know). If you created a NEW person and their tag (Family/Friend/Acquaintance/Business) or closeness (1-5) wasn't inferable, ask the user for it at the end of your reply.
2. SEARCH & RECOMMEND: for questions like "who did I have ice cream with", use search_interactions (with generous synonyms). For "close friends", "family", or filtering by tag/closeness, use search_people. Use get_person for deeper context. Always call show_people with the people you mention so the user gets tappable cards.
3. UPDATE profiles on request ("Sarah is a 4 now", "tag Mike as business").
4. REFLECT: help the user think about their relationships when asked, using profile and interaction context.

Style: warm, concise, conversational. Plain text only - no markdown headers or bold. Short paragraphs or simple dashed lists. Never invent people or facts not in the data. If a name is ambiguous between two people, ask which one.`;

  const messages: Anthropic.MessageParam[] = [
    ...history.slice(0, -1).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userText },
  ];

  const ctx: ToolContext = {
    userId: user.id,
    shownPersonIds: [],
    touchedPersonIds: new Set(),
    rawText: userText,
  };

  let reply = "";
  try {
    for (let turn = 0; turn < 8; turn++) {
      const response = await trackedMessagesCreate(user.id, "chat", {
        model: CHAT_MODEL,
        max_tokens: 1500,
        system,
        tools: TOOLS,
        messages,
      });

      const toolUses = response.content.filter((b) => b.type === "tool_use");
      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();

      if (toolUses.length === 0) {
        reply = text;
        break;
      }

      messages.push({ role: "assistant", content: response.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        let result: string;
        try {
          result = await runTool(tu.name, tu.input as Record<string, unknown>, ctx);
        } catch (err) {
          result = `Tool error: ${err instanceof Error ? err.message : String(err)}`;
        }
        results.push({ type: "tool_result", tool_use_id: tu.id, content: result });
      }
      messages.push({ role: "user", content: results });
      reply = text;
    }
  } catch (err) {
    console.error("Chat error:", err);
    reply = "Something went wrong talking to Claude. Please try again.";
  }

  if (!reply) reply = "Done.";

  const shownIds = [...new Set(ctx.shownPersonIds)].slice(0, 10);
  const saved = await prisma.chatMessage.create({
    data: {
      userId: user.id,
      role: "assistant",
      content: reply,
      personIds: shownIds,
    },
  });

  const shownPeople = await prisma.person.findMany({
    where: { userId: user.id, id: { in: shownIds } },
  });
  const byId = new Map(shownPeople.map((p) => [p.id, toPersonCard(p)]));

  const touched = [...ctx.touchedPersonIds];
  const uid = user.id;
  if (touched.length) {
    after(async () => {
      for (const id of touched) {
        try {
          await refreshRelationshipSummary(id, uid);
        } catch (err) {
          console.error("Summary refresh failed for", id, err);
        }
      }
    });
  }

  return NextResponse.json({
    id: saved.id,
    role: "assistant",
    content: reply,
    people: shownIds.map((id) => byId.get(id)).filter(Boolean),
    createdAt: saved.createdAt.toISOString(),
  });
}
