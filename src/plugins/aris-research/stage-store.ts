/**
 * Stage data persistence — file-based via API
 */
import type { StageData } from "./types";
import { RESEARCH_STAGES } from "./research-stages";

const API = "/api/plugins/aris-research/store";

export type StageDataMap = Record<string, StageData>;

function defaultStageData(): StageDataMap {
  const init: StageDataMap = {};
  for (const stage of RESEARCH_STAGES) {
    init[stage.id] = { status: "available", inputs: {}, attachments: [], notes: "" };
  }
  return init;
}

export async function getStageData(): Promise<StageDataMap> {
  try {
    const res = await fetch(`${API}?key=stage-data`);
    const envelope = await res.json();
    if (envelope.data) {
      // Merge with defaults to handle new stages added later
      const defaults = defaultStageData();
      return { ...defaults, ...envelope.data };
    }
    return defaultStageData();
  } catch {
    return defaultStageData();
  }
}

export async function saveStageData(data: StageDataMap): Promise<void> {
  try {
    // Add updatedAt to each stage
    const withTimestamps: StageDataMap = {};
    for (const [k, v] of Object.entries(data)) {
      withTimestamps[k] = { ...v, updatedAt: new Date().toISOString() };
    }
    await fetch(API, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "stage-data", data: withTimestamps }),
    });
  } catch {
    // silent fail
  }
}

export async function updateStage(stageId: string, patch: Partial<StageData>): Promise<void> {
  const all = await getStageData();
  const current = all[stageId] ?? { status: "available", inputs: {}, attachments: [], notes: "" };
  const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await saveStageData({ ...all, [stageId]: updated });
}

export { defaultStageData };
