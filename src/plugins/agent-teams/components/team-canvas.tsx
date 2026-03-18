"use client";

import {
  useState, useCallback, useRef, useMemo, useEffect,
  type DragEvent,
} from "react";
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

import { Button } from "@/components/ui/button";
import { applyDagreLayout, extractPositions } from "@/lib/canvas";
import { LayoutGrid, Maximize2, Save, Play, RotateCcw } from "lucide-react";

import type { AgentTeam, TeamMember } from "../types";
import * as store from "../team-store";
import { AgentNode, type AgentNodeData, type AgentNodeStatus } from "./agent-node";
import { MemberPalette } from "./member-palette";
import { ExecutionPanel, type ExecutionNodeStatus } from "./execution-panel";
import { NodeContextMenu, type ContextMenuAction } from "./node-context-menu";
import { TeamExecutor, type TeamExecutorOptions } from "../lib/team-executor";
import type { ExecutionEvent } from "@/lib/execution";

// ---- Node types (OUTSIDE component for React Flow perf) ----
// NOTE: DecisionNode and AggregatorNode exist in ./decision-node.tsx and
// ./aggregator-node.tsx but are not yet wired to execution logic, so they
// are excluded from the active nodeTypes to avoid confusing users.
const nodeTypes = {
  agent: AgentNode,
};

// ---- Layout constants ----
const AGENT_NODE_WIDTH = 260;
const AGENT_NODE_HEIGHT = 120;

// ---- Helpers ----
function getEdgeStyle(type?: string): { strokeWidth: number; stroke?: string; strokeDasharray?: string } {
  switch (type) {
    case "control":
      return { strokeWidth: 2, stroke: "#f59e0b", strokeDasharray: "5,5" }; // amber, dashed
    case "review":
      return { strokeWidth: 2, stroke: "#8b5cf6", strokeDasharray: "3,3" }; // purple, dotted
    default: // "data"
      return { strokeWidth: 2, stroke: "#60a5fa" }; // blue, solid
  }
}

