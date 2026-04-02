"use client";

import React, { useState } from "react";
import { Modal, Input, Select, Button, message } from "antd";
import { X } from "lucide-react";
import bpi from "@/lib/bpi";

interface Props {
  open: boolean;
  locationDocId: string;
  hasIn: boolean;
  hasOut: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InstallationModal({
  open,
  locationDocId,
  hasIn,
  hasOut,
  onClose,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    Camera_ID: "",
    Position: "Select Camera Position",
    state: "Installed",
    photo: null as File | null,
  });

  const handleSubmit = async () => {
    if (!form.Camera_ID) {
      message.warning("Enter Camera ID");
      return;
    }

    setLoading(true);

    try {
      // Prevent duplicate position
      const existing = await bpi.get(
        `/cameras?filters[assigned_booth][documentId][$eq]=${locationDocId}&filters[Position][$eq]=${form.Position}`,
      );

      if (existing.data?.data?.length > 0) {
        message.error(`${form.Position} camera already installed`);
        setLoading(false);
        return;
      }

      let uploadedPhotoId = null;

      if (form.photo) {
        const fd = new FormData();
        fd.append("files", form.photo);
        const uploadRes = await bpi.post("/upload", fd);
        uploadedPhotoId = uploadRes.data?.[0]?.id;
      }

      await bpi.post("/cameras", {
        data: {
          Camera_ID: form.Camera_ID,
          Position: form.Position,
          state: "Installed",
          assigned_booth: locationDocId,
          Photo: uploadedPhotoId,
        },
      });

      message.success("Installation successful");
      onSuccess();
      onClose();
    } catch (err) {
      message.error("Installation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Raise Installation"
      open={open}
      onCancel={onClose}
      footer={null}
      centered
    >
      <div className="space-y-4">
        <Input
          placeholder="Camera ID"
          value={form.Camera_ID}
          onChange={(e) => setForm({ ...form, Camera_ID: e.target.value })}
        />

        <Select
          style={{ width: "100%" }}
          value={form.Position}
          onChange={(val) => setForm({ ...form, Position: val })}
          placeholder="Select Camera Position"
        >
          {!hasIn && <Select.Option value="IN">IN Camera</Select.Option>}
          {!hasOut && <Select.Option value="OUT">OUT Camera</Select.Option>}
        </Select>

        <input
          type="file"
          accept="image/*"
          onChange={(e) =>
            setForm({ ...form, photo: e.target.files?.[0] || null })
          }
        />

        <Button
          onClick={handleSubmit}
          loading={loading}
          className="bg-green-600 text-white w-full"
        >
          Submit Installation
        </Button>
      </div>
    </Modal>
  );
}
