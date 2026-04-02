"use client";

import React, { useState, useEffect, use } from "react";
import {
  MapPin,
  Building,
  Bus,
  Camera,
  FileText,
  Clock,
  Users,
  Phone,
  Navigation,
  CheckCircle,
  AlertCircle,
  Loader,
  Image as ImageIcon,
  Calendar,
  Hash,
} from "lucide-react";

type GpsStatus = "loading" | "success" | "error";

interface Survey {
  documentId: string;
  surveyName: string;
  surveyPurpose: string;
  workStatus: string;
  notes: string;
  createdAt: string;
  division?: { name: string; region: string };
  depot?: { name: string; code: string; contactPerson: string };
  bus_station?: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  bus_stand?: { name: string; platformNumber: string; capacity: number };
  photos?: { url: string }[];
  cameraDetails?: {
    type: string;
    serialNumber: string;
    poleLocation: string;
    gpsLatitude: string;
    gpsLongitude: string;
  }[];
}

// Mock data for demonstration
const mockSurvey: Survey = {
  documentId: "survey-001",
  surveyName: "Central Bus Terminal Infrastructure Survey",
  surveyPurpose: "Infrastructure assessment and modernization planning",
  workStatus: "Completed",
  notes:
    "Comprehensive survey completed with all safety protocols followed. Recommend immediate attention to platform accessibility.",
  createdAt: "2024-01-15T09:30:00Z",
  division: {
    name: "Metropolitan Transport Division",
    region: "Central Region",
  },
  depot: {
    name: "Central Bus Depot",
    code: "CBD-001",
    contactPerson: "John Anderson",
  },
  bus_station: {
    name: "Central Bus Terminal",
    address: "123 Main Street, Downtown, Metro City",
    latitude: 40.7128,
    longitude: -74.006,
  },
  bus_stand: {
    name: "Platform A",
    platformNumber: "A-01",
    capacity: 150,
  },
  photos: [
    {
      url: "https://images.pexels.com/photos/1115804/pexels-photo-1115804.jpeg",
    },
    {
      url: "https://images.pexels.com/photos/1267338/pexels-photo-1267338.jpeg",
    },
    {
      url: "https://images.pexels.com/photos/1007025/pexels-photo-1007025.jpeg",
    },
  ],
  cameraDetails: [
    {
      type: "IP Security Camera",
      serialNumber: "CAM-001-2024",
      poleLocation: "North Entrance",
      gpsLatitude: "40.7128",
      gpsLongitude: "-74.0060",
    },
    {
      type: "PTZ Camera",
      serialNumber: "PTZ-002-2024",
      poleLocation: "Platform A",
      gpsLatitude: "40.7129",
      gpsLongitude: "-74.0061",
    },
  ],
};

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "in progress":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "pending":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
        status
      )}`}
    >
      {status === "Completed" && <CheckCircle className="w-4 h-4 mr-1.5" />}
      {status === "In Progress" && <Clock className="w-4 h-4 mr-1.5" />}
      {status}
    </span>
  );
};

const InfoCard = ({
  title,
  icon: Icon,
  children,
  className = "",
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 ${className}`}
  >
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-blue-50 rounded-lg">
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    </div>
    {children}
  </div>
);

const GPSIndicator = ({ status }: { status: GpsStatus }) => {
  const getIndicatorProps = () => {
    switch (status) {
      case "success":
        return {
          color: "text-emerald-600",
          bg: "bg-emerald-100",
          label: "Connected",
        };
      case "error":
        return {
          color: "text-red-600",
          bg: "bg-red-100",
          label: "Disconnected",
        };
      default:
        return {
          color: "text-amber-600",
          bg: "bg-amber-100",
          label: "Connecting...",
        };
    }
  };

  const { color, bg, label } = getIndicatorProps();

  return (
    <div className="flex items-center gap-2">
      <div className={`p-1.5 ${bg} rounded-full`}>
        {status === "loading" ? (
          <Loader className={`w-4 h-4 ${color} animate-spin`} />
        ) : (
          <Navigation className={`w-4 h-4 ${color}`} />
        )}
      </div>
      <span className={`text-sm font-medium ${color}`}>{label}</span>
    </div>
  );
};

