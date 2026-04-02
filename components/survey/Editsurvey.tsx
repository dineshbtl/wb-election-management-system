"use client";

import React, { useState, useEffect } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { ModernCard } from "@/components/ui/modern-card";
import { Button } from "@/components/ui/button";
import { PillButton } from "@/components/ui/pill-button";
import { BackToLink } from "@/components/ui/back-to-link";
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
  ListChecks,
  X,
  Plus,
  Navigation,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams } from "next/navigation";
import bpi from "@/lib/bpi";
import api from "@/lib/api";
import { uploadSurveyPhotos, updateSurvey } from "@/lib/survey-api";
import { compressImage } from "@/lib/compress-image";
import Network3 from "@/components/survey/Network3";
import { SurveyPhotoImagePicker } from "@/components/survey/SurveyPhotoImagePicker";
import { Switch } from "@/components/ui/switch";
import { Spin } from "antd";
import { useAuth } from "@/context/AuthContext";
import { GOOGLE_MAPS_CONFIG } from "@/lib/google-maps-config";
import { Loader2 } from "lucide-react";

const baseurl = process.env.NEXT_PUBLIC_BACKEND_URL || "";

interface SurveyPhotoEntry {
  file: File | null;
  title: string;
  description: string;
  existingImageUrl?: string | null;
  imageId?: number | null;
  compressing?: boolean;
}

interface SurveyFormState {
  Power_Available: boolean;
  Socket_Working: boolean;
  Network_Available: boolean;
  site_condition: string;
  site_description: string;
  GPS_Latitude: string;
  GPS_Longitude: string;
  Remarks: string;
  airtel_signal: number;
  jio_signal: number;
  sim_speeds: {
    provider: string;
    download_speed: number;
    upload_speed: number;
    latency: number;
    carrier_info?: string;
  }[];
  survey_photo: SurveyPhotoEntry[];
}

function PhotoEntryEdit({
  index,
  photo,
  onChange,
  onFileChange,
  onRemove,
}: {
  index: number;
  photo: SurveyPhotoEntry;
  onChange: (
    field: keyof SurveyPhotoEntry,
    value: string | number | null,
  ) => void;
  onFileChange: (file: File | null) => void;
  onRemove: () => void;
}) {
  const previewUrl = photo.file
    ? URL.createObjectURL(photo.file)
    : photo.existingImageUrl
      ? `${baseurl}${photo.existingImageUrl}`
      : null;
      
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
            inputId={`survey-edit-photo-${index}`}
            compressing={photo.compressing}
            hasImage={!!photo.file || !!photo.existingImageUrl}
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

      {/* Compression loader */}
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
      {previewUrl && !photo.compressing && (
        <div className="mt-2">
          <img
            src={previewUrl}
            alt={`preview-${index}`}
            className="w-full h-32 object-cover rounded-lg border"
          />
        </div>
      )}
    </div>
  );
}

