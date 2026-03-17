"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConvMessage } from "@/components/sessions/conv-message";
import { LiveAssistantMessage } from "@/components/chat/live-assistant-message";
import { MarkdownContent } from "@/components/markdown-content";
import { MessageCircle, Terminal, User } from "lucide-react";
import type { LiveChatMessage } from "@/lib/chat-types";
import type { SessionMessage } from "@/components/sessions/types";
import type { ChatCommand } from "@/lib/chat-commands";

interface ChatMessageAreaProps {
  loading: boolean;
  isViewingSession: boolean;
  chatMode: "session" | "chat";
  claudeSessionId: string;
  chatProvider: string;

  // Session messages
  visibleMessages: SessionMessage[];
  showTools: boolean;
  convSearchLower: string;
  matchedIndices: number[];
  convSearchMatch: number;

  // Live chat messages
  chatMessages: LiveChatMessage[];

  // Empty state actions
  allCommands: ChatCommand[];
  onCommandSelect: (cmd: ChatCommand) => void;
  onSend: (message: string) => void;
  onStartNewChat: () => void;

  // i18n - accepts next-intl Translator
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: any) => string;
}

export function ChatMessageArea({
  loading,
  isViewingSession,
  chatMode,
  claudeSessionId,
  chatProvider,
  visibleMessages,
  showTools,
  convSearchLower,
  matchedIndices,
  convSearchMatch,
  chatMessages,
  allCommands,
  onCommandSelect,
  onSend,
  onStartNewChat,
  t,
}: ChatMessageAreaProps) {
  return (
    <>
      {/* Session loading */}
      {loading && (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3 py-3 px-4">
              <Skeleton className="h-7 w-7 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-20 w-full rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !isViewingSession && chatMessages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <MessageCircle className="h-16 w-16 mb-6 opacity-15" />
          {chatMode === "chat" ? (
            <>
              <p className="text-xl mb-2 font-semibold text-foreground">{t("startConversation")}</p>
              <p className="text-sm max-w-md text-center">
                {t("typeMessage")}
                {claudeSessionId && <span className="block mt-1 font-mono text-xs opacity-60">{t("sessionLabel")}: {claudeSessionId.slice(0, 8)}...</span>}
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-5">
                {(chatProvider === "codex" ? [
                  { name: "/help", desc: "Commands" },
                  { name: "/model", desc: "Model" },
                  { name: "/config", desc: "Config" },
                  { name: "/status", desc: "Status" },
                  { name: "/compact", desc: "Compact" },
                ] : [
                  { name: "/help", desc: "Commands" },
                  { name: "/commit", desc: "Commit" },
                  { name: "/review-pr", desc: "Review PR" },
                  { name: "/model", desc: "Model" },
                  { name: "/cost", desc: "Cost" },
                ]).map((qa) => (
                  <Button
                    key={qa.name}
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-full gap-1.5"
                    onClick={() => {
                      const cmd = allCommands.find((c) => c.name === qa.name);
                      if (cmd) onCommandSelect(cmd);
                      else onSend(qa.name);
                    }}
                  >
                    <Terminal className="h-3 w-3" />
                    {qa.name}
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-xl mb-2 font-semibold text-foreground">{t("welcomeChat")}</p>
              <p className="text-sm max-w-md text-center mb-4">
                {t("welcomeDesc")}
              </p>
              <Button onClick={onStartNewChat} size="sm">
                <MessageCircle className="h-4 w-4 mr-2" />{t("newChat")}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Session messages */}
      {!loading && isViewingSession && (
        <div className="divide-y divide-border/30">
          {visibleMessages.map((msg, i) => (
            <ConvMessage
              key={msg.uuid}
              msg={msg}
              showTools={showTools}
              searchHighlight={convSearchLower}
              isSearchMatch={convSearchLower ? matchedIndices[convSearchMatch] === i : false}
            />
          ))}
        </div>
      )}

      {/* Live chat messages */}
      {chatMessages.length > 0 && (
        <div className="divide-y divide-border/30">
          {chatMessages.map((msg) =>
            msg.role === "user" ? (
              <div key={msg.id} className="flex gap-3 py-3 px-4 bg-blue-50/50 dark:bg-blue-950/20">
                <div className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-blue-100 dark:bg-blue-900">
                  <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold">{t("you")}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <MarkdownContent content={msg.text} className="text-sm" />
                </div>
              </div>
            ) : (
              <LiveAssistantMessage key={msg.id} message={msg} showTools={showTools} providerLabel={chatProvider === "codex" ? "Codex" : "Claude"} />
            )
          )}
        </div>
      )}
    </>
  );
}
