"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Lightbulb,
  FlaskConical,
  FileText,
  Search,
  Plus,
  Clock,
} from "lucide-react";
import type { Pipeline } from "../types";
import { PIPELINE_TEMPLATES } from "../pipeline-templates";
import { RESEARCH_SKILLS } from "../skill-data";
import { CATEGORY_DOT_COLORS, estimateTime } from "../lib/setup-helpers";

// ---------------------------------------------------------------------------
// Template icon mapping
// ---------------------------------------------------------------------------

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  "tpl-idea-discovery": <Lightbulb className="h-5 w-5" />,
  "tpl-research-pipeline": <FlaskConical className="h-5 w-5" />,
  "tpl-paper-writing": <FileText className="h-5 w-5" />,
  "tpl-auto-review": <Search className="h-5 w-5" />,
};

// ---------------------------------------------------------------------------
// Mini DAG Preview (SVG) — for template cards
// ---------------------------------------------------------------------------

interface MiniDagProps {
  nodes: Pipeline["nodes"];
  edges: Pipeline["edges"];
}

function MiniDag({ nodes, edges }: MiniDagProps) {
  const width = 160;
  const height = 60;
  const r = 5;

  // Build adjacency to compute simple topological layers
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of edges) {
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    adj.get(e.source)?.push(e.target);
  }

  // BFS layering
  const layers: string[][] = [];
  const visited = new Set<string>();
  let queue = nodes
    .filter((n) => (inDegree.get(n.id) ?? 0) === 0)
    .map((n) => n.id);
  while (queue.length > 0) {
    layers.push(queue);
    for (const id of queue) visited.add(id);
    const next: string[] = [];
    for (const id of queue) {
      for (const t of adj.get(id) ?? []) {
        if (!visited.has(t) && !next.includes(t)) {
          next.push(t);
        }
      }
    }
    queue = next;
    if (layers.length > 20) break; // safety
  }
  // Add any unvisited nodes
  const unvisited = nodes.filter((n) => !visited.has(n.id));
  if (unvisited.length > 0) {
    layers.push(unvisited.map((n) => n.id));
  }

  // Compute positions
  const positions = new Map<string, { x: number; y: number }>();
  const layerCount = layers.length;
  const padX = 14;
  const padY = 12;
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;

  for (let li = 0; li < layerCount; li++) {
    const layer = layers[li];
    const x =
      layerCount === 1
        ? width / 2
        : padX + (usableW * li) / (layerCount - 1);
    for (let ni = 0; ni < layer.length; ni++) {
      const y =
        layer.length === 1
          ? height / 2
          : padY + (usableH * ni) / (layer.length - 1);
      positions.set(layer[ni], { x, y });
    }
  }

  // Resolve category color per node
  const nodeColorMap = new Map<string, string>();
  for (const n of nodes) {
    const skill = RESEARCH_SKILLS.find((s) => s.id === n.skillId);
    const cat = skill?.category ?? "utility";
    nodeColorMap.set(n.id, CATEGORY_DOT_COLORS[cat]);
  }

  return (
    <svg width={width} height={height} className="block">
      {/* Edges */}
      {edges.map((e) => {
        const from = positions.get(e.source);
        const to = positions.get(e.target);
        if (!from || !to) return null;
        return (
          <line
            key={e.id}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="currentColor"
            strokeOpacity={0.2}
            strokeWidth={1.5}
          />
        );
      })}
      {/* Nodes */}
      {nodes.map((n) => {
        const pos = positions.get(n.id);
        if (!pos) return null;
        return (
          <circle
            key={n.id}
            cx={pos.x}
            cy={pos.y}
            r={r}
            fill={nodeColorMap.get(n.id) ?? "#6b7280"}
            opacity={0.85}
          />
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Template Gallery
// ---------------------------------------------------------------------------

export interface TemplateGalleryProps {
  isZh: boolean;
  selectedTemplateId: string | null;
  onSelectTemplate: (id: string | null) => void;
}

export function TemplateGallery({
  isZh,
  selectedTemplateId,
  onSelectTemplate,
}: TemplateGalleryProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">
        {isZh ? "选择起点" : "Choose Starting Point"}
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {/* From Scratch card */}
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedTemplateId === null
              ? "ring-2 ring-primary shadow-md"
              : "hover:border-primary/40"
          }`}
          onClick={() => onSelectTemplate(null)}
        >
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                <Plus className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight">
                  {isZh ? "空白开始" : "From Scratch"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-xs text-muted-foreground mb-2">
              {isZh
                ? "从空白画布开始，自由拖拽技能节点"
                : "Start with an empty canvas, drag and drop skill nodes"}
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                0 {isZh ? "节点" : "nodes"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Template cards */}
        {PIPELINE_TEMPLATES.map((tpl) => {
          const isSelected = selectedTemplateId === tpl.id;
          return (
            <Card
              key={tpl.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected
                  ? "ring-2 ring-primary shadow-md"
                  : "hover:border-primary/40"
              }`}
              onClick={() => onSelectTemplate(tpl.id)}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                    {TEMPLATE_ICONS[tpl.id] ?? (
                      <FlaskConical className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">
                      {isZh ? tpl.nameZh : tpl.name}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                  {isZh ? tpl.descriptionZh : tpl.description}
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0"
                  >
                    {tpl.nodes.length} {isZh ? "节点" : "nodes"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0"
                  >
                    <Clock className="h-2.5 w-2.5 mr-0.5" />
                    {estimateTime(tpl.nodes.length, isZh)}
                  </Badge>
                </div>
                {/* Mini DAG preview */}
                <div className="rounded bg-muted/50 overflow-hidden">
                  <MiniDag nodes={tpl.nodes} edges={tpl.edges} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
