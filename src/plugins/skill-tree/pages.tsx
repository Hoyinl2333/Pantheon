"use client";

import { lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  TreePine,
  List,
  Network,
  Loader2,
  Plus,
  ScanSearch,
  Wand2,
} from "lucide-react";

import { useSkillTreePage } from "./hooks/use-skill-tree-page";
import { SkillListPanel } from "./components/skill-list-panel";
import { SkillListDetailPanel } from "./components/skill-list-detail-panel";
import { CustomSkillDialog } from "./components/custom-skill-dialog";
import { DeleteSkillDialog } from "./components/delete-skill-dialog";
import { SmartCreateDialog } from "./components/smart-create-dialog";

const TreeCanvas = lazy(() =>
  import("./components/tree-canvas").then((m) => ({ default: m.TreeCanvas }))
);

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function SkillTreePage() {
  const state = useSkillTreePage();

  const {
    locale,
    isZh,
    router,
    t,
    viewMode,
    setViewMode,
    allSkills,
    statusMap,
    customSkillIds,
    stats,
    selectedId,
    setSelectedId,
    selectedSkill,
    statusFilter,
    setStatusFilter,
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
  } = state;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1 pb-3">
        <div className="flex items-center gap-2">
          <TreePine className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>

        {/* Action buttons + Stats */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Scan All */}
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] gap-1.5 border-sky-500/20 text-sky-400 hover:text-sky-300 hover:border-sky-500/40"
            onClick={handleScanAll}
            disabled={scanning}
          >
            {scanning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ScanSearch className="h-3.5 w-3.5" />
            )}
            {scanning ? t("detect.scanning") : t("detect.scanAll")}
          </Button>

          {/* Smart Add */}
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] gap-1.5 border-violet-500/30 bg-violet-500/5 text-violet-400 hover:text-violet-300 hover:border-violet-500/50 hover:bg-violet-500/10"
            onClick={() => setShowSmartDialog(true)}
          >
            <Wand2 className="h-3.5 w-3.5" />
            {t("smart.smartAdd")}
          </Button>

          {/* Add Skill */}
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] gap-1.5 border-violet-500/20 text-violet-400 hover:text-violet-300 hover:border-violet-500/40"
            onClick={() => {
              setEditingSkill(null);
              setShowCreateDialog(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("custom.addSkill")}
          </Button>

          {/* Filter buttons */}
          {(
            [
              {
                key: "all" as const,
                label: t("filterAll"),
                count: stats.total,
                color: "",
              },
              {
                key: "active" as const,
                label: t("filterActive"),
                count: stats.active,
                color: "text-emerald-400",
              },
              {
                key: "configurable" as const,
                label: t("filterSetup"),
                count: stats.configurable,
                color: "text-amber-400",
              },
              {
                key: "planned" as const,
                label: t("filterPlan"),
                count: stats.planned,
                color: "text-zinc-400",
              },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              className={`flex items-center gap-1 text-xs transition-colors ${
                statusFilter === f.key
                  ? "font-bold"
                  : "text-muted-foreground hover:text-foreground"
              } ${f.color}`}
              onClick={() =>
                setStatusFilter(statusFilter === f.key ? "all" : f.key)
              }
            >
              {f.count} {f.label}
            </button>
          ))}

          {/* View toggle */}
          <div className="flex gap-0.5 border rounded-md p-0.5">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setViewMode("list")}
              title={t("listView")}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "graph" ? "default" : "ghost"}
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setViewMode("graph")}
              title={t("graphView")}
            >
              <Network className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                style={{
                  width: `${(stats.active / Math.max(stats.total, 1)) * 100}%`,
                }}
              />
            </div>
            <span className="text-[11px] text-muted-foreground">
              {Math.round(
                (stats.active / Math.max(stats.total, 1)) * 100
              )}
              %
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      {viewMode === "graph" ? (
        <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">{t("loadingGraph")}</span>
              </div>
            }
          >
            <TreeCanvas locale={locale} />
          </Suspense>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 gap-0">
          {/* Left: search + skill list */}
          <div className="flex-1 flex flex-col min-w-0">
            <SkillListPanel
              isZh={isZh}
              t={t}
              searchQuery={state.searchQuery}
              setSearchQuery={state.setSearchQuery}
              groupedSkills={state.groupedSkills}
              statusMap={statusMap}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              collapsedCats={state.collapsedCats}
              toggleCat={state.toggleCat}
              customSkillIds={customSkillIds}
            />
          </div>

          {/* Right: detail panel */}
          {selectedSkill && (
            <SkillListDetailPanel
              skill={selectedSkill}
              status={
                statusMap.get(selectedSkill.id) ??
                selectedSkill.defaultStatus
              }
              allSkills={allSkills}
              statusMap={statusMap}
              isZh={isZh}
              onClose={() => setSelectedId(null)}
              onStatusChange={handleStatusChange}
              onForceStatusChange={handleForceStatusChange}
              onNavigate={(route) => router.push(route)}
              isCustom={customSkillIds.has(selectedSkill.id)}
              onEdit={() => {
                setEditingSkill(selectedSkill);
                setShowCreateDialog(true);
              }}
              onDelete={() => setDeleteTarget(selectedSkill)}
              t={t}
            />
          )}
        </div>
      )}

      {/* Custom skill create/edit dialog */}
      <CustomSkillDialog
        open={showCreateDialog || !!editingSkill}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingSkill(null);
          }
        }}
        allSkills={allSkills}
        editingSkill={editingSkill}
        onSave={handleSaveCustomSkill}
        saving={saving}
        t={t}
      />

      {/* Smart create dialog */}
      <SmartCreateDialog
        open={showSmartDialog}
        onOpenChange={setShowSmartDialog}
        allSkills={allSkills}
        isZh={isZh}
        onConfirm={handleSmartConfirm}
        t={t}
      />

      {/* Delete confirmation dialog */}
      <DeleteSkillDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        skillName={
          deleteTarget
            ? isZh
              ? deleteTarget.nameZh
              : deleteTarget.name
            : ""
        }
        onConfirm={handleDeleteCustomSkill}
        deleting={deleting}
        t={t}
      />
    </div>
  );
}

export default SkillTreePage;
