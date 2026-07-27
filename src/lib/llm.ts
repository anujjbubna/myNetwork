import Anthropic from "@anthropic-ai/sdk";
import type { Message, MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages";
import { prisma } from "@/lib/prisma";
import { estimateCostUsd } from "@/lib/pricing";
import type { LlmPurpose } from "@prisma/client";

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

/** Call Anthropic and record token usage + estimated cost for the user. */
export async function trackedMessagesCreate(
  userId: string,
  purpose: LlmPurpose,
  params: MessageCreateParamsNonStreaming,
): Promise<Message> {
  const response = await anthropic().messages.create(params);
  const inputTokens = response.usage?.input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;
  const model = typeof params.model === "string" ? params.model : String(params.model);

  try {
    await prisma.llmUsage.create({
      data: {
        userId,
        model,
        purpose,
        inputTokens,
        outputTokens,
        estimatedCostUsd: estimateCostUsd(model, inputTokens, outputTokens),
      },
    });
  } catch (err) {
    console.error("Failed to log LLM usage:", err);
  }

  return response;
}
