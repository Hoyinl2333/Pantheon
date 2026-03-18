/**
 * Session Reader - Helpers & constants
 */

import path from "path";
import os from "os";

import type { SessionProvider, SessionStatus } from "./types";

export const CLAUDE_DIR = path.join(os.homedir(), ".claude");
export const PROJECTS_DIR = path.join(CLAUDE_DIR, "projects");
export const CODEX_DIR = path.join(os.homedir(), ".codex");
export const CODEX_SESSIONS_DIR = path.join(CODEX_DIR, "sessions");

export function sanitize(s: string): string {
  return s.replace(/[\uD800-\uDFFF]/g, "\uFFFD");
}

export function decodeProjectName(entry: string): string {
  return entry.replace(/^([A-Z])--/, "$1:/").replace(/-/g, "/");
}

/** Detect provider from model name */
export function detectProvider(model: string): SessionProvider {
  if (!model) return "unknown";
  const m = model.toLowerCase();
  if (m.includes("claude")) return "claude";
  if (m.includes("gpt") || m.includes("o3") || m.includes("o4") || m.includes("codex")) return "codex";
  return "unknown";
}

export const WRITE_TOOLS = new Set(["Write", "Edit", "NotebookEdit"]);
export const READ_TOOLS = new Set(["Read", "Glob", "Grep", "WebFetch", "WebSearch"]);

export function detectSessionStatus(
  lastActive: number,
  lines: string[],
): SessionStatus {
  const age = Date.now() - lastActive;
  const isRecent = age < 5 * 60 * 1000;    // < 5 min
  const isWarm = age < 60 * 60 * 1000;     // < 1 hour

  // Analyze last few lines for state
  const tail = lines.slice(-5);
  let lastRole = "";
  let lastToolNames: string[] = [];
  let hasError = false;

  for (const line of tail) {
    try {
      const obj = JSON.parse(sanitize(line));
      if (obj.type === "user") lastRole = "user";
      else if (obj.type === "assistant") {
        lastRole = "assistant";
        lastToolNames = [];
        if (Array.isArray(obj.message?.content)) {
          for (const block of obj.message.content) {
            if (block.type === "tool_use") lastToolNames.push(block.name);
          }
        }
      }
      // Detect error indicators
      if (obj.type === "assistant" && obj.message?.stop_reason === "error") hasError = true;
      if (obj.type === "result" && obj.error) hasError = true;
    } catch { /* skip */ }
  }

  if (hasError && isWarm) return "error";

  if (isRecent) {
    if (lastRole === "user") return "waiting";
    if (lastToolNames.some(t => WRITE_TOOLS.has(t))) return "writing";
    if (lastToolNames.some(t => READ_TOOLS.has(t))) return "reading";
    if (lastRole === "assistant") return "thinking";
    return "waiting";
  }

  if (isWarm) return "completed";
  return "idle";
}
