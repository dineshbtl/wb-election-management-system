"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, Plus, Table as TableIcon, Grid, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Select, Modal, message } from "antd";
import api from "@/lib/api";
import Link from "next/link";
import UploadInstallationsModal from "@/components/installation/UploadInstallationsModal";

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
  IN_Camera?: {
    Position?: "IN";
    state?: string;
  }[];

  out_camera?: {
    Position?: "OUT";
    state?: string;
  }[];
}

export default function InstallationLocationsPage() {
  const router = useRouter();
  const { toast } = useToast();

  // States
  const [locations, setLocations] = useState<Location[]>([]);
  const [camerasMap, setCamerasMap] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [selectedDistrict, setSelectedDistrict] = useState<
    string | undefined
  >();
  const [selectedAssembly, setSelectedAssembly] = useState<
    string | undefined
  >();

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  const [summary, setSummary] = useState<any>(null);

  // Coordinator assignment modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null,
  );
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [selectedCoordinatorId, setSelectedCoordinatorId] = useState<
    string | null
  >(null);

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const [sortOrder, setSortOrder] = useState<"latest" | "ps_asc" | "ps_desc">(
    "latest",
  );

  // Fetch logged-in user to get created coordinators

  const fetchCoordinators = async () => {
    try {
      // Get current user (to exclude self from the list)
      const userRes = await api.get("/users/me");
      const meDoc = userRes.data?.documentId;

      // Fetch all users with role and profile populated (server-side filtering by role type is flaky across environments)
      const res = await api.get("/users", {
        params: {
          "populate[role]": true,
          "populate[profile]": true,
          "pagination[pageSize]": 200,
        },
      });

      const users = res.data?.data || [];

      // Filter locally for role name/type matching Booth coordinator
      const boothUsers = users.filter((u: any) => {
        const roleName = u?.role?.name || "";
        const roleType = u?.role?.type || "";
        return (
          roleName.toLowerCase() === "booth coordinator" ||
          roleType.toLowerCase() === "booth_coordinator"
        );
      });

      // Optionally exclude the current logged-in user
      const boothCoordinators = boothUsers.filter(
        (u: any) => u.documentId !== meDoc,
      );

      // Map into a consistent shape (profile info if available)
      const mapped = boothCoordinators.map((u: any) => ({
        id: u.id,
        documentId: u.documentId,
        email: u.email,
        username: u.username,
        Full_Name: u.profile?.Full_Name || u.username || u.email,
        Phone_Number: u.profile?.Phone_Number || null,
        profileId: u.profile?.id || null,
      }));

      // If none found via /users, try /app-users linked to plugin users (fallback)
      if (!mapped || mapped.length === 0) {
        try {
          const appRes = await api.get("/app-users", {
            params: {
              populate: "*",
              "filters[user][role][name][$eq]": "Booth coordinator",
              "pagination[pageSize]": 200,
            },
          });
          const appUsers = appRes.data?.data || [];
          const mappedFallback = appUsers.map((a: any) => ({
            id: a.id,
            documentId: a.documentId,
            email: a.email,
            username: a.email,
            Full_Name: a.Full_Name || a.email,
            Phone_Number: a.Phone_Number || null,
          }));

          setCoordinators(mappedFallback);
          return;
        } catch (err) {
          // ignore fallback error and continue
          console.warn("Fallback /app-users fetch failed", err);
        }
      }

      setCoordinators(mapped);
    } catch (err) {
      console.error("Failed to fetch booth coordinators", err);
    }
  };

  // Fetch all cameras and group them by booth ID
  const fetchCamerasList = async () => {
    try {
      const res = await api.get("/cameras", {
        params: {
          "pagination[pageSize]": 5000, // Fetch a large batch to cover multiple booths
          populate: "assigned_booth",
        },
      });

      const cameras = res.data.data || [];
      const grouped: any = {};

      cameras.forEach((cam: any) => {
        const boothId = cam.assigned_booth?.documentId;
        if (!boothId) return;

        if (!grouped[boothId]) {
          grouped[boothId] = { IN: [], OUT: [] };
        }

        if (cam.Position === "IN") {
          grouped[boothId].IN.push(cam);
        } else if (cam.Position === "OUT") {
          grouped[boothId].OUT.push(cam);
        }
      });

      setCamerasMap(grouped);
    } catch (err) {
      console.error("Failed to fetch cameras map", err);
    }
  };

  // Fetch locations with all required relations
  const fetchLocations = async (page = 1, search = searchTerm) => {
    setLoading(true);
    try {
      const params: any = {
        "pagination[page]": page,
        "pagination[pageSize]": pageSize,

        // populate (same as now)
        "populate[booth_coordinator][fields][0]": "documentId",
        "populate[booth_coordinator][fields][1]": "email",
        "populate[booth_coordinator][fields][2]": "username",

        "populate[assembly][fields][0]": "documentId",
        "populate[assembly][fields][1]": "Assembly_Name",
        "populate[assembly][populate][district][fields][0]": "documentId",
        "populate[assembly][populate][district][fields][1]": "district_name",
      };

      // Sort by last updated (newest first)
      //   params["sort"] = "updatedAt:asc";

      if (sortOrder === "latest") {
        params["sort"] = "updatedAt:desc";
      } else if (sortOrder === "ps_asc") {
        params["sort"] = "PS_No:asc";
      } else if (sortOrder === "ps_desc") {
        params["sort"] = "PS_No:desc";
      }

      // 🎯 Survey state filter

      // 🔍 SEARCH (OR conditions)
      if (search) {
        params["filters[$or][0][PS_Name][$containsi]"] = search;
        params["filters[$or][1][PS_No][$containsi]"] = search;
        params["filters[$or][2][assembly][Assembly_Name][$containsi]"] = search;
        params[
          "filters[$or][3][assembly][district][district_name][$containsi]"
        ] = search;
      }

      // 🎯 Filters
      if (selectedDistrict) {
        params["filters[assembly][district][documentId][$eq]"] =
          selectedDistrict;
      }
      if (selectedAssembly) {
        params["filters[assembly][documentId][$eq]"] = selectedAssembly;
      }

      const res = await api.get("/locations", { params });

      setLocations(res.data.data || []);
      const meta = res.data.meta.pagination;
      setTotalPages(meta.pageCount);
      setTotalItems(meta.total);
      setCurrentPage(meta.page);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLocations(1, searchTerm);
      fetchCamerasList(); // Also refresh cameras map when filters change
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedDistrict, selectedAssembly, sortOrder]);

  // Districts and Assemblies for filters
  const [districts, setDistricts] = useState<any[]>([]);
  const [assemblies, setAssemblies] = useState<any[]>([]);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        // 1️⃣ No filter → Superadmin
        if (!selectedDistrict && !selectedAssembly) {
          const res = await api.get("/dashboard/superadmin");
          setSummary(res.data.data);
          return;
        }

        // 2️⃣ District selected
        if (selectedDistrict && !selectedAssembly) {
          const res = await api.get("/dashboard/districts");

          const districtData = res.data.data.find(
            (d: any) => d.id === selectedDistrict,
          );

          setSummary(districtData);
          return;
        }

        // 3️⃣ Assembly selected
        if (selectedAssembly) {
          const res = await api.get("/dashboard/assemblies");

          const assemblyData = res.data.data.find(
            (a: any) => a.id === selectedAssembly,
          );

          setSummary(assemblyData);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard summary", err);
      }
    };

    fetchSummary();
  }, [selectedDistrict, selectedAssembly]);

  useEffect(() => {
    // Fetch districts
    api
      .get(
        "/districts?fields[0]=district_name&fields[1]=documentId&pagination[pageSize]=100",
      )
      .then((res) => setDistricts(res.data.data))
      .catch((err) => {
        console.error("Failed to fetch districts", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load districts",
        });
      });
  }, []);

  useEffect(() => {
    if (!selectedDistrict) {
      setAssemblies([]);
      setSelectedAssembly(undefined);
      return;
    }

    api
      .get("/assemblies", {
        params: {
          "filters[district][documentId][$eq]": selectedDistrict,
          "fields[0]": "Assembly_Name",
          "fields[1]": "documentId",
          "pagination[pageSize]": 100,
        },
      })
      .then((res) => setAssemblies(res.data.data))
      .catch((err) => {
        console.error("Failed to fetch assemblies", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load assemblies",
        });
      });
  }, [selectedDistrict]);

  // Initial load
  useEffect(() => {
    fetchCoordinators();
  }, []);

  const handleAssignCoordinator = async () => {
    if (!selectedLocationId || !selectedCoordinatorId) {
      message.error("Please select a coordinator");
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

      // Update location with booth_coordinator using the users-permissions user's documentId
      await api.put(`/locations/${selectedLocationId}`, {
        data: {
          booth_coordinator: userDocumentId, // send a single users-permissions user's documentId for many-to-one relation
        },
      });

      message.success("Coordinator assigned successfully!");
      setIsModalOpen(false);
      setSelectedCoordinatorId(null);
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

  // console.log("Filtered Locations:", filteredLocations);
  // Table rendering
  const renderTable = () => (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                PS No
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Polling Station
              </th>

              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assembly
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                District
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IN Camera
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                OUT Camera
              </th>
              {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th> */}

              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Coordinator
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {locations.map((loc) => {
              const boothCams = camerasMap[loc.documentId] || { IN: [], OUT: [] };
              const inInstalled = boothCams.IN.some((c: any) => c.state === "Installed");
              const outInstalled = boothCams.OUT.some((c: any) => c.state === "Installed");

              const coordinator = loc.booth_coordinator;

              return (
                <tr
                  key={loc.documentId}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                    {loc.PS_No}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {/* <Link href={`/booth/locations/${row.documentId}`}> */}

                    <Link
                      href={`/installation/${loc.documentId}`}
                      className="font-medium text-blue-500 hover:underline"
                    >
                      {loc.PS_Name}
                    </Link>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                    {loc.assembly?.Assembly_Name || "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                    {loc.assembly?.district?.district_name || "—"}
                  </td>
                  <td>
                    {inInstalled ? (
                      <Badge className="bg-green-500 text-white">
                        Installed
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500 text-white">Pending</Badge>
                    )}
                  </td>

                  <td>
                    {outInstalled ? (
                      <Badge className="bg-green-500 text-white">
                        Installed
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500 text-white">Pending</Badge>
                    )}
                  </td>

                  {/* <td>
                    {inInstalled && outInstalled ? (
                      <Badge className="bg-green-600 text-white">
                        Completed
                      </Badge>
                    ) : inInstalled || outInstalled ? (
                      <Badge className="bg-yellow-500 text-white">
                        Partial
                      </Badge>
                    ) : (
                      <Badge className="bg-red-600 text-white">
                        Not Started
                      </Badge>
                    )}
                  </td> */}

                  <td className="px-4 py-3 whitespace-nowrap">
                    {coordinator ? (
                      <div>
                        <div className="font-medium text-gray-900">
                          {(coordinator.email || "").toLowerCase()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {coordinator.username}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">
                        Not Assigned
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      // onClick={(e) => {
                      //   e.stopPropagation();
                      //   setSelectedLocationId(loc.documentId);
                      //   setSelectedCoordinatorId(
                      //     coordinator?.documentId || null,
                      //   );
                      //   setIsModalOpen(true);
                      // }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLocationId(loc.documentId);

                        // find matching coordinator from coordinators array
                        const matched = coordinators.find(
                          (c) =>
                            c.documentId === loc.booth_coordinator?.documentId,
                        );

                        setSelectedCoordinatorId(matched?.documentId || null);
                        setIsModalOpen(true);
                      }}
                    >
                      {coordinator ? "Change" : "Assign"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {locations.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          No booth locations found.
        </div>
      )}
    </div>
  );

  // Card view rendering
  const renderCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {locations.map((loc) => {
        const status = loc.survey
          ? loc.survey.state ||
            (loc.survey.survey_date
              ? `Raised on ${loc.survey.survey_date}`
              : "Survey raised")
          : "Survey Not Raised";
        const coordinator = loc.booth_coordinator;

        return (
          <Link href={`/installation/${loc.documentId}`}>
            <Card
              key={loc.documentId}
              className="hover:shadow-md transition-shadow cursor-pointer"
            >
              <CardContent className="p-4">
                <div className="font-semibold text-lg text-gray-900">
                  {loc.PS_Name}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  PS No: {loc.PS_No}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Assembly:</span>
                    <span className="font-medium">
                      {loc.assembly?.Assembly_Name || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-500">District:</span>
                    <span className="font-medium">
                      {loc.assembly?.district?.district_name || "—"}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex justify-between items-center">
                  <div className="text-right">
                    {coordinator ? (
                      <div>
                        <div className="font-medium text-sm">
                          {(coordinator.email || "").toLowerCase()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {coordinator.username}
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
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
              </CardContent>
            </Card>
          </Link>
        );
      })}

      {locations.length === 0 && !loading && (
        <div className="col-span-full text-center py-8 text-gray-500">
          No booth locations found.
        </div>
      )}
    </div>
  );

  // Pagination controls
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
          onClick={() => fetchLocations(currentPage - 1, searchTerm)}
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
          onClick={() => fetchLocations(currentPage + 1, searchTerm)}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
  const kpis = useMemo(() => {
    let completed = 0;
    let partial = 0;
    let notStarted = 0;
    let totalInInstalled = 0;
    let totalOutInstalled = 0;
    let totalIn = 0;
    let totalOut = 0;

    locations.forEach((loc) => {
      const boothCams = camerasMap[loc.documentId] || { IN: [], OUT: [] };
      const inInstalled = boothCams.IN.some((c: any) => c.state === "Installed");
      const outInstalled = boothCams.OUT.some((c: any) => c.state === "Installed");

      if (inInstalled) totalInInstalled++;
      if (outInstalled) totalOutInstalled++;

      totalIn++;
      totalOut++;

      if (inInstalled && outInstalled) completed++;
      else if (inInstalled || outInstalled) partial++;
      else notStarted++;
    });

    return {
      completed,
      partial,
      notStarted,
      totalInInstalled,
      totalOutInstalled,
      totalIn,
      totalOut,
    };
  }, [locations]);

  return (
    <div className="space-y-6 p-4 sm:p-6  mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Booth Locations</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage booth locations, survey status, and coordinator assignments
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsBulkModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Installations</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Locations */}
        <Card className="border-l-4 border-gray-500">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Locations</p>
            <p className="text-2xl font-bold text-gray-800">
              {summary?.totalLocations ?? 0}
            </p>
          </CardContent>
        </Card>

        {/* IN Cameras */}
        <Card className="border-l-4 border-blue-500">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">IN Installed</p>
            <p className="text-2xl font-bold text-blue-600">
              {summary?.installedInCameras ?? 0} /{" "}
              {summary?.totalInCameras ?? 0}
            </p>
          </CardContent>
        </Card>

        {/* OUT Cameras */}
        <Card className="border-l-4 border-purple-500">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">OUT Installed</p>
            <p className="text-2xl font-bold text-purple-600">
              {summary?.installedOutCameras ?? 0} /{" "}
              {summary?.totalOutCameras ?? 0}
            </p>
          </CardContent>
        </Card>

        {/* Progress % */}
        <Card className="border-l-4 border-green-500">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Overall Progress</p>
            <p className="text-2xl font-bold text-green-600">
              {summary?.totalLocations
                ? Math.round(
                    ((summary.installedInCameras +
                      summary.installedOutCameras) /
                      (summary.totalInCameras + summary.totalOutCameras)) *
                      100,
                  )
                : 0}
              %
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className=" w-full relative flex-grow max-w-md">
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

        <div className="relative flex-grow max-w-md">
          <Select
            value={sortOrder}
            onChange={(val) => {
              setSortOrder(val);
              setCurrentPage(1);
            }}
            className=" w-full"
          >
            <Select.Option value="latest">Latest Updated</Select.Option>
            <Select.Option value="ps_asc">PS No ↑ (Ascending)</Select.Option>
            <Select.Option value="ps_desc">PS No ↓ (Descending)</Select.Option>
          </Select>
        </div>

        <Select
          placeholder="Filter by District"
          value={selectedDistrict}
          onChange={(val) => {
            setSelectedDistrict(val);
            setSelectedAssembly(undefined);
            setCurrentPage(1);
          }}
          allowClear
          className="w-full"
        >
          {districts.map((d) => (
            <Select.Option key={d.documentId} value={d.documentId}>
              {d.district_name}
            </Select.Option>
          ))}
        </Select>

        <Select
          className="w-full"
          placeholder="Filter by Assembly"
          value={selectedAssembly}
          disabled={!selectedDistrict}
          onChange={(val) => {
            setSelectedAssembly(val);
            setCurrentPage(1);
          }}
          allowClear
        >
          {assemblies.map((a) => (
            <Select.Option key={a.documentId} value={a.documentId}>
              {a.Assembly_Name}
            </Select.Option>
          ))}
        </Select>

        <div className="flex items-center space-x-2">
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
            Select a coordinator to assign to this booth location:
          </p>
          <Select
            style={{ width: "100%" }}
            placeholder="Select coordinator"
            value={
              coordinators.some((c) => c.documentId === selectedCoordinatorId)
                ? selectedCoordinatorId
                : undefined
            }
            onChange={setSelectedCoordinatorId}
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              (option?.children?.toString() ?? "")
                .toLowerCase()
                .includes(input.toLowerCase())
            }
          >
            {coordinators.map((coord) => (
              <Select.Option key={coord.documentId} value={coord.documentId}>
                {(coord.email || "").toLowerCase()}{" "}
                {coord.Phone_Number ? `(${coord.Phone_Number})` : ""}
              </Select.Option>
            ))}
          </Select>

          {selectedCoordinatorId && (
            <div className="mt-3 p-3 bg-blue-50 rounded-md">
              <p className="text-sm font-medium text-blue-800">Note:</p>
              <p className="text-xs text-blue-700 mt-1">
                This will replace any existing coordinator assigned to this
                booth location.
              </p>
            </div>
          )}
        </div>
      </Modal>
      <UploadInstallationsModal
        open={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={() => fetchLocations(currentPage)}
      />
    </div>
  );
}
