import { NextRequest, NextResponse } from "next/server";
import { getTokenSummary } from "@/lib/session-reader";
import type { SessionProvider, TokenSummary } from "@/lib/session-reader";

export const dynamic = "force-dynamic";

const VALID_PROVIDERS = new Set<SessionProvider>(["claude", "codex", "unknown"]);

// ---- In-memory cache: keyed by provider filter ----
const tokenCache = new Map<string, { data: TokenSummary; timestamp: number }>();
const CACHE_TTL_MS = 120_000; // 2 minutes – tokens data is expensive to compute

export function GET(request: NextRequest) {
  const providerParam = request.nextUrl.searchParams.get("provider");
  const provider = providerParam && VALID_PROVIDERS.has(providerParam as SessionProvider)
    ? (providerParam as SessionProvider)
    : undefined;

  const cacheKey = provider || "__all__";
  const now = Date.now();
  const cached = tokenCache.get(cacheKey);

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  const summary = getTokenSummary(provider);
  tokenCache.set(cacheKey, { data: summary, timestamp: now });
  return NextResponse.json(summary);
}
