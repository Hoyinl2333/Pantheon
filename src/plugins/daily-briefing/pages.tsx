"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Newspaper,
  RefreshCw,
  Settings,
  Loader2,
  Github,
  BookOpen,
  Rss,
  FileText,
  Search,
  Inbox,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { useLocale } from "@/i18n/provider";
import type { InfoNeed, DailyBriefing } from "./types";
import { BriefingCard } from "./components/briefing-card";
import { NeedsManager } from "./components/needs-manager";
import { NeedCreatorDialog } from "./components/need-creator-dialog";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const SOURCE_ICONS: Record<string, typeof Github> = {
  github: Github,
  huggingface: BookOpen,
  arxiv: FileText,
  rss: Rss,
  "web-search": Search,
  "custom-api": FileText,
};

export function DailyBriefingPage() {
  const t = useTranslations("dailyBriefing");
  const { locale } = useLocale();
  const isZh = locale === "zh-CN";

  const [date, setDate] = useState(todayStr);
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [needs, setNeeds] = useState<InfoNeed[]>([]);
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // Load needs via API
  const loadNeeds = useCallback(async () => {
    try {
      const res = await fetch("/api/plugins/daily-briefing/needs");
      if (res.ok) {
        const data = await res.json();
        setNeeds(data.needs ?? []);
      }
    } catch { /* ignore */ }
  }, []);

  // Load briefing for date via API
  const loadBriefing = useCallback(async (d: string) => {
    try {
      const res = await fetch(`/api/plugins/daily-briefing/items?date=${d}`);
      if (res.ok) {
        const data = await res.json();
        setBriefing(data.briefing ?? null);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadNeeds(); }, [loadNeeds]);
  useEffect(() => { loadBriefing(date); }, [date, loadBriefing]);

  // Fetch new content
  const handleFetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/plugins/daily-briefing/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        await loadBriefing(date);
      }
    } catch (err) {
      console.error("[DailyBriefing] Fetch error:", err);
    }
    setLoading(false);
  }, [date, loadBriefing]);

  // Feedback
  const handleFeedback = useCallback(async (itemId: string, feedback: "good" | "bad" | "star") => {
    try {
      await fetch("/api/plugins/daily-briefing/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, date, feedback }),
      });
      setBriefing((prev) => prev ? {
        ...prev,
        items: prev.items.map((i) => i.id === itemId
          ? { ...i, userFeedback: feedback, isFavorite: feedback === "star" ? !i.isFavorite : i.isFavorite }
          : i),
      } : null);
    } catch { /* ignore */ }
  }, [date]);

  const handleMarkRead = useCallback((itemId: string) => {
    setBriefing((prev) => prev ? {
      ...prev,
      items: prev.items.map((i) => i.id === itemId ? { ...i, isRead: true } : i),
    } : null);
  }, []);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!briefing) return [];
    if (activeFilter === "all") return briefing.items;
    return briefing.items.filter((i) => i.needId === activeFilter || i.sourceType === activeFilter);
  }, [briefing, activeFilter]);

  // Stats
  const stats = useMemo(() => {
    if (!briefing) return null;
    const bySource: Record<string, number> = {};
    for (const item of briefing.items) {
      bySource[item.sourceType] = (bySource[item.sourceType] ?? 0) + 1;
    }
    return { total: briefing.items.length, bySource };
  }, [briefing]);

  const sourceTypes = useMemo(() => {
    if (!briefing) return [];
    return [...new Set(briefing.items.map((i) => i.sourceType))];
  }, [briefing]);

  return (
    <div className="space-y-4 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Newspaper className="h-6 w-6" />
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isZh ? "AI 驱动的个性化信息雷达" : "AI-powered personalized information radar"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setDate((d) => shiftDate(d, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-mono min-w-[90px] text-center">{date}</span>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setDate((d) => shiftDate(d, 1))} disabled={date >= todayStr()}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleFetch} disabled={loading || needs.length === 0}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            {t("refresh")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCreatorOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {isZh ? "新需求" : "New Need"}
          </Button>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      {stats && stats.total > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">{stats.total} {isZh ? "条" : "items"}</Badge>
          {Object.entries(stats.bySource).map(([src, count]) => {
            const Icon = SOURCE_ICONS[src] ?? FileText;
            return (
              <Badge key={src} variant="secondary" className="text-xs gap-1">
                <Icon className="h-3 w-3" /> {src}: {count}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Button variant={activeFilter === "all" ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setActiveFilter("all")}>
          {isZh ? "全部" : "All"}
        </Button>
        {needs.filter((n) => n.enabled).map((need) => (
          <Button key={need.id} variant={activeFilter === need.id ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setActiveFilter(need.id)}>
            {need.name}
          </Button>
        ))}
        {sourceTypes.map((src) => {
          const Icon = SOURCE_ICONS[src] ?? FileText;
          return (
            <Button key={src} variant={activeFilter === src ? "default" : "outline"} size="sm" className="h-7 text-xs gap-1" onClick={() => setActiveFilter(src)}>
              <Icon className="h-3 w-3" /> {src}
            </Button>
          );
        })}
      </div>

      {/* Content */}
      {!briefing || briefing.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Inbox className="h-16 w-16 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">
            {needs.length === 0 ? (isZh ? "还没有信息需求" : "No information needs yet") : (isZh ? "今天还没有内容" : "No content for today")}
          </h3>
          <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
            {needs.length === 0 ? (isZh ? "点击「新需求」告诉 AI 你关心什么" : "Click 'New Need' to tell AI what you care about") : (isZh ? "点击刷新获取最新内容" : "Click Refresh to fetch latest content")}
          </p>
          {needs.length === 0 ? (
            <Button className="mt-4" onClick={() => setCreatorOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> {isZh ? "添加第一个需求" : "Add your first need"}
            </Button>
          ) : (
            <Button className="mt-4" onClick={handleFetch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              {t("refresh")}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <BriefingCard key={item.id} item={item} needName={needs.find((n) => n.id === item.needId)?.name} isZh={isZh} onFeedback={handleFeedback} onMarkRead={handleMarkRead} />
          ))}
        </div>
      )}

      {/* Needs manager drawer */}
      <NeedsManager open={settingsOpen} onClose={() => setSettingsOpen(false)} needs={needs} onNeedsChange={loadNeeds} isZh={isZh} />

      {/* Need creator dialog */}
      <NeedCreatorDialog open={creatorOpen} onClose={() => setCreatorOpen(false)} onCreated={() => { loadNeeds(); setCreatorOpen(false); }} isZh={isZh} />
    </div>
  );
}
