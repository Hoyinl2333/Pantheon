"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, XCircle } from "lucide-react";
import { SettingRow } from "./setting-row";
import { useTranslations } from "next-intl";
import type { ClaudeSettings } from "@/lib/settings-reader";

interface PermissionsSettingsProps {
  merged: ClaudeSettings;
}

export function PermissionsSettings({ merged }: PermissionsSettingsProps) {
  const t = useTranslations("settings.permissions");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("description")}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <SettingRow
          label={t("autoApprove")}
          value={merged.permissions?.autoApprove ?? false}
          type="boolean"
        />
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">{t("allowedTools")}</div>
          <div className="flex flex-wrap gap-2">
            {merged.permissions?.allowedTools &&
            merged.permissions.allowedTools.length > 0 ? (
              merged.permissions.allowedTools.map((tool) => (
                <Badge key={tool} variant="secondary">
                  <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                  {tool}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">
                {t("allToolsAllowed")}
              </span>
            )}
          </div>
        </div>
        {merged.permissions?.deniedTools &&
          merged.permissions.deniedTools.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">{t("deniedTools")}</div>
              <div className="flex flex-wrap gap-2">
                {merged.permissions.deniedTools.map((tool) => (
                  <Badge key={tool} variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    {tool}
                  </Badge>
                ))}
              </div>
            </div>
          )}
      </CardContent>
    </Card>
  );
}
