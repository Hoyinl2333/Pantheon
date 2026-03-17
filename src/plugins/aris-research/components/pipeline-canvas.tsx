"use client";

import { useState, useCallback, useRef, useMemo, useEffect, type DragEvent, lazy, Suspense } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { Pipeline, PipelineNode, PipelineEdge, ResearchProgram, NodeStatus } from "../types";
import { ARIS_SKILLS } from "../skill-data";
import { autoLayout } from "../lib/auto-layout";
import { PIPELINE_TEMPLATES } from "../pipeline-templates";
import { savePipeline, getPipeline } from "../pipeline-store";
import { PipelineExecutor, type ExecutionEvent } from "../lib/pipeline-executor";
import { getExecutionState, clearExecutionState } from "../lib/execution-state";
import { getArisConfig } from "../aris-store";
import { nodeTypes } from "./skill-node";
import { ContextBar } from "./context-bar";
import { LeftPanel } from "./left-panel";
import { PipelineToolbar } from "./pipeline-toolbar";
import { NodeConfigPanel } from "./node-config-panel";
import { NodeOutputPanel } from "./node-output-panel";
import { SetupWizard } from "./setup-wizard";
import { ExecutionDashboard } from "./execution-dashboard";

// ---------------------------------------------------------------------------
// Phase types
// ---------------------------------------------------------------------------

