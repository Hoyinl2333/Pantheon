/**
 * Daily Briefing - Fetch Route (v2)
 *
 * POST /api/plugins/daily-briefing/fetch
 * Fetches briefing items for all enabled needs (or a specific need).
 *
 * Body:
 *   { needId?: string }           — fetch for specific need, or all enabled
 *   { dryRun: true, strategy }    — test a strategy without saving
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getNeeds,
  updateNeed,
  saveBriefing,
  getBriefing,
} from "@/plugins/daily-briefing/lib/briefing-store";
import type {
  BriefingItem,
  DailyBriefing,
  InfoNeed,
  SearchStrategy,
  SourceConfig,
} from "@/plugins/daily-briefing/types";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { needId, dryRun, strategy: dryRunStrategy } = body;

    // Dry run mode: test a strategy without saving
    if (dryRun && dryRunStrategy) {
      const items = await fetchForStrategy(
        dryRunStrategy as SearchStrategy,
        "dry-run",
      );
      return NextResponse.json({ items, count: items.length });
    }

    // Normal mode: fetch for enabled needs
    const allNeeds = getNeeds();
    const targetNeeds = needId
      ? allNeeds.filter((n) => n.id === needId)
      : allNeeds.filter((n) => n.enabled);

    if (targetNeeds.length === 0) {
      return NextResponse.json({
        briefing: null,
        count: 0,
        message: "No enabled needs to fetch",
      });
    }

    const allItems: BriefingItem[] = [];
    const errors: string[] = [];

    // Fetch for each need in parallel
    const fetchers = targetNeeds.map(async (need) => {
      try {
        const items = await fetchForStrategy(need.strategy, need.id);
        // Tag items with need tags
        const taggedItems = items.map((item) => ({
          ...item,
          tags: [...new Set([...item.tags, ...need.tags])],
        }));
        allItems.push(...taggedItems);

        // Update lastFetchedAt
        updateNeed(need.id, { lastFetchedAt: new Date().toISOString() });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`${need.name}: ${msg}`);
      }
    });

    await Promise.allSettled(fetchers);

    // Sort by relevance then date
    allItems.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return (
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    });

    // Build stats
    const byNeed: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    for (const item of allItems) {
      byNeed[item.needId] = (byNeed[item.needId] ?? 0) + 1;
      bySource[item.sourceType] = (bySource[item.sourceType] ?? 0) + 1;
    }

    const date = todayStr();

    // Merge with existing briefing (preserve user feedback)
    const existing = getBriefing(date);
    const existingMap = new Map(
      (existing?.items ?? []).map((i) => [i.id, i]),
    );
    const mergedItems = allItems.map((item) => {
      const prev = existingMap.get(item.id);
      return prev
        ? {
            ...item,
            isRead: prev.isRead,
            isFavorite: prev.isFavorite,
            userFeedback: prev.userFeedback,
          }
        : item;
    });

    const briefing: DailyBriefing = {
      date,
      items: mergedItems,
      stats: {
        total: mergedItems.length,
        byNeed,
        bySource,
      },
    };

    saveBriefing(briefing);

    return NextResponse.json({
      briefing,
      count: mergedItems.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Fetch items for a given search strategy.
 */
async function fetchForStrategy(
  strategy: SearchStrategy,
  needId: string,
): Promise<BriefingItem[]> {
  const allItems: BriefingItem[] = [];

  const fetchers = strategy.sources.map(async (source) => {
    try {
      const items = await fetchFromSource(source, strategy.keywords, needId);
      allItems.push(...items);
    } catch (err) {
      console.error(
        `[Briefing] Error fetching from ${source.type}:`,
        err,
      );
    }
  });

  await Promise.allSettled(fetchers);

  // Score relevance based on keyword matching
  const scored = allItems.map((item) => ({
    ...item,
    relevanceScore: scoreRelevance(item, strategy.keywords),
  }));

  // Apply filters
  const filtered = applyFilters(scored, strategy.filters);

  return filtered;
}

/**
 * Fetch from a specific source.
 */
