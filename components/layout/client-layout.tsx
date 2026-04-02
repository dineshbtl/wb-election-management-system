"use client";

import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";
import { ModernSidebar } from "@/components/layout/modern-sidebar";
import { ModernHeader } from "@/components/layout/modern-header";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [gpsStatus, setGpsStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );

  const [isRefreshingGPS, setIsRefreshingGPS] = useState(false);

  const getGPSLocation = () => {
    setIsRefreshingGPS(true);
    setGpsStatus("loading");

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude, lng: longitude });
          setGpsStatus("success");
          setIsRefreshingGPS(false);

          toast({
            variant: "success",
            title: "GPS Location Updated",
            description: `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(
              6
            )}`,
          });
        },
        () => {
          setGpsStatus("error");
          setIsRefreshingGPS(false);
          toast({
            variant: "destructive",
            title: "GPS Error",
            description:
              "Unable to get your location. Please enable location services.",
          });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setGpsStatus("error");
      setIsRefreshingGPS(false);
      toast({
        variant: "destructive",
        title: "GPS Not Supported",
        description: "Your browser doesn't support GPS location services.",
      });
    }
  };

  useEffect(() => {
    getGPSLocation();
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <ModernHeader
        title="Survey Dashboard"
        subtitle={
          gpsStatus === "success" && location
            ? `GPS Active: ${location.lat.toFixed(4)}, ${location.lng.toFixed(
                4
              )}`
            : gpsStatus === "loading"
            ? "Fetching GPS..."
            : gpsStatus === "error"
            ? "GPS unavailable"
            : "GPS idle"
        }
        showGPS={true}
        gpsStatus={gpsStatus}
        onRefreshGPS={getGPSLocation}
        isRefreshingGPS={isRefreshingGPS}
      />

      <div className="flex flex-1">
        <ModernSidebar />
        <main className="flex-1 p-6 overflow-y-auto bg-white">{children}</main>
      </div>

      <Toaster />
    </div>
  );
}
