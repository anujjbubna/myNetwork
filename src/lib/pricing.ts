/**
 * Estimated Anthropic list prices (USD per 1M tokens).
 * Used for admin dashboards — not a bill.
 */
const RATES: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-5": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-opus-4-6": { input: 5, output: 25 },
};

const DEFAULT_RATE = { input: 3, output: 15 };

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const rate = RATES[model] ?? DEFAULT_RATE;
  return (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000;
}