function generateMemberId(): string {
  return `member-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Convert team members into React Flow nodes */
function membersToNodes(
  members: TeamMember[],
  positions: Record<string, { x: number; y: number }> | undefined,
  isZh: boolean,
): Node[] {
  return members.map((m) => ({
    id: m.id,
    type: "agent",
    position: positions?.[m.id] ?? { x: 0, y: 0 },
    data: {
      memberId: m.id,
      name: m.name,
      role: m.role,
      provider: m.provider,
      model: m.model,
      status: "idle" as AgentNodeStatus,
      tokens: undefined,
      isZh,
    } satisfies AgentNodeData,
  }));
}

/** Build edges from hierarchical parentId relationships */
function membersToEdges(members: TeamMember[]): Edge[] {
  const edges: Edge[] = [];
  for (const m of members) {
    if (m.parentId) {
      edges.push({
        id: `e-${m.parentId}-${m.id}`,
        source: m.parentId,
        target: m.id,
        style: getEdgeStyle("data"),
        data: { type: "data" },
      });
    }
  }
  // For sequential: chain by order
  if (edges.length === 0 && members.length > 1) {
    const sorted = [...members].sort((a, b) => a.order - b.order);
    for (let i = 0; i < sorted.length - 1; i++) {
      edges.push({
        id: `e-${sorted[i].id}-${sorted[i + 1].id}`,
        source: sorted[i].id,
        target: sorted[i + 1].id,
        style: getEdgeStyle("data"),
        data: { type: "data" },
      });
    }
  }
  return edges;
}

/** dagre layout options matching the original inline constants */
const DAGRE_OPTIONS = {
  rankdir: "TB" as const,
  ranksep: 80,
  nodesep: 60,
  nodeWidth: AGENT_NODE_WIDTH,
  nodeHeight: AGENT_NODE_HEIGHT,
};

// ---- Canvas Inner ----
interface TeamCanvasInnerProps {
  team: AgentTeam;
  onTeamUpdate: (team: AgentTeam) => void;
  locale: string;
}

function TeamCanvasInner({ team, onTeamUpdate, locale }: TeamCanvasInnerProps) {
  const isZh = locale === "zh-CN";
  const { screenToFlowPosition, fitView } = useReactFlow();

  // Initialize nodes/edges from team data
  const [initialized, setInitialized] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
    nodeName: string;
  } | null>(null);
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [nodeStatuses, setNodeStatuses] = useState<ExecutionNodeStatus[]>([]);
  const [nodeOutputs, setNodeOutputs] = useState<Record<string, string>>({});
  const [totalTokens, setTotalTokens] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [promptInput, setPromptInput] = useState("");
  const [showPromptInput, setShowPromptInput] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const executorRef = useRef<TeamExecutor | null>(null);

  // Initialize from team
  useEffect(() => {
    if (initialized) return;

    // Convert TeamMemberNode[] to Record for membersToNodes
    const savedPositions: Record<string, { x: number; y: number }> | undefined =
      team.canvas?.memberPositions && team.canvas.memberPositions.length > 0
        ? Object.fromEntries(
            team.canvas.memberPositions.map((n) => [n.memberId, n.position])
          )
        : undefined;

    const initialNodes = membersToNodes(team.members, savedPositions, isZh);

    // Restore saved edges or generate from member relationships
    const initialEdges = team.canvas?.edges && team.canvas.edges.length > 0
      ? team.canvas.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
          type: "default",
          style: getEdgeStyle(e.type),
          data: { type: e.type },
        }))
      : membersToEdges(team.members);

    if (savedPositions && Object.keys(savedPositions).length > 0) {
      setNodes(initialNodes);
      setEdges(initialEdges);
    } else {
      // Auto-layout
      const laid = applyDagreLayout(initialNodes, initialEdges, DAGRE_OPTIONS);
      setNodes(laid);
      setEdges(initialEdges);
    }

    setInitialized(true);
    setTimeout(() => fitView({ padding: 0.2 }), 150);
  }, [team, isZh, initialized, setNodes, setEdges, fitView]);

  // ---- Handlers ----
  const onConnect: OnConnect = useCallback(
    (conn: Connection) => setEdges((eds) => addEdge({
      ...conn,
      style: getEdgeStyle("data"),
      data: { type: "data" },
    }, eds)),
    [setEdges],
  );

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    const types = ["data", "control", "review"] as const;
    const currentType = (edge.data?.type as string) ?? "data";
    const idx = types.indexOf(currentType as typeof types[number]);
    const nextType = types[(idx + 1) % types.length];
    setEdges((eds) => eds.map((e) =>
      e.id === edge.id
        ? { ...e, style: getEdgeStyle(nextType), data: { ...e.data, type: nextType }, label: e.label && !types.includes(e.label as typeof types[number]) ? e.label : nextType }
        : e
    ));
  }, [setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setContextMenu(null);
  }, []);

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault();
    e.stopPropagation();
    const data = node.data as AgentNodeData;
    const MENU_W = 170, MENU_H = 120;
    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - MENU_W),
      y: Math.min(e.clientY, window.innerHeight - MENU_H),
      nodeId: node.id,
      nodeName: data.name ?? "Agent",
    });
  }, []);

  const handleContextAction = useCallback((action: ContextMenuAction) => {
    if (action.type === "delete") {
      setNodes((nds) => nds.filter((n) => n.id !== action.nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== action.nodeId && e.target !== action.nodeId));
    } else if (action.type === "duplicate") {
      setNodes((nds) => {
        const sourceNode = nds.find((n) => n.id === action.nodeId);
        if (!sourceNode) return nds;
        const d = sourceNode.data as AgentNodeData;
        const newId = `member-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        return [...nds, {
          id: newId,
          type: "agent",
          position: { x: sourceNode.position.x + 30, y: sourceNode.position.y + 30 },
          data: { ...d, memberId: newId, name: `${d.name} (copy)` } satisfies AgentNodeData,
        }];
      });
    } else if (action.type === "edit") {
      setSelectedNodeId(action.nodeId);
    }
    setContextMenu(null);
  }, [setNodes, setEdges]);

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/agent-team-template");
    if (!raw) return;

    let tpl: { id: string; name: string; nameZh: string; role: string; roleZh: string; provider: string; model: string; category: string };
    try {
      tpl = JSON.parse(raw);
    } catch {
      return;
    }

    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });

    // Skip utility nodes (decision/aggregator) — not yet wired to execution
    if (tpl.category === "utilities") return;

    // Agent node
    const memberId = generateMemberId();
    setNodes((nds) => [...nds, {
      id: memberId,
      type: "agent",
      position,
      data: {
        memberId,
        name: isZh ? tpl.nameZh : tpl.name,
        role: isZh ? tpl.roleZh ?? tpl.role : tpl.role,
        provider: tpl.provider,
        model: tpl.model,
        status: "idle" as AgentNodeStatus,
        tokens: undefined,
        isZh,
      } satisfies AgentNodeData,
    }]);
  }, [screenToFlowPosition, setNodes, isZh]);

  const handleAutoLayout = useCallback(() => {
    const laid = applyDagreLayout(nodes, edges, DAGRE_OPTIONS);
    setNodes(laid);
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  }, [nodes, edges, setNodes, fitView]);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2 });
  }, [fitView]);

  const handleSave = useCallback(() => {
    // Extract positions and sync members back to team
    const positions = extractPositions(nodes);

    // Build updated members from agent nodes
    const agentNodes = nodes.filter((n) => n.type === "agent");
    const updatedMembers: TeamMember[] = agentNodes.map((n, idx) => {
      const d = n.data as AgentNodeData;
      // Find existing member to preserve fields
      const existing = team.members.find((m) => m.id === d.memberId);
      return {
        id: d.memberId,
        name: d.name ?? "Agent",
        role: d.role ?? "Member",
        description: existing?.description ?? "",
        provider: (d.provider ?? "claude") as TeamMember["provider"],
        model: d.model ?? "claude-sonnet-4-5",
        systemPrompt: existing?.systemPrompt ?? "",
        tools: existing?.tools,
        order: idx,
        parentId: existing?.parentId,
        tier: existing?.tier ?? 1,
      };
    });

    const updatedTeam: AgentTeam = {
      ...team,
      members: updatedMembers,
      canvas: {
        memberPositions: Object.entries(positions).map(([memberId, pos]) => ({
          memberId,
          position: pos,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: (e.data?.type as "data" | "control" | "review") ?? "data",
          label: e.label as string | undefined,
        })),
      },
      updated_at: new Date().toISOString(),
    };

    store.updateTeam(team.id, updatedTeam);
    onTeamUpdate(updatedTeam);
  }, [nodes, edges, team, onTeamUpdate]);

  // ---- Execution ----
  const handleRunWithPrompt = useCallback((prompt: string) => {
    if (!prompt.trim()) return;
    setShowPromptInput(false);
    setIsRunning(true);
    setExecutionLogs([]);
    setNodeOutputs({});
    setTotalTokens(0);
    setElapsedMs(0);
    startTimeRef.current = Date.now();

    // Initialize node statuses
    const agentNodes = nodes.filter((n) => n.type === "agent");
    const statuses: ExecutionNodeStatus[] = agentNodes.map((n) => ({
      nodeId: n.id,
      name: (n.data as AgentNodeData).name ?? "Agent",
      status: "queued" as AgentNodeStatus,
    }));
    setNodeStatuses(statuses);

    // Update node visuals to queued
    setNodes((nds) => nds.map((n) =>
      n.type === "agent" ? { ...n, data: { ...n.data, status: "queued" } } : n
    ));

    // Timer
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 500);

    // Build edges from current canvas
    const canvasEdges = edges
      .filter((e) => {
        const src = nodes.find((n) => n.id === e.source);
        const tgt = nodes.find((n) => n.id === e.target);
        return src?.type === "agent" && tgt?.type === "agent";
      })
      .map((e) => ({ id: e.id, source: e.source, target: e.target }));

    // Create execution listener
    const listener = (event: ExecutionEvent) => {
      if (event.type === "node-status" && event.nodeId && event.status) {
        const status = event.status as AgentNodeStatus;
        setNodes((nds) => nds.map((n) =>
          n.id === event.nodeId ? { ...n, data: { ...n.data, status } } : n
        ));
        setEdges((eds) => eds.map((e) =>
          e.source === event.nodeId || e.target === event.nodeId
            ? { ...e, animated: status === "running" }
            : e
        ));
        setNodeStatuses((prev) => prev.map((ns) =>
          ns.nodeId === event.nodeId ? { ...ns, status } : ns
        ));
      }
      if (event.type === "log" && event.message) {
        setExecutionLogs((prev) => [
          ...prev.slice(-200),
          `[${new Date().toLocaleTimeString()}] ${event.message}`,
        ]);
      }
      if (event.type === "pipeline-done" || event.type === "pipeline-error") {
        setIsRunning(false);
        if (timerRef.current) clearInterval(timerRef.current);
        setExecutionLogs((prev) => [...prev, `\n=== ${event.message} ===`]);
      }
    };

    const executor = new TeamExecutor(team, canvasEdges, listener, {
      prompt,
      team,
      edges: canvasEdges,
      maxParallel: team.workflow === "parallel" ? agentNodes.length : 1,
    });
    executorRef.current = executor;

    executor.runPipeline()
      .then((run) => {
        setTotalTokens(run.totalTokens ?? 0);
        if (run.nodeOutputs) {
          setNodeOutputs(run.nodeOutputs);
        }
      })
      .catch((err) => {
        console.error("[TeamCanvas] runPipeline failed:", err);
        setIsRunning(false);
        if (timerRef.current) clearInterval(timerRef.current);
        setExecutionLogs((prev) => [
          ...prev,
          `\n=== Error: ${err instanceof Error ? err.message : String(err)} ===`,
        ]);
      });
  }, [nodes, edges, team, setNodes, setEdges]);

  const handleRun = useCallback(() => {
    setShowPromptInput(true);
  }, []);

  const handleStop = useCallback(() => {
    executorRef.current?.abort();
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setExecutionLogs((prev) => [...prev, `\n=== Execution stopped ===`]);
    // Reset running nodes to idle
    setNodes((nds) => nds.map((n) =>
      n.type === "agent" && (n.data as AgentNodeData).status === "running"
        ? { ...n, data: { ...n.data, status: "idle" } }
        : n
    ));
  }, [setNodes]);

  const handleReset = useCallback(() => {
    setNodes((nds) => nds.map((n) =>
      n.type === "agent"
        ? { ...n, data: { ...n.data, status: "idle", tokens: undefined } }
        : n
    ));
    setEdges((eds) => eds.map((e) => ({ ...e, animated: false })));
    setExecutionLogs([]);
    setNodeStatuses([]);
    setNodeOutputs({});
    setTotalTokens(0);
    setElapsedMs(0);
  }, [setNodes, setEdges]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate max-w-[200px]">
            {team.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {nodes.filter((n) => n.type === "agent").length} {isZh ? "个成员" : "members"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={handleAutoLayout}
            title={isZh ? "自动布局" : "Auto Layout"}
          >
            <LayoutGrid className="h-3.5 w-3.5 mr-1" />
            {isZh ? "布局" : "Layout"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={handleFitView}
            title={isZh ? "适应视图" : "Fit View"}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={handleReset}
            title={isZh ? "重置状态" : "Reset"}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-5 bg-border mx-0.5" />
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={handleSave}
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            {isZh ? "保存" : "Save"}
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs px-2"
            onClick={handleRun}
            disabled={isRunning || nodes.filter((n) => n.type === "agent").length === 0}
          >
            <Play className="h-3.5 w-3.5 mr-1" />
            {isZh ? "运行" : "Run"}
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Palette (hidden on small screens via CSS) */}
        <div className="hidden md:block">
          <MemberPalette
            locale={locale}
            collapsed={paletteCollapsed}
            onToggle={() => setPaletteCollapsed(!paletteCollapsed)}
          />
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onNodeContextMenu={onNodeContextMenu}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode={["Backspace", "Delete"]}
            className="bg-background"
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls className="!bg-background !border !shadow-sm" />
            <MiniMap
              className="!bg-background !border"
              nodeColor={(n) => {
                const s = n.data?.status as string;
                if (s === "done") return "#22c55e";
                if (s === "running") return "#f59e0b";
                if (s === "error") return "#ef4444";
                if (s === "queued") return "#60a5fa";
                return "#a1a1aa";
              }}
            />
          </ReactFlow>
          {/* Edge type legend */}
          {edges.length > 0 && (
            <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm border rounded-md px-2.5 py-1.5 text-[10px] flex items-center gap-3 shadow-sm pointer-events-none z-10">
              <div className="flex items-center gap-1">
                <svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke="#60a5fa" strokeWidth="2" /></svg>
                <span className="text-muted-foreground">data</span>
              </div>
              <div className="flex items-center gap-1">
                <svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5,5" /></svg>
                <span className="text-muted-foreground">control</span>
              </div>
              <div className="flex items-center gap-1">
                <svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="3,3" /></svg>
                <span className="text-muted-foreground">review</span>
              </div>
            </div>
          )}
          {contextMenu && (
            <NodeContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              nodeId={contextMenu.nodeId}
              nodeName={contextMenu.nodeName}
              onAction={handleContextAction}
              onClose={() => setContextMenu(null)}
              isZh={isZh}
            />
          )}
        </div>
      </div>

      {/* Prompt input bar */}
      {showPromptInput && (
        <div className="border-t bg-background px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              className="flex-1 h-8 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder={isZh ? "输入任务指令给工作流工作室..." : "Enter the task prompt for the workflow studio..."}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && promptInput.trim()) {
                  handleRunWithPrompt(promptInput);
                }
                if (e.key === "Escape") {
                  setShowPromptInput(false);
                }
              }}
              autoFocus
            />
            <Button
              size="sm"
              className="h-8 px-3"
              onClick={() => handleRunWithPrompt(promptInput)}
              disabled={!promptInput.trim()}
            >
              <Play className="h-3.5 w-3.5 mr-1" />
              {isZh ? "执行" : "Execute"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2"
              onClick={() => setShowPromptInput(false)}
            >
              {isZh ? "取消" : "Cancel"}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {isZh
              ? `${team.workflow === "parallel" ? "并行" : team.workflow === "hierarchical" ? "层级" : "顺序"}执行 ${nodes.filter((n) => n.type === "agent").length} 个 Agent`
              : `${team.workflow} execution with ${nodes.filter((n) => n.type === "agent").length} agents`}
          </p>
        </div>
      )}

      {/* Execution panel */}
      <ExecutionPanel
        isRunning={isRunning}
        logs={executionLogs}
        nodeStatuses={nodeStatuses}
        nodeOutputs={nodeOutputs}
        totalTokens={totalTokens}
        elapsedMs={elapsedMs}
        onStop={handleStop}
        isZh={isZh}
      />
    </div>
  );
}

// ---- Exported component with ReactFlowProvider ----
export interface TeamCanvasProps {
  team: AgentTeam;
  onTeamUpdate: (team: AgentTeam) => void;
  locale: string;
}

export function TeamCanvas(props: TeamCanvasProps) {
  return (
    <ReactFlowProvider>
      <TeamCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
