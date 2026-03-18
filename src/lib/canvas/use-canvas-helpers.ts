/**
 * Shared canvas helper utilities for React Flow canvases.
 */

import { useCallback } from "react";
import { useReactFlow, type Node } from "@xyflow/react";

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

/**
 * Extract a `{ [nodeId]: { x, y } }` position map from React Flow nodes.
 * Useful for persisting canvas layout.
 */
export function extractPositions(
  nodes: Node[],
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  for (const n of nodes) {
    positions[n.id] = { x: n.position.x, y: n.position.y };
  }
  return positions;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Provides common canvas helpers that depend on the React Flow instance.
 *
 * Must be called inside a `<ReactFlowProvider>`.
 */
export function useCanvasHelpers() {
  const { fitView } = useReactFlow();

  /**
   * Fit the viewport with a short delay so React Flow has time to reconcile
   * any pending node/edge updates before computing the bounding box.
   */
  const fitViewDelayed = useCallback(
    (padding = 0.2, delayMs = 100) => {
      setTimeout(() => fitView({ padding }), delayMs);
    },
    [fitView],
  );

  return { fitView, fitViewDelayed, extractPositions } as const;
}
