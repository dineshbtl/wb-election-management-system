"use client";

import { Modal, Switch, Select, Input, message } from "antd";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import dayjs from "dayjs";
import { useState } from "react";
import api from "@/lib/api";
import NetworkSignalTest from "./NetworkSignalTest";
import SpeedTest from "./Speedtest";
import SpeedTestSimple from "./SpeedtestSimple";
import SpeedTestWithStrapi from "./Speedtestwithdocker";
import PublicNetworkSpeedTest from "./Network1";
import Network2 from "./Network2";

interface SurveyPhoto {
  file: File | null;
  title: string;
  description: string;
}

interface Props {
  open: boolean;
  boothDocumentId: string;
  onClose: () => void;
  onSuccess?: () => void;
  userId?: string;
}

export default function SurveyModal({
  open,
  boothDocumentId,
  onClose,
  onSuccess,
  userId,
}: Props) {
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    Power_Available: false,
    Socket_Working: false, // ✅ ADD THIS

    Network_Available: false,
    site_condition: "Good",
    site_description: "",
    GPS_Latitude: "",
    GPS_Longitude: "",
    Remarks: "",
    airtel_signal: 0,
    jio_signal: 0,
    survey_photo: [{ file: null, title: "", description: "" }] as SurveyPhoto[],
  });

  /* 📍 GPS */
  const getCurrentGPS = () => {
    if (!navigator.geolocation) {
      message.error("Your browser does not support GPS");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((p) => ({
          ...p,
          GPS_Latitude: pos.coords.latitude.toFixed(6),
          GPS_Longitude: pos.coords.longitude.toFixed(6),
        }));
        message.success("GPS fetched successfully");
      },
      () => message.error("Failed to fetch GPS"),
    );
  };

  /* 📸 Photo helpers */
  const addPhoto = () =>
    setForm((p) => ({
      ...p,
      survey_photo: [
        ...p.survey_photo,
        { file: null, title: "", description: "" },
      ],
    }));

  const updatePhoto = (index: number, field: keyof SurveyPhoto, value: any) => {
    setForm((p) => {
      const updated = [...p.survey_photo];
      updated[index] = { ...updated[index], [field]: value };
      return { ...p, survey_photo: updated };
    });
  };

  const removePhoto = (index: number) => {
    if (form.survey_photo.length <= 1) return;
    setForm((p) => ({
      ...p,
      survey_photo: p.survey_photo.filter((_, i) => i !== index),
    }));
  };

  /* 🚀 Submit Survey */
  const handleSubmit = async () => {
    // Validate photos
    const validPhotos = form.survey_photo.filter(
      (p) => p.file && p.title.trim(),
    );

    if (validPhotos.length === 0) {
      message.warning("At least one photo with a title is required");
      return;
    }

    setSubmitting(true);
    try {
      /* 1️⃣ Upload images */
      const fd = new FormData();
      validPhotos.forEach((p) => fd.append("files", p.file!));

      const uploadRes = await api.post("/upload", fd);
      const uploadedIds = uploadRes.data.map((img: any) => img.id);

      /* 2️⃣ Build Strapi component payload */
      const surveyPhotoPayload = validPhotos.map((p, i) => ({
        title: p.title,
        description: p.description,
        image: uploadedIds[i],
      }));

      /* 3️⃣ Submit survey */
      await api.post("/surveys", {
        data: {
          booth: boothDocumentId,
          Power_Available: form.Power_Available,
          Socket_Working: form.Socket_Working,
          Network_Available: form.Network_Available,
          site_condition: form.site_condition,
          site_description: form.site_description,
          GPS_Latitude: parseFloat(form.GPS_Latitude) || null,
          GPS_Longitude: parseFloat(form.GPS_Longitude) || null,
          survey_date: dayjs().toISOString(), // ✅ AUTO
          Remarks: form.Remarks,
          airtel_signal: form.airtel_signal,
          jio_signal: form.jio_signal,
          survey_photo: surveyPhotoPayload,
          raised_by: userId,
          state: "Raised",
        },
      });

      await api.put(`/locations/${boothDocumentId}`, {
        data: { Survey_Status: "Raised" },
      });

      message.success("Survey raised successfully");
      onClose();
      onSuccess?.();
    } catch (err) {
      console.error(err);
      message.error("Failed to raise survey");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Raise Survey"
      open={open}
      onCancel={onClose}
      footer={null}
      centered
    >
      <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
        {/* Power */}
        <div className="flex justify-between">
          <span>Power Available</span>
          <Switch
            checked={form.Power_Available}
            onChange={(v) =>
              setForm({
                ...form,
                Power_Available: v,
                Socket_Working: v ? form.Socket_Working : false, // reset if power off
              })
            }
          />
        </div>

        {form.Power_Available && (
          <div className="flex justify-between items-center border rounded px-3 py-2 bg-yellow-50">
            <span>Socket Working</span>
            <Switch
              checked={form.Socket_Working}
              onChange={(v) =>
                setForm({
                  ...form,
                  Socket_Working: v,
                })
              }
            />
          </div>
        )}

        {/* Network */}
        <div className="flex justify-between">
          <span>Network Available</span>
          <Switch
            checked={form.Network_Available}
            onChange={(v) => setForm({ ...form, Network_Available: v })}
          />
        </div>

        {/* Site condition */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Site Condition
          </label>
          <Select
            value={form.site_condition}
            style={{ width: "100%" }}
            onChange={(v) => setForm({ ...form, site_condition: v })}
          >
            <Select.Option value="Good">Good</Select.Option>
            <Select.Option value="Average">Average</Select.Option>
            <Select.Option value="Poor">Poor</Select.Option>
          </Select>
        </div>

        {/* Site Description */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Description of Site
          </label>
          <Input.TextArea
            rows={3}
            value={form.site_description}
            onChange={(e) =>
              setForm({ ...form, site_description: e.target.value })
            }
            placeholder="Describe the condition of the site"
          />
        </div>

        {/* Signal strength */}
        <div>
          <label className="block text-sm font-medium mb-2">
            📶 Mobile Network Signal Strength
          </label>
          {["airtel", "jio"].map((net) => (
            <div
              key={net}
              className="flex justify-between items-center border rounded px-3 py-2 mb-2"
            >
              <span className="capitalize">{net}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <div
                    key={lvl}
                    onClick={() =>
                      setForm({
                        ...form,
                        [`${net}_signal`]: lvl,
                      } as any)
                    }
                    className={`w-4 h-4 cursor-pointer rounded ${
                      lvl <= (form as any)[`${net}_signal`]
                        ? "bg-green-500"
                        : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* GPS */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="Latitude"
            value={form.GPS_Latitude}
            onChange={(e) => setForm({ ...form, GPS_Latitude: e.target.value })}
          />
          <Input
            placeholder="Longitude"
            value={form.GPS_Longitude}
            onChange={(e) =>
              setForm({ ...form, GPS_Longitude: e.target.value })
            }
          />
        </div>

        <div className="flex justify-end">
          <Button
            size="sm"
            className="bg-green-500 text-white"
            onClick={getCurrentGPS}
          >
            Get Current Location
          </Button>
        </div>

        {/* Photos */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Photo Documentation
          </label>

          {form.survey_photo.map((p, i) => (
            <div key={i} className="border rounded p-3 mb-3 bg-gray-50">
              <div className="flex justify-between mb-2">
                <span>Photo {i + 1}</span>
                {i > 0 && (
                  <X
                    className="w-4 h-4 text-red-500 cursor-pointer"
                    onClick={() => removePhoto(i)}
                  />
                )}
              </div>

              <Input
                placeholder="Title (required)"
                value={p.title}
                onChange={(e) => updatePhoto(i, "title", e.target.value)}
                className="mb-2"
              />

              <Input
                placeholder="Description (optional)"
                value={p.description}
                onChange={(e) => updatePhoto(i, "description", e.target.value)}
                className="mb-2"
              />

              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  updatePhoto(i, "file", e.target.files?.[0] || null)
                }
              />

              {p.file && (
                <img
                  src={URL.createObjectURL(p.file)}
                  className="mt-2 w-24 h-24 object-cover rounded border"
                />
              )}
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={addPhoto}
          >
            <Plus className="w-4 h-4 mr-1" /> Add Photo
          </Button>
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-sm font-medium mb-1">Remarks</label>
          <Input.TextArea
            rows={3}
            value={form.Remarks}
            onChange={(e) => setForm({ ...form, Remarks: e.target.value })}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onClose}>
          <X className="w-4 h-4" /> Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] hover:from-[#2d7ae8] hover:to-[#1976D2] text-white border-0"
        >
          {submitting ? "Submitting..." : "Submit Survey"}
        </Button>
      </div>
    </Modal>
  );
}