type Phase = "setup" | "design" | "execute";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId() {
  return `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function toFlowNodes(pNodes: PipelineNode[], isZh: boolean): Node[] {
  return pNodes.map((n) => ({
    id: n.id,
    type: "skill",
    position: n.position,
    data: { skillId: n.skillId, status: n.status, paramValues: n.paramValues, notes: n.notes, isZh, checkpoint: n.checkpoint },
  }));
}

function toFlowEdges(pEdges: PipelineEdge[], runningNodeIds?: Set<string>): Edge[] {
  return pEdges.map((e) => ({
    id: e.id, source: e.source, target: e.target,
    animated: runningNodeIds?.has(e.source) || runningNodeIds?.has(e.target) || false,
    style: { strokeWidth: 2 },
  }));
}

function fromFlowNodes(nodes: Node[]): PipelineNode[] {
  return nodes.map((n) => ({
    id: n.id,
    skillId: n.data.skillId as string,
    position: n.position,
    status: (n.data.status as NodeStatus) ?? "idle",
    paramValues: (n.data.paramValues as Record<string, string>) ?? {},
    notes: (n.data.notes as string) ?? "",
    checkpoint: (n.data.checkpoint as boolean) ?? false,
  }));
}

function fromFlowEdges(edges: Edge[]): PipelineEdge[] {
  return edges.map((e) => ({ id: e.id, source: e.source, target: e.target }));
}

const DEFAULT_PROGRAM: ResearchProgram = { brief: "", attachments: [], templateId: null };

// ---------------------------------------------------------------------------
// Main Component (inner, wrapped by ReactFlowProvider)
// ---------------------------------------------------------------------------

function PipelineCanvasInner({ locale, onBack }: { locale: string; onBack: () => void }) {
  const isZh = locale === "zh-CN";
  const { screenToFlowPosition, fitView } = useReactFlow();

  // --- Phase state ---
  const [phase, setPhase] = useState<Phase>("setup");

  // --- Pipeline state ---
  const [pipelineId, setPipelineId] = useState(() => `pl-${Date.now()}`);
  const [name, setName] = useState(isZh ? "新流水线" : "New Pipeline");
  const [program, setProgram] = useState<ResearchProgram>(DEFAULT_PROGRAM);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");

  // --- Canvas state ---
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // --- UI state ---
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);

  // --- Execution state ---
  const [isRunning, setIsRunning] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [canResume, setCanResume] = useState(false);
  const [resumeNodeId, setResumeNodeId] = useState<string | null>(null);
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [pendingCheckpoint, setPendingCheckpoint] = useState<string | null>(null);
  const [executionStartTime, setExecutionStartTime] = useState<number>(Date.now());
  const executorRef = useRef<PipelineExecutor | null>(null);
  const executorActiveRef = useRef(false);

  // --- Derived ---
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    const fn = nodes.find((n) => n.id === selectedNodeId);
    if (!fn) return null;
    return {
      id: fn.id, skillId: fn.data.skillId as string, position: fn.position,
      status: (fn.data.status as NodeStatus) ?? "idle",
      paramValues: (fn.data.paramValues as Record<string, string>) ?? {},
      notes: (fn.data.notes as string) ?? "",
    } as PipelineNode;
  }, [selectedNodeId, nodes]);

  const currentPipeline = useMemo((): Pipeline => ({
    id: pipelineId, name, nameZh: name, description: "", descriptionZh: "",
    nodes: fromFlowNodes(nodes), edges: fromFlowEdges(edges),
    program, isTemplate: false,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }), [pipelineId, name, nodes, edges, program]);

  // Nodes as simple objects for LeftPanel overview
  const overviewNodes = useMemo(
    () => nodes.map((n) => ({
      id: n.id,
      skillId: n.data.skillId as string,
      status: (n.data.status as string) ?? "idle",
      paramValues: (n.data.paramValues as Record<string, string>) ?? {},
    })),
    [nodes]
  );

  // =========================================================================
  // Setup Wizard handlers
  // =========================================================================

  const handleStartDesign = useCallback((config: {
    name: string;
    program: ResearchProgram;
    templateId: string | null;
  }) => {
    setName(config.name);
    setProgram(config.program);
    setPipelineId(`pl-${Date.now()}`);

    // Load template nodes/edges if selected
    if (config.templateId) {
      const tpl = PIPELINE_TEMPLATES.find((t) => t.id === config.templateId);
      if (tpl) {
        // Auto-fill 'topic' param in all nodes from research brief
        const briefTopic = config.program.brief.split("\n")[0].slice(0, 100).trim();
        const filledNodes = tpl.nodes.map((n) => {
          const skill = ARIS_SKILLS.find((s) => s.id === n.skillId);
          const topicParam = skill?.params?.find((p) => p.name === "topic" || p.name === "direction");
          if (topicParam && briefTopic) {
            return { ...n, paramValues: { ...n.paramValues, [topicParam.name]: briefTopic } };
          }
          return n;
        });
        setNodes(toFlowNodes(filledNodes, isZh));
        setEdges(toFlowEdges(tpl.edges));
        setTimeout(() => fitView({ padding: 0.2 }), 100);
      }
    } else {
      setNodes([]);
      setEdges([]);
    }

    setSelectedNodeId(null);
    setSaveStatus("idle");
    setPhase("design");
  }, [setNodes, setEdges, fitView, isZh]);

  const handleLoadPipeline = useCallback(async (plId: string) => {
    const pl = await getPipeline(plId);
    if (!pl) return;
    setNodes(toFlowNodes(pl.nodes, isZh));
    setEdges(toFlowEdges(pl.edges));
    setProgram(pl.program);
    setName(pl.name);
    setPipelineId(pl.id);
    setSelectedNodeId(null);
    setSaveStatus("idle");
    setPhase("design");
    setTimeout(() => fitView({ padding: 0.2 }), 100);
    checkResumable(pl.id);
  }, [setNodes, setEdges, fitView, isZh]);

  // =========================================================================
  // Canvas handlers
  // =========================================================================

  const onConnect: OnConnect = useCallback(
    (conn: Connection) => setEdges((eds) => addEdge({ ...conn, style: { strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => setSelectedNodeId(node.id), []);
  const onPaneClick = useCallback(() => setSelectedNodeId(null), []);

  const onDragOver = useCallback((e: DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }, []);
  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    const skillId = e.dataTransfer.getData("application/aris-skill");
    if (!skillId || !ARIS_SKILLS.find((s) => s.id === skillId)) return;
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setNodes((nds) => [...nds, {
      id: generateId(), type: "skill", position,
      data: { skillId, status: "idle", paramValues: {}, notes: "", isZh },
    }]);
  }, [screenToFlowPosition, setNodes, isZh]);

  const onUpdateNode = useCallback((nodeId: string, patch: Partial<PipelineNode>) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id !== nodeId) return n;
      return { ...n, data: { ...n.data, ...patch } };
    }));
  }, [setNodes]);

  const updateNodeStatus = useCallback((nodeId: string, status: NodeStatus) => {
    setNodes((nds) => nds.map((n) =>
      n.id === nodeId ? { ...n, data: { ...n.data, status } } : n
    ));
  }, [setNodes]);

  // Focus node from left panel
  const handleNodeFocus = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    // Also center the view on the node
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      fitView({ nodes: [node], padding: 0.5, duration: 300 });
    }
  }, [nodes, fitView]);

  // =========================================================================
  // Toolbar handlers
  // =========================================================================

  const handleLoadTemplate = useCallback((templateId: string) => {
    const tpl = PIPELINE_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setNodes(toFlowNodes(tpl.nodes, isZh));
    setEdges(toFlowEdges(tpl.edges));
    setProgram(tpl.program);
    setName(isZh ? tpl.nameZh : tpl.name);
    setPipelineId(`pl-${Date.now()}`);
    setSelectedNodeId(null);
    setSaveStatus("idle");
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  }, [setNodes, setEdges, fitView, isZh]);

  const handleLoadSaved = useCallback(async (plId: string) => {
    const pl = await getPipeline(plId);
    if (!pl) return;
    setNodes(toFlowNodes(pl.nodes, isZh));
    setEdges(toFlowEdges(pl.edges));
    setProgram(pl.program);
    setName(pl.name);
    setPipelineId(pl.id);
    setSelectedNodeId(null);
    setSaveStatus("idle");
    setTimeout(() => fitView({ padding: 0.2 }), 100);
    checkResumable(pl.id);
  }, [setNodes, setEdges, fitView, isZh]);

  const handleAutoLayout = useCallback(() => {
    const laid = autoLayout(fromFlowNodes(nodes), fromFlowEdges(edges));
    setNodes(toFlowNodes(laid, isZh));
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  }, [nodes, edges, setNodes, fitView, isZh]);

  const handleSave = useCallback(async () => {
    await savePipeline(currentPipeline);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  }, [currentPipeline]);

  const handleNew = useCallback(() => {
    setPhase("setup");
    setNodes([]); setEdges([]);
    setProgram(DEFAULT_PROGRAM);
    setName(isZh ? "新流水线" : "New Pipeline");
    setPipelineId(`pl-${Date.now()}`);
    setSelectedNodeId(null);
    setSaveStatus("idle");
    setExecutionLogs([]);
    setCanResume(false);
    setResumeNodeId(null);
  }, [setNodes, setEdges, isZh]);

  // =========================================================================
  // Execution
  // =========================================================================

  const handleCheckpointResolve = useCallback((approved: boolean) => {
    if (pendingCheckpoint && executorRef.current) {
      executorRef.current.resolveCheckpoint(pendingCheckpoint, approved);
    }
  }, [pendingCheckpoint]);

  const checkResumable = useCallback(async (plId: string) => {
    try {
      const state = await getExecutionState(plId);
      if (!state || state.completedNodes.length === 0) {
        setCanResume(false);
        setResumeNodeId(null);
        return;
      }
      for (const id of state.completedNodes) updateNodeStatus(id, "done");
      for (const id of Object.keys(state.errorNodes)) updateNodeStatus(id, "error");
      for (const id of state.skippedNodes) updateNodeStatus(id, "skipped");
      if (state.logs.length > 0) {
        setExecutionLogs(state.logs);
      }

      if (state.status === "running") {
        try {
          const res = await fetch("/api/plugins/aris-research/sessions");
          const data = await res.json();
          const hasRunning = (data.sessions ?? []).some((s: { status: string }) => s.status === "running");
          if (hasRunning) {
            setIsRunning(true);
            setCanResume(false);
            setPhase("execute");
          } else {
            setIsRunning(false);
            setCanResume(true);
            setResumeNodeId(state.completedNodes[state.completedNodes.length - 1]);
          }
        } catch {
          setIsRunning(false);
          setCanResume(true);
          setResumeNodeId(state.completedNodes[state.completedNodes.length - 1]);
        }
      } else if (state.status === "completed") {
        setCanResume(false);
        setResumeNodeId(null);
        setIsRunning(false);
      } else {
        setCanResume(true);
        setResumeNodeId(state.completedNodes[state.completedNodes.length - 1]);
        setIsRunning(false);
      }
    } catch {
      setCanResume(false);
      setResumeNodeId(null);
    }
  }, [updateNodeStatus]);

  // Poll sessions for status (works after page reload)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!isRunning) {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      return;
    }
    const pollSessions = async () => {
      if (executorActiveRef.current) return;
      try {
        const res = await fetch("/api/plugins/aris-research/sessions");
        const data = await res.json();
        const hasRunning = (data.sessions ?? []).some((s: { status: string }) => s.status === "running");
        if (!hasRunning) {
          setIsRunning(false);
          const state = await getExecutionState(pipelineId);
          if (state) {
            for (const id of state.completedNodes) updateNodeStatus(id, "done");
            for (const id of Object.keys(state.errorNodes)) updateNodeStatus(id, "error");
            for (const id of state.skippedNodes) updateNodeStatus(id, "skipped");
          }
        }
      } catch { /* ignore */ }
    };
    pollingRef.current = setInterval(pollSessions, 10000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [isRunning, pipelineId, updateNodeStatus]);

  const createExecutionListener = useCallback((onDone?: () => void) => {
    return (event: ExecutionEvent) => {
      if (event.type === "node-status" && event.nodeId && event.status) {
        updateNodeStatus(event.nodeId, event.status as NodeStatus);
      }
      if (event.type === "log" && event.message) {
        setExecutionLogs((prev) => [...prev.slice(-200), `[${new Date().toLocaleTimeString()}] ${event.message}`]);
      }
      if (event.type === "checkpoint-pending" && event.nodeId) {
        setPendingCheckpoint(event.nodeId);
        setExecutionLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ⏸ CHECKPOINT: Waiting for approval at node ${event.nodeId}`,
        ]);
      }
      if (event.type === "checkpoint-resolved" && event.nodeId) {
        setPendingCheckpoint(null);
        setExecutionLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ✓ Checkpoint ${event.message}: ${event.nodeId}`,
        ]);
      }
      if (event.type === "pipeline-done" || event.type === "pipeline-error") {
        setIsRunning(false);
        setCanResume(false);
        setResumeNodeId(null);
        setPendingCheckpoint(null);
        setExecutionLogs((prev) => [...prev, `\n=== ${event.message} ===`]);
        onDone?.();
      }
    };
  }, [updateNodeStatus]);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setExecutionLogs([]);
    setCanResume(false);
    setExecutionStartTime(Date.now());
    executorActiveRef.current = true;
    setPhase("execute");

    // Create workspace
    try {
      const briefText = program.brief?.trim() ?? "";
      const isPlaceholder = !briefText || briefText.length < 5;
      const topic = isPlaceholder ? name : briefText.slice(0, 100);
      const res = await fetch("/api/plugins/aris-research/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineId, topic }),
      });
      const ws = await res.json();
      if (ws.path) {
        setWorkspacePath(ws.path);
        setWorkspaceName(ws.name);
      }
    } catch { /* non-blocking */ }

    const config = await getArisConfig();
    const executor = new PipelineExecutor(
      currentPipeline,
      createExecutionListener(() => { executorActiveRef.current = false; }),
      {
        maxParallel: 2,
        notifier: config.notifyEnabled
          ? {
              enabled: true,
              channel: config.notifyChannel ?? "telegram",
              telegramChatId: config.notifyTelegramChatId,
              feishuChatId: config.notifyFeishuChatId,
            }
          : undefined,
      }
    );
    executorRef.current = executor;
    executor.run();
  }, [currentPipeline, createExecutionListener, program.brief, name, pipelineId]);

  const handleResume = useCallback(() => {
    if (!resumeNodeId) return;
    setIsRunning(true);
    setExecutionStartTime(Date.now());
    setExecutionLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Resuming from checkpoint...`]);
    executorActiveRef.current = true;
    setPhase("execute");

    const executor = new PipelineExecutor(
      currentPipeline,
      createExecutionListener(() => { executorActiveRef.current = false; }),
      { maxParallel: 2, resumeFrom: resumeNodeId }
    );
    executorRef.current = executor;
    setCanResume(false);
    executor.run();
  }, [currentPipeline, resumeNodeId, createExecutionListener]);

  const handleStop = useCallback(() => {
    executorRef.current?.abort();
    executorActiveRef.current = false;
    setIsRunning(false);
    setTimeout(() => checkResumable(pipelineId), 500);
  }, [checkResumable, pipelineId]);

  // =========================================================================
  // Render
  // =========================================================================

  // Phase: Setup
  if (phase === "setup") {
    return (
      <SetupWizard
        isZh={isZh}
        onStartDesign={handleStartDesign}
        onLoadPipeline={handleLoadPipeline}
        onBack={onBack}
      />
    );
  }

  // Phase: Execute
  if (phase === "execute") {
    return (
      <ExecutionDashboard
        pipeline={currentPipeline}
        isZh={isZh}
        logs={executionLogs}
        workspacePath={workspacePath}
        workspaceName={workspaceName}
        pendingCheckpoint={pendingCheckpoint}
        onCheckpointResolve={handleCheckpointResolve}
        onStop={handleStop}
        onBackToDesigner={() => setPhase("design")}
        startTime={executionStartTime}
      />
    );
  }

  // Phase: Design
  return (
    <div className="flex flex-col h-full">
      {/* Context bar */}
      <ContextBar
        name={name}
        onNameChange={setName}
        workspacePath={workspacePath}
        workspaceName={workspaceName}
        phase="design"
        isZh={isZh}
        onBackToSetup={() => setPhase("setup")}
        researchBrief={program.brief}
      />

      {/* Toolbar */}
      <PipelineToolbar
        name={name} onNameChange={setName}
        onLoadTemplate={handleLoadTemplate}
        onLoadSaved={handleLoadSaved}
        onAutoLayout={handleAutoLayout}
        onFitView={() => fitView({ padding: 0.2 })}
        onSave={handleSave} onRun={handleRun} onStop={handleStop}
        onResume={handleResume} canResume={canResume}
        onNew={handleNew} onDelete={handleNew}
        hasNodes={nodes.length > 0} isRunning={isRunning}
        isZh={isZh} saveStatus={saveStatus}
      />

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel (multi-tab) */}
        <LeftPanel
          locale={locale}
          workspacePath={workspacePath}
          nodes={overviewNodes}
          onNodeClick={handleNodeFocus}
          collapsed={leftPanelCollapsed}
          onToggleCollapse={() => setLeftPanelCollapsed((v) => !v)}
        />

        {/* React Flow canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect} onNodeClick={onNodeClick} onPaneClick={onPaneClick}
            onDragOver={onDragOver} onDrop={onDrop}
            nodeTypes={nodeTypes} fitView
            deleteKeyCode={["Backspace", "Delete"]}
            className="bg-background"
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls className="!bg-background !border !shadow-sm" />
            <MiniMap className="!bg-background !border" nodeColor={(n) => {
              const s = n.data?.status as string;
              if (s === "done") return "#22c55e";
              if (s === "running") return "#f59e0b";
              if (s === "error") return "#ef4444";
              if (s === "queued") return "#60a5fa";
              return "#a1a1aa";
            }} />
          </ReactFlow>
        </div>

        {/* Right panel: config or output */}
        {selectedNode && selectedNode.status === "done" ? (
          <NodeOutputPanel
            node={selectedNode}
            workspacePath={workspacePath}
            onClose={() => setSelectedNodeId(null)}
            isZh={isZh}
          />
        ) : selectedNode ? (
          <NodeConfigPanel
            node={selectedNode} onUpdate={onUpdateNode}
            onClose={() => setSelectedNodeId(null)} isZh={isZh}
          />
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported wrapper
// ---------------------------------------------------------------------------

export interface PipelineCanvasProps {
  locale: string;
  onBack: () => void;
}

export function PipelineCanvas(props: PipelineCanvasProps) {
  return (
    <ReactFlowProvider>
      <PipelineCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
