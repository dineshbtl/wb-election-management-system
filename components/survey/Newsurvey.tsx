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
import { GOOGLE_MAPS_CONFIG } from "@/lib/google-maps-config";
import Network3 from "@/components/survey/Network3";
import { SurveyPhotoImagePicker } from "@/components/survey/SurveyPhotoImagePicker";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import { Select as AntSelect } from "antd";
import { Loader2 } from "lucide-react";

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
            inputId={`survey-new-photo-${index}`}
            compressing={photo.compressing}
            hasImage={!!photo.file}
            onFileSelected={onFileChange}
            buttonVariant="blue"
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

      {/* Compression loader overlay */}
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

  const { user: authUser } = useAuth();

  const role = searchParams.get("role");
  const districtId = searchParams.get("districtId");
  const assemblyId = searchParams.get("assemblyId");

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

  // Track if we're in prefill mode (came with ?boothId=)
  const [isPrefillMode, setIsPrefillMode] = useState(false);
  const [prefillBoothDetails, setPrefillBoothDetails] = useState<any>(null);

  // Role & permissions

  // GPS & Form
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [gpsStatus, setGpsStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [locationName, setLocationName] = useState<string | null>(null);
  const [isRefreshingGPS, setIsRefreshingGPS] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);

  const [hideLocationSelector, setHideLocationSelector] = useState(false);
  const [roleReady, setRoleReady] = useState(false);

  const [locationMatchStatus, setLocationMatchStatus] = useState<
    "checking" | "match" | "mismatch" | null
  >(null);
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
  // Fetch user with role details

  // Calculate distance in meters between two lat/lng points
  const getDistanceInMeters = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => {
    const R = 6371e3; // Earth radius in meters
    const toRad = (value: number) => (value * Math.PI) / 180;

    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // distance in meters
  };

  const checkLocationMatch = () => {
    if (!location) return;

    const boothLat =
      parseFloat(prefillBoothDetails?.Latitude) ||
      parseFloat(prefillBoothDetails?.latitude);

    const boothLng =
      parseFloat(prefillBoothDetails?.Longitude) ||
      parseFloat(prefillBoothDetails?.longitude);

    if (!boothLat || !boothLng) return;

    const distance = getDistanceInMeters(
      location.lat,
      location.lng,
      boothLat,
      boothLng,
    );

    console.log("Distance in meters:", distance);

    const ALLOWED_RADIUS = 100;

    if (distance <= ALLOWED_RADIUS) {
      setLocationMatchStatus("match");
    } else {
      setLocationMatchStatus("mismatch");
    }
  };

  useEffect(() => {
    if (location && prefillBoothDetails) {
      checkLocationMatch();
    }
  }, [location, prefillBoothDetails]);

  // Fetch districts on mount
  useEffect(() => {
    if (boothIdFromUrl) {
      setHideLocationSelector(true);
      setSelectedBooth(boothIdFromUrl);
    }
    const fetchDistricts = async () => {
      try {
        const res = await bpi.get("/districts?sort=district_name:asc");
        setDistricts(
          res.data.data.map((d: any) => ({
            id: d.documentId, // ✅ use documentId
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

  useEffect(() => {
    if (!selectedBooth || isPrefillMode) return;

    const fetchBoothDetails = async () => {
      try {
        const res = await bpi.get(
          `/locations/${encodeURIComponent(selectedBooth)}?populate[0]=assembly.district`,
        );

        const loc = res.data?.data || res.data;
        if (!loc) return;

        const assembly = loc.assembly;
        const district = assembly?.district;

        setPrefillBoothDetails({
          boothName: loc.PS_Name,
          boothNo: loc.PS_No,
          assemblyName: assembly?.Assembly_Name,
          districtName: district?.district_name || district?.name,
          latitude: loc.Latitude || loc.GPS_Latitude,
          longitude: loc.Longitude || loc.GPS_Longitude,
          ...loc,
        });
      } catch (err) {
        console.error("Manual booth fetch error:", err);
      }
    };

    fetchBoothDetails();
  }, [selectedBooth]);

  // Pre-fill location when ?boothId= is in URL (e.g. from surveys list or location detail)
  // Pre-fill location when ?boothId= is in URL
  useEffect(() => {
    if (!boothIdFromUrl) {
      setPrefillLoading(false);
      setIsPrefillMode(false);
      return;
    }

    setIsPrefillMode(true); // ✅ Enable prefill mode
    setPrefillLoading(true);

    let cancelled = false;
    const loadLocation = async () => {
      try {
        // Fetch booth details with nested relations
        const res = await bpi.get(
          `/locations/${encodeURIComponent(boothIdFromUrl)}?populate[0]=assembly.district`,
        );

        const loc = res.data?.data || res.data;
        if (!loc || cancelled) return;

        console.log("Prefill location data:", loc);

        // Extract hierarchy
        const district = loc.assembly?.district;
        const assembly = loc.assembly;

        // Set form values
        if (district?.id) setSelectedDistrict(district.id.toString());
        if (assembly?.id) setSelectedAssembly(assembly.id.toString());
        setSelectedBooth(boothIdFromUrl);

        // Store booth details for display
        setPrefillBoothDetails({
          boothName: loc.PS_Name,
          boothNo: loc.PS_No,
          assemblyName: assembly?.Assembly_Name,
          districtName: district?.district_name || district?.name,
          latitude: loc.GPS_Latitude,
          longitude: loc.GPS_Longitude,
          ...loc,
        });

        // Pre-fill GPS if available in booth data
        if (loc.GPS_Latitude && loc.GPS_Longitude) {
          setCoords(
            parseFloat(loc.GPS_Latitude),
            parseFloat(loc.GPS_Longitude),
          );
        }
      } catch (err) {
        console.error("Prefill location error:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load booth details. Please select manually.",
        });
        setIsPrefillMode(false); // Fallback to manual selection
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
  // Fetch assemblies when district changes OR when user is District Coordinator
  useEffect(() => {
    const filterDistrictId =
      role === "district" ? districtId : selectedDistrict;

    if (!filterDistrictId) {
      setAssemblies([]);
      setSelectedAssembly("");
      setBooths([]);
      setSelectedBooth("");
      return;
    }

    const fetchAssemblies = async () => {
      try {
        const res = await bpi.get(
          `/assemblies?filters[district][documentId][$eq]=${filterDistrictId}&sort=Assembly_Name:asc`,
        );

        setAssemblies(
          res.data.data.map((a: any) => ({
            id: a.documentId,
            name: a.Assembly_Name,
            district: a.district?.documentId || "",
          })),
        );
      } catch (err) {
        console.error("Assembly fetch error:", err);
      }
    };

    fetchAssemblies();
  }, [selectedDistrict, role, districtId]);
  useEffect(() => {
    if (selectedBooth) {
      checkExistingSurvey(selectedBooth);
    } else {
      setExistingSurvey(null);
    }
  }, [selectedBooth]);

  // Fetch booths when assembly changes
  // Fetch booths when assembly changes OR when user is Assembly Coordinator
  useEffect(() => {
    const filterAssemblyId =
      role === "assembly" ? assemblyId : selectedAssembly;

    if (!filterAssemblyId) {
      setBooths([]);
      setSelectedBooth("");
      return;
    }

    const fetchBooths = async () => {
      try {
        const res = await bpi.get(
          `/locations?filters[assembly][documentId][$eq]=${filterAssemblyId}&sort=PS_Name:asc`,
        );

        setBooths(
          res.data.data.map((b: any) => ({
            id: b.id.toString(),
            documentId: b.documentId,
            PS_Name: b.PS_Name,
            PS_No: b.PS_No,
          })),
        );
      } catch (err) {
        console.error("Booth fetch error:", err);
      }
    };

    fetchBooths();
  }, [selectedAssembly, role, assemblyId]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/users/me?populate=role");
        setUser(res.data);
        console.log("User data:", res.data);
      } catch (err) {
        console.error("User fetch failed", err);
      }
    };

    fetchUser();
  }, []);

  // Auto-select assigned district/assembly for coordinators on load

  const checkExistingSurvey = async (boothId: string) => {
    if (!boothId) return;

    setCheckingSurvey(true);
    if (process.env.NODE_ENV === "development") {
      console.log("[Survey] Duplicate check start", { boothId });
    }
    try {
      const existing = await checkExistingSurveyApi(boothId);
      if (process.env.NODE_ENV === "development") {
        console.log("[Survey] Duplicate check complete", { exists: !!existing });
      }

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

  // Reverse geocode coordinates to a human-readable address
  const fetchLocationName = async (lat: number, lng: number) => {
    try {
      const apiKey = GOOGLE_MAPS_CONFIG.apiKey;
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      );
      const data = await res.json();
      if (data.status === "OK" && data.results && data.results.length > 0) {
        // Use the formatted address of the first result
        setLocationName(data.results[0].formatted_address);
      } else {
        setLocationName(null);
      }
    } catch {
      setLocationName(null);
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
    fetchLocationName(lat, lng);
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
      // Mark as compressing immediately
      setSurveyForm((prev) => {
        const photos = [...prev.survey_photo];
        photos[index] = { ...photos[index], file: null, compressing: true };
        return { ...prev, survey_photo: photos };
      });

      try {
        const compressed = await compressImage(value);
        setSurveyForm((prev) => {
          const photos = [...prev.survey_photo];
          photos[index] = { ...photos[index], file: compressed, compressing: false };
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
    updatedPhotos[index] = { ...updatedPhotos[index], [field]: value };
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
    const me = authUser ?? user;
    if (!me?.documentId) {
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
      // Step 1: Upload photos (uses api client — no hard timeout)
      const formData = new FormData();
      validPhotos.forEach((p) => formData.append("files", p.file!));
      if (process.env.NODE_ENV === "development") {
        console.log("[Survey] Upload start", { photoCount: validPhotos.length });
      }
      let photoIds: number[] = [];
      try {
        photoIds =
          validPhotos.length > 0 ? await uploadSurveyPhotos(formData) : [];
        if (process.env.NODE_ENV === "development") {
          console.log("[Survey] Upload complete", { uploadedCount: photoIds.length });
        }
      } catch (uploadErr) {
        console.error("[Survey] Upload failed", uploadErr);
        throw new Error(
          "Photo upload failed. Check your connection and try again. If the problem persists, try fewer or smaller photos."
        );
      }

      // Map to Strapi component format
      const surveyPhotosPayload = validPhotos.map((p, i) => ({
        title: p.title,
        description: p.description,
        image: photoIds[i],
      }));

      // Step 2: Submit survey
      if (process.env.NODE_ENV === "development") {
        console.log("[Survey] Create start", { booth: selectedBooth });
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
          raised_by: me.documentId,
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
          ...(locationName ? { locationName } : {}),
        });
      } catch (createErr) {
        console.error("[Survey] Create failed", createErr);
        throw new Error(
          "Survey creation failed. Your photos were uploaded but the survey could not be saved. Please try again."
        );
      }
      if (process.env.NODE_ENV === "development") {
        console.log("[Survey] Create complete");
      }

      toast({
        variant: "success",
        title: "Survey Created!",
        description: "Survey submitted successfully.",
      });

      // if (role === "superadmin") {
      //   router.push(`/locations/${selectedBooth}`);
      // } else if (role === "assembly") {
      //   router.push(`/assembly/locations/${selectedBooth}`);
      // } else if (role === "district") {
      //   router.push(`/district/locations/${selectedBooth}`);
      // } else if (role === "booth_coordinator") {
      //   router.push(`/booth/locations/${selectedBooth}`);
      // }

      if (me?.role?.type === "booth_coordinator") {
        router.replace(`/booth/surveys/${selectedBooth}`);
      } else if (me?.role?.type === "district_coordinator") {
        router.replace(`/district/surveys/${selectedBooth}`);
      } else if (me?.role?.type === "assembly_coordinator") {
        router.replace(`/assembly/surveys/${selectedBooth}`);
      } else {
        router.replace(`/surveys/${selectedBooth}`);
      }
    } catch (err) {
      console.error("[Survey] Submit error:", err);
      const description =
        err instanceof Error ? err.message : "Please try again.";
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto w-full min-w-0 lg:p-6 p-0 pb-12">
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
                    {gpsStatus === "success" && locationName && (
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 inline-block text-amber-500 flex-shrink-0" />
                        <span className="truncate max-w-xs word-break">{locationName}</span>
                      </p>
                    )}
                    {gpsStatus === "success" && !locationName && (
                      <p className="text-xs text-gray-400 mt-0.5 animate-pulse">Fetching address...</p>
                    )}
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

              {locationMatchStatus === "match" && (
                <p className="text-green-600 text-sm mt-1">
                  ✅ You are near the booth location
                </p>
              )}

              {locationMatchStatus === "mismatch" && (
                <p className="text-red-600 text-sm mt-1">
                  ❌ You are far from the booth location
                </p>
              )}
            </ModernCard>
          </motion.div>

          {/* Selected Location Details Card */}
          {prefillBoothDetails && selectedBooth && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <ModernCard>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl">
                    <Building className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Location</h3>
                    <p className="text-sm text-gray-600">
                      Survey will be linked to this booth
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                    Selected location
                  </p>
                  <p className="text-gray-800 font-medium">
                    {prefillBoothDetails.districtName || "—"} →{" "}
                    {prefillBoothDetails.assemblyName || "—"} →{" "}
                    {prefillBoothDetails.boothName || prefillBoothDetails.PS_Name || "—"}
                    {(prefillBoothDetails.boothNo || prefillBoothDetails.PS_No) != null && (
                      <span className="text-gray-600 font-normal">
                        {" "}
                        (PS No: {prefillBoothDetails.boothNo || prefillBoothDetails.PS_No})
                      </span>
                    )}
                  </p>
                </div>
              </ModernCard>
            </motion.div>
          )}

          {!hideLocationSelector && (
            <div className="space-y-4">
              {/* SUPER ADMIN: Full hierarchy */}
              {role === "superadmin" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* District */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      District *
                    </Label>
                    <AntSelect
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        (option?.children?.toString() ?? "")
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      value={selectedDistrict || undefined}
                      onChange={setSelectedDistrict}
                      disabled={
                        !!boothIdFromUrl ||
                        role === "district" ||
                        role === "assembly"
                      }
                      placeholder="Select district"
                      className="w-full rounded-xl [&_.ant-select-selector]:rounded-xl [&_.ant-select-selector]:h-11 [&_.ant-select-selection-item]:leading-[42px] [&_.ant-select-selection-placeholder]:leading-[42px]"
                    >
                      {districts.map((dist) => (
                        <AntSelect.Option key={dist.id} value={dist.id}>
                          {dist.name}
                        </AntSelect.Option>
                      ))}
                    </AntSelect>
                  </div>

                  {/* Assembly */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Assembly (LAC) *
                    </Label>
                    <AntSelect
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        (option?.children?.toString() ?? "")
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      value={selectedAssembly || undefined}
                      onChange={setSelectedAssembly}
                      disabled={
                        !!boothIdFromUrl ||
                        !selectedDistrict ||
                        role === "assembly"
                      }
                      placeholder={
                        selectedDistrict
                          ? "Select assembly"
                          : "Select district first"
                      }
                      className="w-full rounded-xl [&_.ant-select-selector]:rounded-xl [&_.ant-select-selector]:h-11 [&_.ant-select-selection-item]:leading-[42px] [&_.ant-select-selection-placeholder]:leading-[42px]"
                    >
                      {assemblies.map((asm) => (
                        <AntSelect.Option key={asm.id} value={asm.id}>
                          {asm.name}
                        </AntSelect.Option>
                      ))}
                    </AntSelect>
                  </div>

                  {/* Booth */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Booth *
                    </Label>
                    <AntSelect
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        (option?.children?.toString() ?? "")
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      value={selectedBooth || undefined}
                      onChange={setSelectedBooth}
                      disabled={!!boothIdFromUrl || !selectedAssembly}
                      placeholder={
                        selectedAssembly
                          ? "Select booth"
                          : "Select assembly first"
                      }
                      className="w-full rounded-xl [&_.ant-select-selector]:rounded-xl [&_.ant-select-selector]:h-11 [&_.ant-select-selection-item]:leading-[42px] [&_.ant-select-selection-placeholder]:leading-[42px]"
                    >
                      {booths.map((booth) => (
                        <AntSelect.Option
                          key={booth.documentId}
                          value={booth.documentId}
                        >
                          {booth.PS_Name} (PS No: {booth.PS_No})
                        </AntSelect.Option>
                      ))}
                    </AntSelect>
                  </div>
                </div>
              )}

              {/* DISTRICT COORDINATOR: Skip district, show assemblies under their district */}
              {role === "district" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Hidden district - auto-set */}
                  <input
                    type="hidden"
                    name="district"
                    value={districtId || selectedDistrict}
                  />

                  {/* Assembly (filtered to user's district) */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Assembly (LAC) *
                      <span className="text-xs text-gray-500 ml-1">
                        (
                        {
                          districts.find(
                            (d) => d.id === (districtId || selectedDistrict),
                          )?.name
                        }
                        )
                      </span>
                    </Label>
                    <AntSelect
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        (option?.children?.toString() ?? "")
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      value={selectedAssembly || undefined}
                      onChange={setSelectedAssembly}
                      placeholder="Select assembly"
                      className="w-full rounded-xl [&_.ant-select-selector]:rounded-xl [&_.ant-select-selector]:h-11 [&_.ant-select-selection-item]:leading-[42px] [&_.ant-select-selection-placeholder]:leading-[42px]"
                    >
                      {assemblies.map((asm) => (
                        <AntSelect.Option key={asm.id} value={asm.id}>
                          {asm.name}
                        </AntSelect.Option>
                      ))}
                    </AntSelect>
                  </div>

                  {/* Booth */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Booth *
                    </Label>
                    <AntSelect
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        (option?.children?.toString() ?? "")
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      value={selectedBooth || undefined}
                      onChange={setSelectedBooth}
                      disabled={!selectedAssembly}
                      placeholder={
                        selectedAssembly
                          ? "Select booth"
                          : "Select assembly first"
                      }
                      className="w-full rounded-xl [&_.ant-select-selector]:rounded-xl [&_.ant-select-selector]:h-11 [&_.ant-select-selection-item]:leading-[42px] [&_.ant-select-selection-placeholder]:leading-[42px]"
                    >
                      {booths.map((booth) => (
                        <AntSelect.Option
                          key={booth.documentId}
                          value={booth.documentId}
                        >
                          {booth.PS_Name} (PS No: {booth.PS_No})
                        </AntSelect.Option>
                      ))}
                    </AntSelect>
                  </div>
                </div>
              )}

              {/* ASSEMBLY COORDINATOR: Only show booths under their assembly */}
              {role === "assembly" && (
                <div className="space-y-2">
                  {/* Hidden district & assembly - auto-set */}
                  <input
                    type="hidden"
                    name="district"
                    value={districtId || selectedDistrict}
                  />
                  <input
                    type="hidden"
                    name="assembly"
                    value={assemblyId || selectedAssembly}
                  />

                  {/* Info banner */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                    <Building className="w-4 h-4 inline mr-1" />
                    <span>
                      Viewing booths for:{" "}
                      <strong>
                        {
                          assemblies.find(
                            (a) =>
                              a.id === assemblyId || a.id === selectedAssembly,
                          )?.name
                        }
                      </strong>
                    </span>
                  </div>

                  {/* Booth (filtered to user's assembly) */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Booth (Polling Station) *
                    </Label>
                    <AntSelect
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        (option?.children?.toString() ?? "")
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      value={selectedBooth || undefined}
                      onChange={setSelectedBooth}
                      placeholder="Select booth"
                      className="w-full rounded-xl [&_.ant-select-selector]:rounded-xl [&_.ant-select-selector]:h-11 [&_.ant-select-selection-item]:leading-[42px] [&_.ant-select-selection-placeholder]:leading-[42px]"
                    >
                      {booths.map((booth) => (
                        <AntSelect.Option
                          key={booth.documentId}
                          value={booth.documentId}
                        >
                          {booth.PS_Name} (PS No: {booth.PS_No})
                        </AntSelect.Option>
                      ))}
                    </AntSelect>
                  </div>
                </div>
              )}

              {/* FALLBACK: Unknown role or loading */}
              {/* {!role || roleLoading ? (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="w-5 h-5 animate-spin text-gray-400 mr-2" />
                <span className="text-gray-500">Loading permissions...</span>
              </div>
            ) : (
              <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
                ⚠️ Your role ({role}) doesn't have survey permissions.
                Contact admin.
              </div>
            )} */}
            </div>
          )}

          {/* Survey details – same fields as view/edit */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <ModernCard>
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-[#3A8DFF] to-[#2196F3]  text-white rounded-2xl">
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
                        const slotLabel = index === 0 ? "SIM 1" : "SIM 2";
                        const displayLabel = sim.carrier_info
                          ? `${slotLabel} (${sim.carrier_info})`
                          : (sim.provider && sim.provider !== "sim1" && sim.provider !== "sim2" && sim.provider !== "SIM 1" && sim.provider !== "SIM 2") 
                              ? `${slotLabel} (${sim.provider})` 
                              : slotLabel;

                        const hasExistingData = (sim.download_speed > 0 || sim.upload_speed > 0);
                        return (
                          <div
                            key={index} // Changed key from sim.provider to index because provider changes
                            className="rounded-lg border p-3 bg-white"
                          >
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-semibold">{displayLabel}</h4>
                            </div>
                            
                            {/* {hasExistingData && (
                                <div className="mb-3 space-y-1 bg-gray-50 border border-gray-200 rounded p-3">
                                  <p className="text-xs text-green-600 font-medium mb-2">Saved Test Results</p>
                                  <p className="text-sm">Download: <strong>{sim.download_speed}</strong> Mbps</p>
                                  <p className="text-sm">Upload: <strong>{sim.upload_speed}</strong> Mbps</p>
                                  <p className="text-sm">Latency: <strong>{sim.latency}</strong> ms</p>
                                  {sim.carrier_info && <p className="text-xs text-gray-600 mt-1">Provider: {sim.carrier_info}</p>}
                                </div>
                            )} */}

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
