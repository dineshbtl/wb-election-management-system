"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Popconfirm, Select } from "antd";
import dayjs from "dayjs";
import api from "@/lib/api";
import RaiseBoq from "@/boqcomponents/RaiseBoq";

const { Option } = Select;

export default function SerialNumberPage() {
  const params = useParams();
  const siteId = (params?.siteId as string) || (params?.id as string);

  const [products, setProducts] = useState<any[]>([]);
  const [siteInfo, setSiteInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [boqItems, setBoqItems] = useState<any[]>([]);
  const [expandedType, setExpandedType] = useState<string | null>(null);

  /** Fetch site-products + BOQ info */
  const fetchData = async () => {
    try {
      const res = await api.get(
        `/site-products?filters[bus_station][documentId][$eq]=${siteId}` +
          `&pagination[pageSize]=1000` +
          `&populate[bus_station][fields][0]=name` +
          `&populate[bus_station][fields][1]=address` +
          `&populate[bus_station][populate][division][fields][0]=name` +
          `&populate[bus_station][populate][depot][fields][0]=name` +
          `&populate[bus_station][populate][bus_stands][fields][0]=name` +
          `&populate[bus_station][populate][technician][fields][0]=username` +
          `&populate[bus_station][populate][technician][fields][1]=email` +
          `&populate=boq`
      );

      const data = res.data?.data || [];
      if (data.length > 0) {
        const site = data[0].bus_station;
        setProducts(data);

        // Collect locked_items only once per unique BOQ
        const seenBoqs = new Set();
        const allLockedItems: any[] = [];

        data.forEach((p) => {
          const boq = p.boq;
          if (boq && !seenBoqs.has(boq.documentId)) {
            seenBoqs.add(boq.documentId);
            allLockedItems.push(...(boq.locked_items || []));
          }
        });

        setBoqItems(allLockedItems);

        setSiteInfo(site);
      } else {
        setProducts([]);
        setBoqItems([]);
        setSiteInfo(null);
      }
    } catch (err) {
      console.error("❌ API fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!siteId) {
      console.warn("❌ siteId missing from URL params");
      setLoading(false);
      return;
    }
    fetchData();
  }, [siteId]);

  /** Update Serial */
  async function updateSerial(docId: string, serial: string) {
    try {
      const now = new Date().toISOString();
      await api.put(`/site-products/${docId}`, {
        data: { serial_number: serial, installed_at: now, state: "Installed" },
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.documentId === docId
            ? {
                ...p,
                serial_number: serial,
                installed_at: now,
                state: "Installed",
              }
            : p
        )
      );
    } catch (err) {
      console.error("❌ Failed to update serial", err);
    }
  }

  /** Replace product */
  async function replaceProduct(product: any) {
    try {
      const now = new Date().toISOString();
      await api.put(`/site-products/${product.documentId}`, {
        data: { state: "Replaced", replaced_at: now },
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.documentId === product.documentId
            ? { ...p, state: "Replaced", replaced_at: now }
            : p
        )
      );
    } catch (err) {
      console.error("❌ Failed to replace", err);
    }
  }

  /** Load Technicians */
  useEffect(() => {
    const fetchTechs = async () => {
      try {
        const res = await api.get(`/users?filters[role][name][$eq]=Technician`);
        setTechnicians(res.data || []);
      } catch (err) {
        console.error("❌ Failed to load technicians", err);
      }
    };
    fetchTechs();
  }, []);

  /** Update Technician */
  async function updateTechnician(techId: string) {
    try {
      await api.put(`/bus-stations/${siteInfo.documentId}`, {
        data: { technician: techId },
      });
      setSiteInfo((prev: any) => ({
        ...prev,
        technician: technicians.find((t) => t.documentId === techId),
      }));
    } catch (err) {
      console.error("❌ Failed to update technician", err);
    }
  }

  if (loading) {
    return <div className="p-10 text-gray-600">Loading...</div>;
  }

  if (!products.length) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Assign Serials</h1>
        <p className="text-gray-500">No products found for this site.</p>
      </div>
    );
  }

  /** Group by product_type → model */
  const groupedByType: Record<string, Record<string, any[]>> = {};
  products.forEach((p) => {
    const type = p.product_type || "Other";
    const model = p.boq_item_name || "Unknown";
    if (!groupedByType[type]) groupedByType[type] = {};
    if (!groupedByType[type][model]) groupedByType[type][model] = [];
    groupedByType[type][model].push(p);
  });

  /** ✅ Approved counts grouped by type */
  const approvedByType = boqItems.reduce((acc: any, item: any) => {
    const type = item.type || "Other";
    acc[type] = (acc[type] || 0) + (item.count || 0);
    return acc;
  }, {});

  /** ✅ Installed counts grouped by type */
  const installedByType = Object.entries(groupedByType).reduce(
    (acc: any, [type, models]) => {
      acc[type] = Object.values(models)
        .flat()
        .filter((p: any) => p.state === "Installed").length;
      return acc;
    },
    {}
  );

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Assign Serials</h1>

      {/* Site Info Card */}
      {siteInfo && (
        <div className="bg-white shadow rounded-lg p-6 mb-8 max-w-2xl">
          <h2 className="text-xl font-semibold mb-4">📍 Site Information</h2>
          <div className="space-y-2 text-gray-700">
            <p>
              <strong>Bus Station:</strong> {siteInfo.name}
            </p>
            <p>
              <strong>Address:</strong> {siteInfo.address}
            </p>
            {siteInfo.division && (
              <p>
                <strong>Division:</strong> {siteInfo.division.name}
              </p>
            )}
            {siteInfo.depot && (
              <p>
                <strong>Depot:</strong> {siteInfo.depot.name}
              </p>
            )}
            {siteInfo.bus_stands?.length > 0 && (
              <p>
                <strong>Bus Stand:</strong> {siteInfo.bus_stands[0].name}
              </p>
            )}
          </div>

          {/* Technician assign/reassign */}
          <div className="mt-4">
            <label className="block font-medium">Technician</label>
            {siteInfo.technician ? (
              <div className="mt-2 p-3 border rounded bg-gray-50">
                <p>
                  <strong>Name:</strong> {siteInfo.technician.username}
                </p>
                <p>
                  <strong>Email:</strong> {(siteInfo.technician.email || "").toLowerCase()}
                </p>
                {siteInfo.technician.phone && (
                  <p>
                    <strong>Phone:</strong> {siteInfo.technician.phone}
                  </p>
                )}
                <button
                  onClick={() =>
                    setSiteInfo((prev: any) => ({ ...prev, technician: null }))
                  }
                  className="mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Reassign Technician
                </button>
              </div>
            ) : (
              <Select
                placeholder="Assign Technician"
                onChange={(val) => updateTechnician(val)}
                className="w-60 mt-2"
              >
                {technicians.map((tech) => (
                  <Option key={tech.documentId} value={tech.documentId}>
                    {tech.username}
                  </Option>
                ))}
              </Select>
            )}
          </div>
        </div>
      )}

      {/* Dashboard by type */}
      {/* Dashboard by type */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {Object.keys(groupedByType).map((type) => (
          <div
            key={type}
            className={`cursor-pointer bg-white shadow rounded-lg p-4 text-center ${
              expandedType === type ? "border-2 border-blue-500" : ""
            }`}
            onClick={() => setExpandedType(expandedType === type ? null : type)}
          >
            <p className="text-2xl font-bold text-blue-600">
              {installedByType[type] || 0} / {approvedByType[type] || 0}
            </p>
            <p className="text-gray-700">{type}</p>
          </div>
        ))}
      </div>

      {/* Raise New BOQ */}
      <div className="mb-6 w-40">
        <RaiseBoq siteInfo={siteInfo} onBoqAdded={fetchData} />
      </div>

      {/* Expand selected type → show models */}
      {expandedType && (
        <div className="space-y-8">
          {Object.entries(groupedByType[expandedType]).map(([model, items]) => (
            <div key={model}>
              <h2 className="text-xl font-semibold mb-4">{model}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((p: any) => (
                  <div
                    key={p.documentId}
                    className="bg-white p-6 rounded shadow"
                  >
                    {/* Show serial only for piece-based items */}
                    {p.unit === "piece" && (
                      <div className="mb-4">
                        <label className="text-sm font-medium">Serial</label>
                        <input
                          type="text"
                          defaultValue={p.serial_number || ""}
                          disabled={!!p.serial_number}
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (val && !p.serial_number)
                              updateSerial(p.documentId, val);
                          }}
                          className={`w-full p-2 border rounded ${
                            p.serial_number ? "bg-gray-100 text-gray-500" : ""
                          }`}
                        />
                      </div>
                    )}

                    {/* Show meters for Cable/Wire */}
                    {(p.product_type === "Cable" ||
                      p.product_type === "Wire") && (
                      <p className="text-sm mb-2">
                        <strong>Quantity:</strong> {p.quantity}{" "}
                        {p.unit || "meters"}
                      </p>
                    )}

                    <p className="text-sm">
                      Installed At:{" "}
                      {p.installed_at
                        ? dayjs(p.installed_at).format("DD MMM YYYY")
                        : "-"}
                    </p>

                    <p className="text-sm mt-2">
                      Status:{" "}
                      {p.state === "Replaced" ? (
                        <span className="text-red-500">Replaced</span>
                      ) : (
                        <Popconfirm
                          title="Replace this item?"
                          onConfirm={() => replaceProduct(p)}
                          okText="Yes"
                          cancelText="No"
                        >
                          <button className="text-blue-600">Replace</button>
                        </Popconfirm>
                      )}
                    </p>

                    <p className="text-sm mt-2">
                      Replaced At:{" "}
                      {p.replaced_at
                        ? dayjs(p.replaced_at).format("DD MMM YYYY")
                        : "-"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
