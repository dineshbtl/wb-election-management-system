"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BackToLink } from "@/components/ui/back-to-link";
import {
  ClipboardList,
  FileText,
  X,
  Wrench,
  Plus,
  Edit3,
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
import {
  uploadSurveyPhotos,
  createSurvey,
  updateSurvey,
} from "@/lib/survey-api";
import { useAuth } from "@/context/AuthContext";

interface SurveyPhoto {
  file: File | null;
  title: string;
  description: string;
}

export default function SurveydetailsPage({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [location, setLocation] = useState<any>(null);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [isBoqModalOpen, setIsBoqModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [surveyViewMode, setSurveyViewMode] = useState<
    "create" | "edit" | "view"
  >("create");

  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();

  // Derive back URL from current path so we stay in the same section (avoids wrong-role or missing cookie redirect to login)
  const { backHref, backLabel } = useMemo(() => {
    if (!pathname || !pathname.includes("/surveys/")) {
      const role = user?.role?.type;
      if (role === "district_coordinator") return { backHref: "/district/surveys", backLabel: "Back to Surveys" };
      if (role === "assembly_coordinator") return { backHref: "/assembly/surveys", backLabel: "Back to My Surveys" };
      if (role === "superadmin") return { backHref: "/surveys", backLabel: "Back to superSurveys" };
      if (role === "booth_coordinator") return { backHref: "/booth/surveys", backLabel: "Back to My Surveys" };
      if (role === "block_coordinator") return { backHref: "/block/surveys", backLabel: "Back to Surveys" };
      return { backHref: "/district/surveys", backLabel: "Back to Surveys" };
    }
    const surveysListPath = pathname.replace(/\/surveys\/[^/]+$/, "/surveys");
    const label = surveysListPath === "/surveys" ? "Back to superSurveys" : "Back to Surveys";
    return { backHref: surveysListPath, backLabel: label };
  }, [pathname, user?.role?.type]);

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

  // 🧾 Survey Form
  const [surveyForm, setSurveyForm] = useState({
    id: null as string | null,
    Power_Available: false,
    Socket_Working: false, // ✅ ADD THIS

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

  /** Polling-station / booth documentId used for all queries (URL may be booth id or survey id). */
  const [boothDocumentId, setBoothDocumentId] = useState<string | null>(null);

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

  // 🔹 Fetch BOQs for this location (booth = location documentId in this app)
  const fetchBoqs = async (boothId: string) => {
    try {
      const res = await bpi.get(
        `/boqs?filters[location][documentId][$eq]=${encodeURIComponent(boothId)}&populate=location`,
      );
      setBoqs(res.data.data);
    } catch (err) {
      console.error("Error fetching BOQs:", err);
    }
  };

  // 🔹 Fetch surveys for this booth
  const fetchSurveys = async (boothId: string) => {
    try {
      const res = await bpi.get(
        `/surveys?filters[booth][documentId][$eq]=${encodeURIComponent(
          boothId,
        )}&populate[raised_by][fields][0]=documentId&populate[raised_by][fields][1]=username&populate[survey_photo][populate]=image&populate[sim_speeds]=*`,
      );
      setSurveys(res.data.data || []);
    } catch (err) {
      console.error("Error fetching surveys:", err);
    }
  };

  // 📋 Initialize survey form from existing survey data
  const initializeSurveyForm = (survey: any) => {
    setSurveyForm({
      id: survey.documentId,
      Power_Available: survey.Power_Available || false,
      Socket_Working: survey.Socket_Working || false,
      Network_Available: survey.Network_Available || false,
      site_condition: survey.site_condition || "Good",
      site_description: survey.site_description || "",

      GPS_Latitude: survey.GPS_Latitude?.toString() || "",
      GPS_Longitude: survey.GPS_Longitude?.toString() || "",
      Remarks: survey.Remarks || "",
      survey_date: survey.survey_date ? dayjs(survey.survey_date) : dayjs(),
      airtel_signal: survey.airtel_signal || 0,
      jio_signal: survey.jio_signal || 0,
      survey_photo: survey.survey_photo?.map((p: any) => ({
        file: null,
        title: p.title || "",
        description: p.description || "",
        existingImage: p.image?.url ? `${baseurl}${p.image.url}` : null,
        imageId: p.image?.id || null,
      })) || [{ file: null, title: "", description: "" }],
    });
  };

  // 📋 Reset survey form
  const resetSurveyForm = () => {
    setSurveyForm({
      id: null,
      Power_Available: false,
      Socket_Working: false, // ✅ ADD

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

  // Resolve URL id as booth/location documentId OR as survey documentId, then load data
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const loadData = async () => {
      setLoadingInitial(true);
      setBoothDocumentId(null);
      setLocation(null);
      setSurveys([]);
      try {
        let boothId: string | null = null;
        let locData: any = null;

        try {
          const locRes = await bpi.get(
            `/locations/${encodeURIComponent(id)}?populate[0]=assembly.district&populate[1]=boqs&populate[2]=booth_coordinator.profile`,
          );
          locData = locRes.data?.data ?? locRes.data;
        } catch {
          locData = null;
        }

        if (locData) {
          boothId = locData.documentId ?? id;
        } else {
          let survey: any = null;
          try {
            const sRes = await bpi.get(
              `/surveys/${encodeURIComponent(id)}?populate[0]=booth`,
            );
            survey = sRes.data?.data ?? sRes.data;
          } catch {
            survey = null;
          }
          const bid = survey?.booth?.documentId;
          if (!bid) {
            if (!cancelled) {
              toast({
                variant: "destructive",
                title: "Not found",
                description:
                  "No booth location matches this link. Open the survey from the list, or check the URL id.",
              });
            }
            return;
          }
          boothId = bid;
          try {
            const locRes = await bpi.get(
              `/locations/${encodeURIComponent(boothId)}?populate[0]=assembly.district&populate[1]=boqs&populate[2]=booth_coordinator.profile`,
            );
            locData = locRes.data?.data ?? locRes.data;
          } catch {
            locData = null;
          }
        }

        if (cancelled) return;
        if (!locData || !boothId) {
          toast({
            variant: "destructive",
            title: "Not found",
            description:
              "Could not load this location. Try opening the survey from the list again.",
          });
          return;
        }

        setLocation(locData);
        setBoothDocumentId(boothId);

        await Promise.all([fetchSurveys(boothId), fetchBoqs(boothId)]);
      } catch (err) {
        console.error("Error loading data:", err);
        if (!cancelled) {
          toast({
            variant: "destructive",
            title: "Error",
            description:
              "Could not load this survey or location. The link may use a survey id — try opening the survey from the list again.",
          });
        }
      } finally {
        if (!cancelled) setLoadingInitial(false);
      }
    };
    loadData();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (location?.documentId) {
      fetchCameras(location.documentId);
    }
  }, [location]);

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

  // 📸 Photo management functions
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
    field: keyof SurveyPhoto | "existingImage" | "imageId",
    value: string | File | null | number,
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

      let uploadedPhotoId: number | null = null;
      if (cameraForm.photo) {
        const formData = new FormData();
        formData.append("files", cameraForm.photo);
        const uploadRes = await bpi.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        uploadedPhotoId = uploadRes.data?.[0]?.id || null;
      }

      await bpi.post("/cameras", {
        data: {
          Camera_ID: cameraForm.Camera_ID,
          Position: cameraForm.Position,
          state: cameraForm.state,
          assigned_booth: location.documentId,
          Photo: uploadedPhotoId,
        },
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
      fetchCameras(location.documentId);
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

  // 🧾 Submit Survey
  const handleSurveySubmit = async () => {
    if (!user?.documentId) {
      message.error("User not logged in. Please refresh the page.");
      return;
    }

    const validPhotos = surveyForm.survey_photo.filter(
      (p) => p.file || (p.title && p.existingImage),
    );
    if (validPhotos.length === 0) {
      message.warning("At least one photo with a title is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      let uploadedPhotoIds: number[] = [];

      const newPhotos = surveyForm.survey_photo.filter((p) => p.file);
      if (newPhotos.length > 0) {
        const formData = new FormData();
        newPhotos.forEach((p) => formData.append("files", p.file!));
        uploadedPhotoIds = await uploadSurveyPhotos(formData);
      }

      const surveyPhotosPayload = surveyForm.survey_photo
        .map((p) => {
          const isNewPhoto = p.file !== null;
          return {
            title: p.title,
            description: p.description,
            image: isNewPhoto ? uploadedPhotoIds.shift() : (p as { imageId?: number }).imageId,
          };
        })
        .filter((p) => p.title && (p.image || p.description));

      const boothRef = location?.documentId ?? boothDocumentId ?? id;
      const surveyData = {
        booth: boothRef,
        Power_Available: surveyForm.Power_Available,
        Network_Available: surveyForm.Network_Available,
        site_condition: surveyForm.site_condition,
        site_description: surveyForm.site_description,
        GPS_Latitude: parseFloat(surveyForm.GPS_Latitude) || null,
        GPS_Longitude: parseFloat(surveyForm.GPS_Longitude) || null,
        survey_date: surveyForm.survey_date.toISOString(),
        Remarks: surveyForm.Remarks,
        raised_by: user.documentId,
        survey_photo: surveyPhotosPayload,
        airtel_signal: surveyForm.airtel_signal,
        jio_signal: surveyForm.jio_signal,
        state: "Raised",
      };

      if (surveyForm.id) {
        await updateSurvey(surveyForm.id, surveyData);
        toast({
          variant: "success",
          title: "Survey Updated",
          description: `Survey updated successfully for ${location.PS_Name}.`,
        });
      } else {
        await createSurvey(surveyData);
        toast({
          variant: "success",
          title: "Survey Created",
          description: `Survey created successfully for ${location.PS_Name}.`,
        });
      }

      resetSurveyForm();
      await fetchSurveys(boothRef);
    } catch (err) {
      console.error("Survey submit error:", err);
      toast({
        variant: "destructive",
        title: "Failed",
        description: "Could not save survey. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Change survey status (Raised / Completed) – used by dropdown
  const [changingStatus, setChangingStatus] = useState(false);
  const handleChangeStatus = async (surveyId: string, newState: string) => {
    setChangingStatus(true);
    try {
      await api.put(`/surveys/${surveyId}`, {
        data: { state: newState },
      });
      await api.put(`/locations/${location.documentId}`, {
        data: { Survey_Status: newState },
      });
      toast({
        variant: "success",
        title: `Survey status set to ${newState}`,
      });
      const bid = location?.documentId ?? boothDocumentId ?? id;
      if (bid) await fetchSurveys(bid);
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Failed to update survey status",
      });
    } finally {
      setChangingStatus(false);
    }
  };

  // 🧰 Submit BOQ
  const handleBoqSubmit = async () => {
    setIsSubmitting(true);
    try {
      await bpi.post("/boqs", {
        data: {
          location: location?.documentId ?? boothDocumentId ?? id,
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
      resetSurveyForm();
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
  const hasSurvey = surveys.length > 0;
  const activeSurvey = surveys[0];
  const isCompleted = activeSurvey?.state === "Completed";

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spin size="large" />
      </div>
    );
  }

  const userRole = user?.role?.type;

  const isAssemblyCoordinator = userRole === "assembly_coordinator";
  const isBoothCoordinator = userRole === "booth_coordinator";
  const formatTimestamp = (value?: string | null) => {
    if (!value) return "—";
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format("DD MMM YYYY, hh:mm:ss A") : "—";
  };

  // Managers (non-booth coordinators) can change status via dropdown (Raised ↔ Completed)
  const canChangeStatus = hasSurvey && !isBoothCoordinator;

  console.log("User Role:", user?.role);
  console.log("Raised By:", activeSurvey?.raised_by);

  return (
    <div className="min-h-screen py-6 sm:py-8 lg:py-10 px-2 sm:px-6 lg:px-8 text-sm">
      <div className="max-w-7xl mx-auto bg-white shadow-lg rounded-2xl p-4 sm:p-6 lg:p-8">
        {/* Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <BackToLink href={backHref} label={backLabel} />
          <h2 className="text-lg font-semibold text-gray-800">
            Location Details
          </h2>
        </div>

        {/* 📋 Survey Status – at top so users can easily Edit / Mark as Completed */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-600">Survey Status</span>
              {hasSurvey ? (
                <Tag
                  color={isCompleted ? "green" : "blue"}
                  style={{
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    border: "none",
                    margin: 0,
                    textTransform: "capitalize",
                  }}
                >
                  {isCompleted ? "✓ Survey Completed" : "Survey Raised"}
                </Tag>
              ) : (
                <Tag
                  color="default"
                  style={{
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    border: "1px solid #e5e7eb",
                    margin: 0,
                    textTransform: "capitalize",
                  }}
                >
                  Survey Not Raised
                </Tag>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {!hasSurvey ? (
                <Link
                  href={(() => {
                    const encId = encodeURIComponent(id);
                    if (user?.role?.type === "booth_coordinator") return `/booth/surveys/new?boothId=${encId}`;
                    if (user?.role?.type === "district_coordinator") return `/district/surveys/new?boothId=${encId}`;
                    if (user?.role?.type === "assembly_coordinator") return `/assembly/surveys/new?boothId=${encId}`;
                    if (user?.role?.type === "block_coordinator") return `/block/surveys/new?boothId=${encId}`;
                    return `/surveys/new?boothId=${encId}`;
                  })()}
                >
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    <ClipboardList className="w-4 h-4" />
                    <span>Raise Survey</span>
                  </Button>
                </Link>
              ) : (
                <>
                  <Link
                    href={(() => {
                      const docId = activeSurvey.documentId;
                      if (user?.role?.type === "booth_coordinator") return `/booth/surveys/${docId}/edit`;
                      if (user?.role?.type === "district_coordinator") return `/district/surveys/${docId}/edit`;
                      if (user?.role?.type === "assembly_coordinator") return `/assembly/surveys/${docId}/edit`;
                      if (user?.role?.type === "block_coordinator") return `/block/surveys/${docId}/edit`;
                      return `/surveys/${docId}/edit`;
                    })()}
                  >
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Edit Survey</span>
                    </Button>
                  </Link>
                  {canChangeStatus && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 whitespace-nowrap hidden sm:inline">Status</span>
                      <Select
                        size="small"
                        value={activeSurvey?.state || "Raised"}
                        onChange={(val) => handleChangeStatus(activeSurvey.documentId, val)}
                        loading={changingStatus}
                        className="min-w-[140px] rounded-lg text-xs"
                        style={{ minWidth: 140 }}
                        placeholder="Change status"
                        suffixIcon={changingStatus ? null : undefined}
                      >
                        <Select.Option value="Raised">Raised</Select.Option>
                        <Select.Option value="Completed">Completed</Select.Option>
                      </Select>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Location Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
          {loadingData ? (
            [...Array(6)].map((_, i) => (
              <div key={i}>
                <Skeleton active paragraph={{ rows: 1 }} />
              </div>
            ))
          ) : (
            <>
              <div>
                <p className="font-semibold text-xs text-gray-600">PS Name</p>
                <p className="capitalize">{PS_Name}</p>
              </div>
              <div>
                <p className="font-semibold text-xs text-gray-600">PS No</p>
                <p className="capitalize">{PS_No}</p>
              </div>
              <div>
                <p className="font-semibold text-xs text-gray-600">Village</p>
                <p className="capitalize">{PS_Location || "—"}</p>
              </div>
              <div>
                <p className="font-semibold text-xs text-gray-600">Assembly</p>
                <p className="capitalize">{assembly?.Assembly_Name || "—"}</p>
              </div>
              <div>
                <p className="font-semibold text-xs text-gray-600">District</p>
                <p className="capitalize">{assembly?.district?.district_name || "—"}</p>
              </div>
              <div>
                <p className="font-semibold text-xs text-gray-600">State</p>
                <p className="capitalize">Assam</p>
              </div>
            </>
          )}
        </div>

        {/* 👤 Booth Coordinator Details */}
        {location?.booth_coordinator && (
          <div className="mt-8 border border-gray-200 rounded-xl p-5">
            <h3 className="text-base font-semibold text-gray-800 mb-3">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-gray-800">
                <div>
                  <p className="font-semibold text-xs text-gray-600">Name</p>
                  <p className="text-blue-600 font-medium capitalize">
                    {location.booth_coordinator.profile?.Full_Name ||
                      location.booth_coordinator.username ||
                      "—"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-xs text-gray-600">Email</p>
                  <p className="lowercase normal-case">
                    {(location.booth_coordinator.email || "").toLowerCase() || "—"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-xs text-gray-600">Phone</p>
                  <p className="capitalize">{location.booth_coordinator.profile?.Phone_Number || "—"}</p>
                </div>
                <div>
                  <p className="font-semibold text-xs text-gray-600">Father's Name</p>
                  <p className="capitalize">{location.booth_coordinator.profile?.Father_Name || "—"}</p>
                </div>
                <div>
                  <p className="font-semibold text-xs text-gray-600">District</p>
                  <p className="capitalize">{location.booth_coordinator.profile?.District || "—"}</p>
                </div>
                <div>
                  <p className="font-semibold text-xs text-gray-600">Address</p>
                  <p className="capitalize">{location.booth_coordinator.profile?.address || "—"}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Survey Details content (loading / empty / cards) */}
        <div className="mt-8">
          {loadingData ? (
            <div className="border rounded-lg">
              <table className="min-w-full text-sm border-collapse">
                <tbody>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-4 py-2" colSpan={9}>
                        <Skeleton active paragraph={{ rows: 0 }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !hasSurvey ? (
            <div className="border-2 border-dashed rounded-lg p-8 text-center text-gray-500">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 text-gray-400" />
              <p className="text-base font-medium capitalize">No survey raised yet</p>
              <p className="text-xs mt-2 capitalize">
                Click "Raise Survey" button to create a new survey for this
                location
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Card 1: Basic info & status */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200">
                  <h4 className="font-semibold text-sm text-gray-800 capitalize">
                    Survey Info & Status
                  </h4>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <DetailRow
                    label="Survey Date"
                    value={
                      activeSurvey.survey_date
                        ? new Date(activeSurvey.survey_date).toLocaleDateString()
                        : "—"
                    }
                  />
                  <DetailRow
                    label="Status"
                    value={
                      activeSurvey.state === "Completed"
                        ? "Completed"
                        : "Raised"
                    }
                  />
                  <DetailRow
                    label="Raised By"
                    value={activeSurvey.raised_by?.username || "—"}
                  />
                   <DetailRow
                    label="Survey Raised From"
                    value={activeSurvey.locationName || "—"}
                  />
                  <DetailRow
                    label="Created At"
                    value={formatTimestamp(activeSurvey.createdAt)}
                  />
                  <DetailRow
                    label="Updated At"
                    value={formatTimestamp(activeSurvey.updatedAt)}
                  />
                </div>
              </div>

              {/* Card 2: Power & Network – same as create/edit */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200">
                  <h4 className="font-semibold text-sm text-gray-800 capitalize">
                    Power & Network
                  </h4>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailRow
                    label="Power Available"
                    value={activeSurvey.Power_Available ? "Yes" : "No"}
                  />
                  {activeSurvey.Power_Available && (
                    <DetailRow
                      label="Socket Working"
                      value={
                        activeSurvey.Socket_Working ? "Working" : "Not Working"
                      }
                    />
                  )}
                  <DetailRow
                    label="Network Available"
                    value={activeSurvey.Network_Available ? "Yes" : "No"}
                  />
                </div>
              </div>

              {/* Card 3: Site condition & description */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200">
                  <h4 className="font-semibold text-sm text-gray-800 capitalize">
                    Site Condition
                  </h4>
                </div>
                <div className="p-4 space-y-3">
                  <DetailRow
                    label="Condition"
                    value={activeSurvey.site_condition || "—"}
                  />
                  {activeSurvey.site_description && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1 capitalize">
                        Description
                      </p>
                      <p className="text-sm text-gray-800 capitalize">
                        {activeSurvey.site_description}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 4: SIM speed test or signal – same as create/edit */}
              {(activeSurvey.sim_speeds?.length > 0 ||
                activeSurvey.airtel_signal != null ||
                activeSurvey.jio_signal != null) && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-200">
                    <h4 className="font-semibold text-sm text-gray-800 capitalize">
                      Network / Speed Test
                    </h4>
                  </div>
                  <div className="p-4 space-y-3">
                    {activeSurvey.sim_speeds?.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeSurvey.sim_speeds.map((sim: any) => (
                          <div
                            key={sim.id ?? sim.provider}
                            className="border border-gray-200 rounded-lg p-2.5"
                          >
                            <p className="font-semibold text-xs capitalize mb-1.5">
                              {sim.provider} SIM
                            </p>
                            <p className="text-xs">
                              Download: {sim.download_speed} Mbps
                            </p>
                            <p className="text-xs">
                              Upload: {sim.upload_speed} Mbps
                            </p>
                            <p className="text-xs">
                              Latency: {sim.latency} ms
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-4 text-sm">
                        {activeSurvey.airtel_signal != null && (
                          <span>
                            Airtel signal: {activeSurvey.airtel_signal}/5
                          </span>
                        )}
                        {activeSurvey.jio_signal != null && (
                          <span>Jio signal: {activeSurvey.jio_signal}/5</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Card 5: GPS */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200">
                  <h4 className="font-semibold text-sm text-gray-800 capitalize">
                    GPS Coordinates
                  </h4>
                </div>
                <div className="p-4">
                  <DetailRow
                    label="Coordinates"
                    value={
                      activeSurvey.GPS_Latitude && activeSurvey.GPS_Longitude
                        ? `${activeSurvey.GPS_Latitude}, ${activeSurvey.GPS_Longitude}`
                        : "Not provided"
                    }
                  />
                </div>
              </div>

              {/* Card 6: Remarks */}
              {activeSurvey.Remarks && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-200">
                    <h4 className="font-semibold text-sm text-gray-800 capitalize">Remarks</h4>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-gray-800 capitalize">
                      {activeSurvey.Remarks}
                    </p>
                  </div>
                </div>
              )}

              {/* Card 7: Photos – same as create/edit */}
              {activeSurvey.survey_photo?.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-200">
                    <h4 className="font-semibold text-sm text-gray-800 capitalize">
                      Photo Documentation
                    </h4>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {activeSurvey.survey_photo.map((p: any) => (
                        <div key={p.id} className="space-y-1.5">
                          {p.image?.url && (
                            <Image
                              src={`${baseurl}${p.image.url}`}
                              alt={p.title}
                              className="rounded border"
                              preview
                            />
                          )}
                          <p className="text-xs font-medium text-gray-800 capitalize">
                            {p.title}
                          </p>
                          {p.description && (
                            <p className="text-[11px] text-gray-500 capitalize">
                              {p.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
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
              <div className="mt-2 relative group w-full max-w-[150px]  h-32 border rounded-md overflow-hidden">
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
      <p className="text-xs text-gray-500 capitalize">{label}</p>
      <p className="text-xs font-medium text-gray-800">{value}</p>
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
