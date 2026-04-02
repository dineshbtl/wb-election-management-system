"use client";

import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import bpi from "@/lib/api";
import { Input, Select, Spin, Skeleton } from "antd"; // using antd select for quick dropdown
import { useRouter } from "next/navigation";

export default function UploadAssembliesAndLocationsPage() {
  const { toast } = useToast();
  const [assemblyFile, setAssemblyFile] = useState<File | null>(null);
  const [locationFile, setLocationFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [loadingLocations, setLoadingLocations] = useState<boolean>(false);
  const [assemblies, setAssemblies] = useState<any[]>([]);
  // locations now holds only the current page of results
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedAssembly, setSelectedAssembly] = useState<string>("all");
  const [districts, setDistricts] = useState<any[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  // pageSize can be a number or 'all'
  const [pageSize, setPageSize] = useState<number | "all">(50);
  const [totalLocations, setTotalLocations] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const searchDebounce = useRef<number | null>(null);

  // Form states for manual creation
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

  // locations already page-scoped, so paginatedLocations === locations
  const paginatedLocations = locations;

  const router = useRouter();

  // helper: build base query with pagination and optional filters
  const buildLocationsUrl = (
    page: number,
    pSize: number | "all",
    search = "",
    assemblyId?: string,
    districtId?: string,
  ) => {
    let base = "/locations?populate=assembly";
    if (pSize !== "all")
      base += `&pagination[page]=${page}&pagination[pageSize]=${pSize}`;
    if (assemblyId && assemblyId !== "all")
      base += `&filters[assembly][id][$eq]=${assemblyId}`;
    else if (districtId && districtId !== "all")
      base += `&filters[assembly][district][id][$eq]=${districtId}`;
    if (search && search.trim().length) {
      // search by PS_No (contains)
      base += `&filters[PS_No][$eq]=${encodeURIComponent(search.trim())}`;
    }
    return base;
  };

  // fetch one page of locations
  const fetchLocations = async (
    page = 1,
    pSize: number | "all" = pageSize,
    search = searchTerm,
    districtId = selectedDistrict,
    assemblyId = selectedAssembly,
  ) => {
    try {
      setLoadingLocations(true);
      if (pSize === "all") {
        // fetch all pages in chunks of 1000 to avoid timeouts (streaming)
        const chunk = 1000;
        let pageNum = 1;
        let all: any[] = [];
        while (true) {
          const url = buildLocationsUrl(
            pageNum,
            chunk,
            search,
            assemblyId,
            districtId,
          );
          const res = await bpi.get(`${url}`);
          const data = res.data.data || [];
          const metaTotal = res.data.meta?.pagination?.total ?? null;
          if (metaTotal !== null) setTotalLocations(metaTotal);
          all = [...all, ...data];
          if (data.length < chunk) break;
          pageNum++;
        }
        setLocations(all);
      } else {
        const url = buildLocationsUrl(
          page,
          pSize,
          search,
          assemblyId,
          districtId,
        );
        const res = await bpi.get(url);
        setLocations(res.data.data || []);
        const total =
          res.data.meta?.pagination?.total ?? res.data.data?.length ?? 0;
        setTotalLocations(total);
      }
    } catch (err) {
      console.error("Error fetching locations:", err);
    } finally {
      setLoadingLocations(false);
    }
  };

  const fetchDistricts = async () => {
    try {
      const res = await bpi.get("/districts?pagination[pageSize]=1000");
      setDistricts(res.data.data);
    } catch (err) {
      console.error("Error fetching districts:", err);
    }
  };

  const fetchAssemblies = async (districtId?: string) => {
    try {
      let url = "/assemblies?pagination[pageSize]=1000&populate=district";
      if (districtId && districtId !== "all") {
        url += `&filters[district][id][$eq]=${districtId}`;
      }

      console.log("Fetching assemblies with URL:", url);
      const res = await bpi.get(url);
      console.log("Fetched assemblies:", res.data.data);
      setAssemblies(res.data.data);
    } catch (err) {
      console.error("Error fetching assemblies:", err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingInitial(true);
        await Promise.all([fetchDistricts(), fetchAssemblies()]);
        setTimeout(() => fetchLocations(1, 50, ""), 300); // small delay
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoadingInitial(false);
      }
    };

    loadData();
  }, []);

  // handle search with debounce
  const onSearchChange = (val: string) => {
    setSearchTerm(val);
    if (searchDebounce.current) window.clearTimeout(searchDebounce.current);
    searchDebounce.current = window.setTimeout(() => {
      setCurrentPage(1);
      fetchLocations(1, pageSize === "all" ? "all" : pageSize, val);
    }, 350);
  };

  // when page or pageSize or filters change, fetch
  useEffect(() => {
    // if pageSize is 'all' then fetch all (may take time)
    fetchLocations(
      currentPage,
      pageSize === "all" ? "all" : pageSize,
      searchTerm,
      selectedDistrict,
      selectedAssembly,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, selectedDistrict, selectedAssembly]);

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

        // 🟢 Ensure district exists
        let districtId = districtMap[districtName.toLowerCase()];
        if (!districtId) {
          const createDistrict = await bpi.post("/districts", {
            data: {
              district_name: districtName,
              state: state || null,
              Phase: Phase,
              // later you can add "district_coordinator" here if you know the user id
            },
          });

          console.log("Created district:", createDistrict);
          districtId = createDistrict.data.data.documentId;
          districtMap[districtName.toLowerCase()] = districtId;
        }

        // 🟢 Check if assembly exists
        const existing = await bpi.get(
          `/assemblies?filters[Assembly_No][$eq]=${encodeURIComponent(
            assemblyNo,
          )}`,
        );
        if (existing.data.data.length) continue;

        // 🟢 Create new assembly linked to district
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
      let skipped = [];

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

  // 🟦 Add District Manually
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
      fetchDistricts();
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

  // 🟦 Add Assembly Manually
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
      fetchAssemblies();
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

  // 🟦 Add Location Manually
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
      fetchLocations();
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

  const handleFullUpload = async () => {
    if (!locationFile) return;

    setIsUploading(true);
    setProgress(0);

    try {
      const buffer = await locationFile.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, {
        defval: null,
        raw: false,
      });

      // const normalizedRows = rows.map((r: any) => ({
      //   ...r,
      //   Latitude:
      //     r["Latitude"] !== null && r["Latitude"] !== undefined
      //       ? String(r["Latitude"]).trim()
      //       : null,
      //   Longitude:
      //     r["Longitude"] !== null && r["Longitude"] !== undefined
      //       ? String(r["Longitude"]).trim()
      //       : null,
      // }));

      const normalizedRows = rows.map((r: any) => {
        const lacRaw = r["LAC No."];

        let lacNo = null;
        let assemblyName = null;

        if (typeof lacRaw === "string") {
          const match = lacRaw.match(/^(\d+)\s*\((.+)\)$/);
          if (match) {
            lacNo = match[1]; // "6"
            assemblyName = match[2]; // "GOLAKGANJ"
          }
        }

        return {
          ...r,
          "LAC No.": lacNo,
          ASMBLY_NAME: assemblyName,
        };
      });

      // 🚀 Single API call
      await bpi.post("/bulk-upload/locations", {
        rows: normalizedRows,
      });

      toast({
        variant: "success",
        title: "Upload Successful",
        description: "Districts, Assemblies & Locations uploaded",
      });

      fetchDistricts();
      fetchAssemblies();
      fetchLocations();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: err.message || "Something went wrong",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 ">
      {loadingInitial ? (
        <div className="space-y-3 flex justify-center h-screen items-center align-middle border  animate-pulse">
          <Spin size="large" />
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          {/* existing table here */}
          <div className=" w-full mx-auto bg-white shadow-lg rounded-2xl p-8 space-y-10">
            {/* 🟪 Assemblies Upload Section 	*/}

            {/* <div>
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
            </div> */}

            {/* <hr className="my-6" /> */}

            {/* 🟩 Locations Upload Section*/}

            <div>
              <div className="flex items-center space-x-3 mb-4">
                <FileSpreadsheet className="w-6 h-6 text-amber-500" />
                <h2 className="text-xl font-semibold text-gray-800">
                  Upload Locations (Polling Stations)
                </h2>
              </div>
              <div className="flex items-center gap-4">
                {/* <input
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
                </Button> */}

                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setLocationFile(e.target.files?.[0] || null)}
                />

                <Button
                  onClick={handleFullUpload}
                  disabled={isUploading}
                  className="bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] text-white border-0"
                >
                  {isUploading
                    ? "Uploading..."
                    : "Upload Districts + Assemblies + Locations"}
                </Button>
              </div>
            </div>

            {/* Toggle for Manual Forms */}
            <div className="flex justify-center mt-6">
              <Button
                onClick={() => setShowForms(!showForms)}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                {showForms ? "Hide Manual Forms" : "Add Manually (Forms)"}
              </Button>
            </div>

            {/* 🟦 Manual Entry Forms */}
            {showForms && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 p-6 bg-blue-50 rounded-lg">
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
                          // Fetch assemblies for the selected district
                          fetchAssemblies(value);
                          // Reset assembly when district changes
                          setLocationForm((prev) => ({
                            ...prev,
                            assembly: "",
                          }));
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
                            (a: any) =>
                              a.district?.id === locationForm.district,
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
            {/* 🔍 Filter and List */}
            <div className="mt-5">
              <div className="lg:flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Uploaded Locations
                </h2>

                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <Input
                    type="search"
                    placeholder="Search by PS No."
                    className="border rounded px-3  w-48"
                    onChange={(e) => onSearchChange(e.target.value)}
                  />
                  {/* 🏛️ District Filter */}
                  <Select
                    style={{ width: 250 }}
                    value={selectedDistrict}
                    onChange={(value) => {
                      setSelectedDistrict(value);
                      setSelectedAssembly("all");
                      fetchAssemblies(value);
                      setCurrentPage(1);
                      // fetchLocations will be triggered by effect
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
                      setCurrentPage(1);
                      // fetchLocations will be triggered by effect
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

                  {/* 📊 Page size selection */}
                  <Select
                    style={{ width: 150 }}
                    value={pageSize}
                    onChange={(value) => {
                      setPageSize(value);
                      setCurrentPage(1);
                    }}
                  >
                    <Select.Option value={50}>Show 50</Select.Option>
                    <Select.Option value={100}>Show 100</Select.Option>
                    {/* <Select.Option value={200}>Show 200</Select.Option>
                <Select.Option value={500}>Show 500</Select.Option>
                <Select.Option value={"all"}>Show All</Select.Option> */}
                  </Select>
                </div>
              </div>

              {/* 🧾 Locations Table */}
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-b from-blue-50 to-blue-50 text-gray-800 font-semibold text-left">
                      <th className="px-4 py-2">#</th>
                      <th className="px-4 py-2">PS Name</th>
                      <th className="px-4 py-2">PS No.</th>
                      <th className="px-4 py-2">Location</th>
                      <th className="px-4 py-2">Assembly</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingLocations ? (
                      // Show skeleton loaders while fetching
                      [...Array(5)].map((_, index) => (
                        <tr key={`skeleton-${index}`} className="border-b">
                          <td className="px-4 py-2">
                            <Skeleton active paragraph={{ rows: 0 }} />
                          </td>
                          <td className="px-4 py-2">
                            <Skeleton active paragraph={{ rows: 0 }} />
                          </td>
                          <td className="px-4 py-2">
                            <Skeleton active paragraph={{ rows: 0 }} />
                          </td>
                          <td className="px-4 py-2">
                            <Skeleton active paragraph={{ rows: 0 }} />
                          </td>
                          <td className="px-4 py-2">
                            <Skeleton active paragraph={{ rows: 0 }} />
                          </td>
                        </tr>
                      ))
                    ) : paginatedLocations.length ? (
                      paginatedLocations.map((loc, index) => (
                        <tr
                          key={loc.documentId}
                          className="border-b hover:bg-gradient-to-b hover:from-blue-50 hover:to-blue-50 cursor-pointer text-gray-700"
                          onClick={() =>
                            router.push(`/locations/${loc.documentId}`)
                          }
                        >
                          <td className="px-4 py-2">
                            {(currentPage - 1) *
                              (pageSize === "all"
                                ? paginatedLocations.length
                                : (pageSize as number)) +
                              index +
                              1}
                          </td>
                          <td className="px-4 py-2 font-medium">
                            {loc.PS_Name}
                          </td>
                          <td className="px-4 py-2">{loc.PS_No || "—"}</td>
                          <td className="px-4 py-2">
                            {loc.PS_Location || "—"}
                          </td>
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

              {/* 🧭 Pagination Controls (server-driven) */}
              {pageSize !== "all" && totalLocations > (pageSize as number) && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-600">
                    Showing{" "}
                    <strong>
                      {(currentPage - 1) * (pageSize as number) + 1}-
                      {Math.min(
                        currentPage * (pageSize as number),
                        totalLocations,
                      )}
                    </strong>{" "}
                    of <strong>{totalLocations}</strong> entries
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      disabled={currentPage === 1}
                      onClick={() => {
                        setCurrentPage((p) => Math.max(p - 1, 1));
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page <strong>{currentPage}</strong> of{" "}
                      {Math.ceil(totalLocations / (pageSize as number))}
                    </span>
                    <Button
                      variant="outline"
                      disabled={
                        currentPage ===
                        Math.ceil(totalLocations / (pageSize as number))
                      }
                      onClick={() => {
                        setCurrentPage((p) =>
                          Math.min(
                            p + 1,
                            Math.ceil(totalLocations / (pageSize as number)),
                          ),
                        );
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
