/**
 * Session Reader - Token summary aggregation
 */

import fs from "fs";
import path from "path";

import type { SessionProvider, TokenSummary } from "./types";
import { PROJECTS_DIR, sanitize, detectProvider } from "./helpers";
import { estimateCost } from "./pricing";
import { listProjects } from "./claude-sessions";
import { listCodexSessions } from "./codex-sessions";

export function getTokenSummary(provider?: SessionProvider): TokenSummary {
  const projects = listProjects();
  let totalInput = 0, totalOutput = 0, totalCacheRead = 0, totalCost = 0;
  const byModel: TokenSummary["byModel"] = {};
  const byDate: TokenSummary["byDate"] = {};
  let sessionCount = 0;
  // Track unique sessions per date for accurate session counts
  const dateSessionSets = new Map<string, Set<string>>();

  for (const project of projects) {
    const projectDir = path.join(PROJECTS_DIR, project.path);
    let files: string[];
    try { files = fs.readdirSync(projectDir); } catch { continue; }

    for (const file of files) {
      if (!file.endsWith(".jsonl") || file === "memory.jsonl") continue;

      const filePath = path.join(projectDir, file);
      let content: string;
      try { content = fs.readFileSync(filePath, "utf-8"); } catch { continue; }

      const lines = content.split("\n").filter((l) => l.trim());
      let sessionModel = "";
      let fileMtimeDate = "";

      // If provider filter is set, first detect the session model to decide whether to skip
      if (provider) {
        for (const line of lines) {
          try {
            const obj = JSON.parse(sanitize(line));
            if (obj.type === "assistant" && obj.message?.model) {
              sessionModel = obj.message.model;
              break;
            }
          } catch { /* skip */ }
        }
        const sessionProvider = detectProvider(sessionModel);
        if (sessionProvider !== provider) continue;
      }

      sessionCount++;

      for (const line of lines) {
        try {
          const obj = JSON.parse(sanitize(line));
          const msg = obj.message;
          if (!msg) continue;

          // Track model for the session
          if (msg.model && !sessionModel) sessionModel = msg.model;

          const usage = msg.usage;
          if (!usage) continue;

          const inp = usage.input_tokens || 0;
          const out = usage.output_tokens || 0;
          const cache = usage.cache_read_input_tokens || 0;
          const m = msg.model || sessionModel || "unknown";
          const msgCost = estimateCost(m, inp, out);

          totalInput += inp;
          totalOutput += out;
          totalCacheRead += cache;
          totalCost += msgCost;

          // byModel accumulation
          if (!byModel[m]) byModel[m] = { input: 0, output: 0, cost: 0, sessions: 0 };
          byModel[m].input += inp;
          byModel[m].output += out;
          byModel[m].cost += msgCost;

          // byDate: use the message's own timestamp for accurate daily attribution
          let date = "unknown";
          if (obj.timestamp) {
            try { date = new Date(obj.timestamp).toISOString().split("T")[0]; } catch { /* skip */ }
          }
          if (date === "unknown") {
            // Lazy-load file mtime as fallback
            if (!fileMtimeDate) {
              try { fileMtimeDate = new Date(fs.statSync(filePath).mtimeMs).toISOString().split("T")[0]; }
              catch { fileMtimeDate = "unknown"; }
            }
            date = fileMtimeDate;
          }

          if (!byDate[date]) byDate[date] = { input: 0, output: 0, cost: 0, sessions: 0, byModel: {} };
          byDate[date].input += inp;
          byDate[date].output += out;
          byDate[date].cost += msgCost;

          if (!byDate[date].byModel) byDate[date].byModel = {};
          if (!byDate[date].byModel![m]) byDate[date].byModel![m] = { cost: 0 };
          byDate[date].byModel![m].cost += msgCost;

          // Track which sessions had messages on each date
          if (!dateSessionSets.has(date)) dateSessionSets.set(date, new Set());
          dateSessionSets.get(date)!.add(file);
        } catch { /* skip */ }
      }

      // Count sessions per model
      if (sessionModel && byModel[sessionModel]) {
        byModel[sessionModel].sessions++;
      }
    }
  }

  // Set accurate session counts per date
  for (const [date, sessSet] of dateSessionSets) {
    if (byDate[date]) byDate[date].sessions = sessSet.size;
  }

  // Include Codex sessions
  const codexSessions = listCodexSessions();
  for (const cs of codexSessions) {
    // Apply provider filter
    if (provider && cs.provider !== provider) continue;

    sessionCount++;
    const m = cs.model || "unknown";
    const inp = cs.totalInputTokens;
    const out = cs.totalOutputTokens;
    const cost = cs.estimatedCost;

    totalInput += inp;
    totalOutput += out;
    totalCost += cost;

    if (!byModel[m]) byModel[m] = { input: 0, output: 0, cost: 0, sessions: 0 };
    byModel[m].input += inp;
    byModel[m].output += out;
    byModel[m].cost += cost;
    byModel[m].sessions++;

    // Date from startTime
    let date = "unknown";
    if (cs.startTime) {
      try { date = new Date(cs.startTime).toISOString().split("T")[0]; } catch { /* skip */ }
    }

    if (!byDate[date]) byDate[date] = { input: 0, output: 0, cost: 0, sessions: 0, byModel: {} };
    byDate[date].input += inp;
    byDate[date].output += out;
    byDate[date].cost += cost;
    byDate[date].sessions++;

    if (!byDate[date].byModel) byDate[date].byModel = {};
    if (!byDate[date].byModel![m]) byDate[date].byModel![m] = { cost: 0 };
    byDate[date].byModel![m].cost += cost;
  }

  return { totalInput, totalOutput, totalCacheRead, totalCost, byModel, byDate, sessionCount };
}
