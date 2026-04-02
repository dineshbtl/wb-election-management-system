"use client";

import { Modal, Button, Spin, message } from "antd";
import api from "@/lib/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useEffect, useState } from "react";

export default function DownloadTemplateModal({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const [fields, setFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const res = await api.get(
          `/projects?filters[documentId][$eq]=${projectId}&populate=*`
        );
        const project = res.data?.data?.[0];
        const extra = project?.site_field_template || [];
        const allFields = [
          "name",
          "address",
          "latitude",
          "longitude",
          ...extra.map((f: any) => f.name),
        ];
        setFields(allFields);
      } catch (err) {
        message.error("Failed to load field template");
      } finally {
        setLoading(false);
      }
    };
    fetchFields();
  }, [projectId]);

  const handleDownload = () => {
    const data = [fields.reduce((acc: any, f) => ({ ...acc, [f]: "" }), {})];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sites Template");
    const blob = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([blob]), `Project_Site_Template.xlsx`);
    message.success("✅ Template downloaded");
    onClose();
  };

  return (
    <Modal
      open
      title="⬇ Download Site Template"
      onCancel={onClose}
      footer={null}
      centered
    >
      {loading ? (
        <div className="flex justify-center py-6">
          <Spin size="large" />
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-gray-600">
            The Excel file will contain the following columns:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-700">
            {fields.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={onClose}>Cancel</Button>
            <Button
              type="primary"
              className="bg-blue-600"
              onClick={handleDownload}
            >
              Download Template
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
