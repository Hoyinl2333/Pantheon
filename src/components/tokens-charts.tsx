"use client";

import {
  AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Brush,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import { fmtCost, fmtTokens } from "@/lib/format-utils";

// ---- Shared tooltip components ----

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 shadow-md">
      <p className="text-sm font-medium">{payload[0].name}</p>
      <p className="text-xs text-muted-foreground mt-1">
        {payload[0].payload.sessions} sess.
      </p>
      <p className="text-sm font-mono font-bold mt-1">{fmtCost(payload[0].value)}</p>
    </div>
  );
}

function DailyTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 shadow-md">
      <p className="text-sm font-medium font-mono">{label}</p>
      <div className="mt-2 space-y-1">
        <p className="text-xs text-muted-foreground">
          Sessions: <span className="font-mono">{data.sessions}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Input: <span className="font-mono">{fmtTokens(data.input)}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Output: <span className="font-mono">{fmtTokens(data.output)}</span>
        </p>
        <p className="text-sm font-mono font-bold mt-1">{fmtCost(data.cost)}</p>
      </div>
    </div>
  );
}

// ---- Pie Chart ----

interface ModelDataItem {
  name: string;
  value: number;
  color: string;
  sessions: number;
}

export function TokensPieChart({ modelData }: { modelData: ModelDataItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={modelData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          label={(props: PieLabelRenderProps) => `${props.name ?? ""} ${(((props.percent ?? 0) as number) * 100).toFixed(0)}%`}
          labelLine={{ stroke: "hsl(var(--foreground))", strokeWidth: 1 }}
        >
          {modelData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ---- Area Chart ----

interface DateDataItem {
  date: string;
  cost: number;
  input: number;
  output: number;
  sessions: number;
}

export function TokensAreaChart({ dateData }: { dateData: DateDataItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={dateData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
        <defs>
          <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis
          dataKey="date"
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          tickLine={{ stroke: "hsl(var(--border))" }}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          tickLine={{ stroke: "hsl(var(--border))" }}
          tickFormatter={(v) => fmtCost(v)}
        />
        <Tooltip content={<DailyTooltip />} />
        <Area
          type="monotone"
          dataKey="cost"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#costGradient)"
          animationDuration={800}
        />
        <Brush
          dataKey="date"
          height={30}
          stroke="hsl(var(--border))"
          fill="hsl(var(--muted))"
          travellerWidth={8}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
