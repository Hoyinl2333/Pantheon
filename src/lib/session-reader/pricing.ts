/**
 * Session Reader - Pricing & cost estimation
 */

import { detectProvider } from "./helpers";

// Model pricing (USD per million tokens)
export const PRICING: Record<string, { input: number; output: number }> = {
  // Claude models
  "claude-opus-4-6": { input: 15.0, output: 75.0 },
  "claude-sonnet-4-5": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5": { input: 0.8, output: 4.0 },
  // Codex / OpenAI models
  "gpt-5.2-codex": { input: 2.0, output: 8.0 },
  "gpt-5.3-codex": { input: 2.0, output: 8.0 },
  "o3-pro": { input: 20.0, output: 80.0 },
  "o3": { input: 10.0, output: 40.0 },
  "o4-mini": { input: 1.1, output: 4.4 },
  "gpt-4.1": { input: 2.0, output: 8.0 },
};

export function estimateCost(model: string, input: number, output: number): number {
  if (!model) {
    const p = PRICING["claude-sonnet-4-5"];
    return (input * p.input + output * p.output) / 1_000_000;
  }
  // Direct match first
  if (PRICING[model]) {
    const p = PRICING[model];
    return (input * p.input + output * p.output) / 1_000_000;
  }
  // Partial match for Claude models
  const key = Object.keys(PRICING).find((k) => model.includes(k.split("-").slice(1, 3).join("-")));
  // Fallback: detect provider to pick a sensible default
  const provider = detectProvider(model);
  const fallbackKey = provider === "codex" ? "gpt-5.2-codex" : "claude-sonnet-4-5";
  const p = key ? PRICING[key] : PRICING[fallbackKey];
  return (input * p.input + output * p.output) / 1_000_000;
}
