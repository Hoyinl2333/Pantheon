import type { SkillCategory } from "../types";

/** Generate a unique attachment ID */
export function generateAttachmentId(): string {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Accepted file types for attachment upload */
export const ACCEPT_FILE_TYPES =
  ".jsonl,.pdf,.csv,.py,.json,.txt,.md,.bib,.tex,.yaml,.yml";

/** Category -> color for mini DAG dots */
export const CATEGORY_DOT_COLORS: Record<SkillCategory, string> = {
  workflow: "#8b5cf6",
  research: "#3b82f6",
  experiment: "#f59e0b",
  paper: "#10b981",
  utility: "#6b7280",
};

/** Estimate pipeline time based on node count */
export function estimateTime(nodeCount: number, isZh: boolean): string {
  if (isZh) {
    if (nodeCount <= 3) return "~10 分钟";
    if (nodeCount <= 6) return "~30 分钟";
    if (nodeCount <= 10) return "~1 小时";
    return "~2+ 小时";
  }
  if (nodeCount <= 3) return "~10 min";
  if (nodeCount <= 6) return "~30 min";
  if (nodeCount <= 10) return "~1 hr";
  return "~2+ hr";
}

/** Truncate text to a max length */
export function truncate(text: string, max: number): string {
  const cleaned = text.replace(/\n/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max) + "...";
}
