import {
  Bot,
  Crown,
  Cpu,
  Search,
  Microscope,
} from "lucide-react";

// ---- Types ----

export interface TeamMember {
  name: string;
  agentId: string;
  agentType: string;
  model: string;
  color?: string;
}

export interface TaskItem {
  id: string;
  subject: string;
  description?: string;
  status: "pending" | "in_progress" | "completed";
  owner?: string;
  activeForm?: string;
  blockedBy?: string[];
  blocks?: string[];
}

export interface TeamMessage {
  from: string;
  to?: string;
  text: string;
  summary?: string;
  timestamp: string;
}

export interface TeamData {
  config: {
    name: string;
    description: string;
    createdAt: number;
    members: TeamMember[];
    leadSessionId?: string;
  };
  tasks: TaskItem[];
  messages: TeamMessage[];
  memberStatus: Record<string, "working" | "idle" | "completed" | "stale" | "terminated">;
  pastMembers: TeamMember[];
}

export interface TeamSummaryItem {
  name: string;
  description: string;
  memberCount: number;
  taskCount: number;
  completedTasks: number;
  activeSince: number;
}

export interface TeamSummary {
  teams: TeamSummaryItem[];
}

// ---- Helpers ----

export function formatTime(ts: string) {
  try {
    return new Date(ts).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function formatRelativeTime(epochMs: number): string {
  const now = Date.now();
  const diffMs = now - epochMs;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(epochMs).toLocaleDateString();
}

// Agent type -> icon + color
export const AGENT_STYLES: Record<
  string,
  { icon: typeof Bot; color: string; bg: string }
> = {
  "team-lead": {
    icon: Crown,
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/40",
  },
  "general-purpose": {
    icon: Cpu,
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/40",
  },
  researcher: {
    icon: Search,
    color: "text-green-600",
    bg: "bg-green-100 dark:bg-green-900/40",
  },
  Explore: {
    icon: Microscope,
    color: "text-purple-600",
    bg: "bg-purple-100 dark:bg-purple-900/40",
  },
};

export function getAgentStyle(agentType: string, name: string) {
  if (name.includes("lead")) return AGENT_STYLES["team-lead"];
  if (name.includes("research"))
    return AGENT_STYLES["researcher"] || AGENT_STYLES["general-purpose"];
  return AGENT_STYLES[agentType] || AGENT_STYLES["general-purpose"];
}

export const STATUS_DOT: Record<string, string> = {
  working: "bg-green-500 animate-pulse",
  idle: "bg-gray-400",
  completed: "bg-blue-500",
  stale: "bg-amber-500 animate-pulse",
  terminated: "bg-red-400",
};
