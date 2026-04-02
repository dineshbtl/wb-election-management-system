// "use client";

// import React, { useState, useEffect, useRef } from "react";
// import * as XLSX from "xlsx";
// import { FileSpreadsheet } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { useToast } from "@/hooks/use-toast";
// import bpi from "@/lib/api";
// import { Input, Select, Spin, Skeleton } from "antd"; // using antd select for quick dropdown
// import { useRouter } from "next/navigation";
// import Link from "next/link";

// const page = () => {
//   const { toast } = useToast();
//   const [assemblyFile, setAssemblyFile] = useState<File | null>(null);
//   const [locationFile, setLocationFile] = useState<File | null>(null);
//   const [isUploading, setIsUploading] = useState(false);
//   const [progress, setProgress] = useState(0);
//   const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
//   const [loadingLocations, setLoadingLocations] = useState<boolean>(false);
//   const [assemblies, setAssemblies] = useState<any[]>([]);
//   // locations now holds only the current page of results
//   const [locations, setLocations] = useState<any[]>([]);
//   const [selectedAssembly, setSelectedAssembly] = useState<string>("all");
//   const [districts, setDistricts] = useState<any[]>([]);
//   const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
//   const [currentPage, setCurrentPage] = useState(1);
//   // pageSize can be a number or 'all'
//   const [pageSize, setPageSize] = useState<number | "all">(50);
//   const [totalLocations, setTotalLocations] = useState<number>(0);
//   const [searchTerm, setSearchTerm] = useState<string>("");
//   const searchDebounce = useRef<number | null>(null);

//   // Form states for manual creation
//   const [showForms, setShowForms] = useState(false);
//   const [districtForm, setDistrictForm] = useState({
//     district_name: "",
//     state: "",
//   });
//   const [assemblyForm, setAssemblyForm] = useState({
//     Assembly_Name: "",
//     Assembly_No: "",
//     district: "",
//   });
//   const [locationForm, setLocationForm] = useState({
//     PS_Name: "",
//     PS_No: "",
//     PS_Location: "",
//     Latitude: "",
//     Longitude: "",
//     assembly: "",
//     district: "",
//   });
//   const [formLoading, setFormLoading] = useState(false);

//   useEffect(() => {
//     const loadData = async () => {
//       try {
//         setLoadingInitial(true);
//         await Promise.all([fetchDistricts(), fetchAssemblies()]);
//         setTimeout(() => fetchLocations(1, 50, ""), 300); // small delay
//       } catch (err) {
//         console.error("Error loading data:", err);
//       } finally {
//         setLoadingInitial(false);
//       }
//     };

//     loadData();
//   }, []);

//   // helper: build base query with pagination and optional filters
//   const buildLocationsUrl = (
//     page: number,
//     pSize: number | "all",
//     search = "",
//     assemblyId?: string,
//     districtId?: string,
//   ) => {
//     let base = "/locations?populate=assembly";
//     if (pSize !== "all")
//       base += `&pagination[page]=${page}&pagination[pageSize]=${pSize}`;
//     if (assemblyId && assemblyId !== "all")
//       base += `&filters[assembly][id][$eq]=${assemblyId}`;
//     else if (districtId && districtId !== "all")
//       base += `&filters[assembly][district][id][$eq]=${districtId}`;
//     if (search && search.trim().length) {
//       // search by PS_No (contains)
//       base += `&filters[PS_No][$eq]=${encodeURIComponent(search.trim())}`;
//     }
//     return base;
//   };

//   const fetchLocations = async (
//     page = 1,
//     pSize: number | "all" = pageSize,
//     search = searchTerm,
//     districtId = selectedDistrict,
//     assemblyId = selectedAssembly,
//   ) => {
//     try {
//       setLoadingLocations(true);
//       if (pSize === "all") {
//         // fetch all pages in chunks of 1000 to avoid timeouts (streaming)
//         const chunk = 1000;
//         let pageNum = 1;
//         let all: any[] = [];
//         while (true) {
//           const url = buildLocationsUrl(
//             pageNum,
//             chunk,
//             search,
//             assemblyId,
//             districtId,
//           );
//           const res = await bpi.get(`${url}`);
//           const data = res.data.data || [];
//           const metaTotal = res.data.meta?.pagination?.total ?? null;
//           if (metaTotal !== null) setTotalLocations(metaTotal);
//           all = [...all, ...data];
//           if (data.length < chunk) break;
//           pageNum++;
//         }
//         setLocations(all);
//       } else {
//         const url = buildLocationsUrl(
//           page,
//           pSize,
//           search,
//           assemblyId,
//           districtId,
//         );
//         const res = await bpi.get(url);
//         setLocations(res.data.data || []);
//         const total =
//           res.data.meta?.pagination?.total ?? res.data.data?.length ?? 0;
//         setTotalLocations(total);
//       }
//     } catch (err) {
//       console.error("Error fetching locations:", err);
//     } finally {
//       setLoadingLocations(false);
//     }
//   };

