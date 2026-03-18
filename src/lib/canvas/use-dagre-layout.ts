/**
 * Shared dagre auto-layout hook for React Flow canvases.
 *
 * Both Workflow Studio (team-canvas) and ARIS (pipeline-canvas) use identical
 * dagre layout logic.  This hook centralises it so changes propagate to both.
 */

import { useCallback } from "react";
import dagre from "dagre";
import type { Node, Edge } from "@xyflow/react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DagreLayoutOptions {
  /** Layout direction (default "TB") */
  rankdir?: "TB" | "LR" | "BT" | "RL";
  /** Vertical separation between ranks (default 80) */
  ranksep?: number;
  /** Horizontal separation between nodes (default 60) */
  nodesep?: number;
  /** Width used by dagre for each node (default 260) */
  nodeWidth?: number;
  /** Height used by dagre for each node (default 120) */
  nodeHeight?: number;
}

// ---------------------------------------------------------------------------
// Pure function (can be used without React)
// ---------------------------------------------------------------------------

/**
 * Apply dagre auto-layout to a set of React Flow nodes + edges and return
 * new node objects with updated positions.  The original arrays are NOT
 * mutated.
 */
export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  options: DagreLayoutOptions = {},
): Node[] {
  if (nodes.length === 0) return nodes;

  const {
    rankdir = "TB",
    ranksep = 80,
    nodesep = 60,
    nodeWidth = 260,
    nodeHeight = 120,
  } = options;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir, ranksep, nodesep });

  for (const node of nodes) {
    g.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - nodeWidth / 2,
        y: pos.y - nodeHeight / 2,
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns a stable `autoLayout` callback that applies dagre layout to the
 * given nodes/edges with the provided default options.
 *
 * Usage:
 * ```ts
 * const autoLayout = useDagreLayout({ nodeWidth: 240, nodeHeight: 80 });
 * const laidOut = autoLayout(nodes, edges);
 * ```
 */
export function useDagreLayout(defaults: DagreLayoutOptions = {}) {
  return useCallback(
    (nodes: Node[], edges: Edge[], overrides?: DagreLayoutOptions): Node[] =>
      applyDagreLayout(nodes, edges, { ...defaults, ...overrides }),
    // defaults is an object — but consumers should pass a stable reference
    // (e.g. a module-level constant).  We intentionally spread here so callers
    // don't need to memoise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [defaults.rankdir, defaults.ranksep, defaults.nodesep, defaults.nodeWidth, defaults.nodeHeight],
  );
}
