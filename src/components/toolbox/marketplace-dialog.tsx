"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import { ShoppingBag, X } from "lucide-react";
import type { MCPRegistryEntry } from "@/lib/mcp-registry";
import type { MCPServerConfig } from "./types";

export interface MarketplaceInstallDialogProps {
  open: boolean;
  onClose: () => void;
  entry: MCPRegistryEntry | null;
  onSuccess: () => void;
}

export function MarketplaceInstallDialog({ open, onClose, entry, onSuccess }: MarketplaceInstallDialogProps) {
  const { toast } = useToast();
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string; description?: string }>>([]);
  const [scope, setScope] = useState<"global" | "project">("global");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && entry) {
      setCommand(entry.command);
      setArgs(entry.args.join(", "));
      setEnvVars(
        entry.env
          ? Object.entries(entry.env).map(([key, value]) => ({
              key,
              value,
              description: entry.envDescriptions?.[key],
            }))
          : []
      );
      setScope("global");
    }
  }, [open, entry]);

  if (!open || !entry) return null;

  const handleSubmit = async () => {
    if (!command.trim()) {
      toast("Command is required", "error");
      return;
    }

    // Validate env vars if required
    if (entry.env && envVars.some((e) => !e.value.trim())) {
      toast("All environment variables must be filled", "error");
      return;
    }

    setSubmitting(true);

    const config: MCPServerConfig = {
      command: command.trim(),
      args: args.trim() ? args.split(",").map((a) => a.trim()).filter(Boolean) : undefined,
      env: envVars.length > 0
        ? Object.fromEntries(envVars.filter((e) => e.key && e.value).map((e) => [e.key, e.value]))
        : undefined,
    };

    const requestBody = {
      scope,
      name: entry.name,
      config,
    };

    try {
      const res = await fetch("/api/toolbox/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (res.ok) {
        toast(data.message || "Server installed successfully", "success");
        onSuccess();
        onClose();
      } else {
        toast(data.error || "Installation failed", "error");
      }
    } catch (error) {
      toast("Failed to install server", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const updateEnvVar = (index: number, field: "key" | "value", value: string) => {
    const updated = [...envVars];
    updated[index][field] = value;
    setEnvVars(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-background border rounded-xl shadow-2xl max-w-xl w-full mx-4 max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Install MCP Server
          </h2>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Server Name */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Server Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md text-sm font-mono bg-muted"
              value={entry.name}
              disabled
            />
          </div>

          {/* Description */}
          {entry.description && (
            <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
              {entry.description}
            </div>
          )}

          {/* Command Preview */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Command Preview</label>
            <code className="text-xs bg-muted px-3 py-2 rounded block break-all font-mono">
              {command} {args}
            </code>
          </div>

          {/* Environment Variables */}
          {envVars.length > 0 && (
            <div>
              <label className="text-sm font-medium block mb-1.5">Environment Variables *</label>
              <div className="space-y-2">
                {envVars.map((env, i) => (
                  <div key={i}>
                    <label className="text-xs text-muted-foreground block mb-1">{env.key}</label>
                    <input
                      type="text"
                      className="w-full px-2 py-1.5 border rounded text-xs font-mono bg-background"
                      placeholder={env.description || "value"}
                      value={env.value}
                      onChange={(e) => updateEnvVar(i, "value", e.target.value)}
                    />
                    {env.description && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{env.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Arguments (Editable) */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Arguments</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md text-sm font-mono bg-background"
              placeholder="Comma-separated list"
              value={args}
              onChange={(e) => setArgs(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">You can customize the arguments if needed</p>
          </div>

          {/* Scope */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Scope</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="install-scope"
                  value="global"
                  checked={scope === "global"}
                  onChange={() => setScope("global")}
                  className="h-4 w-4"
                />
                <span className="text-sm">Global</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="install-scope"
                  value="project"
                  checked={scope === "project"}
                  onChange={() => setScope("project")}
                  className="h-4 w-4"
                />
                <span className="text-sm">Project</span>
              </label>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {scope === "global"
                ? "Available in all projects"
                : "Scoped to current project (not yet implemented)"}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Installing..." : "Install"}
          </Button>
        </div>
      </div>
    </div>
  );
}
