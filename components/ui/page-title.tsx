"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PageTitleProps {
  title: string;
  subtitle?: string;
  className?: string;
  children?: React.ReactNode;
}

export function PageTitle({
  title,
  subtitle,
  className,
  children,
}: PageTitleProps) {
  return (
    <div
      className={cn(
        "mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
        className
      )}
    >
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}
