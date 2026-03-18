"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  CheckCircle,
  Settings,
  Clock,
  Ban,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import type {
  SkillTreeNode,
  SkillStatus,
  SkillCategory,
} from "../types";
import { CATEGORIES } from "../skill-tree-data";

// ---------------------------------------------------------------------------
// Status config (visual mapping)
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

type StatusConfig = ReturnType<typeof makeStatusConfig>;

// ---------------------------------------------------------------------------
// Skill Card
// ---------------------------------------------------------------------------

function SkillCard({
  skill,
  status,
  isZh,
  selected,
  onClick,
  isCustom,
  statusConfig,
  t,
}: {
  skill: SkillTreeNode;
  status: SkillStatus;
  isZh: boolean;
  selected: boolean;
  onClick: () => void;
  isCustom: boolean;
  statusConfig: StatusConfig;
  t: (key: string) => string;
}) {
  const cfg = statusConfig[status];

  return (
    <button
      className={`
        w-full text-left rounded-lg border p-2.5 transition-all duration-200 cursor-pointer
        ${cfg.bg} ${cfg.border} ${cfg.glow}
        ${selected ? "ring-2 ring-primary scale-[1.02]" : ""}
        ${status === "disabled" ? "opacity-40" : ""}
        ${status === "planned" ? "opacity-60" : ""}
      `}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold truncate">
              {isZh ? skill.nameZh : skill.name}
            </span>
            {isCustom && (
              <Badge
                variant="outline"
                className="text-[8px] px-1 py-0 border-violet-500/30 text-violet-400 shrink-0"
              >
                {t("custom.customBadge")}
              </Badge>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground truncate mt-0.5">
            {isZh ? skill.descriptionZh : skill.description}
          </div>
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Category Section
// ---------------------------------------------------------------------------

function CategorySection({
  category,
  skills,
  statusMap,
  isZh,
  selectedId,
  onSelect,
  collapsed,
  onToggle,
  customSkillIds,
  statusConfig,
  t,
}: {
  category: (typeof CATEGORIES)[number];
  skills: SkillTreeNode[];
  statusMap: Map<string, SkillStatus>;
  isZh: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  customSkillIds: Set<string>;
  statusConfig: StatusConfig;
  t: (key: string) => string;
}) {
  const activeCount = skills.filter(
    (s) => (statusMap.get(s.id) ?? s.defaultStatus) === "active"
  ).length;
  const sorted = [...skills].sort((a, b) => a.tier - b.tier);

  return (
    <div className="space-y-1.5">
      <button
        className="flex items-center gap-2 w-full px-1 py-1 rounded hover:bg-accent/50 transition-colors"
        onClick={onToggle}
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span
          className="text-xs font-bold"
          style={{ color: category.glowColor }}
        >
          {isZh ? category.nameZh : category.name}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {activeCount}/{skills.length}
        </span>
        <div className="flex-1 h-1 rounded-full bg-muted/50 max-w-[60px]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(activeCount / Math.max(skills.length, 1)) * 100}%`,
              backgroundColor: category.glowColor,
            }}
          />
        </div>
      </button>

      {!collapsed && (
        <div className="grid grid-cols-1 gap-1 pl-5">
          {sorted.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              status={statusMap.get(skill.id) ?? skill.defaultStatus}
              isZh={isZh}
              selected={selectedId === skill.id}
              onClick={() => onSelect(skill.id)}
              isCustom={customSkillIds.has(skill.id)}
              statusConfig={statusConfig}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SkillListPanelProps {
  isZh: boolean;
  t: (key: string) => string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  groupedSkills: Map<SkillCategory, SkillTreeNode[]>;
  statusMap: Map<string, SkillStatus>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  collapsedCats: Set<string>;
  toggleCat: (catId: string) => void;
  customSkillIds: Set<string>;
}

// ---------------------------------------------------------------------------
// Component: search bar + scrollable category list
// ---------------------------------------------------------------------------

export function SkillListPanel({
  isZh,
  t,
  searchQuery,
  setSearchQuery,
  groupedSkills,
  statusMap,
  selectedId,
  setSelectedId,
  collapsedCats,
  toggleCat,
  customSkillIds,
}: SkillListPanelProps) {
  const statusConfig = useMemo(() => makeStatusConfig(t), [t]);

  return (
    <>
      {/* Search */}
      <div className="relative px-1 pb-3">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          className="h-8 text-xs pl-8"
          placeholder={t("searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Scrollable skill list */}
      <div className="flex-1 overflow-y-auto px-1 pb-4 space-y-4">
        {Array.from(groupedSkills.entries()).map(([catId, skills]) => {
          const cat = CATEGORIES.find((c) => c.id === catId);
          if (!cat) return null;
          return (
            <CategorySection
              key={catId}
              category={cat}
              skills={skills}
              statusMap={statusMap}
              isZh={isZh}
              selectedId={selectedId}
              onSelect={setSelectedId}
              collapsed={collapsedCats.has(catId)}
              onToggle={() => toggleCat(catId)}
              customSkillIds={customSkillIds}
              statusConfig={statusConfig}
              t={t}
            />
          );
        })}

        {groupedSkills.size === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground">
            {t("noMatchingSkills")}
          </div>
        )}
      </div>
    </>
  );
}
