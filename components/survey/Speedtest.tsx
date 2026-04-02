// // components/SpeedTest.tsx
// "use client";

// import { useState } from "react";

// interface SpeedTestResult {
//   downloadSpeed: number; // Mbps
//   uploadSpeed: number; // Mbps
//   latency: number; // ms
//   networkType: string;
//   effectiveType: string;
//   timestamp: string;
// }

// export default function SpeedTest() {
//   const [testing, setTesting] = useState(false);
//   const [phase, setPhase] = useState(""); // 'latency', 'download', 'upload'
//   const [progress, setProgress] = useState(0);
//   const [result, setResult] = useState<SpeedTestResult | null>(null);

//   // Test latency
//   const testLatency = async (): Promise<number> => {
//     const times = [];
//     for (let i = 0; i < 3; i++) {
//       const start = performance.now();
//       try {
//         await fetch(window.location.origin + "?t=" + Date.now(), {
//           method: "HEAD",
//           cache: "no-store",
//         });
//         const end = performance.now();
//         times.push(end - start);
//       } catch (e) {
//         console.error("Latency test failed", e);
//       }
//     }
//     const avg = times.reduce((a, b) => a + b, 0) / times.length;
//     return Math.round(avg);
//   };

//   // Test download speed
//   const testDownloadSpeed = async (): Promise<number> => {
//     setPhase("download");
//     const testUrl = "https://speed.cloudflare.com/__down?bytes=25000000"; // 25MB
//     const startTime = performance.now();

//     try {
//       const response = await fetch(testUrl + "?t=" + Date.now(), {
//         cache: "no-store",
//       });
//       const blob = await response.blob();
//       const endTime = performance.now();

//       const durationInSeconds = (endTime - startTime) / 1000;
//       const bitsLoaded = blob.size * 8;
//       const speedBps = bitsLoaded / durationInSeconds;
//       const speedMbps = speedBps / (1024 * 1024);

//       return parseFloat(speedMbps.toFixed(2));
//     } catch (e) {
//       console.error("Download test failed", e);
//       return 0;
//     }
//   };

//   // Test upload speed
//   const testUploadSpeed = async (): Promise<number> => {
//     setPhase("upload");
//     // Create 5MB of data
//     const data = new Blob([new ArrayBuffer(5 * 1024 * 1024)]);
//     const startTime = performance.now();

//     try {
//       await fetch("https://speed.cloudflare.com/__up", {
//         method: "POST",
//         body: data,
//       });
//       const endTime = performance.now();

//       const durationInSeconds = (endTime - startTime) / 1000;
//       const bitsLoaded = data.size * 8;
//       const speedBps = bitsLoaded / durationInSeconds;
//       const speedMbps = speedBps / (1024 * 1024);

//       return parseFloat(speedMbps.toFixed(2));
//     } catch (e) {
//       console.error("Upload test failed", e);
//       return 0;
//     }
//   };

//   const startTest = async () => {
//     setTesting(true);
//     setResult(null);
//     setProgress(0);

//     try {
//       // Step 1: Test Latency
//       setPhase("latency");
//       setProgress(20);
//       const latency = await testLatency();

//       // Step 2: Test Download
//       setProgress(50);
//       const downloadSpeed = await testDownloadSpeed();

//       // Step 3: Test Upload
//       setProgress(80);
//       const uploadSpeed = await testUploadSpeed();

//       // Get network info
//       const connection = (navigator as any).connection;

//       setProgress(100);

//       // Save result
//       setResult({
//         downloadSpeed,
//         uploadSpeed,
//         latency,
//         networkType: connection?.type || "unknown",
//         effectiveType: connection?.effectiveType || "unknown",
//         timestamp: new Date().toLocaleString(),
//       });
//     } catch (error) {
//       console.error("Test failed", error);
//     } finally {
//       setTesting(false);
//       setPhase("");
//       setProgress(0);
//     }
//   };

//   return (
//     <div className="max-w-md mx-auto p-6">
//       {/* Start Button */}
//       {!result && !testing && (
//         <button
//           onClick={startTest}
//           className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition"
//         >
//           START SPEED TEST
//         </button>
//       )}

//       {/* Testing Progress */}
//       {testing && (
//         <div className="text-center py-8">
//           <div className="mb-4">
//             <div className="text-2xl font-bold text-blue-600 mb-2">
//               {phase === "latency" && "Testing Latency..."}
//               {phase === "download" && "Testing Download..."}
//               {phase === "upload" && "Testing Upload..."}
//             </div>
//             <div className="w-full bg-gray-200 rounded-full h-3">
//               <div
//                 className="bg-blue-600 h-3 rounded-full transition-all duration-300"
//                 style={{ width: `${progress}%` }}
//               />
//             </div>
//           </div>
//           <p className="text-gray-500">Please wait, do not close this page</p>
//         </div>
//       )}

