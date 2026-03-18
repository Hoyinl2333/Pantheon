"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import { useTranslations } from "next-intl";
import {
  MessageCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Send,
  Save,
  Eye,
  EyeOff,
  Radio,
  Globe,
} from "lucide-react";
import type { BotStatus, PollingStatus, ApprovalStatus, EnvVar, BotMode } from "./telegram-types";
import { TelegramPollingPanel } from "./telegram-polling-panel";
import { TelegramWebhookPanel } from "./telegram-webhook-panel";
import { TelegramApprovalPanel } from "./telegram-approval-panel";
import { TelegramSetupGuide } from "./telegram-setup-guide";

export function TelegramSettings() {
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [botLoading, setBotLoading] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookAutoFilled, setWebhookAutoFilled] = useState(false);
  const [settingWebhook, setSettingWebhook] = useState(false);
  const [testingSend, setTestingSend] = useState(false);
  const { toast } = useToast();
  const t = useTranslations("settings.telegram");

  const [envVars, setEnvVars] = useState<Record<string, EnvVar>>({});
  const [tokenInput, setTokenInput] = useState("");
  const [chatIdsInput, setChatIdsInput] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [savingEnv, setSavingEnv] = useState(false);

  const [botMode, setBotMode] = useState<BotMode>("webhook");
  const [pollingStatus, setPollingStatus] = useState<PollingStatus>({ polling: false, uptime: null });
  const [pollingLoading, setPollingLoading] = useState(false);

  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>({ available: false, chatId: null });

  const fetchPollingStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/bot/telegram/polling");
      if (res.ok) {
        const data = await res.json();
        setPollingStatus(data);
        if (data.polling) setBotMode("polling");
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [botRes, envRes, approvalRes] = await Promise.all([
          fetch("/api/bot/telegram/setup").then((r) => r.json()),
          fetch("/api/env").then((r) => r.json()),
          fetch("/api/bot/telegram/approval").then((r) => r.json()).catch(() => ({ available: false, chatId: null })),
        ]);

        setBotStatus(botRes);
        setApprovalStatus(approvalRes);
        const vars = envRes.vars || {};
        setEnvVars(vars);

        if (vars.TELEGRAM_BOT_TOKEN) setTokenInput(vars.TELEGRAM_BOT_TOKEN.value);
        if (vars.TELEGRAM_CHAT_IDS) setChatIdsInput(vars.TELEGRAM_CHAT_IDS.value);

        if (botRes.url) {
          setWebhookUrl(botRes.url);
        } else if (vars.PTN_BASE_URL) {
          const presetUrl = `${vars.PTN_BASE_URL.value}/api/bot/telegram`;
          setWebhookUrl(presetUrl);
          setWebhookAutoFilled(true);
        }

        await fetchPollingStatus();
      } catch {
        setBotStatus({ configured: false, url: null, error: t("connectFailed") });
      } finally {
        setBotLoading(false);
      }
    };
    loadAll();
  }, [fetchPollingStatus]);

  useEffect(() => {
    if (botMode !== "polling") return;
    const interval = setInterval(fetchPollingStatus, 10_000);
    return () => clearInterval(interval);
  }, [botMode, fetchPollingStatus]);

  const handleSetWebhook = async () => {
    if (!webhookUrl.trim()) {
      toast(t("webhookUrlRequired"), "error");
      return;
    }
    setSettingWebhook(true);
    try {
      const res = await fetch("/api/bot/telegram/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast(t("webhookSetSuccess"), "success");
        setBotStatus({
          configured: true,
          url: webhookUrl.trim(),
          pendingUpdateCount: 0,
          lastErrorMessage: null,
        });
      } else {
        toast(data.error || t("webhookSetError"), "error");
      }
    } catch {
      toast(t("webhookSetError"), "error");
    } finally {
      setSettingWebhook(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingSend(true);
    try {
      const res = await fetch("/api/bot/telegram/setup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast(t("testSuccess"), "success");
      } else {
        toast(data.error || t("testError"), "error");
      }
    } catch {
      toast(t("testError"), "error");
    } finally {
      setTestingSend(false);
    }
  };

  const handleSaveEnv = async () => {
    setSavingEnv(true);
    try {
      const updates: Record<string, string> = {};
      if (tokenInput !== (envVars.TELEGRAM_BOT_TOKEN?.value || "")) {
        updates.TELEGRAM_BOT_TOKEN = tokenInput;
      }
      if (chatIdsInput !== (envVars.TELEGRAM_CHAT_IDS?.value || "")) {
        updates.TELEGRAM_CHAT_IDS = chatIdsInput;
      }

      if (Object.keys(updates).length === 0) {
        toast(t("noChangesToSave"), "info");
        setSavingEnv(false);
        return;
      }

      const res = await fetch("/api/env", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast(t("envSavedRestart"), "success");
      } else {
        toast(data.error || t("envSaveFailed"), "error");
      }
    } catch {
      toast(t("envSaveFailed"), "error");
    } finally {
      setSavingEnv(false);
    }
  };

  const handlePollingToggle = async () => {
    setPollingLoading(true);
    const action = pollingStatus.polling ? "stop" : "start";
    try {
      const res = await fetch("/api/bot/telegram/polling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast(t(action === "start" ? "pollingStarted" : "pollingStopped"), "success");
        await fetchPollingStatus();
      } else {
        toast(data.error || t(action === "start" ? "pollingStartFailed" : "pollingStopFailed"), "error");
      }
    } catch {
      toast(t(action === "start" ? "pollingStartFailed" : "pollingStopFailed"), "error");
    } finally {
      setPollingLoading(false);
    }
  };

  const formatUptime = (ms: number | null): string => {
    if (ms === null) return "-";
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const isTokenConfigured = !!envVars.TELEGRAM_BOT_TOKEN || botStatus?.error !== "TELEGRAM_BOT_TOKEN not configured";

  const commands = [
    { cmd: "/help", key: "help" as const },
    { cmd: "/sessions", key: "sessions" as const },
    { cmd: "/status", key: "status" as const },
    { cmd: "/chat", key: "chat" as const },
    { cmd: "/bg", key: "bg" as const },
    { cmd: "/queue", key: "queue" as const },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("description")}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Configuration */}
        <div className="space-y-4">
          <div className="text-sm font-medium">{t("configuration")}</div>

          {/* Bot Token */}
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">{t("botToken")}</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showToken ? "text" : "password"}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="w-full px-3 py-1.5 pr-10 text-sm font-mono border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="123456:ABC-DEF..."
                />
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {envVars.TELEGRAM_BOT_TOKEN && (
              <div className="text-xs text-muted-foreground">
                {t("tokenSource", { source: envVars.TELEGRAM_BOT_TOKEN.source })}
              </div>
            )}
          </div>

          {/* Chat IDs */}
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">{t("allowedChatIds")}</label>
            <input
              type="text"
              value={chatIdsInput}
              onChange={(e) => setChatIdsInput(e.target.value)}
              className="w-full px-3 py-1.5 text-sm font-mono border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={t("chatIdsPlaceholder")}
            />
          </div>

          {/* Save button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveEnv}
            disabled={savingEnv}
          >
            {savingEnv ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            {t("saveToEnv")}
          </Button>
        </div>

        {/* Status */}
        {botLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("checkingStatus")}
          </div>
        ) : isTokenConfigured ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="default">
                <CheckCircle className="h-3 w-3 mr-1" />
                {t("tokenConfigured")}
              </Badge>
              {pollingStatus.polling && (
                <Badge variant="default">
                  <Radio className="h-3 w-3 mr-1" />
                  {t("pollingActive")}
                </Badge>
              )}
              {!pollingStatus.polling && botStatus?.configured && botStatus.url && (
                <Badge variant="default">
                  <Globe className="h-3 w-3 mr-1" />
                  {t("webhookActive")}
                </Badge>
              )}
            </div>

            {/* Mode Selector */}
            <div className="space-y-3">
              <div className="text-sm font-medium">{t("botMode")}</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setBotMode("polling")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    botMode === "polling"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <Radio className="h-3.5 w-3.5" />
                  {t("modePolling")}
                </button>
                <button
                  onClick={() => setBotMode("webhook")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    botMode === "webhook"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <Globe className="h-3.5 w-3.5" />
                  {t("modeWebhook")}
                </button>
              </div>
            </div>

            {botMode === "polling" && (
              <TelegramPollingPanel
                pollingStatus={pollingStatus}
                pollingLoading={pollingLoading}
                onPollingToggle={handlePollingToggle}
                formatUptime={formatUptime}
              />
            )}

            {botMode === "webhook" && (
              <TelegramWebhookPanel
                botStatus={botStatus}
                webhookUrl={webhookUrl}
                webhookAutoFilled={webhookAutoFilled}
                settingWebhook={settingWebhook}
                onWebhookUrlChange={(value) => {
                  setWebhookUrl(value);
                  setWebhookAutoFilled(false);
                }}
                onSetWebhook={handleSetWebhook}
              />
            )}

            <TelegramApprovalPanel approvalStatus={approvalStatus} />

            {/* Test Connection */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testingSend}
            >
              {testingSend ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Send className="h-3.5 w-3.5 mr-1" />
              )}
              {t("testConnection")}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              <XCircle className="h-3 w-3 mr-1" />
              {t("notActive")}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {t("configureHint")}
            </span>
          </div>
        )}

        <TelegramSetupGuide
          isTokenConfigured={isTokenConfigured}
          tokenInput={tokenInput}
          chatIdsInput={chatIdsInput}
          pollingStatus={pollingStatus}
          botStatus={botStatus}
        />

        {/* Supported Commands */}
        <div className="space-y-2">
          <div className="text-sm font-medium">{t("supportedCommands")}</div>
          <div className="grid grid-cols-2 gap-1.5">
            {commands.map((item) => (
              <div
                key={item.cmd}
                className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1.5"
              >
                <code className="font-mono font-medium text-primary">
                  {item.cmd}
                </code>
                <span className="text-muted-foreground">{t(`commands.${item.key}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
