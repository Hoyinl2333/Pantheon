"use client";

import { MutableRefObject } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Wand2,
  Save,
  RotateCcw,
} from "lucide-react";
import { CreatorType, Step, TYPE_CONFIG } from "./ai-creator-types";

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
            Regenerate
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        {step === "input" && type !== "hook" && (
          <Button
            size="sm"
            className="gap-1.5"
            onClick={onGenerate}
            disabled={!description.trim()}
          >
            <Wand2 className="h-3.5 w-3.5" />
            Generate
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
                Saving...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Create Hook
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
            Cancel Generation
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
                Saving...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save {TYPE_CONFIG[type].label}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
