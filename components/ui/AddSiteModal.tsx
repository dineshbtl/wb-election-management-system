"use client";

import { useEffect, useState } from "react";
import { Modal, Input, Button, Form, message, Spin } from "antd";
import api from "@/lib/api";

interface AddSiteModalProps {
  projectId: string; // documentId of the project
  onClose: () => void;
}

interface ExtraField {
  name: string;
  label: string;
  type: string; // "text", "number", "date", etc.
}

export default function AddSiteModal({
  projectId,
  onClose,
}: AddSiteModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extraFields, setExtraFields] = useState<ExtraField[]>([]);

  // 🧩 Load project to get site_field_template
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await api.get(
          `/projects?filters[documentId][$eq]=${projectId}&populate=*`
        );
        const project = res.data?.data?.[0];
        const fields = project?.site_field_template || [];
        setExtraFields(fields);
      } catch (err) {
        console.error("❌ Failed to load project:", err);
        message.error("Failed to load site field template");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  // 🧩 Handle save site
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      // Prepare site payload
      const payload = {
        data: {
          name: values.name,
          address: values.address,
          latitude: values.latitude,
          longitude: values.longitude,
          extra_fields: extraFields.reduce((acc: any, field: ExtraField) => {
            acc[field.label || field.name] = values[field.name];
            return acc;
          }, {}),
          project: {
            connect: [
              {
                documentId: projectId, // connect by documentId (✅ works fine)
              },
            ],
          },
        },
      };

      await api.post("/site1s", payload);
      message.success("✅ Site added successfully!");
      onClose();
    } catch (err: any) {
      console.error("❌ Error adding site:", err);
      message.error(
        `Failed to save site: ${
          err.response?.data?.error?.message || err.message
        }`
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title="➕ Add New Site"
      onCancel={onClose}
      footer={null}
      width={600}
      centered
    >
      {loading ? (
        <div className="flex justify-center py-6">
          <Spin size="large" />
        </div>
      ) : (
        <Form
          form={form}
          layout="vertical"
          className="space-y-2"
          initialValues={{ latitude: "", longitude: "" }}
        >
          {/* Common Fields */}
          <Form.Item
            label="Site Name"
            name="name"
            rules={[{ required: true, message: "Please enter site name" }]}
          >
            <Input placeholder="Enter site name" />
          </Form.Item>

          <Form.Item label="Address" name="address">
            <Input.TextArea rows={2} placeholder="Enter site address" />
          </Form.Item>

          {/* Latitude & Longitude with Get Location Button */}
          <div className="grid grid-cols-2 gap-2 items-end">
            <Form.Item label="Latitude" name="latitude">
              <Input placeholder="Enter latitude" />
            </Form.Item>

            <Form.Item label="Longitude" name="longitude">
              <Input placeholder="Enter longitude" />
            </Form.Item>

            {/* Get Current Location Button */}
            <div className="col-span-2 flex justify-end">
              <Button
                type="dashed"
                icon={<span>📍</span>}
                onClick={() => {
                  if (!navigator.geolocation) {
                    message.error(
                      "Geolocation is not supported by your browser."
                    );
                    return;
                  }

                  message.loading("Fetching current location...", 1);

                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      const { latitude, longitude } = position.coords;
                      form.setFieldsValue({
                        latitude: latitude.toFixed(6),
                        longitude: longitude.toFixed(6),
                      });
                      message.success(
                        "✅ Current location fetched successfully!"
                      );
                    },
                    (error) => {
                      console.error("Location error:", error);
                      message.error("Failed to retrieve current location.");
                    }
                  );
                }}
              >
                Get Current Location
              </Button>
            </div>
          </div>

          {/* Extra Fields from site_field_template */}
          {extraFields.length > 0 && (
            <>
              <h3 className="font-medium text-gray-700 mt-4">
                Extra Fields for this Project
              </h3>
              {extraFields.map((field) => (
                <Form.Item
                  key={field.name}
                  label={field.label || field.name}
                  name={field.name}
                  rules={[
                    {
                      required: false,
                    },
                  ]}
                >
                  <Input
                    type={field.type || "text"}
                    placeholder={`Enter ${field.label || field.name}`}
                  />
                </Form.Item>
              ))}
            </>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={onClose}>Cancel</Button>
            <Button
              type="primary"
              loading={saving}
              className="bg-blue-600"
              onClick={handleSave}
            >
              Save Site
            </Button>
          </div>
        </Form>
      )}
    </Modal>
  );
}
