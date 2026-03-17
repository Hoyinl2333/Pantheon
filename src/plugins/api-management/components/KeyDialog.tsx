"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import { type ApiKeyRecord, type ProviderInfo } from "./types";

export function KeyDialog({
  open,
  onOpenChange,
  providers,
  editingKey,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providers: ProviderInfo[];
  editingKey: ApiKeyRecord | null;
  onSave: (data: {
    provider: string;
    name: string;
    key?: string;
    base_url: string;
    monthly_budget: number | null;
    notes: string;
  }) => void;
  saving: boolean;
}) {
  const t = useTranslations("apiManagement");
  const tc = useTranslations("common");
  const [provider, setProvider] = useState("");
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validResult, setValidResult] = useState<{ valid: boolean; error?: string } | null>(null);

  useEffect(() => {
    if (open) {
      if (editingKey) {
        setProvider(editingKey.provider);
        setName(editingKey.name);
        setApiKey("");
        setBaseUrl(editingKey.base_url);
        setBudget(editingKey.monthly_budget?.toString() ?? "");
        setNotes(editingKey.notes);
      } else {
        setProvider("");
        setName("");
        setApiKey("");
        setBaseUrl("");
        setBudget("");
        setNotes("");
      }
      setShowKey(false);
      setValidResult(null);
    }
  }, [open, editingKey]);

  useEffect(() => {
    if (!editingKey && provider) {
      const p = providers.find((pr) => pr.id === provider);
      if (p) setBaseUrl(p.defaultBaseUrl);
    }
  }, [provider, providers, editingKey]);

  const handleValidate = useCallback(async () => {
    if (!apiKey || !provider) return;
    setValidating(true);
    setValidResult(null);
    try {
      const res = await fetch("/api/plugins/api-management/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key: apiKey, base_url: baseUrl }),
      });
      const data = await res.json();
      setValidResult(data);
    } catch {
      setValidResult({ valid: false, error: "Connection failed" });
    }
    setValidating(false);
  }, [apiKey, provider, baseUrl]);

  const handleSubmit = () => {
    onSave({
      provider,
      name,
      key: apiKey || undefined,
      base_url: baseUrl,
      monthly_budget: budget ? parseFloat(budget) : null,
      notes,
    });
  };

  const isValid = provider && name && (editingKey || apiKey.length >= 4);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingKey ? t("keyDialog.editTitle") : t("keyDialog.addTitle")}</DialogTitle>
          <DialogDescription>
            {editingKey ? t("keyDialog.editDesc") : t("keyDialog.addDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Provider */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("keyDialog.provider")}</label>
            <Select value={provider} onValueChange={setProvider} disabled={!!editingKey}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("keyDialog.selectProvider")} />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("keyDialog.displayName")}</label>
            <Input
              placeholder="e.g. My DeepSeek Key"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              {t("keyDialog.apiKey")} {editingKey && <span className="text-muted-foreground font-normal">({t("keyDialog.keepCurrent")})</span>}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setValidResult(null); }}
                  className="pr-8 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleValidate}
                disabled={!apiKey || !provider || validating}
                className="shrink-0"
              >
                {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : t("keyDialog.test")}
              </Button>
            </div>
            {validResult && (
              <div className={`text-xs flex items-center gap-1 ${validResult.valid ? "text-green-600" : "text-red-600"}`}>
                {validResult.valid ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                {validResult.valid ? t("keyDialog.keyValid") : validResult.error || t("keyDialog.keyInvalid")}
              </div>
            )}
          </div>

          {/* Base URL */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              {t("keyDialog.baseUrl")} <span className="text-muted-foreground font-normal">({t("keyDialog.baseUrlHint")})</span>
            </label>
            <Input
              placeholder="https://api.example.com"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="font-mono text-sm"
            />
            <div className="text-[10px] text-muted-foreground">
              {t("baseUrlHint")}
            </div>
          </div>

          {/* Budget & Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("keyDialog.monthlyBudget")}</label>
              <Input
                type="number"
                placeholder="0.00"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("keyDialog.notes")}</label>
              <Input
                placeholder={t("keyDialog.notesPlaceholder")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{tc("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={!isValid || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {editingKey ? t("keyDialog.updateBtn") : t("keyDialog.addBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
