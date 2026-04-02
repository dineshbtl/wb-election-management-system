"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Speedtest: any;
  }
}

export default function Network2() {
  const testRef = useRef<any>(null);

  const [download, setDownload] = useState(0);
  const [upload, setUpload] = useState(0);
  const [ping, setPing] = useState(0);
  const [jitter, setJitter] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");

    // 🔥 Load LibreSpeed from Render
    script.src = "https://librespeed-me04.onrender.com/speedtest.js";
    script.async = true;

    script.onload = () => {
      const s = new window.Speedtest();

      // 🔥 Connect to Render backend
      s.setParameter(
        "url_dl",
        "https://librespeed-me04.onrender.com/backend/garbage.php",
      );
      s.setParameter(
        "url_ul",
        "https://librespeed-me04.onrender.com/backend/empty.php",
      );
      s.setParameter(
        "url_ping",
        "https://librespeed-me04.onrender.com/backend/empty.php",
      );
      s.setParameter(
        "url_getIp",
        "https://librespeed-me04.onrender.com/backend/getIP.php",
      );

      testRef.current = s;
    };

    document.body.appendChild(script);
  }, []);

  const startTest = () => {
    if (!testRef.current) return;

    setRunning(true);
    setFinished(false);

    testRef.current.onupdate = (data: any) => {
      setDownload(parseFloat(data.dlStatus || 0));
      setUpload(parseFloat(data.ulStatus || 0));
      setPing(parseFloat(data.pingStatus || 0));
      setJitter(parseFloat(data.jitterStatus || 0));
    };

    testRef.current.onend = async (aborted: boolean) => {
      setRunning(false);
      setFinished(true);

      if (!aborted) {
        console.log("Speed test completed");

        // 🔥 Optional: Save to Strapi
        /*
        await fetch("https://your-strapi-api.com/api/network-tests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: {
              download,
              upload,
              latency: ping,
              jitter,
              status: "Completed",
            },
          }),
        });
        */
      }
    };

    testRef.current.start();
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Network Speed Test</h2>

      <button
        onClick={startTest}
        disabled={running}
        style={{
          padding: "10px 20px",
          background: running ? "#999" : "#0070f3",
          color: "#fff",
          border: "none",
          cursor: running ? "not-allowed" : "pointer",
          borderRadius: 6,
        }}
      >
        {running ? "Testing..." : "Start Speed Test"}
      </button>

      <div style={{ marginTop: 20 }}>
        <p>⬇ Download: {download.toFixed(2)} Mbps</p>
        <p>⬆ Upload: {upload.toFixed(2)} Mbps</p>
        <p>📶 Latency: {ping.toFixed(2)} ms</p>
        <p>📊 Jitter: {jitter.toFixed(2)} ms</p>
      </div>

      {finished && (
        <p style={{ color: "green", marginTop: 10 }}>Test Completed ✅</p>
      )}
    </div>
  );
}
