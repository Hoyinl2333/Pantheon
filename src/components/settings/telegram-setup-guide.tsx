"use client";

import { useState } from "react";
import { CheckCircle, ChevronDown, ChevronRight, ArrowLeftRight, HelpCircle, Radio, Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { DetailSection } from "./telegram-detail-section";
import type { BotStatus, PollingStatus } from "./telegram-types";

export function TelegramSetupGuide({
  isTokenConfigured,
  tokenInput,
  chatIdsInput,
  pollingStatus,
  botStatus,
}: {
  isTokenConfigured: boolean;
  tokenInput: string;
  chatIdsInput: string;
  pollingStatus: PollingStatus;
  botStatus: BotStatus | null;
}) {
  const [showGuide, setShowGuide] = useState(false);
  const t = useTranslations("settings.telegram");

  return (
    <div className="space-y-2">
      <button
        onClick={() => setShowGuide(!showGuide)}
        className="flex items-center gap-1 text-sm font-medium hover:text-foreground transition-colors"
      >
        {showGuide ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {isTokenConfigured ? t("setupGuide") : t("quickSetup")}
      </button>
      {showGuide && (
        <div className="bg-muted/50 rounded-lg p-4 space-y-4 text-sm">
          {/* Step 1 */}
          <div className="flex gap-3">
            <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
              tokenInput ? "border-green-500 bg-green-500/10 text-green-600" : "border-primary bg-primary/10 text-primary"
            }`}>
              {tokenInput ? <CheckCircle className="h-4 w-4 text-green-500" /> : "1"}
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
              chatIdsInput ? "border-green-500 bg-green-500/10 text-green-600" : tokenInput ? "border-primary bg-primary/10 text-primary" : "border-muted-foreground/30 text-muted-foreground"
            }`}>
              {chatIdsInput ? <CheckCircle className="h-4 w-4 text-green-500" /> : "2"}
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="font-medium">{t("guide.step2Title")} <span className="font-normal text-muted-foreground">{t("guide.step2Optional")}</span></div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>{t("guide.step2_1")}</p>
                <p>{t("guide.step2_2")}</p>
                <p>{t("guide.step2_3")}</p>
                <p>{t("guide.step2_4")}</p>
                <p>{t("guide.step2_5")}</p>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-3">
            <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
              (pollingStatus.polling || botStatus?.url) ? "border-green-500 bg-green-500/10 text-green-600" : tokenInput ? "border-primary bg-primary/10 text-primary" : "border-muted-foreground/30 text-muted-foreground"
            }`}>
              {(pollingStatus.polling || botStatus?.url) ? <CheckCircle className="h-4 w-4 text-green-500" /> : "3"}
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="font-medium">{t("guide.step3Title")}</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>{t("guide.step3_1")}</p>
                <p>{t("guide.step3_2")}</p>
                <p>{t("guide.step3_3")}</p>
                <ul className="list-disc list-inside ml-2 space-y-0.5">
                  <li>{t("guide.step3Polling")}</li>
                  <li>{t("guide.step3Webhook")}</li>
                </ul>
                <p>{t("guide.step3_4")}</p>
              </div>
            </div>
          </div>

          {/* Collapsible: Mode Comparison */}
          <DetailSection
            title={t("guide.modeCompareTitle")}
            icon={<ArrowLeftRight className="h-3.5 w-3.5 text-blue-500" />}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 bg-background/50 rounded p-2">
                <div className="font-medium text-foreground flex items-center gap-1">
                  <Radio className="h-3 w-3" />
                  {t("guide.modePollingName")}
                </div>
                <ul className="list-disc list-inside space-y-0.5 ml-1">
                  <li>{t("guide.modePollingP1")}</li>
                  <li>{t("guide.modePollingP2")}</li>
                  <li>{t("guide.modePollingP3")}</li>
                  <li>{t("guide.modePollingP4")}</li>
                </ul>
              </div>
              <div className="space-y-1.5 bg-background/50 rounded p-2">
                <div className="font-medium text-foreground flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {t("guide.modeWebhookName")}
                </div>
                <ul className="list-disc list-inside space-y-0.5 ml-1">
                  <li>{t("guide.modeWebhookP1")}</li>
                  <li>{t("guide.modeWebhookP2")}</li>
                  <li>{t("guide.modeWebhookP3")}</li>
                  <li>{t("guide.modeWebhookP4")}</li>
                </ul>
              </div>
            </div>
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
