"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Plus,
  Trash2,
  Save,
  Github,
  BookOpen,
  FileText,
  Rss,
  Search,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SourceType } from "../types";

interface RssFeed { name: string; url: string }

interface BriefingConfig {
  sources: Record<SourceType, boolean>;
  github: { language: string; timeRange: string };
  arxiv: { categories: string[] };
  rssFeeds: RssFeed[];
  display: { maxItemsPerSource: number; autoRefreshInterval: string };
}

const DEFAULT_CONFIG: BriefingConfig = {
  sources: { github: true, huggingface: true, arxiv: true, rss: false, "web-search": true, "custom-api": false },
  github: { language: "All", timeRange: "daily" },
  arxiv: { categories: ["cs.AI", "cs.CL", "cs.CV", "cs.LG"] },
  rssFeeds: [],
  display: { maxItemsPerSource: 10, autoRefreshInterval: "off" },
};

const SOURCE_META: { type: SourceType; icon: typeof Github; label: string; labelZh: string }[] = [
  { type: "github", icon: Github, label: "GitHub", labelZh: "GitHub" },
  { type: "huggingface", icon: BookOpen, label: "HuggingFace", labelZh: "HuggingFace" },
  { type: "arxiv", icon: FileText, label: "arXiv", labelZh: "arXiv" },
  { type: "rss", icon: Rss, label: "RSS Feeds", labelZh: "RSS 订阅" },
  { type: "web-search", icon: Search, label: "Web Search", labelZh: "网页搜索" },
  { type: "custom-api", icon: FileText, label: "Custom API", labelZh: "自定义 API" },
];

const GITHUB_LANGUAGES = ["All", "Python", "TypeScript", "JavaScript", "Rust", "Go", "Java", "C++", "C", "Swift", "Kotlin", "Ruby", "PHP"];
const ARXIV_CATEGORIES = ["cs.AI", "cs.CL", "cs.CV", "cs.LG", "cs.NE", "cs.IR", "cs.RO", "cs.SE", "cs.DC", "stat.ML", "eess.IV"];

const TIME_RANGES: { value: string; label: string; labelZh: string }[] = [
  { value: "daily", label: "Daily", labelZh: "每日" }, { value: "weekly", label: "Weekly", labelZh: "每周" }, { value: "monthly", label: "Monthly", labelZh: "每月" },
];
const REFRESH_INTERVALS: { value: string; label: string; labelZh: string }[] = [
  { value: "off", label: "Off", labelZh: "关闭" }, { value: "30min", label: "30 min", labelZh: "30 分钟" },
  { value: "1h", label: "1 hour", labelZh: "1 小时" }, { value: "2h", label: "2 hours", labelZh: "2 小时" }, { value: "6h", label: "6 hours", labelZh: "6 小时" },
];

interface BriefingSettingsProps { open: boolean; onClose: () => void; isZh: boolean }

