"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { BotStatus } from "./telegram-types";

export function TelegramWebhookPanel({
  botStatus,
  webhookUrl,
  webhookAutoFilled,
  settingWebhook,
  onWebhookUrlChange,
  onSetWebhook,
}: {
  botStatus: BotStatus | null;
  webhookUrl: string;
  webhookAutoFilled: boolean;
  settingWebhook: boolean;
  onWebhookUrlChange: (value: string) => void;
  onSetWebhook: () => void;
}) {
  const t = useTranslations("settings.telegram");

  return (
    <div className="space-y-3">
      {botStatus?.url && (
        <div className="bg-muted/50 rounded-md p-3 space-y-1">
          <div className="text-xs font-medium">{t("currentWebhook")}</div>
          <code className="text-xs break-all">{botStatus.url}</code>
          {botStatus.pendingUpdateCount !== undefined &&
            botStatus.pendingUpdateCount > 0 && (
              <div className="text-xs text-amber-600 mt-1">
                {t("pendingUpdates", { count: botStatus.pendingUpdateCount })}
              </div>
            )}
          {botStatus.lastErrorMessage && (
            <div className="text-xs text-red-500 mt-1">
              {t("lastError", { error: botStatus.lastErrorMessage })}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="text-sm font-medium">
          {botStatus?.url ? t("updateWebhookUrl") : t("setWebhookUrl")}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={webhookUrl}
            onChange={(e) => onWebhookUrlChange(e.target.value)}
            className="flex-1 px-3 py-1.5 text-sm font-mono border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="https://your-domain.com/api/bot/telegram"
          />
          <Button
            size="sm"
            onClick={onSetWebhook}
            disabled={settingWebhook || !webhookUrl.trim()}
          >
            {settingWebhook ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> {t("setting")}
              </>
            ) : (
              t("setWebhook")
            )}
          </Button>
        </div>
        {webhookAutoFilled && (
          <div className="text-xs text-muted-foreground">
            {t("autoFilledFromBaseUrl")}
          </div>
        )}
      </div>
    </div>
  );
}
