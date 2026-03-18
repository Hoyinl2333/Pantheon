/**
 * Daily Briefing - Feedback Route
 *
 * POST /api/plugins/daily-briefing/feedback
 * Save user feedback on a briefing item (good/bad/star) or mark as read.
 */

import { NextRequest, NextResponse } from "next/server";
import { updateBriefingItem } from "@/plugins/daily-briefing/lib/briefing-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { itemId, date, feedback, markRead } = body;

    if (!itemId || !date) {
      return NextResponse.json(
        { error: "itemId and date are required" },
        { status: 400 },
      );
    }

    const patch: Record<string, unknown> = {};

    if (feedback === "good" || feedback === "bad" || feedback === "star") {
      patch.userFeedback = feedback;
      if (feedback === "star") {
        // Toggle favorite — we need to read the current state
        // For simplicity, just set it; the client handles toggle logic
        patch.isFavorite = true;
      }
    }

    if (markRead) {
      patch.isRead = true;
    }

    const updated = updateBriefingItem(date, itemId, patch);
    if (!updated) {
      return NextResponse.json(
        { error: "Briefing or item not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
