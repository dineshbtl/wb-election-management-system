"use client";

import React, { useEffect, useState } from "react";
import { Input, Pagination, Modal, Button as AntButton, message, Select, Empty, Checkbox } from "antd";
import bpi from "@/lib/bpi";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { exportElectionSurveysToExcel } from "@/lib/exportSurveysToExcel";
import CreateCoordinatorModal from "@/components/coordinator/Createcoordinator";
import Link from "next/link";
import {
  Plus,
  MoreVertical,
  Eye,
  FileEdit,
  UserPlus,
  FileSpreadsheet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageTitle } from "@/components/ui/page-title";

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

const Page = () => {
  const [user, setUser] = useState<any>(null);
  const [assembly, setAssembly] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [searchPSNo, setSearchPSNo] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Assign coordinator modal state
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assigningLocation, setAssigningLocation] = useState<any | null>(null);
  const [eligibleCoordinators, setEligibleCoordinators] = useState<any[]>([]);
  const [selectedCoordinator, setSelectedCoordinator] = useState<any | null>(
    null,
  );
  const [assignLoading, setAssignLoading] = useState(false);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [quickSelectModal, setQuickSelectModal] = useState(false);
  const [quickSelectSearch, setQuickSelectSearch] = useState<string>("");
  const [createCoordinatorOpen, setCreateCoordinatorOpen] = useState(false);
  const [surveyExporting, setSurveyExporting] = useState(false);

  // KPI counts
  const [raisedCount, setRaisedCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [sortOrder, setSortOrder] = useState<
    "latest" | "psno_asc" | "psno_desc"
  >("latest");

  // Filter
  const [surveyStatusFilter, setSurveyStatusFilter] = useState<
    "all" | "Raised" | "Completed"
  >("all");

  const router = useRouter();

  // KPI counts are now fetched via fetchKpis() in the useEffect below

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("No token found. Please log in again.");
          setLoading(false);
          return;
        }

        // 1️⃣ Fetch the logged-in user (use api client for correct baseURL + auth)
        const userRes = await api.get("/users/me?populate=*");
        const currentUser = userRes.data?.user ?? userRes.data;
        setUser(currentUser);

        // Get assembly from user's assemblies relation
        const userAssemblyNo = currentUser?.assemblies?.[0]?.Assembly_No;

        if (!userAssemblyNo) {
          setError("No Assembly assigned to this user.");
          setLoading(false);
          return;
        }

        const assemblyRes = await api.get("/assemblies", {
          params: {
            "filters[Assembly_No][$eq]": userAssemblyNo,
            "populate[district]": true,
          },
        });

        const matchedAssembly = assemblyRes.data.data?.[0];

        if (!matchedAssembly) {
          setError("No assembly found for this Assembly_No.");
          return;
        }

        setAssembly(matchedAssembly);

        console.log("🟢 Logged-in user's Assembly_No:", userAssemblyNo);

        // 3️⃣ Fetch all assemblies with locations and coordinator.profile and assembly.district populated

        // Fetch surveys for this assembly and map by booth.documentId for quick lookup
        try {
        } catch (err) {
          console.warn("Could not fetch surveys for assembly", err);
        }
      } catch (err: any) {
        console.error("❌ Error fetching data:", err);
        setError("Failed to fetch assembly or user data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchLocationsForAssembly = async (
    assemblyDocId: string,
    page = currentPage,
    size = pageSize,
    isInitial = false,
  ) => {
    if (isInitial) setLoading(true);
    else setTableLoading(true);
    try {
      const params: any = {
        "filters[assembly][documentId][$eq]": assemblyDocId,

        // ✅ SERVER PAGINATION
        "pagination[page]": page,
        "pagination[pageSize]": size,

        // sort: "PS_No:asc",

        // populate
        "populate[survey][fields][0]": "state",
        "populate[survey][fields][2]": "documentId",
        "populate[survey][populate][raised_by][fields][0]": "documentId",

        "populate[survey][fields][1]": "survey_date",

        "populate[booth_coordinator][fields][0]": "username",
        "populate[booth_coordinator][fields][1]": "email",
        "populate[booth_coordinator][populate][profile][fields][0]":
          "Full_Name",

        "populate[assembly][fields][0]": "Assembly_Name",
        "populate[assembly][populate][district][fields][0]": "district_name",
      };

      // params["sort"] = "updatedAt:desc";
      if (sortOrder === "latest") {
        params["sort"] = "updatedAt:desc";
      } else if (sortOrder === "psno_asc") {
        params["sort"] = "PS_No:asc";
      } else if (sortOrder === "psno_desc") {
        params["sort"] = "PS_No:desc";
      }

      // ✅ SERVER-SIDE SEARCH
      if (searchPSNo) {
        params["filters[$or][0][PS_No][$containsi]"] = searchPSNo;
        params["filters[$or][1][PS_Name][$containsi]"] = searchPSNo;
      }

      // ✅ SERVER-SIDE SURVEY FILTER
      if (surveyStatusFilter !== "all") {
        params["filters[survey][state][$eq]"] = surveyStatusFilter;
      }

      const res = await api.get("/locations", { params });

      setLocations(res.data.data || []);
      setTotalCount(res.data.meta.pagination.total);
    } catch (err) {
      console.error("Failed to fetch locations", err);
      setError("Failed to load locations");
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  const handleMarkAsCompleted = async (surveyDocumentId: string) => {
    try {
      await api.put(`/surveys/${surveyDocumentId}`, {
        data: {
          state: "Completed",
        },
      });

      message.success("Survey marked as completed");

      await reloadAssemblyAndSurveys(); // refresh table + KPIs
    } catch (err: any) {
      console.error("Failed to mark completed", err);
      message.error(
        err?.response?.data?.error?.message ||
          "Failed to mark survey as completed",
      );
    }
  };

  const fetchKpis = async (assemblyDocId: string) => {
    const base = {
      "filters[assembly][documentId][$eq]": assemblyDocId,
      "pagination[pageSize]": 1,
    };

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
  };

  // Fetch table data — isInitial=true only if no locations loaded yet (first fetch)
  useEffect(() => {
    if (!assembly?.documentId) return;
    const isInitial = locations.length === 0;
    fetchLocationsForAssembly(assembly.documentId, currentPage, pageSize, isInitial);
  }, [
    assembly,
    currentPage,
    pageSize,
    searchPSNo,
    surveyStatusFilter,
    sortOrder,
  ]);

  // Fetch KPIs once
  useEffect(() => {
    if (!assembly?.documentId) return;
    fetchKpis(assembly.documentId);
  }, [assembly]);

  const fetchEligibleCoordinators = async () => {
    if (!user?.documentId) return;

    try {
      // 1️⃣ app_users created by logged-in user
      const appUsersRes = await api.get("/app-users", {
        params: {
          populate: "user",
          "filters[createdby][documentId][$eq]": user.documentId,
          "pagination[pageSize]": 1000,
        },
      });

      const appUsers = appUsersRes.data.data || [];

      // 2️⃣ linked user IDs
      const linkedUserIds = appUsers
        .map((au: any) => au.user?.id)
        .filter(Boolean);

      if (!linkedUserIds.length) {
        setEligibleCoordinators([]);
        return;
      }

      // 3️⃣ fetch all users with roles
      const usersRes = await api.get("/users", {
        params: {
          populate: "role",
          "pagination[pageSize]": 1000,
        },
      });

      const allUsers = usersRes.data || [];

      // 4️⃣ booth coordinators only
      const boothUsers = allUsers.filter(
        (u: any) =>
          linkedUserIds.includes(u.id) && u.role?.type === "booth_coordinator",
      );

      // 5️⃣ map back to app_users
      const boothCoordinators = appUsers.filter((au: any) =>
        boothUsers.some((u: any) => u.id === au.user?.id),
      );

      console.log("✅ Booth coordinators:", boothCoordinators);
      setEligibleCoordinators(boothCoordinators);
    } catch (err) {
      console.error("Failed to load booth coordinators", err);
      setEligibleCoordinators([]);
    }
  };

  // Replace your fetchEligibleCoordinators useEffect with this:
  useEffect(() => {
    fetchEligibleCoordinators();
  }, [user?.documentId]);

  // Helper: reload locations and surveys for current assembly
  const reloadAssemblyAndSurveys = async () => {
    if (!assembly?.documentId) return;

    await fetchLocationsForAssembly(assembly.documentId, currentPage, pageSize);

    await fetchKpis(assembly.documentId);
  };

  // No longer needed: findUserByEmail

  // Assign the found user as booth coordinator for the selected location
  const handleConfirmAssign = async () => {
    if (!selectedCoordinator) {
      return message.warning("Select a coordinator first");
    }

    const coordinatorDocId = selectedCoordinator?.user?.documentId;

    if (!coordinatorDocId) {
      return message.error("Selected coordinator has no linked user");
    }

    const targetIds = assigningLocation
      ? [assigningLocation.documentId]
      : selectedLocationIds;

    if (!targetIds || targetIds.length === 0) {
      return message.warning("Select at least one location to assign");
    }

    setAssignLoading(true);
    try {
      for (const id of targetIds) {
        await api.put(`/locations/${id}`, {
          data: {
            booth_coordinator: coordinatorDocId,
          },
        });
      }

      message.success("Coordinator assigned successfully");

      setAssignModalVisible(false);
      setAssigningLocation(null);
      setSelectedCoordinator(null);
      setSelectedLocationIds([]);

      await reloadAssemblyAndSurveys();
    } catch (err: any) {
      console.error("Error assigning coordinator", err);
      message.error(
        err?.response?.data?.error?.message ||
          err?.message ||
          "Assignment failed",
      );
    } finally {
      setAssignLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center text-gray-500">
        Loading data...
      </div>
    );

  if (error)
    return (
      <div className="flex h-screen items-center justify-center text-red-600 font-medium">
        {error}
      </div>
    );

  if (!assembly)
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        No assembly data available.
      </div>
    );

  // Computed variables for filtering and selection

  const toggleSelectOne = (id: string) => {
    setSelectedLocationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = (visibleIds: string[]) => {
    const allSelected = visibleIds.every((id) =>
      selectedLocationIds.includes(id),
    );
    if (allSelected) setSelectedLocationIds((_) => []);
    else setSelectedLocationIds(visibleIds.slice());
  };

  const addAllFilteredToSelection = () => {
    const filteredIds = locations.map((l: any) => l.documentId);
    const newSelected = Array.from(
      new Set([...selectedLocationIds, ...filteredIds]),
    );
    setSelectedLocationIds(newSelected);
    message.success(`Added ${filteredIds.length} locations to selection`);
  };

  const handleExportSurveysExcel = async () => {
    if (!assembly?.documentId) {
      message.warning("Assembly is not loaded yet.");
      return;
    }
    setSurveyExporting(true);
    try {
      await exportElectionSurveysToExcel(
        api,
        {
          assemblyDocumentId: assembly.documentId,
          surveyState:
            surveyStatusFilter === "all" ? undefined : surveyStatusFilter,
        },
        { fileLabel: assembly.Assembly_Name || "assembly" },
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

  const confirmMarkCompleted = (surveyDocumentId: string) => {
    Modal.confirm({
      title: "Mark Survey as Completed?",
      content: "Are you sure you want to complete this survey?",
      okText: "Yes, Complete",
      cancelText: "Cancel",
      okButtonProps: {
        style: { backgroundColor: "#16a34a" }, // green
      },
      onOk: async () => {
        await handleMarkAsCompleted(surveyDocumentId);
      },
    });
  };

  return (
    <div className="min-h-screen ">

      <PageTitle
              title="Survey Locations"
              subtitle="Manage survey locations, survey status, and coordinator assignments"
            >
             {(() => {
            const role = user?.role?.type;
            let url = "";
            if (role === "assembly_coordinator") {
              url = `/assembly/surveys/new?role=assembly&assemblyId=${assembly.documentId}`;
            } else if (role === "district_coordinator") {
              url = `/district/surveys/new?role=district&districtId=${assembly.district?.documentId}`;
            }

            if (!url) return null;

            return (
              <Link href={url}>
                <Button variant="default" className="bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] hover:from-[#2d7ae8] hover:to-[#1976D2] text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Raise a Survey
                </Button>
              </Link>
            );
          })()}
            </PageTitle>
      <div className="w-full mx-auto   rounded-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-sm text-gray-500">Total Booths</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {totalCount}
            </p>
          </div>
          <div
            className={`rounded-xl border-2  p-4 shadow-sm cursor-pointer transition-all ${
              surveyStatusFilter === "Raised"
                ? "bg-white text-black  shadow-lg  border-[#2196F3]"
                : "bg-white hover:bg-blue-50"
            }`}
            onClick={() =>
              setSurveyStatusFilter((prev) => (prev === "Raised" ? "all" : "Raised"))
            }
          >
            <p className={`text-sm ${surveyStatusFilter === "Raised" ? "text-gray-500" : "text-gray-500"}`}>Raised</p>
            <p className={`text-2xl font-bold mt-1 ${surveyStatusFilter === "Raised" ? "text-[#2196F3]" : "text-[#2196F3]"}`}>
              {raisedCount}
            </p>
          </div>
          <div
            className={`rounded-xl border-2  p-4 shadow-sm cursor-pointer transition-all ${
              surveyStatusFilter === "Completed"
                ? "bg-white text-black  shadow-lg  border-[#4CAF50]"
                : "bg-white hover:bg-green-50"
            }`}
            onClick={() =>
              setSurveyStatusFilter((prev) => (prev === "Completed" ? "all" : "Completed"))
            }
          >
            <p className={`text-sm ${surveyStatusFilter === "Completed" ? "text-gray-500" : "text-gray-500"}`}>Completed</p>
            <p className={`text-2xl font-bold mt-1 ${surveyStatusFilter === "Completed" ? "text-[#4CAF50]" : "text-[#4CAF50]"}`}>
              {completedCount}
            </p>
          </div>

          
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          {user?.Full_Name} — {assembly?.Assembly_Name || "—"} (
          {assembly?.State || "—"})
        </h2>

        {surveyStatusFilter !== "all" && (
          <div className="mb-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700">
              Filter: {surveyStatusFilter}
              <button
                onClick={() => setSurveyStatusFilter("all")}
                className="text-blue-600 hover:text-blue-900"
              >
                ✕
              </button>
            </span>
          </div>
        )}

        <div className="overflow-x-auto  rounded-lg">
          {/* Search input */}
          <div className=" py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <Input
                  placeholder={`Search by PS Number or Booth Name (showing ${locations.length})`}
                  value={searchPSNo}
                  onChange={(e) => {
                    setSearchPSNo(e.target.value || "");
                    setCurrentPage(1);
                  }}
                  style={{ width: 320 }}
                  allowClear
                />

                <Select
                  value={sortOrder}
                  onChange={(value) => {
                    setSortOrder(value);
                    setCurrentPage(1);
                  }}
                  style={{ width: 180 }}
                >
                  <Select.Option value="latest">Latest Updated</Select.Option>
                  <Select.Option value="psno_asc">
                    PS No ↑ (Ascending)
                  </Select.Option>
                  <Select.Option value="psno_desc">
                    PS No ↓ (Descending)
                  </Select.Option>
                </Select>

                <Select
                  placeholder="Survey Status"
                  value={
                    surveyStatusFilter === "all"
                      ? undefined
                      : surveyStatusFilter
                  }
                  onChange={(value) => {
                    if (!value) {
                      setSurveyStatusFilter("all"); // 🔥 reset properly
                    } else {
                      setSurveyStatusFilter(value);
                    }
                    setCurrentPage(1);
                  }}
                  allowClear
                  style={{ width: 180 }}
                >
                  <Select.Option value="Raised">Raised</Select.Option>
                  <Select.Option value="Completed">Completed</Select.Option>
                </Select>

                <AntButton
                  type="default"
                  loading={surveyExporting}
                  disabled={!assembly?.documentId}
                  onClick={() => void handleExportSurveysExcel()}
                  icon={<FileSpreadsheet className="w-4 h-4" />}
                >
                  Excel export
                </AntButton>

                <AntButton type="dashed" onClick={addAllFilteredToSelection}>
                  + Add All{" "}
                  {locations.length > 0 ? `(${locations.length})` : ""}
                </AntButton>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-600">
                  Selected: {selectedLocationIds.length} / {locations.length}
                </span>
                <AntButton
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedLocationIds.length === 0) {
                      message.warning(
                        "Select at least one location to bulk assign",
                      );
                      return;
                    }
                    setAssigningLocation(null);
                    setSelectedCoordinator(null);
                    setAssignModalVisible(true);
                  }}
                  type="primary"
                >
                  Bulk Assign ({selectedLocationIds.length})
                </AntButton>
              </div>
            </div>
            {selectedLocationIds.length > 0 && (
              <div className="flex items-center gap-2 text-sm bg-blue-50 p-2 rounded">
                <span className="font-medium">
                  {selectedLocationIds.length} location(s) selected
                </span>
                <button
                  onClick={() => setSelectedLocationIds([])}
                  className="text-xs text-red-600 hover:text-red-800 underline"
                >
                  Clear selection
                </button>
              </div>
            )}
          </div>
          <div className="w-full overflow-x-auto bg-gray-50 overscroll-x-contain custom-scrollbar border-0 border-t border-b">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  <th className="px-3 py-3.5 text-left w-10">
                    <Checkbox
                      checked={
                        locations.length > 0 &&
                        locations.every((l: any) =>
                          selectedLocationIds.includes(l.documentId),
                        )
                      }
                      onChange={(e) => {
                        if (e.target.checked)
                          toggleSelectAll(locations.map((l: any) => l.documentId));
                        else toggleSelectAll([]);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </th>
                  <th
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600 tracking-wider"
                    style={{ width: "26%" }}
                  >
                    Polling Station
                  </th>
                  <th
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600 tracking-wider"
                    style={{ width: "26%" }}
                  >
                    Location
                  </th>
                  <th
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600 tracking-wider"
                    style={{ width: "12%" }}
                  >
                    Status
                  </th>
                  <th
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600 tracking-wider min-w-[120px]"
                  >
                    Coordinator
                  </th>
                  <th className="px-3 py-3.5 text-left min-w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {locations.length > 0 ? (
                  locations.map((loc: any, idx: number) => {
                    const status = loc.survey?.state || (loc.survey?.documentId ? "Raised" : "Survey Not Raised");
                    const coordinator = loc.booth_coordinator;
                    const assemblyName = loc.assembly?.Assembly_Name || "—";
                    const districtDisplay = formatDistrictDisplay(loc.assembly?.district);
                    return (
                    <tr
                      key={loc.documentId || idx}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-3 py-3 w-10 align-top">
                        <Checkbox
                          checked={selectedLocationIds.includes(loc.documentId)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleSelectOne(loc.documentId)}
                        />
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-700 break-words align-top">
                        <div className="space-y-0.5">
                          <Link
                            href={`/assembly/surveys/${loc.documentId}`}
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
                          <div className="text-gray-500 text-xs">
                            District: {districtDisplay}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm align-top whitespace-nowrap">
                        <Badge
                          variant={
                            status === "Survey Not Raised"
                              ? "outline"
                              : status === "Raised"
                                ? "primary"
                                : "success"
                          }
                          className={`rounded-lg font-medium ${status === "Survey Not Raised" ? "" : status === "Raised" ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-green-100 text-green-700 border-green-200"}`}
                        >
                          {status === "Survey Not Raised" ? "Not Raised" : status}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-sm break-words align-top min-w-[120px]">
                        {coordinator ? (
                          <div className="space-y-0.5">
                            {(coordinator.profile?.Full_Name || coordinator.username) && (
                              <div className="font-medium text-gray-900">
                                {formatSurveyListText(
                                  coordinator.profile?.Full_Name || coordinator.username || "",
                                )}
                              </div>
                            )}
                            {coordinator.email && (
                              <div className="text-gray-600">{(coordinator.email || "").toLowerCase()}</div>
                            )}
                            {coordinator.profile?.Phone_Number && (
                              <div className="text-gray-500 text-xs">
                                {coordinator.profile.Phone_Number}
                              </div>
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
                              setAssigningLocation(loc);
                              setSelectedCoordinator(null);
                              setAssignModalVisible(true);
                            }}
                          >
                            Assign
                          </Button>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top whitespace-nowrap text-sm min-w-[100px]">
                        <div className="flex items-center gap-2">
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
                                <Link
                                  href={`/assembly/surveys/${loc.documentId}`}
                                  className="flex items-center gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  View
                                </Link>
                              </DropdownMenuItem>
                              {loc.survey?.documentId ? (
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/assembly/surveys/${loc.survey.documentId}/edit`}
                                    className="flex items-center gap-2"
                                  >
                                    <FileEdit className="h-4 w-4" />
                                    Edit Survey
                                  </Link>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={(() => {
                                      const encId = encodeURIComponent(loc.documentId);
                                      if (user?.role?.type === "booth_coordinator") return `/booth/surveys/new?boothId=${encId}`;
                                      if (user?.role?.type === "district_coordinator") return `/district/surveys/new?boothId=${encId}`;
                                      if (user?.role?.type === "assembly_coordinator") return `/assembly/surveys/new?boothId=${encId}`;
                                      return `/surveys/new?boothId=${encId}`;
                                    })()}
                                    className="flex items-center gap-2"
                                  >
                                    <FileEdit className="h-4 w-4" />
                                    Raise Survey
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={() => {
                                  setAssigningLocation(loc);
                                  setSelectedCoordinator(null);
                                  setAssignModalVisible(true);
                                }}
                              >
                                <UserPlus className="h-4 w-4" />
                                Change Coordinator
                              </DropdownMenuItem>
                              {loc.survey?.documentId && loc.survey.state !== "Completed" && (
                                <DropdownMenuItem
                                  className="flex items-center gap-2 cursor-pointer text-green-600 focus:text-green-600"
                                  onClick={() => confirmMarkCompleted(loc.survey.documentId)}
                                >
                                  Mark as Completed
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center">
                      <Empty
                        description={
                          surveyStatusFilter !== "all"
                            ? "No records match the selected filter"
                            : "No data"
                        }
                      >
                        {surveyStatusFilter !== "all" && (
                          <AntButton
                            type="primary"
                            onClick={() => setSurveyStatusFilter("all")}
                            size="small"
                          >
                            Clear filter
                          </AntButton>
                        )}
                      </Empty>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="p-4 flex justify-end">
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={totalCount}
              showSizeChanger
              showQuickJumper
              onChange={(page, size) => {
                setCurrentPage(page);
                if (size && size !== pageSize) {
                  setPageSize(size);
                  setCurrentPage(1);
                }
              }}
            />
          </div>
        </div>

        <Modal
          open={assignModalVisible}
          title={
            assigningLocation
              ? `Assign Coordinator — ${assigningLocation.PS_Name || assigningLocation.documentId}`
              : `Assign Coordinator to ${selectedLocationIds.length} Location${selectedLocationIds.length !== 1 ? "s" : ""}`
          }
          onCancel={() => {
            setAssignModalVisible(false);
            setAssigningLocation(null);
            setSelectedCoordinator(null);
          }}
          okText="Assign"
          onOk={handleConfirmAssign}
          confirmLoading={assignLoading}
        >
          <div className="space-y-3">
            {eligibleCoordinators.length === 0 && (
              <Empty description="No booth coordinators found">
                <AntButton
                  type="primary"
                  onClick={() => setCreateCoordinatorOpen(true)}
                >
                  + Create Coordinator
                </AntButton>
              </Empty>
            )}

            {eligibleCoordinators.length > 0 && (
              <>
                <Select
                  style={{ width: "100%" }}
                  placeholder="Select booth coordinator"
                  value={selectedCoordinator?.documentId || undefined}
                  onChange={(value) => {
                    const selected = eligibleCoordinators.find(
                      (c) => c.documentId === value,
                    );
                    setSelectedCoordinator(selected || null);
                  }}
                  showSearch
                  optionFilterProp="searchValue"
                >
                  {eligibleCoordinators.map((coord: any) => (
                    <Select.Option
                      key={coord.documentId}
                      value={coord.documentId}
                      searchValue={`${coord.Full_Name} ${(coord.user?.email || "").toLowerCase()}`} // 👈 searchable
                    >
                      {coord.Full_Name}{" "}
                      {coord.user?.email ? `(${(coord.user.email || "").toLowerCase()})` : ""}
                    </Select.Option>
                  ))}
                </Select>

                <AntButton
                  type="link"
                  onClick={() => setCreateCoordinatorOpen(true)}
                >
                  + Create new coordinator
                </AntButton>
              </>
            )}

            {selectedCoordinator && (
              <div className="p-2 border rounded">
                <div className="font-medium">
                  {selectedCoordinator.Full_Name}
                </div>
                <div className="text-sm text-gray-600">
                  {(selectedCoordinator.user?.email || "").toLowerCase()}
                </div>
              </div>
            )}
          </div>
        </Modal>
      </div>

      <CreateCoordinatorModal
        role={user?.role?.type}
        open={createCoordinatorOpen}
        onClose={() => setCreateCoordinatorOpen(false)}
        onCreated={() => {
          // 1️⃣ Add to coordinator list
          fetchEligibleCoordinators();

          // 3️⃣ Close create modal
          setCreateCoordinatorOpen(false);

          message.success("Coordinator created and selected");
        }}
      />
    </div>
  );
};

export default Page;
