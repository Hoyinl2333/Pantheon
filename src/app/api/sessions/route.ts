import { NextResponse } from "next/server";
import { getProjectsSummary } from "@/lib/session-reader";

export const dynamic = "force-dynamic";

// ---- In-memory cache to avoid re-reading all JSONL files on every poll ----
let cachedSummary: ReturnType<typeof getProjectsSummary> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 120_000; // 2 minutes – avoid re-reading JSONL on every navigation

export function GET() {
  const now = Date.now();
  if (!cachedSummary || now - cacheTimestamp > CACHE_TTL_MS) {
    cachedSummary = getProjectsSummary();
    cacheTimestamp = now;
  }
  return NextResponse.json(cachedSummary);
}
