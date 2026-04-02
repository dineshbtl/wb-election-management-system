"use client";

import { useState, useEffect } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { toast } from "@/components/ui/use-toast";
import { Assemblysidebar } from "@/components/layout/Assembly-sidebar";
import { AssemblyHeader } from "@/components/layout/Assembly-header";
import { Blocksidebar } from "@/components/layout/Block-sidebar";
import { BlockHeader } from "@/components/layout/Block-header";

export default function AdminLayout({
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const getGPSLocation = () => {
    setIsRefreshingGPS(true);
    setGpsStatus("loading");

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setGpsStatus("connected");
          setIsRefreshingGPS(false);

          toast({
            variant: "success",
            title: "GPS Location Updated",
            description: `Location: ${position.coords.latitude.toFixed(
              6
            )}, ${position.coords.longitude.toFixed(6)}`,
          });
        },
        (error) => {
          console.error("GPS Error:", error);
          setGpsStatus("disconnected");
          setIsRefreshingGPS(false);

          toast({
            variant: "destructive",
            title: "GPS Error",
            description:
              "Unable to get your current location. Please check your location settings.",
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      setGpsStatus("disconnected");
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
    <PageLayout>
      <div className="flex h-screen">
        {/* Sidebar - Hidden on mobile, visible on md+ */}
        <div
          className={`fixed inset-y-0 left-0 z-50 md:static md:flex ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0 transition-transform duration-300 ease-in-out`}
        >
          <Blocksidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />
        </div>

        {/* Overlay for mobile when sidebar is open */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header with GPS and hamburger menu */}
          <BlockHeader
            title="Survey Dashboard"
            subtitle={
              gpsStatus === "success" && location
                ? `GPS Active: ${location.lat.toFixed(
                    4
                  )}, ${location.lng.toFixed(4)}`
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
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            isSidebarOpen={isSidebarOpen}
          />

          {/* Page content */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 max-w-full min-w-0">{children}</main>
        </div>
      </div>
    </PageLayout>
  );
}
