"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  message,
  Spin,
  Table,
  Input,
  Select,
  Tag,
  Button,
  Space,
  Skeleton,
} from "antd";
import { PageLayout } from "@/components/layout/page-layout";
import { ModernCard } from "@/components/ui/modern-card";
import { BackToLink } from "@/components/ui/back-to-link";
import { EmptyState } from "@/components/ui/empty-state";
import { MapPin, Building, FileText, User, Search, Eye } from "lucide-react";
import bpi from "@/lib/api";
import UserDetailsModal from "@/components/users/UserDetailsModal";
import Link from "next/link";
import AddAssemblyModal from "@/components/locations/AddAssemblyModal";

const { Option } = Select;

export default function DistrictDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const districtId = params?.id as string;

  const [district, setDistrict] = useState<any>(null);
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAssemblyFilter, setSelectedAssemblyFilter] =
    useState<string>("all");
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [total, setTotal] = useState(0);

  const [summaryData, setSummaryData] = useState({
    totalAssemblies: 0,
    totalLocations: 0,
    totalSurveys: 0,
    totalBoqs: 0,
  });

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedUserDocId, setSelectedUserDocId] = useState<string | null>(
    null,
  );

  const [addAssemblyOpen, setAddAssemblyOpen] = useState(false);

  // 🔹 Fetch district + its assemblies
  const fetchDistrictAndAssemblies = async (
    page = 1,
    pageSize = 10,
    search = searchTerm,
    assemblyFilter = selectedAssemblyFilter,
  ) => {
    if (!districtId) return;

    try {
      setLoading(true);

      // 1️⃣ Fetch district (with coordinator)
      const districtRes = await bpi.get(
        `/districts/${districtId}?populate[district_coordinator][populate][profile]=true`,
      );
      const districtData = districtRes.data.data;
      setDistrict(districtData);

      console.log("District data:", districtData); // Debug log

      // 2️⃣ Fetch assemblies under this district
      let url = `/assemblies?
filters[district][documentId][$eq]=${districtData.documentId}&
populate[locations][fields][0]=id&
populate[assembly_coordinator][populate][profile]=true&
pagination[page]=${page}&pagination[pageSize]=${pageSize}
`;

      if (search.trim()) {
        url += `&filters[Assembly_Name][$containsi]=${encodeURIComponent(search.trim())}`;
      }

      const asmRes = await bpi.get(url);
      const rawAssemblies = asmRes.data?.data || [];
      const processed = await Promise.all(
        rawAssemblies.map(async (item: any) => {
          const locations = item.locations?.data || item.locations || [];
          const totalLocations = Array.isArray(locations)
            ? locations.length
            : 0;

          // ✅ REAL survey count
          const surveyRes = await bpi.get("/locations", {
            params: {
              "filters[assembly][documentId][$eq]": item.documentId,
              "filters[survey][state][$eq]": "Raised",
              "pagination[pageSize]": 1,
            },
          });

          const raisedSurveys = surveyRes.data?.meta?.pagination?.total || 0;

          return {
            id: item.id,
            documentId: item.documentId,
            assemblyName: item.Assembly_Name || "",
            assemblyNo: item.Assembly_No || "",
            district: districtData.district_name,
            totalLocations,
            raisedSurveys, // ✅ now correct
            coordinator: item.assembly_coordinator?.profile?.Full_Name || null,
            coordinatorId: item.assembly_coordinator?.documentId || null,
          };
        }),
      );

      setAssemblies(processed);
      setTotal(asmRes.data?.meta?.pagination?.total || processed.length);
      setPagination({ current: page, pageSize });

      // 3️⃣ Compute summary
      let totalLocs = 0,
        totalSvy = 0,
        totalBq = 0;
      processed.forEach((a: any) => {
        totalLocs += a.totalLocations;
        totalSvy += a.raisedSurveys;
        totalBq += a.raisedBoqs;
      });

      setSummaryData({
        totalAssemblies: processed.length,
        totalLocations: totalLocs,
        totalSurveys: totalSvy,
        totalBoqs: totalBq,
      });
    } catch (err) {
      console.error("Failed to load district details:", err);
      message.error("Failed to load district data");
      setDistrict(null);
      setAssemblies([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPagination({ ...pagination, current: 1 });
    fetchDistrictAndAssemblies(
      1,
      pagination.pageSize,
      value,
      selectedAssemblyFilter,
    );
  };

  // 🔹 Handle table pagination
  const handleTableChange = (newPagination: any) => {
    fetchDistrictAndAssemblies(
      newPagination.current,
      newPagination.pageSize,
      searchTerm,
      selectedAssemblyFilter,
    );
  };

  // 🔹 View assembly details

  // 🔹 Initialize
  useEffect(() => {
    if (districtId) {
      fetchDistrictAndAssemblies();
    }
  }, [districtId]);

  // 🔹 Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      if (districtId) {
        fetchDistrictAndAssemblies(
          1,
          pagination.pageSize,
          searchTerm,
          selectedAssemblyFilter,
        );
      }
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm, districtId]);

  if (loading && !district) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center h-screen">
          <Spin size="large" />
        </div>
      </PageLayout>
    );
  }

  if (!district) {
    return (
      <PageLayout>
        <ModernCard className="text-center py-12">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">District not found</p>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </ModernCard>
      </PageLayout>
    );
  }

  // Table columns (same style as AssembliesPage)
  const columns = [
    {
      title: "Assembly Name",
      dataIndex: "assemblyName",
      key: "assemblyName",
      render: (text: string) => (
        <span className="font-medium text-blue-600">{text}</span>
      ),
    },
    {
      title: "Assembly No",
      dataIndex: "assemblyNo",
      key: "assemblyNo",
      width: 120,
    },
    {
      title: "Coordinator",
      key: "coordinator",
      width: 180,
      render: (_: any, record: any) =>
        record.coordinator ? (
          <div
            onClick={() => {
              setSelectedUserDocId(record.coordinatorId);
              setUserModalOpen(true);
            }}
            className="flex items-center text-blue-500  border-b gap-2 cursor-pointer"
          >
            <User className="w-4 h-4 text-blue-500" />
            <span>{record.coordinator}</span>
          </div>
        ) : (
          <span className="text-gray-400 italic">Not assigned</span>
        ),
    },
    {
      title: "Surveys",
      key: "surveys",
      width: 120,
      render: (_: any, record: any) => (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-600" />
          <span>
            {record.raisedSurveys} / {record.totalLocations}
          </span>
        </div>
      ),
    },
    {
      title: "BOQs",
      key: "boqs",
      width: 120,
      render: (_: any, record: any) => (
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-amber-600" />
          <span>
            {record.raisedBoqs} / {record.totalLocations}
          </span>
        </div>
      ),
    },
    // {
    //   title: "IN Cameras",
    //   key: "inCameras",
    //   width: 120,
    //   render: (_: any, record: any) => (
    //     <div className="flex items-center gap-2">
    //       <Camera className="w-4 h-4 text-green-600" />
    //       <span>
    //         {record.installedInCameras} / {record.totalInCameras}
    //       </span>
    //     </div>
    //   ),
    // },
    // {
    //   title: "OUT Cameras",
    //   key: "outCameras",
    //   width: 120,
    //   render: (_: any, record: any) => (
    //     <div className="flex items-center gap-2">
    //       <Camera className="w-4 h-4 text-orange-600" />
    //       <span>
    //         {record.installedOutCameras} / {record.totalOutCameras}
    //       </span>
    //     </div>
    //   ),
    // },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      fixed: "right" as const,
      render: (_: any, record: any) => (
        //         const handleViewAssembly = (record: any) => {
        //   router.push(`/assemblies/${record.documentId}`);
        // };
        <Space size="middle">
          <Link href={`/assemblies/${record.documentId}`}>
            <Button
              type="primary"
              size="small"
              icon={<Eye className="w-4 h-4" />}
              // onClick={() => handleViewAssembly(record)}
            >
              View
            </Button>
          </Link>
        </Space>
      ),
    },
  ];

  return (
    <PageLayout>
      <main className="sm:p-8 bg-gray-50 min-h-screen">
        {/* 🔙 Back & Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* LEFT SIDE → Title */}
            <div className="">
              <h1 className="text-3xl font-bold text-gray-900">
                {district.district_name}
              </h1>

              <p className="text-gray-600 mt-1 flex items-center gap-2">
                <span>State: {district.state || "—"}</span>
                {district.district_coordinator?.profile && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      Coordinator:{" "}
                      {district.district_coordinator.profile.Full_Name}
                    </span>
                  </>
                )}
              </p>
            </div>

            <div className="flex flex-row gap-4 items-center">
              <BackToLink href="/districts" label="Back to Districts" />
              <Button type="primary" onClick={() => setAddAssemblyOpen(true)} className="rounded-xl">
                + Add Assembly
              </Button>
            </div>
          </div>
        </div>

        {/* 🔍 Filters */}
        <ModernCard className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              placeholder="Search assemblies by name..."
              prefix={<Search className="w-4 h-4 text-gray-400" />}
              size="large"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
            />

            {/* Assembly filter is optional; you can add if needed */}
            {/* For now, only search is used */}

            {searchTerm && (
              <Button
                type="default"
                size="large"
                onClick={() => {
                  setSearchTerm("");
                  fetchDistrictAndAssemblies(1, pagination.pageSize, "", "all");
                }}
                className="flex items-center gap-2"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </ModernCard>

        {/* KPI cards - same style as Survey page */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm relative border border-gray-100">
              <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-[#2196F3] flex items-center justify-center">
                <Building className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm text-gray-500">Assemblies</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summaryData.totalAssemblies}</p>
              <p className="text-xs text-gray-500 mt-1">In this district</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm relative border border-gray-100">
              <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-[#4CAF50] flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm text-gray-500">Total Locations</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summaryData.totalLocations}</p>
              <p className="text-xs text-gray-500 mt-1">Polling stations</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm relative border border-gray-100">
              <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-[#FFC107] flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm text-gray-500">Raised Surveys</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summaryData.totalSurveys}</p>
              <p className="text-xs text-gray-500 mt-1">In progress</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm relative border border-gray-100">
              <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-[#7B61FF] flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm text-gray-500">Coordinator</p>
              <p className="text-lg font-bold text-gray-900 mt-1 truncate">
                {district.district_coordinator?.profile?.Full_Name ? "Assigned" : "—"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {district.district_coordinator?.profile?.Full_Name || "Not assigned"}
              </p>
            </div>
          </div>
        )}

        <UserDetailsModal
          open={userModalOpen}
          userDocumentId={selectedUserDocId}
          onClose={() => setUserModalOpen(false)}
        />

        {/* 🗂️ Assemblies Table */}
        <ModernCard>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700">
              Assemblies in {district.district_name}
            </h2>
            <span className="text-sm text-gray-500">
              Showing {assemblies.length} of {total} assemblies
            </span>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton active key={i} paragraph={{ rows: 1 }} />
              ))}
            </div>
          ) : assemblies.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="No assemblies found"
              description="Try adjusting your search or add an assembly."
              action={{ label: "Add Assembly", onClick: () => setAddAssemblyOpen(true) }}
            />
          ) : (
            <Table
              dataSource={assemblies}
              columns={columns}
              rowKey="documentId"
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `Total ${total} assemblies`,
              }}
              onChange={handleTableChange}
              scroll={{ x: 1200 }}
              className="shadow-sm rounded"
            />
          )}
        </ModernCard>

        {district.district_coordinator?.profile && (
          <ModernCard className="my-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              District Coordinator Details
            </h2>

            <div className="flex flex-col md:flex-row gap-6">
              {/* PHOTO */}
              <div className="flex-shrink-0">
                {district.district_coordinator.profile.Photo?.url ? (
                  <img
                    src={district.district_coordinator.profile.Photo.url}
                    alt="Coordinator"
                    className="w-32 h-32 rounded-lg object-cover border"
                  />
                ) : (
                  <div className="w-32 h-32 flex items-center justify-center bg-gray-100 rounded-lg border text-gray-400">
                    <User className="w-10 h-10" />
                  </div>
                )}
              </div>

              {/* DETAILS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div>
                  <span className="text-gray-500">Full Name</span>
                  <p className="font-medium text-gray-800">
                    {district.district_coordinator.profile.Full_Name}
                  </p>
                </div>

                <div>
                  <span className="text-gray-500">Email</span>
                  <p className="font-medium text-gray-800">
                    {(district.district_coordinator.email || "").toLowerCase()}
                  </p>
                </div>

                <div>
                  <span className="text-gray-500">Phone</span>
                  <p className="font-medium text-gray-800">
                    {district.district_coordinator.profile.Phone_Number || "—"}
                  </p>
                </div>

                <div>
                  <span className="text-gray-500">Role</span>
                  <p className="font-medium text-gray-800">
                    {district.district_coordinator.role?.name ||
                      "District Coordinator"}
                  </p>
                </div>

                <div>
                  <span className="text-gray-500">Aadhaar</span>
                  <p className="font-medium text-gray-800">
                    {district.district_coordinator.profile.Aadhar || "—"}
                  </p>
                </div>

                <div>
                  <span className="text-gray-500">Village</span>
                  <p className="font-medium text-gray-800">
                    {district.district_coordinator.profile.Village || "—"}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-gray-500">Address</span>
                  <p className="font-medium text-gray-800">
                    {district.district_coordinator.profile.address || "—"}
                  </p>
                </div>
              </div>
            </div>
          </ModernCard>
        )}
      </main>

      <AddAssemblyModal
        open={addAssemblyOpen}
        onClose={() => setAddAssemblyOpen(false)}
        onSuccess={() => fetchDistrictAndAssemblies()}
        districtId={districtId} // 👈 PASS HERE
      />
    </PageLayout>
  );
}
