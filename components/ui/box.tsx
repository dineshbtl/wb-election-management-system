"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Box({
  className,
  children,
  as: Tag = "div",
}: {
  className?: string;
  children?: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
}) {
  return <Tag className={cn(className)}>{children}</Tag>;
}
