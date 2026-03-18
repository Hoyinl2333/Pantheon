/**
 * Session Reader - Codex session handling
 */

import fs from "fs";
import path from "path";

import type { SessionInfo, SessionDetail, SessionMessage, ProjectInfo } from "./types";
import { CODEX_SESSIONS_DIR, sanitize, detectSessionStatus } from "./helpers";
import { estimateCost } from "./pricing";

/** Parse a Codex rollout JSONL file into SessionInfo */
export function parseCodexSessionFile(filePath: string, fileName: string): SessionInfo | null {
  let content: string;
  try { content = fs.readFileSync(filePath, "utf-8"); } catch { return null; }

  const lines = content.split("\n").filter(l => l.trim());
  if (lines.length === 0) return null;

  let sessionId = "";
  let cwd = "";
  let model = "";
  let firstMessage = "";
  let startTime = 0;
  let lastActive = 0;
  let messageCount = 0;
  let totalInput = 0;
  let totalOutput = 0;

  for (const line of lines) {
    try {
      const obj = JSON.parse(sanitize(line));
      const ts = obj.timestamp ? new Date(obj.timestamp).getTime() : 0;
      if (ts && (!startTime || ts < startTime)) startTime = ts;
      if (ts > lastActive) lastActive = ts;

      if (obj.type === "session_meta") {
        sessionId = obj.payload?.id || "";
        cwd = obj.payload?.cwd || "";
      } else if (obj.type === "turn_context") {
        if (!model && obj.payload?.model) model = obj.payload.model;
      } else if (obj.type === "event_msg") {
        const evtType = obj.payload?.type;
        if (evtType === "user_message") {
          messageCount++;
          if (!firstMessage) firstMessage = (obj.payload.message || "").slice(0, 120);
        } else if (evtType === "agent_message") {
          messageCount++;
        } else if (evtType === "token_count" && obj.payload?.info?.total_token_usage) {
          // Cumulative: always take the latest
          const usage = obj.payload.info.total_token_usage;
          totalInput = usage.input_tokens || 0;
          totalOutput = usage.output_tokens || 0;
        }
      }
    } catch { /* skip */ }
  }

  if (!sessionId) {
    // Extract ID from filename: rollout-{datetime}-{uuid}.jsonl
    const match = fileName.match(/rollout-.*?-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i);
    sessionId = match ? match[1] : fileName.replace(".jsonl", "");
  }

  // Use file stat as fallback for times
  if (!startTime || !lastActive) {
    try {
      const stat = fs.statSync(filePath);
      if (!startTime) startTime = stat.birthtimeMs || stat.ctimeMs;
      if (!lastActive) lastActive = stat.mtimeMs;
    } catch { /* skip */ }
  }

  const projectName = cwd || "Codex Session";

  return {
    id: sessionId,
    project: "__codex__",
    projectName,
    startTime,
    lastActive,
    messageCount,
    firstMessage,
    model,
    provider: "codex",
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
    cacheReadTokens: 0,
    estimatedCost: estimateCost(model, totalInput, totalOutput),
    status: detectSessionStatus(lastActive, lines),
  };
}

/** List all Codex sessions from ~/.codex/sessions/ */
export function listCodexSessions(): SessionInfo[] {
  if (!fs.existsSync(CODEX_SESSIONS_DIR)) return [];
  const sessions: SessionInfo[] = [];

  // Traverse year/month/day directories
  try {
    for (const year of fs.readdirSync(CODEX_SESSIONS_DIR)) {
      const yearDir = path.join(CODEX_SESSIONS_DIR, year);
      try { if (!fs.statSync(yearDir).isDirectory()) continue; } catch { continue; }

      for (const month of fs.readdirSync(yearDir)) {
        const monthDir = path.join(yearDir, month);
        try { if (!fs.statSync(monthDir).isDirectory()) continue; } catch { continue; }

        for (const day of fs.readdirSync(monthDir)) {
          const dayDir = path.join(monthDir, day);
          try { if (!fs.statSync(dayDir).isDirectory()) continue; } catch { continue; }

          for (const file of fs.readdirSync(dayDir)) {
            if (!file.endsWith(".jsonl") || !file.startsWith("rollout-")) continue;
            const session = parseCodexSessionFile(path.join(dayDir, file), file);
            if (session) sessions.push(session);
          }
        }
      }
    }
  } catch { /* skip */ }

  return sessions.sort((a, b) => b.lastActive - a.lastActive);
}

