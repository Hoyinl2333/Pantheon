"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import { Plug, X, Plus } from "lucide-react";
import type { MCPServerConfig } from "./types";

export interface MCPDialogProps {
  open: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  scope: "global" | string;
  serverName?: string;
  serverConfig?: MCPServerConfig;
  onSuccess: () => void;
}

export function MCPServerDialog({
  open,
  onClose,
  mode,
  scope,
  serverName = "",
  serverConfig,
  onSuccess,
}: MCPDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState(serverName);
  const [command, setCommand] = useState(serverConfig?.command || "");
  const [args, setArgs] = useState(serverConfig?.args?.join(", ") || "");
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string }>>(
    serverConfig?.env
      ? Object.entries(serverConfig.env).map(([key, value]) => ({ key, value }))
      : []
  );
  const [currentScope, setCurrentScope] = useState<"global" | "project">(
    scope === "global" ? "global" : "project"
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(serverName);
      setCommand(serverConfig?.command || "");
      setArgs(serverConfig?.args?.join(", ") || "");
      setEnvVars(
        serverConfig?.env
          ? Object.entries(serverConfig.env).map(([key, value]) => ({ key, value }))
          : []
      );
      setCurrentScope(scope === "global" ? "global" : "project");
    }
  }, [open, serverName, serverConfig, scope]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!name.trim() || !command.trim()) {
      toast("Server name and command are required", "error");
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      toast("Server name must be alphanumeric (hyphens and underscores allowed)", "error");
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
      scope: currentScope,
      name: name.trim(),
      config,
    };

    try {
      const method = mode === "add" ? "POST" : "PUT";
      const res = await fetch("/api/toolbox/mcp", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (res.ok) {
        toast(data.message || `Server ${mode === "add" ? "added" : "updated"} successfully`, "success");
        onSuccess();
        onClose();
      } else {
        toast(data.error || "Operation failed", "error");
      }
    } catch (error) {
      toast("Failed to save server", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const addEnvVar = () => {
    setEnvVars([...envVars, { key: "", value: "" }]);
  };

  const removeEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
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
            <Plug className="h-5 w-5 text-primary" />
            {mode === "add" ? "Add MCP Server" : "Edit MCP Server"}
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
              className="w-full px-3 py-2 border rounded-md text-sm font-mono bg-background"
              placeholder="my-server"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={mode === "edit"}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Alphanumeric characters, hyphens, and underscores only
            </p>
          </div>

          {/* Command */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Command *</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md text-sm font-mono bg-background"
              placeholder="npx"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
            />
          </div>

          {/* Arguments */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Arguments</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md text-sm font-mono bg-background"
              placeholder="-y, @modelcontextprotocol/server-filesystem"
              value={args}
              onChange={(e) => setArgs(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">Comma-separated list</p>
          </div>

          {/* Environment Variables */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">Environment Variables</label>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={addEnvVar}
              >
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            {envVars.length === 0 ? (
              <p className="text-xs text-muted-foreground">No environment variables</p>
            ) : (
              <div className="space-y-2">
                {envVars.map((env, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 px-2 py-1.5 border rounded text-xs font-mono bg-background"
                      placeholder="KEY"
                      value={env.key}
                      onChange={(e) => updateEnvVar(i, "key", e.target.value)}
                    />
                    <input
                      type="text"
                      className="flex-1 px-2 py-1.5 border rounded text-xs font-mono bg-background"
                      placeholder="value"
                      value={env.value}
                      onChange={(e) => updateEnvVar(i, "value", e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => removeEnvVar(i)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scope (only for add mode) */}
          {mode === "add" && (
            <div>
              <label className="text-sm font-medium block mb-1.5">Scope</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    value="global"
                    checked={currentScope === "global"}
                    onChange={() => setCurrentScope("global")}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Global</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    value="project"
                    checked={currentScope === "project"}
                    onChange={() => setCurrentScope("project")}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Project</span>
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {currentScope === "global"
                  ? "Available in all projects"
                  : "Scoped to current project"}
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving..." : mode === "add" ? "Add Server" : "Update Server"}
          </Button>
        </div>
      </div>
    </div>
  );
}
