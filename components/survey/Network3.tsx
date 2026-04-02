//

"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Speedtest: any;
  }
}

interface Props {
  provider: string;
  disabled?: boolean;
  onStart?: () => void;
  onComplete: (data: {
    provider: string;
    download_speed: number;
    upload_speed: number;
    latency: number;
    carrier_info?: string;
  }) => void;
}

/** Country-only values (LibreSpeed returns these when ISP lookup fails) - not useful as carrier */
const COUNTRY_ONLY = new Set([
  "india",
  "in",
  "usa",
  "us",
  "uk",
  "china",
  "cn",
  "brazil",
  "br",
  "russia",
  "ru",
  "japan",
  "jp",
  "germany",
  "de",
  "france",
  "fr",
  "indonesia",
  "id",
  "pakistan",
  "pk",
  "bangladesh",
  "bd",
  "nepal",
  "np",
]);

function isValidCarrier(s: string): boolean {
  if (!s || s.length < 4) return false;
  const lower = s.trim().toLowerCase();
  if (lower.startsWith(", ")) return false; // ", India" etc
  if (COUNTRY_ONLY.has(lower)) return false;
  if (/^[a-z]{2}$/.test(lower)) return false; // 2-letter country codes
  return true;
}

/** Extract ISP/carrier from LibreSpeed clientIp (e.g. "IP - Bharti Airtel - India - 15 km") */
function parseCarrierFromClientIp(clientIp: string): string {
  if (!clientIp || typeof clientIp !== "string") return "";
  const parts = clientIp
    .split(" - ")
    .map((p) => p.trim())
    .filter(Boolean);
  const candidate = parts.length >= 2 ? parts[1] : "";
  return isValidCarrier(candidate) ? candidate : "";
}

/** Extract carrier from ipinfo/ipapi org (e.g. "AS9498 Bharti Airtel Ltd" -> "Bharti Airtel Ltd") */
function parseCarrierFromOrg(org: string): string {
  if (!org || typeof org !== "string") return "";
  const carrier = org.replace(/^AS\d+\s+/i, "").trim();
  return isValidCarrier(carrier) ? carrier : "";
}

/** Fetch carrier from external API - uses active connection (SIM being tested) */
async function fetchCarrierFromApi(signal?: AbortSignal): Promise<string> {
  const apis = [
    {
      url: "https://ipinfo.io/json",
      getOrg: (d: any) => d?.org ?? d?.as?.name ?? d?.company?.name,
    },
    {
      url: "https://ipapi.co/json/",
      getOrg: (d: any) => d?.org ?? d?.organization,
    },
  ];
  for (const api of apis) {
    try {
      const r = await fetch(api.url, { signal });
      if (!r.ok) continue;
      const data = await r.json();
      const org = api.getOrg(data);
      const carrier = parseCarrierFromOrg(org || "");
      if (carrier) return carrier;
    } catch {
      // try next API
    }
  }
  return "";
}

