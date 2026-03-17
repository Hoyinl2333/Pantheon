"use client";

import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TreePine,
  Search,
  CheckCircle,
  Settings,
  Clock,
  Ban,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  X,
  List,
  Network,
  Loader2,
} from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

const TreeCanvas = lazy(() =>
  import("./components/tree-canvas").then((m) => ({ default: m.TreeCanvas }))
);

type ViewMode = "list" | "graph";
import type { SkillTreeNode, SkillStatus, SkillCategory, SkillTreeState } from "./types";
import { SKILL_TREE_NODES, CATEGORIES } from "./skill-tree-data";
import { getSkillTreeState, setSkillStatus } from "./skill-tree-store";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<SkillStatus, {
  icon: React.ReactNode;
  label: string;
  labelZh: string;
  dot: string;
  bg: string;
  border: string;
  glow: string;
}> = {
  active: {
    icon: <CheckCircle className="h-3 w-3" />,
    label: "Active", labelZh: "已激活",
    dot: "bg-emerald-400",
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/20 hover:border-emerald-500/40",
    glow: "shadow-emerald-500/10 shadow-sm",
  },
  configurable: {
    icon: <Settings className="h-3 w-3" />,
    label: "Setup Needed", labelZh: "需配置",
    dot: "bg-amber-400",
    bg: "bg-amber-500/5",
    border: "border-amber-500/20 hover:border-amber-500/40",
    glow: "",
  },
  planned: {
    icon: <Clock className="h-3 w-3" />,
    label: "Planned", labelZh: "规划中",
    dot: "bg-zinc-500",
    bg: "bg-zinc-500/5",
    border: "border-zinc-500/10 hover:border-zinc-500/20",
    glow: "",
  },
  disabled: {
    icon: <Ban className="h-3 w-3" />,
    label: "Disabled", labelZh: "已禁用",
    dot: "bg-zinc-700",
    bg: "bg-zinc-800/5",
    border: "border-zinc-700/10",
    glow: "",
  },
};

// ---------------------------------------------------------------------------
// Skill Card
// ---------------------------------------------------------------------------

