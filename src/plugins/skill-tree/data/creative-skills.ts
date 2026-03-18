/**
 * Skill Tree — Creative Skills
 *
 * Content creation: video, publishing, pixel art, UI design.
 */

import type { SkillTreeNode } from "../types";

export const CREATIVE_SKILLS: SkillTreeNode[] = [
  {
    id: "video-editing",
    name: "Video Editing",
    nameZh: "视频剪辑",
    description: "AI-assisted video editing and generation",
    descriptionZh: "AI 辅助视频剪辑和生成",
    category: "creative",
    defaultStatus: "planned",
    icon: "Film",
    implType: "planned",
    dependencies: ["claude-code"],
    tier: 4,
    tags: ["video", "content"],
  },
  {
    id: "content-publishing",
    name: "Content Publishing",
    nameZh: "内容发布",
    description: "Automated blog/social media content pipeline",
    descriptionZh: "自动化博客/社交媒体内容流水线",
    category: "creative",
    defaultStatus: "planned",
    icon: "Send",
    implType: "planned",
    dependencies: ["claude-code"],
    tier: 4,
    tags: ["content", "social"],
  },
  {
    id: "pixel-art",
    name: "Pixel Art",
    nameZh: "像素画",
    description: "Generate pixel art SVG illustrations",
    descriptionZh: "生成像素风格 SVG 插图",
    category: "creative",
    defaultStatus: "active",
    icon: "Image",
    implType: "skill",
    implDetail: "/pixel-art",
    dependencies: ["claude-code"],
    tier: 3,
    tags: ["art", "svg"],
  },
  {
    id: "ui-design",
    name: "UI/UX Design",
    nameZh: "UI/UX 设计",
    description: "Frontend design patterns and component creation",
    descriptionZh: "前端设计模式和组件创建",
    category: "creative",
    defaultStatus: "active",
    icon: "Palette",
    implType: "skill",
    implDetail: "/frontend-patterns",
    dependencies: ["claude-code", "nodejs"],
    tier: 3,
    tags: ["design", "frontend"],
  },
];
