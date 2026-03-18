"use client";

import { MutableRefObject } from "react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/provider";
import {
  Loader2,
  Wand2,
  Save,
  RotateCcw,
} from "lucide-react";
import { CreatorType, Step, TYPE_CONFIG } from "./ai-creator-types";

const TYPE_LABELS_ZH: Record<CreatorType, string> = {
  skill: "技能",
  agent: "Agent",
  rule: "规则",
  hook: "Hook",
};

interface AiCreatorFooterProps {
  step: Step;
  type: CreatorType;
  saving: boolean;
  description: string;
  hookCommand: string;
  name: string;
  abortRef: MutableRefObject<AbortController | null>;
  onClose: () => void;
  onGenerate: () => void;
  onSave: () => void;
  onSaveHook: () => void;
  onRegenerate: () => void;
  onCancelGeneration: () => void;
}

export function AiCreatorFooter({
  step,
  type,
  saving,
  description,
  hookCommand,
  name,
  onClose,
  onGenerate,
  onSave,
  onSaveHook,
  onRegenerate,
  onCancelGeneration,
}: AiCreatorFooterProps) {
  const { locale } = useLocale();
  const isZh = locale === "zh-CN";

  const typeLabel = isZh ? TYPE_LABELS_ZH[type] : TYPE_CONFIG[type].label;

  return (
    <div className="px-6 py-4 border-t flex items-center justify-between shrink-0">
      <div>
        {step === "preview" && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={onRegenerate}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {isZh ? "重新生成" : "Regenerate"}
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
          {isZh ? "取消" : "Cancel"}
        </Button>
        {step === "input" && type !== "hook" && (
          <Button
            size="sm"
            className="gap-1.5"
            onClick={onGenerate}
            disabled={!description.trim()}
          >
            <Wand2 className="h-3.5 w-3.5" />
            {isZh ? "生成" : "Generate"}
          </Button>
        )}
        {step === "input" && type === "hook" && (
          <Button
            size="sm"
            className="gap-1.5"
            onClick={onSaveHook}
            disabled={saving || !hookCommand.trim()}
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {isZh ? "保存中..." : "Saving..."}
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                {isZh ? "创建 Hook" : "Create Hook"}
              </>
            )}
          </Button>
        )}
        {step === "generating" && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCancelGeneration}
          >
            {isZh ? "取消生成" : "Cancel Generation"}
          </Button>
        )}
        {step === "preview" && (
          <Button
            size="sm"
            className="gap-1.5"
            onClick={onSave}
            disabled={saving || !name.trim()}
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {isZh ? "保存中..." : "Saving..."}
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                {isZh ? `保存${typeLabel}` : `Save ${typeLabel}`}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
