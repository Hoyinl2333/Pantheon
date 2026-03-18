/**
 * Stage-Skill Sync
 *
 * Maps completed pipeline node skills to research stage statuses.
 * When skills in a stage complete, the stage status auto-updates:
 *   - ALL required (non-optional) skills done => "done"
 *   - SOME skills done => "in-progress"
 *   - No skills done => unchanged
 *
 * Works for both stage pipeline and custom pipeline modes.
 */
import type { PipelineNode } from "../types";
import type { StageStatus, ResearchStage } from "../research-stages";
import { RESEARCH_STAGES } from "../research-stages";
import { getStageData, saveStageData } from "../stage-store";

/** Build a map from skillId -> stageId */
function buildSkillToStageMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const stage of RESEARCH_STAGES) {
    for (const ref of stage.skills) {
      // A skill may appear in multiple stages (e.g. idea-discovery in stage 1+2).
      // Map to the first (primary) stage only if not already mapped.
      if (!map.has(ref.skillId)) {
        map.set(ref.skillId, stage.id);
      }
    }
  }
  return map;
}

/** Get the required (non-optional, non-workflow) skill IDs for a stage */
function getRequiredSkillIds(stage: ResearchStage): string[] {
  // For stage completion: if the stage has a workflow skill and it's done, that covers the whole stage.
  // Otherwise, all non-optional skills must be done.
  return stage.skills
    .filter((ref) => !ref.optional)
    .map((ref) => ref.skillId);
}

export interface StageSyncResult {
  stageId: string;
  newStatus: StageStatus;
}

/**
 * Compute stage status updates based on completed/running pipeline nodes.
 *
 * @param nodes - All pipeline nodes
 * @param completedNodeIds - Set of node IDs that have completed
 * @param runningNodeIds - Set of node IDs currently running
 * @returns Array of stage status changes to apply
 */
export function computeStageStatuses(
  nodes: readonly PipelineNode[],
  completedNodeIds: ReadonlySet<string>,
  runningNodeIds: ReadonlySet<string>,
): StageSyncResult[] {
  const skillToStage = buildSkillToStageMap();

  // Group completed/running skill IDs by stage
  const stageCompletedSkills = new Map<string, Set<string>>();
  const stageActiveSkills = new Map<string, Set<string>>();

  for (const node of nodes) {
    const stageId = skillToStage.get(node.skillId);
    if (!stageId) continue;

    if (completedNodeIds.has(node.id)) {
      if (!stageCompletedSkills.has(stageId)) stageCompletedSkills.set(stageId, new Set());
      stageCompletedSkills.get(stageId)!.add(node.skillId);
    }
    if (runningNodeIds.has(node.id)) {
      if (!stageActiveSkills.has(stageId)) stageActiveSkills.set(stageId, new Set());
      stageActiveSkills.get(stageId)!.add(node.skillId);
    }
  }

  const results: StageSyncResult[] = [];

  for (const stage of RESEARCH_STAGES) {
    const completed = stageCompletedSkills.get(stage.id);
    const active = stageActiveSkills.get(stage.id);
    if (!completed && !active) continue;

    const requiredSkills = getRequiredSkillIds(stage);
    const completedSet = completed ?? new Set<string>();

    // Check if a workflow skill covers the entire stage
    const workflowSkills = stage.skills.filter((ref) => ref.isWorkflow);
    const workflowDone = workflowSkills.some((ref) => completedSet.has(ref.skillId));

    // All required skills done, or workflow skill done => stage is done
    const allRequiredDone = workflowDone || requiredSkills.every((sid) => completedSet.has(sid));

    if (allRequiredDone) {
      results.push({ stageId: stage.id, newStatus: "done" });
    } else if (completedSet.size > 0 || (active && active.size > 0)) {
      results.push({ stageId: stage.id, newStatus: "in-progress" });
    }
  }

  return results;
}

/**
 * Persist stage status updates to the stage store.
 * Non-blocking: errors are silently ignored.
 */
export async function syncStageStatuses(updates: StageSyncResult[]): Promise<void> {
  if (updates.length === 0) return;

  try {
    const allData = await getStageData();
    let changed = false;

    for (const { stageId, newStatus } of updates) {
      const current = allData[stageId];
      if (!current) continue;
      // Only update if status actually changes (don't downgrade "done" to "in-progress")
      if (current.status === newStatus) continue;
      if (current.status === "done" && newStatus === "in-progress") continue;

      allData[stageId] = { ...current, status: newStatus };
      changed = true;
    }

    if (changed) {
      await saveStageData(allData);
    }
  } catch {
    // Non-critical — don't fail pipeline for stage sync
  }
}
