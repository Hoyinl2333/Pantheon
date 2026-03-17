"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import { Shield, X } from "lucide-react";

const HOOK_TYPES = [
  "PreToolUse", "PostToolUse", "Stop", "SessionStart", "SessionEnd",
  "PreCompact", "PermissionRequest", "SubagentStart", "SubagentStop",
];

export interface HookDialogProps {
  open: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  hook: any;
  onSuccess: () => void;
}

export function HookDialog({ open, onClose, mode, hook, onSuccess }: HookDialogProps) {
  const { toast } = useToast();
  const [hookType, setHookType] = useState(hook?.type || "PreToolUse");
  const [matcher, setMatcher] = useState(hook?.matcher || "");
  const [command, setCommand] = useState(hook?.command || "");
  const [hookTimeout, setHookTimeout] = useState<string>(hook?.timeout?.toString() || "");
  const [description, setDescription] = useState(hook?.description || "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setHookType(hook?.type || "PreToolUse");
      setMatcher(hook?.matcher || "");
      setCommand(hook?.command || "");
      setHookTimeout(hook?.timeout?.toString() || "");
      setDescription(hook?.description || "");
    }
  }, [open, hook]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!command.trim()) {
      toast("Command is required", "error");
      return;
    }

    setSubmitting(true);

    const requestBody: any = {
      type: hookType,
      command: command.trim(),
    };

    if (matcher.trim()) requestBody.matcher = matcher.trim();
    if (hookTimeout.trim()) requestBody.timeout = parseInt(hookTimeout);
    if (description.trim()) requestBody.description = description.trim();

    if (mode === "edit" && hook) {
      requestBody.index = hook.index;
    }

    try {
      const method = mode === "add" ? "POST" : "PUT";
      const res = await fetch("/api/toolbox/hooks", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (res.ok) {
        toast(data.message || `Hook ${mode === "add" ? "added" : "updated"} successfully`, "success");
        onSuccess();
        onClose();
      } else {
        toast(data.error || "Operation failed", "error");
      }
    } catch (error) {
      toast("Failed to save hook", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-background border rounded-xl shadow-2xl max-w-xl w-full mx-4 max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {mode === "add" ? "Add Hook" : "Edit Hook"}
          </h2>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Hook Type */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Hook Type *</label>
            <select
              className="w-full px-3 py-2 border rounded-md text-sm bg-background"
              value={hookType}
              onChange={(e) => setHookType(e.target.value)}
              disabled={mode === "edit"}
            >
              {HOOK_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Matcher */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Matcher (optional)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md text-sm font-mono bg-background"
              placeholder="e.g., Bash"
              value={matcher}
              onChange={(e) => setMatcher(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Filter by tool name (e.g., Bash, Read, Write)
            </p>
          </div>

          {/* Command */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Command *</label>
            <textarea
              className="w-full px-3 py-2 border rounded-md text-sm font-mono bg-background min-h-[80px]"
              placeholder="node script.js"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
            />
          </div>

          {/* Timeout */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Timeout (seconds)</label>
            <input
              type="number"
              className="w-full px-3 py-2 border rounded-md text-sm bg-background"
              placeholder="30"
              value={hookTimeout}
              onChange={(e) => setHookTimeout(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Description</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md text-sm bg-background"
              placeholder="Hook description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving..." : mode === "add" ? "Add Hook" : "Update Hook"}
          </Button>
        </div>
      </div>
    </div>
  );
}