async function fetchFromSource(
  source: SourceConfig,
  keywords: string[],
  needId: string,
): Promise<BriefingItem[]> {
  switch (source.type) {
    case "github":
      return fetchGitHub(keywords, needId, source);
    case "arxiv":
      return fetchArxiv(keywords, needId, source);
    case "huggingface":
      return fetchHuggingFace(needId);
    case "rss":
      return fetchRSS(source, needId);
    default:
      return [];
  }
}

// ---- GitHub ----

async function fetchGitHub(
  keywords: string[],
  needId: string,
  source: SourceConfig,
): Promise<BriefingItem[]> {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - 7);
  const dateStr = dateThreshold.toISOString().slice(0, 10);

  const keywordQuery = keywords.join("+");
  const query = `${keywordQuery}+created:>${dateStr}+stars:>10`;
  const perPage = source.config.per_page ?? "20";
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${perPage}`;

  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github.v3+json" },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);

  const data = await res.json();
  const repos = data.items ?? [];

  return repos.map(
    (repo: {
      id: number;
      full_name: string;
      html_url: string;
      description: string | null;
      owner: { login: string };
      stargazers_count: number;
      language: string | null;
      topics: string[];
      created_at: string;
    }) => ({
      id: `gh-${repo.id}`,
      needId,
      source: "GitHub",
      sourceType: "github" as const,
      title: repo.full_name,
      url: repo.html_url,
      description: repo.description ?? "",
      author: repo.owner?.login,
      publishedAt: repo.created_at,
      tags: (repo.topics ?? []).slice(0, 5),
      relevanceScore: 0,
      isRead: false,
      isFavorite: false,
      stars: repo.stargazers_count,
      language: repo.language ?? undefined,
    }),
  );
}

// ---- ArXiv ----

async function fetchArxiv(
  keywords: string[],
  needId: string,
  source: SourceConfig,
): Promise<BriefingItem[]> {
  const categories = source.config.categories ?? "cs.AI";
  const catParts = categories.split(",").map((c) => c.trim());
  const catQuery = catParts.map((c) => `cat:${c}`).join("+OR+");
  const keywordQuery = keywords.length > 0
    ? `+AND+all:${keywords.join("+OR+all:")}`
    : "";

  const url = `https://export.arxiv.org/api/query?search_query=${catQuery}${keywordQuery}&sortBy=submittedDate&sortOrder=descending&max_results=20`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`ArXiv API returned ${res.status}`);

  const xml = await res.text();
  const items: BriefingItem[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  let match: RegExpExecArray | null;

  while ((match = entryRegex.exec(xml)) !== null && items.length < 20) {
    const block = match[1];
    const title = extractTag(block, "title").replace(/\s+/g, " ");
    const summary = extractTag(block, "summary").replace(/\s+/g, " ");
    const published = extractTag(block, "published");
    const id = extractTag(block, "id");
    const authorName = extractTag(block, "name");

    const catRegex = /category[^>]*term="([^"]+)"/gi;
    const tags: string[] = [];
    let catMatch: RegExpExecArray | null;
    while ((catMatch = catRegex.exec(block)) !== null) {
      tags.push(catMatch[1]);
    }

    if (!title) continue;

    items.push({
      id: `arxiv-${hashCode(id || title)}`,
      needId,
      source: "arXiv",
      sourceType: "arxiv",
      title,
      url: id || `https://arxiv.org/abs/${hashCode(title)}`,
      description: summary.slice(0, 300),
      author: authorName || undefined,
      publishedAt: published
        ? new Date(published).toISOString()
        : new Date().toISOString(),
      tags: tags.slice(0, 4),
      relevanceScore: 0,
      isRead: false,
      isFavorite: false,
    });
  }

  return items;
}

// ---- HuggingFace ----

