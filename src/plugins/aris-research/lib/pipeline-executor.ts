/**
 * Pipeline Execution Engine
 *
 * Executes research pipeline nodes using the shared BaseExecutor.
 * Each node launches a Claude CLI session via the sessions API.
 * Supports parallel execution and checkpoint/resume.
 */
import type { Pipeline, PipelineNode, PipelineEdge } from "../types";
import { RESEARCH_SKILLS } from "../skill-data";
import { buildCommand, buildCommandWithContext } from "./build-pipeline-commands";
import {
  BaseExecutor,
  sleep,
  type ExecutionEvent,
  type ExecutionListener,
  type BaseExecutorOptions,
  type NotifierConfig,
  createPipelineNotifier,
} from "@/lib/execution";
import { saveExecutionState, type ExecutionState } from "./execution-state";
import { computeStageStatuses, syncStageStatuses } from "./stage-skill-sync";

// Re-export for backward compatibility
export type { ExecutionEvent, ExecutionListener } from "@/lib/execution";

export interface ExecutorOptions extends BaseExecutorOptions {
  /** Max parallel node executions (default: 2) */
  maxParallel?: number;
  /** Resume from checkpoint — skip nodes already done */
  resumeFrom?: string; // last completed node ID
  /** Notification configuration */
  notifier?: NotifierConfig;
  /** Workspace path for file I/O */
  workspacePath?: string;
}

export class PipelineExecutor extends BaseExecutor<PipelineNode, PipelineEdge> {
  private readonly pipelineId: string;
  private readonly pipelineName: string;
  private currentSessionIds = new Set<string>();
  private startTime = Date.now();
  private readonly sendNotify: ReturnType<typeof createPipelineNotifier> | null;
  private readonly workspacePath: string | null;

  constructor(pipeline: Pipeline, listener: ExecutionListener, options?: ExecutorOptions) {
    super(pipeline.nodes, pipeline.edges, listener, {
      maxParallel: options?.maxParallel ?? 2,
      resumeFrom: options?.resumeFrom,
    });
    this.pipelineId = pipeline.id;
    this.pipelineName = pipeline.name || pipeline.id;
    this.workspacePath = options?.workspacePath ?? null;

    // Setup notifier
    this.sendNotify = options?.notifier?.enabled
      ? createPipelineNotifier(options.notifier, this.pipelineName)
      : null;

    // Register checkpoint callback for state persistence
    this.onCheckpoint(async (completedIds, errorIds, skippedIds) => {
      await this.persistCheckpoint(completedIds, errorIds, skippedIds);
    });
  }

  protected isCheckpointNode(node: PipelineNode): boolean {
    return node.checkpoint === true;
  }

  protected override async waitForCheckpoint(nodeId: string): Promise<boolean> {
    const skill = RESEARCH_SKILLS.find((s) => s.id === this.nodes.find((n) => n.id === nodeId)?.skillId);
    // Notify about checkpoint
    this.sendNotify?.("checkpoint", skill?.name ?? nodeId, "Approval required to continue pipeline").catch(() => {});
    return super.waitForCheckpoint(nodeId);
  }

