/**
 * Anthropic list prices (USD per 1M tokens) for per-user cost attribution.
 * Uses the token counts returned on each Messages API response (including cache).
 * This is the most accurate split possible on a shared API key — not a Console invoice.
 */
export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheCreation5mTokens?: number;
  cacheCreation1hTokens?: number;
};

type ModelRates = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
};

function ratesFromBase(input: number, output: number): ModelRates {
  return {
    input,
    output,
    cacheRead: input * 0.1,
    cacheWrite5m: input * 1.25,
    cacheWrite1h: input * 2,
  };
}

const RATES: Record<string, ModelRates> = {
  "claude-sonnet-4-5": ratesFromBase(3, 15),
  "claude-sonnet-4-6": ratesFromBase(3, 15),
  "claude-haiku-4-5": ratesFromBase(1, 5),
  "claude-opus-4-5": ratesFromBase(5, 25),
  "claude-opus-4-6": ratesFromBase(5, 25),
};

const DEFAULT_RATE = ratesFromBase(3, 15);

function perMillion(tokens: number, usdPerMTok: number) {
  return (tokens * usdPerMTok) / 1_000_000;
}

export function estimateCostUsd(model: string, usage: TokenUsage): number {
  const rate = RATES[model] ?? DEFAULT_RATE;
  return (
    perMillion(usage.inputTokens, rate.input) +
    perMillion(usage.outputTokens, rate.output) +
    perMillion(usage.cacheReadTokens ?? 0, rate.cacheRead) +
    perMillion(usage.cacheCreation5mTokens ?? 0, rate.cacheWrite5m) +
    perMillion(usage.cacheCreation1hTokens ?? 0, rate.cacheWrite1h)
  );
}