export default function EditSurveyPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { toast } = useToast();
  const [survey, setSurvey] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, loading: authLoading } = useAuth();
  
  const [activeTestProvider, setActiveTestProvider] = useState<string | null>(null);

  // GPS Tracking functionality matching Newsurvey
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"loading" | "success" | "error">("loading");
  const [locationName, setLocationName] = useState<string | null>(null);
  const [isRefreshingGPS, setIsRefreshingGPS] = useState(false);

  const [form, setForm] = useState<SurveyFormState>({
    Power_Available: false,
    Socket_Working: false,
    Network_Available: false,
    site_condition: "Good",
    site_description: "",
    GPS_Latitude: "",
    GPS_Longitude: "",
    Remarks: "",
    airtel_signal: 0,
    jio_signal: 0,
    sim_speeds: [
      { provider: "sim1", download_speed: 0, upload_speed: 0, latency: 0 },
      { provider: "sim2", download_speed: 0, upload_speed: 0, latency: 0 },
    ],
    survey_photo: [],
  });
  
  // Reverse geocode coordinates to a human-readable address
  const fetchLocationName = async (lat: number, lng: number) => {
    try {
      const apiKey = GOOGLE_MAPS_CONFIG.apiKey;
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      );
      const data = await res.json();
      if (data.status === "OK" && data.results && data.results.length > 0) {
        setLocationName(data.results[0].formatted_address);
      } else {
        setLocationName(null);
      }
    } catch {
      setLocationName(null);
    }
  };

  const getGPSLocation = () => {
    setIsRefreshingGPS(true);
    setGpsStatus("loading");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsStatus("success");
          setIsRefreshingGPS(false);
          setForm(prev => ({
            ...prev,
            GPS_Latitude: pos.coords.latitude.toFixed(6),
            GPS_Longitude: pos.coords.longitude.toFixed(6),
          }));
          fetchLocationName(pos.coords.latitude, pos.coords.longitude);
          toast({
            variant: "success",
            title: "GPS Updated",
            description: "Location captured from device.",
          });
        },
        () => {
          fetch("https://ipapi.co/json/")
            .then((res) => res.json())
            .then((data) => {
              if (data.latitude != null && data.longitude != null) {
                setGpsLocation({ lat: data.latitude, lng: data.longitude });
                setGpsStatus("success");
                setIsRefreshingGPS(false);
                setForm(prev => ({
                  ...prev,
                  GPS_Latitude: data.latitude.toString(),
                  GPS_Longitude: data.longitude.toString(),
                }));
                fetchLocationName(data.latitude, data.longitude);
                toast({
                  variant: "success",
                  title: "Approximate location",
                  description: "Using network (IP) location.",
                });
              } else {
                setGpsStatus("error");
                setIsRefreshingGPS(false);
              }
            })
            .catch(() => {
              setGpsStatus("error");
              setIsRefreshingGPS(false);
            });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
      );
    } else {
      setGpsStatus("error");
      setIsRefreshingGPS(false);
    }
  };


  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await bpi.get(
          `/surveys/${encodeURIComponent(id)}?populate[0]=booth.assembly.district&populate[1]=survey_photo.image&populate[2]=sim_speeds&populate[3]=raised_by`,
        );
        const data = res.data?.data || res.data;
        if (!data || cancelled) return;
        setSurvey(data);
        setLocation(data.booth);
        const sims = data.sim_speeds || [];
        // Legacy surveys may have 'Airtel' and 'Jio', new surveys have carrier names like 'Atria...'. We just use index 0 and 1.
        const sim1 = sims.length > 0 ? sims[0] : null;
        const sim2 = sims.length > 1 ? sims[1] : null;

        const photos = (data.survey_photo || []).map((p: any) => ({
          file: null,
          title: p.title || "",
          description: p.description || "",
          existingImageUrl: p.image?.url,
          imageId: p.image?.id,
        }));
        setForm({
          Power_Available: !!data.Power_Available,
          Socket_Working: !!data.Socket_Working,
          Network_Available: !!data.Network_Available,
          site_condition: data.site_condition || "Good",
          site_description: data.site_description || "",
          GPS_Latitude: data.GPS_Latitude?.toString() || "",
          GPS_Longitude: data.GPS_Longitude?.toString() || "",
          Remarks: data.Remarks || "",
          airtel_signal: data.airtel_signal || 0,
          jio_signal: data.jio_signal || 0,
          sim_speeds: [
            {
              provider: "sim1",
              download_speed: sim1?.download_speed ?? 0,
              upload_speed: sim1?.upload_speed ?? 0,
              latency: sim1?.latency ?? 0,
              carrier_info: sim1?.carrier_info || (sim1?.provider && sim1.provider !== "sim1" && sim1.provider !== "SIM 1" ? sim1.provider : ""),
            },
            {
              provider: "sim2",
              download_speed: sim2?.download_speed ?? 0,
              upload_speed: sim2?.upload_speed ?? 0,
              latency: sim2?.latency ?? 0,
              carrier_info: sim2?.carrier_info || (sim2?.provider && sim2.provider !== "sim2" && sim2.provider !== "SIM 2" ? sim2.provider : ""),
            },
          ],
          survey_photo: photos.length
            ? photos
            : [{ file: null, title: "", description: "" }],
        });
        
        // Initialize GPS from existing data
        if (data.GPS_Latitude && data.GPS_Longitude) {
           setGpsLocation({ lat: parseFloat(data.GPS_Latitude), lng: parseFloat(data.GPS_Longitude) });
           setGpsStatus("success");
           fetchLocationName(parseFloat(data.GPS_Latitude), parseFloat(data.GPS_Longitude));
        }
        
      } catch (err) {
        console.error(err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load survey.",
        });
        if (!cancelled) router.push("/surveys");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, router, toast]);

  const updatePhoto = (
    index: number,
    field: keyof SurveyPhotoEntry,
    value: string | number | null,
  ) => {
    const updated = [...form.survey_photo];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, survey_photo: updated });
  };

  const updatePhotoFile = async (index: number, file: File | null) => {
    if (!file) {
      const updated = [...form.survey_photo];
      updated[index] = { ...updated[index], file: null };
      setForm({ ...form, survey_photo: updated });
      return;
    }

    setForm((prev) => {
      const photos = [...prev.survey_photo];
      photos[index] = { ...photos[index], file: null, compressing: true };
      return { ...prev, survey_photo: photos };
    });

    try {
      const compressed = await compressImage(file);
      setForm((prev) => {
        const photos = [...prev.survey_photo];
        photos[index] = { ...photos[index], file: compressed, compressing: false };
        return { ...prev, survey_photo: photos };
      });
    } catch {
      setForm((prev) => {
        const photos = [...prev.survey_photo];
        photos[index] = { ...photos[index], file, compressing: false };
        return { ...prev, survey_photo: photos };
      });
    }
  };

  const addPhoto = () => {
    setForm((prev) => ({
      ...prev,
      survey_photo: [
        ...prev.survey_photo,
        { file: null, title: "", description: "" },
      ],
    }));
  };

  const removePhoto = (index: number) => {
    if (form.survey_photo.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      survey_photo: prev.survey_photo.filter((_, i) => i !== index),
    }));
  };

  const resolveRaisedByDocumentId = (): string | undefined => {
    const u = user?.documentId as string | undefined;
    if (u) return u;
    const r = survey?.raised_by;
    if (r == null) return undefined;
    if (typeof r === "string") return r;
    if (typeof r === "object" && r && "documentId" in r && (r as { documentId?: string }).documentId) {
      return (r as { documentId: string }).documentId;
    }
    return undefined;
  };

  const handleSubmit = async () => {
    if (authLoading) {
      toast({
        variant: "destructive",
        title: "Please wait",
        description: "Finishing sign-in…",
      });
      return;
    }

    const validPhotos = form.survey_photo.filter(
      (p) => p.title.trim() && (p.file || p.imageId),
    );
    if (validPhotos.length === 0) {
      toast({
        variant: "destructive",
        title: "Validation",
        description: "At least one photo with a title is required.",
      });
      return;
    }

    const raisedById = resolveRaisedByDocumentId();
    if (!raisedById) {
      toast({
        variant: "destructive",
        title: "Session error",
        description: "Could not resolve your user id. Please refresh and sign in again.",
      });
      return;
    }

    const titledPhotos = form.survey_photo.filter((p) => p.title.trim());
    for (const p of titledPhotos) {
      if (!p.file && (p.imageId == null || p.imageId <= 0)) {
        toast({
          variant: "destructive",
          title: "Photo data incomplete",
          description: "Missing image reference for a saved photo. Refresh the page and try again.",
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let newUploadedIds: number[] = [];
      const newFiles = form.survey_photo.filter((p) => p.file);
      if (newFiles.length > 0) {
        const fd = new FormData();
        newFiles.forEach((p) => fd.append("files", p.file!));
        newUploadedIds = await uploadSurveyPhotos(fd);
      }

      let uploadIndex = 0;
      const surveyPhotosPayload = titledPhotos.map((p) => {
        if (p.file) {
          const imageId = newUploadedIds[uploadIndex++];
          return {
            title: p.title,
            description: p.description,
            image: imageId,
          };
        }
        return {
          title: p.title,
          description: p.description,
          image: p.imageId as number,
        };
      });

      await updateSurvey(survey.documentId, {
        booth: survey.booth?.documentId ?? id,
        raised_by: raisedById,
        survey_date: survey?.survey_date ?? new Date().toISOString(),
        Power_Available: form.Power_Available,
        Socket_Working: form.Socket_Working,
        Network_Available: form.Network_Available,
        site_condition: form.site_condition,
        site_description: form.site_description || undefined,
        GPS_Latitude: parseFloat(form.GPS_Latitude) || null,
        GPS_Longitude: parseFloat(form.GPS_Longitude) || null,
        Remarks: form.Remarks,
        airtel_signal: form.airtel_signal,
        jio_signal: form.jio_signal,
        sim_speeds: form.sim_speeds.map((s) => ({
          provider: s.provider,
          download_speed: s.download_speed,
          upload_speed: s.upload_speed,
          latency: s.latency,
          ...(s.carrier_info && { carrier_info: s.carrier_info }),
        })),
        survey_photo: surveyPhotosPayload,
      });

      toast({
        variant: "success",
        title: "Survey Updated",
        description: "Changes saved successfully.",
      });
      
      const boothId = survey?.booth?.documentId ?? id;
      if (user?.role?.type === "booth_coordinator") {
        router.push(`/booth/surveys/${boothId}`);
      } else if (user?.role?.type === "district_coordinator") {
        router.push(`/district/surveys/${boothId}`);
      } else if (user?.role?.type === "assembly_coordinator") {
        router.push(`/assembly/surveys/${boothId}`);
      } else {
        router.push(`/surveys/${boothId}`);
      }
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !survey) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Spin size="large" />
        </div>
      </PageLayout>
    );
  }

  const booth = survey.booth;
  const districtName = booth?.assembly?.district?.district_name || "—";
  const assemblyName = booth?.assembly?.Assembly_Name || "—";

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto w-full min-w-0 lg:p-6 p-0 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <BackToLink
            href={
                user?.role?.type === "booth_coordinator"
                ? `/booth/surveys/${booth?.documentId}`
                : user?.role?.type === "district_coordinator"
                ? `/district/surveys/${booth?.documentId}`
                : user?.role?.type === "assembly_coordinator"
                ? `/assembly/surveys/${booth?.documentId}`
                : `/surveys/${booth?.documentId}`
            }
            label="Back"
          />
          <h1 className="text-2xl font-semibold text-gray-800">Edit Survey</h1>
        </div>

        <div className="space-y-8">
          {/* GPS Status Card - Matching Newsurvey */}
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
                      {gpsStatus === "success" && gpsLocation
                        ? `Lat: ${gpsLocation.lat.toFixed(6)}, Lng: ${gpsLocation.lng.toFixed(6)}`
                        : gpsStatus === "error"
                          ? "Unable to get location"
                          : "Location data loaded"}
                    </p>
                    {gpsStatus === "success" && locationName && (
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 inline-block text-amber-500 flex-shrink-0" />
                        <span className="truncate max-w-xs">{locationName}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <PillButton
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={getGPSLocation}
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${isRefreshingGPS ? "animate-spin" : ""}`}
                    />
                    <span className="ml-2">Update GPS</span>
                  </PillButton>
                </div>
              </div>
            </ModernCard>
          </motion.div>

          {/* Location (read-only) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ModernCard>
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Location</h3>
                  <p className="text-sm text-gray-600">
                    Survey is linked to this booth (read-only)
                  </p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
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
            </ModernCard>
          </motion.div>

          {/* Survey Details – Matching Newsurvey Form Exactly */}
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
                      checked={form.Power_Available}
                      onCheckedChange={(v) =>
                        setForm({
                          ...form,
                          Power_Available: v,
                          Socket_Working: v ? form.Socket_Working : false,
                        })
                      }
                    />
                  </div>
                  {form.Power_Available && (
                    <div className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border p-4 bg-yellow-50 border-yellow-200">
                      <Label className="min-w-0 flex-1 text-sm font-medium text-gray-700">
                        Socket Working
                      </Label>
                      <Switch
                        className="shrink-0"
                        checked={form.Socket_Working}
                        onCheckedChange={(v) =>
                          setForm({ ...form, Socket_Working: v })
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
                      checked={form.Network_Available}
                      onCheckedChange={(v) =>
                        setForm({
                          ...form,
                          Network_Available: v,
                          sim_speeds: v
                            ? form.sim_speeds
                            : [
                                { provider: "sim1", download_speed: 0, upload_speed: 0, latency: 0 },
                                { provider: "sim2", download_speed: 0, upload_speed: 0, latency: 0 },
                              ],
                        })
                      }
                    />
                  </div>
                  {form.Network_Available && (
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
                      {form.sim_speeds.map((sim, index) => {
                        const slotLabel = sim.provider === "sim1" ? "SIM 1" : "SIM 2";
                        const displayLabel = sim.carrier_info
                          ? `${slotLabel} (${sim.carrier_info})`
                          : slotLabel;
                        
                        const hasExistingData = (sim.download_speed > 0 || sim.upload_speed > 0);
                        return (
                          <div
                            key={sim.provider}
                            className="rounded-lg border p-3 bg-white"
                          >
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-semibold">{displayLabel}</h4>
                            </div>
                            
                            {hasExistingData && (
                                <div className="mb-3 space-y-1 bg-gray-50 border border-gray-200 rounded p-3">
                                  <p className="text-xs text-green-600 font-medium mb-2">Saved Test Results</p>
                                  <p className="text-sm">Download: <strong>{sim.download_speed}</strong> Mbps</p>
                                  <p className="text-sm">Upload: <strong>{sim.upload_speed}</strong> Mbps</p>
                                  <p className="text-sm">Latency: <strong>{sim.latency}</strong> ms</p>
                                  {sim.carrier_info && <p className="text-xs text-gray-600 mt-1">Provider: {sim.carrier_info}</p>}
                                </div>
                            )}

                            <Network3
                              provider={sim.provider}
                              existingData={hasExistingData ? {
                                download_speed: sim.download_speed,
                                upload_speed: sim.upload_speed,
                                latency: sim.latency,
                                carrier_info: sim.carrier_info
                              } : undefined}
                              disabled={
                                activeTestProvider !== null &&
                                activeTestProvider !== sim.provider
                              }
                              onStart={() => setActiveTestProvider(sim.provider)}
                              onComplete={(data) => {
                                setForm((prev) => {
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
                      value={form.site_condition}
                      onValueChange={(v) =>
                        setForm({ ...form, site_condition: v })
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
                      value={form.site_description}
                      onChange={(e) =>
                        setForm({ ...form, site_description: e.target.value })
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
                  {form.survey_photo.map((photo, index) => (
                    <PhotoEntryEdit
                      key={index}
                      index={index}
                      photo={photo}
                      onChange={(field, value) =>
                        updatePhoto(index, field, value)
                      }
                      onFileChange={(file) => updatePhotoFile(index, file)}
                      onRemove={() => removePhoto(index)}
                    />
                  ))}
                  <PillButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addPhoto}
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
                    value={form.Remarks}
                    onChange={(e) =>
                      setForm({ ...form, Remarks: e.target.value })
                    }
                    placeholder="Optional remarks..."
                    className="rounded-xl min-h-[60px]"
                  />
                </div>

                {/* Submit */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                        const boothId = survey?.booth?.documentId ?? id;
                        if (user?.role?.type === "booth_coordinator") {
                            router.push(`/booth/surveys/${boothId}`);
                        } else if (user?.role?.type === "district_coordinator") {
                            router.push(`/district/surveys/${boothId}`);
                        } else if (user?.role?.type === "assembly_coordinator") {
                            router.push(`/assembly/surveys/${boothId}`);
                        } else {
                            router.push(`/surveys/${boothId}`);
                        }
                    }}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={isSubmitting || form.survey_photo.some((p) => p.compressing)}
                    onClick={handleSubmit}
                    className="rounded-xl min-w-[168px] bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] hover:from-[#2d7ae8] hover:to-[#1976D2] text-white border-0"
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                        Updating…
                      </span>
                    ) : form.survey_photo.some((p) => p.compressing) ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                        Optimizing photos…
                      </span>
                    ) : (
                      "Update Survey"
                    )}
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
