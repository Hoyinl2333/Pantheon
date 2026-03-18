"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Check,
  ArrowLeft,
  Copy,
  FileText,
  FolderOpen,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import type { PipelineNode } from "../types";
import {
  getSkillCategory,
  CATEGORY_OUTPUT_DIR,
  formatSize,
  type FileEntry,
} from "./execution-helpers";

/** Simple file browser for the Outputs tab */
export function OutputFileBrowser({
  node,
  workspacePath,
  isZh,
}: {
  node: PipelineNode | null;
  workspacePath: string | null;
  isZh: boolean;
}) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const category = node ? getSkillCategory(node.skillId) : "utility";
  const outputDir = CATEGORY_OUTPUT_DIR[category] ?? "agent-docs";

  const fetchFiles = useCallback(
    async (subPath: string) => {
      if (!workspacePath) return;
      setLoading(true);
      try {
        const fullPath = subPath
          ? `${workspacePath}/${subPath}`
          : `${workspacePath}/${outputDir}`;
        const res = await fetch(`/api/browse?path=${encodeURIComponent(fullPath)}`);
        const data = await res.json();
        const entries: FileEntry[] = (data.entries ?? [])
          .filter((e: FileEntry) => !e.name.startsWith("."))
          .sort((a: FileEntry, b: FileEntry) => {
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

  // Reset when selected node changes
  useEffect(() => {
    setCurrentPath("");
    setBreadcrumbs([]);
    setPreviewContent(null);
    setPreviewFile(null);
    if (node && node.status === "done") {
      fetchFiles("");
    } else {
      setFiles([]);
    }
  }, [fetchFiles, node?.id, node?.status]);

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
        const filePath = currentPath
          ? `${workspacePath}/${currentPath}/${entry.name}`
          : `${workspacePath}/${outputDir}/${entry.name}`;
        setPreviewFile(entry.name);
        setPreviewLoading(true);
        fetch(`/api/file-preview?path=${encodeURIComponent(filePath)}`)
          .then((res) => res.json())
          .then((data) => setPreviewContent(data.content ?? "(empty)"))
          .catch(() => setPreviewContent("(unable to load file)"))
          .finally(() => setPreviewLoading(false));
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

  // No node selected state
  if (!node) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {isZh
              ? "选择一个已完成的节点以浏览输出文件"
              : "Select a completed node to browse outputs"}
          </p>
        </div>
      </div>
    );
  }

  if (!workspacePath) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p className="text-sm">
          {isZh
            ? "未找到工作区。运行 Pipeline 后才能查看输出。"
            : "No workspace found. Run the pipeline first to see outputs."}
        </p>
      </div>
    );
  }

  if (node.status !== "done") {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">
            {isZh
              ? "该节点尚未完成，完成后可查看输出"
              : "This node has not completed yet"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Breadcrumb bar */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b bg-muted/30 text-[11px] shrink-0">
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Loading...</span>
          </div>
        ) : previewContent !== null ? (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-1 px-3 py-1 border-b shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[10px] px-2 gap-1"
                onClick={handleCopyContent}
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied
                  ? isZh ? "已复制" : "Copied"
                  : isZh ? "复制内容" : "Copy"}
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
              {isZh ? "此目录下暂无文件" : "No files in this directory"}
            </p>
          </div>
        ) : (
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
    </div>
  );
}
