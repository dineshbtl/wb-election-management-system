// "use client";

// import { useEffect, useRef, useState } from "react";

// declare global {
//   interface Window {
//     Speedtest: any;
//   }
// }

// interface Props {
//   provider: string;
//   onComplete: (data: {
//     provider: string;
//     download: number;
//     upload: number;
//     latency: number;
//   }) => void;
// }

// export default function Network3({ provider, onComplete }: Props) {
//   const testRef = useRef<any>(null);

//   const [download, setDownload] = useState(0);
//   const [upload, setUpload] = useState(0);
//   const [ping, setPing] = useState(0);
//   const [running, setRunning] = useState(false);
//   const [finished, setFinished] = useState(false);

//   useEffect(() => {
//     const script = document.createElement("script");
//     script.src = "/speedtest.js";
//     script.async = true;

//     script.onload = () => {
//       const s = new window.Speedtest();

//       // 👇 connect to XAMPP backend
//       s.setParameter("url_dl", "http://172.30.0.200/backend/garbage.php");
//       s.setParameter("url_ul", "http://172.30.0.200/backend/empty.php");
//       s.setParameter("url_ping", "http://172.30.0.200/backend/empty.php");
//       s.setParameter("url_getIp", "http://172.30.0.200/backend/getIP.php");

//       // s.setParameter("url_dl", "http://183.82.117.36:4003/backend/garbage.php");
//       // s.setParameter("url_ul", "http://183.82.117.36:4003/backend/empty.php");
//       // s.setParameter("url_ping", "http://183.82.117.36:4003/backend/empty.php");
//       // s.setParameter(
//       //   "url_getIp",
//       //   "http://183.82.117.36:4003/backend/getIP.php",
//       // );

//       testRef.current = s;
//     };

//     document.body.appendChild(script);
//   }, []);

//   const startTest = () => {
//     if (!testRef.current) return;

//     setRunning(true);
//     setFinished(false);

//     testRef.current.onupdate = (data: any) => {
//       setDownload(parseFloat(data.dlStatus || 0));
//       setUpload(parseFloat(data.ulStatus || 0));
//       setPing(parseFloat(data.pingStatus || 0));
//     };

//     testRef.current.onend = () => {
//       setRunning(false);
//       setFinished(true);
//       alert("Test Completed");
//     };

//     testRef.current.start();
//   };

//   return (
//     <div style={{ padding: 20 }}>
//       <h2>Network Speed Test</h2>

//       <button onClick={startTest} disabled={running}>
//         {running ? "Testing..." : "Start Speed Test"}
//       </button>

//       <div style={{ marginTop: 20 }}>
//         <p>Download: {download.toFixed(2)} Mbps</p>
//         <p>Upload: {upload.toFixed(2)} Mbps</p>
//         <p>Latency: {ping.toFixed(2)} ms</p>
//       </div>

//       {finished && <p style={{ color: "green" }}>Test Completed ✅</p>}
//     </div>
//   );
// }
