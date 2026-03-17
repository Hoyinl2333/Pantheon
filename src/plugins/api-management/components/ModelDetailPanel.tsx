"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type ModelInfo,
  CATEGORY_COLORS,
  categorizeModel,
} from "./types";

export function ModelDetailPanel({ models, keyName }: { models: ModelInfo[]; keyName: string }) {
  const t = useTranslations("apiManagement");
  const [searchModel, setSearchModel] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  const categorized = useMemo(() => {
    const groups: Record<string, ModelInfo[]> = {};
    for (const m of models) {
      const cat = categorizeModel(m.id);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(m);
    }
    for (const cat of Object.keys(groups)) {
      groups[cat].sort((a, b) => a.id.localeCompare(b.id));
    }
    return groups;
  }, [models]);

  const categories = useMemo(() => Object.keys(categorized).sort(), [categorized]);

  const filteredModels = useMemo(() => {
    let result = filterCategory === "all" ? models : (categorized[filterCategory] ?? []);
    if (searchModel) {
      const q = searchModel.toLowerCase();
      result = result.filter((m) => m.id.toLowerCase().includes(q));
    }
    return result.sort((a, b) => a.id.localeCompare(b.id));
  }, [models, categorized, filterCategory, searchModel]);

  const catDistribution = useMemo(() => {
    return categories.map((cat) => ({
      name: cat,
      value: categorized[cat].length,
      color: CATEGORY_COLORS[cat] || "#6b7280",
    }));
  }, [categories, categorized]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium">
          {t("modelPanel.modelsCount", { count: models.length })} — {keyName}
        </div>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => setFilterCategory("all")}
          className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
            filterCategory === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {t("modelPanel.all", { count: models.length })}
        </button>
        {catDistribution.map((cat) => (
          <button
            key={cat.name}
            onClick={() => setFilterCategory(cat.name)}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
              filterCategory === cat.name
                ? "text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            style={filterCategory === cat.name ? { backgroundColor: cat.color } : {}}
          >
            {cat.name} ({cat.value})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <input
          type="text"
          placeholder={t("modelPanel.searchModels")}
          value={searchModel}
          onChange={(e) => setSearchModel(e.target.value)}
          className="w-full pl-7 pr-3 py-1 text-xs border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Model grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-60 overflow-y-auto pr-1">
        {filteredModels.map((m) => {
          const cat = categorizeModel(m.id);
          const catColor = CATEGORY_COLORS[cat] || "#6b7280";
          return (
            <div
              key={m.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/50 hover:bg-muted transition-colors"
            >
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: catColor }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-mono truncate" title={m.id}>
                  {m.id}
                </div>
                {m.ownedBy && (
                  <div className="text-[9px] text-muted-foreground">
                    {m.ownedBy}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredModels.length === 0 && (
        <div className="text-xs text-muted-foreground text-center py-4">
          {t("modelPanel.noModelsMatch")}
        </div>
      )}
    </div>
  );
}
