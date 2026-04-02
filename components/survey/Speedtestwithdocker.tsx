"use client";

import { useState, useEffect, useRef } from "react";

interface SpeedTestResult {
  downloadSpeed: number;
  uploadSpeed: number;
  ping: number;
  jitter: number;
  isp?: string;
  testDate: string;
}

export default function SpeedTestWithDocker() {
  const [testing, setTesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [result, setResult] = useState<SpeedTestResult | null>(null);
  const [phase, setPhase] = useState<
    "idle" | "ping" | "download" | "upload" | "complete"
  >("idle");
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "speedtest-result") {
        const testData: SpeedTestResult = {
          downloadSpeed: parseFloat(event.data.data.dlSpeed || 0).toFixed(2),
          uploadSpeed: parseFloat(event.data.data.ulSpeed || 0).toFixed(2),
          ping: parseFloat(event.data.data.ping || 0).toFixed(2),
          jitter: parseFloat(event.data.data.jitter || 0).toFixed(2),
          isp: event.data.data.isp || "Unknown",
          testDate: new Date().toISOString(),
        };

        setResult(testData);
        setTesting(false);
        setPhase("complete");
        console.log("✅ Speed Test Complete:", testData);
      }

      if (event.data?.type === "speedtest-progress") {
        const data = event.data.data;
        if (data.testState === 3) {
          setPhase("download");
          setCurrentSpeed(parseFloat(data.dlSpeed || 0).toFixed(2));
          setProgress(20 + (data.progress || 0) * 0.4);
        } else if (data.testState === 4) {
          setPhase("upload");
          setCurrentSpeed(parseFloat(data.ulSpeed || 0).toFixed(2));
          setProgress(60 + (data.progress || 0) * 0.4);
        } else if (data.testState === 2) {
          setPhase("ping");
          setProgress(10);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const startTest = () => {
    setTesting(true);
    setPhase("ping");
    setProgress(0);
    setResult(null);
    setCurrentSpeed(0);
    setSaveStatus("idle");

    if (iframeRef.current) {
      iframeRef.current.src = "http://172.30.0.200:8080?" + Date.now();
    }
  };

  const saveToStrapi = async () => {
    if (!result) return;
    setSaveStatus("saving");

    try {
      const response = await fetch(
        "http://172.30.0.200:1337/api/speed-test-results",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer YOUR_STRAPI_TOKEN",
          },
          body: JSON.stringify({
            data: {
              downloadSpeed: result.downloadSpeed,
              uploadSpeed: result.uploadSpeed,
              ping: result.ping,
              jitter: result.jitter,
              isp: result.isp,
              testDate: result.testDate,
            },
          }),
        },
      );

      if (!response.ok) throw new Error("Failed to save");
      setSaveStatus("success");
    } catch (error) {
      console.error("Save error:", error);
      setSaveStatus("error");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">
          🚀 Network Speed Test
        </h2>
        <p className="text-gray-600 mt-2">Test your internet speed</p>
      </div>

      {/* Hidden Iframe - Runs test, sends results via postMessage */}
      <iframe
        ref={iframeRef}
        src="about:blank"
        className="hidden"
        style={{ display: "none" }}
        title="Speed Test"
      />

      {!testing && !result && (
        <button
          onClick={startTest}
          className="w-full py-6 rounded-xl font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition shadow-lg"
        >
          🔥 START SPEED TEST
        </button>
      )}

      {testing && (
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="text-6xl font-bold text-blue-600 mb-2">
              {currentSpeed}
            </div>
            <div className="text-gray-500 text-lg">Mbps</div>
          </div>
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>
                {phase === "ping" && "📡 Testing Ping..."}
                {phase === "download" && "⬇️ Testing Download..."}
                {phase === "upload" && "⬆️ Testing Upload..."}
              </span>
              <span className="font-bold">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-6 text-center">
            <h3 className="text-2xl font-bold">✅ Test Complete</h3>
            <p className="text-sm opacity-90 mt-1">
              {new Date(result.testDate).toLocaleString()}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <div className="text-4xl font-bold text-blue-600">
                {result.downloadSpeed}
              </div>
              <div className="text-xs text-gray-500 mt-1">Mbps</div>
              <div className="text-sm font-medium text-gray-700 mt-1">
                ⬇️ Download
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-xl">
              <div className="text-4xl font-bold text-purple-600">
                {result.uploadSpeed}
              </div>
              <div className="text-xs text-gray-500 mt-1">Mbps</div>
              <div className="text-sm font-medium text-gray-700 mt-1">
                ⬆️ Upload
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <div className="text-4xl font-bold text-green-600">
                {result.ping}
              </div>
              <div className="text-xs text-gray-500 mt-1">ms</div>
              <div className="text-sm font-medium text-gray-700 mt-1">
                📡 Ping
              </div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-xl">
              <div className="text-4xl font-bold text-orange-600">
                {result.jitter}
              </div>
              <div className="text-xs text-gray-500 mt-1">ms</div>
              <div className="text-sm font-medium text-gray-700 mt-1">
                〰️ Jitter
              </div>
            </div>
          </div>
          <div className="p-4 bg-gray-50 flex gap-3">
            <button
              onClick={startTest}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              🔄 Test Again
            </button>
            <button
              onClick={saveToStrapi}
              disabled={saveStatus === "saving"}
              className={`flex-1 py-3 rounded-lg font-semibold transition ${
                saveStatus === "success"
                  ? "bg-green-600 text-white"
                  : saveStatus === "error"
                    ? "bg-red-600 text-white"
                    : "bg-purple-600 text-white hover:bg-purple-700"
              }`}
            >
              {saveStatus === "saving"
                ? "⏳ Saving..."
                : saveStatus === "success"
                  ? "✅ Saved!"
                  : "💾 Save to Database"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
