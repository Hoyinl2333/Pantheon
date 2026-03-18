"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Copy,
  Pencil,
  Trash2,
  Inbox,
} from "lucide-react";
import type { Pipeline, PipelineWithState } from "../types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface RecentPipelinesProps {
  isZh: boolean;
  pipelines: Pipeline[];
  loading: boolean;
  onLoadPipeline: (pipelineId: string) => void;
  onDeletePipeline: (pipelineId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecentPipelines({
  isZh,
  pipelines,
  loading,
  onLoadPipeline,
  onDeletePipeline,
}: RecentPipelinesProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">
        {isZh ? "最近的流水线" : "Recent Pipelines"}
      </h2>

      {loading ? (
        <div className="text-sm text-muted-foreground py-6 text-center">
          {isZh ? "加载中..." : "Loading..."}
        </div>
      ) : pipelines.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              {isZh ? "还没有保存的流水线" : "No saved pipelines yet"}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {isZh
                ? "创建的流水线会出现在这里"
                : "Pipelines you create will appear here"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {pipelines.map((pipeline) => (
            <Card key={pipeline.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3 flex items-center gap-3">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {isZh ? pipeline.nameZh || pipeline.name : pipeline.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0"
                    >
                      {pipeline.nodes.length} {isZh ? "节点" : "nodes"}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(pipeline.updatedAt).toLocaleDateString(
                        isZh ? "zh-CN" : "en-US",
                        { month: "short", day: "numeric" },
                      )}
                    </span>
                    {(() => {
                      const state = (pipeline as PipelineWithState)
                        .executionState;
                      if (!state?.status) return null;
                      return (
                        <Badge
                          variant={
                            state.status === "completed"
                              ? "default"
                              : state.status === "error"
                                ? "destructive"
                                : "secondary"
                          }
                          className="text-[10px] px-1.5 py-0"
                        >
                          {state.status}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLoadPipeline(pipeline.id);
                    }}
                    title={isZh ? "恢复" : "Resume"}
                  >
                    <Play className="h-3 w-3" />
                    {isZh ? "恢复" : "Resume"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLoadPipeline(pipeline.id);
                    }}
                    title={isZh ? "复制" : "Duplicate"}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLoadPipeline(pipeline.id);
                    }}
                    title={isZh ? "编辑" : "Edit"}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs gap-1 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePipeline(pipeline.id);
                    }}
                    title={isZh ? "删除" : "Delete"}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
