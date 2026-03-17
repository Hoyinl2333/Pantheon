"use client";

import { Badge } from "@/components/ui/badge";
import { MarkdownContent } from "@/components/markdown-content";
import {
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { formatTime, getAgentStyle } from "./types";
import type { TeamMessage } from "./types";

// ---- Message Bubble (list item) ----

export function MessageBubble({
  msg,
  isSelected,
  onSelect,
}: {
  msg: TeamMessage;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations("team");
  const style = getAgentStyle("", msg.from);
  const Icon = style.icon;
  const isLong = msg.text.length > 300;

  return (
    <div
      className={`flex gap-3 py-3 px-4 transition-colors cursor-pointer ${
        isSelected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/20"
      }`}
      onClick={onSelect}
    >
      <div
        className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${style.bg}`}
      >
        <Icon className={`h-4 w-4 ${style.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold">{msg.from}</span>
          {msg.to && (
            <>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{msg.to}</span>
            </>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {formatTime(msg.timestamp)}
          </span>
        </div>
        {msg.summary && (
          <div className="text-xs font-medium text-primary/80 mb-1.5 px-2 py-1 bg-primary/5 rounded inline-block">
            {msg.summary}
          </div>
        )}
        <div className={isLong ? "max-h-24 overflow-hidden relative" : ""}>
          <MarkdownContent content={msg.text} className="text-sm" />
          {isLong && (
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-background to-transparent" />
          )}
        </div>
        {isLong && (
          <div className="text-xs text-primary/60 mt-1 flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            {t("clickToRead")}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Message Detail Panel (right side) ----

export function MessageDetailPanel({
  msg,
  onClose,
}: {
  msg: TeamMessage;
  onClose: () => void;
}) {
  const t = useTranslations("team");
  const style = getAgentStyle("", msg.from);
  const Icon = style.icon;

  return (
    <div className="w-full sm:w-[45%] absolute sm:static inset-0 z-10 sm:z-auto border-l flex flex-col bg-background sm:bg-muted/5">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b flex-shrink-0">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${style.bg}`}>
          <Icon className={`h-4 w-4 ${style.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{msg.from}</span>
            {msg.to && (
              <>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{msg.to}</span>
              </>
            )}
          </div>
          <div className="text-xs text-muted-foreground">{formatTime(msg.timestamp)}</div>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
          ×
        </Button>
      </div>

      {/* Summary badge */}
      {msg.summary && (
        <div className="px-4 py-2 border-b">
          <div className="text-xs font-medium text-primary/80 px-2 py-1 bg-primary/5 rounded inline-block">
            {msg.summary}
          </div>
        </div>
      )}

      {/* Full message content */}
      <div className="flex-1 overflow-auto px-4 py-3">
        <MarkdownContent content={msg.text} className="text-sm" />
      </div>

      {/* Footer: char count */}
      <div className="px-4 py-1.5 border-t text-xs text-muted-foreground">
        {msg.text.length} {t("characters")}
      </div>
    </div>
  );
}
