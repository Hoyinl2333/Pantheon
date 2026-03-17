"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, ListTodo, CheckCircle, FolderOpen, Cpu, Clock,
  ArrowRight, Wrench, FileEdit, Coins, Zap, Activity, Star,
  KeyRound, AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { fmtCost, fmtTokens, timeAgo, shortModel } from "@/lib/format-utils";
import dynamic from "next/dynamic";
import { useFavorites } from "@/hooks/use-favorites";

const HomeSparkline = dynamic(
  () => import("@/components/home-sparkline").then((m) => ({ default: m.HomeSparkline })),
  { ssr: false, loading: () => <Skeleton className="h-[60px] w-full" /> }
);
import { useTranslations } from "next-intl";

// ---- Types ----

type ProviderFilter = "all" | "claude" | "codex";

interface TeamSummary {
  teams: {
    name: string;
    description: string;
    memberCount: number;
    taskCount: number;
    completedTasks: number;
    activeSince: number;
    leadSessionId?: string;
  }[];
}

interface ProcessInfo {
  pid: number;
  name: string;
  startTime: string;
  memoryMB: number;
  command?: string;
}

interface SessionInfo {
  id: string;
  project: string;
  projectName: string;
  startTime: number;
  lastActive: number;
  messageCount: number;
  firstMessage?: string;
  model?: string;
  provider?: "claude" | "codex" | "unknown";
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCost: number;
  status?: string;
}

interface SessionsData {
  totalSessions: number;
  recentSessions: SessionInfo[];
}

interface TokensData {
  byDate: Record<string, { input: number; output: number; cost: number; sessions: number }>;
}

interface ApiKeySummary {
  total: number;
  active: number;
  abnormal: number;
  totalBalance: number;
  balanceCurrency: string;
}

// ---- Helpers ----

type SessionStatus = "reading" | "thinking" | "writing" | "waiting" | "completed" | "error" | "idle";

const STATUS_DOTS: Record<SessionStatus, string> = {
  reading: "bg-cyan-400",
  thinking: "bg-orange-400",
  writing: "bg-purple-400",
  waiting: "bg-yellow-400",
  completed: "bg-green-400",
  error: "bg-red-500",
  idle: "bg-zinc-500",
};

// ---- Main ----

