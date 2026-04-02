"use client";

import type React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface PillButtonProps {
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "dark" | "accent" | "ghost";
  size?: "sm" | "md" | "lg";
  active?: boolean;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function PillButton({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  active = false,
  className,
  onClick,
  disabled = false,
}: PillButtonProps) {
  const variants = {
    primary: active
      ? "bg-gradient-to-r from-blue-500 to-blue-500 text-white shadow-lg"
      : "bg-white/70 backdrop-blur-md text-gray-700 hover:bg-white/80 border border-white/30",
    secondary: active
      ? "bg-white/90 text-gray-900 shadow-md"
      : "bg-white/50 text-gray-600 hover:bg-white/70 border border-white/20",
    dark: active
      ? "bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-lg"
      : "bg-gray-700/80 text-gray-200 hover:bg-gray-700/90 backdrop-blur-md",
    accent: active
      ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg"
      : "bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] text-white hover:from-[#2d7ae8] hover:to-[#1976D2] border-0",
    ghost: active
      ? "bg-gray-100/80 text-gray-900"
      : "text-gray-600 hover:bg-gray-100/50",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
  };

  return (
    <motion.button
      type={type}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2",
        variants[variant],
        sizes[size],
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </motion.button>
  );
}
