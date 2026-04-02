"use client";

import React, { useState, useEffect } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { ModernCard } from "@/components/ui/modern-card";
import { Button } from "@/components/ui/button";
import { PillButton } from "@/components/ui/pill-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import {
  MapPin,
  Building,
  ListChecks,
  Navigation,
  ImageIcon,
  Loader2,
  X,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import bpi from "@/lib/bpi";
import api from "@/lib/api";
import {
  uploadSurveyPhotos,
  checkExistingSurvey as checkExistingSurveyApi,
  createSurvey,
} from "@/lib/survey-api";
import { compressImage } from "@/lib/compress-image";
import Network3 from "@/components/survey/Network3";
import { SurveyPhotoImagePicker } from "@/components/survey/SurveyPhotoImagePicker";
import { Switch } from "@/components/ui/switch";

// 👇 UPDATED INTERFACE
interface SurveyPhoto {
  file: File | null;
  title: string;
  description: string;
  compressing?: boolean;
}

interface SurveyForm {
  Power_Available: boolean;
  Socket_Working: boolean;
  Network_Available: boolean;
  site_condition: string;
  site_description: string;
  GPS_Latitude: string;
  GPS_Longitude: string;
  Remarks: string;
  survey_date: dayjs.Dayjs;
  airtel_signal: number;
  jio_signal: number;
  sim_speeds: {
    provider: string;
    download_speed: number;
    upload_speed: number;
    latency: number;
    carrier_info?: string;
  }[];
  survey_photo: SurveyPhoto[];
}