export default function HomePage() {
  const t = useTranslations("overview");
  const tNav = useTranslations("nav");
  const tc = useTranslations("common");
  const [teams, setTeams] = useState<TeamSummary | null>(null);
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [sessions, setSessions] = useState<SessionsData | null>(null);
  const [tokensData, setTokensData] = useState<TokensData | null>(null);
  const [apiKeySummary, setApiKeySummary] = useState<ApiKeySummary | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  // Per-section loading states for progressive rendering (Fix 5)
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [processesLoaded, setProcessesLoaded] = useState(false);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [tokensLoaded, setTokensLoaded] = useState(false);
  const [apiKeysLoaded, setApiKeysLoaded] = useState(false);
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>("all");
  const { isFavorite } = useFavorites();

  // Primary data fetches — each resolves independently (Fix 5: progressive rendering)
  useEffect(() => {
    fetch("/api/teams").then((r) => r.json()).then(setTeams).catch(() => {}).finally(() => setTeamsLoaded(true));
    fetch("/api/processes").then((r) => r.json()).then((d) => setProcesses(d.processes || [])).catch(() => {}).finally(() => setProcessesLoaded(true));
    fetch("/api/sessions").then((r) => r.json()).then(setSessions).catch(() => {}).finally(() => setSessionsLoaded(true));
    fetch("/api/tokens").then((r) => r.json()).then(setTokensData).catch(() => {}).finally(() => setTokensLoaded(true));
    // Fetch API key metadata (without balances — those are deferred)
    fetch("/api/plugins/api-management/keys")
      .then((r) => r.json())
      .then((data) => {
        const keys: { id: string; is_active: number; last_checked_valid?: boolean }[] = data.keys || [];
        const total = keys.length;
        const active = keys.filter((k) => k.is_active === 1).length;
        const abnormal = keys.filter((k) => k.is_active === 1 && k.last_checked_valid === false).length;
        setApiKeySummary({ total, active, abnormal, totalBalance: 0, balanceCurrency: "USD" });
      })
      .catch(() => {})
      .finally(() => setApiKeysLoaded(true));
  }, []);

  // Deferred balance fetch — runs AFTER apiKeySummary is available (Fix 3)
  useEffect(() => {
    if (!apiKeySummary || apiKeySummary.active === 0) return;
    let cancelled = false;
    setBalanceLoading(true);

    fetch("/api/plugins/api-management/keys")
      .then((r) => r.json())
      .then(async (data) => {
        const keys: { id: string; is_active: number }[] = data.keys || [];
        const activeKeys = keys.filter((k) => k.is_active === 1);
        if (activeKeys.length === 0) return;
        const results = await Promise.allSettled(
          activeKeys.map((k) =>
            fetch(`/api/plugins/api-management/balance?id=${k.id}`)
              .then((r) => r.json())
              .then((d) => d.result as { valid: boolean; balance: { amount: number; currency: string } | null } | undefined)
          )
        );
        if (cancelled) return;
        let totalBalance = 0;
        let currency = "USD";
        for (const r of results) {
          if (r.status === "fulfilled" && r.value?.valid && r.value.balance) {
            totalBalance += r.value.balance.amount;
            currency = r.value.balance.currency;
          }
        }
        setApiKeySummary((prev) =>
          prev ? { ...prev, totalBalance, balanceCurrency: currency } : prev
        );
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setBalanceLoading(false); });

    return () => { cancelled = true; };
  }, [apiKeySummary?.active]); // only re-run when active count changes

  // Derived: treat page as initially loaded once the fast endpoints resolve
  const loading = !teamsLoaded || !processesLoaded || !sessionsLoaded;

  const totalTeams = teams?.teams.length || 0;
  const totalAgents = useMemo(() => teams?.teams.reduce((s, t) => s + t.memberCount, 0) || 0, [teams]);
  const totalTasks = useMemo(() => teams?.teams.reduce((s, t) => s + t.taskCount, 0) || 0, [teams]);
  const completedTasks = useMemo(() => teams?.teams.reduce((s, t) => s + t.completedTasks, 0) || 0, [teams]);

  // Apply provider filter to sessions
  const allSessions = useMemo(() => sessions?.recentSessions || [], [sessions]);
  const filteredSessions = useMemo(
    () => providerFilter === "all"
      ? allSessions
      : allSessions.filter((s) => s.provider === providerFilter),
    [allSessions, providerFilter]
  );

  const recentSessions = useMemo(() => filteredSessions.slice(0, 5), [filteredSessions]);
  const { totalCost, totalInputTokens, totalOutputTokens } = useMemo(() => ({
    totalCost: filteredSessions.reduce((s, x) => s + x.estimatedCost, 0),
    totalInputTokens: filteredSessions.reduce((s, x) => s + x.totalInputTokens, 0),
    totalOutputTokens: filteredSessions.reduce((s, x) => s + x.totalOutputTokens, 0),
  }), [filteredSessions]);

  // Prepare sparkline data (last 7 days)
  const sparklineData = useMemo(() => tokensData
    ? Object.entries(tokensData.byDate)
        .filter(([k]) => k !== "unknown")
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-7)
        .map(([date, stats]) => ({ date, cost: stats.cost }))
    : [], [tokensData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-9 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Processes Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Token Usage Summary Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-48" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="text-center">
                    <Skeleton className="h-3 w-20 mx-auto mb-1" />
                    <Skeleton className="h-6 w-24 mx-auto" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-16 w-full mb-4" />
              <Skeleton className="h-5 w-full" />
            </CardContent>
          </Card>
        </div>

        {/* Recent Sessions Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Active Teams Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex items-center gap-1 bg-muted/50 rounded-full p-0.5">
          {(["all", "claude", "codex"] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setProviderFilter(opt)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                providerFilter === opt
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt === "all" ? t("filterAll") : opt === "claude" ? t("filterClaude") : t("filterCodex")}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <FolderOpen className="h-4 w-4" /> {t("stats.teams")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalTeams}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> {t("stats.agents")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalAgents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <ListTodo className="h-4 w-4" /> {t("stats.tasks")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> {t("stats.completed")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completedTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Cpu className="h-4 w-4" /> {t("stats.processes")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{processes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Coins className="h-4 w-4" /> {t("stats.totalCost")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{fmtCost(totalCost)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Processes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" /> {t("activeProcesses")}
              </CardTitle>
              {processes.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />{processes.length} {t("running", { count: processes.length })}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {processes.length > 0 ? (
              <div className="space-y-2">
                {processes.map((p) => (
                  <div key={p.pid} className="flex items-center justify-between text-sm bg-muted/30 rounded-md px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="font-mono text-xs">{p.name}</span>
                      <span className="text-xs text-muted-foreground">PID {p.pid}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{p.memoryMB}MB</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">{t("noProcesses")}</p>
            )}
          </CardContent>
        </Card>

        {/* Token Usage Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="h-4 w-4" /> {t("tokenUsageSummary")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">{t("inputTokens")}</div>
                <div className="text-lg font-bold font-mono">{fmtTokens(totalInputTokens)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">{t("outputTokens")}</div>
                <div className="text-lg font-bold font-mono">{fmtTokens(totalOutputTokens)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">{t("totalSessions")}</div>
                <div className="text-lg font-bold font-mono">{filteredSessions.length}</div>
              </div>
            </div>
            {!tokensLoaded ? (
              <div className="mt-4">
                <Skeleton className="h-3 w-32 mb-1" />
                <Skeleton className="h-[60px] w-full" />
              </div>
            ) : sparklineData.length > 0 ? (
              <div className="mt-4">
                <div className="text-xs text-muted-foreground mb-1">{t("dailyCostTrend7d")}</div>
                <HomeSparkline data={sparklineData} />
              </div>
            ) : null}
            <div className="mt-4 pt-3 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("estimatedTotalCost")}</span>
                <span className="font-bold font-mono">{fmtCost(totalCost)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Key Summary */}
      <Link href="/plugins/api-management" className="block">
        <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="h-4 w-4" /> {t("apiKeySummary")}
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs pointer-events-none">
                {t("apiKeysManage")} <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!apiKeysLoaded ? (
              <div className="grid grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="text-center">
                    <Skeleton className="h-3 w-16 mx-auto mb-1" />
                    <Skeleton className="h-8 w-20 mx-auto" />
                  </div>
                ))}
              </div>
            ) : apiKeySummary && apiKeySummary.total > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">{t("apiKeysActive")}</div>
                  <div className="text-2xl font-bold font-mono text-green-500">{apiKeySummary.active}</div>
                  <div className="text-xs text-muted-foreground">/ {apiKeySummary.total}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">{t("apiKeysTotalBalance")}</div>
                  {balanceLoading ? (
                    <Skeleton className="h-8 w-20 mx-auto" />
                  ) : (
                    <div className="text-2xl font-bold font-mono">
                      {apiKeySummary.totalBalance > 0
                        ? `${apiKeySummary.balanceCurrency === "USD" ? "$" : "¥"}${apiKeySummary.totalBalance.toFixed(2)}`
                        : "N/A"}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">{apiKeySummary.balanceCurrency}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">{t("apiKeysAbnormal")}</div>
                  <div className={`text-2xl font-bold font-mono ${apiKeySummary.abnormal > 0 ? "text-red-500" : "text-green-500"}`}>
                    {apiKeySummary.abnormal > 0 && <AlertTriangle className="h-4 w-4 inline mr-1" />}
                    {apiKeySummary.abnormal}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">{t("apiKeysNone")}</p>
            )}
          </CardContent>
        </Card>
      </Link>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> {t("recentSessions")}
            </CardTitle>
            <Link href="/sessions">
              <Button variant="ghost" size="sm" className="text-xs">
                {tc("viewAll")} <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentSessions.length > 0 ? (
            <div className="space-y-1.5">
              {recentSessions.map((s) => {
                const status = (s.status || "idle") as SessionStatus;
                const dot = STATUS_DOTS[status] || STATUS_DOTS.idle;
                return (
                  <Link key={`${s.project}-${s.id}`} href={`/sessions?session=${s.id}`}>
                    <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors">
                      <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate flex items-center gap-1.5">
                          {s.firstMessage || s.id.slice(0, 12)}
                          {isFavorite(s.id) && <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{s.projectName}</div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {s.model && <Badge variant="secondary" className="text-[10px] h-4">{shortModel(s.model)}</Badge>}
                        <span className="text-xs text-muted-foreground">{timeAgo(s.lastActive)}</span>
                        <span className="text-xs font-mono text-muted-foreground">{fmtCost(s.estimatedCost)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">{t("noSessions")}</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions + Active Teams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("quickActions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/sessions">
                <Button variant="outline" className="w-full justify-start gap-2 h-10">
                  <Clock className="h-4 w-4" /> {tNav("sessions")}
                </Button>
              </Link>
              <Link href="/toolbox">
                <Button variant="outline" className="w-full justify-start gap-2 h-10">
                  <Wrench className="h-4 w-4" /> {tNav("toolbox")}
                </Button>
              </Link>
              <Link href="/editor">
                <Button variant="outline" className="w-full justify-start gap-2 h-10">
                  <FileEdit className="h-4 w-4" /> {tNav("instructions")}
                </Button>
              </Link>
              <Link href="/tokens">
                <Button variant="outline" className="w-full justify-start gap-2 h-10">
                  <Coins className="h-4 w-4" /> {tNav("tokens")}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Active Teams */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> {t("activeTeams")}
              </CardTitle>
              <Link href="/team">
                <Button variant="ghost" size="sm" className="text-xs">
                  {tc("viewAll")} <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {teams && teams.teams.length > 0 ? (
              <div className="space-y-2">
                {teams.teams.slice(0, 3).map((team) => (
                  <Link key={team.name} href={`/team?name=${encodeURIComponent(team.name)}`}>
                    <div className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50 transition-colors">
                      <div>
                        <div className="text-sm font-medium">{team.name}</div>
                        <div className="text-xs text-muted-foreground">{t("agentsCount", { count: team.memberCount })}</div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {t("tasksCount", { completed: team.completedTasks, total: team.taskCount })}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">{t("noTeams")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
