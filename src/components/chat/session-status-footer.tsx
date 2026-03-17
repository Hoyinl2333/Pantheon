"use client";

import { fmtTokens, fmtCost } from "@/lib/format-utils";

interface SessionStatusFooterProps {
  visibleCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  cacheReadTokens: number;
  estimatedCost: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: any) => string;
}

export function SessionStatusFooter({
  visibleCount,
  totalInputTokens,
  totalOutputTokens,
  cacheReadTokens,
  estimatedCost,
  t,
}: SessionStatusFooterProps) {
  return (
    <div className="border-t bg-muted/30 px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground flex-shrink-0">
      <span>{t("messagesCount", { count: visibleCount })}</span>
      <span>{t("inOut", { input: fmtTokens(totalInputTokens), output: fmtTokens(totalOutputTokens) })}</span>
      {cacheReadTokens > 0 && <span>{t("cache", { tokens: fmtTokens(cacheReadTokens) })}</span>}
      <span className="ml-auto font-mono">{fmtCost(estimatedCost)}</span>
    </div>
  );
}
