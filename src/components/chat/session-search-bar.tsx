"use client";

import { Button } from "@/components/ui/button";
import { Search, X, ChevronsUp, ChevronsDown } from "lucide-react";

interface SessionSearchBarProps {
  convSearch: string;
  onSearchChange: (value: string) => void;
  convSearchMatch: number;
  onSearchMatchChange: (value: number) => void;
  matchedCount: number;
  placeholder: string;
}

export function SessionSearchBar({
  convSearch,
  onSearchChange,
  convSearchMatch,
  onSearchMatchChange,
  matchedCount,
  placeholder,
}: SessionSearchBarProps) {
  const hasSearch = convSearch.trim().length > 0;

  return (
    <div className="border-b px-4 py-1.5 flex items-center gap-2 flex-shrink-0 bg-muted/10">
      <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      <input
        type="text"
        placeholder={placeholder}
        value={convSearch}
        onChange={(e) => { onSearchChange(e.target.value); onSearchMatchChange(0); }}
        className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/60"
      />
      {hasSearch && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-xs text-muted-foreground font-mono">
            {matchedCount > 0 ? `${convSearchMatch + 1}/${matchedCount}` : "0/0"}
          </span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={matchedCount === 0}
            onClick={() => onSearchMatchChange((convSearchMatch - 1 + matchedCount) % matchedCount)}>
            <ChevronsUp className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={matchedCount === 0}
            onClick={() => onSearchMatchChange((convSearchMatch + 1) % matchedCount)}>
            <ChevronsDown className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { onSearchChange(""); onSearchMatchChange(0); }}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
