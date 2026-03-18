"use client";

import { Eye, Pencil } from "lucide-react";
import { useLocale } from "@/i18n/provider";
import { MarkdownContent } from "@/components/markdown-content";
import { CreatorType, TYPE_CONFIG } from "./ai-creator-types";

const TYPE_LABELS_ZH: Record<CreatorType, string> = {
  skill: "技能",
  agent: "Agent",
  rule: "规则",
  hook: "Hook",
};

interface AiCreatorPreviewProps {
  type: CreatorType;
  name: string;
  setName: (v: string) => void;
  ruleGroup: string;
  setRuleGroup: (v: string) => void;
  generatedContent: string;
  setGeneratedContent: (v: string) => void;
  previewMode: boolean;
  setPreviewMode: (v: boolean) => void;
}

export function AiCreatorPreview({
  type,
  name,
  setName,
  ruleGroup,
  setRuleGroup,
  generatedContent,
  setGeneratedContent,
  previewMode,
  setPreviewMode,
}: AiCreatorPreviewProps) {
  const { locale } = useLocale();
  const isZh = locale === "zh-CN";

  const typeLabel = isZh ? TYPE_LABELS_ZH[type] : TYPE_CONFIG[type].label;

  return (
    <>
      {/* Name (required before save) */}
      <div>
        <label className="text-sm font-medium block mb-1.5">
          {isZh ? `${typeLabel}名称 *` : `${typeLabel} Name *`}
        </label>
        <input
          type="text"
          className="w-full px-3 py-2 border rounded-md text-sm font-mono bg-background"
          placeholder={type === "skill" ? "my-skill" : type === "agent" ? "my-agent" : "my-rule"}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {type === "skill"
            ? isZh
              ? `将保存为 ~/.claude/skills/${name || "skill-name"}/SKILL.md`
              : `Will be saved as ~/.claude/skills/${name || "skill-name"}/SKILL.md`
            : type === "agent"
            ? isZh
              ? `将保存为 ~/.claude/agents/${name || "agent-name"}.md`
              : `Will be saved as ~/.claude/agents/${name || "agent-name"}.md`
            : isZh
            ? `将保存为 ~/.claude/rules/${ruleGroup}/${name || "rule-name"}.md`
            : `Will be saved as ~/.claude/rules/${ruleGroup}/${name || "rule-name"}.md`}
        </p>
      </div>

      {/* Rule group (editable in preview too) */}
      {type === "rule" && (
        <div>
          <label className="text-sm font-medium block mb-1.5">
            {isZh ? "规则组" : "Rule Group"}
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded-md text-sm font-mono bg-background"
            placeholder="common"
            value={ruleGroup}
            onChange={(e) => setRuleGroup(e.target.value)}
          />
        </div>
      )}

      {/* Content with edit/preview toggle */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium">
            {isZh ? "生成的内容" : "Generated Content"}
          </label>
          <div className="flex rounded-md border overflow-hidden">
            <button
              className={`px-3 py-1 text-xs flex items-center gap-1 transition-colors ${
                !previewMode ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
              }`}
              onClick={() => setPreviewMode(false)}
            >
              <Pencil className="h-3 w-3" /> {isZh ? "编辑" : "Edit"}
            </button>
            <button
              className={`px-3 py-1 text-xs flex items-center gap-1 transition-colors ${
                previewMode ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
              }`}
              onClick={() => setPreviewMode(true)}
            >
              <Eye className="h-3 w-3" /> {isZh ? "预览" : "Preview"}
            </button>
          </div>
        </div>
        {previewMode ? (
          <div className="w-full px-3 py-2 border rounded-md bg-background min-h-[300px] max-h-[400px] overflow-auto">
            <MarkdownContent content={generatedContent} className="text-sm" />
          </div>
        ) : (
          <textarea
            className="w-full px-3 py-2 border rounded-md text-sm font-mono bg-background min-h-[300px] max-h-[400px] resize-y"
            value={generatedContent}
            onChange={(e) => setGeneratedContent(e.target.value)}
            spellCheck={false}
          />
        )}
      </div>
    </>
  );
}
