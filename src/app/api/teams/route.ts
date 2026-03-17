import { NextResponse } from "next/server";
import { getAllTeamsSummary } from "@/lib/claude-reader";

export const dynamic = "force-dynamic";

// ---- In-memory cache ----
let cachedTeams: ReturnType<typeof getAllTeamsSummary> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 60 seconds – team data rarely changes

export function GET() {
  const now = Date.now();
  if (!cachedTeams || now - cacheTimestamp > CACHE_TTL_MS) {
    cachedTeams = getAllTeamsSummary();
    cacheTimestamp = now;
  }
  return NextResponse.json(cachedTeams);
}
