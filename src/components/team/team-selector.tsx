"use client";

import { useEffect, useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { getAgentStyle, STATUS_DOT } from "./types";
import type { TeamMember, TeamSummaryItem } from "./types";
import { shortModel } from "@/lib/format-utils";
import { Loader2 } from "lucide-react";

// ---- Agent Item (used in sidebar) ----

export function AgentItem({
  member,
  status,
  currentTask,
  isSelected,
  onClick,
  messageCount,
}: {
  member: TeamMember;
  status: string;
  currentTask?: string;
  isSelected: boolean;
  onClick: () => void;
  messageCount: number;
}) {
  const style = getAgentStyle(member.agentType, member.name);
  const Icon = style.icon;

  return (
    <div
      className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all ${
        isSelected
          ? "bg-primary/10 ring-1 ring-primary"
          : "hover:bg-muted/60"
      }`}
      onClick={onClick}
    >
      <div className="relative flex-shrink-0">
        <div
          className={`h-9 w-9 rounded-full flex items-center justify-center ${style.bg}`}
        >
          <Icon className={`h-4 w-4 ${style.color}`} />
        </div>
        <div
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${STATUS_DOT[status] || STATUS_DOT.idle}`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{member.name}</div>
        <div className="text-xs text-muted-foreground">
          {member.model !== "unknown" ? shortModel(member.model) : ""}
          {status === "terminated" && (
            <span className="text-red-400 ml-1">{member.model !== "unknown" ? "· " : ""}Terminated</span>
          )}
          {status === "stale" && (
            <span className="text-amber-500 ml-1">· Stale</span>
          )}
          {status === "working" && currentTask && (
            <span className="text-blue-500 ml-1">
              · {currentTask.slice(0, 20)}
            </span>
          )}
        </div>
      </div>
      {messageCount > 0 && (
        <Badge
          variant="secondary"
          className="text-xs h-5 min-w-5 justify-center"
        >
          {messageCount}
        </Badge>
      )}
    </div>
  );
}

// ---- Team Selector Dropdown ----

export function TeamSelector({
  teams,
  activeTeam,
  onSelect,
}: {
  teams: TeamSummaryItem[];
  activeTeam: string;
  onSelect: (name: string) => void;
}) {
  const t = useTranslations("team");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = teams.find((t) => t.name === activeTeam);

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors w-full"
        onClick={() => setOpen(!open)}
      >
        <Users className="h-4 w-4 text-primary" />
        <div className="flex-1 text-left min-w-0">
          <div className="text-sm font-medium truncate">
            {current?.name || t("selectTeam")}
          </div>
          {current && (
            <div className="text-xs text-muted-foreground">
              {current.memberCount} agents ·{" "}
              {current.completedTasks}/{current.taskCount} tasks
            </div>
          )}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 overflow-hidden">
          {teams.map((t) => (
            <button
              key={t.name}
              className={`w-full text-left px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors border-b last:border-b-0 ${
                activeTeam === t.name ? "bg-primary/5" : ""
              }`}
              onClick={() => {
                onSelect(t.name);
                setOpen(false);
              }}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{t.name}</span>
                <Badge variant="outline" className="text-xs ml-auto">
                  {t.completedTasks}/{t.taskCount}
                </Badge>
              </div>
              {t.description && (
                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {t.description}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
