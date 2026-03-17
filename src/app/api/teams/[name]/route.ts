import { NextRequest, NextResponse } from "next/server";
import { getTeamOverview } from "@/lib/claude-reader";

export const dynamic = "force-dynamic";

// Per-team cache with 30s TTL
const cache = new Map<string, { data: ReturnType<typeof getTeamOverview>; ts: number }>();
const CACHE_TTL_MS = 30_000;

export function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  return params.then(({ name }) => {
    const now = Date.now();
    const cached = cache.get(name);
    if (cached && now - cached.ts < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    const overview = getTeamOverview(name);
    if (!overview) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    cache.set(name, { data: overview, ts: now });
    return NextResponse.json(overview);
  });
}