export function BriefingSettings({ open, onClose, isZh }: BriefingSettingsProps) {
  const [config, setConfig] = useState<BriefingConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [newFeed, setNewFeed] = useState<RssFeed>({ name: "", url: "" });

  // Load config on open
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await fetch("/api/plugins/daily-briefing/config");
        if (res.ok) {
          const { config: saved } = await res.json();
          if (saved) {
            setConfig({ ...DEFAULT_CONFIG, ...saved });
          }
        }
      } catch {
        /* use defaults */
      }
      setDirty(false);
    })();
  }, [open]);

  const update = useCallback(<K extends keyof BriefingConfig>(
    key: K,
    value: BriefingConfig[K],
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  const toggleSource = useCallback((type: SourceType) => {
    setConfig((prev) => ({
      ...prev,
      sources: { ...prev.sources, [type]: !prev.sources[type] },
    }));
    setDirty(true);
  }, []);

  const toggleArxivCategory = useCallback((cat: string) => {
    setConfig((prev) => {
      const cats = prev.arxiv.categories;
      const next = cats.includes(cat)
        ? cats.filter((c) => c !== cat)
        : [...cats, cat];
      return { ...prev, arxiv: { ...prev.arxiv, categories: next } };
    });
    setDirty(true);
  }, []);

  const addRssFeed = useCallback(() => {
    if (!newFeed.name.trim() || !newFeed.url.trim()) return;
    setConfig((prev) => ({
      ...prev,
      rssFeeds: [...prev.rssFeeds, { name: newFeed.name.trim(), url: newFeed.url.trim() }],
    }));
    setNewFeed({ name: "", url: "" });
    setDirty(true);
  }, [newFeed]);

  const removeRssFeed = useCallback((index: number) => {
    setConfig((prev) => ({
      ...prev,
      rssFeeds: prev.rssFeeds.filter((_, i) => i !== index),
    }));
    setDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await fetch("/api/plugins/daily-briefing/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setDirty(false);
    } catch (err) {
      console.error("[BriefingSettings] Save error:", err);
    }
    setSaving(false);
  }, [config]);

  if (!open) return null;

  const t = (en: string, zh: string) => (isZh ? zh : en);

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg z-50 bg-background border-l shadow-xl overflow-y-auto animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {t("Briefing Settings", "简报设置")}
          </h2>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* ---- Data Sources ---- */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t("Data Sources", "数据源")}
            </h3>
            <div className="space-y-2">
              {SOURCE_META.map(({ type, icon: Icon, label, labelZh }) => (
                <div key={type} className="flex items-center justify-between rounded-md border px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{isZh ? labelZh : label}</span>
                  </div>
                  <Switch
                    checked={config.sources[type]}
                    onCheckedChange={() => toggleSource(type)}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* ---- GitHub Settings ---- */}
          {config.sources.github && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t("GitHub Settings", "GitHub 设置")}
              </h3>
              <div className="space-y-3 rounded-md border p-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">
                    {t("Language Filter", "语言筛选")}
                  </label>
                  <Select
                    value={config.github.language}
                    onValueChange={(v) => update("github", { ...config.github, language: v })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GITHUB_LANGUAGES.map((lang) => (
                        <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">
                    {t("Time Range", "时间范围")}
                  </label>
                  <Select
                    value={config.github.timeRange}
                    onValueChange={(v) => update("github", { ...config.github, timeRange: v })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_RANGES.map(({ value, label: en, labelZh: zh }) => (
                        <SelectItem key={value} value={value}>{isZh ? zh : en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>
          )}

          {/* ---- arXiv Settings ---- */}
          {config.sources.arxiv && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t("arXiv Settings", "arXiv 设置")}
              </h3>
              <div className="rounded-md border p-4">
                <label className="text-xs text-muted-foreground mb-2 block">
                  {t("Search Categories", "搜索分类")}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ARXIV_CATEGORIES.map((cat) => {
                    const active = config.arxiv.categories.includes(cat);
                    return (
                      <Badge
                        key={cat}
                        variant={active ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => toggleArxivCategory(cat)}
                      >
                        {cat}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* ---- RSS Feeds ---- */}
          {config.sources.rss && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t("RSS Feeds", "RSS 订阅")}
              </h3>
              <div className="rounded-md border p-4 space-y-3">
                {/* Existing feeds */}
                {config.rssFeeds.length > 0 ? (
                  <div className="space-y-2">
                    {config.rssFeeds.map((feed, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Rss className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate min-w-0">{feed.name}</span>
                        <span className="text-muted-foreground truncate min-w-0 flex-1">{feed.url}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeRssFeed(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t("No feeds added yet.", "还没有添加订阅源。")}
                  </p>
                )}

                {/* Add new feed */}
                <div className="flex gap-2">
                  <Input
                    className="h-8 text-xs flex-1"
                    placeholder={t("Feed name", "名称")}
                    value={newFeed.name}
                    onChange={(e) => setNewFeed((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    className="h-8 text-xs flex-[2]"
                    placeholder={t("Feed URL", "订阅链接")}
                    value={newFeed.url}
                    onChange={(e) => setNewFeed((prev) => ({ ...prev, url: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") addRssFeed(); }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={addRssFeed}
                    disabled={!newFeed.name.trim() || !newFeed.url.trim()}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </section>
          )}

          {/* ---- Display Settings ---- */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t("Display", "显示")}
            </h3>
            <div className="space-y-3 rounded-md border p-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">
                  {t("Max items per source", "每个来源最大条目数")}
                </label>
                <Input
                  type="number"
                  className="h-9 w-24"
                  min={1}
                  max={100}
                  value={config.display.maxItemsPerSource}
                  onChange={(e) =>
                    update("display", {
                      ...config.display,
                      maxItemsPerSource: Math.max(1, Math.min(100, Number(e.target.value) || 10)),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">
                  {t("Auto-refresh interval", "自动刷新间隔")}
                </label>
                <Select
                  value={config.display.autoRefreshInterval}
                  onValueChange={(v) =>
                    update("display", { ...config.display, autoRefreshInterval: v })
                  }
                >
                  <SelectTrigger className="h-9 w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REFRESH_INTERVALS.map(({ value, label: en, labelZh: zh }) => (
                      <SelectItem key={value} value={value}>{isZh ? zh : en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>
        </div>

        {/* Sticky save footer */}
        <div className="sticky bottom-0 border-t bg-background px-6 py-4">
          <Button className="w-full" onClick={handleSave} disabled={saving || !dirty}>
            <Save className="h-4 w-4 mr-2" />
            {saving
              ? t("Saving...", "保存中...")
              : dirty
                ? t("Save Settings", "保存设置")
                : t("Saved", "已保存")}
          </Button>
        </div>
      </div>
    </>
  );
}
