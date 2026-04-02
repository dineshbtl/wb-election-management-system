// "use client";

// import { useState } from "react";
// import { Button } from "@/components/ui/button";
// import { Select, message, Spin } from "antd";

// interface NetworkResult {
//   operator: string;
//   download_speed: number;
//   upload_speed: number;
//   latency: number;
//   signal_level: number;
//   status: string;
// }

// export default function NetworkSignalTest() {
//   const [selectedOperator, setSelectedOperator] = useState<string>("");
//   const [networkResults, setNetworkResults] = useState<NetworkResult[]>([]);
//   const [testing, setTesting] = useState(false);

//   const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

//   // -------------------------
//   // Latency Test
//   // -------------------------
//   const testLatency = async (): Promise<number> => {
//     const pings = [];

//     // Run 5 pings
//     for (let i = 0; i < 5; i++) {
//       const start = performance.now();
//       try {
//         await fetch("https://speed.cloudflare.com/__down?bytes=1", {
//           cache: "no-store",
//           mode: "no-cors", // Faster, no CORS overhead
//         });
//         const end = performance.now();
//         pings.push(end - start);
//       } catch {
//         // Skip failed ping
//       }
//     }

//     // Return median (more stable than average)
//     if (pings.length === 0) return Infinity;
//     pings.sort((a, b) => a - b);
//     return pings[Math.floor(pings.length / 2)];
//   };

//   // -------------------------
//   // Download Test (Cloudflare CDN)
//   // -------------------------
//   const testDownloadSpeed = async (): Promise<number> => {
//     const testUrls = [
//       "https://speed.cloudflare.com/__down?bytes=25000000", // 25MB
//       "https://speed.cloudflare.com/__down?bytes=25000000",
//     ];

//     const startTime = performance.now();
//     let totalBytes = 0;

//     for (const url of testUrls) {
//       const response = await fetch(url, { cache: "no-store" });
//       const blob = await response.blob();
//       totalBytes += blob.size;
//     }

//     const endTime = performance.now();
//     const duration = (endTime - startTime) / 1000;
//     const totalBits = totalBytes * 8;

//     return totalBits / duration / (1024 * 1024); // Mbps
//   };

//   // -------------------------
//   // Upload Test (Your Backend)
//   // -------------------------
//   const testUploadSpeed = async (): Promise<number> => {
//     const uploadUrl = `${BACKEND_URL}/upload-test`;

//     // Generate 5MB of random data (more accurate)
//     const size = 5 * 1024 * 1024;
//     const data = new Uint8Array(size);
//     crypto.getRandomValues(data); // More realistic than zeros

//     const startTime = performance.now();

//     await fetch(uploadUrl, {
//       method: "POST",
//       body: data, // Raw binary, not FormData
//       headers: {
//         "Content-Type": "application/octet-stream",
//       },
//     });

//     const endTime = performance.now();
//     const duration = (endTime - startTime) / 1000;
//     const totalBits = size * 8;

//     return totalBits / duration / (1024 * 1024);
//   };

//   // -------------------------
//   // Convert Upload → Signal Bars
//   // -------------------------
//   const convertSpeedToSignal = (upload: number) => {
//     if (upload < 1) return 1;
//     if (upload < 3) return 2;
//     if (upload < 5) return 3;
//     if (upload < 8) return 4;
//     return 5;
//   };

//   // -------------------------
//   // Live Feed Status
//   // -------------------------
//   const getNetworkStatus = (upload: number, latency: number) => {
//     if (upload < 3) return "Not Suitable ❌";
//     if (latency > 150) return "High Delay ⚠";
//     return "Good for Live Feed ✅";
//   };

//   // -------------------------
//   // Run Full Professional Test
//   // -------------------------
//   const runSpeedTest = async () => {
//     if (!selectedOperator) {
//       message.warning("Please select operator first");
//       return;
//     }

//     message.info("Ensure selected SIM mobile data is active");

//     setTesting(true);

//     try {
//       // Run 3 tests for stability
//       const downloads = [];
//       const uploads = [];
//       const latencies = [];

//       for (let i = 0; i < 3; i++) {
//         downloads.push(await testDownloadSpeed());
//         uploads.push(await testUploadSpeed());
//         latencies.push(await testLatency());
//       }

//       const avgDownload =
//         downloads.reduce((a, b) => a + b, 0) / downloads.length;

//       const avgUpload = uploads.reduce((a, b) => a + b, 0) / uploads.length;

//       const avgLatency =
//         latencies.reduce((a, b) => a + b, 0) / latencies.length;

//       const signal = convertSpeedToSignal(avgUpload);
//       const status = getNetworkStatus(avgUpload, avgLatency);

//       const result: NetworkResult = {
//         operator: selectedOperator,
//         download_speed: parseFloat(avgDownload.toFixed(2)),
//         upload_speed: parseFloat(avgUpload.toFixed(2)),
//         latency: Math.round(avgLatency),
//         signal_level: signal,
//         status,
//       };

//       setNetworkResults((prev) => [
//         ...prev.filter((r) => r.operator !== selectedOperator),
//         result,
//       ]);

//       message.success("Professional Network Test Completed");
//     } catch (error) {
//       console.error(error);
//       message.error("Speed test failed");
//     }

//     setTesting(false);
//   };

//   return (
//     <div className="border rounded-lg p-5 bg-gray-50 space-y-4">
//       <h3 className="text-lg font-semibold">
//         Election Live Feed Network Validator
//       </h3>

//       <Select
//         style={{ width: "100%" }}
//         placeholder="Select Operator"
//         value={selectedOperator}
//         onChange={(val) => setSelectedOperator(val)}
//       >
//         <Select.Option value="Airtel">Airtel</Select.Option>
//         <Select.Option value="Jio">Jio</Select.Option>
//       </Select>

//       <Button
//         onClick={runSpeedTest}
//         disabled={testing}
//         className="w-full bg-blue-600 text-white"
//       >
//         {testing ? (
//           <span className="flex items-center justify-center gap-2">
//             <Spin size="small" /> Testing...
//           </span>
//         ) : (
//           "Run Network Validation"
//         )}
//       </Button>

//       {networkResults.map((result) => (
//         <div
//           key={result.operator}
//           className="border rounded p-4 bg-white shadow-sm"
//         >
//           <p className="font-semibold text-blue-600">{result.operator}</p>
//           <p>Download: {result.download_speed} Mbps</p>
//           <p>Upload: {result.upload_speed} Mbps</p>
//           <p>Latency: {result.latency} ms</p>
//           <p>Signal Level: {result.signal_level} / 5</p>
//           <p className="font-semibold">{result.status}</p>
//         </div>
//       ))}
//     </div>
//   );
// }


