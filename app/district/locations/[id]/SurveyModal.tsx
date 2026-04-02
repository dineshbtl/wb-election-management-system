"use client";

import { Modal, Switch, Select, Input, message } from "antd";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import dayjs from "dayjs";
import { useState } from "react";
import api from "@/lib/api";

interface Props {
  open: boolean;
  boothDocumentId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SurveyModal({
  open,
  boothDocumentId,
  onClose,
  onSuccess,
}: Props) {
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    Power_Available: false,
    Network_Available: false,
    site_condition: "Good",
    GPS_Latitude: "",
    GPS_Longitude: "",
    Remarks: "",
    survey_date: dayjs(),
    photos: [] as File[],
    airtel_signal: 0,
    jio_signal: 0,
  });

  // 📍 GPS
  const getCurrentGPS = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm({
          ...form,
          GPS_Latitude: pos.coords.latitude.toFixed(6),
          GPS_Longitude: pos.coords.longitude.toFixed(6),
        });
      },
      () => message.error("Failed to get GPS"),
    );
  };

  // 🚀 Submit
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      let uploadedPhotoIds: number[] = [];

      if (form.photos.length) {
        const fd = new FormData();
        form.photos.forEach((f) => fd.append("files", f));

        const uploadRes = await api.post("/upload", fd);
        uploadedPhotoIds = uploadRes.data.map((i: any) => i.id);
      }

      await api.post("/surveys", {
        data: {
          booth: boothDocumentId,
          Power_Available: form.Power_Available,
          Network_Available: form.Network_Available,
          site_condition: form.site_condition,
          GPS_Latitude: parseFloat(form.GPS_Latitude) || null,
          GPS_Longitude: parseFloat(form.GPS_Longitude) || null,
          survey_date: form.survey_date.toISOString(),
          Remarks: form.Remarks,
          Photos: uploadedPhotoIds,
          airtel_signal: form.airtel_signal,
          jio_signal: form.jio_signal,
          state: "Raised",
        },
      });

      message.success("Survey raised successfully");
      onClose();
      onSuccess?.();
    } catch (err) {
      message.error("Failed to raise survey");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      footer={null}
      onCancel={onClose}
      centered
      title="Raise Survey"
    >
      {/* ⬇️ SAME UI YOU ALREADY HAVE ⬇️ */}
      {/* Power, Network, Condition, Signal, GPS, Photos, Remarks */}

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
