"use client";

import { cn } from "@/lib/utils";
import { Badge, BadgeProps } from "@/components/ui/badge"; // Import BadgeProps for typing

interface StatusIndicatorProps {
  status:
    | "online"
    | "offline"
    | "maintenance"
    | "pending"
    | "completed"
    | "in-progress"
    | "survey-initiated"
    | "survey-completed"
    | "pending-approval"
    | "ready-for-installation"; // Updated with new statuses
  size?: "sm" | "md" | "lg";
  showDot?: boolean;
  className?: string;
}

// Define the supported badge variants based on Badge component
type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const statusConfig = {
  online: {
    label: "Online",
    color: "bg-green-500",
    badgeVariant: "default" as BadgeVariant,
    textColor: "text-green-700",
    bgColor: "bg-green-50",
  },
  offline: {
    label: "Offline",
    color: "bg-red-500",
    badgeVariant: "destructive" as BadgeVariant,
    textColor: "text-red-700",
    bgColor: "bg-red-50",
  },
  maintenance: {
    label: "Maintenance",
    color: "bg-yellow-500",
    badgeVariant: "secondary" as BadgeVariant,
    textColor: "text-yellow-700",
    bgColor: "bg-yellow-50",
  },
  pending: {
    label: "Pending",
    color: "bg-orange-500",
    badgeVariant: "outline" as BadgeVariant,
    textColor: "text-orange-700",
    bgColor: "bg-orange-50",
  },
  completed: {
    label: "Completed",
    color: "bg-green-500",
    badgeVariant: "default" as BadgeVariant,
    textColor: "text-green-700",
    bgColor: "bg-green-50",
  },
  "in-progress": {
    label: "In Progress",
    color: "bg-blue-500",
    badgeVariant: "secondary" as BadgeVariant,
    textColor: "text-blue-700",
    bgColor: "bg-blue-50",
  },
  "survey-initiated": {
    label: "Survey Initiated",
    color: "bg-blue-300",
    badgeVariant: "secondary" as BadgeVariant,
    textColor: "text-blue-700",
    bgColor: "bg-blue-50",
  },
  "survey-completed": {
    label: "Survey Completed",
    color: "bg-green-600",
    badgeVariant: "default" as BadgeVariant,
    textColor: "text-green-700",
    bgColor: "bg-green-50",
  },
  "pending-approval": {
    label: "Pending Approval",
    color: "bg-yellow-600",
    badgeVariant: "outline" as BadgeVariant,
    textColor: "text-yellow-700",
    bgColor: "bg-yellow-50",
  },
  "ready-for-installation": {
    label: "Ready for Installation",
    color: "bg-purple-500",
    badgeVariant: "secondary" as BadgeVariant,
    textColor: "text-purple-700",
    bgColor: "bg-purple-50",
  },
} as const;

// Default config for invalid statuses
const defaultConfig = {
  label: "Unknown",
  color: "bg-gray-500",
  badgeVariant: "outline" as BadgeVariant,
  textColor: "text-gray-700",
  bgColor: "bg-gray-50",
};

export function StatusIndicator({
  status,
  size = "md",
  showDot = true,
  className,
}: StatusIndicatorProps) {
  // Safely get config, fall back to default if status is invalid
  const config = statusConfig[status] || defaultConfig;

  const dotSize = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  return (
    <Badge
      variant={config.badgeVariant}
      className={cn(
        "flex items-center space-x-2",
        config.bgColor,
        config.textColor,
        className
      )}
    >
      {showDot && (
        <div
          className={cn(
            "rounded-full animate-pulse",
            config.color,
            dotSize[size]
          )}
        />
      )}
      <span>{config.label}</span>
    </Badge>
  );
}
