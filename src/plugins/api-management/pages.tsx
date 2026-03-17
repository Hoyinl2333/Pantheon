"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Key,
  Plus,
  RefreshCw,
  Search,
  Loader2,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import {
  type ApiKeyRecord,
  type ProviderInfo,
  type CheckResult,
} from "./components/types";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { UsageHistoryChart } from "./components/UsageHistoryChart";
import { UsageCharts } from "./components/UsageCharts";
import { StatsBar } from "./components/StatsBar";
import { ApiKeyCard } from "./components/ApiKeyCard";
import { KeyDialog } from "./components/KeyDialog";
import { DeleteDialog } from "./components/DeleteDialog";

type ViewMode = "cards" | "charts";

export function ApiKeysPage() {
  const t = useTranslations("apiManagement");
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterProvider, setFilterProvider] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKeyRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiKeyRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [checkResults, setCheckResults] = useState<Record<string, CheckResult>>({});
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());
  const [checkingAll, setCheckingAll] = useState(false);

  const loadKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/plugins/api-management/keys");
      const data = await res.json();
      if (data.keys) setKeys(data.keys);
    } catch (err) {
      console.error("Failed to load keys:", err);
    }
    setLoading(false);
  }, []);

  const loadProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/plugins/api-management/providers");
      const data = await res.json();
      if (data.providers) setProviders(data.providers);
    } catch {
      setProviders([
        { id: "anthropic", name: "Anthropic", prefix: "sk-ant-", defaultBaseUrl: "https://api.anthropic.com" },
        { id: "openai", name: "OpenAI", prefix: "sk-", defaultBaseUrl: "https://api.openai.com" },
        { id: "deepseek", name: "DeepSeek", prefix: "sk-", defaultBaseUrl: "https://api.deepseek.com" },
        { id: "siliconflow", name: "SiliconFlow", prefix: "sk-", defaultBaseUrl: "https://api.siliconflow.cn" },
        { id: "moonshot", name: "Moonshot", prefix: "sk-", defaultBaseUrl: "https://api.moonshot.cn" },
        { id: "zhipu", name: "Zhipu AI", prefix: "", defaultBaseUrl: "https://open.bigmodel.cn" },
        { id: "openrouter", name: "OpenRouter", prefix: "sk-or-", defaultBaseUrl: "https://openrouter.ai" },
        { id: "groq", name: "Groq", prefix: "gsk_", defaultBaseUrl: "https://api.groq.com" },
        { id: "together", name: "Together AI", prefix: "", defaultBaseUrl: "https://api.together.xyz" },
        { id: "google", name: "Google AI", prefix: "AI", defaultBaseUrl: "https://generativelanguage.googleapis.com" },
        { id: "mistral", name: "Mistral", prefix: "", defaultBaseUrl: "https://api.mistral.ai" },
        { id: "cohere", name: "Cohere", prefix: "", defaultBaseUrl: "https://api.cohere.com" },
        { id: "volcengine", name: "Volcengine", prefix: "", defaultBaseUrl: "https://ark.cn-beijing.volces.com/api" },
        { id: "custom", name: "Custom / OpenAI Compatible", prefix: "", defaultBaseUrl: "" },
      ]);
    }
  }, []);

  useEffect(() => {
    loadKeys();
    loadProviders();
  }, [loadKeys, loadProviders]);

  const checkKey = useCallback(async (id: string) => {
    setCheckingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/plugins/api-management/balance?id=${id}`);
      const data = await res.json();
      if (data.result) {
        setCheckResults((prev) => ({ ...prev, [id]: data.result }));
      }
    } catch {
      setCheckResults((prev) => ({
        ...prev,
        [id]: { valid: false, balance: null, models: [], usage: null, rateLimit: null, error: "Check failed", checkedAt: new Date().toISOString() },
      }));
    }
    setCheckingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const checkAllKeys = useCallback(async () => {
    setCheckingAll(true);
    const activeKeys = keys.filter((k) => k.is_active);
    await Promise.allSettled(activeKeys.map((k) => checkKey(k.id)));
    setCheckingAll(false);
  }, [keys, checkKey]);

  const handleSave = useCallback(async (data: {
    provider: string;
    name: string;
    key?: string;
    base_url: string;
    monthly_budget: number | null;
    notes: string;
  }) => {
    setSaving(true);
    try {
      if (editingKey) {
        await fetch(`/api/plugins/api-management/keys?id=${editingKey.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        await fetch("/api/plugins/api-management/keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }
      await loadKeys();
      setAddDialogOpen(false);
      setEditingKey(null);
    } catch (err) {
      console.error("Save failed:", err);
    }
    setSaving(false);
  }, [editingKey, loadKeys]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/plugins/api-management/keys?id=${deleteTarget.id}`, { method: "DELETE" });
      await loadKeys();
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete failed:", err);
    }
    setDeleting(false);
  }, [deleteTarget, loadKeys]);

  const filteredKeys = useMemo(() => {
    return keys.filter((k) => {
      if (filterProvider !== "all" && k.provider !== filterProvider) return false;
      if (search) {
        const q = search.toLowerCase();
        return k.name.toLowerCase().includes(q) || k.provider.toLowerCase().includes(q) || k.notes.toLowerCase().includes(q);
      }
      return true;
    });
  }, [keys, search, filterProvider]);

  const usedProviders = useMemo(() => {
    return [...new Set(keys.map((k) => k.provider))];
  }, [keys]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Key className="h-6 w-6" />
          <h1 className="text-2xl font-bold">{t("title")}</h1>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-lg border bg-muted animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg border bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Key className="h-6 w-6" />
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border bg-muted p-0.5">
            <button
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${viewMode === "cards" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setViewMode("cards")}
            >
              <Key className="h-3.5 w-3.5" />
            </button>
            <button
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${viewMode === "charts" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setViewMode("charts")}
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={checkAllKeys} disabled={checkingAll || keys.length === 0}>
            {checkingAll ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            <span className="hidden sm:inline">{t("checkAll")}</span>
          </Button>
          <Button size="sm" onClick={() => { setEditingKey(null); setAddDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">{t("addKey")}</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <StatsBar keys={keys} checkResults={checkResults} />

      {/* Analytics Dashboard (collapsible) */}
      <AnalyticsDashboard keys={keys} checkResults={checkResults} />

      {/* Daily Usage History */}
      <UsageHistoryChart keys={keys} />

      {/* Charts view */}
      {viewMode === "charts" && (
        <UsageCharts keys={keys} checkResults={checkResults} />
      )}

      {/* Filter Bar */}
      {keys.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchKeys")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterProvider} onValueChange={setFilterProvider}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t("allProviders")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allProviders")}</SelectItem>
              {usedProviders.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Key Cards */}
      {filteredKeys.length === 0 && keys.length === 0 ? (
        <Card>
          <CardHeader className="items-center py-12">
            <Key className="h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle>{t("noKeys")}</CardTitle>
            <CardDescription className="text-center max-w-md">
              {t("noKeysDesc")}
            </CardDescription>
            <Button className="mt-4" onClick={() => { setEditingKey(null); setAddDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />
              {t("addFirstKey")}
            </Button>
          </CardHeader>
        </Card>
      ) : filteredKeys.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {t("noKeysMatch")}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredKeys.map((key) => (
            <ApiKeyCard
              key={key.id}
              keyRecord={key}
              checkResult={checkResults[key.id]}
              isChecking={checkingIds.has(key.id)}
              onCheck={() => checkKey(key.id)}
              onEdit={() => { setEditingKey(key); setAddDialogOpen(true); }}
              onDelete={() => setDeleteTarget(key)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <KeyDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        providers={providers}
        editingKey={editingKey}
        onSave={handleSave}
        saving={saving}
      />

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        keyName={deleteTarget?.name ?? ""}
        onConfirm={handleDelete}
        deleting={deleting}
      />
    </div>
  );
}
