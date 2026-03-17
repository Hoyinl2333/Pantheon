"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/toast";
import { X, Wand2 } from "lucide-react";
import {
  AiCreatorDialogProps,
  CreatorType,
  Step,
  TYPE_CONFIG,
  parseAssistantText,
  parseResultText,
  stripCodeFences,
  extractName,
} from "./ai-creator-types";
import { AiCreatorInputForm } from "./ai-creator-input-form";
import { AiCreatorGenerating } from "./ai-creator-generating";
import { AiCreatorPreview } from "./ai-creator-preview";
import { AiCreatorFooter } from "./ai-creator-footer";

export function AiCreatorDialog({ open, onClose, onSuccess, defaultType = "skill" }: AiCreatorDialogProps) {
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("input");
  const [type, setType] = useState<CreatorType>(defaultType);
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [ruleGroup, setRuleGroup] = useState("common");
  const [generatedContent, setGeneratedContent] = useState("");
  const [previewMode, setPreviewMode] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hookType, setHookType] = useState("PreToolUse");
  const [hookCommand, setHookCommand] = useState("");
  const [hookMatcher, setHookMatcher] = useState("");
  const [hookTimeout, setHookTimeout] = useState("");
  const [hookDescription, setHookDescription] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setStep("input");
      setType(defaultType);
      setDescription("");
      setName("");
      setRuleGroup("common");
      setGeneratedContent("");
      setPreviewMode(true);
      setSaving(false);
      setHookType("PreToolUse");
      setHookCommand("");
      setHookMatcher("");
      setHookTimeout("");
      setHookDescription("");
    }
  }, [open, defaultType]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleClose = useCallback(() => {
    abortRef.current?.abort();
    onClose();
  }, [onClose]);

  const handleGenerate = useCallback(async () => {
    if (!description.trim()) {
      toast("Please describe what you want to create", "error");
      return;
    }

    setStep("generating");
    setGeneratedContent("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/toolbox/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim(), type }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        toast(err.error || "Generation failed", "error");
        setStep("input");
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let idx;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);

          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") continue;

          try {
            const event = JSON.parse(payload);

            const assistantText = parseAssistantText(event);
            if (assistantText) {
              fullText = assistantText;
              setGeneratedContent(fullText);
            }

            const resultText = parseResultText(event);
            if (resultText && !fullText) {
              fullText = resultText;
              setGeneratedContent(fullText);
            }

            if (event.type === "error") {
              toast(`Generation error: ${event.error}`, "error");
              setStep("input");
              return;
            }
          } catch {
            /* skip malformed JSON */
          }
        }
      }

      if (fullText.trim()) {
        const cleaned = stripCodeFences(fullText.trim());
        setGeneratedContent(cleaned);
        setStep("preview");

        if (!name.trim()) {
          const extracted = extractName(cleaned, type);
          if (extracted) setName(extracted);
        }
      } else {
        toast("No content generated. Please try again.", "error");
        setStep("input");
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      toast("Failed to connect to Claude. Is the CLI installed?", "error");
      setStep("input");
    } finally {
      abortRef.current = null;
    }
  }, [description, type, name, toast]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      toast("Please provide a name", "error");
      return;
    }
    if (!generatedContent.trim()) {
      toast("No content to save", "error");
      return;
    }

    if (/[/\\.]/.test(name)) {
      toast("Name must not contain /, \\, or . characters", "error");
      return;
    }

    setSaving(true);

    try {
      let endpoint: string;
      let body: Record<string, string>;

      if (type === "skill") {
        endpoint = "/api/toolbox/skills";
        body = { name: name.trim(), content: generatedContent };
      } else if (type === "agent") {
        endpoint = "/api/toolbox/agents";
        body = { name: name.trim(), content: generatedContent };
      } else {
        endpoint = "/api/toolbox/rules";
        body = { group: ruleGroup.trim() || "common", name: name.trim(), content: generatedContent };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        toast(data.message || `${TYPE_CONFIG[type].label} created successfully`, "success");
        onSuccess();
        onClose();
      } else {
        toast(data.error || "Save failed", "error");
      }
    } catch {
      toast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }, [name, generatedContent, type, ruleGroup, toast, onSuccess, onClose]);

  const handleSaveHook = useCallback(async () => {
    if (!hookCommand.trim()) {
      toast("Please provide a command", "error");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        type: hookType,
        command: hookCommand.trim(),
      };
      if (hookMatcher.trim()) body.matcher = hookMatcher.trim();
      if (hookTimeout) body.timeout = Number(hookTimeout);
      if (hookDescription.trim()) body.description = hookDescription.trim();

      const res = await fetch("/api/toolbox/hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        toast(data.message || "Hook created successfully", "success");
        onSuccess();
        onClose();
      } else {
        toast(data.error || "Save failed", "error");
      }
    } catch {
      toast("Failed to save hook", "error");
    } finally {
      setSaving(false);
    }
  }, [hookType, hookCommand, hookMatcher, hookTimeout, hookDescription, toast, onSuccess, onClose]);

  if (!open) return null;

  const TypeIcon = TYPE_CONFIG[type].icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div
        className="bg-background border rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            AI Creator
            {step !== "input" && (
              <Badge variant="secondary" className="ml-2 gap-1">
                <TypeIcon className={`h-3 w-3 ${TYPE_CONFIG[type].color}`} />
                {TYPE_CONFIG[type].label}
              </Badge>
            )}
          </h2>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
          {step === "input" && (
            <AiCreatorInputForm
              type={type}
              setType={setType}
              description={description}
              setDescription={setDescription}
              name={name}
              setName={setName}
              ruleGroup={ruleGroup}
              setRuleGroup={setRuleGroup}
              hookType={hookType}
              setHookType={setHookType}
              hookCommand={hookCommand}
              setHookCommand={setHookCommand}
              hookMatcher={hookMatcher}
              setHookMatcher={setHookMatcher}
              hookTimeout={hookTimeout}
              setHookTimeout={setHookTimeout}
              hookDescription={hookDescription}
              setHookDescription={setHookDescription}
              textareaRef={textareaRef}
            />
          )}

          {step === "generating" && (
            <AiCreatorGenerating type={type} generatedContent={generatedContent} />
          )}

          {step === "preview" && (
            <AiCreatorPreview
              type={type}
              name={name}
              setName={setName}
              ruleGroup={ruleGroup}
              setRuleGroup={setRuleGroup}
              generatedContent={generatedContent}
              setGeneratedContent={setGeneratedContent}
              previewMode={previewMode}
              setPreviewMode={setPreviewMode}
            />
          )}
        </div>

        {/* Footer */}
        <AiCreatorFooter
          step={step}
          type={type}
          saving={saving}
          description={description}
          hookCommand={hookCommand}
          name={name}
          abortRef={abortRef}
          onClose={handleClose}
          onGenerate={handleGenerate}
          onSave={handleSave}
          onSaveHook={handleSaveHook}
          onRegenerate={() => {
            setStep("input");
            setGeneratedContent("");
            setPreviewMode(true);
          }}
          onCancelGeneration={() => {
            abortRef.current?.abort();
            setStep("input");
          }}
        />
      </div>
    </div>
  );
}