function SkillCard({
  skill,
  status,
  isZh,
  selected,
  onClick,
}: {
  skill: SkillTreeNode;
  status: SkillStatus;
  isZh: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  const cfg = STATUS_CONFIG[status];

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
          <div className="text-xs font-semibold truncate">
            {isZh ? skill.nameZh : skill.name}
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
}: {
  category: typeof CATEGORIES[number];
  skills: SkillTreeNode[];
  statusMap: Map<string, SkillStatus>;
  isZh: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const activeCount = skills.filter((s) => (statusMap.get(s.id) ?? s.defaultStatus) === "active").length;
  const sorted = [...skills].sort((a, b) => a.tier - b.tier);

  return (
    <div className="space-y-1.5">
      <button
        className="flex items-center gap-2 w-full px-1 py-1 rounded hover:bg-accent/50 transition-colors"
        onClick={onToggle}
      >
        {collapsed
          ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        }
        <span className="text-xs font-bold" style={{ color: category.glowColor }}>
          {isZh ? category.nameZh : category.name}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {activeCount}/{skills.length}
        </span>
        {/* Mini progress */}
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail Panel
// ---------------------------------------------------------------------------

function DetailPanel({
  skill,
  status,
  allSkills,
  statusMap,
  isZh,
  onClose,
  onStatusChange,
  onNavigate,
}: {
  skill: SkillTreeNode;
  status: SkillStatus;
  allSkills: SkillTreeNode[];
  statusMap: Map<string, SkillStatus>;
  isZh: boolean;
  onClose: () => void;
  onStatusChange: (id: string, s: SkillStatus) => void;
  onNavigate: (route: string) => void;
}) {
  const cat = CATEGORIES.find((c) => c.id === skill.category);
  const cfg = STATUS_CONFIG[status];
  const deps = skill.dependencies.map((id) => allSkills.find((s) => s.id === id)).filter(Boolean) as SkillTreeNode[];
  const unlocks = allSkills.filter((s) => s.dependencies.includes(skill.id));

  // Status change validation: only allow certain transitions
  const canActivate = skill.defaultStatus === "active" || skill.defaultStatus === "configurable";
  const canDisable = status !== "planned";

  return (
    <div className="w-[340px] border-l bg-background flex flex-col h-full overflow-hidden shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b" style={{ borderLeftColor: cat?.glowColor, borderLeftWidth: 3 }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold">{isZh ? skill.nameZh : skill.name}</h3>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <Badge className="text-[9px] px-1.5 py-0 border-0 gap-1" style={{ backgroundColor: `${cat?.glowColor}15`, color: cat?.glowColor }}>
            {isZh ? cat?.nameZh : cat?.name}
          </Badge>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0">T{skill.tier}</Badge>
          <Badge className={`text-[9px] px-1.5 py-0 border-0 gap-1 ${cfg.bg}`}>
            {cfg.icon}
            {isZh ? cfg.labelZh : cfg.label}
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isZh ? skill.descriptionZh : skill.description}
        </p>

        {/* Status actions — contextual, not a raw dropdown */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold">{isZh ? "操作" : "Actions"}</label>
          <div className="flex flex-wrap gap-1.5">
            {status === "disabled" && canActivate && (
              <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1"
                onClick={() => onStatusChange(skill.id, skill.defaultStatus === "active" ? "active" : "configurable")}>
                <CheckCircle className="h-3 w-3 text-emerald-400" />
                {isZh ? "重新启用" : "Re-enable"}
              </Button>
            )}
            {status === "active" && (
              <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 text-zinc-400"
                onClick={() => onStatusChange(skill.id, "disabled")}>
                <Ban className="h-3 w-3" />
                {isZh ? "禁用" : "Disable"}
              </Button>
            )}
            {status === "planned" && (
              <div className="text-[10px] text-muted-foreground italic">
                {isZh ? "此功能尚未实现，开发后将自动可用" : "Not yet implemented. Will become available once built."}
              </div>
            )}
            {status === "configurable" && (
              <div className="text-[10px] text-amber-400">
                {isZh ? "需要配置后才能使用 (见下方步骤)" : "Needs setup before use (see steps below)"}
              </div>
            )}
          </div>
        </div>

        {/* Setup steps for configurable skills */}
        {(status === "configurable" || skill.setupSteps) && skill.setupSteps && skill.setupSteps.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-3 space-y-2">
            <div className="text-[11px] font-semibold text-amber-400">
              {isZh ? "配置步骤" : "Setup Steps"}
            </div>
            <ol className="space-y-1.5">
              {skill.setupSteps.map((step, i) => (
                <li key={i} className="flex gap-2 text-[10px]">
                  <span className="text-amber-500 font-mono shrink-0">{i + 1}.</span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
            {skill.detectHint && (
              <div className="text-[10px] text-muted-foreground border-t border-amber-500/10 pt-1.5 mt-1.5">
                <span className="font-medium text-amber-400">{isZh ? "验证：" : "Verify: "}</span>
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

        {/* Implementation detail */}
        {skill.implDetail && (
          <div className="space-y-1">
            <label className="text-[11px] font-semibold">{isZh ? "实现" : "Implementation"}</label>
            <code className="block text-[10px] text-muted-foreground font-mono bg-muted rounded px-2 py-1.5 break-all">
              {skill.implDetail}
            </code>
          </div>
        )}

        {/* Dependencies */}
        {deps.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold">{isZh ? "前置依赖" : "Requires"}</label>
            <div className="flex flex-wrap gap-1">
              {deps.map((d) => {
                const depStatus = statusMap.get(d.id) ?? d.defaultStatus;
                return (
                  <Badge key={d.id} variant="outline" className="text-[9px] px-1.5 py-0 gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[depStatus].dot}`} />
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
            <label className="text-[11px] font-semibold">{isZh ? "解锁技能" : "Unlocks"}</label>
            <div className="flex flex-wrap gap-1">
              {unlocks.map((u) => (
                <Badge key={u.id} variant="outline" className="text-[9px] px-1.5 py-0">
                  {isZh ? u.nameZh : u.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {skill.tags && skill.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {skill.tags.map((t) => (
              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Navigate */}
        {skill.pageRoute && (
          <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1.5"
            onClick={() => onNavigate(skill.pageRoute!)}>
            <ExternalLink className="h-3 w-3" />
            {isZh ? "打开页面" : "Open Page"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function SkillTreePage() {
  const locale = useLocale();
  const isZh = locale === "zh-CN";
  const router = useRouter();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [treeState, setTreeState] = useState<SkillTreeState>({ overrides: [], customSkills: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<SkillStatus | "all">("all");

  useEffect(() => {
    getSkillTreeState().then(setTreeState);
  }, []);

  const allSkills = useMemo(
    () => [...SKILL_TREE_NODES, ...treeState.customSkills],
    [treeState.customSkills]
  );

  const statusMap = useMemo(() => {
    const map = new Map<string, SkillStatus>();
    for (const s of allSkills) map.set(s.id, s.defaultStatus);
    for (const o of treeState.overrides) map.set(o.skillId, o.status);
    return map;
  }, [allSkills, treeState.overrides]);

  // Stats
  const stats = useMemo(() => {
    const s = { total: allSkills.length, active: 0, configurable: 0, planned: 0, disabled: 0 };
    for (const sk of allSkills) { s[statusMap.get(sk.id) ?? sk.defaultStatus]++; }
    return s;
  }, [allSkills, statusMap]);

  // Group by category, apply filters
  const groupedSkills = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = allSkills.filter((s) => {
      if (statusFilter !== "all" && (statusMap.get(s.id) ?? s.defaultStatus) !== statusFilter) return false;
      if (q) {
        return s.name.toLowerCase().includes(q) || s.nameZh.includes(q)
          || s.description.toLowerCase().includes(q) || s.descriptionZh.includes(q)
          || s.tags?.some((t) => t.includes(q));
      }
      return true;
    });

    const groups = new Map<SkillCategory, SkillTreeNode[]>();
    for (const cat of CATEGORIES) groups.set(cat.id, []);
    for (const s of filtered) {
      const list = groups.get(s.category);
      if (list) list.push(s);
    }
    // Remove empty categories
    for (const [key, val] of groups) { if (val.length === 0) groups.delete(key); }
    return groups;
  }, [allSkills, statusMap, statusFilter, searchQuery]);

  const selectedSkill = useMemo(
    () => allSkills.find((s) => s.id === selectedId) ?? null,
    [allSkills, selectedId]
  );

  const handleStatusChange = useCallback(async (skillId: string, status: SkillStatus) => {
    const newState = await setSkillStatus(skillId, status);
    setTreeState(newState);
  }, []);

  const toggleCat = useCallback((catId: string) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId); else next.add(catId);
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1 pb-3">
        <div className="flex items-center gap-2">
          <TreePine className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">{isZh ? "技能树" : "Skill Tree"}</h1>
            <p className="text-sm text-muted-foreground">
              {isZh ? "全景能力图谱" : "Full capability map"}
            </p>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-3 flex-wrap">
          {([
            { key: "all" as const, label: isZh ? "全部" : "All", count: stats.total, color: "" },
            { key: "active" as const, label: isZh ? "激活" : "Active", count: stats.active, color: "text-emerald-400" },
            { key: "configurable" as const, label: isZh ? "待配" : "Setup", count: stats.configurable, color: "text-amber-400" },
            { key: "planned" as const, label: isZh ? "规划" : "Plan", count: stats.planned, color: "text-zinc-400" },
          ]).map((f) => (
            <button
              key={f.key}
              className={`flex items-center gap-1 text-xs transition-colors ${
                statusFilter === f.key ? "font-bold" : "text-muted-foreground hover:text-foreground"
              } ${f.color}`}
              onClick={() => setStatusFilter(statusFilter === f.key ? "all" : f.key)}
            >
              {f.count} {f.label}
            </button>
          ))}

          {/* View toggle */}
          <div className="flex gap-0.5 border rounded-md p-0.5">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm" className="h-6 w-6 p-0"
              onClick={() => setViewMode("list")}
              title={isZh ? "列表视图" : "List View"}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "graph" ? "default" : "ghost"}
              size="sm" className="h-6 w-6 p-0"
              onClick={() => setViewMode("graph")}
              title={isZh ? "图谱视图" : "Graph View"}
            >
              <Network className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${(stats.active / Math.max(stats.total, 1)) * 100}%` }}
              />
            </div>
            <span className="text-[11px] text-muted-foreground">
              {Math.round((stats.active / Math.max(stats.total, 1)) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      {viewMode === "graph" ? (
        /* Graph view (React Flow) */
        <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">Loading graph...</span>
            </div>
          }>
            <TreeCanvas locale={locale} />
          </Suspense>
        </div>
      ) : (
        /* List view */
        <>
          {/* Search */}
          <div className="relative px-1 pb-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="h-8 text-xs pl-8"
              placeholder={isZh ? "搜索技能..." : "Search skills..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-1 min-h-0 gap-0">
            {/* Skill list */}
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
                  />
                );
              })}

              {groupedSkills.size === 0 && (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  {isZh ? "没有匹配的技能" : "No matching skills"}
                </div>
              )}
            </div>

            {/* Detail panel */}
            {selectedSkill && (
              <DetailPanel
                skill={selectedSkill}
                status={statusMap.get(selectedSkill.id) ?? selectedSkill.defaultStatus}
                allSkills={allSkills}
                statusMap={statusMap}
                isZh={isZh}
                onClose={() => setSelectedId(null)}
                onStatusChange={handleStatusChange}
                onNavigate={(route) => router.push(route)}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default SkillTreePage;