async function fetchHuggingFace(needId: string): Promise<BriefingItem[]> {
  const res = await fetch("https://huggingface.co/api/daily_papers", {
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`HuggingFace API returned ${res.status}`);

  const papers = await res.json();
  if (!Array.isArray(papers)) return [];

  return papers.slice(0, 20).map(
    (
      paper: {
        title?: string;
        paper?: {
          id?: string;
          title?: string;
          summary?: string;
          authors?: { name?: string }[];
        };
        publishedAt?: string;
      },
      idx: number,
    ) => {
      const paperId = paper.paper?.id ?? `hf-${idx}`;
      return {
        id: `hf-${paperId}`,
        needId,
        source: "HuggingFace",
        sourceType: "huggingface" as const,
        title: paper.paper?.title ?? paper.title ?? "Untitled",
        url: `https://huggingface.co/papers/${paperId}`,
        description: (paper.paper?.summary ?? "").slice(0, 300),
        author: paper.paper?.authors?.[0]?.name,
        publishedAt: paper.publishedAt ?? new Date().toISOString(),
        tags: ["paper", "ml"],
        relevanceScore: 0,
        isRead: false,
        isFavorite: false,
      };
    },
  );
}

// ---- RSS ----

async function fetchRSS(
  source: SourceConfig,
  needId: string,
): Promise<BriefingItem[]> {
  const feedUrl = source.config.url;
  if (!feedUrl) return [];

  const allItems: BriefingItem[] = [];

  try {
    const res = await fetch(feedUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];

    const xml = await res.text();
    const itemRegex = /<(?:item|entry)[\s>]([\s\S]*?)<\/(?:item|entry)>/gi;
    let match: RegExpExecArray | null;

    while (
      (match = itemRegex.exec(xml)) !== null &&
      allItems.length < 20
    ) {
      const block = match[1];
      const title = extractTag(block, "title");
      const link =
        extractTag(block, "link") || extractAttr(block, "link", "href");
      const description =
        extractTag(block, "description") ||
        extractTag(block, "summary") ||
        extractTag(block, "content");
      const pubDate =
        extractTag(block, "pubDate") ||
        extractTag(block, "published") ||
        extractTag(block, "updated");
      const author =
        extractTag(block, "author") || extractTag(block, "dc:creator");

      if (!title) continue;

      allItems.push({
        id: `rss-${hashCode(feedUrl + title)}`,
        needId,
        source: source.name,
        sourceType: "rss",
        title: stripHtml(title),
        url: link || feedUrl,
        description: stripHtml(description).slice(0, 300),
        author: author ? stripHtml(author) : undefined,
        publishedAt: pubDate
          ? new Date(pubDate).toISOString()
          : new Date().toISOString(),
        tags: ["rss"],
        relevanceScore: 0,
        isRead: false,
        isFavorite: false,
      });
    }
  } catch {
    // Skip failed feeds
  }

  return allItems;
}

// ---- Relevance Scoring ----

function scoreRelevance(item: BriefingItem, keywords: string[]): number {
  if (keywords.length === 0) return 0.5;

  const text = `${item.title} ${item.description} ${item.tags.join(" ")}`.toLowerCase();
  let matches = 0;

  for (const kw of keywords) {
    if (text.includes(kw.toLowerCase())) {
      matches++;
    }
  }

  return Math.min(1, matches / Math.max(1, keywords.length));
}

// ---- Filter application ----

function applyFilters(
  items: BriefingItem[],
  filters: { field: string; operator: string; value: string }[],
): BriefingItem[] {
  if (filters.length === 0) return items;

  return items.filter((item) => {
    return filters.every((filter) => {
      const fieldValue = getFieldValue(item, filter.field);
      switch (filter.operator) {
        case "contains":
          return fieldValue.toLowerCase().includes(filter.value.toLowerCase());
        case "not-contains":
          return !fieldValue.toLowerCase().includes(filter.value.toLowerCase());
        case "regex":
          try {
            return new RegExp(filter.value, "i").test(fieldValue);
          } catch {
            return true;
          }
        case "date-after":
          return new Date(fieldValue) > new Date(filter.value);
        default:
          return true;
      }
    });
  });
}

function getFieldValue(item: BriefingItem, field: string): string {
  switch (field) {
    case "title":
      return item.title;
    case "description":
      return item.description;
    case "author":
      return item.author ?? "";
    case "publishedAt":
      return item.publishedAt;
    case "source":
      return item.source;
    default:
      return "";
  }
}

// ---- XML Helpers ----

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`,
    "i",
  );
  const m = regex.exec(xml);
  return m ? m[1].trim() : "";
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, "i");
  const m = regex.exec(xml);
  return m ? m[1] : "";
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/gi, " ")
    .trim();
}

function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
