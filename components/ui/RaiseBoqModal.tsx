"use client";

import { useState } from "react";
import { Modal, InputNumber, Button, Input, Checkbox, message } from "antd";
import api from "@/lib/api";

export default function RaiseBoqModal({
  siteId,
  projectId,
  products,
  userDocId,
  onClose,
}: {
  siteId: string;
  projectId: string;
  products: any[];
  userDocId: string;
  onClose: () => void;
}) {
  const [boqItems, setBoqItems] = useState(
    products.map((p) => ({
      ...p,
      qty: 1,
      price: p.price || 0,
      selected: false, // 🆕 track selection
    }))
  );
  const [loading, setLoading] = useState(false);
  const [remarks, setRemarks] = useState("");

  const handleChange = (name: string, field: string, value: any) => {
    setBoqItems((prev) =>
      prev.map((p) => (p.name === name ? { ...p, [field]: value } : p))
    );
  };

  // 🧮 Only selected products will count
  const selectedItems = boqItems.filter((p) => p.selected);
  const totalCost = selectedItems.reduce(
    (sum, p) => sum + (p.qty || 0) * (p.price || 0),
    0
  );

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      message.warning("Please select at least one product to raise a BOQ.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        data: {
          project: { connect: [{ documentId: projectId }] },
          site_1: { connect: [{ documentId: siteId }] },
          raised_by: { connect: [{ documentId: userDocId }] },
          boq_items: selectedItems.map((p) => ({
            name: p.name,
            group: p.group,
            qty: p.qty,
            // ⚙️ don't store a fixed price if state is still pending
            price: p.price || 0,
            total: (p.price || 0) * (p.qty || 1),
            currency: p.currency || "INR",
            locked: false, // 🚫 always false initially
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
      title="🧾 Raise BO kjhgfQ"
      onCancel={onClose}
      footer={null}
      centered
      width={800}
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {boqItems.map((p, i) => (
          <div
            key={i}
            className="flex justify-between items-center border-b py-2 gap-4"
          >
            <div className="flex items-center gap-2 w-1/3">
              {/* 🆕 Checkbox to select */}
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
              {/* Quantity */}
              <InputNumber
                min={1}
                value={p.qty}
                onChange={(val) => handleChange(p.name, "qty", val || 1)}
                disabled={!p.selected}
              />

              {/* Price (locked or editable) */}
              <InputNumber
                min={0}
                value={p.price}
                disabled={p.locked || !p.selected}
                onChange={(val) => handleChange(p.name, "price", val || 0)}
                addonAfter={p.locked ? "🔒" : ""}
              />

              {/* Total */}
              <span className="text-gray-700 text-sm w-20 text-right">
                ₹{((p.price || 0) * (p.qty || 1)).toLocaleString()}
              </span>
            </div>
          </div>
        ))}

        {/* Remarks */}
        <div className="mt-4">
          <Input.TextArea
            placeholder="Add remarks or notes..."
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
              disabled={selectedItems.length === 0}
            >
              Raise BOQ
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