export default function Network3({
  provider,
  disabled = false,
  onStart,
  onComplete,
  existingData,
}: Props & {
  existingData?: {
    download_speed: number;
    upload_speed: number;
    latency: number;
    carrier_info?: string;
  };
}) {
  const testRef = useRef<any>(null);

  const latestValues = useRef({
    download_speed: existingData?.download_speed || 0,
    upload_speed: existingData?.upload_speed || 0,
    latency: existingData?.latency || 0,
    carrier_info: existingData?.carrier_info || "",
  });

  const [download, setDownload] = useState(existingData?.download_speed || 0);
  const [upload, setUpload] = useState(existingData?.upload_speed || 0);
  const [ping, setPing] = useState(existingData?.latency || 0);
  const [running, setRunning] = useState(false);
  
  // If we have existing non-zero speeds, consider it "finished" so they display
  const [finished, setFinished] = useState(
    !!(existingData?.download_speed || existingData?.upload_speed)
  );
  const [carrierDisplay, setCarrierDisplay] = useState(
    existingData?.carrier_info || ""
  );

  useEffect(() => {
    // If existingData changes (like an initial data load), sync it
    if (existingData && existingData.download_speed > 0 && !running) {
      setDownload(existingData.download_speed);
      setUpload(existingData.upload_speed);
      setPing(existingData.latency);
      setFinished(true);
      if (existingData.carrier_info) {
        setCarrierDisplay(existingData.carrier_info);
      }
    }
  }, [existingData, running]);

  useEffect(() => {
    const loadScript = () => {
      if (!window.Speedtest) {
        const script = document.createElement("script");
        script.src = "/speedtest.js";
        script.async = true;
        script.onload = initSpeedtest;
        document.body.appendChild(script);
      } else {
        initSpeedtest();
      }
    };

    const initSpeedtest = () => {
      const s = new window.Speedtest();

      // Use env for speedtest backend so we can point to https://election.brihaspathi.com
      const speedtestBase =
        process.env.NEXT_PUBLIC_SPEEDTEST_BACKEND_URL ||
        "http://156.67.110.186:8080";
      const base = speedtestBase.replace(/\/$/, "");

      s.setParameter("url_dl", `${base}/backend/garbage.php`);
      s.setParameter("url_ul", `${base}/backend/empty.php`);
      s.setParameter("url_ping", `${base}/backend/empty.php`);
      s.setParameter("url_getIp", `${base}/backend/getIP.php`);

      testRef.current = s;
    };

    loadScript();
  }, []);

  const startTest = () => {
    if (!testRef.current || disabled) return;
    onStart?.();
    setRunning(true);
    setFinished(false);
    latestValues.current.carrier_info = "";
    setCarrierDisplay("");

    // 1. Fetch carrier in parallel (uses active connection = SIM being tested)
    // LibreSpeed getIP.php often doesn't return ISP; ipinfo/ipapi.co provide org
    const carrierAbort = new AbortController();
    fetchCarrierFromApi(carrierAbort.signal).then((carrier) => {
      if (carrier && !latestValues.current.carrier_info) {
        latestValues.current.carrier_info = carrier;
        setCarrierDisplay(carrier);
      }
    });

    testRef.current.onupdate = (data: any) => {
      const dl = parseFloat(data.dlStatus || 0);
      const ul = parseFloat(data.ulStatus || 0);
      const pg = parseFloat(data.pingStatus || 0);

      setDownload(dl);
      setUpload(ul);
      setPing(pg);

      if (data.clientIp) {
        const carrier = parseCarrierFromClientIp(data.clientIp);
        if (carrier) {
          latestValues.current.carrier_info = carrier;
          setCarrierDisplay(carrier);
        }
      }

      latestValues.current = {
        ...latestValues.current,
        download_speed: dl,
        upload_speed: ul,
        latency: pg,
      };
    };

    testRef.current.onend = async () => {
      setRunning(false);
      setFinished(true);

      // 2. If no carrier yet, try once more after test (connection still on this SIM)
      if (!latestValues.current.carrier_info) {
        carrierAbort.abort(); // cancel any pending fetch
        const carrier = await fetchCarrierFromApi();
        if (carrier) {
          latestValues.current.carrier_info = carrier;
          setCarrierDisplay(carrier);
        }
      } else {
        carrierAbort.abort();
        setCarrierDisplay(latestValues.current.carrier_info);
      }

      const detectedProvider =
        latestValues.current.carrier_info ||
        (provider === "sim1"
          ? "SIM 1"
          : provider === "sim2"
            ? "SIM 2"
            : provider);

      onComplete({
        provider: detectedProvider, // ✅ send detected carrier instead of sim1/sim2
        download_speed: latestValues.current.download_speed,
        upload_speed: latestValues.current.upload_speed,
        latency: latestValues.current.latency,
      });
    };

    testRef.current.start();
  };

  const hasExistingData = !!(existingData?.download_speed || existingData?.upload_speed);
  const buttonLabel = running
    ? "Testing..."
    : (finished && hasExistingData) || finished
      ? "Retest Speed"
      : `Start ${provider === "sim1" ? "SIM 1" : provider === "sim2" ? "SIM 2" : provider} Speed Test`;

  return (
    <div className="p-3 border rounded bg-gray-50">
      <div className="flex items-center justify-between">
         <button
            onClick={startTest}
            disabled={running || disabled}
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {buttonLabel}
          </button>
      </div>

      {(running || finished) && (
        <div className="mt-3 text-sm">
          <p>
            Download: <strong>{download.toFixed(2)}</strong> Mbps
          </p>
          <p>
            Upload: <strong>{upload.toFixed(2)}</strong> Mbps
          </p>
          <p>
            Latency: <strong>{ping.toFixed(2)}</strong> ms
          </p>
        </div>
      )}

      {finished && (
        <div className="mt-2 space-y-1">
          {running ? null : (
              <p className="text-green-600 text-xs font-medium">Test Results Available</p>
          )}
          {(carrierDisplay || latestValues.current.carrier_info) && (
            <p className="text-xs text-gray-600">
              Provider: {carrierDisplay || latestValues.current.carrier_info}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
