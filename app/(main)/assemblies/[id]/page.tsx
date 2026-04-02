"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { ModernCard } from "@/components/ui/modern-card";
import { Spin, Table, Tag, message, Descriptions, Badge, Input } from "antd";
import {
  MapPin,
  Users,
  FileText,
  Clock,
  Building,
  Truck,
  User,
  Calendar,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import Link from "next/link";
import AddLocationModal from "@/components/locations/AddLocationModal";

export default function AssemblyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const suppliedId = (params as any).documentId ?? (params as any).id;

  const [loading, setLoading] = useState(true);
  const [assembly, setAssembly] = useState<any | null>(null);

  const [assembly_coordinator, setAssemblyCoordinator] = useState<any | null>(
    null,
  );

  const [locationQuery, setLocationQuery] = useState<string>("");
  const [locationsLoading, setLocationsLoading] = useState<boolean>(false);
  const [locationsList, setLocationsList] = useState<any[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [raisedCount, setRaisedCount] = useState(0);

  const [addLocationOpen, setAddLocationOpen] = useState(false);

  useEffect(() => {
    fetchAssembly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suppliedId]);

  const normalizeItem = (item: any) => {
    const attrs = item?.attributes ?? item;

    const assemblyName =
      item?.Assembly_Name ?? attrs?.Assembly_Name ?? attrs?.assemblyName ?? "";
    const assemblyNo =
      item?.Assembly_No ?? attrs?.Assembly_No ?? attrs?.assemblyNo ?? "";
    const state = item?.State ?? attrs?.State ?? "Assam";
    const electionDistrict =
      item?.Election_District ?? attrs?.Election_District ?? null;

    const district =
      item?.district?.district_name ??
      attrs?.district?.district_name ??
      attrs?.district?.data?.attributes?.district_name ??
      attrs?.district?.data?.district_name ??
      "";

    const phase =
      item?.district?.Phase ??
      attrs?.district?.Phase ??
      attrs?.district?.data?.attributes?.Phase ??
      attrs?.district?.data?.Phase ??
      "Not specified";

    // locations can be an array or a Strapi relation (data array)
    const rawLocations =
      item?.locations ?? attrs?.locations ?? attrs?.locations?.data ?? [];

    const locations = Array.isArray(rawLocations)
      ? rawLocations.map((loc: any) => {
          const locAttrs = loc?.attributes ?? loc;
          return {
            id: loc?.id ?? locAttrs?.id,
            documentId: loc?.documentId ?? locAttrs?.documentId,
            PS_No: loc?.PS_No ?? locAttrs?.PS_No ?? "",
            PS_Name: loc?.PS_Name ?? locAttrs?.PS_Name ?? "",
            PS_Location: loc?.PS_Location ?? locAttrs?.PS_Location ?? "",
            Installation_Status:
              loc?.Installation_Status ?? locAttrs?.Installation_Status ?? null,
            Survey_Status:
              loc?.Survey_Status ?? locAttrs?.Survey_Status ?? null,
            Latitude: loc?.Latitude ?? locAttrs?.Latitude ?? null,
            Longitude: loc?.Longitude ?? locAttrs?.Longitude ?? null,
            createdAt: loc?.createdAt ?? locAttrs?.createdAt ?? null,
            updatedAt: loc?.updatedAt ?? locAttrs?.updatedAt ?? null,
          };
        })
      : [];

    // Normalize relation arrays (blocks / dispatches) which can be returned in different shapes
    const normalizeRelation = (input: any) => {
      if (!input) return [];
      // If it's an object with data array (Strapi relation)
      if (input.data && Array.isArray(input.data)) {
        return input.data.map((x: any) => ({
          id: x.id ?? x?.attributes?.id,
          documentId: x.documentId ?? x?.attributes?.documentId,
          ...x.attributes,
        }));
      }

      // If it's already an array
      if (Array.isArray(input)) {
        return input.map((x: any) => ({
          id: x.id ?? x?.attributes?.id,
          documentId: x.documentId ?? x?.attributes?.documentId,
          ...x.attributes,
          ...x,
        }));
      }

      // If it's nested under attrs.blocks (object container)
      if (input?.blocks && Array.isArray(input.blocks)) {
        return input.blocks.map((x: any) => ({
          id: x.id ?? x?.attributes?.id,
          documentId: x.documentId ?? x?.attributes?.documentId,
          ...x.attributes,
          ...x,
        }));
      }

      return [];
    };

    const blocks = normalizeRelation(
      item?.blocks ?? attrs?.blocks ?? attrs?.blocks?.data ?? attrs,
    );
    const dispatches = normalizeRelation(
      item?.dispatches ?? attrs?.dispatches ?? attrs?.dispatches?.data ?? attrs,
    );

    // const coordinator = (() => {
    //   const raw =
    //     item?.assembly_coordinator ??
    //     attrs?.assembly_coordinator ??
    //     attrs?.assembly_coordinator?.data ??
    //     null;

    //   if (!raw) return null;

    //   // Normalize the coordinator object to flatten nested attributes
    //   const coordAttrs = raw?.attributes ?? raw;
    //   const profileData = raw?.profile ?? coordAttrs?.profile;

    //   return {
    //     id: raw?.id ?? coordAttrs?.id,
    //     documentId: raw?.documentId ?? coordAttrs?.documentId,
    //     email: raw?.email ?? coordAttrs?.email,
    //     username: raw?.username ?? coordAttrs?.username,
    //     user: raw?.user ?? coordAttrs?.user,
    //     profile: profileData,
    //     ...raw,
    //     ...coordAttrs,
    //   };
    // })();

    const coordinator = attrs?.assembly_coordinator ?? null;

    return {
      id: item?.id ?? attrs?.id,
      documentId: item?.documentId ?? attrs?.documentId ?? attrs?.document_id,
      assemblyName,
      assemblyNo,
      state,
      electionDistrict,
      district,
      phase,
      locations,
      blocks,
      dispatches,
      coordinator,
      createdAt: item?.createdAt ?? attrs?.createdAt ?? attrs?.created_at,
      updatedAt: item?.updatedAt ?? attrs?.updatedAt ?? attrs?.updated_at,
      publishedAt:
        item?.publishedAt ?? attrs?.publishedAt ?? attrs?.published_at,
      raw: item,
    };
  };

  const fetchAssembly = async () => {
    if (!suppliedId) return;
    setLoading(true);
    try {
      let res;
      const docId = suppliedId;

      // First try to fetch by documentId (preferred)
      //   res = await api.get(
      //     `/assemblies?populate=*&filters[documentId][$eq]=${encodeURIComponent(
      //       docId,
      //     )}&pagination[page]=1&pagination[pageSize]=1`,
      //   );

      res = await api.get(
        `/assemblies?populate[locations]=true&populate[district]=true&populate[blocks]=true&populate[dispatches]=true&populate[assembly_coordinator][populate][profile]=true&populate[assembly_coordinator][populate][user]=true&filters[documentId][$eq]=${encodeURIComponent(docId)}&pagination[page]=1&pagination[pageSize]=1`,
      );

      let items = res.data?.data;

      // If API returned a single object instead of an array, wrap it
      if (items && !Array.isArray(items)) {
        items = [items];
      }

      setAssemblyCoordinator(
        res?.data?.data?.[0]?.assembly_coordinator ?? null,
      );

      if (items && items.length > 0) {
        let item = items[0];

        // If relations like blocks/dispatches are missing or empty, try deep-populating by numeric id
        const needsDeepPopulate =
          !item.blocks ||
          (Array.isArray(item.blocks) && item.blocks.length === 0) ||
          !item.dispatches ||
          (Array.isArray(item.dispatches) && item.dispatches.length === 0);

        let normalized = normalizeItem(item);

        if (needsDeepPopulate && (item.id || docId)) {
          try {
            const detailRes = await api.get(
              `/assemblies/${encodeURIComponent(docId)}?populate=*`,
            );

            const detailItem = detailRes.data?.data ?? detailRes.data;
            normalized = normalizeItem(detailItem);

            console.log("Deep populate succeeded:", normalized);
          } catch (e) {
            console.warn("Deep populate failed, using base data", e);
          }
        }

        console.log("Assembly final normalized:", normalized);

        console.log("Assembly fetched with initial data:", normalized);

        // If blocks are missing, fetch them directly from /blocks
        if (!(normalized.blocks && normalized.blocks.length > 0) && docId) {
          try {
            const blocksRes = await api.get(
              `/blocks?filters[assembly][documentId][$eq]=${encodeURIComponent(
                docId,
              )}&populate=*`,
            );
            const blocksRaw = blocksRes.data?.data || [];
            normalized.blocks = blocksRaw.map((b: any) => ({
              id: b.id ?? b?.attributes?.id,
              documentId: b.documentId ?? b?.attributes?.documentId,
              ...b.attributes,
              ...b,
            }));
          } catch (e) {
            console.warn("Failed to fetch blocks fallback:", e);
          }
        }

        // Fetch completed survey count
        const [completedRes, raisedRes] = await Promise.all([
          api.get("/locations", {
            params: {
              "filters[assembly][documentId][$eq]": normalized.documentId,
              "filters[survey][state][$eq]": "Completed",
              "pagination[pageSize]": 1,
            },
          }),
          api.get("/locations", {
            params: {
              "filters[assembly][documentId][$eq]": normalized.documentId,
              "filters[survey][state][$eq]": "Raised",
              "pagination[pageSize]": 1,
            },
          }),
        ]);

        setCompletedCount(completedRes.data?.meta?.pagination?.total || 0);
        setRaisedCount(raisedRes.data?.meta?.pagination?.total || 0);

        // If dispatches are missing, fetch both to/from dispatches and combine
        if (
          !(normalized.dispatches && normalized.dispatches.length > 0) &&
          docId
        ) {
          try {
            const [toRes, fromRes] = await Promise.all([
              api.get(
                `/dispatches?filters[to_assembly][documentId][$eq]=${encodeURIComponent(
                  docId,
                )}&populate=*`,
              ),
              api.get(
                `/dispatches?filters[from_assembly][documentId][$eq]=${encodeURIComponent(
                  docId,
                )}&populate=*`,
              ),
            ]);

            const combined = [
              ...(toRes.data?.data || []),
              ...(fromRes.data?.data || []),
            ];
            const map = new Map();
            combined.forEach((d: any) => {
              const key = d.id ?? d.documentId ?? JSON.stringify(d);
              if (!map.has(key)) map.set(key, d);
            });
            const ds = Array.from(map.values()).map((d: any) => ({
              id: d.id ?? d?.attributes?.id,
              documentId: d.documentId ?? d?.attributes?.documentId,
              ...d.attributes,
              ...d,
            }));

            normalized.dispatches = ds;
          } catch (e) {
            console.warn("Failed to fetch dispatches fallback:", e);
          }
        }

        setAssembly(normalized);
        console.log("Assembly fetched:", normalized);
        // initialize server-backed locations list
        setLocationsList(normalized.locations || []);
        return;
      }

      // Fallback: if the suppliedId is numeric, try numeric id fetch
      if (/^\d+$/.test(docId)) {
        res = await api.get(`/assemblies/${docId}?populate=*`);
        const raw = res.data?.data ?? res.data;
        if (!raw) {
          message.error("Assembly not found");
          router.back();
          return;
        }
        const normalized = normalizeItem(raw);
        setAssembly(normalized);
        return;
      }

      // If we reach here, nothing found
      message.error("Assembly not found");
      router.back();
    } catch (err) {
      console.error("Failed to fetch assembly:", err);
      message.error("Failed to load assembly details.");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async (query = "") => {
    // Server-side search for locations by PS_No or PS_Name, scoped to this assembly
    if (!assembly?.documentId && !suppliedId) return;
    const docId = assembly?.documentId ?? suppliedId;
    try {
      setLocationsLoading(true);
      setLocationQuery(query || "");

      // Build base filter for assembly
      // let url = `/locations?filters[assembly][documentId][$eq]=${encodeURIComponent(
      //   docId,
      // )}&pagination[pageSize]=1000`;

      let url = `/locations?populate=survey&filters[assembly][documentId][$eq]=${docId}&pagination[pageSize]=1000`;

      // If query present, add OR filters for PS_No and PS_Name (case-insensitive)
      if (query && query.trim()) {
        const q = encodeURIComponent(query.trim());
        // url += `&filters[$or][0][PS_No][$containsi]=${q}&filters[$or][1][PS_Name][$containsi]=${q}`;
        url += `&filters[$or][0][PS_No][$eq]=${q}`;
      }

      const res = await api.get(url);
      const items = res.data?.data ?? res.data ?? [];

      const normalized = (Array.isArray(items) ? items : [items]).map(
        (l: any) => {
          const attrs = l?.attributes ?? l;
          return {
            id: l?.id ?? attrs?.id,
            documentId: l?.documentId ?? attrs?.documentId,
            PS_No: l?.PS_No ?? attrs?.PS_No ?? attrs?.PS_No ?? "",
            PS_Name: l?.PS_Name ?? attrs?.PS_Name ?? attrs?.PS_Name ?? "",
            PS_Location:
              l?.PS_Location ?? attrs?.PS_Location ?? attrs?.PS_Location ?? "",
            Installation_Status:
              l?.Installation_Status ?? attrs?.Installation_Status ?? null,
            Survey_Status:
              l?.survey?.state ??
              attrs?.survey?.state ??
              l?.survey?.data?.attributes?.state ??
              attrs?.survey?.data?.attributes?.state ??
              null,
            Latitude: l?.Latitude ?? attrs?.Latitude ?? null,
            Longitude: l?.Longitude ?? attrs?.Longitude ?? null,
            createdAt: l?.createdAt ?? attrs?.createdAt ?? null,
            updatedAt: l?.updatedAt ?? attrs?.updatedAt ?? null,
          };
        },
      );

      setLocationsList(normalized);
    } catch (e) {
      console.warn("Failed to fetch locations:", e);
      message.error("Failed to load locations");
    } finally {
      setLocationsLoading(false);
    }
  };

  // Keep locationsList in sync when assembly initial data arrives
  useEffect(() => {
    if (assembly) setLocationsList(assembly.locations || []);
  }, [assembly]);

  if (loading || !assembly) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="max-w-5xl mx-auto">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  // Location columns
  const locationColumns = [
    { title: "PS No", dataIndex: "PS_No", key: "PS_No", width: 100 },
    { title: "PS Name", dataIndex: "PS_Name", key: "PS_Name" },
    // { title: "PS Location", dataIndex: "PS_Location", key: "PS_Location" },
    {
      title: "Survey Status",
      dataIndex: "Survey_Status",
      key: "Survey_Status",
      width: 140,
      render: (status: string) => (
        <Badge
          color={status === "Completed" ? "green" : "orange"}
          text={status || "Not Raised"}
        />
      ),
    },

    {
      title: "Installation Status",
      dataIndex: "Installation_Status",
      key: "Installation_Status",
      width: 140,
      render: (status: string) => (
        <Badge
          color={status === "Installed" ? "green" : "orange"}
          text={status || "Pending"}
        />
      ),
    },
    { title: "Lat", dataIndex: "Latitude", key: "Latitude", width: 120 },
    { title: "Lng", dataIndex: "Longitude", key: "Longitude", width: 120 },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_: any, record: any) => (
        <Link href={`/locations/${record.documentId}`}>
          <Button
            size="sm"
            className="bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] hover:from-[#2d7ae8] hover:to-[#1976D2] text-white border-0"
          >
            View
          </Button>
        </Link>
      ),
    },
  ];

  // Block columns
  const blockColumns = [
    { title: "Block Name", dataIndex: "Block_Name", key: "Block_Name" },
    { title: "Document ID", dataIndex: "documentId", key: "documentId" },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: any) => (
        <Button
          onClick={() => router.push(`/blocks/${record.documentId}`)}
          size="sm"
          className="bg-green-500 hover:bg-green-600 text-white"
        >
          View Details
        </Button>
      ),
    },
  ];

  // Dispatch columns
  const dispatchColumns = [
    { title: "Material", dataIndex: "Material_Name", key: "Material_Name" },
    { title: "Quantity", dataIndex: "Quantity", key: "Quantity" },
    { title: "From Level", dataIndex: "From_Level", key: "From_Level" },
    { title: "To Level", dataIndex: "To_Level", key: "To_Level" },
    {
      title: "Dispatched By",
      dataIndex: "Dispatched_By",
      key: "Dispatched_By",
    },
    { title: "Received By", dataIndex: "Received_By", key: "Received_By" },
    {
      title: "Status",
      dataIndex: "State",
      key: "State",
      render: (state: string) => (
        <Tag color={state === "Delivered" ? "green" : "orange"}>{state}</Tag>
      ),
    },
    {
      title: "Dispatched On",
      dataIndex: "Dispatched_On",
      key: "Dispatched_On",
    },
    { title: "Received On", dataIndex: "Received_On", key: "Received_On" },
    { title: "Remarks", dataIndex: "Remarks", key: "Remarks" },
  ];

  return (
    <PageLayout>
      <main className="px-3 sm:px-6 lg:px-8 py-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {assembly.assemblyName}
                <span className="text-xl text-gray-500 ml-3">
                  (Assembly #{assembly.assemblyNo})
                </span>
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {/* <Tag color="blue" icon={<MapPin className="w-4 h-4" />}>
                  {assembly.district}
                </Tag>
                <Tag color="purple" icon={<Building className="w-4 h-4" />}>
                  {assembly.state}
                </Tag> */}
                {/* <Tag color="geekblue" icon={<Clock className="w-4 h-4" />}>
                  {assembly.phase}
                </Tag> */}
                {/* {assembly.coordinator && (
                  <Tag color="green" icon={<User className="w-4 h-4" />}>
                    {(assembly.coordinator.email ?? assembly.coordinator.username ?? "Coordinator").toLowerCase()}
                  </Tag>
                )} */}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button
                type="button"
                onClick={() => router.back()}
                className="bg-gray-100 text-black hover:bg-gray-200"
              >
                Back to Assemblies
              </Button>

              <Button type="primary" onClick={() => setAddLocationOpen(true)}>
                + Add Location
              </Button>
            </div>
          </div>

          {/* KPI cards - same style as Survey page */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 shadow-sm relative border border-gray-100">
              <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-[#2196F3] flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm text-gray-500">Total Locations</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{assembly.locations?.length ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Polling stations</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm relative border border-gray-100">
              <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-[#FFC107] flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm text-gray-500">Raised Surveys</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{raisedCount}</p>
              <p className="text-xs text-gray-500 mt-1">In progress</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm relative border border-gray-100">
              <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-[#4CAF50] flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{completedCount}</p>
              <p className="text-xs text-gray-500 mt-1">Surveys done</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm relative border border-gray-100">
              <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-[#7B61FF] flex items-center justify-center">
                <Building className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm text-gray-500">District</p>
              <p className="text-lg font-bold text-gray-900 mt-1 truncate">{assembly.district ?? "—"}</p>
              <p className="text-xs text-gray-500 mt-1">Assembly constituency</p>
            </div>
          </div>

          {/* Assembly Details */}
          <ModernCard className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Assembly Details
            </h2>
            <Descriptions column={{ xs: 1, sm: 1, md: 2, lg: 2 }} size="small">
              {" "}
              <Descriptions.Item label="Assembly Name" span={2}>
                <span className="font-semibold">{assembly.assemblyName}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Assembly Number">
                <span className="font-semibold">#{assembly.assemblyNo}</span>
              </Descriptions.Item>
              <Descriptions.Item label="State">
                {assembly.state}
              </Descriptions.Item>
              <Descriptions.Item label="District">
                {assembly.district}
              </Descriptions.Item>
              <Descriptions.Item label="Phase">
                {assembly.phase}
              </Descriptions.Item>
              <Descriptions.Item label="Election District">
                {assembly.electionDistrict || "Not specified"}
              </Descriptions.Item>
              <Descriptions.Item label="Created At">
                {new Date(assembly.createdAt).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Updated At">
                {new Date(assembly.updatedAt).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Published At">
                {new Date(assembly.publishedAt).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Document ID">
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {assembly.documentId}
                </code>
              </Descriptions.Item>
            </Descriptions>
          </ModernCard>

          {/* Assembly Coordinator Details */}
          {assembly.coordinator && (
            <ModernCard className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
                <User className="w-5 h-5" />
                Assembly Coordinator Details
              </h2>
              <Descriptions column={2} className="text-sm">
                <Descriptions.Item label="Email" span={1}>
                  {((assembly.coordinator.email || assembly.coordinator.user?.email) ?? "").toLowerCase() || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Username" span={1}>
                  {assembly.coordinator.username ||
                    assembly.coordinator.user?.username ||
                    "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Full Name" span={1}>
                  {assembly_coordinator?.profile?.Full_Name || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Phone" span={1}>
                  {assembly_coordinator?.profile?.Phone_Number || "N/A"}
                </Descriptions.Item>
                {/* <Descriptions.Item label="District" span={1}>
                  {assembly_coordinator.profile?.District || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Assembly" span={1}>
                  {assembly_coordinator.profile?.Assembly || "N/A"}
                </Descriptions.Item> */}
                <Descriptions.Item label="Aadhar" span={1}>
                  {assembly_coordinator?.profile?.Aadhar || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="State" span={1}>
                  {assembly_coordinator?.profile?.State || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Village" span={1}>
                  {assembly_coordinator?.profile?.Village || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Pincode" span={1}>
                  {assembly_coordinator?.profile?.Pincode || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Father Name" span={1}>
                  {assembly_coordinator?.profile?.Father_Name || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Mother Name" span={1}>
                  {assembly_coordinator?.profile?.Mother_Name || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Bank/UPI" span={2}>
                  {assembly_coordinator?.profile?.Bank_or_UPI || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Address" span={2}>
                  {assembly_coordinator?.profile?.address || "N/A"}
                </Descriptions.Item>
              </Descriptions>
            </ModernCard>
          )}

          {!assembly.coordinator && (
            <ModernCard className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
                <User className="w-5 h-5" />
                Assembly Coordinator Not Assigned
              </h2>
            </ModernCard>
          )}

          {/* Locations Section */}
          <ModernCard className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Polling Locations ({(locationsList || []).length})
              </h2>
              <div className="flex items-center gap-3">
                <Input.Search
                  placeholder="Search by PS No"
                  allowClear
                  enterButton
                  onSearch={(val) => fetchLocations(val)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setLocationQuery(v);
                    if (v === "") fetchLocations("");
                  }}
                  value={locationQuery}
                  style={{ width: 360 }}
                />
                {/* Add Location button (disabled when assembly not published) */}
              </div>
            </div>

            {!locationsList || locationsList.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">
                  No locations found for this assembly
                </p>
                <p className="text-gray-400 mt-2">
                  Add polling station locations to get started
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table
                  dataSource={locationsList}
                  loading={locationsLoading}
                  columns={locationColumns}
                  rowKey={(r: any) => r.id || r.PS_No}
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 1000 }}
                />
              </div>
            )}
          </ModernCard>

          {/* Dispatches Section */}
          <ModernCard>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Material Dispatches (
                {Array.isArray(assembly.dispatches)
                  ? assembly.dispatches.length
                  : 0}
                )
              </h2>
            </div>

            {Array.isArray(assembly.dispatches) &&
            assembly.dispatches.length > 0 ? (
              <div className="overflow-x-auto">
                <Table
                  dataSource={assembly.dispatches}
                  columns={dispatchColumns}
                  rowKey={(d: any) => d.id || d.documentId}
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 1200 }}
                />
              </div>
            ) : (
              <div className="text-center py-8">
                <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No material dispatches recorded</p>
              </div>
            )}
          </ModernCard>
        </div>
      </main>

      <AddLocationModal
        open={addLocationOpen}
        onClose={() => setAddLocationOpen(false)}
        onSuccess={() => fetchLocations("")}
        assemblyId={assembly.documentId}
      />
    </PageLayout>
  );
}
