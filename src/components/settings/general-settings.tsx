"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocale } from "@/i18n/provider";
import { locales, localeLabels, type Locale } from "@/i18n/config";

interface ApiKeyOption {
  id: string;
  name: string;
  provider: string;
  key_masked: string;
}

interface GeneralSettingsProps {
  defaultModel: string;
  codexDefaultModel: string;
  codexApiKeyId: string;
  codexInstalled: boolean;
  theme: string;
  autoUpdate: boolean;
  alwaysThinkingEnabled: boolean;
  onDefaultModelChange: (v: string) => void;
  onCodexDefaultModelChange: (v: string) => void;
  onCodexApiKeyChange: (v: string) => void;
  onThemeChange: (v: string) => void;
  onAutoUpdateChange: (v: boolean) => void;
  onThinkingChange: (v: boolean) => void;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2 first:pt-0">
      {children}
    </div>
  );
}

// Codex / OpenAI model groups
const CODEX_MODEL_GROUPS = [
  {
    label: "Reasoning",
    models: [
      { value: "o3-pro", label: "o3-Pro" },
      { value: "o3", label: "o3" },
      { value: "o4-mini", label: "o4-Mini" },
      { value: "o1", label: "o1" },
      { value: "o1-mini", label: "o1-Mini" },
    ],
  },
  {
    label: "GPT",
    models: [
      { value: "gpt-5.4", label: "GPT-5.4" },
      { value: "gpt-5.4-pro", label: "GPT-5.4 Pro" },
      { value: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
      { value: "gpt-5.3-codex", label: "GPT-5.3 Codex" },
      { value: "gpt-5.3", label: "GPT-5.3" },
      { value: "gpt-5.2", label: "GPT-5.2" },
      { value: "gpt-4.1", label: "GPT-4.1" },
      { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
      { value: "gpt-4.1-nano", label: "GPT-4.1 Nano" },
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    ],
  },
  {
    label: "Codex",
    models: [
      { value: "codex-mini-latest", label: "Codex Mini (Latest)" },
    ],
  },
];

export function GeneralSettings({
  defaultModel,
  codexDefaultModel,
  codexApiKeyId,
  codexInstalled,
  theme,
  autoUpdate,
  alwaysThinkingEnabled,
  onDefaultModelChange,
  onCodexDefaultModelChange,
  onCodexApiKeyChange,
  onThemeChange,
  onAutoUpdateChange,
  onThinkingChange,
}: GeneralSettingsProps) {
  const t = useTranslations("settings.general");
  const { locale, setLocale } = useLocale();

  // Fetch OpenAI-compatible API keys for Codex
  const [apiKeys, setApiKeys] = useState<ApiKeyOption[]>([]);
  useEffect(() => {
    fetch("/api/plugins/api-management/keys")
      .then((r) => r.json())
      .then((data) => {
        if (data.keys) {
          const openaiKeys = data.keys.filter(
            (k: ApiKeyOption & { is_active: number }) =>
              k.is_active && (k.provider === "openai" || k.provider === "openrouter" || k.provider === "custom")
          );
          setApiKeys(openaiKeys);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <SettingsIcon className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("description")}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Models Section */}
        <SectionHeader>{t("sectionModels")}</SectionHeader>

        {/* Claude Default Model */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{t("defaultModel")}</div>
            <div className="text-xs text-muted-foreground">
              {t("defaultModelDesc")}
            </div>
          </div>
          <Select value={defaultModel} onValueChange={onDefaultModelChange}>
            <SelectTrigger size="sm" className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="claude-opus-4-6">Opus 4.6</SelectItem>
              <SelectItem value="claude-sonnet-4-5-20250929">Sonnet 4.5</SelectItem>
              <SelectItem value="claude-haiku-4-5-20251001">Haiku 4.5</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Codex Default Model */}
        {codexInstalled && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{t("codexModel")}</div>
                <div className="text-xs text-muted-foreground">
                  {t("codexModelDesc")}
                </div>
              </div>
              <Select value={codexDefaultModel} onValueChange={onCodexDefaultModelChange}>
                <SelectTrigger size="sm" className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CODEX_MODEL_GROUPS.map((group) => (
                    <div key={group.label}>
                      <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {group.label}
                      </div>
                      {group.models.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Codex API Key */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5" />
                  {t("codexApiKey")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("codexApiKeyDesc")}
                </div>
              </div>
              <Select value={codexApiKeyId} onValueChange={onCodexApiKeyChange}>
                <SelectTrigger size="sm" className="w-[200px]">
                  <SelectValue placeholder="OPENAI_API_KEY env" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="env">{t("codexApiKeyEnv")}</SelectItem>
                  {apiKeys.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      <span className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[9px] px-1 py-0">{k.provider}</Badge>
                        {k.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Appearance Section */}
        <SectionHeader>{t("sectionAppearance")}</SectionHeader>

        {/* Theme */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{t("theme")}</div>
            <div className="text-xs text-muted-foreground">
              {t("themeDesc")}
            </div>
          </div>
          <Select value={theme} onValueChange={onThemeChange}>
            <SelectTrigger size="sm" className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">{t("themeSystem")}</SelectItem>
              <SelectItem value="dark">{t("themeDark")}</SelectItem>
              <SelectItem value="light">{t("themeLight")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Language */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{t("language")}</div>
            <div className="text-xs text-muted-foreground">
              {t("languageDesc")}
            </div>
          </div>
          <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
            <SelectTrigger size="sm" className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {locales.map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {localeLabels[loc]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Behavior Section */}
        <SectionHeader>{t("sectionBehavior")}</SectionHeader>

        {/* Auto Update */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{t("autoUpdate")}</div>
            <div className="text-xs text-muted-foreground">
              {t("autoUpdateDesc")}
            </div>
          </div>
          <Switch checked={autoUpdate} onCheckedChange={onAutoUpdateChange} />
        </div>

        {/* Extended Thinking */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{t("extendedThinking")}</div>
            <div className="text-xs text-muted-foreground">
              {t("extendedThinkingDesc")}
            </div>
          </div>
          <Switch
            checked={alwaysThinkingEnabled}
            onCheckedChange={onThinkingChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}
