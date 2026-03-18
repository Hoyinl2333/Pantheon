/**
 * Session Reader - Aggregate functions (getRecentSessions, getProjectsSummary)
 */

import type { SessionInfo, ProjectsSummary } from "./types";
import { listProjects, listSessions } from "./claude-sessions";
import { listCodexSessions } from "./codex-sessions";

export function getRecentSessions(limit: number = 30): SessionInfo[] {
  const allSessions: SessionInfo[] = [];

  // Claude sessions from each project
  const projects = listProjects().filter(p => p.path !== "__codex__");
  for (const project of projects) {
    allSessions.push(...listSessions(project.path));
  }

  // Codex sessions
  allSessions.push(...listCodexSessions());

  return allSessions.sort((a, b) => b.lastActive - a.lastActive).slice(0, limit);
}

export function getProjectsSummary(): ProjectsSummary {
  const projects = listProjects();
  const totalSessions = projects.reduce((s, p) => s + p.sessionCount, 0);
  const recentSessions = getRecentSessions(9999);
  return { projects, totalSessions, recentSessions };
}
