"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  Table as TableIcon,
  Grid,
  UserPlus,
  Eye,
  MoreVertical,
  FileEdit,
  FileSpreadsheet,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Select, Modal, message, Switch, Checkbox } from "antd";
import api from "@/lib/api";
import { exportElectionSurveysToExcel } from "@/lib/exportSurveysToExcel";
import CreateCoordinatorModal from "@/components/coordinator/Createcoordinator";
import Link from "next/link";

function formatDistrictDisplay(
  district: { district_name?: string } | null | undefined,
): string {
  if (!district?.district_name) return "—";
  const raw = district.district_name.trim();
  const match = raw.match(/^([A-Z0-9]+)\s*\(([^)]+)\)\s*$/i);
  if (match) {
    const [, code, namePart] = match;
    const name = namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
    return `${name} (${code})`;
  }
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function formatSurveyListText(text: string | null | undefined): string {
  if (text == null || !String(text).trim()) return text ?? "—";
  let s = String(text).trim();
  s = s.replace(/\bNO\b/g, "No.");
  s = s.replace(/\S+/g, (word) => {
    if (word.startsWith("(") && word.endsWith(")")) {
      return "(" + word.slice(1, -1).toLowerCase() + ")";
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  return s;
}

interface Location {
  id: number;
  documentId: string;
  PS_Name: string;
  PS_No: string;
  Survey_Status: string | null;
  // Populated survey relation (one-to-one)
  survey?: {
    documentId?: string;
    site_condition?: string | null;
    survey_date?: string | null;
    state?: string | null;
  } | null;
  assembly: {
    documentId: string;
    Assembly_Name: string;
    district?: {
      documentId: string;
      district_name: string;
    };
  } | null;
  booth_coordinator?: {
    documentId: string;
    email?: string;
    username?: string;
  } | null;
}

export default function BoothLocationsPage() {
  const router = useRouter();
  const { toast } = useToast();

  // States
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [selectedDistrict, setSelectedDistrict] = useState<
    string | undefined
  >();
  const [selectedAssembly, setSelectedAssembly] = useState<
    string | undefined
  >();

  const [sortOrder, setSortOrder] = useState<"latest" | "ps_asc" | "ps_desc">(
    "latest",
  );

  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  // Coordinator assignment modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null,
  );
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [selectedCoordinatorId, setSelectedCoordinatorId] = useState<
    string | null
  >(null);

  const [surveyStatusFilter, setSurveyStatusFilter] = useState<
    "all" | "Raised" | "Completed"
  >("all");
  const [surveyExporting, setSurveyExporting] = useState(false);

  const initialViewSet = useRef(false);
  useEffect(() => {
    if (isMobile && !initialViewSet.current) {
      setViewMode("card");
      initialViewSet.current = true;
    }
  }, [isMobile]);

  // KPI counts
  const [raisedCount, setRaisedCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Fetch logged-in user to get created coordinators

  // const fetchCoordinators = async () => {
  //   try {
  //     // Get current user (to exclude self from the list)
  //     const userRes = await api.get("/users/me");
  //     const meDoc = userRes.data?.documentId;
  //     setUserId(meDoc);
  //     setUser(userRes.data);

  //     // Fetch all users with role and profile populated (server-side filtering by role type is flaky across environments)
  //     const res = await api.get("/users", {
  //       params: {
  //         "populate[role]": true,
  //         "populate[profile]": true,
  //         "pagination[pageSize]": 200,
  //       },
  //     });

  //     const users = res.data?.data || [];

  //     // Filter locally for role name/type matching Booth coordinator
  //     const boothUsers = users.filter((u: any) => {
  //       const roleName = u?.role?.name || "";
  //       const roleType = u?.role?.type || "";
  //       return (
  //         roleName.toLowerCase() === "booth coordinator" ||
  //         roleType.toLowerCase() === "booth_coordinator"
  //       );
  //     });

  //     // Optionally exclude the current logged-in user
  //     const boothCoordinators = boothUsers.filter(
  //       (u: any) => u.documentId !== meDoc,
  //     );

  //     // Map into a consistent shape (profile info if available)
  //     const mapped = boothCoordinators.map((u: any) => ({
  //       id: u.id,
  //       documentId: u.documentId,
  //       email: u.email,
  //       username: u.username,
  //       Full_Name: u.profile?.Full_Name || u.username || u.email,
  //       Phone_Number: u.profile?.Phone_Number || null,
  //       profileId: u.profile?.id || null,
  //     }));

  //     // If none found via /users, try /app-users linked to plugin users (fallback)
  //     if (!mapped || mapped.length === 0) {
  //       try {
  //         const appRes = await api.get("/app-users", {
  //           params: {
  //             populate: "*",
  //             "filters[user][role][name][$eq]": "Booth coordinator",
  //             "pagination[pageSize]": 200,
  //           },
  //         });
  //         const appUsers = appRes.data?.data || [];
  //         const mappedFallback = appUsers.map((a: any) => ({
  //           id: a.id,
  //           documentId: a.documentId,
  //           email: a.email,
  //           username: a.email,
  //           Full_Name: a.Full_Name || a.email,
  //           Phone_Number: a.Phone_Number || null,
  //         }));

  //         setCoordinators(mappedFallback);
  //         return;
  //       } catch (err) {
  //         // ignore fallback error and continue
  //         console.warn("Fallback /app-users fetch failed", err);
  //       }
  //     }

  //     setCoordinators(mapped);
  //   } catch (err) {
  //     console.error("Failed to fetch booth coordinators", err);
  //   }
  // };

  const fetchCoordinators = async () => {
    try {
      // 1️⃣ Logged-in user
      const meRes = await api.get("/users/me");
      const meDocId = meRes.data?.documentId;
      setUserId(meDocId);

      if (!meDocId) return;

      // 2️⃣ App-users CREATED BY this user
      const appRes = await api.get("/app-users", {
        params: {
          "filters[createdby][documentId][$eq]": meDocId,

          // ✅ populate linked users-permissions user
          "populate[user][populate][role]": true,
          "populate[user][populate][profile]": true,

          // optional fields
          "populate[user][fields][0]": "email",
          "populate[user][fields][1]": "username",

          "pagination[pageSize]": 200,
        },
      });

      const appUsers = appRes.data?.data || [];

      // 3️⃣ Only booth coordinators
      const boothCoordinators = appUsers.filter(
        (a: any) => a.user?.role?.type === "booth_coordinator",
      );

      // 4️⃣ Normalize
      const mapped = boothCoordinators.map((a: any) => ({
        documentId: a.user.documentId, // users-permissions user
        email: a.user.email,
        username: a.user.username,
        Full_Name: a.user.profile?.Full_Name || a.Full_Name || a.user.username,
        Phone_Number: a.user.profile?.Phone_Number || null,
        profileId: a.id, // app-user id
      }));

      setCoordinators(mapped);
    } catch (err) {
      console.error("Failed to fetch coordinators", err);
      message.error("Failed to load coordinators");
    }
  };

  // Fetch locations with all required relations - FIXED POPULATE SYNTAX
  const fetchLocations = async (page = 1, isInitial = false) => {
    if (isInitial) setLoading(true);
    else setTableLoading(true);
    try {
      const params: any = {
        "pagination[page]": page,
        "pagination[pageSize]": pageSize,

        // ✅ Explicitly populate ONLY required fields
        "populate[booth_coordinator][fields][0]": "documentId",
        "populate[booth_coordinator][fields][1]": "email",
        "populate[booth_coordinator][fields][2]": "username",

        "populate[assembly][fields][0]": "documentId",
        "populate[assembly][fields][1]": "Assembly_Name",
        "populate[assembly][populate][district][fields][0]": "documentId",
        "populate[assembly][populate][district][fields][1]": "district_name",
        // include survey relation (site_condition + date)
        "populate[survey][fields][0]": "documentId",
        "populate[survey][fields][1]": "site_condition",
        "populate[survey][fields][2]": "survey_date",
        "populate[survey][fields][3]": "state",

        // sort: "PS_No:asc",
      };

      // Apply filters
      if (selectedDistrict && selectedDistrict !== "all") {
        params["filters[assembly][district][documentId][$eq]"] =
          selectedDistrict;
      } else if (selectedDistrict === "all" && districts.length > 0) {
        districts.forEach((d, idx) => {
          params[`filters[assembly][district][documentId][$in][${idx}]`] = d.documentId;
        });
      }
      
      if (selectedAssembly) {
        params["filters[assembly][documentId][$eq]"] = selectedAssembly;
      }

      // ✅ Survey status filter (server-side)
      if (surveyStatusFilter !== "all") {
        params["filters[survey][state][$eq]"] = surveyStatusFilter;
      }

      // ✅ Sorting
      if (sortOrder === "latest") {
        params["sort"] = "updatedAt:desc";
      } else if (sortOrder === "ps_asc") {
        params["sort"] = "PS_No:asc";
      } else if (sortOrder === "ps_desc") {
        params["sort"] = "PS_No:desc";
      }

      const res = await api.get("/locations", { params });

      setLocations(res.data.data || []);
      const meta = res.data.meta.pagination;
      setTotalPages(meta.pageCount);
      setTotalItems(meta.total);
      setCurrentPage(meta.page);
    } catch (err: any) {
      console.error("Failed to fetch locations", err);
      const errorMsg =
        err.response?.data?.error?.message || "Could not load booth locations";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMsg,
      });
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  // Districts and Assemblies for filters
  const [districts, setDistricts] = useState<any[]>([]);
  const [assemblies, setAssemblies] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedDistrict) {
      setAssemblies([]);
      setSelectedAssembly(undefined);
      return;
    }

    const params: any = {
      "fields[0]": "Assembly_Name",
      "fields[1]": "documentId",
      "pagination[pageSize]": 100,
    };

    if (selectedDistrict === "all") {
      districts.forEach((d, idx) => {
        params[`filters[district][documentId][$in][${idx}]`] = d.documentId;
      });
    } else {
      params["filters[district][documentId][$eq]"] = selectedDistrict;
    }

    api
      .get("/assemblies", { params })
      .then((res) => setAssemblies(res.data.data))
      .catch((err) => {
        console.error("Failed to fetch assemblies", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load assemblies",
        });
      });
  }, [selectedDistrict, districts]);

  // Initial load — fetch current user and their district first, then load coordinators. Locations will load when `selectedDistrict` is set.
  useEffect(() => {
    const init = async () => {
      try {
        const userRes = await api.get("/users/me?populate=* ");
        const meDoc = userRes.data?.documentId;

        setUser(userRes.data);

        if (meDoc) {
          // Find district(s) where the current user is district_coordinator
          const distRes = await api.get("/districts", {
            params: {
              "filters[district_coordinator][documentId][$eq]": meDoc,
              "populate[assemblies]": true,
              "pagination[pageSize]": 50,
            },
          });

          const districtsData = distRes.data?.data || [];
          if (districtsData.length > 0) {
            const uniqueDistricts = Array.from(
              new Map(districtsData.map((d: any) => [d.documentId, d])).values()
            ) as any[];
            setDistricts(uniqueDistricts);
            
            // auto-select 'all' to show details for all districts at once
            setSelectedDistrict("all");
          } else {
            message.warning("No district assigned to this user.");
          }
        }

        // still load coordinators for assignment dropdowns
        fetchCoordinators();
      } catch (err) {
        console.error("Failed to initialize district data", err);
      }
    };

    init();
  }, []);

  // Fetch KPI counts for the selected district
  const fetchKpis = async (districtDocId: string) => {
    try {
      const base: any = {
        "pagination[pageSize]": 1,
      };

      if (districtDocId && districtDocId !== "all") {
        base["filters[assembly][district][documentId][$eq]"] = districtDocId;
      } else if (districtDocId === "all" && districts.length > 0) {
        districts.forEach((d, idx) => {
          base[`filters[assembly][district][documentId][$in][${idx}]`] = d.documentId;
        });
      }

      if (selectedAssembly) {
        base["filters[assembly][documentId][$eq]"] = selectedAssembly;
      }

      const [raised, completed] = await Promise.all([
        api.get("/locations", {
          params: { ...base, "filters[survey][state][$eq]": "Raised" },
        }),
        api.get("/locations", {
          params: { ...base, "filters[survey][state][$eq]": "Completed" },
        }),
      ]);

      setRaisedCount(raised.data.meta.pagination.total);
      setCompletedCount(completed.data.meta.pagination.total);
    } catch (err) {
      console.error("Failed to fetch KPIs", err);
    }
  };

  // When filters change, reload locations (only after district selection)
  useEffect(() => {
    if (selectedDistrict) {
      const isInitial = locations.length === 0;
      fetchLocations(1, isInitial);
    }
  }, [selectedDistrict, selectedAssembly, surveyStatusFilter, sortOrder]);

  // Fetch KPIs when district or assembly changes
  useEffect(() => {
    if (selectedDistrict) {
      fetchKpis(selectedDistrict);
    }
  }, [selectedDistrict, selectedAssembly]);

  // Search filtering (client-side for simplicity)
  const filteredLocations = useMemo(() => {
    if (!searchTerm) return locations;
    const term = searchTerm.toLowerCase();
    return locations.filter(
      (loc) =>
        loc.PS_Name.toLowerCase().includes(term) ||
        loc.PS_No.toLowerCase().includes(term) ||
        loc.assembly?.Assembly_Name?.toLowerCase().includes(term) ||
        loc.assembly?.district?.district_name?.toLowerCase().includes(term),
    );
  }, [locations, searchTerm]);

  const allSelected = useMemo(() => {
    if (!filteredLocations || filteredLocations.length === 0) return false;
    return filteredLocations.every((l) =>
      selectedLocationIds.includes(l.documentId),
    );
  }, [filteredLocations, selectedLocationIds]);

  // Handle coordinator assignment
  const handleAssignCoordinator = async () => {
    // determine targets: either bulk selection or single selectedLocationId
    const targets =
      selectedLocationIds.length > 0
        ? selectedLocationIds
        : selectedLocationId
          ? [selectedLocationId]
          : [];
    if (targets.length === 0 || !selectedCoordinatorId) {
      message.error("Please select one or more locations and a coordinator");
      return;
    }

    setAssigning(true);
    try {
      // Determine selected coordinator object (could be a users-permissions user or an app-user fallback)
      const selectedCoord = coordinators.find(
        (c) => c.documentId === selectedCoordinatorId,
      );
      if (!selectedCoord) {
        message.error("Coordinator not found");
        return;
      }

      // If the coordinator entry is already a users-permissions user (we populate 'profileId' for /users results), use its documentId.
      // Otherwise (app-user fallback), try multiple strategies to find the linked users-permissions user:
      // 1) filter by profile id, 2) by app_users relation (id / documentId), 3) by email, 4) by username.
      let userDocumentId = selectedCoord.documentId;
      if (!selectedCoord.profileId) {
        let linkedUser: any = null;

        // Try lookup by profile id (recommended link)
        try {
          const byProfile = await api.get("/users", {
            params: {
              "filters[profile][id][$eq]": selectedCoord.id,
              "pagination[pageSize]": 1,
            },
          });
          linkedUser = byProfile.data.data?.[0] || null;
        } catch (err) {
          // ignore, we'll try other fallbacks
          console.warn("Lookup by profile id failed", err);
        }

        // Fallback: try to find a users-permissions user that has this app-user in its `app_users` relation (by id)
        if (!linkedUser) {
          try {
            const byAppUserId = await api.get("/users", {
              params: {
                "filters[app_users][id][$eq]": selectedCoord.id,
                "pagination[pageSize]": 1,
              },
            });
            linkedUser = byAppUserId.data.data?.[0] || null;
          } catch (err) {
            console.warn("Lookup by app_users id failed", err);
          }
        }

        // Fallback: try by app_users.documentId
        if (!linkedUser && selectedCoord.documentId) {
          try {
            const byAppUserDoc = await api.get("/users", {
              params: {
                "filters[app_users][documentId][$eq]": selectedCoord.documentId,
                "pagination[pageSize]": 1,
              },
            });
            linkedUser = byAppUserDoc.data.data?.[0] || null;
          } catch (err) {
            console.warn("Lookup by app_users.documentId failed", err);
          }
        }

        // Fallback: try by email
        if (!linkedUser && selectedCoord.email) {
          try {
            const byEmail = await api.get("/users", {
              params: {
                "filters[email][$eq]": selectedCoord.email,
                "pagination[pageSize]": 1,
              },
            });
            linkedUser = byEmail.data.data?.[0] || null;
          } catch (err) {
            console.warn("Lookup by email failed", err);
          }
        }

        // Fallback: try by username
        if (!linkedUser && selectedCoord.username) {
          try {
            const byUsername = await api.get("/users", {
              params: {
                "filters[username][$eq]": selectedCoord.username,
                "pagination[pageSize]": 1,
              },
            });
            linkedUser = byUsername.data?.[0] || null;
          } catch (err) {
            console.warn("Lookup by username failed", err);
          }
        }

        if (!linkedUser) {
          message.error(
            "No users-permissions user found for this coordinator. Please ensure a User account exists and is linked to the profile, or choose a different coordinator.",
          );
          return;
        }

        userDocumentId = linkedUser.documentId;
      }

      // Update each selected location
      for (const locId of targets) {
        await api.put(`/locations/${locId}`, {
          data: { booth_coordinator: userDocumentId },
        });
      }

      message.success("Coordinator assigned successfully!");
      setIsModalOpen(false);
      setSelectedCoordinatorId(null);
      setSelectedLocationIds([]);
      setSelectedLocationId(null);
      fetchLocations(currentPage); // Refresh current page
    } catch (err: any) {
      console.error("Failed to assign coordinator", err);
      console.error("Error details:", err.response?.data || err.message);

      const errorMsg =
        err.response?.data?.error?.message ||
        "Failed to assign coordinator. Please try again.";

      message.error(errorMsg);
    } finally {
      setAssigning(false);
    }
  };

  // Helpers for Raise Survey modal

  // Use browser geolocation to populate GPS fields

  // Selection helpers for bulk operations
  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      const ids = filteredLocations.map((l) => l.documentId);
      setSelectedLocationIds(ids);
    } else {
      setSelectedLocationIds([]);
    }
  };

  const toggleSelectOne = (docId: string, checked: boolean) => {
    setSelectedLocationIds((prev) => {
      if (checked) return [...prev, docId];
      return prev.filter((id) => id !== docId);
    });
  };

  console.log("Filtered Locations:", filteredLocations);
  // Table rendering
  const renderTable = () => (
    <div className="w-full overflow-x-auto bg-gray-50 overscroll-x-contain custom-scrollbar border-0 border-t border-b">
      <table className="w-full min-w-[680px]">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/80">
            <th className="px-3 py-3.5 text-left w-10">
              <Checkbox
                checked={allSelected}
                onChange={(e) => toggleSelectAll(e.target.checked)}
                onClick={(e) => e.stopPropagation()}
              />
            </th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600 tracking-wider" style={{ width: "26%" }}>
              Polling Station
            </th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600 tracking-wider" style={{ width: "26%" }}>
              Location
            </th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600 tracking-wider" style={{ width: "12%" }}>
              Status
            </th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600 tracking-wider min-w-[120px]">
              Coordinator
            </th>
            <th className="px-3 py-3.5 text-left min-w-[60px]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {filteredLocations.length > 0 ? (
            filteredLocations.map((loc) => {
              const status = loc.survey?.state ||
                (loc.survey?.documentId ? "Raised" : "Survey Not Raised");
              const coordinator = loc.booth_coordinator;
              const assemblyName = loc.assembly?.Assembly_Name || "—";
              const districtDisplay = formatDistrictDisplay(loc.assembly?.district);
              return (
                <tr key={loc.documentId} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-3 py-3 w-10 align-top">
                    <Checkbox
                      checked={selectedLocationIds.includes(loc.documentId)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => toggleSelectOne(loc.documentId, e.target.checked)}
                    />
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-700 break-words align-top">
                    <div className="space-y-0.5">
                      <Link
                        href={`/district/surveys/${loc.documentId}`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {formatSurveyListText(loc.PS_Name)}
                      </Link>
                      <div className="text-gray-500 text-xs">PS No: {loc.PS_No}</div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-700 break-words align-top">
                    <div className="space-y-0.5">
                      <div>{formatSurveyListText(assemblyName)}</div>
                      <div className="text-gray-500 text-xs">District: {districtDisplay}</div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm align-top whitespace-nowrap">
                    <Badge
                      className={`rounded-lg font-medium ${
                        status === "Survey Not Raised"
                          ? ""
                          : status === "Raised"
                            ? "bg-blue-100 text-blue-700 border-blue-200"
                            : "bg-green-100 text-green-700 border-green-200"
                      }`}
                      variant={status === "Survey Not Raised" ? "outline" : "default"}
                    >
                      {status === "Survey Not Raised" ? "Not Raised" : status}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-sm break-words align-top min-w-[120px]">
                    {coordinator ? (
                      <div className="space-y-0.5">
                        <div className="font-medium text-gray-900">{(coordinator.email || "").toLowerCase()}</div>
                        {coordinator.username && (
                          <div className="text-gray-500 text-xs">{coordinator.username}</div>
                        )}
                      </div>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        className="rounded-lg text-sm font-medium bg-[#3A8DFF] hover:bg-[#2d7ae8] text-white border-0"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedLocationIds([]);
                          setSelectedLocationId(loc.documentId);
                          setIsModalOpen(true);
                        }}
                      >
                        Assign
                      </Button>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top whitespace-nowrap text-sm min-w-[60px]">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[10rem] text-sm">
                        <DropdownMenuItem asChild>
                          <Link href={`/district/surveys/${loc.documentId}`} className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        {loc.survey?.documentId ? (
                          <DropdownMenuItem asChild>
                            <Link href={`/district/surveys/${loc.survey.documentId}/edit`} className="flex items-center gap-2">
                              <FileEdit className="h-4 w-4" />
                              Edit Survey
                            </Link>
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() =>
                              router.push(`/surveys/new?boothId=${encodeURIComponent(loc.documentId)}`)
                            }
                          >
                            <FileEdit className="h-4 w-4" />
                            Raise Survey
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={() => {
                            setSelectedLocationIds([]);
                            setSelectedLocationId(loc.documentId);
                            setSelectedCoordinatorId(coordinator?.documentId || null);
                            setIsModalOpen(true);
                          }}
                        >
                          <UserPlus className="h-4 w-4" />
                          {coordinator ? "Change Coordinator" : "Assign Coordinator"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                <p className="text-lg font-medium">No booth locations found</p>
                {surveyStatusFilter !== "all" && (
                  <p className="mt-2 text-sm">
                    No records match the selected survey status.{" "}
                    <button
                      onClick={() => setSurveyStatusFilter("all")}
                      className="ml-2 text-blue-600 underline"
                    >
                      Clear filter
                    </button>
                  </p>
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // Card view rendering
  const renderCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredLocations.map((loc) => {
        const status = loc.survey
          ? loc.survey.state ||
            (loc.survey.survey_date
              ? `Raised on ${loc.survey.survey_date}`
              : "Survey raised")
          : "Survey Not Raised";
        const coordinator = loc.booth_coordinator;

        return (
          <Card
            key={loc.documentId}
            className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-white to-blue-50/30 hover:scale-[1.02]"
          >
            <CardContent className="p-6">
              {/* Header Section */}
              <div className="space-y-2 mb-4">
                <div className="font-semibold text-xl text-gray-800">
                  {loc.PS_Name}
                </div>
                <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  PS No: {loc.PS_No}
                </div>
              </div>

              {/* Info Section */}
              <div className="mt-4 p-4 bg-white/60 rounded-lg space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">Assembly:</span>
                  <span className="text-gray-800 font-semibold">
                    {loc.assembly?.Assembly_Name || "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">District:</span>
                  <span className="text-gray-800 font-semibold">
                    {loc.assembly?.district?.district_name || "—"}
                  </span>
                </div>
              </div>

              {/* Status and Coordinator Section */}
              <div className="mt-5 space-y-3">
                {/* Survey Status */}
                <div>
                  {!loc.survey?.documentId ? (
                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] hover:from-[#2d7ae8] hover:to-[#1976D2] text-white shadow-sm border-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(
                          `/surveys/new?boothId=${encodeURIComponent(loc.documentId)}`,
                        );
                      }}
                    >
                      Raise Survey
                    </Button>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-xs text-green-700 font-medium">
                        Status:
                      </span>
                      <Badge
                        variant={
                          status === "Survey Not Raised"
                            ? "secondary"
                            : "default"
                        }
                        className="bg-green-100 text-green-700 hover:bg-green-200 border-0"
                      >
                        {status}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Coordinator */}
                <div>
                  {coordinator ? (
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="text-xs text-purple-600 font-medium mb-1">
                        Coordinator
                      </div>
                      <div className="font-medium text-sm text-purple-900">
                        {(coordinator.email || "").toLowerCase()}
                      </div>
                      <div className="text-xs text-purple-600 mt-0.5">
                        {coordinator.username}
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-r from-slate-200 to-slate-300 hover:from-slate-300 hover:to-slate-400 text-black shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLocationId(loc.documentId);
                        setIsModalOpen(true);
                      }}
                    >
                      Assign Coordinator
                    </Button>
                  )}
                </div>
              </div>

              {/* View Button */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Link href={`/district/surveys/${loc?.documentId}`}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full hover:bg-blue-50 text-blue-600 hover:text-blue-700"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {filteredLocations.length === 0 && !loading && (
        <div className="col-span-full text-center py-12">
          <div className="text-gray-400 text-lg">No booth locations found.</div>
        </div>
      )}
    </div>
  );
  // Pagination controls
  const handleExportSurveysExcel = async () => {
    if (!selectedDistrict) {
      message.warning("Select a district (or All My Districts) first.");
      return;
    }
    setSurveyExporting(true);
    try {
      let fileLabel = "districts";
      if (selectedAssembly) {
        fileLabel =
          assemblies.find((a) => a.documentId === selectedAssembly)
            ?.Assembly_Name || "assembly";
      } else if (selectedDistrict === "all") {
        fileLabel = "All_My_Districts";
      } else {
        fileLabel =
          districts.find((d) => d.documentId === selectedDistrict)
            ?.district_name || "district";
      }
      await exportElectionSurveysToExcel(
        api,
        {
          assemblyDocumentId: selectedAssembly || undefined,
          districtDocumentId:
            !selectedAssembly && selectedDistrict !== "all"
              ? selectedDistrict
              : undefined,
          districtDocumentIds:
            !selectedAssembly &&
            selectedDistrict === "all" &&
            districts.length > 0
              ? districts.map((d) => d.documentId)
              : undefined,
          surveyState:
            surveyStatusFilter === "all" ? undefined : surveyStatusFilter,
        },
        { fileLabel },
      );
      message.success("Survey Excel file downloaded.");
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Export failed. Please try again.";
      message.error(msg);
    } finally {
      setSurveyExporting(false);
    }
  };

  const renderPagination = () => (
    <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">
      <div className="text-sm text-gray-700">
        Showing{" "}
        <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span>{" "}
        to{" "}
        <span className="font-medium">
          {Math.min(currentPage * pageSize, totalItems)}
        </span>{" "}
        of <span className="font-medium">{totalItems}</span> results
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchLocations(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <span className="text-sm text-gray-700 min-w-[40px] text-center">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchLocations(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Booth Locations</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage booth locations, survey status, and coordinator assignments
          </p>
        </div>

        {/* 🔥 NEW SURVEY BUTTON */}
        <Button
          className="bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] hover:from-[#2d7ae8] hover:to-[#1976D2] text-white"
          onClick={() => {
            const role = user?.role?.type;

            if (role === "assembly_coordinator") {
              const assemblyId = user?.assembly?.documentId;
              router.push(
                `/assembly/surveys/new?role=assembly&assemblyId=${assemblyId}`,
              );
            } else if (role === "district_coordinator") {
              const districtId = selectedDistrict;
              router.push(
                `/district/surveys/new?role=district&districtId=${districtId}`,
              );
            }
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Raise a Survey
        </Button>
      </div>

      {/* KPI Cards - clickable to filter */}
      {selectedDistrict && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-sm text-gray-500">Total Booths</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalItems}</p>
          </div>
          <div
            className={`rounded-xl border-2 p-4 shadow-sm cursor-pointer transition-all ${
              surveyStatusFilter === "Raised"
                ? "bg-white text-black shadow-lg border-[#2196F3]"
                : "bg-white hover:bg-blue-50 border-[#2196F3]"
            }`}
            onClick={() =>
              setSurveyStatusFilter((prev) => (prev === "Raised" ? "all" : "Raised"))
            }
          >
            <p className="text-sm text-gray-500">Raised</p>
            <p className="text-2xl font-bold text-[#2196F3] mt-1">{raisedCount}</p>
          </div>
          <div
            className={`rounded-xl border-2 p-4 shadow-sm cursor-pointer transition-all ${
              surveyStatusFilter === "Completed"
                ? "bg-white text-black shadow-lg border-[#4CAF50]"
                : "bg-white hover:bg-green-50 border-[#4CAF50]"
            }`}
            onClick={() =>
              setSurveyStatusFilter((prev) => (prev === "Completed" ? "all" : "Completed"))
            }
          >
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-[#4CAF50] mt-1">{completedCount}</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-grow max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by booth name, PS number, assembly, or district..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>

        <Select
          value={sortOrder}
          onChange={(val) => {
            setSortOrder(val);
            setCurrentPage(1);
          }}
          style={{ width: 200 }}
        >
          <Select.Option value="latest">Latest Updated</Select.Option>
          <Select.Option value="ps_asc">PS No ↑ (Ascending)</Select.Option>
          <Select.Option value="ps_desc">PS No ↓ (Descending)</Select.Option>
        </Select>

        <Select
          placeholder="Filter by District"
          value={selectedDistrict}
          onChange={(val) => {
            setSelectedDistrict(val);
            setSelectedAssembly(undefined);
            setCurrentPage(1);
          }}
          style={{ width: 200 }}
        >
          {districts.length > 1 && (
            <Select.Option value="all">All My Districts</Select.Option>
          )}
          {districts.map((d) => (
            <Select.Option key={d.documentId} value={d.documentId}>
              {d.district_name}
            </Select.Option>
          ))}
        </Select>

        <Select
          placeholder="Filter by Assembly"
          value={selectedAssembly}
          disabled={!selectedDistrict}
          allowClear
          onChange={(val) => {
            setSelectedAssembly(val);
            setCurrentPage(1);
          }}
          style={{ width: 200 }}
        >
          {assemblies.map((a) => (
            <Select.Option key={a.documentId} value={a.documentId}>
              {a.Assembly_Name}
            </Select.Option>
          ))}
        </Select>

        <Select
          placeholder="Survey Status"
          value={surveyStatusFilter === "all" ? undefined : surveyStatusFilter}
          onChange={(val) => {
            if (!val) {
              setSurveyStatusFilter("all"); // reset
            } else {
              setSurveyStatusFilter(val);
            }
            setCurrentPage(1);
          }}
          allowClear
          style={{ width: 180 }}
        >
          <Select.Option value="Raised">Raised</Select.Option>
          <Select.Option value="Completed">Completed</Select.Option>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-emerald-200 text-emerald-800 hover:bg-emerald-50"
          disabled={surveyExporting || !selectedDistrict}
          onClick={() => void handleExportSurveysExcel()}
        >
          <FileSpreadsheet className="w-4 h-4 mr-1" />
          {surveyExporting ? "Exporting…" : "Excel export"}
        </Button>

        <div className="flex items-center space-x-2">
          <Button
            variant={selectedLocationIds.length > 0 ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (selectedLocationIds.length === 0)
                return message.info("Select locations first");
              setSelectedLocationId(null);
              setIsModalOpen(true);
            }}
            disabled={selectedLocationIds.length === 0}
          >
            <UserPlus className="w-4 h-4 mr-1" /> Bulk Assign
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
          >
            <TableIcon className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "card" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("card")}
          >
            <Grid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm"
      >
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : viewMode === "table" ? (
          renderTable()
        ) : (
          renderCards()
        )}

        {!loading && totalItems > 0 && renderPagination()}
      </motion.div>

      {/* Coordinator Assignment Modal */}
      <Modal
        title="Assign Coordinator"
        open={isModalOpen}
        onOk={handleAssignCoordinator}
        onCancel={() => {
          setIsModalOpen(false);
          setSelectedCoordinatorId(null);
        }}
        confirmLoading={assigning}
        okText="Assign"
        cancelText="Cancel"
      >
        <div className="space-y-4 mt-4">
          <p className="text-sm text-gray-600">
            {selectedLocationIds.length > 0
              ? `Select a coordinator to assign to ${selectedLocationIds.length} selected locations:`
              : `Select a coordinator to assign to this booth location:`}
          </p>
          <Select
            style={{ width: "100%" }}
            placeholder="Select coordinator"
            value={selectedCoordinatorId || undefined}
            onChange={setSelectedCoordinatorId}
            showSearch
            filterOption={(input, option) => {
              const label = option?.children?.toString().toLowerCase() || "";
              const email = option?.email?.toLowerCase() || "";
              return (
                label.includes(input.toLowerCase()) ||
                email.includes(input.toLowerCase())
              );
            }}
            // Pass email into option so filterOption can access it
            optionFilterProp="children"
          >
            {coordinators.map((coord) => (
              <Select.Option
                key={coord.documentId}
                value={coord.documentId}
                email={(coord.email || "").toLowerCase()} // 👈 Add email here
              >
                {coord.Full_Name} {coord.email ? `(${(coord.email || "").toLowerCase()})` : ""}
              </Select.Option>
            ))}
          </Select>

          <Button
            type="dashed"
            block
            className="mt-3"
            onClick={() => setCreateModalOpen(true)}
          >
            + Create New Coordinator
          </Button>

          {/* {selectedCoordinatorId && (
            <div className="mt-3 p-3 bg-blue-50 rounded-md">
              <p className="text-sm font-medium text-blue-800">Note:</p>
              <p className="text-xs text-blue-700 mt-1">
                This will replace any existing coordinator assigned to this booth location.
              </p>
            </div>
          )} */}
        </div>
      </Modal>

      <CreateCoordinatorModal
        open={createModalOpen}
        role={user?.role?.type || ""}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => {
          setCreateModalOpen(false);
          fetchCoordinators(); // ← this loads proper data from backend
        }}
      />
    </div>
  );
}
