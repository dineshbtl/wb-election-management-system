"use client";

import { useState, useEffect } from "react";

interface SpeedTestResult {
  downloadSpeed: number;
  uploadSpeed: number;
  ping: number;
  jitter: number;
  timestamp: string;
}

export default function SpeedTestSimple() {
  const [testing, setTesting] = useState(false);
  const [phase, setPhase] = useState<
    "idle" | "ping" | "download" | "upload" | "complete"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [result, setResult] = useState<SpeedTestResult | null>(null);
  const [error, setError] = useState("");
  const [speedTestLoaded, setSpeedTestLoaded] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "/speedtest/speedtest.js";
    script.async = true;
    script.onload = () => setSpeedTestLoaded(true);
    script.onerror = () => setError("Failed to load speed test engine");
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const startTest = () => {
    if (!speedTestLoaded) {
      setError("Speed test engine not loaded yet. Please wait...");
      return;
    }

    setTesting(true);
    setPhase("ping");
    setProgress(0);
    setError("");
    setResult(null);
    setCurrentSpeed(0);

    try {
      // @ts-ignore
      const s = new window.Speedtest();

      s.setParameter("telemetry_level", "basic");
      s.setParameter("url_ping", "/speedtest/empty.php");
      s.setParameter("url_down", "/speedtest/garbage.php");
      s.setParameter("url_up", "/speedtest/empty.php");

      s.onupdate = (data: any) => {
        if (phase === "ping") {
          setPhase("download");
          setProgress(20);
        }

        if (data.testState === 3) {
          setCurrentSpeed(parseFloat(data.dlSpeed).toFixed(2));
          setProgress(20 + data.progress * 0.4);
        } else if (data.testState === 4) {
          setCurrentSpeed(parseFloat(data.ulSpeed).toFixed(2));
          setProgress(60 + data.progress * 0.4);
        }
      };

      s.onend = (aborted: boolean) => {
        if (aborted) {
          setError("Test was cancelled");
          setTesting(false);
          return;
        }

        const results = s.getResult();
        setResult({
          downloadSpeed: parseFloat(results.dlSpeed).toFixed(2),
          uploadSpeed: parseFloat(results.ulSpeed).toFixed(2),
          ping: parseFloat(results.ping).toFixed(0),
          jitter: parseFloat(results.jitter).toFixed(0),
          timestamp: new Date().toLocaleString(),
        });

        setPhase("complete");
        setProgress(100);
        setCurrentSpeed(0);
        setTesting(false);
      };

      s.start();
    } catch (err: any) {
      console.error("Speed test error:", err);
      setError(err.message || "Failed to start speed test");
      setTesting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">
          🚀 Network Speed Test
        </h2>
        <p className="text-gray-600 mt-2">Test your internet speed instantly</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          ⚠️ {error}
        </div>
      )}

      {!testing && !result && (
        <button
          onClick={startTest}
          disabled={!speedTestLoaded}
          className={`w-full py-6 rounded-xl font-bold text-xl transition shadow-lg ${
            speedTestLoaded
              ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
              : "bg-gray-400 text-gray-200 cursor-not-allowed"
          }`}
        >
          {speedTestLoaded ? "🔥 START SPEED TEST" : "⏳ Loading..."}
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
              <span className="font-medium">
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
            <p className="text-sm opacity-90 mt-1">{result.timestamp}</p>
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

          <div className="p-4 bg-gray-50">
            <button
              onClick={startTest}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              🔄 Test Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
