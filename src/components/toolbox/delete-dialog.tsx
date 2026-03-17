"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle, X } from "lucide-react";

export interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  serverName: string;
  scope: string;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({ open, onClose, serverName, scope, onConfirm }: DeleteDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-background border rounded-xl shadow-2xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Delete MCP Server
          </h2>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete the MCP server{" "}
            <span className="font-mono font-semibold text-foreground">{serverName}</span> from{" "}
            <span className="font-semibold">{scope === "global" ? "global" : scope}</span> scope?
          </p>
          <p className="text-sm text-red-600 dark:text-red-400 mt-2">
            This action cannot be undone.
          </p>
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
