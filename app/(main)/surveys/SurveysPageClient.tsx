"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  List,
  LayoutGrid,
  UserPlus,
  MapPin,
  Camera,
  Clock,
  User,
  MoreVertical,
  Eye,
  Pencil,
  UserPlus as AssignIcon,
  Trash2,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  FileSpreadsheet,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SelectionBar } from "@/components/ui/selection-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTitle } from "@/components/ui/page-title";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Select, Modal, message, Checkbox } from "antd";
import api from "@/lib/api";
import { exportElectionSurveysToExcel } from "@/lib/exportSurveysToExcel";
import Link from "next/link";

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
    profile?: {
      Full_Name?: string | null;
      Phone_Number?: string | null;
    } | null;
  } | null;
  /** Unique-list API: merged polling stations under one canonical venue */
  children?: Location[];
  pollingStationCount?: number;
  groupKey?: string;
  canonicalName?: string;
}

type KpiPayload = {
  totalPollingStations: number;
  uniqueLocations: number;
  raisedPollingStations: number;
  completedPollingStations: number;
  pendingPollingStations: number;
  raisedUniqueLocations: number;
  completedUniqueLocations: number;
  pendingUniqueLocations: number;
};

/** Strapi /dashboard/* responses (subset used for survey KPI cards). */
type DashboardKpiResponse = {
  totalLocations?: number;
  totalSurveys?: number;
  raisedSurveys?: number;
  completedSurveys?: number;
};

function kpiPayloadFromDashboard(d: DashboardKpiResponse): KpiPayload {
  const totalLocations = d.totalLocations ?? 0;
  const totalSurveys = d.totalSurveys ?? 0;
  const raised = d.raisedSurveys ?? 0;
  const completed = d.completedSurveys ?? 0;
  const pending = Math.max(0, totalLocations - totalSurveys);
  return {
    totalPollingStations: totalLocations,
    uniqueLocations: 0,
    raisedPollingStations: raised,
    completedPollingStations: completed,
    pendingPollingStations: pending,
    raisedUniqueLocations: 0,
    completedUniqueLocations: 0,
    pendingUniqueLocations: 0,
  };
}

function kpiPayloadFromUniqueLocationsApi(data: any): KpiPayload {
  const apiKpis = data?.kpis ?? {};
  return {
    totalPollingStations:
      apiKpis.totalPollingStations ?? data.totalPollingStations ?? 0,
    uniqueLocations: apiKpis.uniqueLocations ?? data.uniqueLocations ?? 0,
    raisedPollingStations: apiKpis.raisedPollingStations ?? 0,
    completedPollingStations: apiKpis.completedPollingStations ?? 0,
    pendingPollingStations: apiKpis.pendingPollingStations ?? 0,
    raisedUniqueLocations: apiKpis.raisedUniqueLocations ?? 0,
    completedUniqueLocations: apiKpis.completedUniqueLocations ?? 0,
    pendingUniqueLocations: apiKpis.pendingUniqueLocations ?? 0,
  };
}

/** Format district for display: "S0302 (DHUBRI)" -> "Dhubri (S0302)" */
function formatDistrictDisplay(
  district: { district_name?: string } | null | undefined,
): string {
  if (!district?.district_name) return "—";
  const raw = district.district_name.trim();
  const match = raw.match(/^([A-Z0-9]+)\s*\(([^)]+)\)\s*$/i);
  if (match) {
    const [, code, namePart] = match;
    const name =
      namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
    return `${name} (${code})`;
  }
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

/**
 * Format list text: "032 NO NATUN PUB JORDANGA AP (RIGHT)" → "032 No. Natun Pub Jordanga AP (right)"
 * - Standalone "NO" → "No."
 * - Words in (parens) → lowercase
 * - Other words → title case (first letter upper, rest lower)
 */
