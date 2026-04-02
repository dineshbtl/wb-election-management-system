"use client";

import { useEffect, useState } from "react";
import { InputNumber, Button, Modal, message, Spin } from "antd";
import api from "@/lib/api";
import axios from "axios";

interface Product {
  name: string;
  price?: number;
  locked?: boolean;
  currency?: string;
}

interface Group {
  group: string;
  products: Product[];
}

export default function EditPricesModal({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erpPrices, setErpPrices] = useState<Record<string, number>>({});
  const [fetchingPrices, setFetchingPrices] = useState(false);

  // 🟢 Load assigned products from Strapi
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await api.get(`/projects/${projectId}?populate=*`);
        const project =
          res.data?.data?.attributes ||
          (Array.isArray(res.data?.data) ? res.data.data[0] : res.data.data);

        const assigned = Array.isArray(project?.assigned_groups)
          ? project.assigned_groups
          : [];

        const normalized: Group[] = assigned.map((g: any) => ({
          group: g.group,
          products: (g.products || []).map((p: any) => ({
            name: typeof p === "string" ? p : p.name,
            price: p.price ?? null,
            locked: p.locked ?? false,
            currency: p.currency || "INR",
          })),
        }));

        setGroups(normalized);
        console.log("✅ Loaded assigned groups:", normalized);
      } catch (err) {
        console.error("❌ Failed to load project:", err);
        message.error("Failed to load project data");
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [projectId]);

  // 🟡 Fetch ERP prices for unlocked products only
  useEffect(() => {
    const fetchERPPrices = async () => {
      const unlockedProducts = groups
        .flatMap((g) => g.products)
        .filter((p) => !p.locked)
        .map((p) => p.name);

      if (unlockedProducts.length === 0) return;

      setFetchingPrices(true);
      try {
        const query = encodeURIComponent(unlockedProducts.join(","));
        const res = await axios.get(`/api/erp-prices?item_codes=${query}`);

        const map: Record<string, number> = {};
        (res.data?.data || []).forEach((item: any) => {
          map[item.item_code] = item.price_list_rate;
        });

        setErpPrices(map);

        // Apply ERP prices automatically to unlocked products
        setGroups((prev) =>
          prev.map((g) => ({
            ...g,
            products: g.products.map((p) =>
              !p.locked && !p.price && map[p.name]
                ? { ...p, price: map[p.name] }
                : p
            ),
          }))
        );
      } catch (err) {
        console.error("❌ Failed to load ERP prices:", err);
      } finally {
        setFetchingPrices(false);
      }
    };

    if (groups.length > 0) fetchERPPrices();
  }, [groups.length]);

  // ✏️ Handle price change
  const handlePriceChange = (
    groupName: string,
    productName: string,
    newPrice: number | null
  ) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.group === groupName
          ? {
              ...g,
              products: g.products.map((p) =>
                p.name === productName ? { ...p, price: newPrice } : p
              ),
            }
          : g
      )
    );
  };

  // 🔒 Lock product price
  const handleLock = (groupName: string, productName: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.group === groupName
          ? {
              ...g,
              products: g.products.map((p) =>
                p.name === productName ? { ...p, locked: true } : p
              ),
            }
          : g
      )
    );
    message.success(`${productName} locked successfully`);
  };

  // 💾 Save to Strapi
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { data: { assigned_groups: groups } };
      await api.put(`/projects/${projectId}`, payload);
      message.success("✅ Prices updated & saved!");
      onClose();
    } catch (err: any) {
      console.error("❌ Save failed:", err.response?.data || err.message);
      message.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title="Edit & Lock Product Prices"
      onCancel={onClose}
      footer={null}
      width={700}
    >
      {loading ? (
        <div className="flex justify-center py-10">
          <Spin />
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g, gi) => (
            <div key={gi} className="border-b pb-4">
              <h3 className="font-semibold text-blue-600 mb-3">{g.group}</h3>
              {g.products.length === 0 ? (
                <p className="text-sm text-gray-500">No products assigned.</p>
              ) : (
                g.products.map((p, pi) => (
                  <div
                    key={pi}
                    className="flex justify-between items-center mb-2"
                  >
                    <span className="w-2/3">{p.name}</span>
                    <div className="flex items-center gap-2">
                      <InputNumber
                        min={0}
                        value={p.price ?? undefined}
                        // disabled={p.locked}
                        onChange={(val) =>
                          handlePriceChange(g.group, p.name, val)
                        }
                        style={{ width: 100 }}
                      />
                      {/* {!p.locked ? ( */}
                      <Button
                        type="default"
                        icon={<span>🔒</span>}
                        onClick={() => handleLock(g.group, p.name)}
                      >
                        Lock
                      </Button>
                      {/* ) : ( */}
                      <span className="text-green-600 font-medium flex items-center">
                        <span role="img" aria-label="lock">
                          🔒
                        </span>{" "}
                        Locked
                      </span>
                      {/* )} */}
                    </div>
                  </div>
                ))
              )}
            </div>
          ))}

          {fetchingPrices && (
            <p className="text-sm text-gray-500 italic">
              Fetching ERP prices...
            </p>
          )}

          <div className="flex justify-end mt-4 gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" loading={saving} onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
