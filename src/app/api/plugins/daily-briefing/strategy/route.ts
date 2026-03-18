/**
 * Daily Briefing - Strategy Route
 *
 * POST /api/plugins/daily-briefing/strategy
 * Generates a search strategy from a user description.
 *
 * For now: simple keyword extraction + heuristic source recommendation.
 * Future: call Claude for intelligent strategy generation.
 */

import { NextRequest, NextResponse } from "next/server";
import type { SearchStrategy, SourceConfig, FilterRule } from "@/plugins/daily-briefing/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const description: string = (body.description ?? "").trim();

    if (!description) {
      return NextResponse.json(
        { error: "description is required" },
        { status: 400 },
      );
    }

    const strategy = generateStrategy(description);
    return NextResponse.json({ strategy });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Simple heuristic strategy generator.
 * Extracts keywords from description, suggests sources based on content.
 */
function generateStrategy(description: string): SearchStrategy {
  const lower = description.toLowerCase();

  // Extract keywords: remove common stop words, keep meaningful terms
  const stopWords = new Set([
    "i", "me", "my", "want", "to", "the", "a", "an", "is", "are", "was",
    "were", "be", "been", "being", "have", "has", "had", "do", "does",
    "did", "will", "would", "could", "should", "may", "might", "can",
    "and", "or", "but", "if", "in", "on", "at", "by", "for", "with",
    "about", "of", "from", "up", "out", "that", "this", "it", "its",
    "not", "no", "so", "as", "just", "also", "than", "then", "when",
    "what", "which", "who", "how", "all", "each", "every", "any",
    "some", "such", "very", "too", "most", "more", "much", "many",
    "new", "latest", "recent", "track", "follow", "watch", "monitor",
    "keep", "find", "look", "see", "check", "get", "help",
    // Chinese stop words
    "我", "想", "要", "的", "了", "在", "和", "是", "有", "最新",
    "每天", "帮", "看", "看看", "跟踪", "关注", "关心",
  ]);

  const words = description
    .replace(/[^\w\s\u4e00-\u9fff-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w.toLowerCase()));

  // Deduplicate and limit keywords
  const keywords = [...new Set(words)].slice(0, 10);

  // Determine relevant sources
  const sources: SourceConfig[] = [];

  const hasAcademic =
    /paper|论文|arxiv|research|学术|academic|study/i.test(lower);
  const hasGitHub =
    /github|repo|repository|code|开源|open.?source|project|框架|framework|tool|library/i.test(lower);
  const hasHF =
    /hugging.?face|model|模型|diffusion|transformer|llm|vlm|bert|gpt/i.test(lower);
  const hasML =
    /machine.?learning|deep.?learning|ai|ml|dl|neural|训练|模型|agent|rl/i.test(lower);

  // Always include GitHub if any code/project keywords
  if (hasGitHub || hasML) {
    sources.push({
      type: "github",
      name: "GitHub Repositories",
      config: { sort: "stars", order: "desc", per_page: "20" },
      priority: hasGitHub ? 5 : 3,
    });
  }

  // Add arXiv for academic/ML content
  if (hasAcademic || hasML) {
    const categories: string[] = [];
    if (/vision|cv|image|视觉|vlm|clip/i.test(lower)) categories.push("cs.CV");
    if (/language|nlp|llm|text|文本|gpt/i.test(lower)) categories.push("cs.CL");
    if (/machine.?learning|ml|学习/i.test(lower)) categories.push("cs.LG");
    if (/ai|artificial|智能|agent/i.test(lower)) categories.push("cs.AI");
    if (/robot|机器人/i.test(lower)) categories.push("cs.RO");
    if (categories.length === 0) categories.push("cs.AI", "cs.LG");

    sources.push({
      type: "arxiv",
      name: "ArXiv Papers",
      config: { categories: categories.join(",") },
      priority: hasAcademic ? 5 : 3,
    });
  }

  // Add HuggingFace for model-related topics
  if (hasHF || hasML) {
    sources.push({
      type: "huggingface",
      name: "HuggingFace Daily Papers",
      config: {},
      priority: hasHF ? 5 : 2,
    });
  }

  // Default: if no sources detected, add GitHub + arXiv
  if (sources.length === 0) {
    sources.push({
      type: "github",
      name: "GitHub Repositories",
      config: { sort: "stars", order: "desc", per_page: "20" },
      priority: 3,
    });
    sources.push({
      type: "arxiv",
      name: "ArXiv Papers",
      config: { categories: "cs.AI,cs.LG" },
      priority: 3,
    });
  }

  // Build filters
  const filters: FilterRule[] = [];

  // Generate relevance prompt
  const relevancePrompt = `Evaluate if the following item is relevant to: "${description}". Consider title, description, and keywords. Return a score from 0 to 1.`;

  return {
    keywords,
    sources,
    filters,
    relevancePrompt,
    schedule: "daily",
  };
}