function formatSurveyListText(text: string | null | undefined): string {
  if (text == null || !String(text).trim()) return text ?? "—";
  let s = String(text).trim();
  // Replace standalone NO with No.
  s = s.replace(/\bNO\b/g, "No.");
  // Process word by word; lowercase content inside parentheses
  s = s.replace(/\S+/g, (word) => {
    if (word.startsWith("(") && word.endsWith(")")) {
      return "(" + word.slice(1, -1).toLowerCase() + ")";
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  return s;
}

export default function BoothLocationsPage() {
  const router = useRouter();
  const { toast } = useToast();

  // States
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [selectedDistrict, setSelectedDistrict] = useState<
    string | undefined
  >();
  const [selectedAssembly, setSelectedAssembly] = useState<
    string | undefined
  >();
  const [selectedSurveyState, setSelectedSurveyState] = useState<
    "Raised" | "Completed" | "Unassigned" | undefined
  >();

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  const [user, setUser] = useState<any>(null);

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

  // Sort: always last updated first (no UI for sort)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const initialFetchDone = useRef(false);
  const initialViewSet = useRef(false);

  useEffect(() => {
    if (isMobile && !initialViewSet.current) {
      setViewMode("card");
      initialViewSet.current = true;
    }
  }, [isMobile]);

  // Delete location modal
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    documentId: string | null;
    name: string;
  }>({ open: false, documentId: null, name: "" });
  const [deleting, setDeleting] = useState(false);
  const [surveyExporting, setSurveyExporting] = useState(false);

  // KPIs from backend: total = all polling stations; raised/pending/completed = by survey state
  const [kpis, setKpis] = useState({
    total: 0,
    raised: 0,
    pending: 0,
    completed: 0,
  });
  const [uniqueLocationsRefreshing, setUniqueLocationsRefreshing] =
    useState(false);
  /** True until dashboard / KPI API finishes (avoids flashing 0 before real totals). */
  const [kpiLoading, setKpiLoading] = useState(true);
  const [showUniqueList, setShowUniqueList] = useState(false);
  const [kpiPayload, setKpiPayload] = useState<KpiPayload | null>(null);
  /** Expanded canonical groups (unique list with multiple booths) */
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(
    () => new Set(),
  );

  const applyKpisFromPayload = (payload: Partial<KpiPayload>) => {
    setKpis({
      total: showUniqueList
        ? payload.uniqueLocations ?? 0
        : payload.totalPollingStations ?? 0,
      raised: showUniqueList
        ? payload.raisedUniqueLocations ?? 0
        : payload.raisedPollingStations ?? 0,
      pending: showUniqueList
        ? payload.pendingUniqueLocations ?? 0
        : payload.pendingPollingStations ?? 0,
      completed: showUniqueList
        ? payload.completedUniqueLocations ?? 0
        : payload.completedPollingStations ?? 0,
    });
  };

  const handleTotalCardClick = () => {
    setSelectedSurveyState(undefined);
    setCurrentPage(1);
    toast({
      title: "List updated",
      description: showUniqueList
        ? "Unique locations list is active."
        : "All polling stations list is active.",
    });
  };

  const handleKpiStatusCardClick = (
    state: "Raised" | "Completed" | "Unassigned",
  ) => {
    setCurrentPage(1);
    setSelectedSurveyState(state);
  };

  const handleExportSurveysExcel = async () => {
    if (!selectedAssembly && !selectedDistrict) {
      toast({
        variant: "destructive",
        title: "Choose a scope",
        description: "Select a district or assembly to download survey data.",
      });
      return;
    }
    setSurveyExporting(true);
    try {
      const fileLabel = selectedAssembly
        ? assemblies.find((a) => a.documentId === selectedAssembly)
            ?.Assembly_Name
        : districts.find((d) => d.documentId === selectedDistrict)
            ?.district_name;
      await exportElectionSurveysToExcel(
        api,
        {
          assemblyDocumentId: selectedAssembly || undefined,
          districtDocumentId:
            !selectedAssembly && selectedDistrict ? selectedDistrict : undefined,
          surveyState:
            selectedSurveyState === "Raised" ||
            selectedSurveyState === "Completed"
              ? selectedSurveyState
              : undefined,
        },
        { fileLabel: fileLabel || undefined },
      );
      toast({
        variant: "success",
        title: "Export ready",
        description: "Survey details have been downloaded as Excel.",
      });
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Could not export surveys. Try again.";
      toast({
        variant: "destructive",
        title: "Export failed",
        description: msg,
      });
    } finally {
      setSurveyExporting(false);
    }
  };

  // Fetch logged-in user to get created coordinators

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/users/me", {
          params: {
            "populate[role]": true,
            "populate[profile]": true,
            "populate[assemblies]": true,
            "populate[districts]": true,
          },
        });
        setUser(res.data);
      } catch (err) {
        console.error("Failed to fetch user", err);
      }
    };

    fetchUser();
  }, []);

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

  // Fetch locations with all required relations - FIXED POPULATE SYNTAX
  const fetchLocations = async (page = 1, search = searchTerm) => {
    setLoading(true);
    try {
      if (showUniqueList) {
        setUniqueLocationsRefreshing(true);
        try {
          const params = new URLSearchParams();
          params.set("list", "1");
          params.set("page", String(page));
          params.set("pageSize", String(pageSize));
          if (search) params.set("search", search);
          if (selectedDistrict) params.set("districtId", selectedDistrict);
          if (selectedAssembly) params.set("assemblyId", selectedAssembly);
          if (selectedSurveyState) params.set("surveyState", selectedSurveyState);

          const uniqueRes = await fetch(`/api/unique-locations?${params.toString()}`);
          if (!uniqueRes.ok) throw new Error("Failed to load unique locations");

          const uniqueData = await uniqueRes.json();
          const list = Array.isArray(uniqueData?.data) ? uniqueData.data : [];
          const meta = uniqueData?.meta?.pagination;

          setLocations(list);
          const total = meta?.total ?? list.length;
          setTotalPages(total > 0 ? Math.ceil(total / pageSize) : 1);
          setTotalItems(total);
          setCurrentPage(meta?.page ?? page);

          const payload = kpiPayloadFromUniqueLocationsApi(uniqueData);
          setKpiPayload(payload);
          applyKpisFromPayload(payload);
        } finally {
          setUniqueLocationsRefreshing(false);
        }
        return;
      }

      const params: any = {
        "pagination[page]": page,
        "pagination[pageSize]": pageSize,

        "populate[booth_coordinator][fields][0]": "documentId",
        "populate[booth_coordinator][fields][1]": "email",
        "populate[booth_coordinator][fields][2]": "username",
        "populate[booth_coordinator][populate][profile][fields][0]":
          "Full_Name",
        "populate[booth_coordinator][populate][profile][fields][1]":
          "Phone_Number",

        "populate[assembly][fields][0]": "documentId",
        "populate[assembly][fields][1]": "Assembly_Name",
        "populate[assembly][populate][district][fields][0]": "documentId",
        "populate[assembly][populate][district][fields][1]": "district_name",

        "populate[survey][fields][0]": "documentId",
        "populate[survey][fields][1]": "site_condition",
        "populate[survey][fields][2]": "survey_date",
        "populate[survey][fields][3]": "state",
      };

      // Always sort by last updated first
      params["sort"] = "updatedAt:desc";

      // 🎯 Survey state filter
      if (selectedSurveyState === "Unassigned") {
        params["filters[survey][documentId][$null]"] = true;
      } else if (selectedSurveyState) {
        params["filters[survey][state][$eq]"] = selectedSurveyState;
      }

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

      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : [];
      setLocations(list);
      const meta = res.data?.meta?.pagination ?? res.data?.pagination;
      const total = meta ? (meta.total ?? meta.totalCount ?? 0) : 0;

      setTotalPages(total > 0 ? Math.ceil(total / pageSize) : 1);
      setTotalItems(total);
      setCurrentPage(meta?.page ?? 1);
    } catch (err) {
      console.error("Failed to load survey locations", err);
      setLocations([]);
      toast({
        variant: "destructive",
        title: "Failed to load list",
        description: "Could not load survey locations. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchKpis = async () => {
    if (showUniqueList) return;
    setKpiLoading(true);
    let usedSlowFallback = false;
    try {
      let d: DashboardKpiResponse | null = null;
      try {
        if (selectedAssembly) {
          const res = await api.get(
            `/dashboard/assembly/${encodeURIComponent(selectedAssembly)}`,
          );
          d = res.data?.data ?? null;
        } else if (selectedDistrict) {
          const res = await api.get(
            `/dashboard/district/${encodeURIComponent(selectedDistrict)}`,
          );
          d = res.data?.data ?? null;
        } else {
          const res = await api.get("/dashboard/superadmin");
          d = res.data?.data ?? null;
        }
      } catch (e) {
        console.warn("Dashboard KPI endpoint failed, falling back", e);
        d = null;
      }

      if (
        d &&
        typeof d.totalLocations === "number" &&
        typeof d.raisedSurveys === "number" &&
        typeof d.completedSurveys === "number" &&
        typeof d.totalSurveys === "number"
      ) {
        const payload = kpiPayloadFromDashboard(d);
        setKpiPayload(payload);
        applyKpisFromPayload(payload);
        return;
      }

      usedSlowFallback = true;
      setUniqueLocationsRefreshing(true);
      const params = new URLSearchParams();
      params.set("kpisOnly", "1");
      if (selectedDistrict) params.set("districtId", selectedDistrict);
      if (selectedAssembly) params.set("assemblyId", selectedAssembly);
      const res = await fetch(`/api/unique-locations?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load KPI counts");
      const data = await res.json();
      const payload = kpiPayloadFromUniqueLocationsApi(data);
      setKpiPayload(payload);
      applyKpisFromPayload(payload);
    } catch (err) {
      console.error("Failed to fetch KPIs", err);
    } finally {
      setKpiLoading(false);
      if (usedSlowFallback) setUniqueLocationsRefreshing(false);
    }
  };

  useEffect(() => {
    if (showUniqueList) return;
    fetchKpis();
  }, [selectedDistrict, selectedAssembly, showUniqueList]);

  useEffect(() => {
    if (showUniqueList) setKpiLoading(false);
  }, [showUniqueList]);

  useEffect(() => {
    if (!kpiPayload) return;
    applyKpisFromPayload(kpiPayload);
  }, [showUniqueList, kpiPayload]);

  // Initial load: fetch immediately so skeleton is replaced as soon as data arrives
  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchLocations(1, searchTerm);
      return;
    }
    const timer = setTimeout(() => {
      fetchLocations(1, searchTerm);
    }, 320);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedDistrict, selectedAssembly, selectedSurveyState, showUniqueList]);

  // Keep selection in sync with current page (remove ids no longer in list)
  useEffect(() => {
    const ids = new Set(locations.map((l) => l.documentId));
    setSelectedRowKeys((prev) => prev.filter((id) => ids.has(id)));
  }, [locations]);

  // Districts and Assemblies for filters
  const [districts, setDistricts] = useState<any[]>([]);
  const [assemblies, setAssemblies] = useState<any[]>([]);

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

  // Load coordinators when assign modal opens; skip if we already have a list (stable deps: length 1)
  useEffect(() => {
    if (!isModalOpen) return;
    if (coordinators.length > 0) return;
    void fetchCoordinators();
    // coordinators.length intentionally omitted — only re-check when modal opens/closes
  }, [isModalOpen]);

  // Search filtering (client-side for simplicity)
  // const filteredLocations = useMemo(() => {
  //   if (!searchTerm) return locations;
  //   const term = searchTerm.toLowerCase();
  //   return locations.filter(
  //     (loc) =>
  //       loc.PS_Name.toLowerCase().includes(term) ||
  //       loc.PS_No.toLowerCase().includes(term) ||
  //       loc.assembly?.Assembly_Name?.toLowerCase().includes(term) ||
  //       loc.assembly?.district?.district_name?.toLowerCase().includes(term),
  //   );
  // }, [locations, searchTerm]);

  // Target location IDs: single (from row/card) or bulk (from selection)
  const assignTargetIds = selectedLocationId
    ? [selectedLocationId]
    : selectedRowKeys;

  const handleAssignCoordinator = async () => {
    if (!selectedCoordinatorId) {
      message.error("Please select a coordinator");
      return;
    }
    if (assignTargetIds.length === 0) {
      message.error("Please select at least one polling station");
      return;
    }

    setAssigning(true);
    try {
      const selectedCoord = coordinators.find(
        (c) => c.documentId === selectedCoordinatorId,
      );
      if (!selectedCoord) {
        message.error("Coordinator not found");
        return;
      }

      let userDocumentId = selectedCoord.documentId;
      if (!selectedCoord.profileId) {
        let linkedUser: any = null;

        try {
          const byProfile = await api.get("/users", {
            params: {
              "filters[profile][id][$eq]": selectedCoord.id,
              "pagination[pageSize]": 1,
            },
          });
          linkedUser = byProfile.data.data?.[0] || null;
        } catch (err) {
          console.warn("Lookup by profile id failed", err);
        }

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
            "This person's account isn't set up for assignments yet. Try another coordinator or ask an admin to set up their account.",
          );
          setAssigning(false);
          return;
        }

        userDocumentId = linkedUser.documentId;
      }

      for (const locId of assignTargetIds) {
        await api.put(`/locations/${locId}`, {
          data: { booth_coordinator: userDocumentId },
        });
      }

      message.success(
        assignTargetIds.length === 1
          ? "Coordinator assigned successfully!"
          : `Coordinator assigned to ${assignTargetIds.length} polling stations.`,
      );
      setIsModalOpen(false);
      setSelectedCoordinatorId(null);
      setSelectedLocationId(null);
      setSelectedRowKeys([]);
      fetchLocations(currentPage);
    } catch (err: any) {
      console.error("Failed to assign coordinator", err);
      const errorMsg =
        err.response?.data?.error?.message ||
        "Something went wrong. Please try again.";
      message.error(errorMsg);
    } finally {
      setAssigning(false);
    }
  };

  const handleDeleteLocation = async () => {
    if (!deleteModal.documentId) return;
    setDeleting(true);
    try {
      await api.delete(`/locations/${deleteModal.documentId}`);
      toast({
        title: "Deleted",
        description: `${deleteModal.name} has been removed.`,
      });
      setDeleteModal({ open: false, documentId: null, name: "" });
      setSelectedRowKeys((prev) =>
        prev.filter((id) => id !== deleteModal.documentId),
      );
      fetchLocations(currentPage);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err.response?.data?.error?.message || "Failed to delete location.",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Table rendering - horizontal scroll on mobile to prevent overlapping
  const renderTable = () => (
    <div className="w-full overflow-x-auto overscroll-x-contain custom-scrollbar">
      <table className="w-full min-w-[680px]">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/80">
            <th className="px-3 py-3.5 text-left w-10">
              <Checkbox
                checked={
                  (() => {
                    const allIds = locations.flatMap((l) => {
                      if (
                        showUniqueList &&
                        l.children &&
                        l.children.length > 0
                      ) {
                        return l.children.map((c) => c.documentId);
                      }
                      return [l.documentId];
                    });
                    return (
                      allIds.length > 0 &&
                      allIds.every((id) => selectedRowKeys.includes(id))
                    );
                  })()
                }
                indeterminate={
                  (() => {
                    const allIds = locations.flatMap((l) => {
                      if (
                        showUniqueList &&
                        l.children &&
                        l.children.length > 0
                      ) {
                        return l.children.map((c) => c.documentId);
                      }
                      return [l.documentId];
                    });
                    const some = allIds.some((id) =>
                      selectedRowKeys.includes(id),
                    );
                    return some && !allIds.every((id) => selectedRowKeys.includes(id));
                  })()
                }
                onChange={(e) => {
                  const allIds = locations.flatMap((l) => {
                    if (
                      showUniqueList &&
                      l.children &&
                      l.children.length > 0
                    ) {
                      return l.children.map((c) => c.documentId);
                    }
                    return [l.documentId];
                  });
                  if (e.target.checked) setSelectedRowKeys(allIds);
                  else setSelectedRowKeys([]);
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
          {locations.map((loc) => {
            const status = loc.survey
              ? loc.survey.state ||
                (loc.survey.survey_date
                  ? `Raised on ${loc.survey.survey_date}`
                  : "Survey raised")
              : "Survey Not Raised";
            const coordinator = loc.booth_coordinator;
            const assemblyName = loc.assembly?.Assembly_Name || "—";
            const districtDisplay = formatDistrictDisplay(
              loc.assembly?.district,
            );

            const boothChildRows =
              showUniqueList &&
              loc.children &&
              loc.children.length > 1
                ? loc.children
                : [];
            const groupExpanded =
              loc.groupKey != null && expandedGroupKeys.has(loc.groupKey);
            const rowIds =
              boothChildRows.length > 0
                ? boothChildRows.map((c) => c.documentId)
                : [loc.documentId];

            return (
              <React.Fragment key={loc.groupKey ?? loc.documentId}>
              <tr
                className="hover:bg-gray-50/50 transition-colors"
              >
                <td
                  className="px-3 py-3 w-10 align-top"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={
                      rowIds.length > 1
                        ? rowIds.every((id) => selectedRowKeys.includes(id))
                        : selectedRowKeys.includes(loc.documentId)
                    }
                    onChange={(e) => {
                      if (e.target.checked)
                        setSelectedRowKeys((prev) => [
                          ...prev.filter((id) => !rowIds.includes(id)),
                          ...rowIds,
                        ]);
                      else
                        setSelectedRowKeys((prev) =>
                          prev.filter((id) => !rowIds.includes(id)),
                        );
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                <td
                  className="px-3 py-3 text-sm text-gray-700 break-words align-top"
                  title={loc.PS_Name}
                >
                  <div className="flex items-start gap-1.5">
                    {boothChildRows.length > 1 && loc.groupKey ? (
                      <button
                        type="button"
                        aria-expanded={groupExpanded}
                        className="mt-0.5 p-0.5 rounded hover:bg-gray-100 text-gray-500 shrink-0"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setExpandedGroupKeys((prev) => {
                            const next = new Set(prev);
                            if (next.has(loc.groupKey!))
                              next.delete(loc.groupKey!);
                            else next.add(loc.groupKey!);
                            return next;
                          });
                        }}
                      >
                        {groupExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/surveys/${loc.documentId}`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {formatSurveyListText(loc.PS_Name)}
                      </Link>
                      {loc.pollingStationCount != null &&
                        loc.pollingStationCount > 1 && (
                          <span className="ml-2 text-xs font-normal text-gray-500 whitespace-nowrap">
                            ({loc.pollingStationCount} booths)
                          </span>
                        )}
                    </div>
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
                        : loc.survey?.state === "Raised"
                          ? "primary"
                          : "success"
                    }
                    className="rounded-lg font-medium"
                  >
                    {status === "Survey Not Raised"
                      ? "Not Raised "
                      : (loc.survey?.state ?? status)}
                  </Badge>
                </td>
                <td
                  className="px-3 py-3 text-sm break-words align-top min-w-[120px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {coordinator ? (
                    <div
                      className="space-y-0.5"
                      title={[
                        coordinator.profile?.Full_Name,
                        (coordinator.email || "").toLowerCase(),
                        coordinator.profile?.Phone_Number,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    >
                      {(coordinator.profile?.Full_Name ||
                        coordinator.username) && (
                        <div className="font-medium text-gray-900">
                          {formatSurveyListText(
                            coordinator.profile?.Full_Name ||
                              coordinator.username ||
                              "",
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
                      variant="primary"
                      size="sm"
                      className="rounded-lg text-sm font-medium"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedLocationId(loc.documentId);
                        setSelectedCoordinatorId(null);
                        setIsModalOpen(true);
                      }}
                    >
                      Assign
                    </Button>
                  )}
                </td>
                <td
                  className="px-3 py-3 align-top whitespace-nowrap text-sm min-w-[100px]"
                  onClick={(e) => e.stopPropagation()}
                >
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
                    <DropdownMenuContent
                      align="end"
                      className="min-w-[10rem] text-sm"
                    >
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/surveys/${loc.documentId}`}
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Link>
                      </DropdownMenuItem>
                      {loc.survey?.documentId ? (
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/surveys/${loc.survey.documentId}/edit`}
                            className="flex items-center gap-2"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit Survey
                          </Link>
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/surveys/new?boothId=${encodeURIComponent(loc.documentId)}`}
                            className="flex items-center gap-2"
                          >
                            <Pencil className="h-4 w-4" />
                            Raise Survey
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedLocationId(loc.documentId);
                          const matched = coordinators.find(
                            (c) =>
                              c.documentId ===
                              loc.booth_coordinator?.documentId,
                          );
                          setSelectedCoordinatorId(matched?.documentId || null);
                          setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2"
                      >
                        <AssignIcon className="h-4 w-4" />
                        {coordinator
                          ? "Change coordinator"
                          : "Assign coordinator"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {/* <DropdownMenuItem
                        className="flex items-center gap-2 text-red-600 focus:text-red-700 focus:bg-red-50"
                        onClick={(e) => {
                          e.preventDefault();
                          setDeleteModal({
                            open: true,
                            documentId: loc.documentId,
                            name: loc.PS_Name || "Location",
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem> */}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
              {groupExpanded &&
                boothChildRows.length > 1 &&
                boothChildRows.map((child) => {
                  const cStatus = child.survey
                    ? child.survey.state ||
                      (child.survey.survey_date
                        ? `Raised on ${child.survey.survey_date}`
                        : "Survey raised")
                    : "Survey Not Raised";
                  const cCoord = child.booth_coordinator;
                  return (
                    <tr
                      key={`child-${child.documentId}`}
                      className="bg-slate-50/90 hover:bg-slate-50 transition-colors"
                    >
                      <td
                        className="px-3 py-2 pl-10 w-10 align-top"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedRowKeys.includes(child.documentId)}
                          onChange={(e) => {
                            if (e.target.checked)
                              setSelectedRowKeys((prev) => [
                                ...prev,
                                child.documentId,
                              ]);
                            else
                              setSelectedRowKeys((prev) =>
                                prev.filter((id) => id !== child.documentId),
                              );
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-600 break-words align-top">
                        <Link
                          href={`/surveys/${child.documentId}`}
                          className="font-medium text-gray-800 hover:underline"
                        >
                          {formatSurveyListText(child.PS_Name)}
                        </Link>
                        {child.PS_No ? (
                          <span className="ml-2 text-xs text-gray-400">
                            PS {child.PS_No}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500 align-top">
                        <div className="text-gray-400">↳ same assembly</div>
                      </td>
                      <td className="px-3 py-2 text-sm align-top whitespace-nowrap">
                        <Badge
                          variant={
                            cStatus === "Survey Not Raised"
                              ? "outline"
                              : child.survey?.state === "Raised"
                                ? "primary"
                                : "success"
                          }
                          className="rounded-lg font-medium text-xs"
                        >
                          {cStatus === "Survey Not Raised"
                            ? "Not Raised "
                            : (child.survey?.state ?? cStatus)}
                        </Badge>
                      </td>
                      <td
                        className="px-3 py-2 text-sm break-words align-top min-w-[120px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {cCoord ? (
                          <div className="text-xs space-y-0.5">
                            {(cCoord.profile?.Full_Name || cCoord.username) && (
                              <div className="font-medium text-gray-800">
                                {formatSurveyListText(
                                  cCoord.profile?.Full_Name ||
                                    cCoord.username ||
                                    "",
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            className="rounded-lg text-xs h-7"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedLocationId(child.documentId);
                              setSelectedCoordinatorId(null);
                              setIsModalOpen(true);
                            }}
                          >
                            Assign
                          </Button>
                        )}
                      </td>
                      <td
                        className="px-3 py-2 align-top whitespace-nowrap text-sm min-w-[100px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-lg text-gray-500 hover:bg-gray-100"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-[10rem] text-sm">
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/surveys/${child.documentId}`}
                                className="flex items-center gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                View
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
            </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {locations.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500 text-sm capitalize">
          <p className="font-medium">No survey locations found</p>
          <p className="mt-1">Try adjusting filters or search</p>
        </div>
      )}
    </div>
  );

  // Card view rendering - modern cards (unique list: expand to see merged booth rows)
  const renderCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-6">
      {locations.map((loc) => {
        const status = loc.survey
          ? loc.survey.state ||
            (loc.survey.survey_date
              ? `Raised on ${loc.survey.survey_date}`
              : "Survey raised")
          : "Survey Not Raised";
        const coordinator = loc.booth_coordinator;

        const boothChildRows =
          showUniqueList &&
          loc.children &&
          loc.children.length > 1
            ? loc.children
            : [];
        const groupExpanded =
          loc.groupKey != null && expandedGroupKeys.has(loc.groupKey);

        /** Multi-booth cards are not wrapped in a single Link; single cards are. */
        const isMultiBoothCard = boothChildRows.length > 1;
        const titleEl = isMultiBoothCard ? (
          <Link
            href={`/surveys/${loc.documentId}`}
            className="font-semibold text-gray-900 text-sm hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {formatSurveyListText(loc.PS_Name)}
          </Link>
        ) : (
          <span className="font-semibold text-gray-900 text-sm">
            {formatSurveyListText(loc.PS_Name)}
          </span>
        );

        const cardBody = (
          <>
            <div className="flex items-start gap-2">
              {boothChildRows.length > 1 && loc.groupKey ? (
                <button
                  type="button"
                  aria-expanded={groupExpanded}
                  aria-label={
                    groupExpanded ? "Collapse booth list" : "Expand booth list"
                  }
                  className="mt-0.5 p-0.5 rounded hover:bg-gray-100 text-gray-500 shrink-0"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setExpandedGroupKeys((prev) => {
                      const next = new Set(prev);
                      if (next.has(loc.groupKey!)) next.delete(loc.groupKey!);
                      else next.add(loc.groupKey!);
                      return next;
                    });
                  }}
                >
                  {groupExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              ) : null}
              <div className="min-w-0 flex-1">
                {titleEl}
                {loc.pollingStationCount != null &&
                  loc.pollingStationCount > 1 && (
                    <span className="ml-2 text-xs font-normal text-gray-500 whitespace-nowrap">
                      ({loc.pollingStationCount} booths)
                    </span>
                  )}
                {!showUniqueList && loc.PS_No ? (
                  <div className="mt-1 text-xs text-gray-500">
                    PS No: {loc.PS_No}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
              <div className="space-y-0.5 text-sm">
                <div className="font-medium text-gray-900">
                  {formatSurveyListText(loc.assembly?.Assembly_Name || "—")}
                </div>
                <div className="text-gray-500 text-xs">
                  District: {formatDistrictDisplay(loc.assembly?.district)}
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <Badge
                variant={
                  status === "Survey Not Raised"
                    ? "outline"
                    : loc.survey?.state === "Raised"
                      ? "primary"
                      : "success"
                }
                className="rounded-lg font-medium"
              >
                {status === "Survey Not Raised"
                  ? "Not Assigned"
                  : (loc.survey?.state ?? status)}
              </Badge>
              {coordinator ? (
                <div className="text-right text-sm space-y-0.5">
                  {(coordinator.profile?.Full_Name ||
                    coordinator.username) && (
                    <div className="font-medium text-gray-900">
                      {formatSurveyListText(
                        coordinator.profile?.Full_Name ||
                          coordinator.username ||
                          "",
                      )}
                    </div>
                  )}
                  {coordinator.email && (
                    <div className="text-gray-600">
                      {(coordinator.email || "").toLowerCase()}
                    </div>
                  )}
                  {coordinator.profile?.Phone_Number && (
                    <div className="text-gray-500 text-sm">
                      {coordinator.profile.Phone_Number}
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="primary"
                  className="rounded-lg text-sm capitalize"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedLocationId(loc.documentId);
                    setIsModalOpen(true);
                  }}
                >
                  Assign
                </Button>
              )}
            </div>
          </>
        );

        if (boothChildRows.length > 1) {
          return (
            <div
              key={loc.groupKey ?? loc.documentId}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all h-full flex flex-col overflow-hidden"
            >
              <div className="p-4">{cardBody}</div>
              {groupExpanded ? (
                <div className="border-t border-slate-100 bg-slate-50/90 px-4 py-3 space-y-3">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Booths at this venue
                  </div>
                  {boothChildRows.map((child) => {
                    const cStatus = child.survey
                      ? child.survey.state ||
                        (child.survey.survey_date
                          ? `Raised on ${child.survey.survey_date}`
                          : "Survey raised")
                      : "Survey Not Raised";
                    return (
                      <div
                        key={child.documentId}
                        className="flex flex-wrap items-start justify-between gap-2 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/surveys/${child.documentId}`}
                            className="font-medium text-gray-800 hover:underline"
                          >
                            {formatSurveyListText(child.PS_Name)}
                          </Link>
                          {child.PS_No ? (
                            <span className="ml-2 text-xs text-gray-400">
                              PS {child.PS_No}
                            </span>
                          ) : null}
                        </div>
                        <Badge
                          variant={
                            cStatus === "Survey Not Raised"
                              ? "outline"
                              : child.survey?.state === "Raised"
                                ? "primary"
                                : "success"
                          }
                          className="rounded-md text-xs shrink-0"
                        >
                          {cStatus === "Survey Not Raised"
                            ? "Not Assigned"
                            : (child.survey?.state ?? cStatus)}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        }

        return (
          <Link key={loc.documentId} href={`/surveys/${loc.documentId}`}>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer h-full">
              {cardBody}
            </div>
          </Link>
        );
      })}

      {locations.length === 0 && !loading && (
        <div className="col-span-full text-center py-12 text-gray-500 text-sm capitalize">
          <p className="font-medium">No survey locations found</p>
          <p className="mt-1">Try adjusting filters or search</p>
        </div>
      )}
    </div>
  );

  // Pagination - modern buttons
  const renderPagination = () => (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 sm:px-6">
      <div className="text-sm text-gray-600 text-center sm:text-left order-2 sm:order-1 min-w-0">
        {totalItems === 0 ? (
          <span className="text-gray-500">No results</span>
        ) : (
          <>
            Results{" "}
            <span className="font-medium text-gray-900">
              {(currentPage - 1) * pageSize + 1}
            </span>
            {" – "}
            <span className="font-medium text-gray-900">
              {Math.min(currentPage * pageSize, totalItems)}
            </span>
            {" of "}
            <span className="font-medium text-gray-900">{totalItems}</span>
          </>
        )}
      </div>
      <div className="flex items-center justify-center sm:justify-end gap-2 order-1 sm:order-2">
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg border-gray-200 hover:bg-gray-50 min-w-[80px]"
          onClick={() => fetchLocations(currentPage - 1, searchTerm)}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <span className="text-sm text-gray-600 min-w-[52px] text-center">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg border-gray-200 hover:bg-gray-50 min-w-[80px]"
          onClick={() => fetchLocations(currentPage + 1, searchTerm)}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full min-w-0">
      <PageTitle
        title="Survey Locations"
        subtitle="Manage survey locations, survey status, and coordinator assignments"
      >
        {(() => {
          const role = user?.role?.type;
          let href = `/surveys/new?role=superadmin`;

          if (role === "assembly_coordinator") {
            const assemblyId =
              user?.assembly?.documentId || user?.assemblies?.[0]?.documentId;
            href = `/surveys/new?role=assembly&assemblyId=${assemblyId || ""}`;
          } else if (role === "district_coordinator") {
            const districtId =
              user?.district?.documentId || user?.districts?.[0]?.documentId;
            href = `/surveys/new?role=district&districtId=${districtId || ""}`;
          }

          return (
            <Link href={href}>
              <Button
                variant="gradient"
                className="rounded-xl px-5 py-2.5 font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Raise a Survey
              </Button>
            </Link>
          );
        })()}
      </PageTitle>

      {/* KPI mode toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 bg-white rounded-xl p-3 sm:p-3 border border-gray-100 shadow-sm">
        <div className="text-xs sm:text-sm text-gray-600 leading-snug">
          KPI mode:{" "}
          <span className="font-semibold text-gray-900">
            {showUniqueList
              ? "Unique Locations (Assembly-wise)"
              : "All Polling Stations"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowUniqueList((prev) => !prev);
            setSelectedSurveyState(undefined);
            setCurrentPage(1);
            setExpandedGroupKeys(new Set());
          }}
          className={`inline-flex items-center justify-center sm:justify-start rounded-lg px-3 py-2.5 text-xs sm:text-sm font-medium border transition-colors w-full sm:w-auto shrink-0 ${
            showUniqueList
              ? "bg-orange-50 text-orange-700 border-orange-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}
        >
          {uniqueLocationsRefreshing ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin shrink-0" />
          ) : null}
          {showUniqueList ? "Switch to Total KPI" : "Switch to Unique KPI"}
        </button>
      </div>

      {/* KPI cards — mobile: single row + horizontal scroll; sm+: grid */}
      <div className="relative">
        <p className="text-[11px] text-gray-400 mb-1.5 sm:hidden pl-0.5">
          Swipe cards sideways to see all metrics
        </p>
        <div
          className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory sm:snap-none scroll-smooth touch-pan-x [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300"
          role="region"
          aria-label="Survey KPI summary"
        >
        <div
          role="button"
          tabIndex={0}
          onClick={handleTotalCardClick}
          onKeyDown={(e) =>
            e.key === "Enter" || e.key === " " ? handleTotalCardClick() : null
          }
          className={`min-w-[200px] max-w-[260px] sm:min-w-0 sm:max-w-none flex-shrink-0 snap-start sm:snap-none bg-white rounded-xl p-3.5 sm:p-4 shadow-sm relative border cursor-pointer transition-all ${
            showUniqueList
              ? "border-gray-100 hover:border-amber-200 hover:shadow-md"
              : "border-amber-300 shadow-md"
          }`}
        >
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FFC107] flex items-center justify-center">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <p className="text-xs sm:text-sm text-gray-500 pr-10">Total</p>
          <div className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
            {kpiLoading || uniqueLocationsRefreshing ? (
              <Skeleton className="h-8 w-20 rounded-md" />
            ) : (
              kpis.total
            )}
          </div>
          <p className="text-[11px] sm:text-xs text-gray-500 mt-1.5 line-clamp-3 sm:line-clamp-none leading-snug">
            {showUniqueList
              ? "Canonical venues (merged booths) • Expand rows for each booth"
              : "All polling stations • Click to show list"}
          </p>
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleKpiStatusCardClick("Completed")}
          onKeyDown={(e) =>
            e.key === "Enter" || e.key === " "
              ? handleKpiStatusCardClick("Completed")
              : null
          }
          className={`min-w-[200px] max-w-[260px] sm:min-w-0 sm:max-w-none flex-shrink-0 snap-start bg-white rounded-xl p-3.5 sm:p-4 shadow-sm relative border cursor-pointer transition-all ${
            selectedSurveyState === "Completed"
              ? "border-green-300 shadow-md"
              : "border-gray-100 hover:border-green-200 hover:shadow-md"
          }`}
        >
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#4CAF50] flex items-center justify-center">
            <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <p className="text-xs sm:text-sm text-gray-500 pr-10">Completed</p>
          <div className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
            {kpiLoading || uniqueLocationsRefreshing ? (
              <Skeleton className="h-8 w-20 rounded-md" />
            ) : (
              kpis.completed
            )}
          </div>
          <p className="text-[11px] sm:text-xs text-gray-500 mt-1.5 line-clamp-2 sm:line-clamp-none">
            Click to show completed list
          </p>
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleKpiStatusCardClick("Raised")}
          onKeyDown={(e) =>
            e.key === "Enter" || e.key === " "
              ? handleKpiStatusCardClick("Raised")
              : null
          }
          className={`min-w-[200px] max-w-[260px] sm:min-w-0 sm:max-w-none flex-shrink-0 snap-start bg-white rounded-xl p-3.5 sm:p-4 shadow-sm relative border cursor-pointer transition-all ${
            selectedSurveyState === "Raised"
              ? "border-blue-300 shadow-md"
              : "border-gray-100 hover:border-blue-200 hover:shadow-md"
          }`}
        >
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#2196F3] flex items-center justify-center">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <p className="text-xs sm:text-sm text-gray-500 pr-10">In Progress</p>
          <div className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
            {kpiLoading || uniqueLocationsRefreshing ? (
              <Skeleton className="h-8 w-20 rounded-md" />
            ) : (
              kpis.raised
            )}
          </div>
          <p className="text-[11px] sm:text-xs text-gray-500 mt-1.5 line-clamp-2 sm:line-clamp-none">
            Click to show raised list
          </p>
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleKpiStatusCardClick("Unassigned")}
          onKeyDown={(e) =>
            e.key === "Enter" || e.key === " "
              ? handleKpiStatusCardClick("Unassigned")
              : null
          }
          className={`min-w-[200px] max-w-[260px] sm:min-w-0 sm:max-w-none flex-shrink-0 snap-start bg-white rounded-xl p-3.5 sm:p-4 shadow-sm relative border cursor-pointer transition-all ${
            selectedSurveyState === "Unassigned"
              ? "border-violet-300 shadow-md"
              : "border-gray-100 hover:border-violet-200 hover:shadow-md"
          }`}
        >
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#7B61FF] flex items-center justify-center">
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <p className="text-xs sm:text-sm text-gray-500 pr-10">Pending</p>
          <div className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
            {kpiLoading || uniqueLocationsRefreshing ? (
              <Skeleton className="h-8 w-20 rounded-md" />
            ) : (
              kpis.pending
            )}
          </div>
          <p className="text-[11px] sm:text-xs text-gray-500 mt-1.5 line-clamp-2 sm:line-clamp-none">
            Not assigned survey • Tap to show list
          </p>
        </div>
        </div>
      </div>

      {/* Controls — mobile: full-width search + horizontal scroll for filters/actions */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="relative w-full min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          <Input
            placeholder="Search location, assembly, district…"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10 rounded-xl border-gray-200 h-11 text-base sm:text-sm"
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5 sm:hidden">
            <span className="text-xs font-medium text-gray-600">Filters &amp; actions</span>
            <span className="text-[11px] text-gray-400">Swipe →</span>
          </div>
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto overflow-y-visible pb-2 sm:flex-wrap sm:overflow-x-visible sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 sm:gap-3 touch-pan-x scroll-smooth [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&_.ant-select]:inline-flex [&_.ant-select]:items-center">
          <Select
            placeholder="District"
            value={selectedDistrict}
            onChange={(val) => {
              setSelectedDistrict(val);
              setSelectedAssembly(undefined);
              setCurrentPage(1);
            }}
            allowClear
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              (option?.children?.toString() ?? "")
                .toLowerCase()
                .includes(input.toLowerCase())
            }
            className="min-w-[155px] max-w-[min(85vw,280px)] sm:max-w-[280px] flex-shrink-0 rounded-xl [&_.ant-select-selector]:rounded-xl [&_.ant-select-selector]:h-10 [&_.ant-select-selector]:min-h-[40px] [&_.ant-select-selection-item]:block [&_.ant-select-selection-item]:truncate [&_.ant-select-selection-item]:text-left"
            style={{ minWidth: 155 }}
            listHeight={256}
            popupMatchSelectWidth={false}
            styles={{
              popup: {
                root: { minWidth: 260 },
              },
            }}
          >
            {districts.map((d) => (
              <Select.Option key={d.documentId} value={d.documentId}>
                {formatDistrictDisplay(d)}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="Assembly"
            value={selectedAssembly}
            disabled={!selectedDistrict}
            onChange={(val) => {
              setSelectedAssembly(val);
              setCurrentPage(1);
            }}
            allowClear
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              (option?.children?.toString() ?? "")
                .toLowerCase()
                .includes(input.toLowerCase())
            }
            className="min-w-[160px] max-w-[min(85vw,280px)] sm:max-w-[280px] flex-shrink-0 rounded-xl [&_.ant-select-selector]:rounded-xl [&_.ant-select-selector]:h-10 [&_.ant-select-selector]:min-h-[40px] [&_.ant-select-selection-item]:block [&_.ant-select-selection-item]:truncate [&_.ant-select-selection-item]:text-left"
            style={{ minWidth: 160 }}
            listHeight={256}
            popupMatchSelectWidth={false}
            styles={{
              popup: {
                root: { minWidth: 280 },
              },
            }}
          >
            {assemblies.map((a) => (
              <Select.Option key={a.documentId} value={a.documentId}>
                {a.Assembly_Name}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="All statuses"
            value={selectedSurveyState}
            allowClear
            onChange={(val) => {
              setSelectedSurveyState(val);
              setCurrentPage(1);
            }}
            className="min-w-[130px] flex-shrink-0 rounded-xl [&_.ant-select-selector]:rounded-xl [&_.ant-select-selector]:h-10 [&_.ant-select-selector]:min-h-[40px]"
            style={{ minWidth: 130 }}
            listHeight={256}
          >
            <Select.Option value="Raised">Raised</Select.Option>
            <Select.Option value="Completed">Completed</Select.Option>
            <Select.Option value="Unassigned">Unassigned</Select.Option>
          </Select>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-emerald-200 text-emerald-800 hover:bg-emerald-50 h-10 min-h-10 px-3 flex-shrink-0 whitespace-nowrap"
            disabled={
              surveyExporting || (!selectedDistrict && !selectedAssembly)
            }
            onClick={() => void handleExportSurveysExcel()}
          >
            <FileSpreadsheet className="w-4 h-4 mr-1 shrink-0" />
            {surveyExporting ? "Exporting…" : "Excel export"}
          </Button>
          {viewMode === "table" && (
            <Button
              variant="primary"
              className="rounded-xl h-10 min-h-10 flex-shrink-0 whitespace-nowrap"
              disabled={selectedRowKeys.length === 0}
              onClick={() => {
                setSelectedLocationId(null);
                setIsModalOpen(true);
              }}
            >
              <UserPlus className="w-4 h-4 mr-1 shrink-0" />
              Bulk
              {selectedRowKeys.length > 0 ? ` (${selectedRowKeys.length})` : ""}
            </Button>
          )}
          <div
            className="inline-flex h-10 min-h-10 shrink-0 items-center rounded-xl border border-gray-200 bg-gray-50 p-0.5"
            role="group"
            aria-label="View mode"
          >
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                viewMode === "table"
                  ? "bg-white text-[#2196F3] shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              aria-label="List view"
              aria-pressed={viewMode === "table"}
            >
              <List className="h-4 w-4" strokeWidth={2.25} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("card")}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                viewMode === "card"
                  ? "bg-white text-[#2196F3] shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              aria-label="Card view"
              aria-pressed={viewMode === "card"}
            >
              <LayoutGrid className="h-4 w-4" strokeWidth={2.25} />
            </button>
          </div>
          </div>
        </div>
      </div>

      {/* List content - min-height so skeleton/empty state is always visible */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[420px]"
      >
        <SelectionBar
          selectedCount={selectedRowKeys.length}
          onClear={() => setSelectedRowKeys([])}
          action={
            selectedRowKeys.length > 0
              ? {
                  label: "Assign coordinator",
                  onClick: () => {
                    setSelectedLocationId(null);
                    setIsModalOpen(true);
                  },
                }
              : undefined
          }
          className="mx-4 mt-4 mb-0"
        />
        {loading ? (
          viewMode === "table" ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    <th className="px-3 py-3.5 w-10" />
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600 tracking-wider">
                      Polling Station
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600 tracking-wider">
                      Location
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600 tracking-wider">
                      Status
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600 tracking-wider">
                      Coordinator
                    </th>
                    <th className="px-3 py-3.5 w-14">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[...Array(6)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-3 py-3">
                        <Skeleton className="h-5 w-5 rounded" />
                      </td>
                      <td className="px-3 py-3">
                        <Skeleton className="h-5 w-32" />
                      </td>
                      <td className="px-3 py-3">
                        <Skeleton className="h-5 w-28" />
                      </td>
                      <td className="px-3 py-3">
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </td>
                      <td className="px-3 py-3">
                        <Skeleton className="h-5 w-24" />
                      </td>
                      <td className="px-3 py-3">
                        <Skeleton className="h-8 w-10 rounded-lg" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
                >
                  <Skeleton className="h-5 w-3/4 rounded" />
                  <Skeleton className="h-4 w-1/3 mt-2 rounded" />
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-full rounded" />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Skeleton className="h-6 w-16 rounded-lg" />
                    <Skeleton className="h-4 w-24 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : locations.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No survey locations found"
            description="Try adjusting filters or search. When locations exist, they will appear here."
            className="min-h-[280px]"
          />
        ) : viewMode === "table" ? (
          renderTable()
        ) : (
          renderCards()
        )}

        {!loading && totalItems > 0 && renderPagination()}
      </motion.div>

      {/* Delete location confirmation */}
      <Modal
        title="Delete location"
        open={deleteModal.open}
        onOk={handleDeleteLocation}
        onCancel={() =>
          setDeleteModal({ open: false, documentId: null, name: "" })
        }
        okText="Delete"
        okButtonProps={{ danger: true }}
        confirmLoading={deleting}
      >
        <p className="text-base">
          Are you sure you want to delete <strong>{deleteModal.name}</strong>?
          This cannot be undone.
        </p>
      </Modal>

      {/* Coordinator Assignment Modal */}
      <Modal
        title={
          selectedLocationId
            ? (() => {
                const loc = locations.find(
                  (l) => l.documentId === selectedLocationId,
                );
                return loc
                  ? `Assign coordinator to ${loc.PS_Name}`
                  : "Assign coordinator";
              })()
            : `Assign coordinator to ${assignTargetIds.length} polling station${assignTargetIds.length !== 1 ? "s" : ""}`
        }
        open={isModalOpen}
        onOk={handleAssignCoordinator}
        onCancel={() => {
          setIsModalOpen(false);
          setSelectedCoordinatorId(null);
        }}
        confirmLoading={assigning}
        okText="Assign"
        cancelText="Cancel"
        okButtonProps={{ className: "rounded-lg border-0" }}
        cancelButtonProps={{ className: "rounded-lg" }}
      >
        <div className="space-y-4 mt-4">
          <p className="text-sm text-gray-600">
            {assignTargetIds.length > 1
              ? `Select a coordinator to assign to ${assignTargetIds.length} polling stations:`
              : "Select a coordinator to assign to this polling station:"}
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
            optionFilterProp="label"
            filterOption={(input, option) =>
              (option?.label?.toString() ?? "")
                .toLowerCase()
                .includes(input.toLowerCase())
            }
            options={coordinators.map((coord) => ({
              value: coord.documentId,
              label: `${coord.Full_Name || coord.username || (coord.email || "").toLowerCase()}${coord.Phone_Number ? ` (${coord.Phone_Number})` : ""}`,
            }))}
          />

          {selectedCoordinatorId && (
            <div className="mt-3 p-3 bg-blue-50 rounded-md">
              <p className="text-sm font-medium text-blue-800">Note:</p>
              <p className="text-xs text-blue-700 mt-1">
                This will replace any existing coordinator assigned to the
                selected polling station
                {assignTargetIds.length !== 1 ? "s" : ""}.
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
