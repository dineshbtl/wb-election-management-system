"use client";

import React, { useEffect, useState } from "react";
import { Button, Input, Select, message, Table, Spin, Modal } from "antd";
import { UploadOutlined, PlusOutlined } from "@ant-design/icons";
import { X } from "lucide-react";
import dayjs from "dayjs";
import bpi from "@/lib/bpi"; // your axios instance
import { useToast } from "@/hooks/use-toast";

export default function DistrictDispatchPage() {
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Replace this with the logged-in coordinator's district
  const coordinatorDistrictId = "district_hyd"; // documentId from Strapi

  const [form, setForm] = useState({
    Material_Name: "",
    Quantity: "",
    To_Assembly: "",
    Dispatched_By: "District Coordinator",
    Remarks: "",
    State: "Pending",
    Photo: null as File | null,
  });

  const { toast } = useToast();

  // 🧩 Fetch Assemblies under this district
  const fetchAssemblies = async () => {
    try {
      const res = await bpi.get(
        `/assemblies?filters[district][documentId][$eq]=${coordinatorDistrictId}`
      );
      setAssemblies(res.data.data);
    } catch (err) {
      console.error("Error fetching assemblies:", err);
      message.error("Failed to fetch assemblies.");
    }
  };

  // 🧾 Fetch previous dispatch records
  const fetchDispatches = async () => {
    try {
      const res = await bpi.get(
        `/dispatches?filters[from_district][documentId][$eq]=${coordinatorDistrictId}&populate=to_assembly,Photo`
      );
      setDispatches(res.data.data || []);
    } catch (err) {
      console.error("Error fetching dispatches:", err);
      message.error("Failed to fetch dispatch records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssemblies();
    fetchDispatches();
  }, []);

  // 📤 Handle form submit
  const handleSubmit = async () => {
    if (!form.Material_Name || !form.Quantity || !form.To_Assembly) {
      message.warning("Please fill all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1️⃣ Upload photo if exists
      let uploadedPhotoId = null;
      if (form.Photo) {
        const formData = new FormData();
        formData.append("files", form.Photo);
        const uploadRes = await bpi.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        uploadedPhotoId = uploadRes.data[0]?.id;
      }

      // 2️⃣ Post dispatch data
      await bpi.post("/dispatches", {
        data: {
          From_Level: "District",
          To_Level: "Assembly",
          from_district: coordinatorDistrictId,
          to_assembly: form.To_Assembly,
          Material_Name: form.Material_Name,
          Quantity: parseInt(form.Quantity),
          Dispatched_By: form.Dispatched_By,
          State: form.State,
          Remarks: form.Remarks,
          Dispatched_On: new Date(),
          Photo: uploadedPhotoId,
        },
      });

      toast({
        variant: "success",
        title: "Dispatch Created",
        description: "Material dispatched successfully.",
      });

      setIsModalOpen(false);
      setForm({
        Material_Name: "",
        Quantity: "",
        To_Assembly: "",
        Dispatched_By: "District Coordinator",
        Remarks: "",
        State: "Pending",
        Photo: null,
      });
      fetchDispatches();
    } catch (err) {
      console.error("Dispatch error:", err);
      message.error("Failed to record dispatch.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto bg-white p-6 shadow-lg rounded-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            District Material Dispatch
          </h2>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
          >
            New Dispatch
          </Button>
        </div>

        {/* Dispatch Table */}
        <div className="overflow-x-auto">
          <Table
            dataSource={dispatches}
            rowKey="id"
            pagination={{ pageSize: 8 }}
            columns={[
              {
                title: "Assembly",
                dataIndex: ["to_assembly", "Assembly_Name"],
                key: "assembly",
              },
              {
                title: "Material",
                dataIndex: "Material_Name",
                key: "material",
              },
              {
                title: "Qty",
                dataIndex: "Quantity",
                key: "qty",
              },
              {
                title: "Status",
                dataIndex: "State",
                key: "state",
                render: (val) => (
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      val === "Delivered"
                        ? "bg-green-100 text-green-700"
                        : val === "Returned"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {val}
                  </span>
                ),
              },
              {
                title: "Date",
                dataIndex: "Dispatched_On",
                render: (date) =>
                  date ? dayjs(date).format("DD MMM YYYY") : "Not Available",
              },
              {
                title: "Remarks",
                dataIndex: "Remarks",
              },
              {
                title: "Photo",
                dataIndex: "Photo",
                render: (photo) =>
                  photo?.url ? (
                    <img
                      src={
                        photo.url.startsWith("http")
                          ? photo.url
                          : `http://YOUR_BACKEND_DOMAIN${photo.url}`
                      }
                      alt="Dispatch"
                      className="w-16 h-16 object-cover rounded-md"
                    />
                  ) : (
                    "—"
                  ),
              },
            ]}
          />
        </div>
      </div>

      {/* Modal Form */}
      <Modal
        title="Dispatch Material to Assembly"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        centered
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Select Assembly
            </label>
            <Select
              placeholder="Choose Assembly"
              style={{ width: "100%" }}
              value={form.To_Assembly}
              onChange={(val) => setForm({ ...form, To_Assembly: val })}
            >
              {assemblies.map((a) => (
                <Select.Option key={a.documentId} value={a.documentId}>
                  {a.Assembly_Name}
                </Select.Option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Material Name
            </label>
            <Input
              placeholder="Enter material name"
              value={form.Material_Name}
              onChange={(e) =>
                setForm({ ...form, Material_Name: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Quantity</label>
            <Input
              type="number"
              placeholder="Enter quantity"
              value={form.Quantity}
              onChange={(e) => setForm({ ...form, Quantity: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Remarks</label>
            <Input.TextArea
              rows={2}
              value={form.Remarks}
              onChange={(e) => setForm({ ...form, Remarks: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Upload Photo
            </label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setForm({
                  ...form,
                  Photo: e.target.files?.[0] || null,
                })
              }
            />
            {form.Photo && (
              <div className="mt-2 relative w-24 h-24">
                <img
                  src={URL.createObjectURL(form.Photo)}
                  alt="preview"
                  className="w-full h-full object-cover rounded border"
                />
                <button
                  className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                  onClick={() => setForm({ ...form, Photo: null })}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              onClick={handleSubmit}
              loading={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Dispatch"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
