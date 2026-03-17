"use client";

import { Loader2 } from "lucide-react";
import { MarkdownContent } from "@/components/markdown-content";
import { CreatorType, TYPE_CONFIG } from "./ai-creator-types";

interface AiCreatorGeneratingProps {
  type: CreatorType;
  generatedContent: string;
}

export function AiCreatorGenerating({ type, generatedContent }: AiCreatorGeneratingProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 py-4">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <div>
          <p className="text-sm font-medium">Generating {TYPE_CONFIG[type].label.toLowerCase()}...</p>
          <p className="text-xs text-muted-foreground">Claude is creating your content</p>
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
