"use client";

import { Loader2 } from "lucide-react";
import { useLocale } from "@/i18n/provider";
import { MarkdownContent } from "@/components/markdown-content";
import { CreatorType, TYPE_CONFIG } from "./ai-creator-types";

const TYPE_LABELS_ZH: Record<CreatorType, string> = {
  skill: "技能",
  agent: "Agent",
  rule: "规则",
  hook: "Hook",
};

interface AiCreatorGeneratingProps {
  type: CreatorType;
  generatedContent: string;
}

export function AiCreatorGenerating({ type, generatedContent }: AiCreatorGeneratingProps) {
  const { locale } = useLocale();
  const isZh = locale === "zh-CN";

  const typeLabel = isZh ? TYPE_LABELS_ZH[type] : TYPE_CONFIG[type].label.toLowerCase();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 py-4">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <div>
          <p className="text-sm font-medium">
            {isZh ? `正在生成${typeLabel}...` : `Generating ${typeLabel}...`}
          </p>
          <p className="text-xs text-muted-foreground">
            {isZh ? "Claude 正在为你创建内容" : "Claude is creating your content"}
          </p>
        </div>
      </div>
      {generatedContent && (
        <div className="border rounded-lg p-4 bg-muted/20 max-h-[400px] overflow-auto">
          <MarkdownContent content={generatedContent} className="text-sm" />
        </div>
      )}
    </div>
  );
}
