"use client";

import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { Select } from "antd"; // using antd select for quick dropdown
import { useRouter } from "next/navigation";

export default function UploadAssembliesAndLocationsPage() {
  const { toast } = useToast();
  const [assemblyFile, setAssemblyFile] = useState<File | null>(null);
  const [locationFile, setLocationFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedAssembly, setSelectedAssembly] = useState<string>("all");
  const [districts, setDistricts] = useState<any[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");

  const router = useRouter();

  const fetchDistricts = async () => {
    try {
      const res = await api.get("/districts?pagination[pageSize]=1000");
      setDistricts(res.data.data);
    } catch (err) {
      console.error("Error fetching districts:", err);
    }
  };

  // 🔹 Fetch Assemblies
  const fetchAssemblies = async (districtId?: string) => {
    try {
      let url = "/assemblies?pagination[pageSize]=1000&populate=district";
      if (districtId && districtId !== "all") {
        url += `&filters[district][id][$eq]=${districtId}`;
      }

      const res = await api.get(url);
      setAssemblies(res.data.data);
    } catch (err) {
      console.error("Error fetching assemblies:", err);
    }
  };

  // 🔹 Fetch Locations (with optional assembly filter)
  const fetchLocations = async (districtId?: string, assemblyId?: string) => {
    try {
      let url =
        "/locations?pagination[pageSize]=1000&populate=assembly.district";

      if (assemblyId && assemblyId !== "all") {
        url += `&filters[assembly][id][$eq]=${assemblyId}`;
      } else if (districtId && districtId !== "all") {
        url += `&filters[assembly][district][id][$eq]=${districtId}`;
      }

      const res = await api.get(url);
      setLocations(res.data.data);
    } catch (err) {
      console.error("Error fetching locations:", err);
    }
  };

  useEffect(() => {
    fetchDistricts();
    fetchAssemblies();
    fetchLocations();
  }, []);

  // 🟪 Upload Assemblies
  const handleAssemblyUpload = async () => {
    if (!assemblyFile) {
      toast({
        variant: "destructive",
        title: "No File Selected",
        description: "Please select an Excel file for Assemblies.",
      });
      return;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      const data = await assemblyFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      // 🔹 Fetch existing districts (to avoid duplicates)
      const existingDistrictsRes = await api.get(
        "/districts?pagination[pageSize]=1000",
      );
      const districtMap = existingDistrictsRes.data.data.reduce(
        (acc: any, d: any) => {
          acc[d.district_name.trim().toLowerCase()] = d.documentId;
          return acc;
        },
        {},
      );

      let uploadedCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const assemblyNo = r["LAC No."]?.toString().trim();
        const assemblyName = r["LAC Name"]?.trim();
        const districtName = r["Election District"]?.trim();
        const state = r["State"]?.trim();

        if (!assemblyName || !assemblyNo || !districtName) continue;

        // 🟢 Ensure district exists
        let districtId = districtMap[districtName.toLowerCase()];
        if (!districtId) {
          const createDistrict = await api.post("/districts", {
            data: {
              district_name: districtName,
              state: state || null,
              // later you can add "district_coordinator" here if you know the user id
            },
          });
          districtId = createDistrict.data.data.documentId;
          districtMap[districtName.toLowerCase()] = districtId;
        }

        // 🟢 Check if assembly exists
        const existing = await api.get(
          `/assemblies?filters[Assembly_No][$eq]=${encodeURIComponent(
            assemblyNo,
          )}`,
        );
        if (existing.data.data.length) continue;

        // 🟢 Create new assembly linked to district
        await api.post("/assemblies", {
          data: {
            Assembly_No: assemblyNo,
            Assembly_Name: assemblyName,
            district: districtId,
            State: state || null,
          },
        });

        uploadedCount++;
        setProgress(Math.round((uploadedCount / rows.length) * 100));
      }

      toast({
        variant: "success",
        title: "Assemblies Uploaded",
        description: `${uploadedCount} assemblies added successfully.`,
      });

      fetchAssemblies();
    } catch (err: any) {
      console.error("Assembly upload error:", err);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: err.message || "Error uploading assemblies.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // 🟩 Upload Locations (with PS_No duplicate + assembly check)
  const handleLocationUpload = async () => {
    if (!locationFile) {
      toast({
        variant: "destructive",
        title: "No File Selected",
        description: "Please select an Excel file for Locations.",
      });
      return;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      const data = await locationFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      const assembliesRes = await api.get(
        "/assemblies?pagination[pageSize]=1000",
      );
      const assembliesMap = assembliesRes.data.data.reduce(
        (acc: any, item: any) => {
          if (item.Assembly_No)
            acc[item.Assembly_No.toString().trim()] = item.documentId;
          return acc;
        },
        {},
      );

      const existingRes = await api.get(
        "/locations?pagination[pageSize]=10000&populate=assembly",
      );
      const existingSet = new Set(
        existingRes.data.data.map((loc: any) =>
          `${loc.assembly?.Assembly_No || "none"}_${loc.PS_No}`.toLowerCase(),
        ),
      );

      const seenInExcel = new Set<string>();
      let uploadedCount = 0;
      let skipped = [];

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const assemblyNo = r["LAC No."]?.toString().trim();
        const psNo = r["PS No."]?.toString().trim();
        const psName = r["PS Name"]?.trim();
        const psLocation = r["PS Location (village)"]?.trim();

        if (!assemblyNo || !psNo || !psName) continue;

        const assemblyId = assembliesMap[assemblyNo];
        if (!assemblyId) {
          skipped.push({
            assemblyNo,
            psNo,
            psName,
            reason: "Assembly not found",
          });
          continue;
        }

        const psKey = `${assemblyNo}_${psNo}`.toLowerCase();
        if (existingSet.has(psKey) || seenInExcel.has(psKey)) {
          skipped.push({ assemblyNo, psNo, psName, reason: "Duplicate PS_No" });
          continue;
        }

        seenInExcel.add(psKey);

        await api.post("/locations", {
          data: {
            PS_No: psNo,
            PS_Name: psName,
            PS_Location: psLocation || null,
            assembly: assemblyId,
          },
        });

        uploadedCount++;
        setProgress(Math.round((uploadedCount / rows.length) * 100));
      }

      toast({
        variant: "success",
        title: "Locations Uploaded",
        description: `${uploadedCount} new locations added successfully.`,
      });

      if (skipped.length > 0) console.table(skipped);
      fetchLocations();
    } catch (err: any) {
      console.error("Location upload error:", err);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: err.message || "Error uploading locations.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-6xl mx-auto bg-white shadow-lg rounded-2xl p-8 space-y-10">
        {/* 🟪 Assemblies Upload Section */}
        <div>
          <div className="flex items-center space-x-3 mb-4">
            <FileSpreadsheet className="w-6 h-6 text-indigo-500" />
            <h2 className="text-xl font-semibold text-gray-800">
              Upload Assemblies (LAC)
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setAssemblyFile(e.target.files?.[0] || null)}
            />
            <Button
              onClick={handleAssemblyUpload}
              disabled={isUploading}
              className="bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] hover:from-[#2d7ae8] hover:to-[#1976D2] text-white border-0"
            >
              {isUploading ? "Uploading..." : "Upload Assemblies"}
            </Button>
          </div>
        </div>

        <hr className="my-6" />

        {/* 🟩 Locations Upload Section */}
        <div>
          <div className="flex items-center space-x-3 mb-4">
            <FileSpreadsheet className="w-6 h-6 text-amber-500" />
            <h2 className="text-xl font-semibold text-gray-800">
              Upload Locations (Polling Stations)
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setLocationFile(e.target.files?.[0] || null)}
            />
            <Button
              onClick={handleLocationUpload}
              disabled={isUploading}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {isUploading ? "Uploading..." : "Upload Locations"}
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        {isUploading && (
          <div className="w-full bg-gray-200 rounded-full h-3 mt-6">
            <div
              className="bg-gradient-to-r from-indigo-500 to-amber-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* 🔍 Filter and List */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Uploaded Locations
            </h2>

            <div className="flex flex-wrap items-center gap-4 mb-4">
              {/* 🏛️ District Filter */}
              <Select
                style={{ width: 250 }}
                value={selectedDistrict}
                onChange={(value) => {
                  setSelectedDistrict(value);
                  setSelectedAssembly("all");
                  fetchAssemblies(value);
                  fetchLocations(value); // fetch locations for district
                }}
                placeholder="Select District"
              >
                <Select.Option value="all">All Districts</Select.Option>
                {districts.map((d: any) => (
                  <Select.Option key={d.id} value={d.id}>
                    {d.district_name}
                  </Select.Option>
                ))}
              </Select>

              {/* 🗳️ Assembly Filter */}
              <Select
                style={{ width: 250 }}
                value={selectedAssembly}
                onChange={(value) => {
                  setSelectedAssembly(value);
                  fetchLocations(selectedDistrict, value);
                }}
                placeholder="Select Assembly"
                disabled={!assemblies.length}
              >
                <Select.Option value="all">All Assemblies</Select.Option>
                {assemblies.map((a: any) => (
                  <Select.Option key={a.id} value={a.id}>
                    {a.Assembly_Name} ({a.Assembly_No})
                  </Select.Option>
                ))}
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="bg-amber-100 text-gray-800 font-semibold text-left">
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">PS Name</th>
                  <th className="px-4 py-2">PS No.</th>
                  <th className="px-4 py-2">Location</th>
                  <th className="px-4 py-2">Assembly</th>
                </tr>
              </thead>
              <tbody>
                {locations.length ? (
                  locations.map((loc, index) => (
                    <tr
                      key={loc.documentId}
                      className="border-b hover:bg-amber-50 cursor-pointer text-gray-700"
                      //  👈 navigate to detail page
                    >
                      <td className="px-4 py-2">{index + 1}</td>
                      <td
                        className="px-4 py-2 font-medium text-blue-600 hover:underline"
                        onClick={() =>
                          router.push(`/locations/${loc.documentId}`)
                        }
                      >
                        {loc.PS_Name}
                      </td>
                      <td className="px-4 py-2">{loc.PS_No || "—"}</td>
                      <td className="px-4 py-2">{loc.PS_Location || "—"}</td>
                      <td className="px-4 py-2">
                        {loc.assembly?.Assembly_Name || "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center text-gray-500 py-4 italic"
                    >
                      No locations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
