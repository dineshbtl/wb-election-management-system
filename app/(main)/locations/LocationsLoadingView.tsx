"use client";

import { Spin } from "antd";

export function LocationsLoadingView() {
  return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Spin size="large" />
    </div>
  );
}