// 👇 NEW PHOTO ENTRY COMPONENT
const PhotoEntry = ({
  index,
  photo,
  onChange,
  onFileChange,
  onRemove,
}: {
  index: number;
  photo: SurveyPhoto;
  onChange: (field: keyof SurveyPhoto, value: string) => void;
  onFileChange: (file: File | null) => void;
  onRemove: () => void;
}) => {
  return (
    <div className="border rounded-xl p-4 bg-gray-50 space-y-3">
      <div className="flex justify-between items-start">
        <h4 className="font-medium text-gray-800">Photo {index + 1}</h4>
        {index > 0 && (
          <button
            type="button"
            onClick={onRemove}
            className="text-red-500 hover:text-red-700"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Title */}
      <div>
        <Label className="text-sm font-medium text-gray-700">Title *</Label>
        <Input
          value={photo.title}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="e.g., Front view of booth"
          className="mt-1 h-10 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl"
        />
      </div>

      {/* Description */}
      <div>
        <Label className="text-sm font-medium text-gray-700">Description</Label>
        <Input
          value={photo.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="Optional details about this photo"
          className="mt-1 h-10 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl"
        />
      </div>

      {/* File Upload */}
      <div>
        <Label className="text-sm font-medium text-gray-700">Image *</Label>
        <div className="mt-1 flex items-center flex-wrap gap-x-3 gap-y-2">
          <SurveyPhotoImagePicker
            inputId={`survey-byid-photo-${index}`}
            compressing={photo.compressing}
            hasImage={!!photo.file}
            onFileSelected={onFileChange}
            buttonVariant="amber"
          />
          {photo.file && !photo.compressing && (
            <span className="text-sm text-gray-600 truncate max-w-xs">
              {photo.file.name}{" "}
              <span className="text-gray-400">
                ({(photo.file.size / 1024).toFixed(0)} KB)
              </span>
            </span>
          )}
        </div>
      </div>

      {photo.compressing && (
        <div className="mt-2 flex items-center justify-center h-32 rounded-lg border border-dashed border-blue-300 bg-blue-50">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
            <p className="text-sm text-blue-600 mt-2 font-medium">
              Optimizing image for upload...
            </p>
          </div>
        </div>
      )}

      {/* Preview */}
      {photo.file && !photo.compressing && (
        <div className="mt-2">
          <img
            src={URL.createObjectURL(photo.file)}
            alt={`preview-${index}`}
            className="w-full h-32 object-cover rounded-lg border"
          />
        </div>
      )}
    </div>
  );
};

export default function CreateSurveyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const boothIdFromUrl = searchParams.get("boothId");
  const { toast } = useToast();

  // Location hierarchy
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [assemblies, setAssemblies] = useState<
    { id: string; name: string; district: string }[]
  >([]);
  const [booths, setBooths] = useState<
    { id: string; documentId: string; PS_Name: string; PS_No: string }[]
  >([]);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedAssembly, setSelectedAssembly] = useState("");
  const [selectedBooth, setSelectedBooth] = useState("");
  const [existingSurvey, setExistingSurvey] = useState<any>(null);
  const [checkingSurvey, setCheckingSurvey] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(!!boothIdFromUrl);

  // GPS & Form
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [gpsStatus, setGpsStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [isRefreshingGPS, setIsRefreshingGPS] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [activeTestProvider, setActiveTestProvider] = useState<string | null>(
    null,
  );

  // 👇 UPDATED INITIAL STATE
  const [surveyForm, setSurveyForm] = useState<SurveyForm>({
    Power_Available: false,
    Socket_Working: false,
    Network_Available: false,
    site_condition: "Good",
    site_description: "",
    GPS_Latitude: "",
    GPS_Longitude: "",
    Remarks: "",
    survey_date: dayjs(),
    airtel_signal: 0,
    jio_signal: 0,
    sim_speeds: [
      { provider: "sim1", download_speed: 0, upload_speed: 0, latency: 0 },
      { provider: "sim2", download_speed: 0, upload_speed: 0, latency: 0 },
    ],
    survey_photo: [{ file: null, title: "", description: "" }],
  });

  // Fetch user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await api.get("/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data);
      } catch (err) {
        console.error("User fetch error:", err);
      }
    };
    fetchUser();
  }, []);

  // Fetch districts on mount
  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        const res = await bpi.get("/districts?sort=district_name:asc");
        setDistricts(
          res.data.data.map((d: any) => ({
            id: d.id.toString(),
            name: d.district_name || d.name,
          })),
        );
      } catch (err) {
        console.error("District fetch error:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load districts.",
        });
      }
    };
    fetchDistricts();
  }, []);

  // Pre-fill location when ?boothId= is in URL (e.g. from surveys list or location detail)
  useEffect(() => {
    if (!boothIdFromUrl) {
      setPrefillLoading(false);
      return;
    }
    let cancelled = false;
    const loadLocation = async () => {
      try {
        const res = await bpi.get(
          `/locations/${encodeURIComponent(boothIdFromUrl)}?populate[0]=assembly.district`,
        );
        const loc = res.data?.data || res.data;
        if (!loc?.assembly?.district || cancelled) return;
        const districtId = loc.assembly.district.id?.toString();
        const assemblyId = loc.assembly.id?.toString();
        if (districtId) setSelectedDistrict(districtId);
        if (assemblyId) setSelectedAssembly(assemblyId);
      } catch (err) {
        console.error("Prefill location error:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load location. Please select manually.",
        });
      } finally {
        if (!cancelled) setPrefillLoading(false);
      }
    };
    loadLocation();
    return () => {
      cancelled = true;
    };
  }, [boothIdFromUrl]);

  // After district/assembly trigger booth fetch, set selectedBooth when booths are loaded (for ?boothId= prefill)
  useEffect(() => {
    if (!boothIdFromUrl || !selectedAssembly || booths.length === 0) return;
    const hasBooth = booths.some((b) => b.documentId === boothIdFromUrl);
    if (hasBooth) setSelectedBooth(boothIdFromUrl);
  }, [boothIdFromUrl, selectedAssembly, booths]);

  // Fetch assemblies when district changes
  useEffect(() => {
    if (!selectedDistrict) return;
    const fetchAssemblies = async () => {
      try {
        const res = await bpi.get(
          `/assemblies?filters[district][id][$eq]=${selectedDistrict}&populate=district&sort=Assembly_Name:asc`,
        );
        setAssemblies(
          res.data.data.map((a: any) => ({
            id: a.id.toString(),
            name: a.Assembly_Name,
            district: a.district?.id?.toString() || "",
          })),
        );
        setBooths([]);
        setSelectedAssembly("");
        setSelectedBooth("");
      } catch (err) {
        console.error("Assembly fetch error:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load assemblies.",
        });
      }
    };
    fetchAssemblies();
  }, [selectedDistrict]);

  useEffect(() => {
    if (selectedBooth) {
      checkExistingSurvey(selectedBooth);
    } else {
      setExistingSurvey(null);
    }
  }, [selectedBooth]);

  // Fetch booths when assembly changes
  useEffect(() => {
    if (!selectedAssembly) return;
    const fetchBooths = async () => {
      try {
        const res = await bpi.get(
          `/locations?filters[assembly][id][$eq]=${selectedAssembly}&populate=assembly&sort=PS_Name:asc`,
        );
        setBooths(
          res.data.data.map((b: any) => ({
            id: b.id.toString(),
            documentId: b.documentId,
            PS_Name: b.PS_Name,
            PS_No: b.PS_No,
          })),
        );
        setSelectedBooth("");
      } catch (err) {
        console.error("Booth fetch error:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load booth locations.",
        });
      }
    };
    fetchBooths();
  }, [selectedAssembly]);

  const checkExistingSurvey = async (boothId: string) => {
    if (!boothId) return;

    setCheckingSurvey(true);
    try {
      const existing = await checkExistingSurveyApi(boothId);

      if (existing) {
        setExistingSurvey(existing);
        toast({
          variant: "destructive",
          title: "Survey Already Exists",
          description: `A survey was already submitted for this booth on ${new Date(existing.survey_date).toLocaleDateString()}.`,
        });
      } else {
        setExistingSurvey(null);
      }
    } catch (err) {
      console.error("Error checking existing survey:", err);
      toast({
        variant: "destructive",
        title: "Check Failed",
        description: "Could not verify if a survey already exists.",
      });
    } finally {
      setCheckingSurvey(false);
    }
  };

  // GPS: try device GPS first, then IP-based fallback
  const setCoords = (lat: number, lng: number) => {
    setLocation({ lat, lng });
    setGpsStatus("success");
    setIsRefreshingGPS(false);
    setSurveyForm((prev) => ({
      ...prev,
      GPS_Latitude: lat.toFixed(6),
      GPS_Longitude: lng.toFixed(6),
    }));
  };

  const getGPSLocation = () => {
    setIsRefreshingGPS(true);
    setGpsStatus("loading");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords(pos.coords.latitude, pos.coords.longitude);
          toast({
            variant: "success",
            title: "GPS Updated",
            description: "Location captured from device.",
          });
        },
        () => {
          // Fallback: IP-based approximate location (no API key)
          fetch("https://ipapi.co/json/")
            .then((res) => res.json())
            .then((data) => {
              if (data.latitude != null && data.longitude != null) {
                setCoords(data.latitude, data.longitude);
                toast({
                  variant: "success",
                  title: "Approximate location",
                  description:
                    "Using network (IP) location. Enable device location for better accuracy.",
                });
              } else {
                setGpsStatus("error");
                setIsRefreshingGPS(false);
                toast({
                  variant: "destructive",
                  title: "Location unavailable",
                  description: "Enable location permission or try again.",
                });
              }
            })
            .catch(() => {
              setGpsStatus("error");
              setIsRefreshingGPS(false);
              toast({
                variant: "destructive",
                title: "Unable to get location",
                description:
                  "Check connection and try again, or allow device location.",
              });
            });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
      );
    } else {
      // No geolocation API: try IP fallback
      fetch("https://ipapi.co/json/")
        .then((res) => res.json())
        .then((data) => {
          if (data.latitude != null && data.longitude != null) {
            setCoords(data.latitude, data.longitude);
            toast({
              variant: "success",
              title: "Approximate location",
              description: "Using network (IP) location.",
            });
          } else {
            setGpsStatus("error");
            setIsRefreshingGPS(false);
            toast({
              variant: "destructive",
              title: "Unsupported",
              description:
                "GPS not supported. Use a supported browser or device.",
            });
          }
        })
        .catch(() => {
          setGpsStatus("error");
          setIsRefreshingGPS(false);
          toast({
            variant: "destructive",
            title: "Unsupported",
            description: "GPS not supported by browser.",
          });
        });
    }
  };

  useEffect(() => {
    getGPSLocation();
  }, []);

  // 👇 UPDATED PHOTO HANDLERS
  const addPhotoEntry = () => {
    setSurveyForm({
      ...surveyForm,
      survey_photo: [
        ...surveyForm.survey_photo,
        { file: null, title: "", description: "" },
      ],
    });
  };

  const updatePhotoField = async (
    index: number,
    field: keyof SurveyPhoto,
    value: string | File | null,
  ) => {
    if (field === "file" && value instanceof File) {
      setSurveyForm((prev) => {
        const photos = [...prev.survey_photo];
        photos[index] = { ...photos[index], file: null, compressing: true };
        return { ...prev, survey_photo: photos };
      });

      try {
        const compressed = await compressImage(value);
        setSurveyForm((prev) => {
          const photos = [...prev.survey_photo];
          photos[index] = {
            ...photos[index],
            file: compressed,
            compressing: false,
          };
          return { ...prev, survey_photo: photos };
        });
      } catch {
        setSurveyForm((prev) => {
          const photos = [...prev.survey_photo];
          photos[index] = { ...photos[index], file: value, compressing: false };
          return { ...prev, survey_photo: photos };
        });
      }
      return;
    }

    const updatedPhotos = [...surveyForm.survey_photo];
    updatedPhotos[index] = { ...updatedPhotos[index], [field]: value as never };
    setSurveyForm({ ...surveyForm, survey_photo: updatedPhotos });
  };

  const removePhotoEntry = (index: number) => {
    if (surveyForm.survey_photo.length <= 1) return;
    const updatedPhotos = surveyForm.survey_photo.filter((_, i) => i !== index);
    setSurveyForm({ ...surveyForm, survey_photo: updatedPhotos });
  };

  // Signal strength handlers
  const setSignalStrength = (provider: "airtel" | "jio", level: number) => {
    setSurveyForm({ ...surveyForm, [`${provider}_signal`]: level });
  };

  // Submit
  const handleSubmit = async () => {
    if (existingSurvey) {
      toast({
        variant: "destructive",
        title: "Duplicate Survey Not Allowed",
        description:
          "A survey has already been raised for this booth location.",
      });
      return;
    }
    if (!selectedBooth) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a booth location.",
      });
      return;
    }
    if (!user?.documentId) {
      toast({
        variant: "destructive",
        title: "Auth Error",
        description: "User not authenticated.",
      });
      return;
    }

    // Validate photo entries
    const validPhotos = surveyForm.survey_photo.filter(
      (p) => p.file && p.title.trim(),
    );
    if (validPhotos.length === 0) {
      toast({
        variant: "destructive",
        title: "Photo Validation Error",
        description: "At least one photo with a title is required.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload photos (uses api client — no hard timeout)
      const formData = new FormData();
      validPhotos.forEach((p) => formData.append("files", p.file!));
      if (process.env.NODE_ENV === "development") {
        console.log("[SurveyById] Upload start", { photoCount: validPhotos.length });
      }
      let photoIds: number[];
      try {
        photoIds =
          validPhotos.length > 0 ? await uploadSurveyPhotos(formData) : [];
        if (process.env.NODE_ENV === "development") {
          console.log("[SurveyById] Upload complete", { count: photoIds.length });
        }
      } catch (uploadErr) {
        console.error("[SurveyById] Upload failed", uploadErr);
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description:
            "Photo upload failed. Check your connection and try again.",
        });
        return;
      }

      // Map to Strapi component format
      const surveyPhotosPayload = validPhotos.map((p, i) => ({
        title: p.title,
        description: p.description,
        image: photoIds[i],
      }));

      // Submit survey
      if (process.env.NODE_ENV === "development") {
        console.log("[SurveyById] Create start");
      }
      try {
        await createSurvey({
          booth: selectedBooth,
          Power_Available: surveyForm.Power_Available,
          Socket_Working: surveyForm.Socket_Working,
          Network_Available: surveyForm.Network_Available,
          site_condition: surveyForm.site_condition,
          site_description: surveyForm.site_description || undefined,
          GPS_Latitude: parseFloat(surveyForm.GPS_Latitude) || null,
          GPS_Longitude: parseFloat(surveyForm.GPS_Longitude) || null,
          survey_date: surveyForm.survey_date.toISOString(),
          Remarks: surveyForm.Remarks,
          raised_by: user.documentId,
          survey_photo: surveyPhotosPayload,
          sim_speeds: surveyForm.sim_speeds.map((s) => ({
            provider: s.provider,
            download_speed: s.download_speed,
            upload_speed: s.upload_speed,
            latency: s.latency,
            ...(s.carrier_info && { carrier_info: s.carrier_info }),
          })),
          airtel_signal: surveyForm.airtel_signal,
          jio_signal: surveyForm.jio_signal,
          state: "Raised",
        });
      } catch (createErr) {
        console.error("[SurveyById] Create failed", createErr);
        toast({
          variant: "destructive",
          title: "Creation Failed",
          description:
            "Survey creation failed. Your photos were uploaded. Please try again.",
        });
        return;
      }

      toast({
        variant: "success",
        title: "Survey Created!",
        description: "Survey submitted successfully.",
      });
      router.push(`/locations/${selectedBooth}`);
    } catch (err) {
      console.error("[SurveyById] Submit error:", err);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto w-full min-w-0 p-6 pb-12">
        <div className="space-y-8">
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
                        ? `Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}`
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
                    type="button"
                    onClick={getGPSLocation}
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${isRefreshingGPS ? "animate-spin" : ""}`}
                    />
                  </PillButton>
                </div>
              </div>
            </ModernCard>
          </motion.div>

          {/* Location Hierarchy Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <ModernCard>
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Select Location
                  </h3>
                  <p className="text-sm text-gray-600">
                    {prefillLoading
                      ? "Loading location..."
                      : "Select District → Assembly (LAC) → Booth in order. Required for this survey."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    District *
                  </Label>
                  <Select
                    value={selectedDistrict}
                    onValueChange={setSelectedDistrict}
                  >
                    <SelectTrigger className="h-11 bg-white border-gray-200 rounded-xl">
                      <SelectValue placeholder="Select district" />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map((dist) => (
                        <SelectItem key={dist.id} value={dist.id}>
                          {dist.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Assembly (LAC) *
                  </Label>
                  <Select
                    value={selectedAssembly}
                    onValueChange={setSelectedAssembly}
                    disabled={!selectedDistrict}
                  >
                    <SelectTrigger className="h-11 bg-white border-gray-200 rounded-xl">
                      <SelectValue
                        placeholder={
                          selectedDistrict
                            ? "Select assembly"
                            : "Select district first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {assemblies.map((asm) => (
                        <SelectItem key={asm.id} value={asm.id}>
                          {asm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Booth (Polling Station) *
                  </Label>
                  <Select
                    value={selectedBooth}
                    onValueChange={setSelectedBooth}
                    disabled={!selectedAssembly}
                  >
                    <SelectTrigger className="h-11 bg-white border-gray-200 rounded-xl">
                      <SelectValue
                        placeholder={
                          selectedAssembly
                            ? "Select booth"
                            : "Select assembly first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {booths.map((booth) => (
                        <SelectItem
                          key={booth.documentId}
                          value={booth.documentId}
                        >
                          {booth.PS_Name} (PS No: {booth.PS_No})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedBooth &&
                (() => {
                  const booth = booths.find(
                    (b) => b.documentId === selectedBooth,
                  );
                  const districtName = districts.find(
                    (d) => d.id === selectedDistrict,
                  )?.name;
                  const assemblyName = assemblies.find(
                    (a) => a.id === selectedAssembly,
                  )?.name;
                  return (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                      <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">
                        Selected location
                      </p>
                      <p className="text-gray-800 font-medium">
                        {districtName} → {assemblyName} → {booth?.PS_Name}
                        {booth?.PS_No != null && (
                          <span className="text-gray-600 font-normal">
                            {" "}
                            (PS No: {booth.PS_No})
                          </span>
                        )}
                      </p>
                    </div>
                  );
                })()}
            </ModernCard>
          </motion.div>

          {/* Survey details – same fields as view/edit */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <ModernCard>
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl">
                  <ListChecks className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Survey Details
                  </h3>
                  <p className="text-gray-600">
                    Power, network, site condition, and documentation
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Power & Socket */}
                <div className="space-y-3">
                  <div className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border p-4 bg-gray-50">
                    <Label className="min-w-0 flex-1 text-sm font-medium text-gray-700">
                      Power Available
                    </Label>
                    <Switch
                      className="shrink-0"
                      checked={surveyForm.Power_Available}
                      onCheckedChange={(v) =>
                        setSurveyForm({
                          ...surveyForm,
                          Power_Available: v,
                          Socket_Working: v ? surveyForm.Socket_Working : false,
                        })
                      }
                    />
                  </div>
                  {surveyForm.Power_Available && (
                    <div className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border p-4 bg-yellow-50 border-yellow-200">
                      <Label className="min-w-0 flex-1 text-sm font-medium text-gray-700">
                        Socket Working
                      </Label>
                      <Switch
                        className="shrink-0"
                        checked={surveyForm.Socket_Working}
                        onCheckedChange={(v) =>
                          setSurveyForm({
                            ...surveyForm,
                            Socket_Working: v,
                          })
                        }
                      />
                    </div>
                  )}
                </div>

                {/* Network & Speed test */}
                <div className="space-y-3">
                  <div className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border p-4 bg-gray-50">
                    <Label className="min-w-0 flex-1 text-sm font-medium text-gray-700">
                      Network Available
                    </Label>
                    <Switch
                      className="shrink-0"
                      checked={surveyForm.Network_Available}
                      onCheckedChange={(v) =>
                        setSurveyForm({
                          ...surveyForm,
                          Network_Available: v,
                          sim_speeds: v
                            ? surveyForm.sim_speeds
                            : [
                                {
                                  provider: "sim1",
                                  download_speed: 0,
                                  upload_speed: 0,
                                  latency: 0,
                                },
                                {
                                  provider: "sim2",
                                  download_speed: 0,
                                  upload_speed: 0,
                                  latency: 0,
                                },
                              ],
                        })
                      }
                    />
                  </div>
                  {surveyForm.Network_Available && (
                    <div className="rounded-xl border p-4 bg-blue-50 border-blue-100 space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          SIM Speed Test
                        </Label>
                        <p className="text-xs text-gray-500 mt-1">
                          Switch to the SIM you want to test in your phone
                          settings, then run the test. Only one test can run at
                          a time.
                        </p>
                      </div>
                      {surveyForm.sim_speeds.map((sim, index) => {
                        const slotLabel =
                          sim.provider === "sim1" ? "SIM 1" : "SIM 2";
                        const displayLabel = sim.carrier_info
                          ? `${slotLabel} (${sim.carrier_info})`
                          : slotLabel;
                        return (
                          <div
                            key={sim.provider}
                            className="rounded-lg border p-3 bg-white"
                          >
                            <h4 className="font-semibold mb-2">
                              {displayLabel}
                            </h4>
                            <Network3
                              provider={sim.provider}
                              disabled={
                                activeTestProvider !== null &&
                                activeTestProvider !== sim.provider
                              }
                              onStart={() =>
                                setActiveTestProvider(sim.provider)
                              }
                              onComplete={(data) => {
                                setSurveyForm((prev) => {
                                  const updated = [...prev.sim_speeds];
                                  updated[index] = {
                                    provider: data.provider,
                                    download_speed: data.download_speed,
                                    upload_speed: data.upload_speed,
                                    latency: data.latency,
                                    carrier_info: data.carrier_info,
                                  };
                                  return { ...prev, sim_speeds: updated };
                                });
                                setActiveTestProvider(null);
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Site condition & description */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Site Condition
                    </Label>
                    <Select
                      value={surveyForm.site_condition}
                      onValueChange={(v) =>
                        setSurveyForm({ ...surveyForm, site_condition: v })
                      }
                    >
                      <SelectTrigger className="h-11 rounded-xl bg-white/80 border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Average">Average</SelectItem>
                        <SelectItem value="Poor">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Site Description
                    </Label>
                    <Input
                      value={surveyForm.site_description}
                      onChange={(e) =>
                        setSurveyForm({
                          ...surveyForm,
                          site_description: e.target.value,
                        })
                      }
                      placeholder="Describe the site condition..."
                      className="rounded-xl min-h-[80px]"
                    />
                  </div>
                </div>

                {/* Photo documentation */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">
                    Photo Documentation
                  </Label>
                  {surveyForm.survey_photo.map((photo, index) => (
                    <PhotoEntry
                      key={index}
                      index={index}
                      photo={photo}
                      onChange={(field, value) =>
                        updatePhotoField(index, field, value as string)
                      }
                      onFileChange={(file) =>
                        updatePhotoField(index, "file", file)
                      }
                      onRemove={() => removePhotoEntry(index)}
                    />
                  ))}
                  <PillButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addPhotoEntry}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Photo
                  </PillButton>
                </div>

                {/* Remarks */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Remarks
                  </Label>
                  <Input
                    value={surveyForm.Remarks}
                    onChange={(e) =>
                      setSurveyForm({
                        ...surveyForm,
                        Remarks: e.target.value,
                      })
                    }
                    placeholder="Optional remarks..."
                    className="rounded-xl min-h-[60px]"
                  />
                </div>

                {/* Submit */}
                <div className="flex flex-wrap gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={
                      isSubmitting ||
                      checkingSurvey ||
                      !selectedBooth ||
                      !!existingSurvey ||
                      surveyForm.survey_photo.some((p) => p.compressing)
                    }
                    onClick={handleSubmit}
                    className="rounded-xl bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] hover:from-[#2d7ae8] hover:to-[#1976D2] text-white border-0"
                  >
                    {isSubmitting
                      ? "Submitting..."
                      : checkingSurvey
                        ? "Checking..."
                        : surveyForm.survey_photo.some((p) => p.compressing)
                          ? "Optimizing Photos..."
                          : "Submit Survey"}
                  </Button>
                </div>
              </div>
            </ModernCard>
          </motion.div>
        </div>
      </div>
    </PageLayout>
  );
}
