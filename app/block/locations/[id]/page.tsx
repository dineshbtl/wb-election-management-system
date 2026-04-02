"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ClipboardList, FileText, X, Wrench } from "lucide-react";
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

export default function LocationDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [location, setLocation] = useState<any>(null);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [user, setUser] = useState<any>(null);

  const [isBoqModalOpen, setIsBoqModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      const res = await api.get("/users/me?populate=profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

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
        )}?populate[assembly][populate][district]=true&populate=boqs&populate=cameras`,
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
      // filter by the actual relation field name (lowercase 'booth') and encode id
      const res = await bpi.get(
        `/surveys?filters[booth][documentId][$eq]=${encodeURIComponent(
          id,
        )}&populate=raised_by`,
      );
      setSurveys(res.data.data);
    } catch (err) {
      console.error("Error fetching surveys:", err);
    }
  };

  // single useEffect — fetch location, surveys, boqs, and user once
  useEffect(() => {
    if (!id) return;

    setLoadingInitial(true);
    // Don't await - let it load in background
    const loadData = async () => {
      try {
        await Promise.all([
          fetchCurrentUser(),
          fetchLocation(),
          fetchSurveys(),
          fetchBoqs(),
        ]);
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

  if (loadingInitial)
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-6">
        <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-2xl p-8">
          <Skeleton active paragraph={{ rows: 2 }} className="mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} active paragraph={{ rows: 1 }} />
            ))}
          </div>
          <Skeleton active paragraph={{ rows: 3 }} className="mt-10 mb-6" />
          <Skeleton active paragraph={{ rows: 5 }} />
        </div>
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
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-2xl p-8">
        {/* Back Button */}
        <div className="flex items-center space-x-2 mb-6">
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
            <p>{assembly?.State || "—"}</p>
          </div>
        </div>

        {/* 🏛️ Assembly Details */}
        <div className="mt-10">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Assembly (LAC) Details
          </h3>

          {assembly ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-gray-800">
              <div>
                <p className="font-semibold">Assembly No:</p>
                <p>{assembly.Assembly_No || "—"}</p>
              </div>
              <div>
                <p className="font-semibold">Assembly Name:</p>
                <p>{assembly.Assembly_Name || "—"}</p>
              </div>
              {/* <div>
                <p className="font-semibold">Election District:</p>
                <p>{assembly.Election_District || "—"}</p>
              </div> */}
              <div>
                <p className="font-semibold">State:</p>
                <p>{assembly.State || "—"}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 italic">
              No assembly information available.
            </p>
          )}
        </div>

        {/* 🎥 Camera Details */}
        {/* 🎥 Camera Details */}
        <div className="mt-10">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Camera Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-gray-800">
            {/* IN Camera */}
            {cameras.some((cam) => cam.Position === "IN") ? (
              cameras
                .filter((cam) => cam.Position === "IN")
                .map((cam) => (
                  <div
                    key={cam.id}
                    className="border rounded-lg p-3 shadow-sm bg-gray-50"
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
              <p className="text-gray-500 italic">No IN Camera assigned yet.</p>
            )}

            {/* OUT Camera */}
            {cameras.some((cam) => cam.Position === "OUT") ? (
              cameras
                .filter((cam) => cam.Position === "OUT")
                .map((cam) => (
                  <div
                    key={cam.id}
                    className="border rounded-lg p-3 shadow-sm bg-gray-50"
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
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap gap-4 mt-10">
          {!hasSurvey && id && (
            <Button
              onClick={() =>
                router.push(
                  `/surveys/new?boothId=${encodeURIComponent(String(id))}`,
                )
              }
              className="bg-blue-500 hover:bg-blue-600 text-white flex items-center space-x-2"
            >
              <ClipboardList className="w-4 h-4" />
              <span>Raise Survey</span>
            </Button>
          )}

          <Button
            onClick={() => setIsBoqModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white flex items-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span>Raise BOQ</span>
          </Button>

          {!allCamerasInstalled && (
            <Button
              onClick={() => setIsCameraModalOpen(true)}
              className="bg-green-500 hover:bg-green-600 text-white flex items-center space-x-2"
            >
              <Wrench className="w-4 h-4" />
              <span>Assign Camera</span>
            </Button>
          )}
        </div>

        {/* 🧾 Survey Details */}
        <div className="mt-10">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Survey Details
          </h3>
          {surveys.length === 0 ? (
            <p className="text-gray-500 italic">
              No surveys raised yet for this location.
            </p>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-blue-100 text-gray-800 font-semibold text-left">
                    <th className="px-4 py-2">#</th>
                    <th className="px-4 py-2">Survey Date</th>
                    <th className="px-4 py-2">Condition</th>
                    <th className="px-4 py-2">Power</th>
                    <th className="px-4 py-2">Network</th>
                    <th className="px-4 py-2">Airtel Signal</th>
                    <th className="px-4 py-2">Jio Signal</th>
                    <th className="px-4 py-2">Remarks</th>
                    <th className="px-4 py-2">Raised By</th>
                  </tr>
                </thead>
                <tbody>
                  {surveys.map((s, i) => (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">{i + 1}</td>
                      <td className="px-4 py-2">
                        {new Date(s.survey_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2">{s.site_condition}</td>
                      <td className="px-4 py-2">
                        {s.Power_Available ? "Yes" : "No"}
                      </td>
                      <td className="px-4 py-2">
                        {s.Network_Available ? "Yes" : "No"}
                      </td>
                      <td className="px-4 py-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`inline-block w-3 h-3 rounded-full mr-1 ${
                              i <= s.airtel_signal
                                ? "bg-green-500"
                                : "bg-gray-300"
                            }`}
                          />
                        ))}
                      </td>
                      <td className="px-4 py-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`inline-block w-3 h-3 rounded-full mr-1 ${
                              i <= s.jio_signal ? "bg-green-500" : "bg-gray-300"
                            }`}
                          />
                        ))}
                      </td>

                      <td className="px-4 py-2">{s.Remarks}</td>
                      <td className="px-4 py-2">
                        {s.raised_by?.username || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 🧰 BOQ Details */}
        {/* 🧰 BOQ Details */}
        <div className="mt-10">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            BOQ Details
          </h3>

          {boqs.length === 0 ? (
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
                        <tr className="bg-amber-100 text-gray-800 font-semibold text-left">
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
              onClick={handleBoqSubmit}
              className="bg-amber-500 hover:bg-amber-600 text-white"
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
              onClick={handleCameraSubmit}
              className="bg-green-500 hover:bg-green-600 text-white"
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
