/**
 * Skill Tree Data — Barrel Export
 *
 * Re-exports all category skill arrays and combines them into the
 * same public API as the original monolithic skill-tree-data.ts.
 */

export { CATEGORIES } from "./categories";

export { FOUNDATION_SKILLS } from "./foundation-skills";
export { CODING_SKILLS } from "./coding-skills";
export { RESEARCH_SKILLS } from "./research-skills";
export { MANAGEMENT_SKILLS } from "./management-skills";
export { CREATIVE_SKILLS } from "./creative-skills";
export { INTEGRATION_SKILLS } from "./integration-skills";
export { ADVANCED_SKILLS } from "./advanced-skills";
export { OTHER_SKILLS } from "./other-skills";

import { FOUNDATION_SKILLS } from "./foundation-skills";
import { CODING_SKILLS } from "./coding-skills";
import { RESEARCH_SKILLS } from "./research-skills";
import { MANAGEMENT_SKILLS } from "./management-skills";
import { CREATIVE_SKILLS } from "./creative-skills";
import { INTEGRATION_SKILLS } from "./integration-skills";
import { ADVANCED_SKILLS } from "./advanced-skills";
import { OTHER_SKILLS } from "./other-skills";

/** All skill nodes combined — same shape as the original SKILL_TREE_NODES */
export const SKILL_TREE_NODES = [
  ...FOUNDATION_SKILLS,
  ...CODING_SKILLS,
  ...RESEARCH_SKILLS,
  ...MANAGEMENT_SKILLS,
  ...CREATIVE_SKILLS,
  ...INTEGRATION_SKILLS,
  ...ADVANCED_SKILLS,
  ...OTHER_SKILLS,
] as const;
