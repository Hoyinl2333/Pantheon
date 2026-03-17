"use client";

import { useMemo } from "react";
import {
  Key,
  CheckCircle,
  Wallet,
  Cpu,
  Globe,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { type ApiKeyRecord, type CheckResult } from "./types";

export function StatsBar({
  keys,
  checkResults,
}: {
  keys: ApiKeyRecord[];
  checkResults: Record<string, CheckResult>;
}) {
  const t = useTranslations("apiManagement");
  const total = keys.length;
  const active = keys.filter((k) => k.is_active).length;
  const providers = new Set(keys.map((k) => k.provider)).size;
  const totalModels = useMemo(() => {
    const allModels = new Set<string>();
    for (const key of keys) {
      const result = checkResults[key.id];
      if (result?.models) {
        result.models.forEach((m) => allModels.add(m.id));
      }
    }
    return allModels.size;
  }, [keys, checkResults]);

  const totalBalance = useMemo(() => {
    let usd = 0;
    let cny = 0;
    for (const key of keys) {
      const result = checkResults[key.id];
      if (result?.balance) {
        if (result.balance.currency === "CNY") {
          cny += result.balance.amount;
        } else {
          usd += result.balance.amount;
        }
      }
    }
    return { usd, cny, hasAny: usd > 0 || cny > 0 };
  }, [keys, checkResults]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {[
        { label: t("stats.totalKeys"), value: total.toString(), icon: Key, color: "text-blue-500" },
        { label: t("stats.active"), value: active.toString(), icon: CheckCircle, color: "text-green-500" },
        { label: t("stats.providers"), value: providers.toString(), icon: Globe, color: "text-purple-500" },
        { label: t("detail.models"), value: totalModels > 0 ? totalModels.toString() : "\u2014", icon: Cpu, color: "text-orange-500" },
        {
          label: t("detail.balance"),
          value: totalBalance.hasAny
            ? (totalBalance.usd > 0 ? `$${totalBalance.usd.toFixed(0)}` : "") +
              (totalBalance.usd > 0 && totalBalance.cny > 0 ? " + " : "") +
              (totalBalance.cny > 0 ? `\u00a5${totalBalance.cny.toFixed(0)}` : "")
            : "\u2014",
          icon: Wallet,
          color: "text-emerald-500",
        },
      ].map((stat) => (
        <div key={stat.label} className="flex items-center gap-3 rounded-lg border p-3 bg-card">
          <stat.icon className={`h-4 w-4 ${stat.color}`} />
          <div>
            <div className="text-lg font-bold">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
