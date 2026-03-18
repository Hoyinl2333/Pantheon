/**
 * Daily Briefing - Items Route (v2)
 *
 * GET /api/plugins/daily-briefing/items?date=YYYY-MM-DD
 * Reads cached briefing from disk.
 */

import { NextRequest, NextResponse } from "next/server";
import { getBriefing } from "@/plugins/daily-briefing/lib/briefing-store";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const date =
      url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    const briefing = getBriefing(date);
    return NextResponse.json({ briefing });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
