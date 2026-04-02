"use client";

import React, { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { BackToLink } from "@/components/ui/back-to-link";
import { Button } from "@/components/ui/button";
import { ClipboardList, FileText, X, Wrench, Plus } from "lucide-react";
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
} from "antd";
import { useToast } from "@/hooks/use-toast";
import dayjs from "dayjs";
import bpi from "@/lib/bpi";
import api from "@/lib/api";
import {
  uploadSurveyPhotos,
  createSurvey,
} from "@/lib/survey-api";
import { useAuth } from "@/context/AuthContext";

interface SurveyPhoto {
  file: File | null;
  title: string;
  description: string;
}

export default function LocationDetailsPage({ id }: { id: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const { userrole } = useAuth();
  const backHref = pathname?.startsWith("/district")
    ? "/district/booths"
    : pathname?.startsWith("/assembly")
      ? "/assembly/locations"
      : pathname?.startsWith("/booth")
        ? "/booth/locations"
        : "/surveys";
  const backLabel =
    pathname?.startsWith("/district") ||
    pathname?.startsWith("/assembly") ||
    pathname?.startsWith("/booth")
      ? "Back to Polling Stations"
      : "Back to Surveys";

  const [location, setLocation] = useState<any>(null);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [user, setUser] = useState<any>(null);

  const [isBoqModalOpen, setIsBoqModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

    const handleEditSurvey = (survey: any) => {
    // router.push(`/surveys/${survey.documentId}/edit`);

    console.log("User role:", userrole);

    if (user?.role?.type === "booth_coordinator") {
      router.push(`/booth/surveys/${survey.documentId}/edit`);
    } else {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You do not have permission to edit this survey.",
      });
    }
  };

  // 🧠 State for Camera Modal
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraForm, setCameraForm] = useState({
    Camera_ID: "",
    Position: "IN", // default
    state: "Installed",
    photo: null as File | null,
  });

  const baseurl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const [cameras, setCameras] = useState<any[]>([]);

  const fetchCameras = async (locationDocId: string) => {
    if (!locationDocId) return; // 🧠 guard against null
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

  // 🧾 Survey Form
  const [surveyForm, setSurveyForm] = useState({
    Power_Available: false,
    Network_Available: false,
    site_condition: "Good",
    site_description: "", // 👈 ADD THIS
    GPS_Latitude: "",
    GPS_Longitude: "",
    Remarks: "",
    survey_date: dayjs(),
    airtel_signal: 0,
    jio_signal: 0,
    survey_photo: [{ file: null, title: "", description: "" }] as SurveyPhoto[],
  });

  const addPhotoEntry = () => {
    setSurveyForm((prev) => ({
      ...prev,
      survey_photo: [
        ...prev.survey_photo,
        { file: null, title: "", description: "" },
      ],
    }));
  };

  const updatePhotoField = (
    index: number,
    field: keyof SurveyPhoto,
    value: string | File | null,
  ) => {
    setSurveyForm((prev) => {
      const updated = [...prev.survey_photo];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, survey_photo: updated };
    });
  };

  const removePhotoEntry = (index: number) => {
    if (surveyForm.survey_photo.length <= 1) return;
    setSurveyForm((prev) => ({
      ...prev,
      survey_photo: prev.survey_photo.filter((_, i) => i !== index),
    }));
  };

  const [boqs, setBoqs] = useState<any[]>([]);

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

  // � Fetch current logged-in user
  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.warn("No token found. User not logged in.");
        return;
      }

      // Get current user from auth endpoint
      const res = await api.get(
        "/users/me?populate[profile]=true&populate[role]=true",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      console.log("Current user:", res.data);

      setUser(res.data);
    } catch (err) {
      console.error("Error fetching current user:", err);
    }
  };

  // �🔹 Fetch location details
  const fetchLocation = async () => {
    try {
      // ✅ Deep populate to include assembly + district details
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
        )}&populate[raised_by]=true&populate[survey_photo][populate]=image&populate[sim_speeds]=*`,
      );

      setSurveys(res.data.data || []);
    } catch (err) {
      console.error("Error fetching surveys:", err);
    }
  };

  // single useEffect — fetch location, surveys, boqs, and user once
  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      setLoadingInitial(true);
      try {
        await fetchCurrentUser();
        await fetchLocation();

        // Fetch surveys and BOQs
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

  // 🧰 BOQ Form
  const [boqForm, setBoqForm] = useState({
    kits_required: "",
    additional_requirements: "",
    Remarks: "",
  });

  // 📍 Get current location
  const getCurrentGPS = () => {
    if (!navigator.geolocation) {
      message.error("Your browser does not support GPS.");
      return;
    }
    message.info("Fetching current GPS...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSurveyForm({
          ...surveyForm,
          GPS_Latitude: pos.coords.latitude.toFixed(6),
          GPS_Longitude: pos.coords.longitude.toFixed(6),
        });
        message.success("GPS fetched successfully!");
      },
      (err) => {
        console.error(err);
        message.error("Failed to fetch GPS. Please allow permission.");
      },
    );
  };

  // 🎥 Handle Camera Submit
  const handleCameraSubmit = async () => {
    if (!cameraForm.Camera_ID) {
      message.warning("Please enter a Camera ID");
      return;
    }

    const locDbId = location?.id;
    if (!locDbId) {
      message.error("Location not loaded yet. Try again.");
      return;
    }

    setIsSubmitting(true);
    try {
      // check for existing camera at same position
      const q = `/cameras?filters[assigned_booth][id][$eq]=${locDbId}&filters[Position][$eq]=${encodeURIComponent(
        cameraForm.Position,
      )}`;
      const existing = await bpi.get(q);

      if (existing.data?.data?.length > 0) {
        message.error(
          `A ${cameraForm.Position} camera already exists for this location.`,
        );
        setIsSubmitting(false);
        return;
      }

      // 1️⃣ Upload photo if available
      let uploadedPhotoId: number | null = null;
      if (cameraForm.photo) {
        const formData = new FormData();
        formData.append("files", cameraForm.photo);

        const uploadRes = await bpi.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        uploadedPhotoId = uploadRes.data?.[0]?.id || null;
      }

      // 2️⃣ Create camera record
      await bpi.post("/cameras", {
        data: {
          Camera_ID: cameraForm.Camera_ID,
          Position: cameraForm.Position,
          state: cameraForm.state,
          assigned_booth: location.documentId,
          Photo: uploadedPhotoId, // ✅ link uploaded image
        },
      });

      const res = await bpi.get(
        `/cameras?filters[assigned_booth][documentId][$eq]=${location.documentId}`,
      );

      const cams = res.data.data;

      const hasIn = cams.some((c: any) => c.Position === "IN");
      const hasOut = cams.some((c: any) => c.Position === "OUT");

      let newStatus = "Not Installed";

      if (hasIn && hasOut) {
        newStatus = "Installed";
      } else if (hasIn || hasOut) {
        newStatus = "Partial";
      }

      await bpi.put(`/locations/${location.documentId}`, {
        data: { Installation_Status: newStatus },
      });

      toast({
        variant: "success",
        title: "Camera Assigned",
        description: `Camera (${cameraForm.Position}) added successfully.`,
      });

      setIsCameraModalOpen(false);
      setCameraForm({
        Camera_ID: "",
        Position: "IN",
        state: "Installed",
        photo: null,
      });
      fetchCameras(location.documentId); // refresh
    } catch (err) {
      console.error("Camera assignment error:", err);
      toast({
        variant: "destructive",
        title: "Failed",
        description: "Could not assign camera. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🔹 Fetch cameras for this location

  // 🧾 Submit Survey
  const handleSurveySubmit = async () => {
    if (!user?.documentId) {
      message.error("User not logged in. Please refresh the page.");
      return;
    }

    // Validate: at least one photo with title and file
    const validPhotos = surveyForm.survey_photo.filter(
      (p) => p.file && p.title.trim(),
    );
    if (validPhotos.length === 0) {
      message.warning("At least one photo with a title is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1️⃣ Upload all valid photo files (uses api client — no hard timeout)
      const formData = new FormData();
      validPhotos.forEach((p) => formData.append("files", p.file!));
      if (process.env.NODE_ENV === "development") {
        console.log("[LocationDetails] Survey upload start", { photoCount: validPhotos.length });
      }
      let uploadedPhotoIds: number[];
      try {
        uploadedPhotoIds =
          validPhotos.length > 0 ? await uploadSurveyPhotos(formData) : [];
        if (process.env.NODE_ENV === "development") {
          console.log("[LocationDetails] Survey upload complete");
        }
      } catch (uploadErr) {
        console.error("[LocationDetails] Survey upload failed", uploadErr);
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: "Photo upload failed. Check your connection and try again.",
        });
        return;
      }

      // 2️⃣ Build survey_photo components for Strapi
      const surveyPhotosPayload = validPhotos.map((p, i) => ({
        title: p.title,
        description: p.description,
        image: uploadedPhotoIds[i],
      }));

      // 3️⃣ Submit survey
      if (process.env.NODE_ENV === "development") {
        console.log("[LocationDetails] Survey create start");
      }
      try {
        await createSurvey({
          booth: id,
          Power_Available: surveyForm.Power_Available,
          Network_Available: surveyForm.Network_Available,
          site_condition: surveyForm.site_condition,
          GPS_Latitude: parseFloat(surveyForm.GPS_Latitude) || null,
          GPS_Longitude: parseFloat(surveyForm.GPS_Longitude) || null,
          survey_date: surveyForm.survey_date.toISOString(),
          Remarks: surveyForm.Remarks,
          raised_by: user.documentId,
          survey_photo: surveyPhotosPayload,
          airtel_signal: surveyForm.airtel_signal,
          jio_signal: surveyForm.jio_signal,
        });
      } catch (createErr) {
        console.error("[LocationDetails] Survey create failed", createErr);
        toast({
          variant: "destructive",
          title: "Creation Failed",
          description: "Survey creation failed. Your photos were uploaded. Please try again.",
        });
        return;
      }

      toast({
        variant: "success",
        title: "Survey Created",
        description: `Survey created successfully for ${location.PS_Name}.`,
      });

      fetchSurveys(); // refresh list
    } catch (err) {
      console.error("Survey submit error:", err);
      toast({
        variant: "destructive",
        title: "Failed",
        description: "Could not create survey. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🧰 Submit BOQ
  const handleBoqSubmit = async () => {
    setIsSubmitting(true);
    try {
      await bpi.post("/boqs", {
        data: {
          location: id,
          kits_required: boqForm.kits_required,
          additional_requirements: boqForm.additional_requirements,
          Remarks: boqForm.Remarks,
          state: "Pending",
        },
      });

      toast({
        variant: "success",
        title: "BOQ Raised",
        description: "BOQ raised successfully for this site.",
      });
      setIsBoqModalOpen(false);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed",
        description: "Could not raise BOQ. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const hasSurvey = surveys.length > 0; // check if survey already exists

  return (
    <div className="min-h-screen py-10 px-6">
      <div className="mx-auto bg-white shadow-lg rounded-2xl p-8">
        {/* Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <BackToLink href={backHref} label={backLabel} />
          <h2 className="text-2xl font-semibold text-gray-800">
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

        {/* 🏛️ Assembly Details */}
        <div className="mt-10">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Assembly (LAC) Details
          </h3>

          {loadingData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i}>
                  <Skeleton active paragraph={{ rows: 1 }} />
                </div>
              ))}
            </div>
          ) : assembly ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-gray-800">
              <div>
                <p className="font-semibold">Assembly No:</p>
                <p>{assembly.Assembly_No || "—"}</p>
              </div>
              <div>
                <p className="font-semibold">Assembly Name:</p>
                <p>{assembly.Assembly_Name || "—"}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 italic">
              No assembly information available.
            </p>
          )}
        </div>

        {/* 👤 Booth Coordinator Details */}
        {location?.booth_coordinator && (
          <div className="mt-10 border border-gray-200 rounded-xl p-6">
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
                {/* <div>
                  <p className="font-semibold text-gray-700">Date of Birth:</p>
                  <p>
                    {location.booth_coordinator.profile?.DOB
                      ? new Date(location.booth_coordinator.profile.DOB).toLocaleDateString()
                      : "—"}
                  </p>
                </div> */}
                <div>
                  <p className="font-semibold text-gray-700">District:</p>
                  <p>{location.booth_coordinator.profile?.District || "—"}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Address:</p>
                  <p>{location.booth_coordinator.profile?.address || "—"}</p>
                </div>
                {/* <div>
                  <p className="font-semibold text-gray-700">Account Holder Name:</p>
                  <p>{location.booth_coordinator.profile?.Account_Holder_Name || "—"}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Bank Account No:</p>
                  <p className="font-mono text-sm">{location.booth_coordinator.profile?.Bank_Account_No || "—"}</p>
                </div> */}
              </div>
            )}
          </div>
        )}

        {/* 🎥 Camera Details */}
        <div className="mt-10">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Camera Details
          </h3>

          {loadingData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="border rounded-lg p-3">
                  <Skeleton active paragraph={{ rows: 2 }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-gray-800">
              {/* IN Camera */}
              {cameras.some((cam) => cam.Position === "IN") ? (
                cameras
                  .filter((cam) => cam.Position === "IN")
                  .map((cam) => (
                    <div
                      key={cam.id}
                      className="border border-gray-200 rounded-lg p-3"
                    >
                      <p className="font-semibold text-gray-700">
                        IN Camera — {cam.Camera_ID}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        State:{" "}
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            cam.state === "Installed"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {cam.state}
                        </span>
                      </p>

                      {cam.Photo?.url && (
                        <div className="w-40 h-50">
                          <Image
                            src={`${baseurl}${cam.Photo.url}`}
                            alt="Camera photo"
                            className="mt-2 w-40 h-40 object-cover rounded-lg border"
                          />
                        </div>
                      )}
                    </div>
                  ))
              ) : (
                <p className="text-gray-500 italic">
                  No IN Camera assigned yet.
                </p>
              )}

              {/* OUT Camera */}
              {cameras.some((cam) => cam.Position === "OUT") ? (
                cameras
                  .filter((cam) => cam.Position === "OUT")
                  .map((cam) => (
                    <div
                      key={cam.id}
                      className="border border-gray-200 rounded-lg p-3"
                    >
                      <p className="font-semibold text-gray-700">
                        OUT Camera — {cam.Camera_ID}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        State:{" "}
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            cam.state === "Installed"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {cam.state}
                        </span>
                      </p>

                      {cam.Photo?.url && (
                        <div className="w-40 h-40">
                          <Image
                            src={`${baseurl}${cam.Photo.url}`}
                            alt="Camera photo"
                            className="mt-2  object-fill rounded-lg border"
                          />
                        </div>
                      )}
                    </div>
                  ))
              ) : (
                <p className="text-gray-500 italic">
                  No OUT Camera assigned yet.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap gap-4 mt-10">
          {!hasSurvey && (
            <Button
              variant="primary"
              // onClick={() =>
              //   // router.push(`/surveys/new?boothId=${encodeURIComponent(id)}`)

              //   alert(userrole.role.type)
              // }

              onClick={() => {
                user.role.type === "booth_coordinator"
                  ? router.push(
                      `/booth/surveys/new?boothId=${encodeURIComponent(id)}`,
                    )
                  : user.role.type === "district_coordinator"
                    ? router.push(
                        `/district/surveys/new?boothId=${encodeURIComponent(id)}`,
                      )
                    : user.role.type === "assembly_coordinator"
                      ? router.push(
                          `/assembly/surveys/new?boothId=${encodeURIComponent(id)}`,
                        )
                      : router.push(
                          `/surveys/new?boothId=${encodeURIComponent(id)}`,
                        );
              }}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Raise Survey</span>
            </Button>
          )}

          <Button variant="primary" onClick={() => setIsBoqModalOpen(true)}>
            <FileText className="w-4 h-4" />
            <span>Raise BOQ</span>
          </Button>

          {!allCamerasInstalled && (
            <Button
              variant="primary"
              onClick={() => setIsCameraModalOpen(true)}
            >
              <Wrench className="w-4 h-4" />
              <span>Assign Camera</span>
            </Button>
          )}
        </div>

        {/* 🧾 Survey Details */}
        {/* 🧾 Survey Details */}
        <div className="mt-10">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">
            Survey Details
          </h3>

          {loadingData ? (
            [...Array(2)].map((_, i) => (
              <div
                key={i}
                className="bg-white border rounded-xl p-6 mb-6 shadow-sm"
              >
                <Skeleton active paragraph={{ rows: 4 }} />
              </div>
            ))
          ) : surveys.length === 0 ? (
            <p className="text-gray-500 italic">
              No surveys raised yet for this location.
            </p>
          ) : (
            <div className="space-y-6">
              {surveys.map((s, index) => (
                <div
                  key={s.id}
                  className="border border-gray-200 rounded-xl p-6"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800">
                        Survey #{index + 1}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {new Date(s.survey_date).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium
                ${
                  s.state === "Completed"
                    ? "bg-green-100 text-green-700"
                    : "bg-orange-100 text-orange-700"
                }`}
                      >
                        {s.state || "Raised"}
                      </span>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleEditSurvey(s)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>

                  {/* Grid Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                    {s.sim_speeds?.length > 0 && (
                      <div className="md:col-span-2 mt-4">
                        <p className="font-medium text-sm mb-2">
                          📡 Network Speed Test Results
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {s.sim_speeds.map((sim: any) => (
                            <div
                              key={sim.id}
                              className="border border-gray-200 rounded-lg p-4"
                            >
                              <h4 className="font-semibold capitalize mb-2 text-gray-800">
                                {sim.provider} SIM
                              </h4>

                              <div className="text-sm space-y-1">
                                <p>
                                  Download:{" "}
                                  <span className="font-medium text-blue-600">
                                    {sim.download_speed?.toFixed(2)} Mbps
                                  </span>
                                </p>

                                <p>
                                  Upload:{" "}
                                  <span className="font-medium text-green-600">
                                    {sim.upload_speed?.toFixed(2)} Mbps
                                  </span>
                                </p>

                                <p>
                                  Latency:{" "}
                                  <span className="font-medium text-purple-600">
                                    {sim.latency?.toFixed(2)} ms
                                  </span>
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="font-medium">Site Condition</p>
                      <p>{s.site_condition}</p>
                    </div>

                    {s.site_condition && (
                      <div className="mt-4">
                        <p className="font-medium text-sm">Site Condition</p>
                        <p className="text-gray-600 text-sm mt-1">
                          {s.site_description || "—"}
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="font-medium">Power Available</p>
                      <p>{s.Power_Available ? "Yes" : "No"}</p>
                    </div>

                    <div>
                      <p className="font-medium">Network Available</p>
                      <p>{s.Network_Available ? "Yes" : "No"}</p>
                    </div>

                    <div>
                      <p className="font-medium">GPS Coordinates</p>
                      <p className="text-xs">
                        {s.GPS_Latitude || "—"}, {s.GPS_Longitude || "—"}
                      </p>
                    </div>

                    {/* <div>
                      <p className="font-medium">Signal Strength</p>
                      <p>
                        Airtel: {s.airtel_signal}/5 | Jio: {s.jio_signal}/5
                      </p>
                    </div> */}

                    <div>
                      <p className="font-medium">Raised By</p>
                      <p>{s.raised_by?.username || "—"}</p>
                    </div>
                     <div>
                      <p className="font-medium">Survey Raised From</p>
                      <p>{s.locationName || "—"}</p>
                    </div>
                  </div>

                  {/* Remarks */}
                  {s.Remarks && (
                    <div className="mt-4">
                      <p className="font-medium text-sm">Remarks</p>
                      <p className="text-gray-600 text-sm mt-1">{s.Remarks}</p>
                    </div>
                  )}

                  {/* Photos */}
                  {s.survey_photo?.length > 0 && (
                    <div className="mt-5">
                      <p className="font-medium text-sm mb-2">
                        Photo Documentation
                      </p>

                      <div className="flex flex-wrap gap-4">
                        {s.survey_photo.map((photo: any) => (
                          <div key={photo.id} className="w-28">
                            {photo.image?.url && (
                              <Image
                                src={`${baseurl}${photo.image.url}`}
                                alt={photo.title}
                                className="rounded-lg border"
                                preview
                              />
                            )}
                            <p className="text-xs font-medium mt-1">
                              {photo.title}
                            </p>
                            {photo.description && (
                              <p className="text-[11px] text-gray-500">
                                {photo.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 🧰 BOQ Details */}
        {/* 🧰 BOQ Details */}
        <div className="mt-10">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            BOQ Details
          </h3>

          {loadingData ? (
            <div className="border rounded-lg">
              <table className="min-w-full text-sm border-collapse">
                <tbody>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-4 py-2" colSpan={6}>
                        <Skeleton active paragraph={{ rows: 0 }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : boqs.length === 0 ? (
            <p className="text-gray-500 italic">
              No BOQs raised yet for this location.
            </p>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full text-sm border-collapse">
                <tbody>
                  {boqs?.length ? (
                    <table className="min-w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-800 font-semibold text-left">
                          <th className="px-4 py-2">#</th>
                          <th className="px-4 py-2">Kits Required</th>
                          <th className="px-4 py-2">Additional Requirements</th>
                          <th className="px-4 py-2">Remarks</th>
                          <th className="px-4 py-2">State</th>
                          <th className="px-4 py-2">Created On</th>
                        </tr>
                      </thead>
                      <tbody>
                        {boqs.map((boq, index) => (
                          <tr
                            key={boq.id}
                            className="border-b hover:bg-gray-50 text-gray-700"
                          >
                            <td className="px-4 py-2">{index + 1}</td>
                            <td className="px-4 py-2">
                              {boq.kits_required || "—"}
                            </td>
                            <td className="px-4 py-2">
                              {boq.additional_requirements || "—"}
                            </td>
                            <td className="px-4 py-2">{boq.Remarks || "—"}</td>
                            <td className="px-4 py-2">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  boq.state === "Approved"
                                    ? "bg-green-100 text-green-700"
                                    : boq.state === "Rejected"
                                      ? "bg-red-100 text-red-700"
                                      : boq.state === "Completed"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {boq.state || "Pending"}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              {new Date(boq.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-gray-500 italic">
                      No BOQs raised yet for this location.
                    </p>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 🧰 BOQ Modal */}
      <Modal
        title="Raise BOQ"
        open={isBoqModalOpen}
        onCancel={() => setIsBoqModalOpen(false)}
        footer={null}
        centered
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Kits Required
            </label>
            <Input
              placeholder="Enter number or type of kits required"
              value={boqForm.kits_required}
              onChange={(e) =>
                setBoqForm({ ...boqForm, kits_required: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Additional Requirements
            </label>
            <Input.TextArea
              rows={3}
              placeholder="Describe any extra requirements"
              value={boqForm.additional_requirements}
              onChange={(e) =>
                setBoqForm({
                  ...boqForm,
                  additional_requirements: e.target.value,
                })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Remarks</label>
            <Input.TextArea
              rows={3}
              placeholder="Add any remarks for BOQ"
              value={boqForm.Remarks}
              onChange={(e) =>
                setBoqForm({ ...boqForm, Remarks: e.target.value })
              }
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsBoqModalOpen(false)}>
              <X className="w-4 h-4" /> Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleBoqSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit BOQ"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 🎥 Camera Modal */}
      <Modal
        title="Assign Camera to Location"
        open={isCameraModalOpen}
        onCancel={() => setIsCameraModalOpen(false)}
        footer={null}
        centered
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Camera ID</label>
            <Input
              placeholder="Enter Camera ID"
              value={cameraForm.Camera_ID}
              onChange={(e) =>
                setCameraForm({ ...cameraForm, Camera_ID: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Position</label>
            <Select
              style={{ width: "100%" }}
              value={cameraForm.Position}
              onChange={(val) =>
                setCameraForm({ ...cameraForm, Position: val })
              }
            >
              {!hasInCamera && <Select.Option value="IN">IN</Select.Option>}
              {!hasOutCamera && <Select.Option value="OUT">OUT</Select.Option>}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">State</label>
            <Select
              style={{ width: "100%" }}
              value={cameraForm.state}
              onChange={(val) => setCameraForm({ ...cameraForm, state: val })}
            >
              <Select.Option value="Installed">Installed</Select.Option>
              <Select.Option value="Not Installed">Not Installed</Select.Option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Camera Photo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setCameraForm({ ...cameraForm, photo: file });
              }}
            />

            {cameraForm.photo && (
              <div className="mt-2 relative group w-32 h-32 border rounded-md overflow-hidden">
                <img
                  src={URL.createObjectURL(cameraForm.photo)}
                  alt="Camera preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setCameraForm({ ...cameraForm, photo: null })}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsCameraModalOpen(false)}
            >
              <X className="w-4 h-4" /> Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCameraSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Assign Camera"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
