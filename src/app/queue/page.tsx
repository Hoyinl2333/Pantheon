"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/toast";
import { useTranslations } from "next-intl";
import {
  ListOrdered,
  Clock,
  Play,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  RotateCcw,
  RefreshCw,
} from "lucide-react";

interface QueuedSession {
  id: number;
  prompt: string;
  provider: string;
  cwd: string | null;
  status: "pending" | "running" | "completed" | "failed";
  result: string | null;
  model: string | null;
  error: string | null;
  chat_id: string;
  platform: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

interface QueueStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  pending: { icon: <Clock className="h-3.5 w-3.5" />, color: "bg-yellow-500/10 text-yellow-600 border-yellow-200", label: "Pending" },
  running: { icon: <Play className="h-3.5 w-3.5" />, color: "bg-blue-500/10 text-blue-600 border-blue-200", label: "Running" },
  completed: { icon: <CheckCircle className="h-3.5 w-3.5" />, color: "bg-green-500/10 text-green-600 border-green-200", label: "Completed" },
  failed: { icon: <XCircle className="h-3.5 w-3.5" />, color: "bg-red-500/10 text-red-600 border-red-200", label: "Failed" },
};

export default function QueuePage() {
  const [sessions, setSessions] = useState<QueuedSession[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [workerRunning, setWorkerRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const { toast } = useToast();
  const t = useTranslations("queue");
  const tc = useTranslations("common");

  const fetchQueue = useCallback(async () => {
    try {
      const url = filter === "all" ? "/api/queue" : `/api/queue?status=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      setSessions(data.sessions || []);
      setStats(data.stats || null);
      setWorkerRunning(data.workerRunning || false);
    } catch {
      // Silently fail for polling
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Auto-refresh every 5s
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchQueue]);

  const handleCancel = async (id: number) => {
    try {
      const res = await fetch(`/api/queue/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast(t("sessionCancelled", { id }), "success");
        fetchQueue();
      } else {
        toast(data.error || t("cancelFailed"), "error");
      }
    } catch {
      toast(t("cancelSessionFailed"), "error");
    }
  };

  const handleRetry = async (session: QueuedSession) => {
    try {
      const res = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: session.prompt,
          provider: session.provider,
          cwd: session.cwd,
          chatId: session.chat_id,
          platform: session.platform,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast(t("retriedAs", { id: data.id }), "success");
        fetchQueue();
      } else {
        toast(data.error || t("retryFailed"), "error");
      }
    } catch {
      toast(t("retrySessionFailed"), "error");
    }
  };

  const handleClearCompleted = async () => {
    try {
      const res = await fetch("/api/queue?action=clear-completed", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast(t("clearedCompleted", { count: data.count || 0 }), "success");
        fetchQueue();
      } else {
        toast(data.error || t("clearFailed"), "error");
      }
    } catch {
      toast(t("clearCompletedFailed"), "error");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ListOrdered className="h-6 w-6" />
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          {workerRunning && (
            <Badge variant="default" className="text-xs">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              {t("workerActive")}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearCompleted}
            disabled={!stats || stats.completed === 0}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("clearCompleted")}</span>
          </Button>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${autoRefresh ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{autoRefresh ? t("autoRefresh") : t("manualRefresh")}</span>
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { key: "total", value: stats.total, color: "text-foreground" },
            { key: "pending", value: stats.pending, color: "text-yellow-600" },
            { key: "running", value: stats.running, color: "text-blue-600" },
            { key: "completed", value: stats.completed, color: "text-green-600" },
            { key: "failed", value: stats.failed, color: "text-red-600" },
          ].map((item) => (
            <Card
              key={item.key}
              className={`cursor-pointer transition-colors ${filter === item.key ? "ring-2 ring-primary" : ""}`}
              onClick={() =>
                setFilter(filter === item.key ? "all" : item.key)
              }
            >
              <CardContent className="p-3 text-center">
                <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
                <div className="text-xs text-muted-foreground">{t(item.key as "total" | "pending" | "running" | "completed" | "failed")}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Queue Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {filter === "all" ? t("allSessions") : t("filterSessions", { filter: t(filter as "pending" | "running" | "completed" | "failed") })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ListOrdered className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{t("noSessions")}</p>
              <p className="text-xs mt-1">{t("noSessionsHint")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 px-2 font-medium w-12 hidden sm:table-cell">{t("columns.id")}</th>
                    <th className="text-left py-2 px-2 font-medium">{t("columns.prompt")}</th>
                    <th className="text-left py-2 px-2 font-medium w-20 hidden sm:table-cell">{t("columns.provider")}</th>
                    <th className="text-left py-2 px-2 font-medium w-24">{t("columns.status")}</th>
                    <th className="text-left py-2 px-2 font-medium w-28 hidden md:table-cell">{t("columns.created")}</th>
                    <th className="text-left py-2 px-2 font-medium w-24 hidden md:table-cell">{t("columns.duration")}</th>
                    <th className="text-right py-2 px-2 font-medium w-20">{t("columns.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => {
                    const sc = statusConfig[s.status];
                    const created = new Date(s.created_at);
                    const duration = s.started_at && s.completed_at
                      ? `${Math.round((new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) / 1000)}s`
                      : s.started_at
                        ? t("durationRunning")
                        : "—";

                    return (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="py-2.5 px-2 font-mono text-xs text-muted-foreground hidden sm:table-cell">{s.id}</td>
                        <td className="py-2.5 px-2">
                          <div className="max-w-xs truncate" title={s.prompt}>
                            {s.prompt}
                          </div>
                          {s.error && (
                            <div className="text-xs text-red-500 truncate max-w-xs mt-0.5" title={s.error}>
                              {s.error}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-2 hidden sm:table-cell">
                          <Badge variant="outline" className="text-xs">{s.provider}</Badge>
                        </td>
                        <td className="py-2.5 px-2">
                          <Badge variant="outline" className={`text-xs ${sc.color}`}>
                            {sc.icon}
                            <span className="ml-1">{t(s.status as "pending" | "running" | "completed" | "failed")}</span>
                          </Badge>
                        </td>
                        <td className="py-2.5 px-2 text-xs text-muted-foreground hidden md:table-cell">
                          {created.toLocaleDateString(undefined, { month: "short", day: "numeric" })}{" "}
                          {created.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-2.5 px-2 text-xs font-mono text-muted-foreground hidden md:table-cell">
                          {duration}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {s.status === "pending" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleCancel(s.id)}
                                title={tc("cancel")}
                              >
                                <XCircle className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            )}
                            {s.status === "failed" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleRetry(s)}
                                title={tc("retry")}
                              >
                                <RotateCcw className="h-3.5 w-3.5 text-blue-500" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
