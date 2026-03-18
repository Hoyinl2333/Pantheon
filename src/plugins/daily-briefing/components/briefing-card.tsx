"use client";

import {
  Github,
  BookOpen,
  Rss,
  FileText,
  Search,
  Star,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BriefingItem, SourceType } from "../types";

const sourceIcons: Record<string, typeof Github> = {
  github: Github,
  huggingface: BookOpen,
  rss: Rss,
  arxiv: FileText,
  "web-search": Search,
  "custom-api": FileText,
};

const sourceColors: Record<string, string> = {
  github: "text-gray-400",
  huggingface: "text-yellow-500",
  rss: "text-orange-500",
  arxiv: "text-red-400",
  "web-search": "text-blue-400",
  "custom-api": "text-purple-400",
};

interface BriefingCardProps {
  item: BriefingItem;
  needName?: string;
  isZh: boolean;
  onFeedback: (id: string, feedback: "good" | "bad" | "star") => void;
  onMarkRead: (id: string) => void;
}

export function BriefingCard({
  item,
  needName,
  isZh,
  onFeedback,
  onMarkRead,
}: BriefingCardProps) {
  const SourceIcon = sourceIcons[item.sourceType] ?? FileText;
  const sourceColor = sourceColors[item.sourceType] ?? "text-muted-foreground";
  const timeAgo = formatTimeAgo(item.publishedAt);

  const relevancePct = Math.round(item.relevanceScore * 100);
  const relevanceColor =
    relevancePct >= 80
      ? "bg-green-500/15 text-green-600 dark:text-green-400"
      : relevancePct >= 50
        ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
        : "bg-gray-500/15 text-gray-500";

  return (
    <div
      className={`
        group relative rounded-lg border p-4 transition-all duration-200
        hover:shadow-md hover:border-primary/30
        ${!item.isRead ? "border-l-2 border-l-primary" : ""}
        ${item.isRead ? "opacity-70 bg-muted/30" : "bg-card"}
      `}
      onClick={() => onMarkRead(item.id)}
    >
      {/* Header row: source icon + title + actions */}
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex-shrink-0 ${sourceColor}`}>
          <SourceIcon className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium hover:underline transition-colors line-clamp-1 flex items-center gap-1 text-blue-600 dark:text-blue-400"
            onClick={(e) => e.stopPropagation()}
          >
            {item.title}
            <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
          </a>

          {/* Meta line */}
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground flex-wrap">
            <span>{item.source}</span>
            <span>·</span>
            <span>{timeAgo}</span>
            {needName && (
              <>
                <span>·</span>
                <span className="text-primary/80">
                  {isZh ? "需求" : "Need"}: {needName}
                </span>
              </>
            )}
            {item.relevanceScore > 0 && (
              <Badge
                variant="secondary"
                className={`text-[9px] px-1 py-0 h-4 ${relevanceColor}`}
              >
                {relevancePct}%
              </Badge>
            )}
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
            {item.description}
          </p>
        </div>

        {/* Feedback buttons */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 w-7 p-0 ${
              item.userFeedback === "star" || item.isFavorite
                ? "text-yellow-500"
                : "text-muted-foreground/40 hover:text-yellow-500"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onFeedback(item.id, "star");
            }}
          >
            <Star
              className="h-3.5 w-3.5"
              fill={
                item.userFeedback === "star" || item.isFavorite
                  ? "currentColor"
                  : "none"
              }
            />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 w-7 p-0 ${
              item.userFeedback === "good"
                ? "text-green-500"
                : "text-muted-foreground/40 hover:text-green-500"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onFeedback(item.id, "good");
            }}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 w-7 p-0 ${
              item.userFeedback === "bad"
                ? "text-red-500"
                : "text-muted-foreground/40 hover:text-red-500"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onFeedback(item.id, "bad");
            }}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Footer: tags + stars */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {item.tags.slice(0, 4).map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="text-[10px] px-1.5 py-0"
          >
            {tag}
          </Badge>
        ))}

        <div className="flex-1" />

        {/* GitHub stars */}
        {item.stars != null && item.stars > 0 && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Star className="h-3 w-3" />
            {item.stars >= 1000
              ? `${(item.stars / 1000).toFixed(1)}k`
              : item.stars}
          </span>
        )}

        {/* Language */}
        {item.language && (
          <span className="text-[10px] text-muted-foreground">
            {item.language}
          </span>
        )}

        {/* Author */}
        {item.author && (
          <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
            {item.author}
          </span>
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return "just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return "";
  }
}
