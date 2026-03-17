"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageCircle, Wrench, Download, RefreshCw, DollarSign,
  ExternalLink, Copy, Check,
} from "lucide-react";
import { shortModel, fmtCost } from "@/lib/format-utils";
import type { SessionDetail } from "@/components/sessions/types";

interface ChatTopBarProps {
  // Session mode
  isViewingSession: boolean;
  sessionDetail: SessionDetail | null;
  isSessionActive: boolean;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  showTools: boolean;
  onToggleTools: () => void;
  onExport: () => void;
  onViewInSessions: () => void;
  idCopied: boolean;
  onCopyId: (id: string) => void;

  // Chat mode
  chatMode: "session" | "chat";
  claudeSessionId: string;
  cliModel: string;
  chatMessagesCount: number;

  // i18n - accepts next-intl Translator
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: any) => string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tc: (key: string, values?: any) => string;
}

export function ChatTopBar({
  isViewingSession,
  sessionDetail,
  isSessionActive,
  autoRefresh,
  onToggleAutoRefresh,
  showTools,
  onToggleTools,
  onExport,
  onViewInSessions,
  idCopied,
  onCopyId,
  chatMode,
  claudeSessionId,
  cliModel,
  chatMessagesCount,
  t,
  tc,
}: ChatTopBarProps) {
  return (
    <div className="border-b bg-card px-3 sm:px-4 py-2.5 flex items-center gap-2 flex-shrink-0">
      {isViewingSession && sessionDetail ? (
        <>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold truncate">{sessionDetail.projectName}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>{sessionDetail.startTime ? new Date(sessionDetail.startTime).toLocaleString("zh-CN") : ""}</span>
              <button
                onClick={() => onCopyId(sessionDetail.id)}
                className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded border bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                title={`Click to copy: ${sessionDetail.id}`}
              >
                {idCopied ? <Check className="h-2.5 w-2.5 text-green-500" /> : <Copy className="h-2.5 w-2.5" />}
                {sessionDetail.id.slice(0, 8)}...
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            {sessionDetail.model && (
              <Badge variant="secondary" className="text-xs hidden sm:inline-flex">{shortModel(sessionDetail.model)}</Badge>
            )}
            {isSessionActive && (
              <Button
                variant={autoRefresh ? "default" : "outline"} size="sm" className="text-xs h-8 sm:h-7 touch-manipulation"
                onClick={onToggleAutoRefresh}
              >
                <RefreshCw className={`h-3 w-3 sm:mr-1 ${autoRefresh ? "animate-spin" : ""}`} /><span className="hidden sm:inline">{t("live")}</span>
              </Button>
            )}
            <Button variant={showTools ? "default" : "outline"} size="sm" className="text-xs h-8 sm:h-7 touch-manipulation" onClick={onToggleTools}>
              <Wrench className="h-3 w-3 sm:mr-1" /><span className="hidden sm:inline">{t("tools")}</span>
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-8 sm:h-7 hidden sm:inline-flex touch-manipulation" onClick={onExport}>
              <Download className="h-3 w-3 mr-1" />{tc("export")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 sm:h-7 hidden md:inline-flex touch-manipulation"
              onClick={onViewInSessions}
              title={t("viewInSessions")}
            >
              <ExternalLink className="h-3 w-3 mr-1" />{t("sessions")}
            </Button>
            <Badge variant="outline" className="text-xs font-mono hidden sm:inline-flex">
              <DollarSign className="h-3 w-3" />{fmtCost(sessionDetail.estimatedCost)}
            </Badge>
          </div>
        </>
      ) : (
        <>
          <MessageCircle className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">{chatMode === "chat" ? t("newChat") : t("title")}</h1>
          <div className="flex items-center gap-1.5 ml-auto">
            {claudeSessionId && (
              <button
                onClick={() => onCopyId(claudeSessionId)}
                className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded border bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                title={`Click to copy: ${claudeSessionId}`}
              >
                {idCopied ? <Check className="h-2.5 w-2.5 text-green-500" /> : <Copy className="h-2.5 w-2.5" />}
                {claudeSessionId.slice(0, 8)}...
              </button>
            )}
            {cliModel && (
              <Badge variant="secondary" className="text-xs">{shortModel(cliModel)}</Badge>
            )}
            <Button variant={showTools ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={onToggleTools}>
              <Wrench className="h-3 w-3 mr-1" />{t("tools")}
            </Button>
            {chatMessagesCount > 0 && (
              <Badge variant="outline" className="text-xs">{t("messagesCount", { count: chatMessagesCount })}</Badge>
            )}
          </div>
        </>
      )}
    </div>
  );
}