//   // 🟦 Add District Manually
//   const handleAddDistrict = async () => {
//     if (!districtForm.district_name.trim()) {
//       toast({
//         variant: "destructive",
//         title: "Validation Error",
//         description: "District name is required.",
//       });
//       return;
//     }

//     setFormLoading(true);
//     try {
//       await bpi.post("/districts", {
//         data: {
//           district_name: districtForm.district_name,
//           state: districtForm.state || null,
//         },
//       });

//       toast({
//         variant: "success",
//         title: "District Added",
//         description: `${districtForm.district_name} added successfully.`,
//       });

//       setDistrictForm({ district_name: "", state: "" });
//       fetchDistricts();
//     } catch (err: any) {
//       console.error("Error adding district:", err);
//       toast({
//         variant: "destructive",
//         title: "Error",
//         description:
//           err.response?.data?.error?.message || "Failed to add district.",
//       });
//     } finally {
//       setFormLoading(false);
//     }
//   };

//   const fetchDistricts = async () => {
//     try {
//       const res = await bpi.get("/districts?pagination[pageSize]=1000");
//       setDistricts(res.data.data);
//     } catch (err) {
//       console.error("Error fetching districts:", err);
//     }
//   };

//   const fetchAssemblies = async (districtId?: string) => {
//     try {
//       let url = "/assemblies?pagination[pageSize]=1000&populate=district";
//       if (districtId && districtId !== "all") {
//         url += `&filters[district][id][$eq]=${districtId}`;
//       }

//       console.log("Fetching assemblies with URL:", url);
//       const res = await bpi.get(url);
//       console.log("Fetched assemblies:", res.data.data);
//       setAssemblies(res.data.data);
//     } catch (err) {
//       console.error("Error fetching assemblies:", err);
//     }
//   };

//   const handleFullUpload = async () => {
//     if (!locationFile) return;

//     setIsUploading(true);
//     setProgress(0);

//     try {
//       const buffer = await locationFile.arrayBuffer();
//       const workbook = XLSX.read(buffer);
//       const sheet = workbook.Sheets[workbook.SheetNames[0]];
//       const rows = XLSX.utils.sheet_to_json(sheet, {
//         defval: null,
//         raw: false,
//       });

//       const normalizedRows = rows.map((r: any) => {
//         const lacRaw = r["LAC No."];

//         let lacNo = null;
//         let assemblyName = null;

//         if (typeof lacRaw === "string") {
//           const match = lacRaw.match(/^(\d+)\s*\((.+)\)$/);
//           if (match) {
//             lacNo = match[1]; // "6"
//             assemblyName = match[2]; // "GOLAKGANJ"
//           }
//         }

//         return {
//           ...r,
//           "LAC No.": lacNo,
//           ASMBLY_NAME: assemblyName,
//         };
//       });

//       // 🚀 Upload in chunks of 5000 records to avoid payload size limit
//       const chunkSize = 5000;
//       const totalChunks = Math.ceil(normalizedRows.length / chunkSize);

//       for (let i = 0; i < totalChunks; i++) {
//         const start = i * chunkSize;
//         const end = Math.min(start + chunkSize, normalizedRows.length);
//         const chunk = normalizedRows.slice(start, end);

//         await bpi.post("/bulk-upload/locations", {
//           rows: chunk,
//         });

//         // Update progress
//         const progressPercent = Math.round(((i + 1) / totalChunks) * 100);
//         setProgress(progressPercent);
//         console.log(
//           `Uploaded chunk ${i + 1}/${totalChunks} (${progressPercent}%)`,
//         );
//       }