/** Aggregate Codex sessions into a single ProjectInfo entry */
export function getCodexProjectInfo(): ProjectInfo | null {
  const sessions = listCodexSessions();
  if (sessions.length === 0) return null;

  let lastActive = 0;
  for (const s of sessions) {
    if (s.lastActive > lastActive) lastActive = s.lastActive;
  }

  return {
    path: "__codex__",
    name: "Codex CLI",
    sessionCount: sessions.length,
    lastActive,
  };
}

/** Get Codex session detail by session ID */
export function getCodexSessionDetail(sessionId: string): SessionDetail | null {
  // Find the file by scanning session directories
  if (!fs.existsSync(CODEX_SESSIONS_DIR)) return null;

  let targetFile = "";
  try {
    for (const year of fs.readdirSync(CODEX_SESSIONS_DIR)) {
      const yearDir = path.join(CODEX_SESSIONS_DIR, year);
      try { if (!fs.statSync(yearDir).isDirectory()) continue; } catch { continue; }
      for (const month of fs.readdirSync(yearDir)) {
        const monthDir = path.join(yearDir, month);
        try { if (!fs.statSync(monthDir).isDirectory()) continue; } catch { continue; }
        for (const day of fs.readdirSync(monthDir)) {
          const dayDir = path.join(monthDir, day);
          try { if (!fs.statSync(dayDir).isDirectory()) continue; } catch { continue; }
          for (const file of fs.readdirSync(dayDir)) {
            if (file.includes(sessionId)) {
              targetFile = path.join(dayDir, file);
              break;
            }
          }
          if (targetFile) break;
        }
        if (targetFile) break;
      }
      if (targetFile) break;
    }
  } catch { /* skip */ }

  if (!targetFile) return null;

  let content: string;
  try { content = fs.readFileSync(targetFile, "utf-8"); } catch { return null; }

  const lines = content.split("\n").filter(l => l.trim());
  const messages: SessionMessage[] = [];
  let model = "";
  let cwd = "";
  let startTime = "";
  let endTime = "";
  let totalInput = 0;
  let totalOutput = 0;
  const checkpoints: SessionDetail["checkpoints"] = [];

  for (const line of lines) {
    try {
      const obj = JSON.parse(sanitize(line));
      const ts = obj.timestamp || "";

      if (obj.type === "session_meta") {
        cwd = obj.payload?.cwd || "";
        if (!startTime) startTime = obj.payload?.timestamp || ts;
      } else if (obj.type === "turn_context") {
        if (!model && obj.payload?.model) model = obj.payload.model;
      } else if (obj.type === "event_msg") {
        const evtType = obj.payload?.type;

        if (evtType === "user_message") {
          const text = obj.payload.message || "";
          checkpoints.push({ index: messages.length, content: text.slice(0, 100), timestamp: ts });
          messages.push({
            uuid: obj.payload.turn_id || `user-${messages.length}`,
            parentUuid: null,
            role: "user",
            type: "user",
            content: sanitize(text),
            timestamp: ts,
            isCheckpoint: true,
          });
        } else if (evtType === "agent_message") {
          messages.push({
            uuid: `agent-${messages.length}`,
            parentUuid: null,
            role: "assistant",
            type: "assistant",
            content: sanitize(obj.payload.message || ""),
            timestamp: ts,
            model,
          });
        } else if (evtType === "agent_reasoning") {
          // Attach thinking to a pending assistant message or create one
          const lastMsg = messages[messages.length - 1];
          if (lastMsg && lastMsg.role === "assistant" && !lastMsg.thinkingContent) {
            lastMsg.thinkingContent = sanitize((obj.payload.text || "").slice(0, 800));
          } else {
            messages.push({
              uuid: `think-${messages.length}`,
              parentUuid: null,
              role: "assistant",
              type: "assistant",
              content: "",
              timestamp: ts,
              model,
              thinkingContent: sanitize((obj.payload.text || "").slice(0, 800)),
            });
          }
        } else if (evtType === "token_count" && obj.payload?.info?.total_token_usage) {
          const usage = obj.payload.info.total_token_usage;
          totalInput = usage.input_tokens || 0;
          totalOutput = usage.output_tokens || 0;
        }
      }

      if (ts) endTime = ts;
    } catch { /* skip */ }
  }

  const projectPath = cwd ? `codex:${cwd}` : "codex:unknown";

  return {
    id: sessionId,
    project: projectPath,
    projectName: cwd || "Codex Session",
    messages,
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
    cacheReadTokens: 0,
    estimatedCost: estimateCost(model, totalInput, totalOutput),
    model,
    startTime,
    endTime,
    checkpoints,
    contextFiles: [],
  };
}
