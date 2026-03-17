"use client";

import { Button } from "@/components/ui/button";
import { Loader2, Play, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PollingStatus } from "./telegram-types";

export function TelegramPollingPanel({
  pollingStatus,
  pollingLoading,
  onPollingToggle,
  formatUptime,
}: {
  pollingStatus: PollingStatus;
  pollingLoading: boolean;
  onPollingToggle: () => void;
  formatUptime: (ms: number | null) => string;
}) {
  const t = useTranslations("settings.telegram");

  return (
    <div className="space-y-3 bg-muted/30 rounded-md p-3">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="text-sm font-medium">{t("longPolling")}</div>
          <div className="text-xs text-muted-foreground">
            {t("longPollingDesc")}
          </div>
        </div>
        <Button
          size="sm"
          variant={pollingStatus.polling ? "destructive" : "default"}
          onClick={onPollingToggle}
          disabled={pollingLoading}
        >
          {pollingLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : pollingStatus.polling ? (
            <Square className="h-3.5 w-3.5 mr-1" />
          ) : (
            <Play className="h-3.5 w-3.5 mr-1" />
          )}
          {pollingStatus.polling ? t("stop") : t("start")}
        </Button>
      </div>
      {pollingStatus.polling && (
        <div className="text-xs text-muted-foreground">
          Uptime: {formatUptime(pollingStatus.uptime)}
        </div>
      )}
    </div>
  );
}