//       toast({
//         variant: "success",
//         title: "Upload Successful",
//         description: `All ${normalizedRows.length} locations uploaded successfully`,
//       });

//       fetchDistricts();
//       fetchAssemblies();
//     } catch (err: any) {
//       toast({
//         variant: "destructive",
//         title: "Upload Failed",
//         description: err.message || "Something went wrong",
//       });
//     } finally {
//       setIsUploading(false);
//     }
//   };

//   const handleAddAssembly = async () => {
//     if (
//       !assemblyForm.Assembly_Name.trim() ||
//       !assemblyForm.Assembly_No.trim() ||
//       !assemblyForm.district
//     ) {
//       toast({
//         variant: "destructive",
//         title: "Validation Error",
//         description: "Assembly Name, Number, and District are required.",
//       });
//       return;
//     }

//     setFormLoading(true);
//     try {
//       await bpi.post("/assemblies", {
//         data: {
//           Assembly_Name: assemblyForm.Assembly_Name,
//           Assembly_No: assemblyForm.Assembly_No,
//           district: assemblyForm.district,
//         },
//       });

//       toast({
//         variant: "success",
//         title: "Assembly Added",
//         description: `${assemblyForm.Assembly_Name} added successfully.`,
//       });

//       setAssemblyForm({ Assembly_Name: "", Assembly_No: "", district: "" });
//       fetchAssemblies();
//     } catch (err: any) {
//       console.error("Error adding assembly:", err);
//       toast({
//         variant: "destructive",
//         title: "Error",
//         description:
//           err.response?.data?.error?.message || "Failed to add assembly.",
//       });
//     } finally {
//       setFormLoading(false);
//     }
//   };

//   const handleAddLocation = async () => {
//     if (
//       !locationForm.PS_Name.trim() ||
//       !locationForm.PS_No.trim() ||
//       !locationForm.assembly
//     ) {
//       toast({
//         variant: "destructive",
//         title: "Validation Error",
//         description: "PS Name, PS No, and Assembly are required.",
//       });
//       return;
//     }

//     setFormLoading(true);
//     try {
//       await bpi.post("/locations", {
//         data: {
//           PS_Name: locationForm.PS_Name,
//           PS_No: locationForm.PS_No,
//           PS_Location: locationForm.PS_Location || null,
//           assembly: locationForm.assembly,
//           Latitude: locationForm.Latitude || null,
//           Longitude: locationForm.Longitude || null,
//         },
//       });

//       toast({
//         variant: "success",
//         title: "Location Added",
//         description: `${locationForm.PS_Name} added successfully.`,
//       });

//       setLocationForm({
//         PS_Name: "",
//         PS_No: "",
//         PS_Location: "",
//         Latitude: "",
//         Longitude: "",
//         assembly: "",
//         district: "",
//       });
//       fetchLocations();
//     } catch (err: any) {
//       console.error("Error adding location:", err);
//       toast({
//         variant: "destructive",
//         title: "Error",
//         description:
//           err.response?.data?.error?.message || "Failed to add location.",
//       });
//     } finally {
//       setFormLoading(false);
//     }
//   };

//   return (
//     <div>
//       <div>
//         <div className="flex items-center space-x-3 mb-4">
//           <FileSpreadsheet className="w-6 h-6 text-amber-500" />
//           <h2 className="text-xl font-semibold text-gray-800">
//             Upload Locations (Polling Stations)
//           </h2>
//         </div>
//         <div className="flex items-center gap-4">
//           {/* <input
//                       type="file"
//                       accept=".xlsx,.xls"
//                       onChange={(e) => setLocationFile(e.target.files?.[0] || null)}
//                     />
//                     <Button
//                       onClick={handleLocationUpload}
//                       disabled={isUploading}
//                       className="bg-amber-500 hover:bg-amber-600 text-white"
//                     >
//                       {isUploading ? "Uploading..." : "Upload Locations"}
//                     </Button> */}

//           <input
//             type="file"
//             accept=".xlsx,.xls"
//             onChange={(e) => setLocationFile(e.target.files?.[0] || null)}
//           />

//           <Button
//             onClick={handleFullUpload}
//             disabled={isUploading}
//             className="bg-indigo-600 text-white"
//           >
//             {isUploading
//               ? "Uploading..."
//               : "Upload Districts + Assemblies + Locations"}
//           </Button>
//         </div>
//       </div>

