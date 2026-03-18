/**
 * Daily Briefing - Needs Route
 *
 * GET    /api/plugins/daily-briefing/needs         — List all needs
 * POST   /api/plugins/daily-briefing/needs         — Create a new need
 * PUT    /api/plugins/daily-briefing/needs         — Update a need
 * DELETE /api/plugins/daily-briefing/needs         — Delete a need
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getNeeds,
  addNeed,
  updateNeed,
  deleteNeed,
} from "@/plugins/daily-briefing/lib/briefing-store";
import type { InfoNeed, SearchStrategy } from "@/plugins/daily-briefing/types";

function generateId(): string {
  return `need-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function GET() {
  try {
    const needs = getNeeds();
    return NextResponse.json({ needs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, tags, strategy, enabled } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 },
      );
    }

    if (!strategy) {
      return NextResponse.json(
        { error: "strategy is required" },
        { status: 400 },
      );
    }

    const need: InfoNeed = {
      id: generateId(),
      name: name.trim(),
      description: (description ?? "").trim(),
      tags: Array.isArray(tags) ? tags : [],
      strategy: strategy as SearchStrategy,
      enabled: enabled !== false,
      createdAt: new Date().toISOString(),
    };

    const needs = addNeed(need);
    return NextResponse.json({ needs, created: need });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...patch } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 },
      );
    }

    const needs = updateNeed(id, patch);
    return NextResponse.json({ needs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 },
      );
    }

    const needs = deleteNeed(id);
    return NextResponse.json({ needs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
