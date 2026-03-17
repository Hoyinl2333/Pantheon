"use client";

import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { TaskItem } from "./types";

// ---- Task Card ----

export function TaskCard({
  task,
  isExpanded,
  onToggle,
}: {
  task: TaskItem;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const statusStyle = {
    pending: "border-l-gray-400",
    in_progress: "border-l-blue-500",
    completed: "border-l-green-500",
  }[task.status];

  return (
    <div
      className={`border rounded-lg border-l-4 ${statusStyle} p-3 cursor-pointer hover:shadow-sm transition-all bg-card`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">
            #{task.id} {task.subject}
          </div>
          {task.owner && (
            <Badge variant="outline" className="text-xs mt-1">
              {task.owner}
            </Badge>
          )}
          {task.activeForm && task.status === "in_progress" && (
            <div className="text-xs text-blue-500 mt-1 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {task.activeForm}
            </div>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground mt-0.5" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5" />
        )}
      </div>
      {isExpanded && (
        <div className="mt-2 pt-2 border-t space-y-2">
          {task.description && (
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">
              {task.description}
            </div>
          )}
          <div className="flex flex-wrap gap-2 text-xs">
            {task.blockedBy && task.blockedBy.length > 0 && (
              <span className="text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded">
                Blocked by: {task.blockedBy.join(", ")}
              </span>
            )}
            {task.blocks && task.blocks.length > 0 && (
              <span className="text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded">
                Blocks: {task.blocks.join(", ")}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
