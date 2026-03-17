"use client";

import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { TaskCard } from "./task-board";
import type { TaskItem } from "./types";

interface TaskKanbanProps {
  filteredTasks: TaskItem[];
  expandedTasks: Set<string>;
  onToggleTask: (taskId: string) => void;
}

export function TaskKanban({
  filteredTasks,
  expandedTasks,
  onToggleTask,
}: TaskKanbanProps) {
  const t = useTranslations("team");

  const columns = [
    {
      key: "pending" as const,
      label: t("taskStatus.pending"),
      color: "text-gray-500",
    },
    {
      key: "in_progress" as const,
      label: t("taskStatus.inProgress"),
      color: "text-blue-500",
    },
    {
      key: "completed" as const,
      label: t("taskStatus.completed"),
      color: "text-green-500",
    },
  ] as const;

  return (
    <div className="flex-1 overflow-auto p-3 sm:p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:h-full">
        {columns.map((col) => {
          const colTasks = filteredTasks.filter(
            (task) => task.status === col.key
          );
          return (
            <div key={col.key} className="flex flex-col">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                <span className={`text-sm font-semibold ${col.color}`}>
                  {col.label}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {colTasks.length}
                </Badge>
              </div>
              <div className="flex-1 overflow-auto space-y-2">
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isExpanded={expandedTasks.has(task.id)}
                    onToggle={() => onToggleTask(task.id)}
                  />
                ))}
                {colTasks.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-6">
                    {t("empty")}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
