"use client";

import { useMemo } from "react";
import type { PipelineNode, PipelineEdge } from "../types";
import { topologicalSort, STATUS_COLORS } from "./execution-helpers";

/** Mini DAG SVG showing pipeline structure with status colors */
export function MiniDAG({
  nodes,
  edges,
}: {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}) {
  const sortedNodes = useMemo(() => topologicalSort(nodes, edges), [nodes, edges]);

  // Layout: arrange nodes in rows based on topological layers
  const positions = useMemo(() => {
    const pos = new Map<string, { x: number; y: number }>();
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    for (const node of nodes) {
      inDegree.set(node.id, 0);
      adjacency.set(node.id, []);
    }
    for (const edge of edges) {
      const targets = adjacency.get(edge.source);
      if (targets) targets.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }

    // Assign layers via BFS
    const layers: string[][] = [];
    const layerOf = new Map<string, number>();
    const remaining = new Map(inDegree);
    let currentLayer: string[] = [];

    for (const [id, deg] of remaining) {
      if (deg === 0) currentLayer.push(id);
    }

    while (currentLayer.length > 0) {
      layers.push(currentLayer);
      for (const id of currentLayer) {
        layerOf.set(id, layers.length - 1);
      }
      const nextLayer: string[] = [];
      for (const id of currentLayer) {
        for (const target of adjacency.get(id) ?? []) {
          const newDeg = (remaining.get(target) ?? 1) - 1;
          remaining.set(target, newDeg);
          if (newDeg === 0) nextLayer.push(target);
        }
      }
      currentLayer = nextLayer;
    }

    // Assign any remaining disconnected nodes
    for (const node of nodes) {
      if (!layerOf.has(node.id)) {
        const newLayer = layers.length;
        layers.push([node.id]);
        layerOf.set(node.id, newLayer);
      }
    }

    const padding = 20;
    const layerHeight = layers.length > 1 ? (180 - 2 * padding) / (layers.length - 1) : 0;

    for (let li = 0; li < layers.length; li++) {
      const layer = layers[li];
      const layerWidth = layer.length > 1 ? (200 - 2 * padding) / (layer.length - 1) : 0;
      for (let ni = 0; ni < layer.length; ni++) {
        const x = layer.length === 1 ? 100 : padding + ni * layerWidth;
        const y = layers.length === 1 ? 90 : padding + li * layerHeight;
        pos.set(layer[ni], { x, y });
      }
    }

    return pos;
  }, [nodes, edges]);

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  return (
    <svg width="100%" viewBox="0 0 200 180" className="block">
      {/* Edges */}
      {edges.map((edge) => {
        const from = positions.get(edge.source);
        const to = positions.get(edge.target);
        if (!from || !to) return null;
        return (
          <line
            key={edge.id}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="#52525b"
            strokeWidth={1.5}
            strokeOpacity={0.5}
          />
        );
      })}
      {/* Nodes */}
      {sortedNodes.map((node) => {
        const p = positions.get(node.id);
        if (!p) return null;
        const color = STATUS_COLORS[node.status] ?? STATUS_COLORS.idle;
        return (
          <circle
            key={node.id}
            cx={p.x}
            cy={p.y}
            r={6}
            fill={color}
            stroke="#27272a"
            strokeWidth={1.5}
          />
        );
      })}
    </svg>
  );
}
