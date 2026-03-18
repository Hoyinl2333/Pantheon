import type { PipelineNode, PipelineEdge, NodeStatus } from "../types";
import { RESEARCH_SKILLS } from "../skill-data";
import {
  Clock,
  Loader2,
  Check,
  X,
  Lock,
} from "lucide-react";
import { createElement } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FileEntry {
  name: string;
  type: "file" | "directory";
  size?: number;
  modified?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const STATUS_COLORS: Record<NodeStatus, string> = {
  idle: "#71717a",     // zinc-500
  queued: "#60a5fa",   // blue-400
  running: "#f59e0b",  // amber-500
  done: "#22c55e",     // green-500
  error: "#ef4444",    // red-500
  skipped: "#a1a1aa",  // zinc-400
  checkpoint: "#eab308", // yellow-500
};

export const STATUS_ICONS: Record<NodeStatus, React.ReactNode> = {
  idle: createElement(Clock, { className: "h-3.5 w-3.5 text-muted-foreground shrink-0" }),
  queued: createElement(Clock, { className: "h-3.5 w-3.5 text-blue-400 shrink-0" }),
  running: createElement(Loader2, { className: "h-3.5 w-3.5 text-amber-400 animate-spin shrink-0" }),
  done: createElement(Check, { className: "h-3.5 w-3.5 text-green-500 shrink-0" }),
  error: createElement(X, { className: "h-3.5 w-3.5 text-red-500 shrink-0" }),
  skipped: createElement(X, { className: "h-3.5 w-3.5 text-muted-foreground/40 shrink-0" }),
  checkpoint: createElement(Lock, { className: "h-3.5 w-3.5 text-yellow-500 animate-pulse shrink-0" }),
};

export const CATEGORY_OUTPUT_DIR: Record<string, string> = {
  research: "agent-docs/knowledge",
  workflow: "agent-docs/plan",
  experiment: "experiments",
  paper: "paper",
  utility: "agent-docs",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Topological sort of pipeline nodes using Kahn's algorithm. */
export function topologicalSort(nodes: PipelineNode[], edges: PipelineEdge[]): PipelineNode[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  for (const edge of edges) {
    const targets = adjacency.get(edge.source);
    if (targets) targets.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: PipelineNode[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodeMap.get(id);
    if (node) sorted.push(node);
    for (const target of adjacency.get(id) ?? []) {
      const newDeg = (inDegree.get(target) ?? 1) - 1;
      inDegree.set(target, newDeg);
      if (newDeg === 0) queue.push(target);
    }
  }

  // Append any nodes not reached (disconnected)
  for (const node of nodes) {
    if (!sorted.find((s) => s.id === node.id)) {
      sorted.push(node);
    }
  }

  return sorted;
}

export function getSkillName(skillId: string, isZh: boolean): string {
  const skill = RESEARCH_SKILLS.find((s) => s.id === skillId);
  if (!skill) return skillId;
  return isZh ? skill.nameZh : skill.name;
}

export function getSkillCategory(skillId: string): string {
  const skill = RESEARCH_SKILLS.find((s) => s.id === skillId);
  return skill?.category ?? "utility";
}

// ---------------------------------------------------------------------------
// LogLine sub-component
// ---------------------------------------------------------------------------

/** Colored log line for the terminal view */
export function LogLine({ line }: { line: string }) {
  let colorClass = "text-zinc-300";
  if (line.includes("ERROR") || line.includes("error")) {
    colorClass = "text-red-400";
  } else if (line.includes("Completed") || line.includes("completed") || line.includes("SUCCESS")) {
    colorClass = "text-green-400";
  } else if (line.includes("CHECKPOINT") || line.includes("checkpoint") || line.includes("WARNING")) {
    colorClass = "text-yellow-400";
  }

  return createElement("div", { className: `${colorClass} leading-relaxed` }, line);
}
