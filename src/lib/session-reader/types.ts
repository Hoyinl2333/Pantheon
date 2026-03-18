/**
 * Session Reader - Type definitions
 */

export type SessionStatus =
  | "reading"    // Last action: reading files (cyan)
  | "thinking"   // Last action: assistant responding (orange)
  | "writing"    // Last action: writing/editing files (purple)
  | "waiting"    // Waiting for user input (yellow)
  | "completed"  // Finished normally (green)
  | "error"      // Error state (red)
  | "idle";      // Inactive/old (gray)

export type SessionProvider = "claude" | "codex" | "unknown";

export interface SessionInfo {
  id: string;
  project: string;
  projectName: string;
  startTime: number;
  lastActive: number;
  messageCount: number;
  firstMessage?: string;
  model?: string;
  provider: SessionProvider;
  totalInputTokens: number;
  totalOutputTokens: number;
  cacheReadTokens: number;
  estimatedCost: number;
  status: SessionStatus;
}

export interface SessionMessage {
  uuid: string;
  parentUuid: string | null;
  role: "user" | "assistant" | "system";
  type: string;
  content: string;
  timestamp: string;
  model?: string;
  toolUse?: { name: string; input?: string }[];
  inputTokens?: number;
  outputTokens?: number;
  cacheRead?: number;
  thinkingContent?: string;
  /** Original content array from JSONL; required unchanged for last assistant message when calling Anthropic API. */
  rawContent?: unknown[];
  isCheckpoint?: boolean; // user messages = checkpoints
}

export interface SessionDetail {
  id: string;
  project: string;
  projectName: string;
  messages: SessionMessage[];
  totalInputTokens: number;
  totalOutputTokens: number;
  cacheReadTokens: number;
  estimatedCost: number;
  model?: string;
  startTime: string;
  endTime: string;
  checkpoints: { index: number; content: string; timestamp: string }[];
  contextFiles: string[]; // referenced files like CLAUDE.md
}

export interface ProjectInfo {
  path: string;
  name: string;
  sessionCount: number;
  lastActive: number;
}

export interface TokenSummary {
  totalInput: number;
  totalOutput: number;
  totalCacheRead: number;
  totalCost: number;
  byModel: Record<string, { input: number; output: number; cost: number; sessions: number }>;
  byDate: Record<string, { input: number; output: number; cost: number; sessions: number; byModel?: Record<string, { cost: number }> }>;
  sessionCount: number;
}

export interface TokenExportRow {
  date: string;
  project: string;
  sessionId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  estimatedCost: number;
}

export interface ProjectsSummary {
  projects: ProjectInfo[];
  totalSessions: number;
  recentSessions: SessionInfo[];
}
