/**
 * Daily Briefing - Config Route
 *
 * GET  /api/plugins/daily-briefing/config — Read config
 * PUT  /api/plugins/daily-briefing/config — Write config
 *
 * Persists to ~/.claude/ptn-data/daily-briefing/config.json
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

function configDir(): string {
  return path.join(os.homedir(), ".claude", "ptn-data", "daily-briefing");
}

function configPath(): string {
  return path.join(configDir(), "config.json");
}

function ensureDir(): void {
  const dir = configDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export async function GET() {
  try {
    const fp = configPath();
    if (!fs.existsSync(fp)) {
      return NextResponse.json({ config: null });
    }
    const data = JSON.parse(fs.readFileSync(fp, "utf-8"));
    return NextResponse.json({ config: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    ensureDir();
    fs.writeFileSync(configPath(), JSON.stringify(body, null, 2), "utf-8");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
