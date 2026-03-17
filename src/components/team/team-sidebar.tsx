"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  ListTodo,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Terminal,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import type { TeamMember, TaskItem, TeamSummaryItem } from "./types";
import { TeamSelector, AgentItem } from "./team-selector";

interface TeamSidebarProps {
  teams: TeamSummaryItem[];
  activeTeam: string;
  onSelectTeam: (name: string) => void;
  onBackToOverview: () => void;
  teamDescription?: string;
  leadSessionId?: string;
  members: TeamMember[];
  pastMembers: TeamMember[];
  memberStatus: Record<string, string>;
  tasks: TaskItem[];
  messages: { from: string; to?: string }[];
  completedCount: number;
  selectedAgent: string;
  onSelectAgent: (name: string) => void;
  msgCount: Record<string, number>;
}

export function TeamSidebar({
  teams,
  activeTeam,
  onSelectTeam,
  onBackToOverview,
  teamDescription,
  leadSessionId,
  members,
  pastMembers,
  memberStatus,
  tasks,
  messages,
  completedCount,
  selectedAgent,
  onSelectAgent,
  msgCount,
}: TeamSidebarProps) {
  const t = useTranslations("team");
  const [showPastAgents, setShowPastAgents] = useState(false);

  return (
    <div className="hidden md:flex w-60 border-r flex-col bg-muted/5">
      {/* Back to overview */}
      <div className="px-2 pt-2">
        <button
          className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/60 transition-colors w-full"
          onClick={onBackToOverview}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{t("allTeams")}</span>
        </button>
      </div>

      {/* Team selector dropdown */}
      <div className="p-2 border-b">
        <TeamSelector
          teams={teams}
          activeTeam={activeTeam}
          onSelect={onSelectTeam}
        />
      </div>

      {/* Team info */}
      {teamDescription !== undefined && (
        <div className="px-3 py-2.5 border-b">
          <div className="text-xs text-muted-foreground line-clamp-2">
            {teamDescription}
          </div>
          <div className="flex gap-2 mt-1.5 text-xs text-muted-foreground">
            <span>{members.length} active{pastMembers.length > 0 ? ` + ${pastMembers.length} past` : ""}</span>
            <span>
              {completedCount}/{tasks.length} tasks
            </span>
          </div>
          {leadSessionId && (
            <Link
              href={`/sessions?session=${leadSessionId}`}
              className="flex items-center gap-1 mt-1.5 text-xs text-primary hover:underline"
            >
              <Terminal className="h-3 w-3" />
              Session: {leadSessionId.slice(0, 8)}...
            </Link>
          )}
        </div>
      )}

      {/* Agents list */}
      <div className="flex-1 overflow-auto p-1.5 space-y-0.5">
        <div
          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm ${
            !selectedAgent
              ? "bg-primary/10 font-medium"
              : "hover:bg-muted/60 text-muted-foreground"
          }`}
          onClick={() => onSelectAgent("")}
        >
          <MessageSquare className="h-4 w-4" />
          <span>{t("allMessages")}</span>
          <Badge
            variant="secondary"
            className="ml-auto text-xs h-5"
          >
            {messages.length}
          </Badge>
        </div>

        {/* Active agents */}
        {members.map((m) => (
          <AgentItem
            key={m.agentId}
            member={m}
            status={memberStatus[m.name] || "idle"}
            currentTask={
              tasks.find(
                (t) =>
                  t.owner === m.name && t.status === "in_progress"
              )?.subject
            }
            isSelected={selectedAgent === m.name}
            onClick={() =>
              onSelectAgent(selectedAgent === m.name ? "" : m.name)
            }
            messageCount={msgCount[m.name] || 0}
          />
        ))}

        {/* Past agents (collapsible) */}
        {pastMembers.length > 0 && (
          <>
            <div
              className="flex items-center gap-1.5 px-2 py-1.5 mt-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowPastAgents(!showPastAgents)}
            >
              {showPastAgents ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <span>{t("pastAgents")} ({pastMembers.length})</span>
            </div>
            {showPastAgents &&
              pastMembers.map((m) => (
                <AgentItem
                  key={m.agentId}
                  member={m}
                  status="terminated"
                  isSelected={selectedAgent === m.name}
                  onClick={() =>
                    onSelectAgent(selectedAgent === m.name ? "" : m.name)
                  }
                  messageCount={msgCount[m.name] || 0}
                />
              ))}
          </>
        )}

        {/* Unassigned tasks indicator */}
        {tasks.filter((t) => !t.owner).length > 0 && (
          <div
            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm mt-1 ${
              selectedAgent === "__unassigned__"
                ? "bg-primary/10 font-medium"
                : "hover:bg-muted/60 text-muted-foreground"
            }`}
            onClick={() =>
              onSelectAgent(
                selectedAgent === "__unassigned__" ? "" : "__unassigned__"
              )
            }
          >
            <ListTodo className="h-4 w-4 text-orange-500" />
            <span>{t("unassigned")}</span>
            <Badge variant="secondary" className="ml-auto text-xs h-5">
              {tasks.filter((t) => !t.owner).length}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
