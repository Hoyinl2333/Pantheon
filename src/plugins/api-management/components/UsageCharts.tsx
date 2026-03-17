"use client";

import { useMemo } from "react";
import {
  Wallet,
  Cpu,
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
  formatCurrency,
} from "./types";

export function UsageCharts({
  keys,
  checkResults,
}: {
  keys: ApiKeyRecord[];
  checkResults: Record<string, CheckResult>;
}) {
  const t = useTranslations("apiManagement");

  const balanceData = useMemo(() => {
    const data: { name: string; balance: number; currency: string }[] = [];
    for (const key of keys) {
      const result = checkResults[key.id];
      if (result?.balance) {
        data.push({
          name: key.name,
          balance: result.balance.amount,
          currency: result.balance.currency,
        });
      }
    }
    return data;
  }, [keys, checkResults]);

  const usageData = useMemo(() => {
    const data: { name: string; used: number; limit: number }[] = [];
    for (const key of keys) {
      const result = checkResults[key.id];
      if (result?.usage && result.usage.used > 0) {
        data.push({
          name: key.name,
          used: result.usage.used,
          limit: result.usage.limit,
        });
      }
    }
    return data;
  }, [keys, checkResults]);

  const providerDist = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const key of keys) {
      counts[key.provider] = (counts[key.provider] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value], i) => ({
      name,
      value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [keys]);

  const modelCountData = useMemo(() => {
    return keys
      .filter((k) => checkResults[k.id]?.models?.length)
      .map((k) => ({
        name: k.name.length > 12 ? k.name.slice(0, 12) + "\u2026" : k.name,
        count: checkResults[k.id].models.length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [keys, checkResults]);

  if (balanceData.length === 0 && usageData.length === 0 && providerDist.length <= 1 && modelCountData.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Balance Chart */}
      {balanceData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Wallet className="h-4 w-4" />
              {t("charts.balanceOverview")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={balanceData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={{ stroke: "hsl(var(--border))" }} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={{ stroke: "hsl(var(--border))" }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const d = payload[0].payload as { name: string; balance: number; currency: string };
                    return (
                      <div className="bg-card border border-border rounded-md px-3 py-2 shadow-md text-sm">
                        <div className="font-medium">{d.name}</div>
                        <div className="font-mono font-bold mt-1">{formatCurrency(d.balance, d.currency)}</div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="balance" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Usage Chart */}
      {usageData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" />
              {t("charts.usageUsd")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={usageData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={{ stroke: "hsl(var(--border))" }} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={{ stroke: "hsl(var(--border))" }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const d = payload[0].payload as { name: string; used: number; limit: number };
                    return (
                      <div className="bg-card border border-border rounded-md px-3 py-2 shadow-md text-sm">
                        <div className="font-medium">{d.name}</div>
                        <div className="mt-1">{t("charts.used")}: <span className="font-mono">${d.used.toFixed(2)}</span></div>
                        {d.limit > 0 && <div>{t("charts.limit")}: <span className="font-mono">${d.limit.toFixed(2)}</span></div>}
                      </div>
                    );
                  }}
                />
                <Bar dataKey="used" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Provider Distribution Pie */}
      {providerDist.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Layers className="h-4 w-4" />
              {t("charts.providerDistribution")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={providerDist}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={35}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name} (${value})`}
                  labelLine={{ stroke: "hsl(var(--foreground))", strokeWidth: 1 }}
                >
                  {providerDist.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    return (
                      <div className="bg-card border border-border rounded-md px-3 py-2 shadow-md text-sm">
                        <div className="font-medium">{payload[0].name}</div>
                        <div>{payload[0].value} {t("charts.keys")}</div>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Model Count Chart */}
      {modelCountData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Cpu className="h-4 w-4" />
              {t("charts.modelsPerKey")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={modelCountData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={{ stroke: "hsl(var(--border))" }} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={{ stroke: "hsl(var(--border))" }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    return (
                      <div className="bg-card border border-border rounded-md px-3 py-2 shadow-md text-sm">
                        <div className="font-medium">{(payload[0].payload as { name: string }).name}</div>
                        <div>{payload[0].value} {t("detail.models")}</div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
