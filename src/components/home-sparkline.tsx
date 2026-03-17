"use client";

import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import { fmtCost } from "@/lib/format-utils";

function SparklineTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-md px-2 py-1 shadow-md">
      <p className="text-xs font-mono">{data.date}</p>
      <p className="text-xs font-mono font-bold">{fmtCost(data.cost)}</p>
    </div>
  );
}

interface SparklineDataItem {
  date: string;
  cost: number;
}

export function HomeSparkline({ data }: { data: SparklineDataItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={60}>
      <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="miniCostGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip content={<SparklineTooltip />} />
        <Area
          type="monotone"
          dataKey="cost"
          stroke="hsl(var(--primary))"
          strokeWidth={1.5}
          fill="url(#miniCostGradient)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
