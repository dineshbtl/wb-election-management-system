"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DatePicker, Input, Modal, Select } from "antd"; // ✅ Ant Design Modal and Select
const { Option } = Select;
import dayjs from "dayjs";
import {
  Plus,
  X,
  Building2,
  MapPin,
  Calendar,
  Trash2,
  ChevronDown,
  Loader2,
  Save,
  Monitor,
  Camera,
  Network,
  Server,
  Zap,
  Shield,
  Cable,
  HardDrive,
  Tv,
} from "lucide-react";
import api from "@/lib/api";

export default function AddBoq({ onBoqAdded }: { onBoqAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // 🔹 Reference lists for cascading selects
  const [divisions, setDivisions] = useState<any[]>([]);
  const [depots, setDepots] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [stands, setStands] = useState<any[]>([]);

  // 🔹 Reference lists for products
  const [refs, setRefs] = useState<Record<string, any[]>>({
    nvrs: [],
    cameras: [],
    switches: [],
    racks: [],
    poles: [],
    weatherproofBoxes: [],
    cables: [],
    conduits: [],
    wires: [],
    ups: [],
    lcds: [],
  });

  // 🔹 Selected form data
  const [formData, setFormData] = useState({
    division: "",
    depot: "",
    bus_station: "",
    bus_stand: "",
    survey_date: "",
    approved: false, // ✅ default false
    createdByName: "",
  });

  // 🔹 Dynamic selections (repeatable rows per product)
  const [selections, setSelections] = useState<Record<string, any[]>>({
    nvrs: [{ nvr: "", count: 1 }],
    cameras: [{ camera: "", count: 1 }],
    switches: [{ switch: "", count: 1 }],
    racks: [{ rack: "", count: 1 }],
    poles: [{ pole: "", count: 1 }],
    weatherproofBoxes: [{ weatherproof_box: "", count: 1 }],
    cables: [{ cable: "", count: 1 }],
    conduits: [{ conduit: "", count: 1 }],
    wires: [{ wire: "", count: 1 }],
    ups: [{ ups: "", count: 1 }],
    lcds: [{ lcd: "", count: 1 }],
  });

  const [createdby, setCreatedby] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    api
      .get("/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => {
        setCreatedby(res.data.username);
        console.log("Fetched user:", res.data);
      })

      .catch((err) => {
        console.error("Failed to fetch user:", err);
      });
  }, []);

  // Product categories with icons (consistent styling)
  const productCategories = [
    {
      key: "nvrs",
      label: "NVR Systems",
      icon: Monitor,
    },
    {
      key: "cameras",
      label: "Cameras",
      icon: Camera,
    },
    {
      key: "switches",
      label: "Network Switches",
      icon: Network,
    },
    {
      key: "racks",
      label: "Server Racks",
      icon: Server,
    },
    {
      key: "poles",
      label: "Poles",
      icon: Building2,
    },
    {
      key: "weatherproofBoxes",
      label: "Weatherproof Boxes",
      icon: Shield,
    },
    {
      key: "cables",
      label: "Cables",
      icon: Cable,
    },
    {
      key: "conduits",
      label: "Conduits",
      icon: HardDrive,
    },
    {
      key: "wires",
      label: "Wires",
      icon: Zap,
    },
    {
      key: "ups",
      label: "UPS Systems",
      icon: Zap,
    },
    {
      key: "lcds",
      label: "LCD Displays",
      icon: Tv,
    },
  ];

  // ✅ Fetch divisions & all product refs when modal opens
  useEffect(() => {
    if (open) {
      api
        .get("/divisions?pagination[pageSize]=1000")
        .then((res) => setDivisions(res.data.data));

      Promise.all([
        api.get("/nvrs?pagination[pageSize]=1000"),
        api.get("/cameras?pagination[pageSize]=1000"),
        api.get("/switches?pagination[pageSize]=1000"),
        api.get("/racks?pagination[pageSize]=1000"),
        api.get("/poles?pagination[pageSize]=1000"),
        api.get("/weatherproof-boxes?pagination[pageSize]=1000"),
        api.get("/cables?pagination[pageSize]=1000"),
        api.get("/conduits?pagination[pageSize]=1000"),
        api.get("/wires?pagination[pageSize]=1000"),
        api.get("/upss?pagination[pageSize]=1000"),
        api.get("/lcds?pagination[pageSize]=1000"),
      ]).then(
        ([
          nvrs,
          cameras,
          switches,
          racks,
          poles,
          weatherproofBoxes,
          cables,
          conduits,
          wires,
          ups,
          lcds,
        ]) => {
          setRefs({
            nvrs: nvrs.data.data,
            cameras: cameras.data.data,
            switches: switches.data.data,
            racks: racks.data.data,
            poles: poles.data.data,
            weatherproofBoxes: weatherproofBoxes.data.data,
            cables: cables.data.data,
            conduits: conduits.data.data,
            wires: wires.data.data,
            ups: ups.data.data,
            lcds: lcds.data.data,
          });
        }
      );
    }
  }, [open]);

  // ✅ Cascading selects
  useEffect(() => {
    if (formData.division) {
      api
        .get(
          `/depots?filters[division][documentId][$eq]=${formData.division}&pagination[pageSize]=1000`
        )
        .then((res) => setDepots(res.data.data));
      setStations([]);
      setStands([]);
      setFormData((prev) => ({
        ...prev,
        depot: "",
        bus_station: "",
        bus_stand: "",
      }));
    }
  }, [formData.division]);

  useEffect(() => {
    if (formData.depot) {
      api
        .get(
          `/bus-stations?filters[depot][documentId][$eq]=${formData.depot}&pagination[pageSize]=1000`
        )
        .then((res) => setStations(res.data.data));
      setStands([]);
      setFormData((prev) => ({ ...prev, bus_station: "", bus_stand: "" }));
    }
  }, [formData.depot]);

  useEffect(() => {
    if (formData.bus_station) {
      api
        .get(
          `/bus-stands?filters[bus_station][documentId][$eq]=${formData.bus_station}&pagination[pageSize]=1000`
        )
        .then((res) => setStands(res.data.data));
      setFormData((prev) => ({ ...prev, bus_stand: "" }));
    }
  }, [formData.bus_station]);

  // 🔹 Helpers for repeatable rows
  const addRow = (category: keyof typeof selections) => {
    setSelections((prev) => ({
      ...prev,
      [category]: [
        ...prev[category],
        { [category.slice(0, -1)]: "", count: 1 },
      ],
    }));
  };

  const updateRow = (
    category: keyof typeof selections,
    index: number,
    field: string,
    value: any
  ) => {
    const updated = [...selections[category]];
    updated[index] = { ...updated[index], [field]: value };
    setSelections((prev) => ({ ...prev, [category]: updated }));
  };

  const removeRow = (category: keyof typeof selections, index: number) => {
    setSelections((prev) => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index),
    }));
  };

  const categoryMap: Record<string, { refKey: string; selectionKey: string }> =
    {
      nvrs: { refKey: "nvr", selectionKey: "nvr_selection" },
      cameras: { refKey: "camera", selectionKey: "camera_selection" },
      switches: { refKey: "switch", selectionKey: "switch_selection" },
      racks: { refKey: "rack", selectionKey: "rack_selection" },
      poles: { refKey: "pole", selectionKey: "pole_selection" },
      weatherproofBoxes: {
        refKey: "weatherproof_box",
        selectionKey: "wpf_selection",
      },
      cables: { refKey: "cable", selectionKey: "cable_selection" },
      conduits: { refKey: "conduit", selectionKey: "conduit_selection" },
      wires: { refKey: "wire", selectionKey: "wire_selection" },
      ups: { refKey: "up", selectionKey: "ups_selection" },
      lcds: { refKey: "lcd", selectionKey: "lcd_selection" },
    };

  // 🔹 Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: any = {
        data: {
          division: formData.division ? { connect: [formData.division] } : null,
          depot: formData.depot ? { connect: [formData.depot] } : null,
          bus_station: formData.bus_station
            ? { connect: [formData.bus_station] }
            : null,
          bus_stand: formData.bus_stand
            ? { connect: [formData.bus_stand] }
            : null,
          survey_date: formData.survey_date || null,
          approved: false, // ✅ default false
          createdByName: createdby || null, // 👈 add this
        },
      };

      // ✅ build selections dynamically
      Object.keys(selections).forEach((category) => {
        const rows = selections[category as keyof typeof selections];
        const { refKey, selectionKey } = categoryMap[category];

        if (rows && rows.length > 0) {
          payload.data[selectionKey] = rows
            .filter((r: any) => r[refKey])
            .map((r: any) => ({
              [refKey]: { connect: [r[refKey]] },
              count: Number(r.count),
            }));
        }
      });

      console.log("payload", payload);

      const boqRes = await api.post("/boqs", payload);
      await api.post("/notify/new-boq", {
        boqId: boqRes.data.data.id,
      });
      onBoqAdded();
      setOpen(false);
      setFormData({
        division: "",
        depot: "",
        bus_station: "",
        bus_stand: "",
        survey_date: "",
      });
    } catch (err) {
      console.error("Error adding BOQ:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 UI rendering for products
  const renderProductSection = (category: any) => {
    const { key, label, icon: Icon } = category;
    const { refKey } = categoryMap[key];
    const options = refs[key as keyof typeof refs] || [];
    const isActive = activeSection === key;

    return (
      <motion.div
        key={key}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`rounded-md border bg-gradient-to-b from-blue-50 to-blue-50 overflow-hidden transition-all duration-300 ${
          isActive ? "ring-4 ring-blue-200 shadow-lg" : ""
        }`}
      >
        <motion.div
          className="p-4 bg-teal-500 cursor-pointer"
          onClick={() => setActiveSection(isActive ? null : key)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center justify-between text-black">
            <div className="flex items-center space-x-3">
              <Icon className="w-4 h-4" />
              <span className="font-semibold text-sm">{label}</span>
            </div>
            <motion.div
              animate={{ rotate: isActive ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </div>
        </motion.div>

        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="p-6"
            >
              {selections[key as keyof typeof selections].map((row, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center lg:space-x-4 space-x-1 mb-4 p-1 bg-white rounded-md shadow-sm border border-blue-200"
                >
                  <div className="flex-1">
                    <div className="relative">
                      <Select
                        showSearch
                        placeholder={`Select ${label}`}
                        value={row[refKey] || undefined}
                        onChange={(val) =>
                          updateRow(
                            key as keyof typeof selections,
                            idx,
                            refKey,
                            val
                          )
                        }
                        className="w-full"
                        optionFilterProp="children"
                      >
                        {options.map((opt) => (
                          <Option key={opt.documentId} value={opt.documentId}>
                            {opt.name}
                          </Option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <div className="w-24">
                    <Input
                      type="number"
                      value={row.count}
                      onChange={(e) =>
                        updateRow(
                          key as keyof typeof selections,
                          idx,
                          "count",
                          e.target.value
                        )
                      }
                      className="w-full bg-white border-2 border-blue-200 rounded-md  py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      min={1}
                      placeholder="Qty"
                    />
                  </div>

                  <motion.button
                    type="button"
                    onClick={() =>
                      removeRow(key as keyof typeof selections, idx)
                    }
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors duration-200"
                  >
                    <Trash2 className="w-5 h-5" />
                  </motion.button>
                </motion.div>
              ))}

              <motion.button
                type="button"
                onClick={() => addRow(key as keyof typeof selections)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full mt-4 p-4 border-2 border-dashed border-blue-300 rounded-xl text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Add {label}</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <>
      {/* Button */}
      <motion.button
        whileHover={{
          scale: 1.05,
          boxShadow: "0 10px 30px rgba(34, 197, 94, 0.3)",
        }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        className="px-1 py-2 w-full bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] text-white rounded-md font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center border-0"
      >
        <Plus className="w-5 h-5" />
        <span>Add New BOQ</span>
      </motion.button>

      {/* Modal */}
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={1000}
        className="custom-modal"
        style={{ top: 20 }}
      >
        <div className="lg:p-3 p-0 md:p-3 pt-5 bg-white">
          {/* Header */}
          <div
            className="p-6    rounded-md text-white rounded-t-3xl"
            style={{ backgroundColor: "#3B82F6" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Create New BOQ</h2>
                  <p className="text-blue-100">Bill of Quantities Management</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className=" py-4 max-h-[calc(90vh-200px)] overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Location Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-b from-blue-50 to-blue-50 p-6 rounded-2xl border border-blue-200"
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-blue-600 text-white rounded-xl">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">
                    Location Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Division */}
                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Division
                    </label>
                    <Select
                      showSearch
                      placeholder="Select Division"
                      value={formData.division || undefined}
                      onChange={(value) =>
                        setFormData({
                          ...formData,
                          division: value,
                        })
                      }
                      filterOption={(input, option) =>
                        (option?.children as unknown as string)
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      className="w-full"
                    >
                      {divisions.map((d) => (
                        <Option key={d.documentId} value={d.documentId}>
                          {d.name}
                        </Option>
                      ))}
                    </Select>
                  </div>

                  {/* Depot */}
                  <motion.div
                    animate={
                      depots.length > 0
                        ? { opacity: 1, scale: 1 }
                        : { opacity: 0.6, scale: 0.98 }
                    }
                    className="relative"
                  >
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Depot
                    </label>
                    <Select
                      showSearch
                      placeholder="Select Depot"
                      value={formData.depot || undefined}
                      onChange={(value) =>
                        setFormData({
                          ...formData,
                          depot: value,
                        })
                      }
                      filterOption={(input, option) =>
                        (option?.children as unknown as string)
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      className="w-full"
                      disabled={!depots.length}
                    >
                      {depots.map((d) => (
                        <Option key={d.documentId} value={d.documentId}>
                          {d.name}
                        </Option>
                      ))}
                    </Select>
                  </motion.div>

                  {/* Bus Station */}
                  <motion.div
                    animate={
                      stations.length > 0
                        ? { opacity: 1, scale: 1 }
                        : { opacity: 0.6, scale: 0.98 }
                    }
                    className="relative"
                  >
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Bus Station
                    </label>
                    <Select
                      showSearch
                      placeholder="Select Station"
                      value={formData.bus_station || undefined}
                      onChange={(value) =>
                        setFormData({
                          ...formData,
                          bus_station: value,
                        })
                      }
                      filterOption={(input, option) =>
                        (option?.children as unknown as string)
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      className="w-full"
                      disabled={!stations.length}
                    >
                      {stations.map((s) => (
                        <Option key={s.documentId} value={s.documentId}>
                          {s.name}
                        </Option>
                      ))}
                    </Select>
                  </motion.div>

                  {/* Bus Stand */}
                  <motion.div
                    animate={
                      stands.length > 0
                        ? { opacity: 1, scale: 1 }
                        : { opacity: 0.6, scale: 0.98 }
                    }
                    className="relative"
                  >
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Bus Stand
                    </label>
                    <Select
                      showSearch
                      placeholder="Select Stand"
                      value={formData.bus_stand || undefined}
                      onChange={(value) =>
                        setFormData({
                          ...formData,
                          bus_stand: value,
                        })
                      }
                      filterOption={(input, option) =>
                        (option?.children as unknown as string)
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      className="w-full"
                      disabled={!stands.length}
                    >
                      {stands.map((s) => (
                        <Option key={s.documentId} value={s.documentId}>
                          {s.name}
                        </Option>
                      ))}
                    </Select>
                  </motion.div>
                </div>

                {/* Survey Date */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-6"
                >
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>Survey Date</span>
                  </label>

                  <DatePicker
                    value={
                      formData.survey_date ? dayjs(formData.survey_date) : null
                    }
                    onChange={(date, dateString) =>
                      setFormData({
                        ...formData,
                        survey_date: dateString, // store as string (YYYY-MM-DD)
                      })
                    }
                    className="w-full md:w-1/2"
                    format="YYYY-MM-DD"
                  />
                </motion.div>
              </motion.div>

              {/* Products Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-blue-600 text-white rounded-xl">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">
                    Product Categories
                  </h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {productCategories.map((category, index) => (
                    <motion.div
                      key={category.key}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                    >
                      {renderProductSection(category)}
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex justify-end pt-6 border-t"
              >
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.05 }}
                  whileTap={{ scale: loading ? 1 : 0.95 }}
                  className="px-8 py-4 mt-3 bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] hover:from-[#2d7ae8] hover:to-[#1976D2] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center space-x-3 min-w-[160px] justify-center border-0"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>Save BOQ</span>
                    </>
                  )}
                </motion.button>
              </motion.div>
            </form>
          </div>
        </div>
      </Modal>
    </>
  );
}
