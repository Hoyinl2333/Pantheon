"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";

import type {
  SkillTreeNode,
  SkillStatus,
  SkillCategory,
  SkillTreeState,
  CustomSkill,
} from "../types";
import { SKILL_TREE_NODES, CATEGORIES } from "../skill-tree-data";
import {
  getSkillTreeState,
  saveSkillTreeState,
  setSkillStatus,
  addCustomSkill,
  updateCustomSkill,
  removeCustomSkill,
} from "../skill-tree-store";

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
// Types
// ---------------------------------------------------------------------------

export type ViewMode = "list" | "graph";

export interface SkillTreePageState {
  // Locale
  locale: string;
  isZh: boolean;
  router: ReturnType<typeof useRouter>;
  t: ReturnType<typeof useTranslations>;

  // View
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Data
  treeState: SkillTreeState;
  allSkills: SkillTreeNode[];
  statusMap: Map<string, SkillStatus>;
  customSkillIds: Set<string>;
  stats: { total: number; active: number; configurable: number; planned: number; disabled: number };
  groupedSkills: Map<SkillCategory, SkillTreeNode[]>;

  // Selection
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  selectedSkill: SkillTreeNode | null;

  // Search & filter
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: SkillStatus | "all";
  setStatusFilter: (f: SkillStatus | "all") => void;

  // Collapsed categories
  collapsedCats: Set<string>;
  toggleCat: (catId: string) => void;

  // Status change handlers
  handleStatusChange: (skillId: string, status: SkillStatus) => Promise<void>;
  handleForceStatusChange: (skillId: string, status: SkillStatus) => Promise<void>;

  // Dialog states
  showCreateDialog: boolean;
  setShowCreateDialog: (v: boolean) => void;
  editingSkill: SkillTreeNode | null;
  setEditingSkill: (s: SkillTreeNode | null) => void;
  deleteTarget: SkillTreeNode | null;
  setDeleteTarget: (s: SkillTreeNode | null) => void;
  saving: boolean;
  deleting: boolean;

  // Smart create
  showSmartDialog: boolean;
  setShowSmartDialog: (v: boolean) => void;

  // Scan
  scanning: boolean;
  handleScanAll: () => Promise<void>;

  // Custom skill handlers
  handleSaveCustomSkill: (data: Omit<CustomSkill, "isCustom" | "createdAt">) => Promise<void>;
  handleDeleteCustomSkill: () => Promise<void>;
  handleSmartConfirm: (skills: Omit<CustomSkill, "isCustom" | "createdAt">[]) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSkillTreePage(): SkillTreePageState {
  const locale = useLocale();
  const isZh = locale === "zh-CN";
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("skillTree");

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [treeState, setTreeState] = useState<SkillTreeState>({
    overrides: [],
    customSkills: [],
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<SkillStatus | "all">("all");

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSkill, setEditingSkill] = useState<SkillTreeNode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SkillTreeNode | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Smart create state
  const [showSmartDialog, setShowSmartDialog] = useState(false);

  // Scan all state
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    getSkillTreeState().then(setTreeState);
  }, []);

