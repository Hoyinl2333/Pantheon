/**
 * SAGE Config & State — file-based persistence via API
 */
import type { ArisConfig, ResearchState } from "./types";

const API = "/api/plugins/aris-research/store";

const DEFAULT_CONFIG: ArisConfig = {
  reviewerModel: "claude-sonnet-4-6",
  reviewerProvider: "codex-mcp",
  autoProceed: false,
  humanCheckpoint: true,
  maxRounds: 4,
  pilotMaxHours: 2,
  maxTotalGpuHours: 24,
  venue: "ICLR",
};

const DEFAULT_STATE: ResearchState = {
  currentWorkflow: null,
  currentRound: 0,
  maxRounds: 4,
  score: null,
  status: "idle",
  startedAt: null,
  lastUpdate: null,
  outputs: [],
};

// --- Async API-based functions ---

export async function getArisConfig(): Promise<ArisConfig> {
  try {
    const res = await fetch(`${API}?key=config`);
    const envelope = await res.json();
    return envelope.data ? { ...DEFAULT_CONFIG, ...envelope.data } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function setArisConfig(config: ArisConfig): Promise<void> {
  try {
    await fetch(API, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "config", data: config }),
    });
  } catch {
    // silent fail
  }
}

export async function getResearchState(): Promise<ResearchState> {
  try {
    const res = await fetch(`${API}?key=research-state`);
    const envelope = await res.json();
    return envelope.data ? { ...DEFAULT_STATE, ...envelope.data } : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

export async function setResearchState(state: Partial<ResearchState>): Promise<void> {
  try {
    const current = await getResearchState();
    const next = { ...current, ...state, lastUpdate: new Date().toISOString() };
    await fetch(API, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "research-state", data: next }),
    });
  } catch {
    // silent fail
  }
}

export async function resetResearchState(): Promise<void> {
  await setResearchState(DEFAULT_STATE);
}

// --- Sync fallbacks for SSR/initial render ---

export function getArisConfigSync(): ArisConfig {
  return DEFAULT_CONFIG;
}

export function getResearchStateSync(): ResearchState {
  return DEFAULT_STATE;
}
