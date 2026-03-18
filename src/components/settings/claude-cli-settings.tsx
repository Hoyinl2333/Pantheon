"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Terminal, CheckCircle, XCircle } from "lucide-react";
import { SettingRow } from "./setting-row";
import { useTranslations } from "next-intl";
import type { EnvironmentInfo, ClaudeSettings } from "@/lib/settings-reader";

interface ClaudeCliSettingsProps {
  environment: EnvironmentInfo;
  merged: ClaudeSettings;
}

export function ClaudeCliSettings({ environment, merged }: ClaudeCliSettingsProps) {
  const t = useTranslations("settings.claudeCli");
  const mcpServerCount = merged.mcpServers ? Object.keys(merged.mcpServers).length : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("description")}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {environment.claudeInstalled ? (
          <>
            <div className="flex items-center gap-2">
              <Badge variant="default">
                <CheckCircle className="h-3 w-3 mr-1" />
                {t("installed")}
              </Badge>
            </div>
            <SettingRow
              label={t("configPath")}
              value={`${environment.claudeDir}/settings.json`}
            />
            <SettingRow
              label={t("claudeDirectory")}
              value={environment.claudeDir}
            />
            <SettingRow
              label={t("mcpServers")}
              value={String(mcpServerCount)}
            />
          </>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                <XCircle className="h-3 w-3 mr-1" />
                {t("notInstalled")}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {t("installHint")}
            </div>
            <code className="block text-xs bg-muted px-3 py-2 rounded-md">
              npm install -g @anthropic-ai/claude-code
            </code>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
