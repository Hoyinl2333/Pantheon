"use client";

import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ApprovalStatus } from "./telegram-types";

export function TelegramApprovalPanel({
  approvalStatus,
}: {
  approvalStatus: ApprovalStatus;
}) {
  const t = useTranslations("settings.telegram");

  return (
    <div className="space-y-2 bg-muted/30 rounded-md p-3">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{t("permissionApproval")}</span>
        {approvalStatus.available ? (
          <Badge variant="default">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t("approvalReady")}
          </Badge>
        ) : (
          <Badge variant="secondary">
            <XCircle className="h-3 w-3 mr-1" />
            {t("approvalUnavailable")}
          </Badge>
        )}
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <p>{t("approvalDesc")}</p>
        <p>
          {t("approvalEndpoint")}{" "}
          <code className="bg-muted px-1 rounded">
            http://localhost:3000/api/bot/telegram/approval
          </code>
        </p>
        {approvalStatus.chatId && (
          <p>{t("approvalChat")} <code className="bg-muted px-1 rounded">{approvalStatus.chatId}</code></p>
        )}
      </div>
    </div>
  );
}