function App() {
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("loading");
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading and GPS connection
    setTimeout(() => {
      setSurvey(mockSurvey);
      setLoading(false);
      setGpsStatus("success");
    }, 1500);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading survey details...</p>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Survey Not Found
          </h2>
          <p className="text-gray-600">
            The requested survey could not be loaded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-600 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Survey Details
                </h1>
                <p className="text-sm text-gray-500">ID: {survey.documentId}</p>
              </div>
            </div>
            <GPSIndicator status={gpsStatus} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Survey Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                {survey.surveyName}
              </h2>
              <p className="text-lg text-gray-600 mb-4">
                {survey.surveyPurpose}
              </p>

              <div className="flex flex-wrap items-center gap-4 mb-6">
                <StatusBadge status={survey.workStatus} />
                <div className="flex items-center gap-2 text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    {new Date(survey.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {survey.notes && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Survey Notes
                  </h4>
                  <p className="text-blue-800">{survey.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Division */}
            {survey.division && (
              <InfoCard title="Division" icon={Building}>
                <div className="space-y-2">
                  <p className="text-gray-900 font-medium">
                    {survey.division.name}
                  </p>
                  <p className="text-gray-600 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {survey.division.region}
                  </p>
                </div>
              </InfoCard>
            )}

            {/* Depot */}
            {survey.depot && (
              <InfoCard title="Depot Information" icon={Bus}>
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-900 font-medium">
                      {survey.depot.name}
                    </p>
                    <p className="text-gray-600 flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      Code: {survey.depot.code}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-gray-600 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Contact: {survey.depot.contactPerson}
                    </p>
                  </div>
                </div>
              </InfoCard>
            )}

            {/* Bus Stand */}
            {survey.bus_stand && (
              <InfoCard title="Bus Stand Details" icon={Users}>
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-900 font-medium">
                      {survey.bus_stand.name}
                    </p>
                    <p className="text-gray-600">
                      Platform: {survey.bus_stand.platformNumber}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-gray-600">
                      <span className="font-medium">Capacity:</span>{" "}
                      {survey.bus_stand.capacity} passengers
                    </p>
                  </div>
                </div>
              </InfoCard>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Bus Station */}
            {survey.bus_station && (
              <InfoCard title="Bus Station Location" icon={MapPin}>
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-900 font-medium">
                      {survey.bus_station.name}
                    </p>
                    <p className="text-gray-600">
                      {survey.bus_station.address}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-gray-600 flex items-center gap-2">
                      <Navigation className="w-4 h-4" />
                      GPS: {survey.bus_station.latitude}°,{" "}
                      {survey.bus_station.longitude}°
                    </p>
                  </div>
                </div>
              </InfoCard>
            )}

            {/* Camera Details */}
            {survey.cameraDetails && survey.cameraDetails.length > 0 && (
              <InfoCard title="Camera Installation" icon={Camera}>
                <div className="space-y-4">
                  {survey.cameraDetails.map((camera, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-gray-900">
                          {camera.type}
                        </p>
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                          {camera.serialNumber}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-2">
                        Location: {camera.poleLocation}
                      </p>
                      <p className="text-gray-600 text-sm flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        {camera.gpsLatitude}°, {camera.gpsLongitude}°
                      </p>
                    </div>
                  ))}
                </div>
              </InfoCard>
            )}
          </div>
        </div>

        {/* Photos Section */}
        {survey.photos && survey.photos.length > 0 && (
          <div className="mt-8">
            <InfoCard title="Survey Photos" icon={ImageIcon}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {survey.photos.map((photo, index) => (
                  <div
                    key={index}
                    className="group relative overflow-hidden rounded-lg bg-gray-100"
                  >
                    <img
                      src={photo.url}
                      alt={`Survey Photo ${index + 1}`}
                      className="w-full h-64 object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-200" />
                  </div>
                ))}
              </div>
            </InfoCard>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
