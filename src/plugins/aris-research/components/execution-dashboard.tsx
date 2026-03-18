"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Clock,
  Loader2,
  Check,
  X,
  Pause,
  Square,
  ArrowLeft,
  Copy,
  FolderOpen,
  Terminal,
  ClipboardList,
} from "lucide-react";
import type { Pipeline, PipelineNode } from "../types";
import { ExecutionReport } from "./execution-report";
import {
  formatElapsed,
  formatDuration,
  topologicalSort,
  getSkillName,
  STATUS_ICONS,
  LogLine,
} from "./execution-helpers";
import { MiniDAG } from "./mini-dag";
import { OutputFileBrowser } from "./output-file-browser";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExecutionDashboardProps {
  pipeline: Pipeline;
  isZh: boolean;
  logs: string[];
  workspacePath: string | null;
  workspaceName: string | null;
  pendingCheckpoint: string | null;
  onCheckpointResolve: (approved: boolean) => void;
  onStop: () => void;
  onBackToDesigner: () => void;
  startTime: number;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ExecutionDashboard({
  pipeline,
  isZh,
  logs,
  workspacePath,
  workspaceName,
  pendingCheckpoint,
  onCheckpointResolve,
  onStop,
  onBackToDesigner,
  startTime,
}: ExecutionDashboardProps) {
  const [elapsed, setElapsed] = useState<number>(0);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("logs");
  const [logsCopied, setLogsCopied] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Sorted nodes in topological order
  const sortedNodes = useMemo(
    () => topologicalSort(pipeline.nodes, pipeline.edges),
    [pipeline.nodes, pipeline.edges]
  );

  // Detect pipeline completion for auto-switching to report tab
  const isPipelineComplete = useMemo(
    () =>
      pipeline.nodes.length > 0 &&
      pipeline.nodes.every(
        (n) => n.status === "done" || n.status === "error" || n.status === "skipped"
      ),
    [pipeline.nodes]
  );

  // Auto-switch to report tab when pipeline completes
  const hasAutoSwitched = useRef(false);
  useEffect(() => {
    if (isPipelineComplete && !hasAutoSwitched.current) {
      hasAutoSwitched.current = true;
      setActiveTab("report");
    }
  }, [isPipelineComplete]);

  // Elapsed timer
  useEffect(() => {
    setElapsed(Date.now() - startTime);
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Auto-scroll logs to bottom
  useEffect(() => {
    const container = logContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [logs]);

  // Progress stats
  const completedCount = pipeline.nodes.filter((n) => n.status === "done").length;
  const totalCount = pipeline.nodes.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Find currently running node
  const runningNode = pipeline.nodes.find((n) => n.status === "running");

  // Auto-select running node when no explicit selection
  const effectiveSelectedNodeId = selectedNodeId ?? runningNode?.id ?? null;
  const selectedNode = effectiveSelectedNodeId
    ? pipeline.nodes.find((n) => n.id === effectiveSelectedNodeId) ?? null
    : null;

  const handleNodeClick = useCallback(
    (node: PipelineNode) => {
      setSelectedNodeId(node.id);
      if (node.status === "done") {
        setActiveTab("outputs");
      } else if (node.status === "running") {
        setActiveTab("logs");
      }
    },
    []
  );

  const handleCopyLogs = useCallback(() => {
    navigator.clipboard.writeText(logs.join("\n"));
    setLogsCopied(true);
    setTimeout(() => setLogsCopied(false), 2000);
  }, [logs]);

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      {/* ── Header Bar ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b shrink-0">
        {/* Pipeline name */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <Terminal className="h-4 w-4 text-primary shrink-0" />
          <h2 className="text-sm font-semibold truncate max-w-[200px]">
            {isZh ? pipeline.nameZh : pipeline.name}
          </h2>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {completedCount}/{totalCount} {isZh ? "已完成" : "completed"}
          </span>
          <div className="flex-1 max-w-[200px] h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Clock className="h-3.5 w-3.5" />
          <span className="font-mono">{formatElapsed(elapsed)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={onStop}
          >
            <Square className="h-3 w-3" />
            {isZh ? "停止" : "Stop"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1"
            onClick={onBackToDesigner}
          >
            <ArrowLeft className="h-3 w-3" />
            {isZh ? "返回设计" : "Back to Designer"}
          </Button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Panel: Progress List + Mini DAG ── */}
        <div className="w-[240px] border-r flex flex-col shrink-0 overflow-hidden">
          {/* Progress list */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-2 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                {isZh ? "执行进度" : "Progress"}
              </span>
            </div>
            {sortedNodes.map((node) => {
              const isSelected = effectiveSelectedNodeId === node.id;
              const isRunning = node.status === "running";
              const skillName = getSkillName(node.skillId, isZh);

              return (
                <button
                  key={node.id}
                  className={`
                    w-full flex items-center gap-2 px-2 py-1.5 text-left transition-colors
                    hover:bg-accent/50
                    ${isRunning ? "border-l-2 border-l-amber-400 bg-amber-500/5" : "border-l-2 border-l-transparent"}
                    ${isSelected ? "bg-accent" : ""}
                  `}
                  onClick={() => handleNodeClick(node)}
                >
                  {STATUS_ICONS[node.status]}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{skillName}</div>
                    <div className="flex items-center gap-1">
                      {node.status === "done" && (
                        <span className="text-[10px] text-green-600">
                          {isZh ? "完成" : "Done"}
                        </span>
                      )}
                      {node.status === "running" && (
                        <RunningTimer startTime={startTime} isZh={isZh} />
                      )}
                      {node.status === "error" && (
                        <span className="text-[10px] text-red-500">
                          {isZh ? "错误" : "Error"}
                        </span>
                      )}
                      {node.checkpoint && (
                        <Badge
                          variant="outline"
                          className="text-[8px] px-1 py-0 border-amber-400 text-amber-600"
                        >
                          CP
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Mini DAG */}
          <div className="border-t px-2 py-2 shrink-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
              {isZh ? "流程图" : "DAG"}
            </span>
            <div className="mt-1">
              <MiniDAG nodes={pipeline.nodes} edges={pipeline.edges} />
            </div>
          </div>
        </div>

        {/* ── Right Panel: Tabs ── */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between border-b px-3 shrink-0">
            <TabsList className="h-8">
              <TabsTrigger value="logs" className="text-xs h-7 px-3 gap-1">
                <Terminal className="h-3 w-3" />
                {isZh ? "日志" : "Logs"}
              </TabsTrigger>
              <TabsTrigger value="outputs" className="text-xs h-7 px-3 gap-1">
                <FolderOpen className="h-3 w-3" />
                {isZh ? "输出" : "Outputs"}
              </TabsTrigger>
              <TabsTrigger
                value="report"
                className="text-xs h-7 px-3 gap-1"
                disabled={!isPipelineComplete}
              >
                <ClipboardList className="h-3 w-3" />
                {isZh ? "报告" : "Report"}
                {isPipelineComplete && (
                  <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                )}
              </TabsTrigger>
            </TabsList>

            {/* Copy logs button (only in logs tab) */}
            {activeTab === "logs" && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[10px] px-2 gap-1"
                onClick={handleCopyLogs}
              >
                {logsCopied ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {logsCopied
                  ? isZh ? "已复制" : "Copied"
                  : isZh ? "复制日志" : "Copy logs"}
              </Button>
            )}
          </div>

          {/* Logs tab content */}
          <TabsContent value="logs" className="flex-1 overflow-hidden m-0">
            <div
              ref={logContainerRef}
              className="h-full overflow-y-auto bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed"
            >
              {logs.length === 0 ? (
                <div className="text-zinc-500 text-center py-8">
                  {isZh ? "等待日志输出..." : "Waiting for logs..."}
                </div>
              ) : (
                logs.map((line, i) => <LogLine key={i} line={line} />)
              )}
            </div>
          </TabsContent>

          {/* Outputs tab content */}
          <TabsContent value="outputs" className="flex-1 overflow-hidden m-0">
            <OutputFileBrowser
              node={selectedNode}
              workspacePath={workspacePath}
              isZh={isZh}
            />
          </TabsContent>

          {/* Report tab content */}
          <TabsContent value="report" className="flex-1 overflow-hidden m-0">
            <ExecutionReport
              pipeline={pipeline}
              isZh={isZh}
              logs={logs}
              workspacePath={workspacePath}
              startTime={startTime}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Checkpoint Bar (conditional) ── */}
      {pendingCheckpoint !== null && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-yellow-500/10 border-t border-yellow-500/30 shrink-0">
          <Pause className="h-4 w-4 text-yellow-600 shrink-0" />
          <span className="text-sm flex-1 text-yellow-700 dark:text-yellow-400">
            {isZh
              ? `Checkpoint: ${pendingCheckpoint} 等待审批`
              : `Checkpoint: ${pendingCheckpoint} waiting for approval`}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            onClick={() => onCheckpointResolve(false)}
          >
            {isZh ? "拒绝" : "Reject"}
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
            onClick={() => onCheckpointResolve(true)}
          >
            {isZh ? "批准继续" : "Approve"}
          </Button>
        </div>
      )}
    </div>
  );
}

/** Live timer for a running node, updates every second */
function RunningTimer({ startTime, isZh }: { startTime: number; isZh: boolean }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-[10px] text-amber-500 font-mono">
      {formatDuration(now - startTime)}
    </span>
  );
}