//       {/* Toggle for Manual Forms */}
//       <div className="flex justify-center mt-6">
//         <Button
//           onClick={() => setShowForms(!showForms)}
//           className="bg-green-500 hover:bg-green-600 text-white"
//         >
//           {showForms ? "Hide Manual Forms" : "Add Manually (Forms)"}
//         </Button>
//       </div>

//       {/* 🟦 Manual Entry Forms */}
//       {showForms && (
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 p-6 bg-blue-50 rounded-lg">
//           {/* District Form */}
//           <div className="border rounded-lg p-4 bg-white shadow">
//             <h3 className="text-lg font-semibold text-gray-800 mb-4">
//               ➕ Add District
//             </h3>
//             <div className="space-y-3">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   District Name *
//                 </label>
//                 <Input
//                   placeholder="Enter district name"
//                   value={districtForm.district_name}
//                   onChange={(e) =>
//                     setDistrictForm({
//                       ...districtForm,
//                       district_name: e.target.value,
//                     })
//                   }
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   State
//                 </label>
//                 <Input
//                   placeholder="Enter state (optional)"
//                   value={districtForm.state}
//                   onChange={(e) =>
//                     setDistrictForm({
//                       ...districtForm,
//                       state: e.target.value,
//                     })
//                   }
//                 />
//               </div>
//               <Button
//                 onClick={handleAddDistrict}
//                 disabled={formLoading}
//                 className="w-full bg-blue-500 hover:bg-blue-600 text-white"
//               >
//                 {formLoading ? "Adding..." : "Add District"}
//               </Button>
//             </div>
//           </div>

//           {/* Assembly Form */}
//           <div className="border rounded-lg p-4 bg-white shadow">
//             <h3 className="text-lg font-semibold text-gray-800 mb-4">
//               ➕ Add Assembly
//             </h3>
//             <div className="space-y-3">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Select District *
//                 </label>
//                 <Select
//                   style={{ width: "100%" }}
//                   placeholder="Select District"
//                   value={assemblyForm.district || undefined}
//                   onChange={(value) =>
//                     setAssemblyForm({ ...assemblyForm, district: value })
//                   }
//                 >
//                   {districts.map((d: any) => (
//                     <Select.Option key={d.id} value={d.id}>
//                       {d.district_name}
//                     </Select.Option>
//                   ))}
//                 </Select>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Assembly Name *
//                 </label>
//                 <Input
//                   placeholder="Enter assembly name"
//                   value={assemblyForm.Assembly_Name}
//                   onChange={(e) =>
//                     setAssemblyForm({
//                       ...assemblyForm,
//                       Assembly_Name: e.target.value,
//                     })
//                   }
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Assembly No. *
//                 </label>
//                 <Input
//                   placeholder="Enter assembly number"
//                   value={assemblyForm.Assembly_No}
//                   onChange={(e) =>
//                     setAssemblyForm({
//                       ...assemblyForm,
//                       Assembly_No: e.target.value,
//                     })
//                   }
//                 />
//               </div>
//               <Button
//                 onClick={handleAddAssembly}
//                 disabled={formLoading}
//                 className="w-full bg-blue-500 hover:bg-blue-600 text-white"
//               >
//                 {formLoading ? "Adding..." : "Add Assembly"}
//               </Button>
//             </div>
//           </div>

