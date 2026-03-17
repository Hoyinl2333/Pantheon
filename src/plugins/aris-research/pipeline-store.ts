/**
 * Pipeline persistence — file-based via API
 */
import type { Pipeline } from "./types";

const API = "/api/plugins/aris-research/store";

interface PipelinesData {
  items: Pipeline[];
  activePipelineId: string | null;
}

const EMPTY: PipelinesData = { items: [], activePipelineId: null };

async function readAll(): Promise<PipelinesData> {
  try {
    const res = await fetch(`${API}?key=pipelines`);
    const envelope = await res.json();
    return envelope.data ?? EMPTY;
  } catch {
    return EMPTY;
  }
}

async function writeAll(data: PipelinesData): Promise<void> {
  try {
    await fetch(API, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "pipelines", data }),
    });
  } catch {
    // silent fail
  }
}

export async function getPipelines(): Promise<Pipeline[]> {
  return (await readAll()).items;
}

export async function getPipeline(id: string): Promise<Pipeline | null> {
  const all = await readAll();
  return all.items.find((p) => p.id === id) ?? null;
}

export async function savePipeline(pipeline: Pipeline): Promise<void> {
  const all = await readAll();
  const updated = { ...pipeline, updatedAt: new Date().toISOString() };
  const idx = all.items.findIndex((p) => p.id === pipeline.id);
  const next = idx >= 0
    ? { ...all, items: all.items.map((p, i) => i === idx ? updated : p) }
    : { ...all, items: [updated, ...all.items] };
  await writeAll(next);
}

export async function deletePipeline(id: string): Promise<void> {
  const all = await readAll();
  await writeAll({
    items: all.items.filter((p) => p.id !== id),
    activePipelineId: all.activePipelineId === id ? null : all.activePipelineId,
  });
}

export async function getActivePipelineId(): Promise<string | null> {
  return (await readAll()).activePipelineId;
}

export async function setActivePipelineId(id: string | null): Promise<void> {
  const all = await readAll();
  await writeAll({ ...all, activePipelineId: id });
}

// Sync fallback for toolbar (reads cached)
let _cachedPipelines: Pipeline[] = [];
export function getPipelinesSync(): Pipeline[] {
  // Fire-and-forget fetch to update cache
  getPipelines().then((p) => { _cachedPipelines = p; });
  return _cachedPipelines;
}
