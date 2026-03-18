"use client";

import { memo, useEffect, useRef } from "react";
import { Copy, Pencil, Trash2 } from "lucide-react";

export interface ContextMenuAction {
  type: "edit" | "duplicate" | "delete";
  nodeId: string;
}

interface NodeContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  nodeName: string;
  onAction: (action: ContextMenuAction) => void;
  onClose: () => void;
  isZh: boolean;
}

function NodeContextMenuInner({
  x, y, nodeId, nodeName, onAction, onClose, isZh,
}: NodeContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const items = [
    { type: "edit" as const, label: isZh ? "\u7F16\u8F91" : "Edit", icon: Pencil, className: "" },
    { type: "duplicate" as const, label: isZh ? "\u590D\u5236" : "Duplicate", icon: Copy, className: "" },
    { type: "delete" as const, label: isZh ? "\u5220\u9664" : "Delete", icon: Trash2, className: "text-destructive" },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[160px] rounded-lg border bg-popover shadow-lg py-1 animate-in fade-in-0 zoom-in-95"
      style={{ left: x, top: y }}
    >
      <div className="px-3 py-1.5 text-[11px] text-muted-foreground font-medium truncate border-b mb-1">
        {nodeName}
      </div>
      {items.map((item) => (
        <button
          key={item.type}
          className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent transition-colors ${item.className}`}
          onClick={() => {
            onAction({ type: item.type, nodeId });
            onClose();
          }}
        >
          <item.icon className="h-3.5 w-3.5" />
          {item.label}
        </button>
      ))}
    </div>
  );
}

export const NodeContextMenu = memo(NodeContextMenuInner);
