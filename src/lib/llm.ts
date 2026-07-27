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

/** Call Anthropic and record full token usage + list-price cost for the user. */
export async function trackedMessagesCreate(
  userId: string,
  purpose: LlmPurpose,
  params: MessageCreateParamsNonStreaming,
): Promise<Message> {
  const response = await anthropic().messages.create(params);
  const usage = response.usage;
  const inputTokens = usage?.input_tokens ?? 0;
  const outputTokens = usage?.output_tokens ?? 0;
  const cacheReadTokens = usage?.cache_read_input_tokens ?? 0;
  let cacheCreation5mTokens = usage?.cache_creation?.ephemeral_5m_input_tokens ?? 0;
  let cacheCreation1hTokens = usage?.cache_creation?.ephemeral_1h_input_tokens ?? 0;
  const cacheCreationAggregate = usage?.cache_creation_input_tokens ?? 0;
  if (
    cacheCreation5mTokens === 0 &&
    cacheCreation1hTokens === 0 &&
    cacheCreationAggregate > 0
  ) {
    // Older-style aggregate: bill as 5m writes (most common TTL)
    cacheCreation5mTokens = cacheCreationAggregate;
  }
  const model = typeof params.model === "string" ? params.model : String(params.model);

  try {
    await prisma.llmUsage.create({
      data: {
        userId,
        model,
        purpose,
        inputTokens,
        outputTokens,
        cacheReadTokens,
        cacheCreation5mTokens,
        cacheCreation1hTokens,
        estimatedCostUsd: estimateCostUsd(model, {
          inputTokens,
          outputTokens,
          cacheReadTokens,
          cacheCreation5mTokens,
          cacheCreation1hTokens,
        }),
      },
    });
  } catch (err) {
    console.error("Failed to log LLM usage:", err);
  }

  return response;
}
