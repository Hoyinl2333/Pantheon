"use client";

import { useState, useCallback } from "react";
import {
  X,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  Clock,
  Power,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { InfoNeed } from "../types";

interface NeedsManagerProps {
  open: boolean;
  onClose: () => void;
  needs: InfoNeed[];
  onNeedsChange: () => void;
  isZh: boolean;
}

export function NeedsManager({
  open,
  onClose,
  needs,
  onNeedsChange,
  isZh,
}: NeedsManagerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleToggle = useCallback(
    async (id: string, enabled: boolean) => {
      try {
        await fetch("/api/plugins/daily-briefing/needs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, enabled }),
        });
        onNeedsChange();
      } catch (err) {
        console.error("[NeedsManager] Toggle error:", err);
      }
    },
    [onNeedsChange],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await fetch("/api/plugins/daily-briefing/needs", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        onNeedsChange();
      } catch (err) {
        console.error("[NeedsManager] Delete error:", err);
      }
    },
    [onNeedsChange],
  );

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 bg-background border-l shadow-xl overflow-y-auto animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
          <h2 className="text-lg font-semibold">
            {isZh ? "我的信息需求" : "My Information Needs"}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Needs list */}
        <div className="p-6 space-y-3">
          {needs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">
                {isZh
                  ? "还没有信息需求，点击「新需求」添加"
                  : "No needs yet. Click 'New Need' to add one."}
              </p>
            </div>
          ) : (
            needs.map((need) => {
              const isExpanded = expandedId === need.id;
              return (
                <div
                  key={need.id}
                  className="rounded-lg border p-4 space-y-2"
                >
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {need.name}
                        </span>
                        {need.tags.slice(0, 2).map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-[10px] px-1 py-0"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {need.description}
                      </p>
                    </div>

                    <Switch
                      checked={need.enabled}
                      onCheckedChange={(v) => handleToggle(need.id, v)}
                    />
                  </div>

                  {/* Last fetched */}
                  {need.lastFetchedAt && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {isZh ? "上次抓取" : "Last fetched"}:{" "}
                      {new Date(need.lastFetchedAt).toLocaleString()}
                    </div>
                  )}

                  {/* Actions + expand */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => toggleExpand(need.id)}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-3 w-3 mr-1" />
                      ) : (
                        <ChevronDown className="h-3 w-3 mr-1" />
                      )}
                      {isZh ? "策略详情" : "Strategy"}
                    </Button>
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(need.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Strategy details (expanded) */}
                  {isExpanded && (
                    <div className="rounded-md bg-muted/30 p-3 space-y-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">
                          {isZh ? "关键词" : "Keywords"}:
                        </span>{" "}
                        {need.strategy.keywords.join(", ")}
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {isZh ? "来源" : "Sources"}:
                        </span>{" "}
                        {need.strategy.sources
                          .map((s) => `${s.name} (${s.type})`)
                          .join(", ")}
                      </div>
                      {need.strategy.filters.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">
                            {isZh ? "过滤" : "Filters"}:
                          </span>{" "}
                          {need.strategy.filters
                            .map(
                              (f) =>
                                `${f.field} ${f.operator} "${f.value}"`,
                            )
                            .join("; ")}
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">
                          {isZh ? "频率" : "Schedule"}:
                        </span>{" "}
                        {need.strategy.schedule}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
