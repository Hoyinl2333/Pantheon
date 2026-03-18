"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, DollarSign, CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface CostAlertSettingsProps {
  dailyBudget: number;
  weeklyBudget: number;
  onDailyBudgetChange: (v: number) => void;
  onWeeklyBudgetChange: (v: number) => void;
}

export function CostAlertSettings({
  dailyBudget,
  weeklyBudget,
  onDailyBudgetChange,
  onWeeklyBudgetChange,
}: CostAlertSettingsProps) {
  const t = useTranslations("settings.costAlerts");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("description")}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Daily Budget */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{t("dailyBudget")}</div>
            <div className="text-xs text-muted-foreground">
              {t("dailyBudgetDesc")}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <input
              type="number"
              min="0"
              step="0.01"
              value={dailyBudget}
              onChange={(e) => onDailyBudgetChange(Number(e.target.value))}
              className="bg-muted border border-border rounded px-3 py-1.5 text-sm font-mono w-28 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="0.00"
            />
            <span className="text-xs text-muted-foreground w-16">
              {dailyBudget === 0 ? t("disabled") : t("perDay")}
            </span>
          </div>
        </div>

        {/* Weekly Budget */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{t("weeklyBudget")}</div>
            <div className="text-xs text-muted-foreground">
              {t("weeklyBudgetDesc")}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <input
              type="number"
              min="0"
              step="0.01"
              value={weeklyBudget}
              onChange={(e) => onWeeklyBudgetChange(Number(e.target.value))}
              className="bg-muted border border-border rounded px-3 py-1.5 text-sm font-mono w-28 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="0.00"
            />
            <span className="text-xs text-muted-foreground w-16">
              {weeklyBudget === 0 ? t("disabled") : t("perWeek")}
            </span>
          </div>
        </div>

        {/* Alert Status */}
        {(dailyBudget > 0 || weeklyBudget > 0) && (
          <div className="p-3 bg-muted/50 rounded-md">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">{t("alertsEnabled")}</p>
                <p className="text-muted-foreground text-xs mt-1">
                  {t("alertsEnabledDesc")}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
