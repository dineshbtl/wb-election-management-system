"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface SelectionBarProps {
  selectedCount: number;
  onClear: () => void;
  action?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  className?: string;
}

export function SelectionBar({
  selectedCount,
  onClear,
  action,
  className,
}: SelectionBarProps) {
  if (selectedCount <= 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-blue-50/80 px-4 py-3 text-sm",
        className
      )}
    >
      <span className="font-medium text-gray-700">
        {selectedCount} selected
      </span>
      <div className="flex items-center gap-2">
        {action && (
          <Button
            variant="primary"
            size="sm"
            onClick={action.onClick}
            disabled={action.disabled}
          >
            {action.label}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>
    </div>
  );
}
