"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Script from "next/script";
import { ModernCard } from "@/components/ui/modern-card";
import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/hooks/use-toast";
import { GOOGLE_MAPS_CONFIG } from "@/lib/google-maps-config";
import api from "@/lib/api";
import {
  MapPin,
  MapPinPlus,
  X,
  Navigation,
  Search,
  MapIcon,
} from "lucide-react";
import { Input } from "antd";

declare global {
  interface Window {
    google: any;
    googleMapsLoaded?: boolean;
    initMap?: () => void;
  }
}

interface Site {
  id: number;
  name: string;
  latitude: string;
  longitude: string;
  address?: string;
}

interface Project {
  id: number;
  project_name: string;
  project_code: string;
  state: string;
  site_1s: Site[];
  users_permissions_users?: { documentId: string }[];
}

export default function MapPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredSites, setFilteredSites] = useState<Site[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const { toast } = useToast();
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // ✅ Step 1: Fetch current user
  const fetchCurrentUser = async () => {
    try {
      const res = await api.get("/users/me?populate=*");
      setCurrentUser(res.data);
    } catch (err) {
      console.error("❌ Failed to fetch user:", err);
      toast({
        variant: "destructive",
        title: "Session Expired",
        description: "Please log in again.",
      });
    }
  };

  // ✅ Step 2: Fetch projects and filter only those assigned to user
  const fetchProjects = async () => {
    try {
      const res = await api.get(
        "/projects?populate=site_1s&populate=users_permissions_users"
      );
      const allProjects: Project[] = res.data?.data || [];

      const assignedProjects = allProjects.filter((proj) =>
        proj.users_permissions_users?.some(
          (u) => u.documentId === currentUser?.documentId
        )
      );

      setProjects(assignedProjects);

      // Collect all sites for assigned projects
      const allSites = assignedProjects.flatMap((p) =>
        (p.site_1s || []).map((s: any) => ({
          ...s,
          projectName: p.project_name,
          projectCode: p.project_code,
        }))
      );

      setFilteredSites(allSites);
    } catch (err) {
      console.error("❌ Failed to load projects:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch assigned project sites.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) fetchProjects();
  }, [currentUser]);

  // ✅ Rest of your map logic (unchanged except filtering)

  const visibleSites = filteredSites.filter(
    (site) =>
      site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (site.address || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNavigate = (lat: number, lng: number) => {
    const destination = `${lat},${lng}`;
    const origin = userLocation
      ? `${userLocation.lat},${userLocation.lng}`
      : "My+Location";

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const mapsUrl = isMobile
      ? `geo:${lat},${lng}?q=${lat},${lng}(Site+Location)`
      : `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    window.open(mapsUrl, "_blank");
  };

  const initializeMap = useCallback(() => {
    if (!window.google || !window.google.maps || !mapRef.current || mapLoaded)
      return;

    const map = new window.google.maps.Map(mapRef.current, {
      ...GOOGLE_MAPS_CONFIG.mapOptions,
      zoom: 7,
      center: { lat: 15.9129, lng: 79.74 },
    });

    mapInstanceRef.current = map;
    setMapLoaded(true);
    setIsLoading(false);
  }, [mapLoaded]);

  const handleGoogleMapsLoad = useCallback(() => {
    window.googleMapsLoaded = true;
    initializeMap();
  }, [initializeMap]);

  const addMarkers = useCallback((sites: Site[]) => {
    if (!mapInstanceRef.current || !window.google) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    sites.forEach((site) => {
      if (!site.latitude || !site.longitude) return;
      const lat = parseFloat(site.latitude);
      const lng = parseFloat(site.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapInstanceRef.current,
        title: site.name,
      });

      marker.addListener("click", () => {
        setSelectedSite(site);
        mapInstanceRef.current.panTo({ lat, lng });
        mapInstanceRef.current.setZoom(15);
      });

      markersRef.current.push(marker);
    });
  }, []);

  useEffect(() => {
    if (mapLoaded) addMarkers(visibleSites);
  }, [mapLoaded, visibleSites, addMarkers]);

  // 🔹 Update sites when project changes
  useEffect(() => {
    if (selectedProject === "all") {
      const allSites = projects.flatMap((p) =>
        (p.site_1s || []).map((s: any) => ({
          ...s,
          projectName: p.project_name,
          projectCode: p.project_code,
        }))
      );
      setFilteredSites(allSites);
    } else {
      const selected = projects.find(
        (p) => p.id.toString() === selectedProject
      );
      const projectSites = (selected?.site_1s || []).map((s: any) => ({
        ...s,
        projectName: selected?.project_name,
        projectCode: selected?.project_code,
      }));
      setFilteredSites(projectSites);
    }
  }, [selectedProject, projects]);

  // ✅ Map UI Rendering (unchanged)
  if (isLoading)
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assigned sites...</p>
        </div>
      </div>
    );

  // 🔹 Get and move to current user location
  const goToMyLocation = () => {
    if (!navigator.geolocation || !mapInstanceRef.current) {
      toast({
        title: "Location Error",
        description: "Geolocation not supported or map not ready.",
        variant: "destructive",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(pos);
        mapInstanceRef.current.setCenter(pos);
        mapInstanceRef.current.setZoom(13);

        // ✅ Add marker for current user location
        new window.google.maps.Marker({
          position: pos,
          map: mapInstanceRef.current,
          title: "Your Location",
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="#2563EB" stroke="white" strokeWidth="4"/>
              <circle cx="20" cy="20" r="6" fill="white"/>
            </svg>
          `)}`,
            scaledSize: new window.google.maps.Size(40, 40),
            anchor: new window.google.maps.Point(20, 20),
          },
        });
      },
      () => {
        toast({
          title: "Location Error",
          description: "Unable to retrieve your current location.",
          variant: "destructive",
        });
      }
    );
  };

  return (
    <div className="h-screen flex flex-col">
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${
          GOOGLE_MAPS_CONFIG.apiKey
        }&libraries=${GOOGLE_MAPS_CONFIG.libraries.join(",")}&callback=initMap`}
        strategy="afterInteractive"
        onLoad={handleGoogleMapsLoad}
      />

      {/* 🔹 Sidebar for Filters */}
      {/* 🔹 Mobile toggle button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="md:hidden fixed top-2 left-3 z-50 bg-white/90 backdrop-blur-md p-2 rounded-lg shadow-md border border-gray-200"
      >
        <MapPinPlus className="w-5 h-5 text-blue-600" />
      </button>

      {/* 🔹 Layout container */}
      <div className="flex h-full relative">
        {/* Sidebar (desktop visible, mobile off-canvas) */}
        <div
          className={`
      fixed md:static top-0 left-0 h-full w-80 bg-white/90 backdrop-blur-md border-r border-gray-200 p-4 space-y-4 overflow-y-auto z-40 transform transition-transform duration-300
      ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
    `}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">Project Map</h2>
            {/* Close button (only for mobile) */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Project Filter */}
          <div className="flex items-center space-x-2">
            <MapIcon className="w-4 h-4 text-gray-600" />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 mt-3">
            <PillButton
              onClick={goToMyLocation}
              size="sm"
              className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100"
            >
              <Navigation className="w-3 h-3 mr-1" />
              My Location
            </PillButton>
            {/* <PillButton
              size="sm"
              className="bg-green-50 text-green-700 hover:bg-green-100"
            >
              <Layers className="w-3 h-3 mr-1" />
              Layers
            </PillButton> */}
          </div>

          {/* Sites List */}
          {/* Sites List */}
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              {selectedProject === "all" ? "All Sites" : "Sites Under Project"}
            </h3>

            {/* 🔍 Search Bar */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search by site name or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
              />
            </div>

            {/* Filtered List */}
            <div className="space-y-2 mt-2 px-2 pt-2 max-h-96 overflow-y-auto">
              {visibleSites.length > 0 ? (
                visibleSites.map((site) => (
                  <ModernCard
                    key={site.id}
                    className={`p-3 cursor-pointer hover:shadow-md ${
                      selectedSite?.id === site.id ? "ring-2 ring-blue-500" : ""
                    }`}
                    onClick={() => {
                      const lat = parseFloat(site.latitude);
                      const lng = parseFloat(site.longitude);
                      if (!isNaN(lat) && !isNaN(lng)) {
                        setSelectedSite(site);
                        mapInstanceRef.current.setCenter({ lat, lng });
                        mapInstanceRef.current.setZoom(14);
                        setSidebarOpen(false);
                      }
                    }}
                  >
                    <h4 className="text-sm font-semibold text-gray-900">
                      {site.name}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {site.address || "No address"}
                    </p>
                    <p className="text-xs text-gray-400">
                      ({site.latitude}, {site.longitude})
                    </p>
                  </ModernCard>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No matching sites found
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Backdrop overlay (for mobile) */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm md:hidden z-30"
          ></div>
        )}

        {/* Map */}
        <div ref={mapRef} className="flex-1" />
      </div>

      {selectedSite && (
        <div className="border-t border-gray-200 bg-white/90 backdrop-blur-md p-4 fixed bottom-0 left-0 w-full md:w-[400px] md:left-auto md:right-0 md:top-auto shadow-lg z-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {selectedSite.name}
            </h3>
            <button
              onClick={() => setSelectedSite(null)}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>

          <p className="text-sm text-gray-700 mb-1">
            <strong>Address:</strong> {selectedSite.address || "No address"}
          </p>
          <p className="text-sm text-gray-700 mb-3">
            <strong>Coordinates:</strong> {selectedSite.latitude},{" "}
            {selectedSite.longitude}
          </p>

          <div className="flex gap-2">
            <PillButton
              size="sm"
              className="bg-blue-50 text-blue-700 hover:bg-blue-100 flex-1"
              onClick={() =>
                handleNavigate(
                  parseFloat(selectedSite.latitude),
                  parseFloat(selectedSite.longitude)
                )
              }
            >
              <Navigation className="w-4 h-4 mr-1" /> Navigate
            </PillButton>
            <PillButton
              size="sm"
              className="bg-gray-50 text-gray-700 hover:bg-gray-100"
              onClick={() => {
                mapInstanceRef.current.panTo({
                  lat: parseFloat(selectedSite.latitude),
                  lng: parseFloat(selectedSite.longitude),
                });
                mapInstanceRef.current.setZoom(15);
              }}
            >
              <MapPin className="w-4 h-4 mr-1" /> Center
            </PillButton>
          </div>
        </div>
      )}
    </div>
  );
}
