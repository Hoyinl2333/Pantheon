"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";
import { HookDisplay } from "./setting-row";
import { useTranslations } from "next-intl";
import type { ClaudeSettings } from "@/lib/settings-reader";

interface HooksSettingsProps {
  merged: ClaudeSettings;
}

export function HooksSettings({ merged }: HooksSettingsProps) {
  const t = useTranslations("settings.hooks");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("description")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <HookDisplay
          label={t("preToolUse")}
          hook={merged.preToolUseHook}
        />
        <HookDisplay
          label={t("postToolUse")}
          hook={merged.postToolUseHook}
        />
        <HookDisplay label={t("stop")} hook={merged.stopHook} />
      </CardContent>
    </Card>
  );
}
