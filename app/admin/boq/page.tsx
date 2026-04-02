"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";

import { Database, Download, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import UploadZone from "@/boqcomponents/UploadZone";
import ViewToggle from "@/boqcomponents/ViewToggle";
import BoqTable from "@/boqcomponents/BoqTable";
import BoqCard from "@/boqcomponents/BOQCard";
import LoadingSpinner from "@/boqcomponents/Loadingspinner";
import LogPanel from "@/boqcomponents/Logpanel";
import BoqModal from "@/boqcomponents/BowModal";
import Modal from "@/boqcomponents/Modal";
import AddBoq from "@/boqcomponents/Addboq";
import { Input, Pagination, Select } from "antd";

type Boq = {
  id: number;
  division?: { name: string };
  depot?: { name: string };
  bus_station?: { name: string };
  bus_stand?: { name: string };
  nvr_selection?: { id: number; count: number }[];
};

type RefData = {
  divisions: { id: number; name: string; documentId: string }[];
  depots: { id: number; name: string; documentId: string }[];
  stations: { id: number; name: string; documentId: string }[];
  stands: { id: number; name: string; documentId: string }[];
  nvrs: { id: number; name: string; documentId: string }[];
  cameras: { id: number; name: string; documentId: string }[];
  switches: { id: number; name: string; documentId: string }[];
  racks: { id: number; name: string; documentId: string }[];
  poles: { id: number; name: string; documentId: string }[];
  weatherproofBoxes: { id: number; name: string; documentId: string }[];
  cables: { id: number; name: string; documentId: string }[];
  conduits: { id: number; name: string; documentId: string }[];
  wires: { id: number; name: string; documentId: string }[];
  ups: { id: number; name: string; documentId: string }[];
  lcds: { id: number; name: string; documentId: string }[];
};

export default function App() {
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState<string[]>([]);
  const [boqs, setBoqs] = useState<Boq[]>([]);
  const [view, setView] = useState<"grid" | "table">("grid");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20); // add setPageSize
  const [totalPages, setTotalPages] = useState(1);

  const [selectedBoq, setSelectedBoq] = useState<any | null>(null);
  const [grandTotal, setGrandTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [allBoqs, setAllBoqs] = useState<Boq[]>([]);
  const [calculatingTotal, setCalculatingTotal] = useState(false);

  // Fetch BOQs
  const fetchBoqs = async (newPage = page, newPageSize = pageSize) => {
    try {
      setLoading(true);
      const res = await api.get(
        `/boqs?pagination[page]=${newPage}&pagination[pageSize]=${newPageSize}` +
          `&populate[division]=true&populate[depot]=true&populate[bus_station]=true&populate[bus_stand]=true` +
          `&populate[nvr_selection][populate][nvr]=true&populate[camera_selection][populate][camera]=true` +
          `&populate[switch_selection][populate][switch]=true&populate[rack_selection][populate][rack]=true` +
          `&populate[pole_selection][populate][pole]=true&populate[wpf_selection][populate][weatherproof_box]=true` +
          `&populate[cable_selection][populate][cable]=true&populate[conduit_selection][populate][conduit]=true` +
          `&populate[wire_selection][populate][wire]=true&populate[ups_selection][populate][up]=true` +
          `&populate[lcd_selection][populate][lcd]=true`
      );

      setBoqs(res.data.data);
      setPage(res.data.meta.pagination.page);
      setTotalPages(res.data.meta.pagination.pageCount);
    } catch (err) {
      console.error("Error fetching BOQs:", err);
      setLog((prev) => [...prev, "❌ Error fetching BOQs"]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllBoqs = async () => {
    try {
      const res = await api.get(
        `/boqs?pagination[pageSize]=1000` +
          `&populate[division]=true&populate[depot]=true&populate[bus_station]=true&populate[bus_stand]=true` +
          `&populate[nvr_selection][populate][nvr]=true&populate[camera_selection][populate][camera]=true` +
          `&populate[switch_selection][populate][switch]=true&populate[rack_selection][populate][rack]=true` +
          `&populate[pole_selection][populate][pole]=true&populate[wpf_selection][populate][weatherproof_box]=true` +
          `&populate[cable_selection][populate][cable]=true&populate[conduit_selection][populate][conduit]=true` +
          `&populate[wire_selection][populate][wire]=true&populate[ups_selection][populate][up]=true` +
          `&populate[lcd_selection][populate][lcd]=true`
      );
      setAllBoqs(res.data.data);
    } catch (err) {
      console.error("Error fetching all BOQs:", err);
    }
  };

  // useEffect(() => {
  //   fetchBoqs();
  // }, []);

  useEffect(() => {
    fetchBoqs(1); // start from first page
    // fetchGrandTotal();
    // fetchAllBoqs(); // ✅ add this
  }, []);
  const handleSearch = async (value: string) => {
    setSearchTerm(value);

    if (value.length < 3) {
      fetchBoqs(1); // reset to normal pagination
      return;
    }

    try {
      setLoading(true);
      const res = await api.get(
        `/boqs?filters[bus_station][name][$containsi]=${value}` +
          `&pagination[pageSize]=1000` +
          `&populate[division]=true&populate[depot]=true&populate[bus_station]=true&populate[bus_stand]=true` +
          `&populate[nvr_selection][populate][nvr]=true&populate[camera_selection][populate][camera]=true` +
          `&populate[switch_selection][populate][switch]=true&populate[rack_selection][populate][rack]=true` +
          `&populate[pole_selection][populate][pole]=true&populate[wpf_selection][populate][weatherproof_box]=true` +
          `&populate[cable_selection][populate][cable]=true&populate[conduit_selection][populate][conduit]=true` +
          `&populate[wire_selection][populate][wire]=true&populate[ups_selection][populate][up]=true` +
          `&populate[lcd_selection][populate][lcd]=true`
      );

      setBoqs(res.data.data); // ✅ don’t add cost here, filteredBoqs handles it
      setTotalPages(1);
      setPage(1);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateBoqCost = (boq: any) => {
    const categories = [
      { key: "nvr_selection", ref: "nvr" },
      { key: "camera_selection", ref: "camera" },
      { key: "switch_selection", ref: "switch" },
      { key: "rack_selection", ref: "rack" },
      { key: "pole_selection", ref: "pole" },
      { key: "wpf_selection", ref: "weatherproof_box" },
      { key: "cable_selection", ref: "cable" },
      { key: "conduit_selection", ref: "conduit" },
      { key: "wire_selection", ref: "wire" },
      { key: "ups_selection", ref: "up" },
      { key: "lcd_selection", ref: "lcd" },
    ];

    return categories.reduce((sum, { key, ref }) => {
      if (!boq[key]) return sum;
      return (
        sum +
        boq[key].reduce((subtotal: number, item: any) => {
          const refData = item[ref];
          const price = refData?.price ?? 0;
          const count = item.count || 0;
          return subtotal + price * count;
        }, 0)
      );
    }, 0);
  };

  const filteredBoqs = boqs.map((boq) => ({
    ...boq,
    cost: calculateBoqCost(boq),
  }));

  // Calculate cost helper stays same

  // Fetch paginated BOQs
  // const fetchBoqs = async (newPage = page) => {
  //   try {
  //     setLoading(true);
  //     const res = await api.get(
  //       `/boqs?pagination[page]=${newPage}&pagination[pageSize]=${pageSize}` +
  //         `&populate[division]=true&populate[depot]=true&populate[bus_station]=true&populate[bus_stand]=true` +
  //         `&populate[nvr_selection][populate][nvr]=true&populate[camera_selection][populate][camera]=true` +
  //         `&populate[switch_selection][populate][switch]=true&populate[rack_selection][populate][rack]=true` +
  //         `&populate[pole_selection][populate][pole]=true&populate[wpf_selection][populate][weatherproof_box]=true` +
  //         `&populate[cable_selection][populate][cable]=true&populate[conduit_selection][populate][conduit]=true` +
  //         `&populate[wire_selection][populate][wire]=true&populate[ups_selection][populate][up]=true` +
  //         `&populate[lcd_selection][populate][lcd]=true`
  //     );

  //     setBoqs(res.data.data);
  //     setPage(res.data.meta.pagination.page);
  //     setTotalPages(res.data.meta.pagination.pageCount);
  //   } catch (err) {
  //     console.error("Error fetching BOQs:", err);
  //     setLog((prev) => [...prev, "❌ Error fetching BOQs"]);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // Fetch all BOQs once for grand total
  const fetchGrandTotal = async () => {
    try {
      const res = await api.get(
        `/boqs?pagination[pageSize]=1000` +
          `&populate[nvr_selection][populate][nvr]=true&populate[camera_selection][populate][camera]=true` +
          `&populate[switch_selection][populate][switch]=true&populate[rack_selection][populate][rack]=true` +
          `&populate[pole_selection][populate][pole]=true&populate[wpf_selection][populate][weatherproof_box]=true` +
          `&populate[cable_selection][populate][cable]=true&populate[conduit_selection][populate][conduit]=true` +
          `&populate[wire_selection][populate][wire]=true&populate[ups_selection][populate][up]=true` +
          `&populate[lcd_selection][populate][lcd]=true`
      );

      const allBoqs = res.data.data;
      const total = allBoqs.reduce(
        (sum: number, boq: any) => sum + calculateBoqCost(boq),
        0
      );
      setGrandTotal(total);
    } catch (err) {
      console.error("Error fetching grand total:", err);
    }
  };

  // Fetch reference data
  const fetchReferenceData = async (): Promise<RefData> => {
    const [
      divisions,
      depots,
      stations,
      stands,
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
    ] = await Promise.all([
      api.get(`/divisions?pagination[pageSize]=1000`),
      api.get(`/depots?pagination[pageSize]=1000`),
      api.get(`/bus-stations?pagination[pageSize]=1000`),
      api.get(`/bus-stands?pagination[pageSize]=1000`),
      api.get(`/nvrs?pagination[pageSize]=1000`),
      api.get(`/cameras?pagination[pageSize]=1000`),
      api.get(`/switches?pagination[pageSize]=1000`),
      api.get(`/racks?pagination[pageSize]=1000`),
      api.get(`/poles?pagination[pageSize]=1000`),
      api.get(`/weatherproof-boxes?pagination[pageSize]=1000`),
      api.get(`/cables?pagination[pageSize]=1000`),
      api.get(`/conduits?pagination[pageSize]=1000`),
      api.get(`/wires?pagination[pageSize]=1000`),
      api.get(`/upss?pagination[pageSize]=1000`),
      api.get(`/lcds?pagination[pageSize]=1000`),
    ]);

    const mapData = (list: any[]) =>
      list.data.data.map((x: any) => ({
        id: x.id,
        documentId: x.documentId,
        name: x.name,
      }));

    return {
      divisions: mapData(divisions),
      depots: mapData(depots),
      stations: mapData(stations),
      stands: mapData(stands),
      nvrs: mapData(nvrs),
      cameras: mapData(cameras),
      switches: mapData(switches),
      racks: mapData(racks),
      poles: mapData(poles),
      weatherproofBoxes: mapData(weatherproofBoxes),
      cables: mapData(cables),
      conduits: mapData(conduits),
      wires: mapData(wires),
      ups: mapData(ups),
      lcds: mapData(lcds),
    };
  };

  const fetchTemplateHeaders = async () => {
    const refs = await fetchReferenceData();

    // Collect headers dynamically
    const headers = [
      "division",
      "depot",
      "busStation",
      "busStand",
      "surveyDate",
      ...refs.nvrs.map((n) => n.name),
      ...refs.cameras.map((c) => c.name),
      ...refs.switches.map((s) => s.name),
      ...refs.racks.map((r) => r.name),
      ...refs.poles.map((p) => p.name),
      ...refs.weatherproofBoxes.map((w) => w.name),
      ...refs.cables.map((c) => c.name),
      ...refs.conduits.map((c) => c.name),
      ...refs.wires.map((w) => w.name),
      ...refs.ups.map((u) => u.name),
      ...refs.lcds.map((l) => l.name),
    ];

    return headers;
  };

  const downloadTemplate = async () => {
    try {
      const headers = await fetchTemplateHeaders();

      // Create worksheet with only headers
      const ws = XLSX.utils.aoa_to_sheet([headers]);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "BOQ_Template");

      XLSX.writeFile(wb, "boq_template.xlsx");
    } catch (err) {
      console.error("Error generating template:", err);
    }
  };

  // Inside your App component
  const handleDeleteBoq = async (id: number) => {
    try {
      await api.delete(`/boqs/${id}`);
      await fetchBoqs(); // refresh list after delete
      await fetchAllBoqs(); // also refresh search dataset
    } catch (err) {
      console.error("❌ Failed to delete BOQ:", err);
    }
  };

  // Read Excel file
  const readExcel = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as any[];

        const normalized = json.map((row) => {
          const newRow: Record<string, any> = {};
          Object.keys(row).forEach((key) => {
            newRow[key.trim().toLowerCase()] = row[key];
          });
          return newRow;
        });

        resolve(normalized);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const parseSurveyDate = (value: any): string | null => {
    if (!value) return null;

    // Case 1: Excel serial date number
    if (!isNaN(value) && typeof value === "number") {
      const date = XLSX.SSF.parse_date_code(value);
      if (date) {
        const year = date.y;
        const month = String(date.m).padStart(2, "0");
        const day = String(date.d).padStart(2, "0");
        return `${year}-${month}-${day}`; // ✅ yyyy-MM-dd
      }
    }

    // Case 2: String like "6/8/2025" or "06-08-2025"
    const str = value.toString().trim();
    const parts = str.split(/[\/\-]/);
    if (parts.length === 3) {
      let [d, m, y] = parts;
      if (y.length === 2) y = "20" + y; // handle "25" → "2025"
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    // Case 3: Fallback to JS Date parsing
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, "0");
      const d = String(parsed.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    return null;
  };

  // Map row to BOQ
  // Map row to BOQ
  const mapRowToBoq = (row: any, refs: RefData) => {
    const normalize = (str: string) =>
      str?.toString().trim().replace(/\s+/g, " ").toLowerCase();

    const divisionName = row["division"]?.toString().trim();
    const depotName = row["depot"]?.toString().trim();
    const stationName = row["busstation"]?.toString().trim();
    const standShort = row["busstand"]?.toString().trim();
    const surveyDate = parseSurveyDate(row["surveydate"]);

    const division = refs.divisions.find(
      (d) => normalize(d.name) === normalize(divisionName)
    );
    const depot = refs.depots.find(
      (d) => normalize(d.name) === normalize(depotName)
    );
    const station = refs.stations.find(
      (s) => normalize(s.name) === normalize(stationName)
    );

    let busStand: any = null;
    if (depotName && stationName && standShort) {
      const busStandName = `${standShort} (${depotName} - ${stationName})`;
      busStand = refs.stands.find(
        (s) => normalize(s.name) === normalize(busStandName)
      );
    }

    // ❌ Validation
    // ❌ Validation with detailed logging
    if (!division) {
      console.error(`❌ Division not found: "${divisionName}"`);
    }
    if (!depot) {
      console.error(`❌ Depot not found: "${depotName}"`);
    }
    if (!station) {
      console.error(`❌ Station not found: "${stationName}"`);
    }
    if (!busStand) {
      console.error(
        `❌ BusStand not found: short="${standShort}" → expected full="${standShort} (${depotName} - ${stationName})"`
      );
    }

    if (!division || !depot || !station || !busStand) {
      return null; // skip row
    }

    // ✅ If all refs found, return payload
    const createSelections = (items: any[], prefix: string) =>
      items
        .map((item) => {
          const colName = item.name.toLowerCase();
          const count = row[colName];
          return count && Number(count) > 0
            ? {
                [prefix]: { connect: [item.documentId] },
                count: Number(count),
              }
            : null;
        })
        .filter(Boolean);

    return {
      division: { connect: [division.documentId] },
      depot: { connect: [depot.documentId] },
      bus_station: { connect: [station.documentId] },
      bus_stand: { connect: [busStand.documentId] },
      survey_date: surveyDate || null,
      nvr_selection: createSelections(refs.nvrs, "nvr"),
      camera_selection: createSelections(refs.cameras, "camera"),
      switch_selection: createSelections(refs.switches, "switch"),
      rack_selection: createSelections(refs.racks, "rack"),
      pole_selection: createSelections(refs.poles, "pole"),
      wpf_selection: createSelections(
        refs.weatherproofBoxes,
        "weatherproof_box"
      ),
      cable_selection: createSelections(refs.cables, "cable"),
      conduit_selection: createSelections(refs.conduits, "conduit"),
      wire_selection: createSelections(refs.wires, "wire"),
      ups_selection: createSelections(refs.ups, "up"),
      lcd_selection: createSelections(refs.lcds, "lcd"),
    };
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    setLog([]);

    try {
      const rows = await readExcel(e.target.files[0]);
      const refs = await fetchReferenceData();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const boqData = mapRowToBoq(row, refs);

        if (!boqData) {
          setLog((prev) => [
            ...prev,
            `❌ Row ${i + 1} skipped: Missing division/depot/station/busstand`,
          ]);
          continue; // skip saving
        }

        try {
          await api.post(`/boqs`, { data: boqData });
          setLog((prev) => [...prev, `✅ Row ${i + 1} uploaded successfully`]);
        } catch (err: any) {
          setLog((prev) => [...prev, `❌ Row ${i + 1} failed: ${err.message}`]);
        }
      }

      await fetchBoqs();
    } catch (err: any) {
      setLog((prev) => [...prev, `❌ Error: ${err.message}`]);
    } finally {
      setUploading(false);
    }
  };

  // Handle file upload

  return (
    <div className="min-h-screen ">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mr-4">
              <Database className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">BOQ Management</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Upload and manage Bill of Quantities with ease
          </p>
        </motion.div>

        {/* Upload Zone */}
        <UploadZone onFileUpload={handleFileUpload} uploading={uploading} />

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={downloadTemplate}
          className="flex items-center mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <Download className=" mx-2" /> Download Excel Template
        </motion.button>

        {/* Log Panel */}
        {/* <LogPanel log={log} uploading={uploading} /> */}

        {/* BOQs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <div className="text-xl font-bold text-gray-900 mb-4">
            💰 Grand Total (All BOQs):
            {grandTotal > 0
              ? `₹${grandTotal.toLocaleString()}`
              : " (Click to calculate)"}
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={async () => {
              try {
                setCalculatingTotal(true); // ✅ start loader
                const res = await api.get(
                  `/boqs?pagination[pageSize]=1000&populate[nvr_selection][populate][nvr]=true&populate[camera_selection][populate][camera]=true&populate[switch_selection][populate][switch]=true&populate[rack_selection][populate][rack]=true&populate[pole_selection][populate][pole]=true&populate[wpf_selection][populate][weatherproof_box]=true&populate[cable_selection][populate][cable]=true&populate[conduit_selection][populate][conduit]=true&populate[wire_selection][populate][wire]=true&populate[ups_selection][populate][up]=true&populate[lcd_selection][populate][lcd]=true`
                );

                const data = res.data.data;
                const total = data.reduce(
                  (sum: number, boq: any) => sum + calculateBoqCost(boq),
                  0
                );
                setGrandTotal(total);
              } catch (err) {
                console.error("Error calculating total:", err);
              } finally {
                setCalculatingTotal(false); // ✅ stop loader
              }
            }}
            className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center justify-center"
          >
            {calculatingTotal ? (
              <>
                <LoadingSpinner />
                <span className="">Calculating...</span>
              </>
            ) : (
              "Calculate Grand Total"
            )}
          </motion.button>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
            {/* Left Section */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <h2 className="text-xl w-full sm:text-2xl font-bold text-gray-900">
                BOQ Records ({boqs.length})
              </h2>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={fetchBoqs}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200"
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </motion.button>

              <AddBoq onBoqAdded={fetchBoqs} />
            </div>
            <div className="flex items-center gap-2 mb-4">
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by Bus Station..."
                className="w-64 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Right Section */}
            <div className="flex justify-end">
              <ViewToggle view={view} onViewChange={setView} />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 min-h-80">
              <LoadingSpinner />
              <span className="ml-3 text-gray-600">Loading BOQs...</span>
            </div>
          ) : boqs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 bg-white rounded-xl shadow-lg min-h-80"
            >
              <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No BOQs Found
              </h3>
              <p className="text-gray-500">
                Upload an Excel file to get started
              </p>
            </motion.div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-80">
              {filteredBoqs.map((boq, index) => (
                <BoqCard
                  key={boq.id}
                  boq={boq}
                  index={index}
                  onClick={() => setSelectedBoq(boq)}
                  onDelete={handleDeleteBoq}
                />
              ))}
            </div>
          ) : (
            <BoqTable boqs={filteredBoqs} />
          )}
          {/* Pagination */}
          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
            {/* Page Size Selector */}
            <Select
              value={pageSize}
              onChange={(value) => {
                setPageSize(value);
                fetchBoqs(1, value); // ✅ pass new pageSize directly
              }}
              className="w-24"
            >
              <Select.Option value={20}>20</Select.Option>
              <Select.Option value={50}>50</Select.Option>
              <Select.Option value={100}>100</Select.Option>
            </Select>

            {/* Pagination */}
            <Pagination
              current={page}
              total={searchTerm ? boqs.length : totalPages * pageSize}
              pageSize={pageSize}
              onChange={(newPage, newPageSize) => {
                if (!searchTerm) {
                  setPage(newPage);
                  setPageSize(newPageSize);
                  fetchBoqs(newPage, newPageSize); // ✅ pass new pageSize
                }
              }}
              showSizeChanger={false}
              showTotal={(total) =>
                searchTerm
                  ? `🔍 Found ${boqs.length} results`
                  : `Total ${total} items`
              }
            />
          </div>
        </motion.div>
      </div>
      {selectedBoq && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-full max-w-4xl p-6 rounded-2xl shadow-2xl bg-white dark:bg-neutral-900 space-y-6 animate-in fade-in-50 slide-in-from-bottom-10">
            {/* Header */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                BOQ #{selectedBoq.id}
              </h2>
              <button
                onClick={() => setSelectedBoq(null)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition"
              >
                ✕
              </button>
            </div>

            {/* BOQ Details */}
            <div className="max-h-[70vh] overflow-y-auto">
              <BoqModal boq={selectedBoq} />
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-5 border-t border-gray-200 dark:border-neutral-700">
              <button
                onClick={() => setSelectedBoq(null)}
                className="px-5 py-2 rounded-lg border text-gray-700 hover:bg-gray-100 dark:border-neutral-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
