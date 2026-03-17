"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  FileText,
  FolderOpen,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import type { PipelineNode } from "../types";
import { ARIS_SKILLS } from "../skill-data";

interface FileEntry {
  name: string;
  type: "file" | "directory";
  size?: number;
  modified?: string;
}

interface NodeOutputPanelProps {
  node: PipelineNode;
  workspacePath: string | null;
  onClose: () => void;
  isZh: boolean;
}

/** Map skill category to its output directory */
const CATEGORY_OUTPUT_DIR: Record<string, string> = {
  research: "agent-docs/knowledge",
  workflow: "agent-docs/plan",
  experiment: "experiments",
  paper: "paper",
  utility: "agent-docs",
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function NodeOutputPanel({
  node,
  workspacePath,
  onClose,
  isZh,
}: NodeOutputPanelProps) {
  const skill = ARIS_SKILLS.find((s) => s.id === node.skillId);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Determine which directory to browse based on skill category
  const outputDir = skill ? CATEGORY_OUTPUT_DIR[skill.category] ?? "agent-docs" : "agent-docs";

  const fetchFiles = useCallback(
    async (subPath: string) => {
      if (!workspacePath) return;
      setLoading(true);
      try {
        const fullPath = subPath
          ? `${workspacePath}/${subPath}`
          : `${workspacePath}/${outputDir}`;
        const res = await fetch(
          `/api/browse?path=${encodeURIComponent(fullPath)}`
        );
        const data = await res.json();
        const entries: FileEntry[] = (data.entries ?? [])
          .filter((e: FileEntry) => !e.name.startsWith("."))
          .sort((a: FileEntry, b: FileEntry) => {
            // Directories first, then files
            if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
        setFiles(entries);
      } catch {
        setFiles([]);
      }
      setLoading(false);
    },
    [workspacePath, outputDir]
  );

  // Initial fetch
  useEffect(() => {
    setCurrentPath("");
    setBreadcrumbs([]);
    setPreviewContent(null);
    setPreviewFile(null);
    fetchFiles("");
  }, [fetchFiles, node.id]);

  const handleNavigate = useCallback(
    (entry: FileEntry) => {
      if (entry.type === "directory") {
        const newPath = currentPath
          ? `${currentPath}/${entry.name}`
          : `${outputDir}/${entry.name}`;
        setCurrentPath(newPath);
        setBreadcrumbs((prev) => [...prev, entry.name]);
        setPreviewContent(null);
        setPreviewFile(null);
        fetchFiles(newPath);
      } else {
        // Preview file
        const filePath = currentPath
          ? `${workspacePath}/${currentPath}/${entry.name}`
          : `${workspacePath}/${outputDir}/${entry.name}`;
        setPreviewFile(entry.name);
        setPreviewLoading(true);
        fetch(
          `/api/file-preview?path=${encodeURIComponent(filePath)}`
        )
          .then((res) => res.json())
          .then((data) => {
            setPreviewContent(data.content ?? "(empty)");
          })
          .catch(() => {
            setPreviewContent("(unable to load file)");
          })
          .finally(() => {
            setPreviewLoading(false);
          });
      }
    },
    [currentPath, outputDir, workspacePath, fetchFiles]
  );

  const handleGoBack = useCallback(() => {
    if (previewContent !== null) {
      setPreviewContent(null);
      setPreviewFile(null);
      return;
    }
    const newBreadcrumbs = breadcrumbs.slice(0, -1);
    setBreadcrumbs(newBreadcrumbs);
    const newPath =
      newBreadcrumbs.length > 0
        ? `${outputDir}/${newBreadcrumbs.join("/")}`
        : "";
    setCurrentPath(newPath);
    fetchFiles(newPath);
  }, [breadcrumbs, outputDir, fetchFiles, previewContent]);

  const handleCopyContent = useCallback(() => {
    if (previewContent) {
      navigator.clipboard.writeText(previewContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [previewContent]);

  const handleOpenFolder = useCallback(() => {
    if (!workspacePath) return;
    const fullPath = currentPath
      ? `${workspacePath}/${currentPath}`
      : `${workspacePath}/${outputDir}`;
    fetch(`/api/browse?open=${encodeURIComponent(fullPath)}`).catch(() => {});
  }, [workspacePath, currentPath, outputDir]);

  if (!skill) return null;

  return (
    <div className="w-[320px] border-l bg-background flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-green-500 shrink-0" />
            <h3 className="text-sm font-semibold truncate">
              {isZh ? "输出文件" : "Outputs"}
            </h3>
            <Badge
              variant="secondary"
              className="text-[9px] px-1.5 py-0 bg-green-500/10 text-green-600"
            >
              {isZh ? skill.nameZh : skill.name}
            </Badge>
          </div>
          <code className="text-[10px] text-muted-foreground font-mono">
            {outputDir}/
          </code>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 shrink-0"
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* No workspace warning */}
      {!workspacePath && (
        <div className="p-4 text-center text-sm text-muted-foreground">
          {isZh
            ? "未找到工作区。运行 Pipeline 后才能查看输出。"
            : "No workspace found. Run the pipeline first to see outputs."}
        </div>
      )}

      {/* Breadcrumb + navigation */}
      {workspacePath && (
        <div className="flex items-center gap-1 px-3 py-1.5 border-b bg-muted/30 text-[11px]">
          {(breadcrumbs.length > 0 || previewContent !== null) && (
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0"
              onClick={handleGoBack}
            >
              <ArrowLeft className="h-3 w-3" />
            </Button>
          )}
          <span className="text-muted-foreground truncate flex-1">
            {previewFile
              ? previewFile
              : breadcrumbs.length > 0
                ? breadcrumbs.join(" / ")
                : outputDir}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-5 w-5 p-0"
            onClick={handleOpenFolder}
            title={isZh ? "打开文件夹" : "Open folder"}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Content area */}
      {workspacePath && (
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Loading...</span>
            </div>
          ) : previewContent !== null ? (
            /* File preview */
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-1 px-3 py-1 border-b">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[10px] px-2 gap-1"
                  onClick={handleCopyContent}
                >
                  {copied ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copied
                    ? isZh
                      ? "已复制"
                      : "Copied"
                    : isZh
                      ? "复制内容"
                      : "Copy"}
                </Button>
              </div>
              {previewLoading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <pre className="flex-1 p-3 text-[11px] font-mono whitespace-pre-wrap break-words leading-relaxed text-foreground/90 overflow-y-auto">
                  {previewContent}
                </pre>
              )}
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">
                {isZh
                  ? "此目录下暂无文件"
                  : "No files in this directory"}
              </p>
            </div>
          ) : (
            /* File list */
            <div className="divide-y">
              {files.map((entry) => (
                <button
                  key={entry.name}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-accent/50 transition-colors"
                  onClick={() => handleNavigate(entry)}
                >
                  {entry.type === "directory" ? (
                    <FolderOpen className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  ) : (
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-xs font-medium truncate flex-1">
                    {entry.name}
                  </span>
                  {entry.size != null && entry.type === "file" && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatSize(entry.size)}
                    </span>
                  )}
                  {entry.type === "directory" && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