//       {/* Results */}
//       {result && (
//         <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
//           {/* Header */}
//           <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 text-center">
//             <p className="text-sm opacity-90">Speed Test Result</p>
//             <p className="text-xs mt-1 opacity-75">{result.timestamp}</p>
//           </div>

//           {/* Network Info */}
//           <div className="flex justify-center gap-4 p-4 bg-gray-50 border-b">
//             <div className="flex items-center gap-2">
//               <svg
//                 className="w-5 h-5 text-blue-600"
//                 fill="none"
//                 stroke="currentColor"
//                 viewBox="0 0 24 24"
//               >
//                 <path
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   strokeWidth={2}
//                   d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
//                 />
//               </svg>
//               <span className="text-sm font-medium capitalize">
//                 {result.networkType || "Cellular"}
//               </span>
//             </div>
//             <div className="flex items-center gap-2">
//               <span className="text-sm font-medium capitalize">
//                 {result.effectiveType || "4G"}
//               </span>
//             </div>
//           </div>

//           {/* Speed Metrics */}
//           <div className="grid grid-cols-3 gap-4 p-6">
//             {/* Download */}
//             <div className="text-center">
//               <div className="text-3xl font-bold text-orange-500">
//                 {result.downloadSpeed}
//               </div>
//               <div className="text-xs text-gray-500 mt-1">Mbps</div>
//               <div className="text-xs text-gray-400">Download</div>
//             </div>

//             {/* Upload */}
//             <div className="text-center border-x">
//               <div className="text-3xl font-bold text-orange-500">
//                 {result.uploadSpeed}
//               </div>
//               <div className="text-xs text-gray-500 mt-1">Mbps</div>
//               <div className="text-xs text-gray-400">Upload</div>
//             </div>

//             {/* Latency */}
//             <div className="text-center">
//               <div className="text-3xl font-bold text-orange-500">
//                 {result.latency}
//               </div>
//               <div className="text-xs text-gray-500 mt-1">ms</div>
//               <div className="text-xs text-gray-400">Latency</div>
//             </div>
//           </div>

//           {/* Test Again Button */}
//           <div className="p-4 bg-gray-50">
//             <button
//               onClick={startTest}
//               className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
//             >
//               Test Again
//             </button>
//           </div>
//         </div>
//       )}

//       {/* Disclaimer */}
//       <p className="mt-4 text-xs text-gray-400 text-center">
//         * Carrier name not available in web browsers
//         <br />
//         For carrier info, use native mobile app
//       </p>
//     </div>
//   );
// }

// components/SpeedTest.tsx
"use client";

import { useState } from "react";

interface SpeedTestResult {
  downloadSpeed: number;
  uploadSpeed: number;
  latency: number;
  jitter: number;
  networkType: string;
  effectiveType: string;
  timestamp: string;
}

