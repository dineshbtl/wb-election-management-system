"use client";

import { useState, useEffect } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { ModernSidebar } from "@/components/layout/modern-sidebar";
import { ModernHeader } from "@/components/layout/modern-header";
import { ModernCard } from "@/components/ui/modern-card";
import { PillButton } from "@/components/ui/pill-button";
import { StatCard } from "@/components/ui/stat-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select as AntdSelect } from "antd"; // ✅ Import Ant Design Select

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  Plus,
  Camera,
  Wifi,
  WifiOff,
  Settings,
  Eye,
  Download,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle,
  Navigation,
  X,
  RefreshCw,
} from "lucide-react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface Camera {
  id?: string;
  type: string;
  serialNumber: string;
  poleLocation: string;
  distanceBetweenCameras: string;
  direction: string;
  gpsLatitude: string;
  gpsLongitude: string;
}

interface Survey {
  id: string;
  documentId: string;
  surveyName: string;
  cameraDetails: Camera[];
}

export default function CamerasPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [cameras, setCameras] = useState([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddCameraModalOpen, setIsAddCameraModalOpen] = useState(false);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const [newCamera, setNewCamera] = useState<Camera>({
    type: "",
    serialNumber: "",
    poleLocation: "",
    distanceBetweenCameras: "",
    direction: "",
    gpsLatitude: "",
    gpsLongitude: "",
  });
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [gpsStatus, setGpsStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [isRefreshingGPS, setIsRefreshingGPS] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  const router = useRouter();

  // Fetch cameras and surveys
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cameraResponse, surveyResponse] = await Promise.all([
          api.get("/surveys?populate=*"),
          api.get("/surveys?populate=cameraDetails"),
        ]);

        if (
          cameraResponse.data.data &&
          Array.isArray(cameraResponse.data.data)
        ) {
          const mappedCameras = cameraResponse.data.data.flatMap((survey) =>
            survey.cameraDetails.map((camera) => ({
              id: camera.serialNumber || `CAM-${survey.id}-${camera.id}`,
              name: `${
                survey.bus_station?.name
                  ? survey.bus_station?.name
                  : survey.locationDetails
              } - ${camera.direction || "Unknown"}`,
              type: camera.type.toUpperCase() || "Unknown",
              location:
                survey.bus_station?.address ||
                survey.locationDetails ||
                "Unknown Location",
              status:
                survey.workStatus === "in-progress" ? "maintenance" : "online",
              lastSeen:
                new Date(survey.updatedAt).toLocaleString() || "Unknown",
              resolution: "1080p",
              storage: "50%",
              alerts: 0,
            }))
          );
          setCameras(mappedCameras);
        } else {
          setError("No camera data found");
        }

        if (
          surveyResponse.data.data &&
          Array.isArray(surveyResponse.data.data)
        ) {
          setSurveys(
            surveyResponse.data.data.map((s: any) => ({
              id: s.id.toString(),
              documentId: s.documentId,
              surveyName: s.surveyName,
              cameraDetails: s.cameraDetails || [],
            }))
          );
        } else {
          setError("No survey data found");
        }
      } catch (err) {
        setError("Failed to fetch data");
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    getGPSLocation();
  }, []);

  // Get current GPS location
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
          console.error("GPS Error:", error);
          setGpsStatus("error");
          setIsRefreshingGPS(false);
          toast({
            variant: "destructive",
            title: "GPS Error",
            description:
              "Unable to get your current location. Please check your location settings.",
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

  // Handle camera form input changes
  const updateCameraDetail = (field: string, value: string) => {
    setNewCamera((prev) => ({ ...prev, [field]: value }));
  };

  // Apply current GPS location to camera
  const applyCurrentLocationToCamera = () => {
    if (location) {
      setNewCamera((prev) => ({
        ...prev,
        gpsLatitude: location.lat.toString(),
        gpsLongitude: location.lng.toString(),
      }));
      toast({
        variant: "success",
        title: "GPS Applied",
        description: "Current location applied to camera",
      });
    }
  };

  // Handle camera form submission
  const handleAddCamera = async () => {
    if (!selectedSurveyId) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a survey",
      });
      return;
    }

    if (!newCamera.type || !newCamera.poleLocation) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Camera type and pole location are required",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const survey = surveys.find((s) => s.documentId === selectedSurveyId);
      if (!survey) {
        throw new Error("Selected survey not found");
      }

      const updatedCameraDetails = [...survey.cameraDetails, newCamera];

      const payload = {
        data: {
          cameraDetails: updatedCameraDetails.map((camera) => {
            const { id, ...rest } = camera;
            return rest;
          }),
        },
      };

      await api.put(`/surveys/${selectedSurveyId}`, payload);

      // Update local state
      setCameras((prev) => [
        ...prev,
        {
          id: newCamera.serialNumber || `CAM-${survey.id}-${Date.now()}`,
          name: `${survey.surveyName} - ${newCamera.direction || "Unknown"}`,
          type: newCamera.type.toUpperCase(),
          location: survey.locationDetails || "Unknown Location",
          status:
            survey.workStatus === "in-progress" ? "maintenance" : "online",
          lastSeen: new Date().toLocaleString(),
          resolution: "1080p",
          storage: "50%",
          alerts: 0,
        },
      ]);

      setSurveys((prev) =>
        prev.map((s) =>
          s.documentId === selectedSurveyId
            ? { ...s, cameraDetails: updatedCameraDetails }
            : s
        )
      );

      setIsAddCameraModalOpen(false);
      setSelectedSurveyId(null);
      setNewCamera({
        type: "",
        serialNumber: "",
        poleLocation: "",
        distanceBetweenCameras: "",
        direction: "",
        gpsLatitude: "",
        gpsLongitude: "",
      });

      toast({
        variant: "success",
        title: "Camera Added",
        description: `Camera added to ${survey.surveyName} successfully`,
      });
    } catch (error) {
      console.error("Error adding camera:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add camera. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-100 text-green-800";
      case "offline":
        return "bg-red-100 text-red-800";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
        return <CheckCircle className="w-4 h-4" />;
      case "offline":
        return <WifiOff className="w-4 h-4" />;
      case "maintenance":
        return <Settings className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const filteredCameras = cameras.filter((camera) => {
    const matchesSearch =
      camera.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      camera.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || camera.status === statusFilter;
    const matchesType = typeFilter === "all" || camera.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const onlineCameras = cameras.filter((c) => c.status === "online").length;
  const offlineCameras = cameras.filter((c) => c.status === "offline").length;
  const maintenanceCameras = cameras.filter(
    (c) => c.status === "maintenance"
  ).length;
  const totalAlerts = cameras.reduce((sum, c) => sum + c.alerts, 0);

  if (loading) {
    return (
      <PageLayout>
        <div className="flex h-screen">
          <div className="flex-1 flex flex-col overflow-hidden">
            <main className="flex-1 overflow-y-auto p-6">
              <p>Loading cameras...</p>
            </main>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <div className="flex h-screen">
          <div className="flex-1 flex flex-col overflow-hidden">
            <main className="flex-1 overflow-y-auto p-6">
              <ModernCard>
                <div className="text-center py-12">
                  <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Error
                  </h3>
                  <p className="text-gray-600">{error}</p>
                </div>
              </ModernCard>
            </main>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <div>
      <main className="flex-1">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <StatCard
              title="Total Cameras"
              value={cameras.length}
              subtitle="All locations"
              icon={<Camera className="w-6 h-6" />}
              color="amber"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <StatCard
              title="Online"
              value={onlineCameras}
              subtitle="Active now"
              trend={{
                value: `${Math.round((onlineCameras / cameras.length) * 100)}%`,
                direction: "up",
              }}
              icon={<Wifi className="w-6 h-6" />}
              color="green"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <StatCard
              title="Offline"
              value={offlineCameras}
              subtitle="Need attention"
              icon={<WifiOff className="w-6 h-6" />}
              color="red"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <StatCard
              title="Alerts"
              value={totalAlerts}
              subtitle="Active alerts"
              icon={<AlertTriangle className="w-6 h-6" />}
              color="purple"
            />
          </motion.div>
        </div>

        {/* Filters and Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <ModernCard className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
              <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search cameras..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-80 h-10 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 h-10 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40 h-10 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="ANPR">ANPR</SelectItem>
                    <SelectItem value="DOME">Dome</SelectItem>
                    <SelectItem value="BULLET">Bullet</SelectItem>
                    <SelectItem value="PTZ">PTZ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-3">
                <PillButton variant="secondary" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  More Filters
                </PillButton>
                <PillButton variant="secondary" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </PillButton>
                <PillButton
                  variant="accent"
                  size="sm"
                  onClick={() => setIsAddCameraModalOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Camera
                </PillButton>
              </div>
            </div>
          </ModernCard>
        </motion.div>

        {/* Cameras Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredCameras.map((camera, index) => (
            <motion.div
              key={camera.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <ModernCard className="h-full">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-3 rounded-2xl">
                        <Camera className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">
                          {camera.name}
                        </h3>
                        <p className="text-sm text-gray-600">{camera.id}</p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(camera.status)}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(camera.status)}
                        <span>{camera.status}</span>
                      </div>
                    </Badge>
                  </div>
                  <div className="aspect-video bg-gray-200 rounded-2xl flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Live Feed</p>
                      <p className="text-xs text-gray-400">
                        {camera.resolution}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Type:</span>
                      <Badge variant="outline">{camera.type}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Location:</span>
                      <span className="text-gray-900 text-right">
                        {camera.location}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Last Seen:</span>
                      <span className="text-gray-900">{camera.lastSeen}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Storage:</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-amber-400 to-yellow-500 h-2 rounded-full"
                            style={{ width: camera.storage }}
                          />
                        </div>
                        <span className="text-gray-900">{camera.storage}</span>
                      </div>
                    </div>
                    {camera.alerts > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Alerts:</span>
                        <Badge className="bg-red-100 text-red-800">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {camera.alerts}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200/50">
                    <PillButton variant="secondary" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </PillButton>
                    <PillButton variant="secondary" size="sm">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </PillButton>
                    <PillButton variant="secondary" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </PillButton>
                  </div>
                </div>
              </ModernCard>
            </motion.div>
          ))}
        </motion.div>

        {filteredCameras.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <ModernCard>
              <div className="text-center py-12">
                <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No cameras found
                </h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your search or filter criteria
                </p>
                <PillButton
                  variant="accent"
                  onClick={() => setIsAddCameraModalOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Camera
                </PillButton>
              </div>
            </ModernCard>
          </motion.div>
        )}

        {/* Add Camera Modal */}
        <Dialog
          open={isAddCameraModalOpen}
          onOpenChange={(open) => {
            setIsAddCameraModalOpen(open);
            if (!open) {
              // Reset everything when modal closes
              setSelectedSurveyId(null);
              setNewCamera({
                type: "",
                serialNumber: "",
                poleLocation: "",
                distanceBetweenCameras: "",
                direction: "",
                gpsLatitude: "",
                gpsLongitude: "",
              });
            }
          }}
        >
          <DialogContent className="max-w-4xl bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-white/30">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>Add Camera to Survey</DialogTitle>
              </div>
            </DialogHeader>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto">
              {!selectedSurveyId ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    Select Survey
                  </h3>
                  <div className="px-5">
                    <Select
                      value={selectedSurveyId || ""}
                      onValueChange={(value) => setSelectedSurveyId(value)}
                    >
                      <SelectTrigger className="h-12 bg-white/80   backdrop-blur-sm border-white/30 rounded-2xl">
                        <SelectValue placeholder="Select a survey" />
                      </SelectTrigger>
                      <SelectContent>
                        {surveys.map((survey) => (
                          <SelectItem
                            className="cursor-pointer"
                            key={survey.documentId}
                            value={survey.documentId}
                          >
                            {survey.surveyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end">
                    <PillButton
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        if (selectedSurveyId) {
                          // Proceed to camera form
                        } else {
                          toast({
                            variant: "destructive",
                            title: "Validation Error",
                            description: "Please select a survey",
                          });
                        }
                      }}
                      disabled={!selectedSurveyId}
                    >
                      Next
                    </PillButton>
                  </div>
                </div>
              ) : (
                <>
                  {/* GPS Status Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <ModernCard>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div
                            className={`p-3 rounded-2xl ${
                              gpsStatus === "success"
                                ? "bg-gradient-to-br from-green-400 to-emerald-500"
                                : gpsStatus === "error"
                                ? "bg-gradient-to-br from-red-400 to-red-500"
                                : "bg-gradient-to-br from-amber-400 to-yellow-500"
                            }`}
                          >
                            <Navigation className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">
                              GPS Location Status
                            </h3>
                            <p className="text-sm text-gray-600">
                              {gpsStatus === "success" && location
                                ? `Lat: ${location.lat.toFixed(
                                    6
                                  )}, Lng: ${location.lng.toFixed(6)}`
                                : gpsStatus === "error"
                                ? "Unable to get location"
                                : "Getting location..."}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              gpsStatus === "success"
                                ? "bg-green-100 text-green-800"
                                : gpsStatus === "error"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {gpsStatus === "success"
                              ? "Connected"
                              : gpsStatus === "error"
                              ? "Offline"
                              : "Connecting..."}
                          </div>
                          <PillButton
                            variant="secondary"
                            size="sm"
                            onClick={getGPSLocation}
                            disabled={isRefreshingGPS}
                          >
                            <RefreshCw
                              className={`w-4 h-4 ${
                                isRefreshingGPS ? "animate-spin" : ""
                              }`}
                            />
                          </PillButton>
                        </div>
                      </div>
                    </ModernCard>
                  </motion.div>

                  {/* Camera Details Form */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    <ModernCard>
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl">
                          <Camera className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            Camera Details
                          </h3>
                          <p className="text-gray-600">
                            Enter camera specifications and installation details
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Camera Type *
                          </Label>
                          <Select
                            value={newCamera.type}
                            onValueChange={(value) =>
                              updateCameraDetail("type", value)
                            }
                          >
                            <SelectTrigger className="h-10 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl">
                              <SelectValue placeholder="Select Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bullet">
                                Bullet Camera
                              </SelectItem>
                              <SelectItem value="dome">Dome Camera</SelectItem>
                              <SelectItem value="ptz">PTZ Camera</SelectItem>
                              <SelectItem value="anpr">ANPR Camera</SelectItem>
                              <SelectItem value="thermal">
                                Thermal Camera
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Direction/Angle *
                          </Label>
                          <Select
                            value={newCamera.direction}
                            onValueChange={(value) =>
                              updateCameraDetail("direction", value)
                            }
                          >
                            <SelectTrigger className="h-10 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl">
                              <SelectValue placeholder="Select Direction" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="north">North</SelectItem>
                              <SelectItem value="south">South</SelectItem>
                              <SelectItem value="east">East</SelectItem>
                              <SelectItem value="west">West</SelectItem>
                              <SelectItem value="northeast">
                                Northeast
                              </SelectItem>
                              <SelectItem value="northwest">
                                Northwest
                              </SelectItem>
                              <SelectItem value="southeast">
                                Southeast
                              </SelectItem>
                              <SelectItem value="southwest">
                                Southwest
                              </SelectItem>
                              <SelectItem value="entrance">
                                Main Entrance
                              </SelectItem>
                              <SelectItem value="exit">Exit Gate</SelectItem>
                              <SelectItem value="platform">
                                Platform View
                              </SelectItem>
                              <SelectItem value="parking">
                                Parking Area
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Serial Number
                          </Label>
                          <Input
                            value={newCamera.serialNumber}
                            onChange={(e) =>
                              updateCameraDetail("serialNumber", e.target.value)
                            }
                            className="h-10 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Pole Location *
                          </Label>
                          <Input
                            value={newCamera.poleLocation}
                            onChange={(e) =>
                              updateCameraDetail("poleLocation", e.target.value)
                            }
                            placeholder="Describe pole location"
                            className="h-10 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Distance Between Cameras (meters)
                          </Label>
                          <Input
                            type="number"
                            value={newCamera.distanceBetweenCameras}
                            onChange={(e) =>
                              updateCameraDetail(
                                "distanceBetweenCameras",
                                e.target.value
                              )
                            }
                            placeholder="30"
                            className="h-10 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            GPS Latitude
                          </Label>
                          <Input
                            type="number"
                            step="any"
                            value={newCamera.gpsLatitude}
                            onChange={(e) =>
                              updateCameraDetail("gpsLatitude", e.target.value)
                            }
                            placeholder={
                              location?.lat.toString() || "Enter latitude"
                            }
                            className="h-10 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            GPS Longitude
                          </Label>
                          <Input
                            type="number"
                            step="any"
                            value={newCamera.gpsLongitude}
                            onChange={(e) =>
                              updateCameraDetail("gpsLongitude", e.target.value)
                            }
                            placeholder={
                              location?.lng.toString() || "Enter longitude"
                            }
                            className="h-10 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl"
                          />
                        </div>
                      </div>
                      {location && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Navigation className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-800">
                                Current GPS Location
                              </span>
                            </div>
                            <PillButton
                              variant="secondary"
                              size="sm"
                              onClick={applyCurrentLocationToCamera}
                            >
                              Use Current Location
                            </PillButton>
                          </div>
                          <p className="text-sm text-blue-600 mt-1">
                            Lat: {location.lat.toFixed(6)}, Lng:{" "}
                            {location.lng.toFixed(6)}
                          </p>
                        </div>
                      )}
                    </ModernCard>
                  </motion.div>

                  {/* Action Buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="flex justify-end space-x-3"
                  >
                    <PillButton
                      variant="secondary"
                      onClick={() => {
                        setIsAddCameraModalOpen(false);
                        setSelectedSurveyId(null);
                        setNewCamera({
                          type: "",
                          serialNumber: "",
                          poleLocation: "",
                          distanceBetweenCameras: "",
                          direction: "",
                          gpsLatitude: "",
                          gpsLongitude: "",
                        });
                      }}
                    >
                      Cancel
                    </PillButton>
                    <PillButton
                      variant="primary"
                      size="lg"
                      onClick={handleAddCamera}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Adding Camera..." : "Add Camera"}
                    </PillButton>
                  </motion.div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
