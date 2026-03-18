"use client";

import { useState, useCallback } from "react";
import {
  Loader2,
  Sparkles,
  Save,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { SearchStrategy, SourceConfig } from "../types";

interface NeedCreatorDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  isZh: boolean;
}

export function NeedCreatorDialog({
  open,
  onClose,
  onCreated,
  isZh,
}: NeedCreatorDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [strategy, setStrategy] = useState<SearchStrategy | null>(null);
  const [generating, setGenerating] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const resetForm = useCallback(() => {
    setName("");
    setDescription("");
    setTagsInput("");
    setStrategy(null);
    setTestResults(null);
    setSaving(false);
  }, []);

  const handleGenerateStrategy = useCallback(async () => {
    if (!description.trim()) return;
    setGenerating(true);
    setStrategy(null);

    try {
      const res = await fetch("/api/plugins/daily-briefing/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim() }),
      });

      if (!res.ok) throw new Error("Strategy generation failed");
      const data = await res.json();
      setStrategy(data.strategy);

      // Auto-fill name if empty
      if (!name.trim() && data.strategy?.keywords?.length > 0) {
        setName(data.strategy.keywords.slice(0, 3).join(" + "));
      }
    } catch (err) {
      console.error("[NeedCreator] Strategy error:", err);
    }
    setGenerating(false);
  }, [description, name]);

  const handleTestSearch = useCallback(async () => {
    if (!strategy) return;
    setTesting(true);
    setTestResults(null);

    try {
      const res = await fetch("/api/plugins/daily-briefing/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true, strategy }),
      });

      if (!res.ok) throw new Error("Test search failed");
      const data = await res.json();
      setTestResults(data.count ?? 0);
    } catch (err) {
      console.error("[NeedCreator] Test error:", err);
    }
    setTesting(false);
  }, [strategy]);

  const handleSave = useCallback(async () => {
    if (!name.trim() || !strategy) return;
    setSaving(true);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/plugins/daily-briefing/needs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          tags,
          strategy,
          enabled: true,
        }),
      });

      if (!res.ok) throw new Error("Save failed");

      resetForm();
      onCreated();
    } catch (err) {
      console.error("[NeedCreator] Save error:", err);
      setSaving(false);
    }
  }, [name, description, tagsInput, strategy, onCreated, resetForm]);

  const handleAddSource = useCallback(() => {
    if (!strategy) return;
    const newSource: SourceConfig = {
      type: "rss",
      name: "New Source",
      config: {},
      priority: 3,
    };
    setStrategy({
      ...strategy,
      sources: [...strategy.sources, newSource],
    });
  }, [strategy]);

  const handleRemoveSource = useCallback(
    (idx: number) => {
      if (!strategy) return;
      setStrategy({
        ...strategy,
        sources: strategy.sources.filter((_, i) => i !== idx),
      });
    },
    [strategy],
  );

  const handleUpdateKeywords = useCallback(
    (value: string) => {
      if (!strategy) return;
      setStrategy({
        ...strategy,
        keywords: value
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
      });
    },
    [strategy],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          resetForm();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isZh ? "创建新的信息需求" : "Create Information Need"}
          </DialogTitle>
          <DialogDescription>
            {isZh
              ? "描述你关心的信息领域，AI 会帮你制定搜索策略"
              : "Describe what you want to track and AI will create a search strategy"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Name */}
          <div>
            <label className="text-sm font-medium">
              {isZh ? "名称" : "Name"}
            </label>
            <Input
              className="mt-1"
              placeholder={
                isZh ? "例如：LLM Agent 框架" : "e.g. LLM Agent Frameworks"
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium">
              {isZh ? "描述你关心的内容" : "Describe what you care about"}
            </label>
            <Textarea
              className="mt-1 min-h-[80px]"
              placeholder={
                isZh
                  ? "例如：我想跟踪 vision-language model 的最新论文和开源实现"
                  : "e.g. I want to track the latest VLM papers and open-source implementations"
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Generate Strategy button */}
          <Button
            onClick={handleGenerateStrategy}
            disabled={!description.trim() || generating}
            className="w-full"
            variant="outline"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {isZh ? "生成搜索策略" : "Generate Strategy"}
          </Button>

          {/* Strategy display */}
          {strategy && (
            <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
              <h4 className="text-sm font-semibold">
                {isZh ? "搜索策略" : "Search Strategy"}
              </h4>

              {/* Keywords */}
              <div>
                <label className="text-xs text-muted-foreground">
                  {isZh ? "关键词" : "Keywords"}
                </label>
                <Input
                  className="mt-1 h-8 text-xs"
                  value={strategy.keywords.join(", ")}
                  onChange={(e) => handleUpdateKeywords(e.target.value)}
                />
              </div>

              {/* Sources */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">
                    {isZh ? "数据源" : "Sources"}
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={handleAddSource}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {isZh ? "添加" : "Add"}
                  </Button>
                </div>
                <div className="space-y-1.5 mt-1">
                  {strategy.sources.map((src, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-xs"
                    >
                      <Badge variant="outline" className="text-[10px]">
                        {src.type}
                      </Badge>
                      <span className="flex-1 truncate">{src.name}</span>
                      <span className="text-muted-foreground">
                        P{src.priority}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveSource(idx)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              <div>
                <label className="text-xs text-muted-foreground">
                  {isZh ? "频率" : "Schedule"}
                </label>
                <div className="flex gap-2 mt-1">
                  {(["manual", "daily", "weekly"] as const).map((s) => (
                    <Badge
                      key={s}
                      variant={
                        strategy.schedule === s ? "default" : "outline"
                      }
                      className="cursor-pointer text-[10px]"
                      onClick={() =>
                        setStrategy({ ...strategy, schedule: s })
                      }
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Test search */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestSearch}
                  disabled={testing}
                  className="text-xs"
                >
                  {testing ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Play className="h-3 w-3 mr-1" />
                  )}
                  {isZh ? "试搜一下" : "Test Search"}
                </Button>
                {testResults !== null && (
                  <span className="text-xs text-muted-foreground">
                    {isZh
                      ? `找到 ${testResults} 条结果`
                      : `Found ${testResults} results`}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="text-sm font-medium">
              {isZh ? "标签（逗号分隔）" : "Tags (comma-separated)"}
            </label>
            <Input
              className="mt-1"
              placeholder={isZh ? "例如：AI, 论文, 开源" : "e.g. AI, papers, open-source"}
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                onClose();
              }}
            >
              {isZh ? "取消" : "Cancel"}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name.trim() || !strategy || saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              {isZh ? "保存" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
