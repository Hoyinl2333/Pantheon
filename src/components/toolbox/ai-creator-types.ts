import {
  Sparkles,
  Bot,
  BookOpen,
  Zap,
} from "lucide-react";

export type CreatorType = "skill" | "agent" | "rule" | "hook";

export type Step = "input" | "generating" | "preview";

export interface AiCreatorDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultType?: CreatorType;
}

export const TYPE_CONFIG: Record<CreatorType, { label: string; icon: typeof Sparkles; color: string; description: string }> = {
  skill: {
    label: "Skill",
    icon: Sparkles,
    color: "text-amber-500",
    description: "Reusable prompt template invoked via the Skill tool",
  },
  agent: {
    label: "Agent",
    icon: Bot,
    color: "text-pink-500",
    description: "Specialized persona with system prompt and model preference",
  },
  rule: {
    label: "Rule",
    icon: BookOpen,
    color: "text-cyan-500",
    description: "Instruction file Claude follows automatically",
  },
  hook: {
    label: "Hook",
    icon: Zap,
    color: "text-green-500",
    description: "Shell command that runs at lifecycle events (PreToolUse, PostToolUse, etc.)",
  },
};

export function parseAssistantText(event: Record<string, unknown>): string {
  if (event.type !== "assistant") return "";
  const message = event.message as Record<string, unknown> | undefined;
  if (!message?.content) return "";
  const content = message.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    let text = "";
    for (const block of content) {
      if (block?.type === "text" && typeof block.text === "string") {
        text += block.text;
      }
    }
    return text;
  }
  return "";
}

export function parseResultText(event: Record<string, unknown>): string {
  if (event.type !== "result") return "";
  const result = event.result;
  if (typeof result === "string") return result;
  return "";
}

export function getPlaceholder(type: CreatorType): string {
  switch (type) {
    case "skill":
      return "e.g., A skill that reviews pull requests focusing on security vulnerabilities, code quality, and performance. It should check for OWASP top 10 issues and suggest fixes.";
    case "agent":
      return "e.g., A documentation agent that generates API docs from source code. It should analyze function signatures, JSDoc comments, and usage patterns to produce comprehensive markdown documentation.";
    case "rule":
      return "e.g., Rules for Python projects: always use type hints, prefer dataclasses over dicts, use pathlib instead of os.path, follow PEP 8 naming conventions.";
    case "hook":
      return "";
  }
}

export function stripCodeFences(text: string): string {
  const fenceMatch = text.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/);
  if (fenceMatch) return fenceMatch[1];
  return text;
}

export function extractName(content: string, type: CreatorType): string {
  const fmMatch = content.match(/^---\r?\n[\s\S]*?name:\s*(.+?)\r?\n[\s\S]*?---/);
  if (fmMatch) return fmMatch[1].trim();

  const headingMatch = content.match(/^#\s+(.+)/m);
  if (headingMatch) {
    const raw = headingMatch[1].trim();
    const kebab = raw
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    if (kebab && kebab.length <= 40) return kebab;
  }

  return "";
}
