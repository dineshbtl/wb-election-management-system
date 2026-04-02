"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { ModernSidebar } from "@/components/layout/modern-sidebar";
import { ModernHeader } from "@/components/layout/modern-header";
import { BreadcrumbBar } from "@/components/layout/breadcrumb-bar";
import { getPageTitle } from "@/lib/page-title-map";
import { toast } from "@/components/ui/use-toast";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname ?? "");
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
          setGpsStatus("success");
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
          setGpsStatus("error");
          setIsRefreshingGPS(false);
          // Timeout (3) is common when location is slow or denied; don't log as error
          if (error?.code !== 3) {
            const msg = error?.message || `Code ${error?.code ?? "unknown"}`;
            console.warn("GPS:", msg);
          }
          toast({
            variant: "destructive",
            title: "Location unavailable",
            description:
              error?.code === 3
                ? "Location request timed out. You can try again from the header."
                : "Unable to get your current location. Check browser location settings.",
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        }
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
    <PageLayout className="h-screen max-h-screen overflow-hidden">
      <div className="flex h-full min-h-0 flex-col md:flex-row">
        {/* Sidebar - Hidden on mobile, visible on md+ */}
        <div
          className={`fixed inset-y-0 left-0 z-50 md:static md:flex ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0 transition-transform duration-300 ease-in-out`}
        >
          <ModernSidebar
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

        {/* Main Content Area - min-w-0 allows flex child to shrink and prevents overflow */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <ModernHeader
            title={pageTitle}
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

          <BreadcrumbBar />

          <main className="app-content custom-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain p-3 sm:p-6 max-w-full min-w-0">
            {children}
          </main>
        </div>
      </div>
    </PageLayout>
  );
}
