"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, RefreshCw, Info, Database, Download,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import dynamic from "next/dynamic";

const TokensPieChart = dynamic(
  () => import("@/components/tokens-charts").then((m) => ({ default: m.TokensPieChart })),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full" /> }
);
const TokensAreaChart = dynamic(
  () => import("@/components/tokens-charts").then((m) => ({ default: m.TokensAreaChart })),
  { ssr: false, loading: () => <Skeleton className="h-[320px] w-full" /> }
);
import { fmtCost, fmtTokens } from "@/lib/format-utils";
import { useToast } from "@/components/toast";
import { useTranslations } from "next-intl";

interface TokensData {
  totalInput: number;
  totalOutput: number;
  totalCacheRead: number;
  totalCost: number;
  byModel: Record<string, { input: number; output: number; cost: number; sessions: number }>;
  byDate: Record<string, { input: number; output: number; cost: number; sessions: number; byModel?: Record<string, { cost: number }> }>;
  sessionCount: number;
}

const MODEL_NAMES: Record<string, string> = {
  "claude-opus-4-6": "Opus 4.6",
  "claude-sonnet-4-5": "Sonnet 4.5",
  "claude-haiku-4-5": "Haiku 4.5",
  "gpt-5.2-codex": "GPT-5.2",
  "gpt-5.3-codex": "GPT-5.3",
  "o3-pro": "o3-Pro",
  "o3": "o3",
  "o4-mini": "o4-Mini",
  "gpt-4.1": "GPT-4.1",
};

const MODEL_COLORS: Record<string, string> = {
  "claude-opus-4-6": "#6366f1",
  "claude-sonnet-4-5": "#22c55e",
  "claude-haiku-4-5": "#f59e0b",
  "gpt-5.2-codex": "#10b981",
  "gpt-5.3-codex": "#06b6d4",
  "o3-pro": "#8b5cf6",
  "o3": "#a78bfa",
  "o4-mini": "#f472b6",
  "gpt-4.1": "#34d399",
};

type TimeRange = "7d" | "14d" | "30d" | "all";
type ProviderFilter = "all" | "claude" | "codex" | "unknown";
type ViewMode = "chart" | "table";

const PROVIDER_LABELS: Record<ProviderFilter, string> = {
  all: "All Providers",
  claude: "Claude",
  codex: "Codex",
  unknown: "Unknown",
};

