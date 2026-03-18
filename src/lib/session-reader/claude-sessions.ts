/**
 * Session Reader - Claude session handling (listProjects, listSessions, getSessionDetail)
 */

import fs from "fs";
import path from "path";

import type { SessionInfo, SessionDetail, SessionMessage, SessionStatus, ProjectInfo } from "./types";
import { PROJECTS_DIR, sanitize, decodeProjectName, detectProvider, detectSessionStatus } from "./helpers";
import { estimateCost } from "./pricing";
import { getCodexProjectInfo, listCodexSessions, getCodexSessionDetail } from "./codex-sessions";

// ---- Project listing ----

export function listProjects(): ProjectInfo[] {
  const projects: ProjectInfo[] = [];

  // Claude projects
  if (fs.existsSync(PROJECTS_DIR)) {
    try {
      for (const entry of fs.readdirSync(PROJECTS_DIR)) {
        const fullPath = path.join(PROJECTS_DIR, entry);
        try {
          if (!fs.statSync(fullPath).isDirectory()) continue;
        } catch { continue; }

        let sessionCount = 0;
        let lastActive = 0;
        try {
          for (const file of fs.readdirSync(fullPath)) {
            if (!file.endsWith(".jsonl")) continue;
            if (file === "memory") continue;
            sessionCount++;
            try {
              const stat = fs.statSync(path.join(fullPath, file));
              if (stat.mtimeMs > lastActive) lastActive = stat.mtimeMs;
            } catch { /* skip */ }
          }
        } catch { /* skip */ }

        projects.push({
          path: entry,
          name: decodeProjectName(entry),
          sessionCount,
          lastActive,
        });
      }
    } catch { /* skip */ }
  }

  // Codex project (aggregated)
  const codexProject = getCodexProjectInfo();
  if (codexProject) projects.push(codexProject);

  return projects.sort((a, b) => b.lastActive - a.lastActive);
}

// ---- Session listing (reads headers + tail for status) ----

export function listSessions(projectPath: string): SessionInfo[] {
  // Route Codex project to Codex session listing
  if (projectPath === "__codex__") return listCodexSessions();

  const projectDir = path.join(PROJECTS_DIR, projectPath);
  if (!fs.existsSync(projectDir)) return [];
  const sessions: SessionInfo[] = [];
  const projectName = decodeProjectName(projectPath);

  try {
    for (const file of fs.readdirSync(projectDir)) {
      if (!file.endsWith(".jsonl")) continue;
      const sessionId = file.replace(".jsonl", "");
      if (sessionId === "memory") continue;

      const filePath = path.join(projectDir, file);
      let startTime = 0;
      let lastActive = 0;
      let messageCount = 0;
      let firstMessage = "";
      let model = "";
      let totalInput = 0;
      let totalOutput = 0;
      let cacheRead = 0;
      let status: SessionStatus = "idle";

      try {
        const stat = fs.statSync(filePath);
        startTime = stat.birthtimeMs || stat.ctimeMs;
        lastActive = stat.mtimeMs;

        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split("\n").filter((l) => l.trim());
        messageCount = lines.length;

        // Scan all lines for usage totals + metadata
        for (let li = 0; li < lines.length; li++) {
          try {
            const obj = JSON.parse(sanitize(lines[li]));
            // First message: only from first 30 lines for performance
            if (li < 30) {
              if (obj.type === "user" && !firstMessage && obj.message?.content) {
                const c = obj.message.content;
                firstMessage =
                  typeof c === "string" ? c.slice(0, 120) :
                    Array.isArray(c) ? (c.find((b: { type: string; text?: string }) => b.type === "text")?.text || "").slice(0, 120) : "";
              }
            }
            // Model detection: scan ALL lines
            if (obj.type === "assistant" && obj.message?.model && !model) {
              model = obj.message.model;
            }
            // Usage: accumulate from ALL lines
            const usage = obj.message?.usage;
            if (usage) {
              totalInput += usage.input_tokens || 0;
              totalOutput += usage.output_tokens || 0;
              cacheRead += usage.cache_read_input_tokens || 0;
            }
          } catch { /* skip */ }
        }

        // Detect status from tail
        status = detectSessionStatus(lastActive, lines);
      } catch { /* skip */ }

      sessions.push({
        id: sessionId, project: projectPath, projectName,
        startTime, lastActive, messageCount, firstMessage, model,
        provider: detectProvider(model),
        totalInputTokens: totalInput, totalOutputTokens: totalOutput,
        cacheReadTokens: cacheRead,
        estimatedCost: estimateCost(model, totalInput, totalOutput),
        status,
      });
    }
  } catch { /* skip */ }
  return sessions.sort((a, b) => b.lastActive - a.lastActive);
}