  protected async executeNode(node: PipelineNode): Promise<void> {
    const skill = RESEARCH_SKILLS.find((s) => s.id === node.skillId);
    if (!skill) {
      throw new Error(`Unknown skill: ${node.skillId}`);
    }

    // Find upstream skills for context passing
    const upstreamNodeIds = new Set<string>();
    for (const edge of this.edges) {
      if (edge.target === node.id) upstreamNodeIds.add(edge.source);
    }
    const upstreamSkills = this.workspacePath
      ? Array.from(upstreamNodeIds)
          .map((id) => this.nodes.find((n) => n.id === id))
          .filter(Boolean)
          .map((n) => RESEARCH_SKILLS.find((s) => s.id === n!.skillId))
          .filter(Boolean) as typeof RESEARCH_SKILLS
      : undefined;

    const { command, stageContext } = this.workspacePath
      ? buildCommandWithContext(skill, node.paramValues, upstreamSkills)
      : { command: buildCommand(skill, node.paramValues), stageContext: "" };

    this.emit({ type: "log", nodeId: node.id, message: `Launching: ${command}` });

    // Launch session with full workspace context
    const res = await fetch("/api/plugins/aris-research/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        skill: skill.name,
        command,
        ...(this.workspacePath ? {
          workspacePath: this.workspacePath,
          stageContext: stageContext || undefined,
          iterateUntilSatisfied: true,
        } : {}),
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to launch session: ${res.status}`);
    }

    const data = await res.json();
    const sessionId = data.session?.id;
    const logFile = data.session?.logFile;
    if (sessionId) this.currentSessionIds.add(sessionId);

    this.emit({
      type: "log",
      nodeId: node.id,
      message: `Session started: ${sessionId}`,
      sessionId,
      logFile,
    });

    // Poll for completion — pass logFile so we can stream logs immediately
    await this.waitForCompletion(sessionId, node.id, logFile);

    if (sessionId) this.currentSessionIds.delete(sessionId);
    this.emit({ type: "log", nodeId: node.id, message: `Completed: ${skill.name}` });

    // Send notification on node completion
    this.sendNotify?.("node-done", skill.name, `Stage "${skill.name}" completed successfully`).catch(() => {});
  }

  private async waitForCompletion(
    sessionId: string,
    nodeId: string,
    logFilePath?: string
  ): Promise<void> {
    const POLL_INTERVAL_MS = 5000;
    const MAX_TOTAL_MS = 3_600_000; // 1 hour

    let elapsed = 0;
    let lastLogLineCount = 0;

    while (elapsed < MAX_TOTAL_MS) {
      if (this.aborted) return;

      await sleep(POLL_INTERVAL_MS);
      elapsed += POLL_INTERVAL_MS;

      // 1) Stream log file content to dashboard (primary feedback)
      if (logFilePath) {
        try {
          const logRes = await fetch(
            `/api/plugins/aris-research/sessions/log?path=${encodeURIComponent(logFilePath)}&tail=500`
          );
          const logData = await logRes.json();
          const totalLines = logData.lines ?? 0;

          if (totalLines > lastLogLineCount && logData.content) {
            const allLines = (logData.content as string).split("\n");
            const newCount = totalLines - lastLogLineCount;
            const newLines = allLines.slice(Math.max(0, allLines.length - newCount));
            for (const line of newLines) {
              if (line.trim()) {
                this.emit({ type: "log", nodeId, message: line, sessionId });
              }
            }
            lastLogLineCount = totalLines;
          }

          // Check completion marker in log content
          if (logData.completed) return;
        } catch {
          // Log fetch failed, fall through to status check
        }
      }

      // 2) Check session status via sessions API (backup completion detection)
      try {
        const res = await fetch("/api/plugins/aris-research/sessions");
        const data = await res.json();
        const session = data.sessions?.find(
          (s: { id: string }) => s.id === sessionId
        );

        if (!session) return; // session gone
        if (session.status === "completed") return;
        if (session.status === "error") {
          throw new Error("Session ended with error");
        }

        // If no log file, emit periodic progress
        if (!logFilePath && elapsed % 30_000 < POLL_INTERVAL_MS) {
          this.emit({
            type: "log",
            nodeId,
            message: `Still running... (${Math.floor(elapsed / 60_000)}min)`,
          });
        }
      } catch (err) {
        if (String(err).includes("Session ended")) throw err;
        // Network error, retry
      }
    }

    throw new Error("Session timed out after 1 hour");
  }

  private async persistCheckpoint(
    completedIds: string[],
    errorIds: string[],
    skippedIds: string[]
  ): Promise<void> {
    const state: ExecutionState = {
      pipelineId: this.pipelineId,
      status: this.aborted ? "paused" : "running",
      completedNodes: completedIds,
      errorNodes: Object.fromEntries(errorIds.map((id) => [id, "error"])),
      skippedNodes: skippedIds,
      startedAt: new Date(this.startTime).toISOString(),
      lastCheckpoint: new Date().toISOString(),
      totalElapsedMs: Date.now() - this.startTime,
      logs: [],
    };

    try {
      await saveExecutionState(state);
    } catch {
      // Non-critical
    }

    // Sync stage statuses based on completed skills
    try {
      const completedSet = new Set(completedIds);
      // Nodes currently running = not completed, not errored, not skipped
      const terminalIds = new Set([...completedIds, ...errorIds, ...skippedIds]);
      const runningSet = new Set(
        this.nodes.filter((n) => !terminalIds.has(n.id)).map((n) => n.id)
      );
      const updates = computeStageStatuses(this.nodes, completedSet, runningSet);
      await syncStageStatuses(updates);
    } catch {
      // Non-critical
    }
  }
}