export default function SpeedTest() {
  const [testing, setTesting] = useState(false);
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SpeedTestResult | null>(null);

  // Better latency test - multiple pings, take minimum
  const testLatency = async (): Promise<{
    latency: number;
    jitter: number;
  }> => {
    const pings = [];
    const count = 5;

    for (let i = 0; i < count; i++) {
      const start = performance.now();
      try {
        // Use a very small resource
        await fetch(`https://www.google.com/favicon.ico?t=${Date.now()}&${i}`, {
          mode: "no-cors",
          cache: "no-store",
        });
      } catch (e) {
        // Ignore errors for no-cors
      }
      const end = performance.now();
      pings.push(end - start);
    }

    // Sort to get minimum (best case = true latency)
    pings.sort((a, b) => a - b);

    // Take minimum of best 2 pings
    const bestPings = pings.slice(0, 2);
    const latency = Math.round(
      bestPings.reduce((a, b) => a + b, 0) / bestPings.length,
    );

    // Calculate jitter (variation)
    const avg = pings.reduce((a, b) => a + b, 0) / pings.length;
    const variance =
      pings.reduce((sum, ping) => sum + Math.pow(ping - avg, 2), 0) /
      pings.length;
    const jitter = Math.round(Math.sqrt(variance));

    return { latency, jitter };
  };

  // Better download test - multiple connections
  const testDownloadSpeed = async (): Promise<number> => {
    setPhase("download");
    const testUrls = [
      "https://speed.cloudflare.com/__down?bytes=25000000",
      "https://speed.cloudflare.com/__down?bytes=25000000",
    ];

    const startTime = performance.now();
    let totalBytes = 0;

    // Test with parallel connections
    const promises = testUrls.map(async (url) => {
      try {
        const response = await fetch(url + `&t=${Date.now()}`, {
          cache: "no-store",
        });
        const blob = await response.blob();
        totalBytes += blob.size;
      } catch (e) {
        console.error("Download chunk failed", e);
      }
    });

    await Promise.all(promises);
    const endTime = performance.now();

    const durationInSeconds = (endTime - startTime) / 1000;
    const bitsLoaded = totalBytes * 8;
    const speedBps = bitsLoaded / durationInSeconds;
    const speedMbps = parseFloat((speedBps / (1024 * 1024)).toFixed(2));

    return speedMbps;
  };

  // Better upload test
  const testUploadSpeed = async (): Promise<number> => {
    setPhase("upload");
    const dataSize = 10 * 1024 * 1024; // 10MB
    const data = new Blob([new ArrayBuffer(dataSize)]);

    const startTime = performance.now();

    try {
      await fetch("https://speed.cloudflare.com/__up", {
        method: "POST",
        body: data,
        headers: {
          "Content-Type": "application/octet-stream",
        },
      });
      const endTime = performance.now();

      const durationInSeconds = (endTime - startTime) / 1000;
      const bitsLoaded = data.size * 8;
      const speedBps = bitsLoaded / durationInSeconds;
      const speedMbps = parseFloat((speedBps / (1024 * 1024)).toFixed(2));

      return speedMbps;
    } catch (e) {
      console.error("Upload test failed", e);
      return 0;
    }
  };

  const startTest = async () => {
    setTesting(true);
    setResult(null);
    setProgress(0);

    try {
      // Step 1: Test Latency
      setPhase("latency");
      setProgress(15);
      const { latency, jitter } = await testLatency();

      // Step 2: Test Download
      setProgress(40);
      const downloadSpeed = await testDownloadSpeed();

      // Step 3: Test Upload
      setProgress(75);
      const uploadSpeed = await testUploadSpeed();

      // Get network info
      const connection = (navigator as any).connection;

      setProgress(100);

      setResult({
        downloadSpeed,
        uploadSpeed,
        latency: Math.max(latency - 20, 5), // Adjust for HTTP overhead (approximate)
        jitter,
        networkType: connection?.type || "cellular",
        effectiveType: connection?.effectiveType || "4g",
        timestamp: new Date().toLocaleString(),
      });
    } catch (error) {
      console.error("Test failed", error);
    } finally {
      setTesting(false);
      setPhase("");
      setProgress(0);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      {!result && !testing && (
        <button
          onClick={startTest}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition"
        >
          START SPEED TEST
        </button>
      )}

      {testing && (
        <div className="text-center py-8">
          <div className="mb-4">
            <div className="text-2xl font-bold text-blue-600 mb-2">
              {phase === "latency" && "Testing Latency..."}
              {phase === "download" && "Testing Download..."}
              {phase === "upload" && "Testing Upload..."}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">{progress}%</p>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 text-center">
            <p className="text-sm opacity-90">Speed Test Result</p>
            <p className="text-xs mt-1 opacity-75">{result.timestamp}</p>
          </div>

          <div className="flex justify-center gap-4 p-4 bg-gray-50 border-b">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium capitalize">
                {result.networkType}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium capitalize">
                {result.effectiveType}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-500">
                {result.downloadSpeed}
              </div>
              <div className="text-xs text-gray-500 mt-1">Mbps</div>
              <div className="text-xs text-gray-400">Download</div>
            </div>

            <div className="text-center border-x">
              <div className="text-3xl font-bold text-orange-500">
                {result.uploadSpeed}
              </div>
              <div className="text-xs text-gray-500 mt-1">Mbps</div>
              <div className="text-xs text-gray-400">Upload</div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-orange-500">
                {result.latency}
              </div>
              <div className="text-xs text-gray-500 mt-1">ms</div>
              <div className="text-xs text-gray-400">Latency</div>
              <div className="text-xs text-gray-400 mt-1">
                ±{result.jitter}ms jitter
              </div>
            </div>
          </div>

          <div className="px-6 pb-6">
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
              <p>
                <strong>Note:</strong> Browser-based tests may differ from
                native apps.
              </p>
              <p className="mt-1">
                OpenSignal uses ICMP ping (true latency), we use HTTP requests.
              </p>
            </div>
          </div>

          <div className="p-4 bg-gray-50">
            <button
              onClick={startTest}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Test Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
