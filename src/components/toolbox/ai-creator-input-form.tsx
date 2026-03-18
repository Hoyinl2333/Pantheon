"use client";

import { RefObject } from "react";
import { useLocale } from "@/i18n/provider";
import { CreatorType, TYPE_CONFIG, getPlaceholder } from "./ai-creator-types";

interface AiCreatorInputFormProps {
  type: CreatorType;
  setType: (t: CreatorType) => void;
  description: string;
  setDescription: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  ruleGroup: string;
  setRuleGroup: (v: string) => void;
  hookType: string;
  setHookType: (v: string) => void;
  hookCommand: string;
  setHookCommand: (v: string) => void;
  hookMatcher: string;
  setHookMatcher: (v: string) => void;
  hookTimeout: string;
  setHookTimeout: (v: string) => void;
  hookDescription: string;
  setHookDescription: (v: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

const TYPE_LABELS_ZH: Record<CreatorType, { label: string; description: string }> = {
  skill: { label: "技能", description: "通过 Skill 工具调用的可复用提示模板" },
  agent: { label: "Agent", description: "具有系统提示和模型偏好的专业角色" },
  rule: { label: "规则", description: "Claude 自动遵循的指令文件" },
  hook: { label: "Hook", description: "在生命周期事件（PreToolUse、PostToolUse 等）运行的 Shell 命令" },
};

export function AiCreatorInputForm({
  type,
  setType,
  description,
  setDescription,
  name,
  setName,
  ruleGroup,
  setRuleGroup,
  hookType,
  setHookType,
  hookCommand,
  setHookCommand,
  hookMatcher,
  setHookMatcher,
  hookTimeout,
  setHookTimeout,
  hookDescription,
  setHookDescription,
  textareaRef,
}: AiCreatorInputFormProps) {
  const { locale } = useLocale();
  const isZh = locale === "zh-CN";

  const getTypeLabel = (t: CreatorType) =>
    isZh ? TYPE_LABELS_ZH[t].label : TYPE_CONFIG[t].label;
  const getTypeDesc = (t: CreatorType) =>
    isZh ? TYPE_LABELS_ZH[t].description : TYPE_CONFIG[t].description;

  return (
    <>
      {/* Type selector */}
      <div>
        <label className="text-sm font-medium block mb-2">
          {isZh ? "你想创建什么？" : "What do you want to create?"}
        </label>
        <div className="grid grid-cols-4 gap-3">
          {(Object.keys(TYPE_CONFIG) as CreatorType[]).map((t) => {
            const config = TYPE_CONFIG[t];
            const Icon = config.icon;
            const selected = type === t;
            return (
              <button
                key={t}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-transparent bg-muted/30 hover:bg-muted/60"
                }`}
                onClick={() => setType(t)}
              >
                <Icon className={`h-6 w-6 ${config.color}`} />
                <span className="text-sm font-medium">{getTypeLabel(t)}</span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">
                  {getTypeDesc(t)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Description input (non-hook types) */}
      {type !== "hook" && (
        <>
          <div>
            <label className="text-sm font-medium block mb-1.5">
              {isZh
                ? `描述你想让这个${getTypeLabel(type).toLowerCase()}做什么`
                : `Describe what you want this ${TYPE_CONFIG[type].label.toLowerCase()} to do`}
            </label>
            <textarea
              ref={textareaRef}
              className="w-full px-3 py-2 border rounded-md text-sm bg-background min-h-[120px] resize-y"
              placeholder={getPlaceholder(type)}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              {isZh
                ? "请具体描述你期望的行为、约束条件和使用场景。"
                : "Be specific about the behavior, constraints, and use cases you have in mind."}
            </p>
          </div>

          {/* Optional: pre-fill name */}
          <div>
            <label className="text-sm font-medium block mb-1.5">
              {isZh ? "名称" : "Name"}{" "}
              <span className="text-muted-foreground font-normal">
                {isZh ? "(可选，可在生成后设置)" : "(optional, can set after generation)"}
              </span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md text-sm font-mono bg-background"
              placeholder={type === "skill" ? "my-skill" : type === "agent" ? "my-agent" : "my-rule"}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Rule group selector */}
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
              <p className="text-xs text-muted-foreground mt-1">
                {isZh
                  ? "~/.claude/rules/ 下的分组文件夹（如 common、python、typescript）"
                  : "Group folder under ~/.claude/rules/ (e.g., common, python, typescript)"}
              </p>
            </div>
          )}
        </>
      )}

      {/* Hook-specific form fields */}
      {type === "hook" && (
        <>
          <div>
            <label className="text-sm font-medium block mb-1.5">
              {isZh ? "Hook 事件类型" : "Hook Event Type"}
            </label>
            <select
              value={hookType}
              onChange={(e) => setHookType(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm bg-background"
            >
              <option value="PreToolUse">PreToolUse</option>
              <option value="PostToolUse">PostToolUse</option>
              <option value="Notification">Notification</option>
              <option value="Stop">Stop</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">
              Matcher{" "}
              <span className="text-muted-foreground font-normal">
                {isZh ? "(可选 — 工具名称过滤)" : "(optional — tool name filter)"}
              </span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md text-sm font-mono bg-background"
              placeholder={isZh ? "如 Bash, Write（留空匹配所有工具）" : "e.g., Bash, Write (leave empty for all tools)"}
              value={hookMatcher}
              onChange={(e) => setHookMatcher(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">
              {isZh ? "命令 *" : "Command *"}
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md text-sm font-mono bg-background"
              placeholder="e.g., /path/to/script.sh $TOOL_INPUT"
              value={hookCommand}
              onChange={(e) => setHookCommand(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              {isZh
                ? "要执行的 Shell 命令。使用 $TOOL_INPUT 获取工具输入 JSON。"
                : "Shell command to execute. Use $TOOL_INPUT for tool input JSON."}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">
              {isZh ? "超时" : "Timeout"}{" "}
              <span className="text-muted-foreground font-normal">
                {isZh ? "(毫秒, 可选)" : "(ms, optional)"}
              </span>
            </label>
            <input
              type="number"
              className="w-full px-3 py-2 border rounded-md text-sm font-mono bg-background"
              placeholder="10000"
              value={hookTimeout}
              onChange={(e) => setHookTimeout(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">
              {isZh ? "描述" : "Description"}{" "}
              <span className="text-muted-foreground font-normal">
                {isZh ? "(可选)" : "(optional)"}
              </span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md text-sm bg-background"
              placeholder={isZh ? "这个 Hook 的用途" : "What this hook does"}
              value={hookDescription}
              onChange={(e) => setHookDescription(e.target.value)}
            />
          </div>
        </>
      )}
    </>
  );
}
