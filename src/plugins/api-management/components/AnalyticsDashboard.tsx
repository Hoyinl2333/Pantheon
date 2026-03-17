"use client";

import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  Wallet,
  BarChart3,
  TrendingUp,
  Layers,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useTranslations } from "next-intl";
import {
  type ApiKeyRecord,
  type CheckResult,
  CHART_COLORS,
  CATEGORY_COLORS,
  categorizeModel,
} from "./types";

export function AnalyticsDashboard({
  keys,
  checkResults,
}: {
  keys: ApiKeyRecord[];
  checkResults: Record<string, CheckResult>;
}) {
  const t = useTranslations("apiManagement");
  const [expanded, setExpanded] = useState(false);

  const providerBalanceData = useMemo(() => {
    const byProvider: Record<string, { usd: number; cny: number }> = {};
    for (const key of keys) {
      const result = checkResults[key.id];
      if (result?.balance) {
        if (!byProvider[key.provider]) byProvider[key.provider] = { usd: 0, cny: 0 };
        if (result.balance.currency === "CNY") {
          byProvider[key.provider].cny += result.balance.amount;
        } else {
          byProvider[key.provider].usd += result.balance.amount;
        }
      }
    }
    return Object.entries(byProvider).map(([name, val], i) => ({
      name,
      value: val.usd + val.cny / 7.2,
      displayUsd: val.usd,
      displayCny: val.cny,
      color: CHART_COLORS[i % CHART_COLORS.length],
    })).sort((a, b) => b.value - a.value);
  }, [keys, checkResults]);

  const modelCategoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const key of keys) {
      const result = checkResults[key.id];
      if (result?.models) {
        for (const m of result.models) {
          const cat = categorizeModel(m.id);
          counts[cat] = (counts[cat] || 0) + 1;
        }
      }
    }
    return Object.entries(counts)
      .map(([name, value]) => ({
        name,
        value,
        color: CATEGORY_COLORS[name] || "#6b7280",
      }))
      .sort((a, b) => b.value - a.value);
  }, [keys, checkResults]);

  const usageRankingData = useMemo(() => {
    return keys
      .filter((k) => k.usage_count > 0)
      .map((k) => ({
        name: k.name.length > 15 ? k.name.slice(0, 15) + "..." : k.name,
        count: k.usage_count,
        provider: k.provider,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [keys]);

  const hasData = providerBalanceData.length > 0 || modelCategoryData.length > 0 || usageRankingData.length > 0;

  if (!hasData && keys.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <button
          className="flex items-center justify-between w-full text-left"
          onClick={() => setExpanded(!expanded)}
        >
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {t("charts.analyticsDashboard")}
          </CardTitle>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
      </CardHeader>
      {expanded && (
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Provider Balance Comparison */}
            <Card className="border-0 shadow-none bg-muted/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Wallet className="h-4 w-4" />
                  {t("charts.providerBalanceComparison")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {providerBalanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={providerBalanceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        labelLine={{ stroke: "hsl(var(--foreground))", strokeWidth: 1 }}
                      >
                        {providerBalanceData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.[0]) return null;
                          const d = payload[0].payload as { name: string; displayUsd: number; displayCny: number };
                          return (
                            <div className="bg-card border border-border rounded-md px-3 py-2 shadow-md text-sm">
                              <div className="font-medium">{d.name}</div>
                              {d.displayUsd > 0 && <div className="font-mono">${d.displayUsd.toFixed(2)}</div>}
                              {d.displayCny > 0 && <div className="font-mono">{"\u00a5"}{d.displayCny.toFixed(2)}</div>}
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-muted-foreground py-8 text-sm">
                    {t("charts.noBalanceData")}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Model Category Distribution */}
            <Card className="border-0 shadow-none bg-muted/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Layers className="h-4 w-4" />
                  {t("charts.modelCategoryDistribution")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {modelCategoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={modelCategoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name} (${value})`}
                        labelLine={{ stroke: "hsl(var(--foreground))", strokeWidth: 1 }}
                      >
                        {modelCategoryData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.[0]) return null;
                          const d = payload[0].payload as { name: string; value: number };
                          return (
                            <div className="bg-card border border-border rounded-md px-3 py-2 shadow-md text-sm">
                              <div className="font-medium">{d.name}</div>
                              <div>{d.value} {t("detail.models")}</div>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-muted-foreground py-8 text-sm">
                    {t("charts.noModelData")}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Usage Ranking */}
            {usageRankingData.length > 0 && (
              <Card className="border-0 shadow-none bg-muted/20 md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4" />
                    {t("charts.topKeysByUsage")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(200, usageRankingData.length * 36)}>
                    <BarChart data={usageRankingData} layout="vertical" margin={{ left: 10, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis
                        type="number"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        tickLine={{ stroke: "hsl(var(--border))" }}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={120}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        tickLine={{ stroke: "hsl(var(--border))" }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.[0]) return null;
                          const d = payload[0].payload as { name: string; count: number; provider: string };
                          return (
                            <div className="bg-card border border-border rounded-md px-3 py-2 shadow-md text-sm">
                              <div className="font-medium">{d.name}</div>
                              <div className="text-xs text-muted-foreground">{d.provider}</div>
                              <div className="font-mono font-bold mt-1">{d.count} {t("charts.times")}</div>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
