/**
 * Session Reader - CSV export data
 */

import type { TokenExportRow } from "./types";
import { listProjects, listSessions } from "./claude-sessions";

export function getTokenExportData(): TokenExportRow[] {
  const projects = listProjects();
  const rows: TokenExportRow[] = [];

  for (const project of projects) {
    const sessions = listSessions(project.path);
    for (const session of sessions) {
      rows.push({
        date: session.startTime ? new Date(session.startTime).toISOString().split("T")[0] : "unknown",
        project: session.projectName,
        sessionId: session.id,
        model: session.model || "unknown",
        inputTokens: session.totalInputTokens,
        outputTokens: session.totalOutputTokens,
        cacheReadTokens: session.cacheReadTokens,
        estimatedCost: session.estimatedCost,
      });
    }
  }

  return rows.sort((a, b) => b.date.localeCompare(a.date));
}
