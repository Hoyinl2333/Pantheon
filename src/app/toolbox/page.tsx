"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/toast";
import { AgentDialog } from "@/components/toolbox/agent-dialog";
import { RuleDialog } from "@/components/toolbox/rule-dialog";
import { MCPTab } from "@/components/toolbox/mcp-tab";
import { SkillsTab } from "@/components/toolbox/skills-tab";
import { HooksTab } from "@/components/toolbox/hooks-tab";
import { AgentsTab } from "@/components/toolbox/agents-tab";
import { RulesTab } from "@/components/toolbox/rules-tab";
import { AiCreatorDialog } from "@/components/toolbox/ai-creator-dialog";
import { ExportDialog, ImportDialog } from "@/components/toolbox/import-export-dialog";
import { MCPServerDialog } from "@/components/toolbox/mcp-server-dialog";
import { MarketplaceInstallDialog } from "@/components/toolbox/marketplace-dialog";
import { DeleteConfirmDialog } from "@/components/toolbox/delete-dialog";
import { HookDialog } from "@/components/toolbox/hook-dialog";
import { HelpDialog } from "@/components/toolbox/help-dialog";
import {
  Wrench, Plug, Sparkles, Command, Shield, Bot, BookOpen,
  RefreshCw, HelpCircle, Wand2,
  Download, Upload,
} from "lucide-react";
import type {
  ToolboxData,
  HealthStatus,
} from "@/components/toolbox/types";
import { useTranslations } from "next-intl";

// ---- Summary Stats ----

function SummaryStats({ data }: { data: ToolboxData }) {
  const t = useTranslations("toolbox");
  const mcpCount = Object.keys(data.mcp.global).length +
    data.mcp.projects.reduce((s, p) => s + Object.keys(p.servers).length, 0);

  const stats = [
    { icon: Plug, label: t("stats.mcpServers"), value: mcpCount, color: "text-blue-500" },
    { icon: Sparkles, label: t("stats.skills"), value: data.skills.length, color: "text-amber-500" },
    { icon: Command, label: t("stats.commands"), value: data.commands.length, color: "text-purple-500" },
    { icon: Shield, label: t("stats.hooks"), value: data.hooks.length, color: "text-green-500" },
    { icon: Bot, label: t("stats.agents"), value: data.agents.length, color: "text-pink-500" },
    { icon: BookOpen, label: t("stats.rules"), value: data.rules.length, color: "text-cyan-500" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
      {stats.map(({ icon: Icon, label, value, color }) => (
        <Card key={label} className="text-center">
          <CardContent className="py-3 px-2">
            <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-[10px] text-muted-foreground">{label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---- Main Page ----

export default function ToolboxPage() {
  const t = useTranslations("toolbox");
  const tc = useTranslations("common");
  const [data, setData] = useState<ToolboxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<Record<string, HealthStatus>>({});
  const [showHelp, setShowHelp] = useState(false);
  const [showAiCreator, setShowAiCreator] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch("/api/toolbox")
      .then((r) => r.json())
      .then((d: ToolboxData) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const checkHealth = useCallback((name: string, command: string) => {
    setHealth((prev) => ({ ...prev, [name]: "checking" }));
    fetch(`/api/toolbox/mcp/health?name=${encodeURIComponent(name)}&command=${encodeURIComponent(command)}`)
      .then((r) => r.json())
      .then((d: { status: string }) => {
        setHealth((prev) => ({ ...prev, [name]: d.status as HealthStatus }));
      })
      .catch(() => {
        setHealth((prev) => ({ ...prev, [name]: "error" }));
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-lg">{t("failedToLoad")}</h2>
      </div>
    );
  }

  const mcpCount = Object.keys(data.mcp.global).length + data.mcp.projects.reduce((s, p) => s + Object.keys(p.servers).length, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6" />
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" className="gap-1.5" onClick={() => setShowAiCreator(true)}>
            <Wand2 className="h-4 w-4" /> <span className="hidden sm:inline">{t("aiCreate")}</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4" /> <span className="hidden sm:inline">{tc("import")}</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowExport(true)}>
            <Download className="h-4 w-4" /> <span className="hidden sm:inline">{tc("export")}</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowHelp(true)}>
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <SummaryStats data={data} />

      {/* Tabs */}
      <Tabs defaultValue="mcp">
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="mcp" className="gap-1.5 touch-manipulation">
            <Plug className="h-3.5 w-3.5" /> {t("tabs.mcp")}
            {mcpCount > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-0.5 hidden sm:inline-flex">{mcpCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="skills" className="gap-1.5 touch-manipulation">
            <Sparkles className="h-3.5 w-3.5" /> {t("tabs.skills")}
            {(data.skills.length + data.commands.length) > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-0.5 hidden sm:inline-flex">{data.skills.length + data.commands.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="hooks" className="gap-1.5 touch-manipulation">
            <Shield className="h-3.5 w-3.5" /> {t("tabs.hooks")}
            {data.hooks.length > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-0.5 hidden sm:inline-flex">{data.hooks.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="agents" className="gap-1.5 touch-manipulation">
            <Bot className="h-3.5 w-3.5" /> {t("tabs.agents")}
            {data.agents.length > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-0.5 hidden sm:inline-flex">{data.agents.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5 touch-manipulation">
            <BookOpen className="h-3.5 w-3.5" /> {t("tabs.rules")}
            {data.rules.length > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-0.5 hidden sm:inline-flex">{data.rules.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mcp">
          <MCPTab
            data={data.mcp}
            health={health}
            onCheckHealth={checkHealth}
            onRefresh={fetchData}
            MCPServerDialog={MCPServerDialog}
            MarketplaceInstallDialog={MarketplaceInstallDialog}
            DeleteConfirmDialog={DeleteConfirmDialog}
          />
        </TabsContent>
        <TabsContent value="skills">
          <SkillsTab skills={data.skills} commands={data.commands} onRefresh={fetchData} />
        </TabsContent>
        <TabsContent value="hooks">
          <HooksTab hooks={data.hooks} onRefresh={fetchData} HookDialog={HookDialog} />
        </TabsContent>
        <TabsContent value="agents">
          <AgentsTab agents={data.agents} onRefresh={fetchData} AgentDialog={AgentDialog} />
        </TabsContent>
        <TabsContent value="rules">
          <RulesTab rules={data.rules} onRefresh={fetchData} RuleDialog={RuleDialog} />
        </TabsContent>
      </Tabs>

      {/* Help Dialog */}
      <HelpDialog open={showHelp} onClose={() => setShowHelp(false)} />

      {/* AI Creator Dialog */}
      <AiCreatorDialog
        open={showAiCreator}
        onClose={() => setShowAiCreator(false)}
        onSuccess={fetchData}
      />

      {/* Export Dialog */}
      <ExportDialog
        open={showExport}
        onClose={() => setShowExport(false)}
        skills={data.skills}
        agents={data.agents}
        rules={data.rules}
      />

      {/* Import Dialog */}
      <ImportDialog
        open={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
