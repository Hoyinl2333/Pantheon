"use client";

import { useEffect, useState } from "react";
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
  Save,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Shield,
} from "lucide-react";

interface FeishuStatus {
  configured: boolean;
  appId?: string;
  error?: string;
}

interface EnvVar {
  value: string;
  masked: string;
  source: "env.local" | "process";
}

function DetailSection({ title, icon, children, defaultOpen = false }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border/50 rounded-md overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-muted/50 transition-colors"
      >
        {icon}
        <span className="flex-1 text-left">{title}</span>
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="px-3 pb-3 text-xs text-muted-foreground space-y-1.5 border-t border-border/30 pt-2">
          {children}
        </div>
      )}
    </div>
  );
}

function SetupGuide({ appId, appSecret, configured }: { appId: string; appSecret: string; configured: boolean }) {
  const [showGuide, setShowGuide] = useState(false);
  const t = useTranslations("settings.feishu");

  return (
    <div className="space-y-2">
      <button
        onClick={() => setShowGuide(!showGuide)}
        className="flex items-center gap-1 text-sm font-medium hover:text-foreground transition-colors"
      >
        {showGuide ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {configured ? t("setupGuide") : t("quickSetup")}
      </button>
      {showGuide && (
        <div className="bg-muted/50 rounded-lg p-4 space-y-4 text-sm">
          {/* Step 1 */}
          <div className="flex gap-3">
            <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
              appId ? "border-green-500 bg-green-500/10 text-green-600" : "border-primary bg-primary/10 text-primary"
            }`}>
              {appId ? <CheckCircle className="h-4 w-4 text-green-500" /> : "1"}
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="font-medium">{t("guide.step1Title")}</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>{t("guide.step1_1")}</p>
                <p>{t("guide.step1_2")}</p>
                <p>{t("guide.step1_3")}</p>
                <p>{t("guide.step1_4")}</p>
                <p>{t("guide.step1_5")}</p>
                <p>{t("guide.step1_6")}</p>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-3">
            <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
              appSecret ? "border-green-500 bg-green-500/10 text-green-600" : appId ? "border-primary bg-primary/10 text-primary" : "border-muted-foreground/30 text-muted-foreground"
            }`}>
              {appSecret ? <CheckCircle className="h-4 w-4 text-green-500" /> : "2"}
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="font-medium">{t("guide.step2Title")}</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>{t("guide.step2_1")}</p>
                <p>{t("guide.step2_2")}</p>
                <p>{t("guide.step2_3")}</p>
                <p>{t("guide.step2_4")}</p>
                <p>{t("guide.step2_5")}</p>
                <p>{t("guide.step2_6")}</p>
                <p>{t("guide.step2_7")}</p>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-3">
            <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
              configured ? "border-green-500 bg-green-500/10 text-green-600" : (appId && appSecret) ? "border-primary bg-primary/10 text-primary" : "border-muted-foreground/30 text-muted-foreground"
            }`}>
              {configured ? <CheckCircle className="h-4 w-4 text-green-500" /> : "3"}
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="font-medium">{t("guide.step3Title")}</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>{t("guide.step3_1")}</p>
                <p>{t("guide.step3_2")}</p>
                <p>{t("guide.step3_3")}</p>
                <p>{t("guide.step3_4")}</p>
                <p>{t("guide.step3_5")}</p>
                <p>{t("guide.step3_6")}</p>
              </div>
            </div>
          </div>

          {/* Collapsible: Required Permissions */}
          <DetailSection
            title={t("guide.permissionsTitle")}
            icon={<Shield className="h-3.5 w-3.5 text-blue-500" />}
          >
            <p>{t("guide.permissionsDesc")}</p>
            <ul className="list-disc list-inside space-y-0.5 ml-1">
              <li><code className="bg-muted px-1 rounded font-mono">{t("guide.perm1")}</code></li>
              <li><code className="bg-muted px-1 rounded font-mono">{t("guide.perm2")}</code></li>
              <li><code className="bg-muted px-1 rounded font-mono">{t("guide.perm3")}</code></li>
            </ul>
          </DetailSection>

          {/* Collapsible: FAQ */}
          <DetailSection
            title={t("guide.faqTitle")}
            icon={<HelpCircle className="h-3.5 w-3.5 text-amber-500" />}
          >
            <div className="space-y-3">
              <div>
                <div className="font-medium text-foreground">{t("guide.faq1Q")}</div>
                <p>{t("guide.faq1A")}</p>
              </div>
              <div>
                <div className="font-medium text-foreground">{t("guide.faq2Q")}</div>
                <p>{t("guide.faq2A")}</p>
              </div>
              <div>
                <div className="font-medium text-foreground">{t("guide.faq3Q")}</div>
                <p>{t("guide.faq3A")}</p>
              </div>
            </div>
          </DetailSection>
        </div>
      )}
    </div>
  );
}

export function FeishuSettings() {
  const [status, setStatus] = useState<FeishuStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const t = useTranslations("settings.feishu");

  // Env config state
  const [envVars, setEnvVars] = useState<Record<string, EnvVar>>({});
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [encryptKey, setEncryptKey] = useState("");
  const [allowedChats, setAllowedChats] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [savingEnv, setSavingEnv] = useState(false);

  useEffect(() => {
    fetch("/api/bot/feishu/status")
      .then((r) => r.json())
      .then((data) => setStatus(data))
      .catch(() => setStatus({ configured: false, error: "Failed to check" }))
      .finally(() => setLoading(false));
  }, []);

  // Load env vars
  useEffect(() => {
    fetch("/api/env")
      .then((r) => r.json())
      .then((data) => {
        const vars: Record<string, EnvVar> = data.vars || {};
        setEnvVars(vars);
        if (vars.FEISHU_APP_ID) setAppId(vars.FEISHU_APP_ID.value);
        if (vars.FEISHU_APP_SECRET) setAppSecret(vars.FEISHU_APP_SECRET.value);
        if (vars.FEISHU_VERIFICATION_TOKEN) setVerifyToken(vars.FEISHU_VERIFICATION_TOKEN.value);
        if (vars.FEISHU_ENCRYPT_KEY) setEncryptKey(vars.FEISHU_ENCRYPT_KEY.value);
        if (vars.FEISHU_ALLOWED_CHATS) setAllowedChats(vars.FEISHU_ALLOWED_CHATS.value);
      })
      .catch(() => {});
  }, []);

  const handleSaveEnv = async () => {
    setSavingEnv(true);
    try {
      const updates: Record<string, string> = {};
      const check = (key: string, val: string) => {
        if (val !== (envVars[key]?.value || "")) updates[key] = val;
      };
      check("FEISHU_APP_ID", appId);
      check("FEISHU_APP_SECRET", appSecret);
      check("FEISHU_VERIFICATION_TOKEN", verifyToken);
      check("FEISHU_ENCRYPT_KEY", encryptKey);
      check("FEISHU_ALLOWED_CHATS", allowedChats);

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
        {/* Status */}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("checkingStatus")}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {status?.configured ? (
              <Badge variant="default">
                <CheckCircle className="h-3 w-3 mr-1" />
                {t("configured")}
              </Badge>
            ) : (
              <Badge variant="secondary">
                <XCircle className="h-3 w-3 mr-1" />
                {t("notConfigured")}
              </Badge>
            )}
          </div>
        )}

        {/* Configuration Fields */}
        <div className="space-y-4">
          <div className="text-sm font-medium">{t("configuration")}</div>

          {/* App ID */}
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">{t("appId")}</label>
            <input
              type="text"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              className="w-full px-3 py-1.5 text-sm font-mono border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="cli_xxxxxxxxxxxx"
            />
          </div>

          {/* App Secret */}
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">{t("appSecret")}</label>
            <div className="relative">
              <input
                type={showSecret ? "text" : "password"}
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                className="w-full px-3 py-1.5 pr-10 text-sm font-mono border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
              />
              <button
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Verification Token */}
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">{t("verificationToken")} <span className="text-xs">{t("verificationTokenOptional")}</span></label>
            <input
              type="text"
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value)}
              className="w-full px-3 py-1.5 text-sm font-mono border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Optional verification token"
            />
          </div>

          {/* Encrypt Key */}
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">{t("encryptKey")} <span className="text-xs">{t("encryptKeyOptional")}</span></label>
            <input
              type="text"
              value={encryptKey}
              onChange={(e) => setEncryptKey(e.target.value)}
              className="w-full px-3 py-1.5 text-sm font-mono border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Optional encryption key"
            />
          </div>

          {/* Allowed Chats */}
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">{t("allowedChatIds")}</label>
            <input
              type="text"
              value={allowedChats}
              onChange={(e) => setAllowedChats(e.target.value)}
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

        {/* Quick Setup Guide */}
        <SetupGuide appId={appId} appSecret={appSecret} configured={!!status?.configured} />

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
