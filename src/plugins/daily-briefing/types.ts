/**
 * Daily Briefing Plugin - Type Definitions (v2)
 *
 * AI-driven personalized information radar.
 * User defines what they care about -> AI generates search strategy -> fetch & filter.
 */

// ---- Info Need ----

/** A user-defined information need / tracking interest */
export interface InfoNeed {
  id: string;
  name: string;
  description: string;        // user's original natural language input
  strategy: SearchStrategy;
  tags: string[];
  enabled: boolean;
  createdAt: string;
  lastFetchedAt?: string;
}

/** AI-generated search strategy for an InfoNeed */
export interface SearchStrategy {
  keywords: string[];
  sources: SourceConfig[];
  filters: FilterRule[];
  relevancePrompt: string;    // AI prompt for judging relevance
  schedule: "manual" | "daily" | "weekly";
}

/** Data source configuration (extensible to any source) */
export interface SourceConfig {
  type: SourceType;
  name: string;
  config: Record<string, string>;
  priority: number;           // 1-5
}

export type SourceType =
  | "github"
  | "arxiv"
  | "huggingface"
  | "rss"
  | "web-search"
  | "custom-api";

/** Filter rule for post-fetch filtering */
export interface FilterRule {
  field: string;
  operator: "contains" | "not-contains" | "regex" | "date-after";
  value: string;
}

// ---- Briefing Items ----

/** A single briefing item (paper, repo, article, etc.) */
export interface BriefingItem {
  id: string;
  needId: string;
  source: string;
  sourceType: SourceType;
  title: string;
  url: string;
  description: string;
  author?: string;
  publishedAt: string;
  tags: string[];
  relevanceScore: number;     // 0-1
  userFeedback?: "good" | "bad" | "star";
  isRead: boolean;
  isFavorite: boolean;
  stars?: number;             // GitHub stars
  language?: string;          // GitHub language
}

/** A day's briefing aggregate */
export interface DailyBriefing {
  date: string;               // YYYY-MM-DD
  items: BriefingItem[];
  summary?: string;           // AI-generated summary
  stats: BriefingStats;
}

export interface BriefingStats {
  total: number;
  byNeed: Record<string, number>;
  bySource: Record<string, number>;
}

// ---- API request/response types ----

export interface CreateNeedRequest {
  name: string;
  description: string;
  tags: string[];
  strategy?: SearchStrategy;
}

export interface UpdateNeedRequest {
  id: string;
  name?: string;
  description?: string;
  tags?: string[];
  strategy?: SearchStrategy;
  enabled?: boolean;
}

export interface FetchRequest {
  needId?: string;            // optional: fetch specific need or all
}

export interface FeedbackRequest {
  itemId: string;
  date: string;
  feedback: "good" | "bad" | "star";
}

export interface StrategyRequest {
  description: string;
}
