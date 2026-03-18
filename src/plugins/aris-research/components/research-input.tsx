"use client";

import { useState, useRef, useCallback, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  LinkIcon,
  X,
  Plus,
  FileText,
} from "lucide-react";
import type { ProgramAttachment } from "../types";
import { generateAttachmentId, ACCEPT_FILE_TYPES } from "../lib/setup-helpers";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ResearchInputProps {
  isZh: boolean;
  researchDirection: string;
  onResearchDirectionChange: (value: string) => void;
  pipelineName: string;
  onPipelineNameChange: (value: string) => void;
  onNameManuallyEdited: () => void;
  attachments: ProgramAttachment[];
  onAddAttachment: (att: ProgramAttachment) => void;
  onRemoveAttachment: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ResearchInput({
  isZh,
  researchDirection,
  onResearchDirectionChange,
  pipelineName,
  onPipelineNameChange,
  onNameManuallyEdited,
  attachments,
  onAddAttachment,
  onRemoveAttachment,
}: ResearchInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        const url = URL.createObjectURL(file);
        onAddAttachment({
          id: generateAttachmentId(),
          name: file.name,
          type: file.type.startsWith("image/") ? "image" : "file",
          url,
          mimeType: file.type,
          addedAt: new Date().toISOString(),
        });
      }
    },
    [onAddAttachment],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      for (const file of files) {
        const url = URL.createObjectURL(file);
        onAddAttachment({
          id: generateAttachmentId(),
          name: file.name,
          type: file.type.startsWith("image/") ? "image" : "file",
          url,
          mimeType: file.type,
          addedAt: new Date().toISOString(),
        });
      }
    },
    [onAddAttachment],
  );

  const handleAddLink = useCallback(() => {
    const url = linkInputRef.current?.value.trim();
    if (!url) return;
    onAddAttachment({
      id: generateAttachmentId(),
      name: url.replace(/^https?:\/\//, "").slice(0, 60),
      type: "link",
      url,
      addedAt: new Date().toISOString(),
    });
    if (linkInputRef.current) linkInputRef.current.value = "";
  }, [onAddAttachment]);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">
        {isZh ? "研究设置" : "Research Context"}
      </h2>

      {/* Research direction */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          {isZh ? "研究方向" : "Research Direction"}{" "}
          <span className="text-red-500">*</span>
        </label>
        <textarea
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y min-h-[100px]"
          value={researchDirection}
          onChange={(e) => onResearchDirectionChange(e.target.value)}
          placeholder={
            isZh
              ? "例：Exploring fine-grained recognition in Vision-Language Models using compositional contrastive learning..."
              : "e.g. Exploring fine-grained recognition in Vision-Language Models using compositional contrastive learning..."
          }
        />
      </div>

      {/* Pipeline name */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          {isZh ? "流水线名称" : "Pipeline Name"}
        </label>
        <Input
          className="h-9"
          value={pipelineName}
          onChange={(e) => {
            onPipelineNameChange(e.target.value);
            onNameManuallyEdited();
          }}
          placeholder={
            isZh ? "自动从研究方向生成" : "Auto-generated from research direction"
          }
        />
      </div>

      {/* Attachments */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          {isZh ? "附件（可选）" : "Attachments (optional)"}
        </label>

        {/* Drop zone */}
        <div
          className={`
            border-2 border-dashed rounded-md p-4 text-center transition-colors cursor-pointer
            ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-muted-foreground/40"}
          `}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-xs text-muted-foreground">
            {isZh
              ? "拖拽文件到这里（PDF, JSONL, CSV, Python...）"
              : "Drop files here (PDF, JSONL, CSV, Python...)"}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept={ACCEPT_FILE_TYPES}
            onChange={handleFileSelect}
          />
        </div>

        {/* Link input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              ref={linkInputRef}
              className="h-8 text-xs pl-8"
              placeholder={
                isZh ? "添加链接 (arXiv, GitHub...)" : "Add link (arXiv, GitHub...)"
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddLink();
              }}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2.5 text-xs"
            onClick={handleAddLink}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Attachment chips */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {attachments.map((att) => (
              <Badge
                key={att.id}
                variant={att.type === "link" ? "outline" : "secondary"}
                className="text-[11px] px-2 py-0.5 gap-1"
              >
                {att.type === "link" ? (
                  <LinkIcon className="h-3 w-3" />
                ) : (
                  <FileText className="h-3 w-3" />
                )}
                <span className="max-w-[180px] truncate">{att.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveAttachment(att.id);
                  }}
                  className="hover:text-red-500 ml-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
