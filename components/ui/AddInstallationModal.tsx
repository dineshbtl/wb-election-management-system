"use client";

import { useState } from "react";
import { Modal, Input, DatePicker, Upload, Button, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import api from "@/lib/api";

export default function AddProductInstallationModal({
  boqDocId,
  product,
  userDocId,
  onClose,
  siteDocId,
  projectDocId,
}: any) {
  const [serialNumber, setSerialNumber] = useState("");
  const [installDate, setInstallDate] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleUpload = ({ fileList }: any) => setFiles(fileList);

  const handleSubmit = async () => {
    if (!serialNumber || !installDate) {
      message.warning("Please fill all required fields.");
      return;
    }

    setLoading(true);
    try {
      // Upload files first
      const uploadedFiles: any[] = [];
      for (const f of files) {
        const formData = new FormData();
        formData.append("files", f.originFileObj);
        const res = await api.post("/upload", formData);
        uploadedFiles.push(res.data[0]);
      }

      // Create one installation record
      const payload = {
        data: {
          product_name: product.name,
          group: product.group || "",
          serial_number: serialNumber,
          installation_date: installDate,
          installed_by: { connect: [{ documentId: userDocId }] },
          boq: { connect: [{ documentId: boqDocId }] },
          project: { connect: [{ documentId: projectDocId }] },
          site: { connect: [{ documentId: siteDocId }] },
          installation_images: uploadedFiles.map((f) => f.id),
          state: "Installed",
        },
      };

      await api.post("/installed-products", payload);
      message.success("✅ Installation added successfully!");
      onClose();
    } catch (err) {
      console.error("❌ Installation failed:", err);
      message.error("Failed to save installation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      title={`Install: ${product.name}`}
      onCancel={onClose}
      footer={null}
      centered
      width={600}
    >
      <div className="space-y-4">
        {/* Product Info */}
        <div className="bg-gray-50 p-3 rounded-md border">
          <p>
            <strong>Product:</strong> {product.name}
          </p>
          <p>
            <strong>Group:</strong> {product.group || "—"}
          </p>
          <p>
            <strong>BOQ Qty:</strong> {product.qty || 1}
          </p>
          <p className="text-sm text-gray-500 italic">
            (Add one record per installed unit)
          </p>
        </div>

        {/* Serial Number */}
        <Input
          value={serialNumber}
          onChange={(e) => setSerialNumber(e.target.value)}
          placeholder="Enter Serial Number"
        />

        {/* Install Date */}
        <DatePicker
          style={{ width: "100%" }}
          placeholder="Select Install Date"
          onChange={(date) => setInstallDate(date?.toISOString() || null)}
        />

        {/* Upload Section */}
        <Upload
          multiple
          beforeUpload={() => false}
          fileList={files}
          onChange={handleUpload}
          listType="picture"
        >
          <Button icon={<UploadOutlined />}>Upload Images / Docs</Button>
        </Upload>

        {/* Buttons */}
        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="primary"
            className="bg-blue-600"
            loading={loading}
            onClick={handleSubmit}
          >
            Save Installation
          </Button>
        </div>
      </div>
    </Modal>
  );
}
