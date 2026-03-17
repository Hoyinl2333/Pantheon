"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Loader2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
} from "recharts";
import { useTranslations } from "next-intl";
import { type ApiKeyRecord } from "./types";

type HistoryRange = "7d" | "14d" | "30d";
type ChartMode = "daily" | "cumulative";

export function UsageHistoryChart({ keys }: { keys: ApiKeyRecord[] }) {
  const t = useTranslations("apiManagement");
  const [range, setRange] = useState<HistoryRange>("14d");
  const [mode, setMode] = useState<ChartMode>("daily");
  const [data, setData] = useState<{ date: string; total_balance: number; total_used: number }[]>([]);
  const [perKeyData, setPerKeyData] = useState<Record<string, { date: string; balance: number | null; used: number | null }[]>>({});
  const [selectedKey, setSelectedKey] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  const days = range === "7d" ? 7 : range === "14d" ? 14 : 30;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const fetchHistory = async () => {
      try {
        const aggRes = await fetch(`/api/plugins/api-management/usage-history?days=${days}`);
        const aggData = await aggRes.json();
        if (!cancelled && aggData.snapshots) setData(aggData.snapshots);

        const perKey: Record<string, { date: string; balance: number | null; used: number | null }[]> = {};
        await Promise.all(
          keys.map(async (k) => {
            try {
              const res = await fetch(`/api/plugins/api-management/usage-history?id=${k.id}&days=${days}`);
              const d = await res.json();
              if (d.snapshots) perKey[k.id] = d.snapshots;
            } catch { /* skip */ }
          })
        );
        if (!cancelled) setPerKeyData(perKey);
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    };

    fetchHistory();
    return () => { cancelled = true; };
  }, [days, keys]);

  const chartData = useMemo(() => {
    if (selectedKey === "all") {
      return data.map((d, i) => {
        const prevUsed = i > 0 ? data[i - 1].total_used : d.total_used;
        const dailyCost = Math.max(0, d.total_used - prevUsed);
        return {
          date: d.date.slice(5),
          fullDate: d.date,
          balance: d.total_balance,
          totalUsed: d.total_used,
          dailyCost: Math.round(dailyCost * 100) / 100,
        };
      });
    }
    const keyData = perKeyData[selectedKey] ?? [];
    return keyData.map((d, i) => {
      const prevUsed = i > 0 ? (keyData[i - 1].used ?? 0) : (d.used ?? 0);
      const dailyCost = Math.max(0, (d.used ?? 0) - prevUsed);
      return {
        date: d.date.slice(5),
        fullDate: d.date,
        balance: d.balance ?? 0,
        totalUsed: d.used ?? 0,
        dailyCost: Math.round(dailyCost * 100) / 100,
      };
    });
  }, [data, perKeyData, selectedKey]);

  if (keys.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t("charts.dailyCost")}
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Mode toggle: daily vs cumulative */}
            <div className="flex gap-0.5 border rounded-md p-0.5">
              <Button
                variant={mode === "daily" ? "default" : "ghost"}
                size="sm"
                className="h-6 text-[11px] px-2"
                onClick={() => setMode("daily")}
              >
                {t("charts.dailyCostLabel")}
              </Button>
              <Button
                variant={mode === "cumulative" ? "default" : "ghost"}
                size="sm"
                className="h-6 text-[11px] px-2"
                onClick={() => setMode("cumulative")}
              >
                {t("charts.totalUsed")}
              </Button>
            </div>
            <Select value={selectedKey} onValueChange={setSelectedKey}>
              <SelectTrigger className="h-7 text-xs w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("charts.allKeys")}</SelectItem>
                {keys.map((k) => (
                  <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-0.5">
              {(["7d", "14d", "30d"] as HistoryRange[]).map((r) => (
                <Button
                  key={r}
                  variant={range === r ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => setRange(r)}
                >
                  {r}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
            {t("charts.noHistory")}
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={((value: any, name: string) => [
                    `$${Number(value ?? 0).toFixed(2)}`,
                    name === "dailyCost" ? t("charts.dailyCostLabel") : t("charts.totalUsed"),
                  ]) as any}
                  labelFormatter={(label) => label}
                />
                {mode === "daily" && (
                  <Area
                    type="monotone"
                    dataKey="dailyCost"
                    stroke="#f97316"
                    fill="url(#gradCost)"
                    strokeWidth={2}
                    name="dailyCost"
                  />
                )}
                {mode === "cumulative" && (
                  <Area
                    type="monotone"
                    dataKey="totalUsed"
                    stroke="#22c55e"
                    fill="url(#gradTotal)"
                    strokeWidth={2}
                    name="totalUsed"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
