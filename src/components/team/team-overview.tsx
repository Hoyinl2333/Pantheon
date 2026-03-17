"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  ListTodo,
  RefreshCw,
  Bot,
  Search,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { formatRelativeTime } from "./types";
import type { TeamSummaryItem } from "./types";

export function TeamOverview({
  teams,
  onSelectTeam,
  onRefresh,
}: {
  teams: TeamSummaryItem[];
  onSelectTeam: (name: string) => void;
  onRefresh: () => void;
}) {
  const t = useTranslations("team");
  const tc = useTranslations("common");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = searchQuery.trim()
    ? teams.filter(
        (tm) =>
          tm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tm.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : teams;

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b">
        <Users className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">{t("title")}</h1>
        <Badge variant="secondary" className="text-xs">
          {t("teamCount", { count: teams.length })}
        </Badge>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            {tc("refresh")}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>
      </div>

      {/* Card grid */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Search className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">{t("noTeamsMatch")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filtered.map((team) => {
              const progress =
                team.taskCount > 0
                  ? Math.round((team.completedTasks / team.taskCount) * 100)
                  : 0;

              return (
                <Card
                  key={team.name}
                  className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all py-0 gap-0"
                  onClick={() => onSelectTeam(team.name)}
                >
                  <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold truncate">
                          {team.name}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {team.description || t("noDescription")}
                        </p>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Bot className="h-3.5 w-3.5" />
                        {team.memberCount} {t("agents")}
                      </span>
                      <span className="flex items-center gap-1">
                        <ListTodo className="h-3.5 w-3.5" />
                        {team.completedTasks}/{team.taskCount} {t("tasks")}
                      </span>
                      <span className="flex items-center gap-1 ml-auto">
                        <Clock className="h-3.5 w-3.5" />
                        {formatRelativeTime(team.activeSince)}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{t("progress")}</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
