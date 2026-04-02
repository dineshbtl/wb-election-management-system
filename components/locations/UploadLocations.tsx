"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import bpi from "@/lib/api";
import { Input, Select, Spin } from "antd";

type Props = {
  assemblies: any[];
  districts: any[];
  fetchAssemblies?: (districtId?: string) => Promise<void>;
  onRefresh?: () => void;
};

export default function UploadLocations({
  assemblies = [],
  districts = [],
  fetchAssemblies,
  onRefresh,
}: Props) {
  const { toast } = useToast();
  const [assemblyFile, setAssemblyFile] = useState<File | null>(null);
  const [locationFile, setLocationFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showForms, setShowForms] = useState(false);
  const [districtForm, setDistrictForm] = useState({
    district_name: "",
    state: "",
  });
  const [assemblyForm, setAssemblyForm] = useState({
    Assembly_Name: "",
    Assembly_No: "",
    district: "",
  });
  const [locationForm, setLocationForm] = useState({
    PS_Name: "",
    PS_No: "",
    PS_Location: "",
    Latitude: "",
    Longitude: "",
    assembly: "",
    district: "",
  });
  const [formLoading, setFormLoading] = useState(false);

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

      const existingDistrictsRes = await bpi.get(
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
        const assemblyName = r["ASMBLY_NAME"]?.trim();
        const districtName = r["DISTRICT_NAME"]?.trim();
        const state = r["STATE_NAME"]?.trim();
        const Phase = r["PHASE"]?.trim();

        if (!assemblyName || !assemblyNo || !districtName) continue;

        let districtId = districtMap[districtName.toLowerCase()];
        if (!districtId) {
          const createDistrict = await bpi.post("/districts", {
            data: {
              district_name: districtName,
              state: state || null,
              Phase: Phase,
            },
          });

          districtId = createDistrict.data.data.documentId;
          districtMap[districtName.toLowerCase()] = districtId;
        }

        const existing = await bpi.get(
          `/assemblies?filters[Assembly_No][$eq]=${encodeURIComponent(
            assemblyNo,
          )}`,
        );
        if (existing.data.data.length) continue;

        await bpi.post("/assemblies", {
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

      if (fetchAssemblies) await fetchAssemblies();
      onRefresh?.();
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

      const assembliesRes = await bpi.get(
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

      const existingRes = await bpi.get(
        "/locations?pagination[pageSize]=10000&populate=assembly",
      );
      const existingSet = new Set(
        existingRes.data.data.map((loc: any) =>
          `${loc.assembly?.Assembly_No || "none"}_${loc.PS_No}`.toLowerCase(),
        ),
      );

      const seenInExcel = new Set<string>();
      let uploadedCount = 0;
      let skipped: any[] = [];

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const assemblyNo = r["LAC No."]?.toString().trim();
        const psNo = r["PS No."]?.toString().trim();
        const psName = r["PS Name"]?.trim();
        const psLocation = r["PS Location (village)"]?.trim();
        const Latitude = r["Latitude"]?.toString().trim();
        const Longitude = r["Longitude"]?.toString().trim();

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
        await bpi.post("/locations", {
          data: {
            PS_No: psNo,
            PS_Name: psName,
            PS_Location: psLocation || null,
            assembly: assemblyId,
            Latitude: Latitude || null,
            Longitude: Longitude || null,
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
      onRefresh?.();
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

  const handleAddDistrict = async () => {
    if (!districtForm.district_name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "District name is required.",
      });
      return;
    }

    setFormLoading(true);
    try {
      await bpi.post("/districts", {
        data: {
          district_name: districtForm.district_name,
          state: districtForm.state || null,
        },
      });

      toast({
        variant: "success",
        title: "District Added",
        description: `${districtForm.district_name} added successfully.`,
      });

      setDistrictForm({ district_name: "", state: "" });
      onRefresh?.();
    } catch (err: any) {
      console.error("Error adding district:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err.response?.data?.error?.message || "Failed to add district.",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleAddAssembly = async () => {
    if (
      !assemblyForm.Assembly_Name.trim() ||
      !assemblyForm.Assembly_No.trim() ||
      !assemblyForm.district
    ) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Assembly Name, Number, and District are required.",
      });
      return;
    }

    setFormLoading(true);
    try {
      await bpi.post("/assemblies", {
        data: {
          Assembly_Name: assemblyForm.Assembly_Name,
          Assembly_No: assemblyForm.Assembly_No,
          district: assemblyForm.district,
        },
      });

      toast({
        variant: "success",
        title: "Assembly Added",
        description: `${assemblyForm.Assembly_Name} added successfully.`,
      });

      setAssemblyForm({ Assembly_Name: "", Assembly_No: "", district: "" });
      fetchAssemblies?.();
      onRefresh?.();
    } catch (err: any) {
      console.error("Error adding assembly:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err.response?.data?.error?.message || "Failed to add assembly.",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleAddLocation = async () => {
    if (
      !locationForm.PS_Name.trim() ||
      !locationForm.PS_No.trim() ||
      !locationForm.assembly
    ) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "PS Name, PS No, and Assembly are required.",
      });
      return;
    }

    setFormLoading(true);
    try {
      await bpi.post("/locations", {
        data: {
          PS_Name: locationForm.PS_Name,
          PS_No: locationForm.PS_No,
          PS_Location: locationForm.PS_Location || null,
          assembly: locationForm.assembly,
          Latitude: locationForm.Latitude || null,
          Longitude: locationForm.Longitude || null,
        },
      });

      toast({
        variant: "success",
        title: "Location Added",
        description: `${locationForm.PS_Name} added successfully.`,
      });

      setLocationForm({
        PS_Name: "",
        PS_No: "",
        PS_Location: "",
        Latitude: "",
        Longitude: "",
        assembly: "",
        district: "",
      });
      onRefresh?.();
    } catch (err: any) {
      console.error("Error adding location:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err.response?.data?.error?.message || "Failed to add location.",
      });
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div>
      <div className=" w-full mx-auto bg-white shadow-lg rounded-2xl p-8 space-y-6">
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
              className="bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] text-white border-0"
            >
              {isUploading ? "Uploading..." : "Upload Locations"}
            </Button>

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

        <div className="flex justify-center mt-2">
          <Button
            onClick={() => setShowForms(!showForms)}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            {showForms ? "Hide Manual Forms" : "Add Manually (Forms)"}
          </Button>
        </div>

        {isUploading && (
          <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
            <div
              className="bg-gradient-to-r from-indigo-500 to-amber-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {showForms && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 p-6 bg-blue-50 rounded-lg">
            {/* District Form */}
            <div className="border rounded-lg p-4 bg-white shadow">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                ➕ Add District
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    District Name *
                  </label>
                  <Input
                    placeholder="Enter district name"
                    value={districtForm.district_name}
                    onChange={(e) =>
                      setDistrictForm({
                        ...districtForm,
                        district_name: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <Input
                    placeholder="Enter state (optional)"
                    value={districtForm.state}
                    onChange={(e) =>
                      setDistrictForm({
                        ...districtForm,
                        state: e.target.value,
                      })
                    }
                  />
                </div>
                <Button
                  onClick={handleAddDistrict}
                  disabled={formLoading}
                  className="w-full bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] hover:from-[#2d7ae8] hover:to-[#1976D2] text-white border-0"
                >
                  {formLoading ? "Adding..." : "Add District"}
                </Button>
              </div>
            </div>

            {/* Assembly Form */}
            <div className="border rounded-lg p-4 bg-white shadow">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                ➕ Add Assembly
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select District *
                  </label>
                  <Select
                    style={{ width: "100%" }}
                    placeholder="Select District"
                    value={assemblyForm.district || undefined}
                    onChange={(value) =>
                      setAssemblyForm({ ...assemblyForm, district: value })
                    }
                  >
                    {districts.map((d: any) => (
                      <Select.Option key={d.id} value={d.id}>
                        {d.district_name}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assembly Name *
                  </label>
                  <Input
                    placeholder="Enter assembly name"
                    value={assemblyForm.Assembly_Name}
                    onChange={(e) =>
                      setAssemblyForm({
                        ...assemblyForm,
                        Assembly_Name: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assembly No. *
                  </label>
                  <Input
                    placeholder="Enter assembly number"
                    value={assemblyForm.Assembly_No}
                    onChange={(e) =>
                      setAssemblyForm({
                        ...assemblyForm,
                        Assembly_No: e.target.value,
                      })
                    }
                  />
                </div>
                <Button
                  onClick={handleAddAssembly}
                  disabled={formLoading}
                  className="w-full bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] hover:from-[#2d7ae8] hover:to-[#1976D2] text-white border-0"
                >
                  {formLoading ? "Adding..." : "Add Assembly"}
                </Button>
              </div>
            </div>

            {/* Location Form */}
            <div className="border rounded-lg p-4 bg-white shadow">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                ➕ Add Location
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select District *
                  </label>
                  <Select
                    style={{ width: "100%" }}
                    placeholder="Select District"
                    value={locationForm.district || undefined}
                    onChange={(value) => {
                      setLocationForm({ ...locationForm, district: value });
                      fetchAssemblies?.(value);
                      setLocationForm((prev) => ({ ...prev, assembly: "" }));
                    }}
                  >
                    {districts.map((d: any) => (
                      <Select.Option key={d.id} value={d.id}>
                        {d.district_name}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Assembly *
                  </label>
                  <Select
                    style={{ width: "100%" }}
                    placeholder="Select Assembly"
                    value={locationForm.assembly || undefined}
                    onChange={(value) =>
                      setLocationForm({ ...locationForm, assembly: value })
                    }
                    disabled={!locationForm.district}
                  >
                    {assemblies
                      .filter(
                        (a: any) => a.district?.id === locationForm.district,
                      )
                      .map((a: any) => (
                        <Select.Option key={a.id} value={a.id}>
                          {a.Assembly_Name}
                        </Select.Option>
                      ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PS Name *
                  </label>
                  <Input
                    placeholder="Enter PS name"
                    value={locationForm.PS_Name}
                    onChange={(e) =>
                      setLocationForm({
                        ...locationForm,
                        PS_Name: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PS No. *
                  </label>
                  <Input
                    placeholder="Enter PS number"
                    value={locationForm.PS_No}
                    onChange={(e) =>
                      setLocationForm({
                        ...locationForm,
                        PS_No: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location (Village)
                  </label>
                  <Input
                    placeholder="Enter village/location"
                    value={locationForm.PS_Location}
                    onChange={(e) =>
                      setLocationForm({
                        ...locationForm,
                        PS_Location: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Latitude
                    </label>
                    <Input
                      placeholder="Lat"
                      value={locationForm.Latitude}
                      onChange={(e) =>
                        setLocationForm({
                          ...locationForm,
                          Latitude: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Longitude
                    </label>
                    <Input
                      placeholder="Long"
                      value={locationForm.Longitude}
                      onChange={(e) =>
                        setLocationForm({
                          ...locationForm,
                          Longitude: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <Button
                  onClick={handleAddLocation}
                  disabled={formLoading}
                  className="w-full bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] hover:from-[#2d7ae8] hover:to-[#1976D2] text-white border-0"
                >
                  {formLoading ? "Adding..." : "Add Location"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
