"use client";

import { useState, useEffect } from "react";
import { Modal, Input, Button, Select, message } from "antd";
import api from "@/lib/api";

const { Option } = Select;

export default function AssignSiteModal({ projectId, onClose }: any) {
  const [fields, setFields] = useState<any[]>([]);
  const [newField, setNewField] = useState({
    name: "",
    label: "",
    type: "text",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const res = await api.get(
          `/projects?filters[documentId][$eq]=${projectId}&populate=*`
        );
        const project = res.data?.data?.[0];
        setFields(project?.site_field_template || []);
      } catch {
        message.error("Failed to load existing site fields");
      }
    };
    fetchTemplate();
  }, [projectId]);

  const addField = () => {
    if (!newField.name || !newField.label) {
      message.warning("Please fill all field details");
      return;
    }
    setFields([...fields, newField]);
    setNewField({ name: "", label: "", type: "text" });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/projects/${projectId}`, {
        data: {
          site_field_template: fields,
        },
      });
      message.success("✅ Site fields saved for this project!");
      onClose();
    } catch (err) {
      console.error(err);
      message.error("Failed to save site fields");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title="Define Site Fields for Project"
      onCancel={onClose}
      footer={null}
      centered
      width={700}
    >
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Common Fields</h3>
        <p className="text-gray-500">
          Every site automatically includes: <br />
          <strong>name, address, latitude, longitude</strong>
        </p>

        <h3 className="text-lg font-medium mt-4">Extra Fields</h3>
        {fields.length > 0 ? (
          <ul className="list-disc list-inside text-sm text-gray-700 mb-3">
            {fields.map((f, i) => (
              <li key={i}>
                {f.label} ({f.type})
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">No extra fields yet.</p>
        )}

        <div className="grid grid-cols-3 gap-2">
          <Input
            placeholder="Field name (e.g. division)"
            value={newField.name}
            onChange={(e) => setNewField({ ...newField, name: e.target.value })}
          />
          <Input
            placeholder="Field label (e.g. Division)"
            value={newField.label}
            onChange={(e) =>
              setNewField({ ...newField, label: e.target.value })
            }
          />
          <Select
            value={newField.type}
            onChange={(val) => setNewField({ ...newField, type: val })}
          >
            <Option value="text">Text</Option>
            <Option value="textarea">Textarea</Option>
            <Option value="number">Number</Option>
          </Select>
        </div>

        <div className="flex justify-end mt-2">
          <Button onClick={addField}>+ Add Field</Button>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" onClick={handleSave} loading={saving}>
            Save Template
          </Button>
        </div>
      </div>
    </Modal>
  );
}
