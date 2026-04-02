"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ModernHeader } from "@/components/layout/modern-header";
import { ModernSidebar } from "@/components/layout/modern-sidebar";
import { PageLayout } from "@/components/layout/page-layout";
import {
  ArrowLeft,
  Backpack,
  Building,
  Bus,
  Calendar,
  Camera,
  CheckCircle,
  Clock,
  Hash,
  ImageIcon,
  MapPin,
  Navigation,
  Phone,
  Users,
} from "lucide-react";
import Link from "next/link";

type GpsStatus = "loading" | "success" | "error";

interface Survey {
  documentId: string;
  createdAt: string;
  surveyName: string;
  surveyPurpose: string;
  workStatus: string;
  notes: string;
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

const SurveyDetailsPage = () => {
  const params = useParams();
  const surveyId = params?.id as string;

  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("loading");
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false); // New state for animation

  useEffect(() => {
    if (!surveyId) return;

    const fetchSurvey = async () => {
      try {
        const res = await fetch(
          `http://183.82.117.36:1337/api/surveys/${surveyId}?populate=*`
        );
        const data = await res.json();
        setSurvey(data.data);
        console.log("Fetched survey data:", data.data);
      } catch (err) {
        console.error("Error fetching survey:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSurvey();
    setIsMounted(true); // Trigger animation on mount
  }, [surveyId]);

  return (
    <div className="flex min-h-screen">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 overflow-auto">
          {loading ? (
            <p className="text-gray-500">Loading survey...</p>
          ) : survey ? (
            <div
              className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${
                isMounted ? "animate-fadeInUp" : ""
              }`} // Apply animation class
            >
              <div className="flex items-center">
                <ArrowLeft className="w-5 h-5 text-blue-600 mb-2" />
                <Link
                  href="/purchase/surveys"
                  className="text-blue-600 font-medium mb-2"
                >
                  Back to Surveys List
                </Link>
              </div>
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
                          {new Date(survey.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
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
                          <div
                            key={index}
                            className="bg-gray-50 rounded-lg p-4"
                          >
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
                            src={`http://183.82.117.36:1337${photo.url}`}
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
          ) : (
            <p className="text-red-500">Survey not found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SurveyDetailsPage;