  const customSkillIds = useMemo(
    () => new Set(treeState.customSkills.map((s) => s.id)),
    [treeState.customSkills]
  );

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
    const s = {
      total: allSkills.length,
      active: 0,
      configurable: 0,
      planned: 0,
      disabled: 0,
    };
    for (const sk of allSkills) {
      s[statusMap.get(sk.id) ?? sk.defaultStatus]++;
    }
    return s;
  }, [allSkills, statusMap]);

  // Group by category, apply filters
  const groupedSkills = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = allSkills.filter((s) => {
      if (
        statusFilter !== "all" &&
        (statusMap.get(s.id) ?? s.defaultStatus) !== statusFilter
      )
        return false;
      if (q) {
        return (
          s.name.toLowerCase().includes(q) ||
          s.nameZh.includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.descriptionZh.includes(q) ||
          s.tags?.some((tag) => tag.includes(q))
        );
      }
      return true;
    });

    const groups = new Map<SkillCategory, SkillTreeNode[]>();
    for (const cat of CATEGORIES) groups.set(cat.id, []);
    for (const s of filtered) {
      const list = groups.get(s.category);
      if (list) list.push(s);
    }
    for (const [key, val] of groups) {
      if (val.length === 0) groups.delete(key);
    }
    return groups;
  }, [allSkills, statusMap, statusFilter, searchQuery]);

  const selectedSkill = useMemo(
    () => allSkills.find((s) => s.id === selectedId) ?? null,
    [allSkills, selectedId]
  );

  const handleStatusChange = useCallback(
    async (skillId: string, status: SkillStatus) => {
      // ST-3: Dependency enforcement -- block activation if deps not active
      if (status === "active") {
        const skill = allSkills.find((s) => s.id === skillId);
        if (skill && skill.dependencies.length > 0) {
          const missingDeps = skill.dependencies
            .map((depId) => {
              const depSkill = allSkills.find((s) => s.id === depId);
              if (!depSkill) return null;
              const depStatus = statusMap.get(depId) ?? depSkill.defaultStatus;
              return depStatus !== "active" ? depSkill : null;
            })
            .filter(Boolean) as SkillTreeNode[];
          if (missingDeps.length > 0) {
            const names = missingDeps
              .map((d) => (isZh ? d.nameZh : d.name))
              .join(", ");
            toast(
              isZh
                ? `依赖未满足：需要先激活 ${names}`
                : `Dependencies not met: ${names} need to be activated first`,
              "error"
            );
            return;
          }
        }
      }
      const newState = await setSkillStatus(skillId, status);
      setTreeState(newState);
    },
    [allSkills, statusMap, isZh, toast]
  );

  // ST-3: Force status change (bypasses dep check) -- used by detect/verify
  const handleForceStatusChange = useCallback(
    async (skillId: string, status: SkillStatus) => {
      const newState = await setSkillStatus(skillId, status);
      setTreeState(newState);
    },
    []
  );

  const toggleCat = useCallback((catId: string) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }, []);

  // --- Custom skill handlers ---
  const handleSaveCustomSkill = useCallback(
    async (data: Omit<CustomSkill, "isCustom" | "createdAt">) => {
      setSaving(true);
      try {
        if (editingSkill && customSkillIds.has(editingSkill.id)) {
          const newState = await updateCustomSkill(editingSkill.id, data);
          setTreeState(newState);
          toast(t("custom.updated"), "success");
          setEditingSkill(null);
        } else {
          const newState = await addCustomSkill(data);
          setTreeState(newState);
          toast(t("custom.created"), "success");
          setShowCreateDialog(false);
        }
      } catch {
        toast(t("custom.createFailed"), "error");
      } finally {
        setSaving(false);
      }
    },
    [editingSkill, customSkillIds, toast, t]
  );

  const handleDeleteCustomSkill = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const newState = await removeCustomSkill(deleteTarget.id);
      setTreeState(newState);
      toast(t("custom.deleted"), "success");
      setDeleteTarget(null);
      if (selectedId === deleteTarget.id) setSelectedId(null);
    } catch {
      toast(t("custom.deleteFailed"), "error");
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, toast, t, selectedId]);

  // --- Scan all ---
  const handleScanAll = useCallback(async () => {
    setScanning(true);
    const detectableSkills = allSkills.filter((s) => s.detectCommand);
    let activeCount = 0;
    let failedCount = 0;

    for (const skill of detectableSkills) {
      const result = await runDetect(skill.detectCommand!);
      if (result.success) {
        activeCount++;
        await setSkillStatus(skill.id, "active");
      } else {
        failedCount++;
      }
    }

    // Refresh state
    const newState = await getSkillTreeState();
    setTreeState(newState);
    setScanning(false);

    toast(
      t("detect.scanComplete", { active: activeCount, failed: failedCount }),
      activeCount > 0 ? "success" : "info"
    );
  }, [allSkills, toast, t]);

  // --- Smart create handler ---
  const handleSmartConfirm = useCallback(
    async (skills: Omit<CustomSkill, "isCustom" | "createdAt">[]) => {
      try {
        let state = await getSkillTreeState();
        for (const skill of skills) {
          const custom: CustomSkill = {
            ...skill,
            isCustom: true,
            createdAt: new Date().toISOString(),
          };
          state = {
            ...state,
            customSkills: [...state.customSkills, custom],
          };
        }
        await saveSkillTreeState(state);
        setTreeState(state);
        toast(t("smart.created"), "success");
      } catch {
        toast(t("smart.createFailed"), "error");
      }
    },
    [toast, t]
  );

  return {
    locale,
    isZh,
    router,
    t,
    viewMode,
    setViewMode,
    treeState,
    allSkills,
    statusMap,
    customSkillIds,
    stats,
    groupedSkills,
    selectedId,
    setSelectedId,
    selectedSkill,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    collapsedCats,
    toggleCat,
    handleStatusChange,
    handleForceStatusChange,
    showCreateDialog,
    setShowCreateDialog,
    editingSkill,
    setEditingSkill,
    deleteTarget,
    setDeleteTarget,
    saving,
    deleting,
    showSmartDialog,
    setShowSmartDialog,
    scanning,
    handleScanAll,
    handleSaveCustomSkill,
    handleDeleteCustomSkill,
    handleSmartConfirm,
  };
}
