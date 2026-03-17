/**
 * Usage History API
 * GET /api/plugins/api-management/usage-history?id=xxx&days=30  — Single key history
 * GET /api/plugins/api-management/usage-history?days=30         — All keys aggregated
 */

import { NextRequest, NextResponse } from "next/server";
import { getDailySnapshots, getAllKeysDailySnapshots } from "@/lib/api-vault/key-store";

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    const days = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get("days") || "30", 10) || 30, 1), 365);

    if (id) {
      const snapshots = getDailySnapshots(id, days);
      return NextResponse.json({ snapshots });
    }

    // Aggregated across all keys
    const snapshots = getAllKeysDailySnapshots(days);
    return NextResponse.json({ snapshots });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
