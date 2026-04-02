"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  InputNumber,
  Button,
  Input,
  Checkbox,
  Select,
  message,
} from "antd";
import api from "@/lib/api";

export default function RaiseBoq({
  project,
  userDocId,
  onClose,
}: {
  project: any;
  userDocId: string;
  onClose: () => void;
}) {
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [boqItems, setBoqItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [remarks, setRemarks] = useState("");

  // 🔹 Load available sites for this project
  useEffect(() => {
    const fetchSites = async () => {
      try {
        const res = await api.get(
          `/site1s?filters[project][id][$eq]=${project.id}`
        );

        setSites(res.data.data || []);
      } catch (err) {
        console.error("❌ Failed to fetch sites:", err);
        message.error("Failed to load project sites.");
      }
    };
    fetchSites();
  }, [project.id]);

  useEffect(() => {
    console.log("project", project);
  }, []);

  // 🔹 Prepare locked products from project.assigned_groups
  useEffect(() => {
    if (project?.assigned_groups) {
      const lockedProducts = project.assigned_groups.flatMap((g: any) =>
        (g.products || []).map((p: any) => {
          const productName = typeof p === "string" ? p : p.name;
          return {
            name: productName,
            group: g.group,
            qty: 1,
            price: typeof p === "object" && p.price ? p.price : 0,
            currency: "INR",
            locked: false,
            selected: false,
          };
        })
      );
      setBoqItems(lockedProducts);
    }
  }, [project]);

  const handleChange = (name: string, field: string, value: any) => {
    setBoqItems((prev) =>
      prev.map((p) => (p.name === name ? { ...p, [field]: value } : p))
    );
  };

  const selectedItems = boqItems.filter((p) => p.selected);
  const totalCost = selectedItems.reduce(
    (sum, p) => sum + (p.qty || 0) * (p.price || 0),
    0
  );

  const handleSubmit = async () => {
    if (!selectedSite) {
      message.warning("Please select a site.");
      return;
    }

    alert(selectedSite);
    if (selectedItems.length === 0) {
      message.warning("Please select at least one product.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        data: {
          project: { connect: [{ documentId: project.documentId }] },
          site_1: { connect: [{ documentId: selectedSite }] },
          raised_by: { connect: [{ documentId: userDocId }] },
          boq_items: selectedItems.map((p) => ({
            name: p.name,
            group: p.group,
            qty: p.qty,
            price: p.price,
            total: (p.qty || 0) * (p.price || 0),
            currency: p.currency || "INR",
            locked: p.locked,
          })),
          total_cost: totalCost,
          remarks,
          state: "Pending Purchase",
        },
      };

      await api.post("/boq1s", payload);
      message.success("✅ BOQ raised successfully!");
      onClose();
    } catch (err: any) {
      console.error("❌ Failed to raise BOQ:", err);
      message.error(
        err.response?.data?.error?.message ||
          err.message ||
          "Failed to raise BOQ"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      title={`🧾 Raise BOQlkjhgf - ${project.project_name}`}
      onCancel={onClose}
      footer={null}
      centered
      width={800}
    >
      {/* Site Selection */}
      <div className="mb-4">
        <label className="block mb-1 font-medium">Select Site</label>
        <Select
          showSearch
          placeholder="Select a site"
          style={{ width: "100%" }}
          value={selectedSite}
          onChange={setSelectedSite}
          options={sites.map((s) => ({
            label: s.name || s.attributes?.name,
            value: s.documentId,
          }))}
        />
      </div>

      {/* Product Selection */}
      <div className="space-y-4 max-h-[50vh] overflow-y-auto">
        {boqItems.map((p, i) => (
          <div
            key={i}
            className="flex justify-between items-center border-b py-2 gap-4"
          >
            <div className="flex items-center gap-2 w-1/3">
              <Checkbox
                checked={p.selected}
                onChange={(e) =>
                  handleChange(p.name, "selected", e.target.checked)
                }
              />
              <div>
                <p className="font-medium text-gray-800">{p.name}</p>
                <p className="text-xs text-gray-500">{p.group}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <InputNumber
                min={1}
                value={p.qty}
                onChange={(val) => handleChange(p.name, "qty", val || 1)}
                disabled={!p.selected}
              />
              <InputNumber
                min={0}
                value={p.price}
                disabled={!p.selected || p.locked}
                onChange={(val) => handleChange(p.name, "price", val || 0)}
                addonAfter={p.locked ? "🔒" : ""}
              />
              <span className="text-gray-700 text-sm w-20 text-right">
                ₹{((p.price || 0) * (p.qty || 1)).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Remarks */}
      <div className="mt-4">
        <Input.TextArea
          placeholder="Add remarks..."
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={3}
        />
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center mt-4">
        <p className="font-medium text-gray-800">
          Total Cost: ₹{totalCost.toLocaleString()}
        </p>
        <div className="flex gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="primary"
            className="bg-blue-600"
            loading={loading}
            onClick={handleSubmit}
            disabled={!selectedSite || selectedItems.length === 0}
          >
            Raise BOQ
          </Button>
        </div>
      </div>
    </Modal>
  );
}