//           {/* Location Form */}
//           <div className="border rounded-lg p-4 bg-white shadow">
//             <h3 className="text-lg font-semibold text-gray-800 mb-4">
//               ➕ Add Location
//             </h3>
//             <div className="space-y-3">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Select District *
//                 </label>
//                 <Select
//                   style={{ width: "100%" }}
//                   placeholder="Select District"
//                   value={locationForm.district || undefined}
//                   onChange={(value) => {
//                     setLocationForm({ ...locationForm, district: value });
//                     // Fetch assemblies for the selected district
//                     fetchAssemblies(value);
//                     // Reset assembly when district changes
//                     setLocationForm((prev) => ({
//                       ...prev,
//                       assembly: "",
//                     }));
//                   }}
//                 >
//                   {districts.map((d: any) => (
//                     <Select.Option key={d.id} value={d.id}>
//                       {d.district_name}
//                     </Select.Option>
//                   ))}
//                 </Select>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Select Assembly *
//                 </label>
//                 <Select
//                   style={{ width: "100%" }}
//                   placeholder="Select Assembly"
//                   value={locationForm.assembly || undefined}
//                   onChange={(value) =>
//                     setLocationForm({ ...locationForm, assembly: value })
//                   }
//                   disabled={!locationForm.district}
//                 >
//                   {assemblies
//                     .filter(
//                       (a: any) => a.district?.id === locationForm.district,
//                     )
//                     .map((a: any) => (
//                       <Select.Option key={a.id} value={a.id}>
//                         {a.Assembly_Name}
//                       </Select.Option>
//                     ))}
//                 </Select>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   PS Name *
//                 </label>
//                 <Input
//                   placeholder="Enter PS name"
//                   value={locationForm.PS_Name}
//                   onChange={(e) =>
//                     setLocationForm({
//                       ...locationForm,
//                       PS_Name: e.target.value,
//                     })
//                   }
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   PS No. *
//                 </label>
//                 <Input
//                   placeholder="Enter PS number"
//                   value={locationForm.PS_No}
//                   onChange={(e) =>
//                     setLocationForm({
//                       ...locationForm,
//                       PS_No: e.target.value,
//                     })
//                   }
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Location (Village)
//                 </label>
//                 <Input
//                   placeholder="Enter village/location"
//                   value={locationForm.PS_Location}
//                   onChange={(e) =>
//                     setLocationForm({
//                       ...locationForm,
//                       PS_Location: e.target.value,
//                     })
//                   }
//                 />
//               </div>
//               <div className="grid grid-cols-2 gap-2">
//                 <div>
//                   <label className="block text-xs font-medium text-gray-700 mb-1">
//                     Latitude
//                   </label>
//                   <Input
//                     placeholder="Lat"
//                     value={locationForm.Latitude}
//                     onChange={(e) =>
//                       setLocationForm({
//                         ...locationForm,
//                         Latitude: e.target.value,
//                       })
//                     }
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-xs font-medium text-gray-700 mb-1">
//                     Longitude
//                   </label>
//                   <Input
//                     placeholder="Long"
//                     value={locationForm.Longitude}
//                     onChange={(e) =>
//                       setLocationForm({
//                         ...locationForm,
//                         Longitude: e.target.value,
//                       })
//                     }
//                   />
//                 </div>
//               </div>
//               <Button
//                 onClick={handleAddLocation}
//                 disabled={formLoading}
//                 className="w-full bg-blue-500 hover:bg-blue-600 text-white"
//               >
//                 {formLoading ? "Adding..." : "Add Location"}
//               </Button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Progress Bar */}
//       {isUploading && (
//         <div className="w-full bg-gray-200 rounded-full h-3 mt-6">
//           <div
//             className="bg-gradient-to-r from-indigo-500 to-amber-500 h-3 rounded-full transition-all duration-300"
//             style={{ width: `${progress}%` }}
//           />
//         </div>
//       )}
//     </div>
//   );
// };

// export default page;

"use client";

