"use client";

import type React from "react";

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function PageLayout({ children, className = "" }: PageLayoutProps) {
  return (
    <div
      className={`min-h-screen min-h-dvh bg-gradient-to-b from-blue-50 to-green-50 relative overflow-x-hidden ${className}`}
    >
      {/* Background effects - same as login page (full page) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 sm:top-20 left-10 sm:left-20 w-64 sm:w-96 h-64 sm:h-96 bg-gradient-to-br from-blue-200/30 to-green-200/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-20 sm:top-40 right-10 sm:right-20 w-64 sm:w-96 h-64 sm:h-96 bg-gradient-to-br from-green-200/30 to-blue-200/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 sm:left-40 w-64 sm:w-96 h-64 sm:h-96 bg-gradient-to-br from-blue-200/30 to-green-200/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
      </div>
      <div className="relative z-10 flex h-full min-h-0 min-w-0 flex-col">
        {children}
      </div>
    </div>
  );
}
