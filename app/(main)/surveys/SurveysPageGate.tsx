"use client";

import dynamic from "next/dynamic";

const SurveysPageClient = dynamic(
  () => import("./SurveysPageClient"),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4 sm:space-y-6 max-w-full min-w-0 p-4 sm:p-6">
        <div className="h-9 w-56 max-w-full bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
        <div className="flex gap-3 overflow-hidden pb-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="min-w-[200px] h-32 bg-gray-100 rounded-xl animate-pulse shrink-0"
            />
          ))}
        </div>
        <div className="h-11 w-full max-w-md bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-[min(420px,50vh)] bg-gray-50 rounded-xl border border-gray-100 animate-pulse" />
      </div>
    ),
  },
);

export default function SurveysPageGate() {
  return <SurveysPageClient />;
}
