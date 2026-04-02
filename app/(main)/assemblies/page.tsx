"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { message, Spin, Table, Input, Select, Tag, Space } from "antd";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/page-title";
import { ModernCard } from "@/components/ui/modern-card";
import { SearchOutlined, FilterOutlined, EyeOutlined } from "@ant-design/icons";
import { MapPin, Building, FileText, Camera, Plus } from "lucide-react";
import bpi from "@/lib/api";
import { Item } from "@radix-ui/react-select";
import Link from "next/link";
import AddAssemblyModal from "@/components/locations/AddAssemblyModal";

const { Option } = Select;

export default function AssembliesPage() {
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [districts, setDistricts] = useState<string[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [total, setTotal] = useState(0);
  const [summaryData, setSummaryData] = useState<{
    totalLocations: number;
    raisedSurveys: number;
    totalcompletedSurveys: number;
    totalBoqs: number;
  }>({
    totalLocations: 0,
    raisedSurveys: 0,
    totalcompletedSurveys: 0,
    totalBoqs: 0,
  });

  const [addAssemblyOpen, setAddAssemblyOpen] = useState(false);

  const router = useRouter();

  // Fetch assemblies with filters
  // Accept explicit search and district parameters to avoid stale state issues
  const fetchAssemblies = async (
    page = 1,
    pageSize = 10,
    search: string | undefined = searchTerm,
    district: string | undefined = selectedDistrict,
  ) => {
    try {
      setLoading(true);

      // Use Strapi public API endpoint and include relations
      // bpi.baseURL already includes /api, so request path should NOT include /api again
      let url = `/assemblies?
populate[district][fields][0]=district_name&
populate[locations][fields][0]=Survey_Status&
populate[assembly_coordinator][fields][0]=id&
pagination[page]=${page}&pagination[pageSize]=${pageSize}

`;

      // Apply search filter (use passed value if provided)
      if (search && search.toString().trim()) {
        // Strapi field is Assembly_Name - use case-insensitive contains
        url += `&filters[Assembly_Name][$containsi]=${encodeURIComponent(
          search.toString().trim(),
        )}`;
      }

      // Apply district filter (use passed value if provided)
      if (district && district !== "all") {
        // district is a relation; filter by district_name
        url += `&filters[district][district_name][$eq]=${encodeURIComponent(district)}`;
      }

      const response = await bpi.get(url);
      const rawData = response.data?.data || [];

      // Normalize raw items into the shape used by this table
      const data = await Promise.all(
        rawData.map(async (item: any) => {
          const assemblyName =
            item?.Assembly_Name ?? item?.attributes?.Assembly_Name ?? "";

          const assemblyNo =
            item?.Assembly_No ?? item?.attributes?.Assembly_No ?? "";

          const district =
            item?.district?.district_name ??
            item?.attributes?.district?.district_name ??
            "";

          const locations = item.locations || [];

          let raisedSurveys = 0;
          let completedSurveys = 0;

          locations.forEach((loc: any) => {
            if (loc.Survey_Status === "Raised") raisedSurveys++;
            if (loc.Survey_Status === "Completed") completedSurveys++;
          });

          const isAssigned = !!item?.assembly_coordinator;

          return {
            id: item.id,
            documentId: item.documentId,
            assemblyName,
            assemblyNo,
            district,
            totalLocations: locations.length,
            raisedSurveys,
            completedSurveys,
            isAssigned,
          };
        }),
      );

      setAssemblies(data);
      setTotal(response.data?.meta?.pagination?.total || data.length);
      setPagination({ current: page, pageSize });

      if (district === "all") {
        loadSummary("all");
      } else {
        loadSummary(district, data);
      }

      // districts are fetched separately via the /districts endpoint
      // (keeps the filter list canonical and decoupled from paginated results)
    } catch (error) {
      console.error("Error fetching assemblies:", error);
      message.error("Failed to load assemblies data");
      setAssemblies([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async (district: string, assembliesData?: any[]) => {
    try {
      // ✅ ONLY use API when ALL
      if (district === "all") {
        const res = await bpi.get("/dashboard/superadmin");
        const d = res.data?.data;

        setSummaryData({
          totalLocations: d.totalLocations,
          raisedSurveys: d.raisedSurveys,
          totalcompletedSurveys: d.completedSurveys,
          totalBoqs: d.totalBoqs,
        });
        return;
      }

      // ✅ For district → calculate like before
      let totalLocations = 0;
      let totalSurveys = 0;
      let totalBoqs = 0;
      let totalcompletedSurveys = 0;

      (assembliesData || []).forEach((item: any) => {
        totalLocations += item.totalLocations ?? 0;
        totalSurveys += item.raisedSurveys ?? 0;
        totalcompletedSurveys += item.completedSurveys ?? 0;
        totalBoqs += item.raisedBoqs ?? 0;
      });

      setSummaryData({
        totalLocations,
        raisedSurveys: totalSurveys,
        totalcompletedSurveys: totalcompletedSurveys, // ✅ ADD THIS
        totalBoqs,
      });
    } catch (err) {
      console.error("Summary load failed", err);
    }
  };

  // Fetch districts for filter dropdown (canonical list)
  const fetchDistricts = async () => {
    try {
      // bpi.baseURL already contains /api
      const res = await bpi.get(
        "/districts?fields[0]=district_name&pagination[pageSize]=1000",
      );
      const raw = res.data?.data || [];
      const names = raw
        .map((d: any) => d?.district_name ?? d?.attributes?.district_name ?? "")
        .filter(Boolean);
      setDistricts(names as string[]);
    } catch (err) {
      console.error("Error fetching districts:", err);
    }
  };

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPagination({ ...pagination, current: 1 });
    // pass both search and current district filter
    fetchAssemblies(1, pagination.pageSize, value, selectedDistrict);
    // fetchSummaryData(value, selectedDistrict);
  };

  // Handle district filter
  const handleDistrictFilter = (value?: string) => {
    const districtValue = value ?? "all";
    setSelectedDistrict(districtValue);
    setPagination({ ...pagination, current: 1 });

    fetchAssemblies(1, pagination.pageSize, searchTerm, districtValue);
    loadSummary(districtValue);
  };

  // Handle table pagination
  const handleTableChange = (newPagination: any) => {
    // pass current filters when changing pagination
    fetchAssemblies(
      newPagination.current,
      newPagination.pageSize,
      searchTerm,
      selectedDistrict,
    );
  };

  // View assembly details

  // View blocks under assembly (use documentId if available)
  const handleViewBlocks = (record: any) => {
    const docId = record.documentId ?? record.id;
    router.push(`/assemblies/${docId}/blocks`);
  };

  const handleBulkAutoCreate = async () => {
    const hide = message.loading("Starting bulk creation...", 0);
    try {
      // Fetch all assemblies
      const res = await bpi.get("/assemblies?pagination[pageSize]=1000");
      const allAssemblies = res.data.data;

      // Get current user and role
      const meRes = await bpi.get("/users/me");
      const currentUserId = meRes.data.documentId || null;

      const rolesRes = await bpi.get("/users-permissions/roles");
      const acRole = rolesRes.data.roles.find(
        (r: any) =>
          r.type === "assembly_coordinator" ||
          r.name === "Assembly Coordinator" ||
          r.type === "assembly-coordinator",
      );

      if (!acRole) {
        hide();
        message.error("Assembly Coordinator role not found");
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const asm of allAssemblies) {
        const asmName =
          asm?.Assembly_Name ?? asm?.attributes?.Assembly_Name ?? "";
        if (!asmName) continue;

        const cleanName = asmName.toLowerCase().replace(/[^a-z0-9]/g, "");
        const email = `${cleanName}@brihaspathi.com`;
        const password = "Btpl@123";

        try {
          // 1. Check if user already exists
          let userId: string | number;
          let userDocumentId: string;

          const existingUserRes = await bpi.get(
            `/users?filters[email][$eq]=${email}`,
          );
          if (existingUserRes.data && existingUserRes.data.length > 0) {
            userId = existingUserRes.data[0].id;
            userDocumentId = existingUserRes.data[0].documentId;
          } else {
            // Create auth user if they don't exist
            const registerRes = await bpi.post("/auth/local/register", {
              username: email,
              email: email,
              password: password,
            });
            userId = registerRes.data.user.id;
            userDocumentId = registerRes.data.user.documentId;
          }

          // 2. Create app-user
          const appUserRes = await bpi.post("/app-users", {
            data: {
              Full_Name: asmName,
              email: email,
              createdby: currentUserId,
              Assembly: asm.documentId,
            },
          });
          const appUserId = appUserRes.data.data.id;

          // 3. Update user and get documentId
          const updatedUserRes = await bpi.put(`/users/${userId}`, {
            role: acRole.id,
            profile: appUserId,
          });
          const finalUserDocId =
            updatedUserRes.data.documentId || userDocumentId;

          // 4. Assign to assembly using User's documentId
          await bpi.put(`/assemblies/${asm.documentId}`, {
            data: {
              assembly_coordinator: finalUserDocId,
            },
          });

          successCount++;
        } catch (error) {
          console.error(
            `Failed to auto-create for ${asmName} (${email})`,
            error,
          );
          failCount++;
        }
      }

      hide();
      if (successCount > 0) {
        message.success(
          `Successfully auto-created ${successCount} assembly coordinators. (${failCount} failed/already exist)`,
        );
        fetchAssemblies(1, pagination.pageSize, searchTerm, selectedDistrict); // Refresh
      } else {
        message.info(
          `Completed. No new coordinators created (${failCount} failed/already exist).`,
        );
      }
    } catch (error) {
      hide();
      console.error(error);
      message.error("Failed to start bulk creation.");
    }
  };

  const handleAutoCreateCoordinator = async (record: any) => {
    const hide = message.loading("Creating coordinator...", 0);
    try {
      const cleanName = record.assemblyName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      const email = `${cleanName}@brihaspathi.com`;
      const password = "Btpl@123";
      const fullName = record.assemblyName;

      // Ensure we have current user ID for createdby
      const meRes = await bpi.get("/users/me");
      const currentUserId = meRes.data.documentId || null;

      // Get role ID for assembly_coordinator
      const rolesRes = await bpi.get("/users-permissions/roles");
      const roles = rolesRes.data.roles;
      const acRole = roles.find(
        (r: any) =>
          r.type === "assembly_coordinator" ||
          r.name === "Assembly Coordinator" ||
          r.type === "assembly-coordinator",
      );

      if (!acRole) {
        hide();
        message.error("Assembly Coordinator role not found");
        return;
      }

      // 1. Check if user already exists
      let userId: string | number;
      let userDocumentId: string;

      const existingUserRes = await bpi.get(
        `/users?filters[email][$eq]=${email}`,
      );
      if (existingUserRes.data && existingUserRes.data.length > 0) {
        userId = existingUserRes.data[0].id;
        userDocumentId = existingUserRes.data[0].documentId;
      } else {
        // Create auth user if they don't exist
        const registerRes = await bpi.post("/auth/local/register", {
          username: email,
          email: email,
          password: password,
        });
        userId = registerRes.data.user.id;
        userDocumentId = registerRes.data.user.documentId;
      }

      // 2. Create app-user
      const appUserRes = await bpi.post("/app-users", {
        data: {
          Full_Name: fullName,
          email: email,
          createdby: currentUserId,
          Assembly: record.documentId,
        },
      });
      const appUserId = appUserRes.data.data.id;

      // 3. Update user with role and profile
      const updatedUserRes = await bpi.put(`/users/${userId}`, {
        role: acRole.id,
        profile: appUserId,
      });
      const finalUserDocId = updatedUserRes.data.documentId || userDocumentId;

      // 4. Update assembly with assembly_coordinator relation using User's documentId
      await bpi.put(`/assemblies/${record.documentId}`, {
        data: {
          assembly_coordinator: finalUserDocId,
        },
      });

      hide();
      message.success(`Coordinator created for ${fullName} (${email})`);
    } catch (error: any) {
      hide();
      console.error(error);
      const errMsg =
        error.response?.data?.error?.message ||
        "Failed to create coordinator. Note: Emails must be unique.";
      message.error(errMsg);
    }
  };

  // useEffect(() => {
  //   fetchAssemblies();
  //   fetchSummaryData();
  //   fetchDistricts();
  // }, []);

  useEffect(() => {
    const district = "all";

    setSelectedDistrict(district);
    fetchAssemblies(1, pagination.pageSize, searchTerm, district);
    loadSummary(district); // ✅ ADD THIS

    fetchDistricts();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchAssemblies(1, pagination.pageSize, searchTerm, selectedDistrict);
      loadSummary(selectedDistrict); // ✅ ADD THIS
    }, 400);

    return () => clearTimeout(t);
  }, [searchTerm]);

  // Table columns
  const columns = [
    {
      title: "Assembly Name",
      dataIndex: "assemblyName",
      width: 100,
      key: "assemblyName",
      render: (text: string) => (
        <span className="font-medium text-blue-600 break-words">{text}</span>
      ),
    },
    {
      title: "Assembly No",
      dataIndex: "assemblyNo",
      key: "assemblyNo",
      width: 120,
    },
    {
      title: "District",
      dataIndex: "district",
      key: "district",
      width: 150,
      render: (district: string) => (
        <Tag color="blue" className="px-3 py-1">
          {district}
        </Tag>
      ),
    },
    // {
    //   title: "Total Locations",
    //   dataIndex: "totalLocations",
    //   key: "totalLocations",
    //   width: 120,
    //   render: (value: number) => (
    //     <div className="flex items-center gap-2">
    //       <MapPin className="w-4 h-4 text-gray-600" />
    //       <span className="font-semibold">{value}</span>
    //     </div>
    //   ),
    // },
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
    // {
    //   title: "BOQs",
    //   key: "boqs",
    //   width: 120,
    //   render: (_: any, record: any) => (
    //     <div className="flex items-center gap-2">
    //       <Building className="w-4 h-4 text-amber-600" />
    //       <span>
    //         {record.raisedBoqs} / {record.totalLocations}
    //       </span>
    //     </div>
    //   ),
    // },
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
      width: 150,
      fixed: "right" as const,
      render: (_: any, record: any) => (
        <Space size="middle">
          <Link href={`/assemblies/${record.documentId}`}>
            <Button variant="primary" size="sm" className="rounded-xl">
              <EyeOutlined className="w-4 h-4 mr-1" />
              View
            </Button>
          </Link>
          {!record.isAssigned && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAutoCreateCoordinator(record)}
              className="rounded-xl bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
            >
              Auto Create
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full min-w-0">
      <PageTitle title="Assemblies" subtitle="Man all assembly constituencies">
        <div className="flex items-center gap-3">
          {/* <Button
            variant="outline"
            className="rounded-xl px-5 py-2.5 font-medium border-green-500 text-green-600 hover:bg-green-50"
            onClick={handleBulkAutoCreate}
          >
            Bulk Auto Create
          </Button> */}
          <Button
            variant="gradient"
            className="rounded-xl px-5 py-2.5 font-medium"
            onClick={() => setAddAssemblyOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Assembly
          </Button>
        </div>
      </PageTitle>

      {/* Filters Section */}
      <ModernCard className="mb-6 border border-gray-200 rounded-xl shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search Input */}
          <Input
            placeholder="Search by assembly name..."
            prefix={<SearchOutlined />}
            size="large"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
          />

          {/* District Filter */}
          <Select
            placeholder="Filter by District"
            size="large"
            value={selectedDistrict}
            onChange={handleDistrictFilter}
            allowClear
          >
            <Option value="all">All Districts</Option>
            {districts.map((district) => (
              <Option key={district} value={district}>
                {district}
              </Option>
            ))}
          </Select>

          {/* Clear Filters Button */}
          {(searchTerm || selectedDistrict !== "all") && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl flex items-center gap-2"
              onClick={() => {
                setSearchTerm("");
                setSelectedDistrict("all");
                fetchAssemblies(1, pagination.pageSize, "", "all");
                loadSummary("all");
              }}
            >
              <FilterOutlined />
              Clear Filters
            </Button>
          )}
        </div>
      </ModernCard>

      {/* Summary Cards */}
      {!loading && assemblies.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <ModernCard className="text-center p-4">
            <div className="text-2xl font-bold text-blue-600">{total}</div>
            <div className="text-gray-600">Total Assemblies</div>
          </ModernCard>

          <ModernCard className="text-center p-4">
            <div className="text-2xl font-bold text-green-600">
              {summaryData.totalLocations}
            </div>
            <div className="text-gray-600">Total Polling Stations</div>
          </ModernCard>

          <ModernCard className="text-center p-4">
            <div className="text-2xl font-bold text-purple-600">
              {summaryData.raisedSurveys}
            </div>
            <div className="text-gray-600">Raised Surveys</div>
          </ModernCard>

          <ModernCard className="text-center p-4">
            <div className="text-2xl font-bold text-purple-600">
              {summaryData.totalcompletedSurveys}
            </div>
            <div className="text-gray-600">Completed Surveys</div>
          </ModernCard>

          {/* <ModernCard className="text-center p-4">
              <div className="text-2xl font-bold text-amber-600">
                {summaryData.totalBoqs}
              </div>
              <div className="text-gray-600">Raised BOQs</div>
            </ModernCard> */}
        </div>
      )}

      {/* Assemblies Table */}
      <ModernCard className="border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-700">
            Assembly Constituencies
          </h2>
          <span className="text-sm text-gray-500">
            Showing {assemblies.length} of {total} assemblies
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Spin size="large" />
          </div>
        ) : assemblies.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No assemblies found</p>
            <p className="text-gray-400 text-sm mt-1">
              Try adjusting your search or filter criteria
            </p>
          </div>
        ) : (
          <Table
            dataSource={assemblies}
            columns={columns}
            rowKey={(r) => r.documentId ?? r.id}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: total,
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

      <AddAssemblyModal
        open={addAssemblyOpen}
        onClose={() => setAddAssemblyOpen(false)}
        onSuccess={() => {
          fetchAssemblies(
            pagination.current,
            pagination.pageSize,
            searchTerm,
            selectedDistrict,
          );
        }}
      />
    </div>
  );
}
