"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";
import type { Pipeline, ResearchProgram, ProgramAttachment } from "../types";
import { getPipelines, deletePipeline } from "../pipeline-store";
import { truncate } from "../lib/setup-helpers";
import { TemplateGallery } from "./template-gallery";
import { ResearchInput } from "./research-input";
import { RecentPipelines } from "./recent-pipelines";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SetupWizardProps {
  isZh: boolean;
  onStartDesign: (config: {
    name: string;
    program: ResearchProgram;
    templateId: string | null;
  }) => void;
  onLoadPipeline: (pipelineId: string) => void;
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function SetupWizard({
  isZh,
  onStartDesign,
  onLoadPipeline,
  onBack,
}: SetupWizardProps) {
  // --- State ---
  const [researchDirection, setResearchDirection] = useState("");
  const [pipelineName, setPipelineName] = useState("");
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false);
  const [attachments, setAttachments] = useState<ProgramAttachment[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );

  const [savedPipelines, setSavedPipelines] = useState<Pipeline[]>([]);
  const [loadingPipelines, setLoadingPipelines] = useState(true);

  // --- Auto-generate name from research direction ---
  useEffect(() => {
    if (!nameManuallyEdited && researchDirection.trim()) {
      setPipelineName(truncate(researchDirection, 30));
    }
  }, [researchDirection, nameManuallyEdited]);

  // --- Load saved pipelines ---
  useEffect(() => {
    let cancelled = false;
    setLoadingPipelines(true);
    getPipelines().then((pipelines) => {
      if (!cancelled) {
        setSavedPipelines(pipelines.filter((p) => !p.isTemplate));
        setLoadingPipelines(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Attachment handlers ---
  const addAttachment = useCallback((att: ProgramAttachment) => {
    setAttachments((prev) => [...prev, att]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // --- Template selection (toggle) ---
  const handleSelectTemplate = useCallback((id: string | null) => {
    setSelectedTemplateId((prev) => (prev === id ? null : id));
  }, []);

  // --- Delete saved pipeline ---
  const handleDeletePipeline = useCallback(async (id: string) => {
    await deletePipeline(id);
    setSavedPipelines((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // --- Submit ---
  const canStart = researchDirection.trim().length > 0;

  const handleStartDesign = useCallback(() => {
    if (!canStart) return;
    onStartDesign({
      name: pipelineName.trim() || truncate(researchDirection, 30),
      program: {
        brief: researchDirection,
        attachments,
        templateId: selectedTemplateId,
      },
      templateId: selectedTemplateId,
    });
  }, [
    canStart,
    pipelineName,
    researchDirection,
    attachments,
    selectedTemplateId,
    onStartDesign,
  ]);

  // --- Render ---
  return (
    <div className="w-full h-full flex flex-col bg-background">
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-[800px] mx-auto px-4 py-6 pb-4 space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {isZh ? "创建自由编排流水线" : "Create Custom Pipeline"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isZh
                ? "描述你的研究方向，选择一个起点模板，然后进入可视化设计器"
                : "Describe your research direction, pick a starting template, then enter the visual designer"}
            </p>
          </div>

          {/* Section 1: Research Context */}
          <ResearchInput
            isZh={isZh}
            researchDirection={researchDirection}
            onResearchDirectionChange={setResearchDirection}
            pipelineName={pipelineName}
            onPipelineNameChange={setPipelineName}
            onNameManuallyEdited={() => setNameManuallyEdited(true)}
            attachments={attachments}
            onAddAttachment={addAttachment}
            onRemoveAttachment={removeAttachment}
          />

          {/* Section 2: Choose Starting Point */}
          <TemplateGallery
            isZh={isZh}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={handleSelectTemplate}
          />

          {/* Section 3: Recent Pipelines */}
          <RecentPipelines
            isZh={isZh}
            pipelines={savedPipelines}
            loading={loadingPipelines}
            onLoadPipeline={onLoadPipeline}
            onDeletePipeline={handleDeletePipeline}
          />
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="shrink-0 border-t bg-background px-4 py-3">
        <div className="max-w-[800px] mx-auto flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            {isZh ? "返回" : "Cancel"}
          </Button>
          <Button
            onClick={handleStartDesign}
            disabled={!canStart}
            className="gap-1.5"
          >
            {isZh ? "进入设计" : "Enter Designer"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
