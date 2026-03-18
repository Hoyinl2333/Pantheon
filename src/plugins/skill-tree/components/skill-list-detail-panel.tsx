"use client";

import { useState, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  Settings,
  Clock,
  Ban,
  X,
  ExternalLink,
  Loader2,
  Pencil,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  Play,
} from "lucide-react";
import { useToast } from "@/components/toast";

import type { SkillTreeNode, SkillStatus } from "../types";
import { CATEGORIES } from "../skill-tree-data";
import { SkillConfigPanel } from "./skill-config-panel";

// ---------------------------------------------------------------------------
// Detect helper
// ---------------------------------------------------------------------------

async function runDetect(
  command: string,
  params?: Record<string, string>
): Promise<{ success: boolean; output: string }> {
  try {
    const res = await fetch("/api/plugins/skill-tree/detect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, params }),
    });
    return await res.json();
  } catch {
    return { success: false, output: "Network error" };
  }
}

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

function makeStatusConfig(t: (key: string) => string) {
  return {
    active: {
      icon: <CheckCircle className="h-3 w-3" />,
      label: t("status.active"),
      dot: "bg-emerald-400",
      bg: "bg-emerald-500/5",
      border: "border-emerald-500/20 hover:border-emerald-500/40",
      glow: "shadow-emerald-500/10 shadow-sm",
    },
    configurable: {
      icon: <Settings className="h-3 w-3" />,
      label: t("status.configurable"),
      dot: "bg-amber-400",
      bg: "bg-amber-500/5",
      border: "border-amber-500/20 hover:border-amber-500/40",
      glow: "",
    },
    planned: {
      icon: <Clock className="h-3 w-3" />,
      label: t("status.planned"),
      dot: "bg-zinc-500",
      bg: "bg-zinc-500/5",
      border: "border-zinc-500/10 hover:border-zinc-500/20",
      glow: "",
    },
    disabled: {
      icon: <Ban className="h-3 w-3" />,
      label: t("status.disabled"),
      dot: "bg-zinc-700",
      bg: "bg-zinc-800/5",
      border: "border-zinc-700/10",
      glow: "",
    },
  } as const;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SkillListDetailPanelProps {
  skill: SkillTreeNode;
  status: SkillStatus;
  allSkills: SkillTreeNode[];
  statusMap: Map<string, SkillStatus>;
  isZh: boolean;
  onClose: () => void;
  onStatusChange: (id: string, s: SkillStatus) => void;
  /** Bypass dependency check (used by detect/verify) */
  onForceStatusChange: (id: string, s: SkillStatus) => void;
  onNavigate: (route: string) => void;
  isCustom: boolean;
  onEdit: () => void;
  onDelete: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SkillListDetailPanel({
  skill,
  status,
  allSkills,
  statusMap,
  isZh,
  onClose,
  onStatusChange,
  onForceStatusChange,
  onNavigate,
  isCustom,
  onEdit,
  onDelete,
  t,
}: SkillListDetailPanelProps) {
  const statusConfig = useMemo(() => makeStatusConfig(t), [t]);
  const cat = CATEGORIES.find((c) => c.id === skill.category);
  const cfg = statusConfig[status];
  const deps = skill.dependencies
    .map((id) => allSkills.find((s) => s.id === id))
    .filter(Boolean) as SkillTreeNode[];
  const unlocks = allSkills.filter((s) => s.dependencies.includes(skill.id));

  // ST-3: Check if dependencies are met
  const missingDeps = deps.filter((d) => {
    const depStatus = statusMap.get(d.id) ?? d.defaultStatus;
    return depStatus !== "active";
  });
  const depsNotMet = missingDeps.length > 0;

  const canActivate =
    skill.defaultStatus === "active" || skill.defaultStatus === "configurable";

  // Detect state
  const [detecting, setDetecting] = useState(false);
  const [detectResult, setDetectResult] = useState<{
    success: boolean;
    output: string;
  } | null>(null);
  const { toast } = useToast();

  const handleDetect = useCallback(async () => {
    if (!skill.detectCommand) return;
    setDetecting(true);
    setDetectResult(null);
    // Load skill config params for ${variable} substitution
    const { getSkillConfig } = await import("../skill-tree-store");
    const config = await getSkillConfig(skill.id);
    const result = await runDetect(skill.detectCommand, config.params);
    setDetectResult(result);
    setDetecting(false);
    if (result.success) {
      toast(t("detect.success"), "success");
      // ST-3: Detect bypasses dependency check -- verified skills can force-activate
      onForceStatusChange(skill.id, "active");
    } else {
      toast(t("detect.failed"), "error");
    }
  }, [skill, onForceStatusChange, toast, t]);

  return (
    <div className="w-[340px] border-l bg-background flex flex-col h-full overflow-hidden shrink-0">
      {/* Header */}
      <div
        className="px-4 py-3 border-b"
        style={{ borderLeftColor: cat?.glowColor, borderLeftWidth: 3 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold">
              {isZh ? skill.nameZh : skill.name}
            </h3>
            {isCustom && (
              <Badge
                variant="outline"
                className="text-[8px] px-1 py-0 border-violet-500/30 text-violet-400"
              >
                {t("custom.customBadge")}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {isCustom && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={onEdit}
                  title={t("custom.editSkill")}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  onClick={onDelete}
                  title={t("custom.deleteSkill")}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={onClose}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <Badge
            className="text-[9px] px-1.5 py-0 border-0 gap-1"
            style={{
              backgroundColor: `${cat?.glowColor}15`,
              color: cat?.glowColor,
            }}
          >
            {isZh ? cat?.nameZh : cat?.name}
          </Badge>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
            T{skill.tier}
          </Badge>
          <Badge
            className={`text-[9px] px-1.5 py-0 border-0 gap-1 ${cfg.bg}`}
          >
            {cfg.icon}
            {cfg.label}
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isZh ? skill.descriptionZh : skill.description}
        </p>

        {/* ST-3: Dependency warning */}
        {depsNotMet && status !== "active" && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[10px] text-amber-400 leading-relaxed">
              {isZh
                ? `依赖未满足：需要先激活 ${missingDeps.map((d) => d.nameZh).join(", ")}`
                : `Dependencies not met: ${missingDeps.map((d) => d.name).join(", ")} need to be activated first`}
            </div>
          </div>
        )}

        {/* Status actions */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold">{t("actions")}</label>
          <div className="flex flex-wrap gap-1.5">
            {status === "disabled" && canActivate && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] gap-1"
                onClick={() =>
                  onStatusChange(
                    skill.id,
                    skill.defaultStatus === "active"
                      ? "active"
                      : "configurable"
                  )
                }
              >
                <CheckCircle className="h-3 w-3 text-emerald-400" />
                {t("reenable")}
              </Button>
            )}
            {status === "active" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] gap-1 text-zinc-400"
                onClick={() => onStatusChange(skill.id, "disabled")}
              >
                <Ban className="h-3 w-3" />
                {t("disable")}
              </Button>
            )}
            {status === "planned" && (
              <div className="text-[10px] text-muted-foreground italic">
                {t("plannedHint")}
              </div>
            )}
            {status === "configurable" && (
              <div className="text-[10px] text-amber-400">
                {t("configurableHint")}
              </div>
            )}
          </div>
        </div>

        {/* Skill config fields */}
        {skill.configFields && skill.configFields.length > 0 && (
          <SkillConfigPanel
            skillId={skill.id}
            fields={skill.configFields}
            isZh={isZh}
          />
        )}

        {/* Detect button */}
        {skill.detectCommand && (
          <div className="space-y-2">
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs gap-1.5 border-sky-500/20 hover:border-sky-500/40 text-sky-400 hover:text-sky-300"
              onClick={handleDetect}
              disabled={detecting}
            >
              {detecting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5" />
              )}
              {detecting ? t("detect.verifying") : t("detect.verifySetup")}
            </Button>

            {/* Detect result */}
            {detectResult && (
              <div
                className={`rounded-lg border p-2.5 text-[10px] space-y-1 transition-all duration-300 animate-in fade-in slide-in-from-top-1 ${
                  detectResult.success
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : "bg-red-500/5 border-red-500/20"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {detectResult.success ? (
                    <CheckCircle className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-red-400" />
                  )}
                  <span
                    className={
                      detectResult.success
                        ? "text-emerald-400 font-medium"
                        : "text-red-400 font-medium"
                    }
                  >
                    {detectResult.success
                      ? t("detect.success")
                      : t("detect.failed")}
                  </span>
                </div>
                {detectResult.output && (
                  <code className="block text-[9px] font-mono text-muted-foreground bg-muted rounded px-2 py-1 break-all max-h-20 overflow-y-auto">
                    {detectResult.output}
                  </code>
                )}
                {!detectResult.success && skill.detectHint && (
                  <div className="text-muted-foreground mt-1">
                    <span className="font-medium text-amber-400">
                      {t("detect.hint")}{" "}
                    </span>
                    {skill.detectHint}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Setup steps for configurable skills */}
        {skill.setupSteps && skill.setupSteps.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-3 space-y-2">
            <div className="text-[11px] font-semibold text-amber-400">
              {t("setupSteps")}
            </div>
            <ol className="space-y-1.5">
              {skill.setupSteps.map((step, i) => (
                <li key={i} className="flex gap-2 text-[10px]">
                  <span className="text-amber-500 font-mono shrink-0">
                    {i + 1}.
                  </span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
            {skill.detectHint && (
              <div className="text-[10px] text-muted-foreground border-t border-amber-500/10 pt-1.5 mt-1.5">
                <span className="font-medium text-amber-400">
                  {t("verify")}{" "}
                </span>
                {skill.detectHint}
              </div>
            )}
            {skill.detectCommand && (
              <code className="block text-[9px] font-mono bg-zinc-900 text-zinc-300 rounded px-2 py-1 mt-1">
                $ {skill.detectCommand}
              </code>
            )}
          </div>
        )}

        {/* Usage example / Try It */}
        {(skill.usageExample || skill.usageExampleZh) && (
          <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
              <Play className="h-3 w-3" />
              {t("tryIt")}
            </div>
            <div className="text-[10px] text-muted-foreground leading-relaxed">
              {(() => {
                const text = (isZh ? skill.usageExampleZh : skill.usageExample) ?? skill.usageExample ?? "";
                // Detect terminal commands (lines starting with known commands or containing common CLI patterns)
                const parts = text.split(/(`.+?`|(?:curl|docker|ssh|codex|npm|npx|claude|git)\s[^\s].*?)(?:\s—|$)/g);
                if (parts.length === 1) {
                  // Check for internal routes
                  const routeMatch = text.match(/\/(settings|chat|tokens|sessions|queue|toolbox|plugins\/[a-z-]+)/);
                  if (routeMatch) {
                    const route = routeMatch[0];
                    const idx = text.indexOf(route);
                    return (
                      <>
                        {text.slice(0, idx)}
                        <button
                          className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                          onClick={() => onNavigate(route)}
                        >
                          {route}
                        </button>
                        {text.slice(idx + route.length)}
                      </>
                    );
                  }
                  return text;
                }
                return text;
              })()}
            </div>
            {(() => {
              const text = (isZh ? skill.usageExampleZh : skill.usageExample) ?? skill.usageExample ?? "";
              // Extract command-like segments for code display
              const cmdMatch = text.match(/(?:curl|docker|ssh|codex|npm|npx|claude|git)\s+[^\u4e00-\u9fff]+?(?=\s*[(\u2014]|$)/);
              if (cmdMatch) {
                return (
                  <code className="block text-[9px] font-mono bg-zinc-900 text-zinc-300 rounded px-2 py-1 mt-1 break-all">
                    $ {cmdMatch[0].trim()}
                  </code>
                );
              }
              return null;
            })()}
          </div>
        )}

        {/* Implementation detail */}
        {skill.implDetail && (
          <div className="space-y-1">
            <label className="text-[11px] font-semibold">
              {t("implementation")}
            </label>
            <code className="block text-[10px] text-muted-foreground font-mono bg-muted rounded px-2 py-1.5 break-all">
              {skill.implDetail}
            </code>
          </div>
        )}

        {/* Dependencies */}
        {deps.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold">
              {t("requires")}
            </label>
            <div className="flex flex-wrap gap-1">
              {deps.map((d) => {
                const depStatus = statusMap.get(d.id) ?? d.defaultStatus;
                return (
                  <Badge
                    key={d.id}
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 gap-1"
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${statusConfig[depStatus].dot}`}
                    />
                    {isZh ? d.nameZh : d.name}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Unlocks */}
        {unlocks.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold">
              {t("unlocks")}
            </label>
            <div className="flex flex-wrap gap-1">
              {unlocks.map((u) => (
                <Badge
                  key={u.id}
                  variant="outline"
                  className="text-[9px] px-1.5 py-0"
                >
                  {isZh ? u.nameZh : u.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {skill.tags && skill.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {skill.tags.map((tag) => (
              <span
                key={tag}
                className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Navigate */}
        {skill.pageRoute && (
          <Button
            size="sm"
            variant="outline"
            className="w-full h-7 text-xs gap-1.5"
            onClick={() => onNavigate(skill.pageRoute!)}
          >
            <ExternalLink className="h-3 w-3" />
            {t("openPage")}
          </Button>
        )}
      </div>
    </div>
  );
}
