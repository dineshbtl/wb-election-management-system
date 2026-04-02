"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spin, message } from "antd";

export default function PublicNetworkSpeedTest() {
  const [result, setResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const BACKEND_URL = "https://speedtest-ylrr.onrender.com";

  // -------------------------
  // LATENCY TEST (Cloudflare)
  // -------------------------
  const testLatency = async (): Promise<number> => {
    const pings: number[] = [];

    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      await fetch("https://speed.cloudflare.com/cdn-cgi/trace", {
        cache: "no-store",
      });
      const end = performance.now();
      pings.push(end - start);
    }

    pings.sort((a, b) => a - b);
    return pings[Math.floor(pings.length / 2)];
  };

  // -------------------------
  // DOWNLOAD TEST (Hetzner)
  // -------------------------
  const testDownload = async (): Promise<number> => {
    const size = 50_000_000;

    const start = performance.now();

    const response = await fetch(
      `https://speed.cloudflare.com/__down?bytes=${size}`,
      { cache: "no-store" },
    );

    console.log("Download response status:", response.status);

    if (!response.ok) {
      throw new Error("Download request failed");
    }

    const blob = await response.blob();
    const end = performance.now();

    const duration = (end - start) / 1000;
    const bits = blob.size * 8;

    return bits / duration / (1024 * 1024);
  };

  // -------------------------
  // UPLOAD TEST (httpbin)
  // -------------------------
  const testUpload = async (): Promise<number> => {
    const size = 5 * 1024 * 1024;
    const data = new Uint8Array(size);

    const start = performance.now();

    const response = await fetch(`${BACKEND_URL}/upload-test`, {
      method: "POST",
      body: data,
      headers: {
        "Content-Type": "application/octet-stream",
      },
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    const end = performance.now();
    const duration = (end - start) / 1000;
    const bits = size * 8;

    return bits / duration / (1024 * 1024);
  };

  const runTest = async () => {
    setTesting(true);
    message.info("Testing internet speed...");

    try {
      console.log("Starting latency test...");
      const latency = await testLatency();
      console.log("Latency result:", latency);

      console.log("Starting download test...");
      const download = await testDownload();
      console.log("Download result:", download);

      console.log("Starting upload test...");
      const upload = await testUpload();
      console.log("Upload result:", upload);

      setResult({
        latency: Math.round(latency),
        download: download.toFixed(2),
        upload: upload.toFixed(2),
      });

      message.success("Speed Test Completed");
    } catch (error: any) {
      console.error("FULL ERROR OBJECT:", error);

      if (error instanceof TypeError) {
        console.error("Likely CORS or Network Block Issue");
      }

      message.error("Test failed. Check console.");
    }

    setTesting(false);
  };

  return (
    <div className="border rounded-lg p-6 bg-gray-50 space-y-4">
      <h3 className="text-lg font-semibold">Public Network Speed Test</h3>

      <Button
        onClick={runTest}
        disabled={testing}
        className="w-full bg-blue-600 text-white"
      >
        {testing ? (
          <span className="flex items-center justify-center gap-2">
            <Spin size="small" /> Testing...
          </span>
        ) : (
          "Run Speed Test"
        )}
      </Button>

      {result && (
        <div className="border rounded p-4 bg-white shadow-sm space-y-2">
          <p>Download: {result.download} Mbps</p>
          <p>Upload: {result.upload} Mbps</p>
          <p>Latency: {result.latency} ms</p>
        </div>
      )}
    </div>
  );
}