// ---- Session Detail (full conversation) ----

export function getSessionDetail(
  projectPath: string, sessionId: string
): SessionDetail | null {
  // Route Codex sessions to the Codex reader
  if (projectPath === "__codex__") {
    return getCodexSessionDetail(sessionId);
  }

  const filePath = path.join(PROJECTS_DIR, projectPath, `${sessionId}.jsonl`);
  if (!fs.existsSync(filePath)) return null;

  const messages: SessionMessage[] = [];
  let totalInput = 0, totalOutput = 0, cacheReadTotal = 0;
  let model = "";
  let startTime = "", endTime = "";
  const checkpoints: SessionDetail["checkpoints"] = [];
  const contextFilesSet = new Set<string>();

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());

    for (const line of lines) {
      try {
        const obj = JSON.parse(sanitize(line));
        if (!obj.type || obj.type === "file-history-snapshot" || obj.isSnapshotUpdate) continue;
        const msg = obj.message;
        if (!msg) continue;

        let textContent = "";
        let thinkingContent = "";
        const toolUse: { name: string; input?: string }[] = [];

        if (typeof msg.content === "string") {
          textContent = msg.content;
        } else if (Array.isArray(msg.content)) {
          for (const block of msg.content) {
            if (block.type === "text") textContent += (textContent ? "\n" : "") + (block.text || "");
            else if (block.type === "thinking") thinkingContent += block.thinking || "";
            else if (block.type === "tool_use") {
              const inputStr = typeof block.input === "string"
                ? block.input : JSON.stringify(block.input || {});
              toolUse.push({ name: block.name, input: inputStr.slice(0, 1500) });
              // Track referenced files
              if (block.name === "Read" || block.name === "Edit" || block.name === "Write") {
                const fp = block.input?.file_path;
                if (fp && (fp.endsWith(".md") || fp.endsWith(".json") || fp.endsWith(".ts") || fp.endsWith(".tsx") || fp.endsWith(".py"))) {
                  contextFilesSet.add(fp);
                }
              }
            }
          }
        }

        const usage = msg.usage;
        if (usage) {
          totalInput += usage.input_tokens || 0;
          totalOutput += usage.output_tokens || 0;
          cacheReadTotal += usage.cache_read_input_tokens || 0;
        }
        if (!model && msg.model) model = msg.model;

        const ts = obj.timestamp || "";
        if (!startTime) startTime = ts;
        endTime = ts;

        const isUser = msg.role === "user" || obj.type === "user";
        if (isUser && textContent.trim()) {
          checkpoints.push({
            index: messages.length,
            content: textContent.slice(0, 100),
            timestamp: ts,
          });
        }

        messages.push({
          uuid: obj.uuid || "",
          parentUuid: obj.parentUuid || null,
          role: msg.role || obj.type,
          type: obj.type,
          content: sanitize(textContent),
          timestamp: ts,
          model: msg.model,
          toolUse: toolUse.length > 0 ? toolUse : undefined,
          inputTokens: usage?.input_tokens,
          outputTokens: usage?.output_tokens,
          cacheRead: usage?.cache_read_input_tokens,
          thinkingContent: thinkingContent ? sanitize(thinkingContent.slice(0, 800)) : undefined,
          isCheckpoint: isUser && !!textContent.trim(),
        });
      } catch { /* skip */ }
    }
  } catch { return null; }

  return {
    id: sessionId, project: projectPath,
    projectName: decodeProjectName(projectPath),
    messages, totalInputTokens: totalInput, totalOutputTokens: totalOutput,
    cacheReadTokens: cacheReadTotal,
    estimatedCost: estimateCost(model, totalInput, totalOutput),
    model, startTime, endTime, checkpoints,
    contextFiles: Array.from(contextFilesSet).slice(0, 50),
  };
}