export default function TokensPage() {
  const t = useTranslations("tokens");
  const [data, setData] = useState<TokensData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("14d");
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const [tablePage, setTablePage] = useState(0);
  const TABLE_PAGE_SIZE = 10;
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const params = providerFilter !== "all" ? `?provider=${providerFilter}` : "";
    fetch(`/api/tokens${params}`).then(r => r.json()).then((d: TokensData) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [providerFilter]);

  // All useMemo hooks MUST be called before any early return (Rules of Hooks)
  const { todayData, todayChange, thisWeekCost, weekChange, cacheSavings } = useMemo(() => {
    if (!data) return { todayData: { cost: 0, sessions: 0 }, todayChange: 0, thisWeekCost: 0, weekChange: 0, cacheSavings: 0 };
    const today = new Date().toISOString().split("T")[0];
    const td = data.byDate[today] || { cost: 0, sessions: 0 };
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const yd = data.byDate[yesterday] || { cost: 0 };
    const tc = yd.cost > 0 ? ((td.cost - yd.cost) / yd.cost) * 100 : 0;
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const twc = Object.entries(data.byDate)
      .filter(([date]) => date >= weekAgo && date <= today)
      .reduce((sum, [, stats]) => sum + stats.cost, 0);
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0];
    const lwc = Object.entries(data.byDate)
      .filter(([date]) => date >= twoWeeksAgo && date < weekAgo)
      .reduce((sum, [, stats]) => sum + stats.cost, 0);
    const wc = lwc > 0 ? ((twc - lwc) / lwc) * 100 : 0;
    const CACHE_DISCOUNT = 0.9;
    const cs = (data.totalCacheRead * 15 / 1_000_000) * CACHE_DISCOUNT;
    return { todayData: td, todayChange: tc, thisWeekCost: twc, weekChange: wc, cacheSavings: cs };
  }, [data]);

  const modelData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.byModel)
      .filter(([, v]) => v.cost > 0)
      .map(([model, stats]) => ({
        name: MODEL_NAMES[model] || model.split("-").slice(-2).join(" "),
        value: stats.cost,
        color: MODEL_COLORS[model] || "#888",
        sessions: stats.sessions,
      }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const allDateData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.byDate)
      .filter(([k]) => k !== "unknown")
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, stats]) => ({
        date,
        cost: stats.cost,
        input: stats.input,
        output: stats.output,
        sessions: stats.sessions,
      }));
  }, [data]);

  const dateData = useMemo(() => {
    if (timeRange === "all") return allDateData;
    if (timeRange === "30d") return allDateData.slice(-30);
    if (timeRange === "14d") return allDateData.slice(-14);
    return allDateData.slice(-7);
  }, [allDateData, timeRange]);

  const handleExport = (type: "detail" | "summary") => {
    const url = `/api/tokens/export?type=${type}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `claude-tokens-${type}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast(t("exportedCsv", { type }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-40" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cost by Model Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[280px] w-full" />
            </CardContent>
          </Card>

          {/* Pricing Reference Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
              <Skeleton className="h-20 w-full mt-4" />
            </CardContent>
          </Card>
        </div>

        {/* Daily Usage Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[280px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return <div className="text-center py-16"><DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h2 className="text-lg">{t("noData")}</h2></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* Provider Filter */}
          <div className="flex border rounded-md">
            {(["all", "claude", "codex", "unknown"] as ProviderFilter[]).map((p) => (
              <Button
                key={p}
                variant={providerFilter === p ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2 rounded-none first:rounded-l-md last:rounded-r-md"
                onClick={() => { setProviderFilter(p); setTablePage(0); }}
              >
                {p === "all" ? t("allProviders") : p === "codex" ? t("codex") : p === "claude" ? t("claude") : t("unknown")}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => handleExport("detail")}>
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t("exportDetailCSV")}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("summary")}>
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t("exportSummaryCSV")}</span>
          </Button>
        </div>
      </div>

      {data.sessionCount === 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{t("noSessionData")}</p>
              <p className="text-xs text-amber-600 mt-1">{t("noSessionDataHint")}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4" />{t("totalCost")}</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-primary">{fmtCost(data.totalCost)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4" />{t("today")}</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtCost(todayData.cost)}</div>
            <div className="text-xs flex items-center gap-1 text-muted-foreground">
              {todayChange > 0 ? <ArrowUpRight className="h-3 w-3 text-red-500" /> : <ArrowDownRight className="h-3 w-3 text-green-500" />}
              {Math.abs(todayChange).toFixed(0)}% {t("vsYesterday")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4" />{t("thisWeek")}</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtCost(thisWeekCost)}</div>
            <div className="text-xs flex items-center gap-1 text-muted-foreground">
              {weekChange > 0 ? <ArrowUpRight className="h-3 w-3 text-red-500" /> : <ArrowDownRight className="h-3 w-3 text-green-500" />}
              {Math.abs(weekChange).toFixed(0)}% {t("vsLastWeek")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Database className="h-4 w-4" />{t("cacheSavings")}</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{fmtCost(cacheSavings)}</div>
            <div className="text-xs text-muted-foreground">{fmtTokens(data.totalCacheRead)} {t("cached")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><ArrowUpRight className="h-4 w-4" />{t("input")}</CardTitle></CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{fmtTokens(data.totalInput)}</div>
            <div className="text-xs text-muted-foreground">{fmtCost(data.totalInput * 15 / 1e6)} (Opus)</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><ArrowDownRight className="h-4 w-4" />{t("output")}</CardTitle></CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{fmtTokens(data.totalOutput)}</div>
            <div className="text-xs text-muted-foreground">{fmtCost(data.totalOutput * 75 / 1e6)} (Opus)</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cost by Model - PieChart */}
        <Card>
          <CardHeader><CardTitle className="text-base">{t("costByModel")}</CardTitle></CardHeader>
          <CardContent>
            {modelData.length > 0 ? (
              <TokensPieChart modelData={modelData} />
            ) : (
              <div className="text-center text-muted-foreground py-6 text-sm">{t("noPieData")}</div>
            )}
          </CardContent>
        </Card>

        {/* Pricing Reference */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Info className="h-4 w-4" />{t("pricingReference")}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-xs font-medium text-muted-foreground mb-1">Claude</div>
              {[
                { name: "Opus 4.6", input: 15, output: 75, tier: "High", color: "destructive" as const },
                { name: "Sonnet 4.5", input: 3, output: 15, tier: "Mid", color: "secondary" as const },
                { name: "Haiku 4.5", input: 0.8, output: 4, tier: "Low", color: "outline" as const },
              ].map(m => (
                <div key={m.name} className="flex items-center gap-3 text-sm">
                  <span className="w-24 font-mono font-medium">{m.name}</span>
                  <span className="text-muted-foreground">${m.input}/M in</span>
                  <span className="text-muted-foreground">${m.output}/M out</span>
                  <Badge variant={m.color} className="ml-auto text-xs">{m.tier}</Badge>
                </div>
              ))}
              <div className="text-xs font-medium text-muted-foreground mt-4 mb-1">Codex (OpenAI)</div>
              {[
                { name: "o3-Pro", input: 20, output: 80, tier: "High", color: "destructive" as const },
                { name: "o3", input: 10, output: 40, tier: "Mid", color: "secondary" as const },
                { name: "GPT-5.2", input: 2, output: 8, tier: "Low", color: "outline" as const },
                { name: "o4-Mini", input: 1.1, output: 4.4, tier: "Low", color: "outline" as const },
              ].map(m => (
                <div key={m.name} className="flex items-center gap-3 text-sm">
                  <span className="w-24 font-mono font-medium">{m.name}</span>
                  <span className="text-muted-foreground">${m.input}/M in</span>
                  <span className="text-muted-foreground">${m.output}/M out</span>
                  <Badge variant={m.color} className="ml-auto text-xs">{m.tier}</Badge>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-muted/30 rounded text-xs text-muted-foreground">
              <p className="font-medium mb-1">{t("costEstimationNotes")}</p>
              <ul className="space-y-0.5 list-disc list-inside">
                <li>{t("noteModelDetection")}</li>
                <li>{t("noteCacheDiscount")}</li>
                <li>{t("noteActualBilling")}</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Usage - AreaChart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t("dailyCostTrend")}</CardTitle>
            <div className="flex items-center gap-2">
              {/* Time Range Selector */}
              <div className="flex border rounded-md">
                {(["7d", "14d", "30d", "all"] as TimeRange[]).map((range) => (
                  <Button
                    key={range}
                    variant={timeRange === range ? "default" : "ghost"}
                    size="sm"
                    className="h-7 text-xs px-2 rounded-none first:rounded-l-md last:rounded-r-md"
                    onClick={() => { setTimeRange(range); setTablePage(0); }}
                  >
                    {range === "7d" ? t("timeRange7d") : range === "14d" ? t("timeRange14d") : range === "30d" ? t("timeRange30d") : t("timeRangeAll")}
                  </Button>
                ))}
              </div>
              {/* Chart/Table Toggle */}
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === "chart" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-2 rounded-l-md rounded-r-none"
                  onClick={() => setViewMode("chart")}
                >
                  {t("chartView")}
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-2 rounded-r-md rounded-l-none"
                  onClick={() => setViewMode("table")}
                >
                  {t("tableView")}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {dateData.length > 0 ? (
            viewMode === "chart" ? (
              <TokensAreaChart dateData={dateData} />
            ) : (
              <div>
                {(() => {
                  const totalPages = Math.ceil(dateData.length / TABLE_PAGE_SIZE);
                  const safePage = Math.min(tablePage, totalPages - 1);
                  const pageData = dateData.slice(safePage * TABLE_PAGE_SIZE, (safePage + 1) * TABLE_PAGE_SIZE);
                  return (
                    <>
                      <table className="w-full text-sm">
                        <thead className="bg-muted/30 border-b">
                          <tr>
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">{t("tableDate")}</th>
                            <th className="text-right py-2 px-3 font-medium text-muted-foreground">{t("tableSessions")}</th>
                            <th className="text-right py-2 px-3 font-medium text-muted-foreground">{t("tableInput")}</th>
                            <th className="text-right py-2 px-3 font-medium text-muted-foreground">{t("tableOutput")}</th>
                            <th className="text-right py-2 px-3 font-medium text-muted-foreground">{t("tableCost")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {pageData.map((row) => (
                            <tr key={row.date} className="hover:bg-muted/30 transition-colors">
                              <td className="py-2 px-3 font-mono text-xs">{row.date}</td>
                              <td className="py-2 px-3 text-right font-mono">{row.sessions}</td>
                              <td className="py-2 px-3 text-right font-mono">{fmtTokens(row.input)}</td>
                              <td className="py-2 px-3 text-right font-mono">{fmtTokens(row.output)}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold">{fmtCost(row.cost)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-3 border-t mt-2">
                          <span className="text-xs text-muted-foreground">
                            {safePage * TABLE_PAGE_SIZE + 1}-{Math.min((safePage + 1) * TABLE_PAGE_SIZE, dateData.length)} {t("daysOf", { total: dateData.length })}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0"
                              disabled={safePage === 0}
                              onClick={() => setTablePage(safePage - 1)}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            {Array.from({ length: totalPages }, (_, i) => (
                              <Button
                                key={i}
                                variant={i === safePage ? "default" : "outline"}
                                size="sm"
                                className="h-7 w-7 p-0 text-xs"
                                onClick={() => setTablePage(i)}
                              >
                                {i + 1}
                              </Button>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0"
                              disabled={safePage >= totalPages - 1}
                              onClick={() => setTablePage(safePage + 1)}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )
          ) : (
            <div className="text-center text-muted-foreground py-6 text-sm">{t("noDailyData")}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
