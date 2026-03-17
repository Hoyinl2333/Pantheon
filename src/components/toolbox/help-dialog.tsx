"use client";

import { Button } from "@/components/ui/button";
import { MarkdownContent } from "@/components/markdown-content";
import { HelpCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";

export interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}

const HELP_CONTENT = `
## What is Toolbox?

Toolbox is the **unified configuration center** for Claude Code. It gives you a read-only overview of all the extensions, rules, and integrations that shape how Claude Code works in your environment.

---

### MCP Servers
**Model Context Protocol** servers extend Claude's capabilities with external tools. Each server provides specialized functions (filesystem access, database queries, web scraping, etc.).

- **Global servers**: Configured in \`~/.claude/settings.json\` — available in all projects
- **Project servers**: Configured in \`.mcp.json\` files — scoped to specific projects
- **Health check**: Click the refresh icon to verify a server's executable is reachable

**Popular MCP servers**: filesystem, brave-search, github, postgres, puppeteer, memory

---

### Skills & Commands
**Skills** (\`~/.claude/skills/\`) are reusable prompt templates that Claude can invoke with the Skill tool. They define specialized behaviors with optional tool restrictions.

**Commands** (\`~/.claude/commands/\`) are user-invocable slash commands (e.g., \`/commit\`, \`/review-pr\`). They expand into full prompts when triggered.

---

### Hooks
Hooks are **shell commands** that run automatically at specific lifecycle events:

| Hook Type | When it runs |
|-----------|-------------|
| **PreToolUse** | Before a tool executes (can block/modify) |
| **PostToolUse** | After a tool completes |
| **SessionStart** | When a new session begins |
| **SessionEnd** | When a session ends |
| **Stop** | When Claude stops generating |
| **PreCompact** | Before context compaction |
| **PermissionRequest** | When permission is needed |

---

### Agents
Custom agent definitions (\`~/.claude/agents/\`) provide specialized personas with their own system prompts, model preferences, and tool restrictions. They can be used as subagents via the Task tool.

---

### Rules
Rules (\`~/.claude/rules/\`) are instruction files that Claude follows automatically. They're organized by category (e.g., \`common/\`, \`python/\`, \`typescript/\`) and loaded based on context.

---

### Configuration Paths
| Item | Location |
|------|----------|
| Settings | \`~/.claude/settings.json\` |
| MCP (global) | \`~/.claude/settings.json\` > \`mcpServers\` |
| MCP (project) | \`<project>/.mcp.json\` |
| Skills | \`~/.claude/skills/<name>/SKILL.md\` |
| Commands | \`~/.claude/commands/<name>.md\` |
| Agents | \`~/.claude/agents/<name>.md\` |
| Rules | \`~/.claude/rules/**/*.md\` |
| Hooks | \`~/.claude/settings.json\` > \`hooks\` |
`;

export function HelpDialog({ open, onClose }: HelpDialogProps) {
  const t = useTranslations("toolbox");
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-background border rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            {t("help.title")}
          </h2>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="px-6 py-4">
          <MarkdownContent content={HELP_CONTENT} className="text-sm" />
        </div>
      </div>
    </div>
  );
}