import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import {
  FileSpreadsheet,
  Upload,
  MapPin,
  Building2,
  Map,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Loader2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import bpi from "@/lib/api";
import { Input, Select, Spin, Skeleton } from "antd";
import { useRouter } from "next/navigation";
import Link from "next/link";

const page = () => {
  const { toast } = useToast();
  const [assemblyFile, setAssemblyFile] = useState<File | null>(null);
  const [locationFile, setLocationFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [loadingLocations, setLoadingLocations] = useState<boolean>(false);
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedAssembly, setSelectedAssembly] = useState<string>("all");
  const [districts, setDistricts] = useState<any[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "all">(50);
  const [totalLocations, setTotalLocations] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const searchDebounce = useRef<number | null>(null);
  const [showForms, setShowForms] = useState(false);
  const [activeForm, setActiveForm] = useState<
    "district" | "assembly" | "location"
  >("district");
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
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingInitial(true);
        await Promise.all([fetchDistricts(), fetchAssemblies()]);
        setTimeout(() => fetchLocations(1, 50, ""), 300);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoadingInitial(false);
      }
    };
    loadData();
  }, []);

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
    if (search && search.trim().length)
      base += `&filters[PS_No][$eq]=${encodeURIComponent(search.trim())}`;
    return base;
  };

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
      if (districtId && districtId !== "all")
        url += `&filters[district][id][$eq]=${districtId}`;
      const res = await bpi.get(url);
      setAssemblies(res.data.data);
    } catch (err) {
      console.error("Error fetching assemblies:", err);
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
      const normalizedRows = rows.map((r: any) => {
        const lacRaw = r["LAC No."];
        let lacNo = null;
        let assemblyName = null;
        if (typeof lacRaw === "string") {
          const match = lacRaw.match(/^(\d+)\s*\((.+)\)$/);
          if (match) {
            lacNo = match[1];
            assemblyName = match[2];
          }
        }
        return { ...r, "LAC No.": lacNo, ASMBLY_NAME: assemblyName };
      });
      const chunkSize = 5000;
      const totalChunks = Math.ceil(normalizedRows.length / chunkSize);
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, normalizedRows.length);
        for (const row of normalizedRows.slice(start, end)) {
          await bpi.post("/locations", {
            data: {
              PS_Name: row["PS Name"],
              PS_No: row["PS No"],
              PS_Location: row["Village"] || null,
              Latitude: row["Latitude"] || null,
              Longitude: row["Longitude"] || null,
              assembly: row["assemblyId"], // map properly
            },
          });
        }

        setProgress(Math.round(((i + 1) / totalChunks) * 100));
      }
      toast({
        variant: "success",
        title: "Upload Successful",
        description: `All ${normalizedRows.length} locations uploaded successfully`,
      });
      fetchDistricts();
      fetchAssemblies();
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
      fetchLocations();
    } catch (err: any) {
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

  const formTabs = [
    { id: "district", label: "District", icon: Map },
    { id: "assembly", label: "Assembly", icon: Building2 },
    { id: "location", label: "Location", icon: MapPin },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Polling Station Manager
              </h1>
              <p className="text-sm text-gray-500">
                Upload or manually add districts, assemblies, and locations
              </p>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-500" />
            Bulk Upload via Excel
          </h2>

          {/* Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (
                file &&
                (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))
              )
                setLocationFile(file);
            }}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
              ${dragOver ? "border-indigo-400 bg-indigo-50" : locationFile ? "border-green-300 bg-green-50" : "border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/40"}`}
          >
            <input
              type="file"
              accept=".xlsx,.xls"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => setLocationFile(e.target.files?.[0] || null)}
            />
            {locationFile ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                <p className="font-medium text-green-700">
                  {locationFile.name}
                </p>
                <p className="text-xs text-green-500">
                  {(locationFile.size / 1024).toFixed(1)} KB · Click to change
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-1">
                  <Upload className="w-5 h-5 text-indigo-500" />
                </div>
                <p className="font-medium text-gray-700">
                  Drop your Excel file here
                </p>
                <p className="text-sm text-gray-400">
                  or click to browse &nbsp;·&nbsp; .xlsx, .xls
                </p>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {isUploading && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-violet-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <Button
            onClick={handleFullUpload}
            disabled={isUploading || !locationFile}
            className="mt-4 w-full bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] hover:from-[#2d7ae8] hover:to-[#1976D2] text-white rounded-xl h-11 font-medium disabled:opacity-50 border-0"
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading (
                {progress}%)
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Upload className="w-4 h-4" /> Upload Districts + Assemblies +
                Locations
              </span>
            )}
          </Button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            or add manually
          </span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Manual Entry */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setShowForms(!showForms)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                <Plus className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-800 text-sm">
                  Manual Entry Forms
                </p>
                <p className="text-xs text-gray-400">
                  Add districts, assemblies, or locations one at a time
                </p>
              </div>
            </div>
            {showForms ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {showForms && (
            <div className="border-t border-gray-100">
              {/* Tab Bar */}
              <div className="flex border-b border-gray-100 bg-gray-50">
                {formTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveForm(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all
                        ${
                          activeForm === tab.id
                            ? "bg-white text-indigo-600 border-b-2 border-indigo-500 shadow-sm"
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="p-6">
                {/* District Form */}
                {activeForm === "district" && (
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        District Name <span className="text-red-400">*</span>
                      </label>
                      <Input
                        placeholder="e.g. Cooch Behar"
                        size="large"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        State{" "}
                        <span className="text-gray-400 font-normal">
                          (optional)
                        </span>
                      </label>
                      <Input
                        placeholder="e.g. West Bengal"
                        size="large"
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
                      className="bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] hover:from-[#2d7ae8] hover:to-[#1976D2] text-white rounded-xl px-6 h-10 border-0"
                    >
                      {formLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Adding...
                        </span>
                      ) : (
                        "Add District"
                      )}
                    </Button>
                  </div>
                )}

                {/* Assembly Form */}
                {activeForm === "assembly" && (
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        District <span className="text-red-400">*</span>
                      </label>
                      <Select
                        style={{ width: "100%" }}
                        size="large"
                        placeholder="Select a district"
                        value={assemblyForm.district || undefined}
                        onChange={(value) =>
                          setAssemblyForm({ ...assemblyForm, district: value })
                        }
                        showSearch
                        filterOption={(input, option) =>
                          (option?.children as string)
                            ?.toLowerCase()
                            .includes(input.toLowerCase())
                        }
                      >
                        {districts.map((d: any) => (
                          <Select.Option key={d.id} value={d.id}>
                            {d.district_name}
                          </Select.Option>
                        ))}
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Assembly Name <span className="text-red-400">*</span>
                        </label>
                        <Input
                          placeholder="e.g. GOLAKGANJ"
                          size="large"
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
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Assembly No. <span className="text-red-400">*</span>
                        </label>
                        <Input
                          placeholder="e.g. 6"
                          size="large"
                          value={assemblyForm.Assembly_No}
                          onChange={(e) =>
                            setAssemblyForm({
                              ...assemblyForm,
                              Assembly_No: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleAddAssembly}
                      disabled={formLoading}
                      className="bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] hover:from-[#2d7ae8] hover:to-[#1976D2] text-white rounded-xl px-6 h-10 border-0"
                    >
                      {formLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Adding...
                        </span>
                      ) : (
                        "Add Assembly"
                      )}
                    </Button>
                  </div>
                )}

                {/* Location Form */}
                {activeForm === "location" && (
                  <div className="space-y-4 max-w-lg">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          District <span className="text-red-400">*</span>
                        </label>
                        <Select
                          style={{ width: "100%" }}
                          size="large"
                          placeholder="Select district"
                          value={locationForm.district || undefined}
                          onChange={(value) => {
                            setLocationForm({
                              ...locationForm,
                              district: value,
                              assembly: "",
                            });
                            fetchAssemblies(value);
                          }}
                          showSearch
                          filterOption={(input, option) =>
                            (option?.children as string)
                              ?.toLowerCase()
                              .includes(input.toLowerCase())
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
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Assembly <span className="text-red-400">*</span>
                        </label>
                        <Select
                          style={{ width: "100%" }}
                          size="large"
                          placeholder="Select assembly"
                          value={locationForm.assembly || undefined}
                          onChange={(value) =>
                            setLocationForm({
                              ...locationForm,
                              assembly: value,
                            })
                          }
                          disabled={!locationForm.district}
                          showSearch
                          filterOption={(input, option) =>
                            (option?.children as string)
                              ?.toLowerCase()
                              .includes(input.toLowerCase())
                          }
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
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          PS Name <span className="text-red-400">*</span>
                        </label>
                        <Input
                          placeholder="Polling station name"
                          size="large"
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
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          PS No. <span className="text-red-400">*</span>
                        </label>
                        <Input
                          placeholder="e.g. 42"
                          size="large"
                          value={locationForm.PS_No}
                          onChange={(e) =>
                            setLocationForm({
                              ...locationForm,
                              PS_No: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Village / Location
                      </label>
                      <Input
                        placeholder="e.g. Village Mohpur"
                        size="large"
                        value={locationForm.PS_Location}
                        onChange={(e) =>
                          setLocationForm({
                            ...locationForm,
                            PS_Location: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Latitude
                        </label>
                        <Input
                          placeholder="e.g. 26.3245"
                          size="large"
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
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Longitude
                        </label>
                        <Input
                          placeholder="e.g. 89.4456"
                          size="large"
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
                      className="bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] hover:from-[#2d7ae8] hover:to-[#1976D2] text-white rounded-xl px-6 h-10 border-0"
                    >
                      {formLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Adding...
                        </span>
                      ) : (
                        "Add Location"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default page;
