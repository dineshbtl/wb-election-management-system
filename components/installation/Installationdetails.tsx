"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ClipboardList,
  FileText,
  X,
  Wrench,
  Plus,
  Edit3,
  CheckCircle,
} from "lucide-react";
import {
  Spin,
  Modal,
  Input,
  Switch,
  Select,
  DatePicker,
  message,
  Image,
  Skeleton,
  Tag,
} from "antd";
import { useToast } from "@/hooks/use-toast";
import dayjs from "dayjs";
import bpi from "@/lib/bpi";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import SurveyModal from "../survey/Surveymodal";
import EditSurveyModal from "../survey/EditSurveyModal";
import InstallationModal from "./InstallationModal";

interface SurveyPhoto {
  file: File | null;
  title: string;
  description: string;
}

export default function InstallationdetailsPage({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [location, setLocation] = useState<any>(null);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [isBoqModalOpen, setIsBoqModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [surveyViewMode, setSurveyViewMode] = useState<
    "create" | "edit" | "view"
  >("create");

  const { user, loading } = useAuth();

  // 🧠 State for Camera Modal
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  const [isEditSurveyOpen, setIsEditSurveyOpen] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<any>(null);

  const baseurl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const [cameras, setCameras] = useState<any[]>([]);

  // 🧾 Survey Form
  const [surveyForm, setSurveyForm] = useState({
    id: null as string | null,
    Power_Available: false,
    Network_Available: false,
    site_condition: "Good",
    site_description: "", // ✅ ADD THIS

    GPS_Latitude: "",
    GPS_Longitude: "",
    Remarks: "",
    survey_date: dayjs(),
    airtel_signal: 0,
    jio_signal: 0,
    survey_photo: [{ file: null, title: "", description: "" }] as SurveyPhoto[],
  });

  // 🧰 BOQ Form
  const [boqForm, setBoqForm] = useState({
    kits_required: "",
    additional_requirements: "",
    Remarks: "",
  });

  const [boqs, setBoqs] = useState<any[]>([]);

  // 🔹 Fetch cameras for this location
  const fetchCameras = async (locationDocId: string) => {
    if (!locationDocId) return;
    try {
      const res = await bpi.get(
        `/cameras?filters[assigned_booth][documentId][$eq]=${encodeURIComponent(
          locationDocId,
        )}&populate=*`,
      );
      setCameras(res.data.data || []);
    } catch (err) {
      console.error("Error fetching cameras:", err);
    }
  };

  // 🔹 Fetch BOQs for this location
  const fetchBoqs = async () => {
    try {
      const res = await bpi.get(
        `/boqs?filters[location][documentId][$eq]=${id}&populate=location`,
      );
      setBoqs(res.data.data);
    } catch (err) {
      console.error("Error fetching BOQs:", err);
    }
  };

  // 🔹 Fetch current logged-in user

  // 🔹 Fetch location details
  const fetchLocation = async () => {
    try {
      const res = await bpi.get(
        `/locations/${encodeURIComponent(
          id,
        )}?populate[0]=assembly.district&populate[1]=boqs&populate[2]=booth_coordinator.profile`,
      );
      setLocation(res.data.data);
    } catch (err) {
      console.error("Error fetching location details:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch location details.",
      });
    }
  };

  // 🔹 Fetch surveys for this location
  const fetchSurveys = async () => {
    try {
      const res = await bpi.get(
        `/surveys?filters[booth][documentId][$eq]=${encodeURIComponent(
          id,
        )}&populate[raised_by][fields][0]=documentId&populate[raised_by][fields][1]=username&populate[survey_photo][populate]=image`,
      );
      setSurveys(res.data.data || []);
      console.log("Fetched surveys:", res.data.data);
    } catch (err) {
      console.error("Error fetching surveys:", err);
    }
  };

  // 📋 Reset survey form
  const resetSurveyForm = () => {
    setSurveyForm({
      id: null,
      Power_Available: false,
      Network_Available: false,
      site_condition: "Good",
      site_description: "",

      GPS_Latitude: "",
      GPS_Longitude: "",
      Remarks: "",
      survey_date: dayjs(),
      airtel_signal: 0,
      jio_signal: 0,
      survey_photo: [{ file: null, title: "", description: "" }],
    });
  };

  // single useEffect — fetch location, surveys, boqs, and user once
  useEffect(() => {
    if (!id) return;
    const loadData = async () => {
      setLoadingInitial(true);
      try {
        await fetchLocation();
        await Promise.all([fetchSurveys(), fetchBoqs()]);
      } catch (err) {
        console.error("Error loading data:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load location details.",
        });
      } finally {
        setLoadingInitial(false);
      }
    };
    loadData();
  }, [id]);

  useEffect(() => {
    if (location?.documentId) {
      fetchCameras(location.documentId);
    }
  }, [location]);

  console.log("Location:", location?.booth_coordinator?.profile);
  if (loadingInitial)
    return (
      <div className="flex justify-center items-center h-screen">
        <Spin size="large" />
      </div>
    );
  if (!location)
    return (
      <div className="p-6 text-center text-gray-600">Location not found.</div>
    );

  const { PS_Name, PS_No, PS_Location, assembly } = location;

  // 🧠 Check which cameras are already installed
  const hasInCamera = cameras.some((cam) => cam.Position === "IN");
  const hasOutCamera = cameras.some((cam) => cam.Position === "OUT");
  const allCamerasInstalled = hasInCamera && hasOutCamera;
  const hasSurvey = surveys.length > 0;
  const activeSurvey = surveys[0];
  const isCompleted = activeSurvey?.state === "Completed";

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spin size="large" />
      </div>
    );
  }

  const userRole = user?.role?.type;

  const isAssemblyCoordinator = userRole === "assembly_coordinator";
  const isBoothCoordinator = userRole === "booth_coordinator";

  const isRaisedByUser =
    activeSurvey?.raised_by?.documentId === user?.documentId;

  const canMarkCompleted =
    !isCompleted &&
    !isBoothCoordinator &&
    !(isAssemblyCoordinator && isRaisedByUser);

  console.log("User Role:", user?.role);
  console.log("Raised By:", activeSurvey?.raised_by);

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8 lg:py-10 px-2 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto bg-white shadow-lg rounded-2xl p-4 sm:p-6 lg:p-8">
        {/* Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <Button
            variant="outline"
            className="flex items-center space-x-2"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>
          <h2 className="text-2xl font-semibold text-gray-800 ml-4">
            Location Details
          </h2>
        </div>

        {/* Location Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-gray-800">
          {loadingData ? (
            [...Array(6)].map((_, i) => (
              <div key={i}>
                <Skeleton active paragraph={{ rows: 1 }} />
              </div>
            ))
          ) : (
            <>
              <div>
                <p className="font-semibold">PS Name:</p>
                <p>{PS_Name}</p>
              </div>
              <div>
                <p className="font-semibold">PS No:</p>
                <p>{PS_No}</p>
              </div>
              <div>
                <p className="font-semibold">Village:</p>
                <p>{PS_Location || "—"}</p>
              </div>
              <div>
                <p className="font-semibold">Assembly:</p>
                <p>{assembly?.Assembly_Name || "—"}</p>
              </div>
              <div>
                <p className="font-semibold">District:</p>
                <p>{assembly?.district?.district_name || "—"}</p>
              </div>
              <div>
                <p className="font-semibold">State:</p>
                <p>Assam</p>
              </div>
            </>
          )}
        </div>

        {/* 👤 Booth Coordinator Details */}
        {location?.booth_coordinator && (
          <div className="mt-10 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Booth Coordinator
            </h3>
            {loadingData ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i}>
                    <Skeleton active paragraph={{ rows: 1 }} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-gray-800">
                <div>
                  <p className="font-semibold text-gray-700">Name:</p>
                  <p className="text-blue-600 font-medium">
                    {location.booth_coordinator.profile?.Full_Name ||
                      location.booth_coordinator.username ||
                      "—"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Email:</p>
                  <p>{(location.booth_coordinator.email || "").toLowerCase() || "—"}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Phone:</p>
                  <p>
                    {location.booth_coordinator.profile?.Phone_Number || "—"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Father's Name:</p>
                  <p>
                    {location.booth_coordinator.profile?.Father_Name || "—"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">District:</p>
                  <p>{location.booth_coordinator.profile?.District || "—"}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Address:</p>
                  <p>{location.booth_coordinator.profile?.address || "—"}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Installation Section */}
        <div className="mt-10">
          <h3 className="text-xl font-semibold mb-4">Installation Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* IN Camera */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-semibold mb-2">IN Camera</h4>

              {hasInCamera ? (
                cameras
                  .filter((c) => c.Position === "IN")
                  .map((cam) => (
                    <div key={cam.id} className="space-y-2">
                      <p>
                        <strong>ID:</strong> {cam.Camera_ID}
                      </p>

                      <p>
                        <strong>Status:</strong>{" "}
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            cam.state === "Installed"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {cam.state}
                        </span>
                      </p>

                      {/* ✅ IMAGE */}
                      {cam.Photo?.url && (
                        <Image
                          src={`${baseurl}${cam.Photo.url}`}
                          alt="IN Camera"
                          width={200}
                          className="rounded border"
                          preview
                        />
                      )}
                    </div>
                  ))
              ) : (
                <p className="text-gray-500">Not Installed</p>
              )}
            </div>

            {/* OUT Camera */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-semibold mb-2">OUT Camera</h4>

              {hasOutCamera ? (
                cameras
                  .filter((c) => c.Position === "OUT")
                  .map((cam) => (
                    <div key={cam.id} className="space-y-2">
                      <p>
                        <strong>ID:</strong> {cam.Camera_ID}
                      </p>

                      <p>
                        <strong>Status:</strong>{" "}
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            cam.state === "Installed"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {cam.state}
                        </span>
                      </p>

                      {/* ✅ IMAGE */}
                      {cam.Photo?.url && (
                        <Image
                          src={`${baseurl}${cam.Photo.url}`}
                          alt="OUT Camera"
                          width={200}
                          className="rounded border"
                          preview
                        />
                      )}
                    </div>
                  ))
              ) : (
                <p className="text-gray-500">Not Installed</p>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <div className="mt-4">
            <span
              className={`px-3 py-1 rounded text-xs font-medium ${
                allCamerasInstalled
                  ? "bg-green-100 text-green-700"
                  : hasInCamera || hasOutCamera
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
              }`}
            >
              {allCamerasInstalled
                ? "Installed"
                : hasInCamera || hasOutCamera
                  ? "Partial"
                  : "Not Installed"}
            </span>
          </div>

          {!allCamerasInstalled && (
            <Button
              onClick={() => setIsCameraModalOpen(true)}
              className="mt-4 bg-green-600 text-white"
            >
              Raise Installation
            </Button>
          )}
        </div>
      </div>

      <InstallationModal
        open={isCameraModalOpen}
        locationDocId={location.documentId}
        hasIn={hasInCamera}
        hasOut={hasOutCamera}
        onClose={() => setIsCameraModalOpen(false)}
        onSuccess={() => fetchCameras(location.documentId)}
      />
    </div>
  );
}

// 📊 Helper Components
function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}

function SignalBars({
  strength,
  provider,
}: {
  strength: number;
  provider: string;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-2 h-4 rounded-sm ${
            i <= strength ? "bg-green-500" : "bg-gray-300"
          }`}
        />
      ))}
      <span className="text-xs text-gray-500 ml-2">({strength}/5)</span>
    </div>
  );
}
