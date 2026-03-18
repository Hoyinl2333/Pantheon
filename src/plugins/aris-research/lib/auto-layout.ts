/**
 * Auto-layout pipeline nodes using dagre.
 *
 * Delegates to the shared `applyDagreLayout` utility so dagre wiring lives
 * in one place.  This wrapper preserves the PipelineNode-typed API used by
 * pipeline-templates.ts and other ARIS-specific callers.
 */
import { applyDagreLayout } from "@/lib/canvas";
import type { Node } from "@xyflow/react";
import type { PipelineNode, PipelineEdge } from "../types";

const NODE_WIDTH = 240;
const NODE_HEIGHT = 80;

export function autoLayout(
  nodes: PipelineNode[],
  edges: PipelineEdge[],
  direction: "TB" | "LR" = "TB",
): PipelineNode[] {
  // Convert PipelineNode[] to minimal React Flow Node[] for the shared helper
  const flowNodes: Node[] = nodes.map((n) => ({
    id: n.id,
    position: n.position,
    data: {},
  }));
  const flowEdges = edges.map((e) => ({
    id: e.id ?? `${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
  }));

  const laid = applyDagreLayout(flowNodes, flowEdges, {
    rankdir: direction,
    ranksep: 80,
    nodesep: 50,
    nodeWidth: NODE_WIDTH,
    nodeHeight: NODE_HEIGHT,
  });

  // Map positions back onto the original PipelineNode objects
  const posMap = new Map(laid.map((n) => [n.id, n.position]));
  return nodes.map((node) => ({
    ...node,
    position: posMap.get(node.id) ?? node.position,
  }));
}

export { NODE_WIDTH, NODE_HEIGHT };
