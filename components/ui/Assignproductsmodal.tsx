"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import api from "@/lib/api";
import { Modal, Select, Checkbox, Button, Spin, Divider, message } from "antd";
import type { CheckboxValueType } from "antd/es/checkbox/Group";

const { Option } = Select;

// ------------------ TYPES ------------------
interface Group {
  name: string;
  item_group_name?: string;
}

interface Product {
  name?: string;
  item_code?: string;
  item_name?: string;
  item_group?: string;
  stock_uom?: string;
}

interface Selection {
  group: string;
  products: string[];
}

// ------------------ COMPONENT ------------------
export default function AssignProductsModal({
  projectId,
  onClose,
}: {
  projectId: number;
  onClose: () => void;
}) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [checkedProducts, setCheckedProducts] = useState<string[]>([]);
  const [multiSelections, setMultiSelections] = useState<Selection[]>([]);
  const [loading, setLoading] = useState(false);

  const ERP_GROUPS_API = "/api/erp-groups";
  const ERP_ITEMS_API = "/api/erp-items?group=";

  // Normalize ERP product names (remove extra quotes)
  const normalizeText = (txt: string = "") =>
    txt.replace(/^"|"$/g, "").replace(/\\"/g, '"').trim();

  const getProductName = (p: Product) =>
    normalizeText(
      p.item_code
        ? `${p.item_code} ${p.item_name || ""}`.trim()
        : p.item_name || p.name || ""
    );

  // ------------------ LOADERS ------------------

  // 1️⃣ Load ERP Groups
  useEffect(() => {
    axios
      .get(ERP_GROUPS_API)
      .then((res) => setGroups(res.data?.data || []))
      .catch(() => message.error("Failed to fetch ERP groups"));
  }, []);

  // 2️⃣ Load Assigned Groups from Strapi
  useEffect(() => {
    const loadProject = async () => {
      try {
        const res = await api.get(`/projects/${projectId}?populate=*`);
        const project =
          res.data?.data?.attributes ||
          (Array.isArray(res.data?.data) ? res.data.data[0] : res.data.data);

        const assigned =
          project?.assigned_groups && Array.isArray(project.assigned_groups)
            ? project.assigned_groups
            : [];

        const normalized: Selection[] = assigned.map((g: any) => ({
          group: g.group || g.group_name,
          products: Array.isArray(g.products)
            ? g.products.map((p: any) =>
                typeof p === "string" ? normalizeText(p) : p.item_code || p.name
              )
            : [],
        }));

        setMultiSelections(normalized);
        console.log("✅ Loaded assigned_groups:", normalized);
      } catch {
        message.error("Failed to load project data");
      }
    };
    loadProject();
  }, [projectId]);

  // 3️⃣ Fetch ERP items for selected group
  useEffect(() => {
    if (!selectedGroup) {
      setProducts([]);
      setCheckedProducts([]);
      return;
    }

    axios
      .get(`${ERP_ITEMS_API}${encodeURIComponent(selectedGroup)}`)
      .then((res) => {
        const list = res.data?.data || [];
        setProducts(list);

        // Auto-check previously selected items for this group
        const existing = multiSelections.find((g) => g.group === selectedGroup);
        setCheckedProducts(existing ? existing.products : []);
      })
      .catch(() => {
        message.error("Failed to fetch ERP products");
        setProducts([]);
      });
  }, [selectedGroup]);

  // ------------------ LOGIC ------------------

  // Handle product selection
  // Handle product selection (add or remove immediately)
  const onCheckChange = (values: CheckboxValueType[]) => {
    const updatedProducts = values as string[];
    setCheckedProducts(updatedProducts);

    // Immediately update the multiSelections array
    setMultiSelections((prev) => {
      const idx = prev.findIndex((g) => g.group === selectedGroup);
      const updated = [...prev];

      if (idx !== -1) {
        // Update existing group
        if (updatedProducts.length === 0) {
          // If all products unchecked → remove the group entirely
          updated.splice(idx, 1);
        } else {
          updated[idx] = { group: selectedGroup, products: updatedProducts };
        }
      } else if (updatedProducts.length > 0) {
        // New group selection
        updated.push({ group: selectedGroup, products: updatedProducts });
      }

      return updated;
    });
  };

  // Add group selection
  const handleAddGroup = () => {
    if (!selectedGroup || checkedProducts.length === 0) {
      message.warning("Please select at least one product before adding.");
      return;
    }

    setMultiSelections((prev) => {
      const idx = prev.findIndex((g) => g.group === selectedGroup);
      const updated = [...prev];
      if (idx !== -1)
        updated[idx] = { group: selectedGroup, products: checkedProducts };
      else updated.push({ group: selectedGroup, products: checkedProducts });
      return updated;
    });

    message.success(
      `Added group "${selectedGroup}" with ${checkedProducts.length} products`
    );
    setSelectedGroup("");
    setProducts([]);
    setCheckedProducts([]);
  };

  // Save to Strapi
  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = { data: { assigned_groups: multiSelections } };
      console.log("🛰️ Saving payload:", payload);
      await api.put(`/projects/${projectId}`, payload);
      message.success("✅ Products assigned successfully!");
      onClose();
    } catch (err: any) {
      message.error(
        `Save failed: ${err.response?.data?.error?.message || err.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  // ------------------ RENDER ------------------
  return (
    <Modal
      open={true}
      title="Assign Products (ERPNext)"
      onCancel={onClose}
      width={700}
      footer={null}
      centered
    >
      <div className="space-y-4">
        {/* Group Selection */}
        <Select
          showSearch
          placeholder="Select Product Group"
          value={selectedGroup || undefined}
          onChange={(value) => setSelectedGroup(value)}
          style={{ width: "100%" }}
          filterOption={(input, option) =>
            (option?.children as string)
              .toLowerCase()
              .includes(input.toLowerCase())
          }
        >
          {groups.map((g) => (
            <Option key={g.name} value={g.name}>
              {g.item_group_name || g.name}
            </Option>
          ))}
        </Select>

        {/* Product Selection */}
        {selectedGroup && (
          <>
            <Divider orientation="left">Select Products</Divider>

            {products.length === 0 ? (
              <div className="text-gray-500 text-sm">
                No products available in this group
              </div>
            ) : (
              <Checkbox.Group
                style={{ width: "100%" }}
                value={checkedProducts}
                onChange={onCheckChange}
              >
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-auto p-2 border rounded">
                  {products.map((p) => {
                    const prodName = getProductName(p);
                    return (
                      <Checkbox key={prodName} value={prodName}>
                        {normalizeText(prodName)}{" "}
                        {p.stock_uom ? `(${p.stock_uom})` : ""}
                      </Checkbox>
                    );
                  })}
                </div>
              </Checkbox.Group>
            )}

            <div className="flex justify-end mt-3">
              <Button onClick={handleAddGroup}>+ Add Another Group</Button>
            </div>
          </>
        )}

        <Divider />

        {/* Selections Summary */}
        <div className="bg-gray-50 p-3 rounded">
          <h4 className="font-medium mb-2">Current Selections</h4>
          {multiSelections.length === 0 ? (
            <div className="text-gray-500 text-sm">No groups selected yet</div>
          ) : (
            multiSelections.map((s, i) => (
              <div key={i} className="text-sm mb-1">
                <strong>{s.group}</strong> — {s.products.length} product(s)
              </div>
            ))
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="primary"
            loading={loading}
            onClick={handleSave}
            disabled={multiSelections.length === 0}
          >
            Save to Project
          </Button>
        </div>
      </div>
    </Modal>
  );
}
