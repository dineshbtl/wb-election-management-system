"use client";

import React, { useEffect, useState } from "react";
import { Input, Select, Spin, Table, Tag, Button, Modal, Space } from "antd";
import { EyeOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import CreateCoordinatorModal from "@/components/coordinator/Createcoordinator";
import EditUserModal from "@/components/users/Editusermodal";
import ViewUserModal from "@/components/users/ViewUserModal";

const { Option } = Select;

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [roles, setRoles] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [total, setTotal] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [selectedUserDocumentId, setSelectedUserDocumentId] = useState<
    string | null
  >(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [selectedViewUser, setSelectedViewUser] = useState<any>(null);

  const router = useRouter();
  const [kpis, setKpis] = useState({
    total: 0,
    block: 0,
    booth: 0,
  });
  const [kpiLoading, setKpiLoading] = useState(false);

  const [loggedInUserId, setLoggedInUserId] = useState<number | null>(null);

  useEffect(() => {
    api.get("/users/me").then((res) => {
      setLoggedInUserId(res.data.documentId);
    });
    fetchRoles();
    fetchKpiCounts();
  }, []);

  // Fetch roles
  const fetchRoles = async () => {
    try {
      const res = await api.get("/users-permissions/roles");
      const allowed = (res.data.roles || []).filter(
        (r: any) => r.name.toLowerCase() === "booth coordinator",
      );

      setRoles(allowed);
    } catch (err) {
      console.error("Error fetching roles:", err);
    }
  };

  // Fetch KPI counts for all users
  const fetchKpiCounts = async () => {
    setKpiLoading(true);
    try {
      // Get current user ID
      const meRes = await api.get("/users/me");
      const userId = meRes.data.documentId;

      const res = await api.get(
        `/app-users?populate[user][populate][role]=true&pagination[pageSize]=1000&filters[createdby][documentId][$eq]=${userId}`,
      );

      const kpiData = res.data.data || [];

      setKpis({
        total: kpiData.length,
        block: kpiData.filter(
          (u: any) => u.user?.role?.name?.toLowerCase() === "block coordinator",
        ).length,
        booth: kpiData.filter(
          (u: any) => u.user?.role?.name?.toLowerCase() === "booth coordinator",
        ).length,
      });
    } catch (err) {
      console.error("Error fetching KPI counts:", err);
    } finally {
      setKpiLoading(false);
    }
  };

  useEffect(() => {
    if (!loggedInUserId) return;

    fetchUsersWithFilters(
      searchTerm,
      selectedRole,
      pagination.current,
      pagination.pageSize,
      loggedInUserId,
    );
  }, [loggedInUserId]);

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPagination({ ...pagination, current: 1 });
    // Pass the search value directly instead of relying on state
    fetchUsersWithFilters(
      value,
      selectedRole,
      1,
      pagination.pageSize,
      loggedInUserId,
    );
  };

  // Handle role filter
  const handleRoleFilter = (value: string) => {
    setSelectedRole(value);
    setPagination({ ...pagination, current: 1 });
    // Pass the role value directly instead of relying on state
    fetchUsersWithFilters(
      searchTerm,
      value,
      1,
      pagination.pageSize,
      loggedInUserId,
    );
  };

  // Fetch users with explicit filter parameters
  const fetchUsersWithFilters = async (
    search: string,
    role: string,
    page = 1,
    pageSize = 10,
    userId: number | null = null,
  ) => {
    console.log("loginuser", userId);
    if (!userId) return;

    setLoading(true);
    try {
      let url = `/app-users?populate[createdby]=true&populate[user][populate][role]=true&populate[Photo]=true&populate[verified_certificate]=true&pagination[page]=${page}&pagination[pageSize]=${pageSize}`;

      // ✅ FIXED FILTER
      url += `&filters[createdby][documentId][$eq]=${userId}`;

      if (search.trim()) {
        url += `&filters[email][$contains]=${encodeURIComponent(search.trim())}`;
      }

      if (role !== "all") {
        url += `&filters[user][role][id][$eq]=${Number(role)}`;
      }

      console.log("Fetching app-users with URL:", url);

      const res = await api.get(url);

      setUsers(res.data.data || []);

      // Fetch all data without pagination to calculate KPI counts correctly
      let kpiUrl = `/app-users?populate[user][populate][role]=true&pagination[pageSize]=1000&filters[createdby][documentId][$eq]=${userId}`;
      if (search.trim()) {
        kpiUrl += `&filters[email][$contains]=${encodeURIComponent(search.trim())}`;
      }
      if (role !== "all") {
        kpiUrl += `&filters[user][role][id][$eq]=${Number(role)}`;
      }
      const kpiRes = await api.get(kpiUrl);
      const kpiData = kpiRes.data.data || [];

      setKpis({
        total: kpiData.length,
        block: kpiData.filter(
          (u: any) => u.user?.role?.name?.toLowerCase() === "block coordinator",
        ).length,
        booth: kpiData.filter(
          (u: any) => u.user?.role?.name?.toLowerCase() === "booth coordinator",
        ).length,
      });

      setTotal(res.data.meta?.pagination?.total || 0);
      setPagination({ current: page, pageSize });
    } catch (err) {
      console.error("Error fetching app-users:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle pagination change
  const handleTableChange = (newPagination: any) => {
    fetchUsersWithFilters(
      searchTerm,
      selectedRole,
      newPagination.current,
      newPagination.pageSize,
      loggedInUserId,
    );
  };

  // Get role name by ID
  const getRoleName = (roleId: number) => {
    const role = roles.find((r) => r.id === roleId);
    return role?.name || "N/A";
  };

  // Get role color
  const getRoleColor = (roleName: string) => {
    const colorMap: any = {
      superadmin: "red",
      "district coordinator": "orange",
      "assembly coordinator": "blue",
      "block coordinator": "green",
      "booth coordinator": "cyan",
      authenticated: "default",
    };
    return colorMap[roleName?.toLowerCase()] || "default";
  };

  // Table columns
  const columns = [
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 200,
    },
    {
      title: "Full Name",
      key: "fullName",
      width: 150,
      render: (_: any, record: any) => record.Full_Name || "—",
    },
    {
      title: "Phone",
      key: "phone",
      width: 120,
      render: (_: any, record: any) => record.Phone_Number || "—",
    },
    {
      title: "District",
      key: "district",
      width: 150,
      render: (_: any, record: any) => record.District || "—",
    },
    {
      title: "Assembly",
      key: "assembly",
      width: 150,
      render: (_: any, record: any) => record.Assembly || "—",
    },
    {
      title: "Created By",
      key: "createdBy",
      width: 150,
      render: (_: any, record: any) => (
        <span>{record.createdby?.username || "—"}</span>
      ),
    },
    // {
    //   title: "Status",
    //   key: "status",
    //   width: 100,
    //   render: (_: any, record: any) => (
    //     <Tag color={record.status === "active" ? "green" : "orange"}>
    //       {record.status || "—"}
    //     </Tag>
    //   ),
    // },
    {
      title: "Actions",
      key: "actions",
      width: 180,
      fixed: "right" as const,
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewUser(record)}
          >
            View
          </Button>

          <Button
            type="default"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedUserDocumentId(record.user?.documentId);
              setEditOpen(true);
            }}
          >
            Edit
          </Button>
        </Space>
      ),
    },
  ];

  // View user details
  const handleViewUser = async (record: any) => {
    try {
      const documentId = record.user?.documentId;
      if (!documentId) return;

      // 1️⃣ Get auth user with relations
      const authRes = await api.get(
        `/users?filters[documentId][$eq]=${documentId}` +
          `&populate[role]=*` +
          `&populate[districts]=*` +
          `&populate[assemblies][populate][district]=*` +
          `&populate[blocks]=*` +
          `&populate[locations][populate][assembly][populate][district]=*`,
      );

      const authUser = authRes.data?.[0];
      if (!authUser) return;

      // 2️⃣ Get app-user with createdby
      const appUserRes = await api.get(
        `/app-users?filters[user][documentId][$eq]=${documentId}` +
          `&populate[createdby][fields][0]=id` +
          `&populate[createdby][fields][1]=username` +
          `&populate[Photo]=true` +
          `&populate[verified_certificate]=true`,
      );

      const appUser = appUserRes.data?.data?.[0];
      if (!appUser) return;

      const mergedUser = {
        ...authUser,
        profile: appUser,
      };

      setSelectedViewUser(mergedUser);
      setViewOpen(true);
    } catch (error) {
      console.error("Failed to fetch user for view:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Users Management</h1>
          <Button
            type="primary"
            size="large"
            onClick={() => setCreateOpen(true)}
            className="bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] hover:from-[#2d7ae8] hover:to-[#1976D2] text-white border-0"
          >
            + Add New User
          </Button>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="border rounded-xl p-5 bg-white shadow-sm">
            <div className="text-sm text-gray-500">Total Users</div>
            <div className="text-3xl font-bold text-gray-800">{kpis.total}</div>
          </div>

          {/* <div className="border rounded-xl p-5 bg-white shadow-sm">
            <div className="text-sm text-gray-500">Block Coordinators</div>
            <div className="text-3xl font-bold text-green-600">
              {kpis.block}
            </div>
          </div> */}

          <div className="border rounded-xl p-5 bg-white shadow-sm">
            <div className="text-sm text-gray-500">Booth Coordinators</div>
            <div className="text-3xl font-bold text-blue-600">{kpis.booth}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Input
            placeholder="Search by email or username..."
            size="large"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            allowClear
          />
          <Select
            placeholder="Filter by Role"
            size="large"
            value={selectedRole}
            onChange={handleRoleFilter}
          >
            <Option value="all">All Roles</Option>
            {roles.map((role: any) => (
              <Option key={role.id} value={role.id.toString()}>
                {role.name}
              </Option>
            ))}
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center items-center h-96">
            <Spin size="large" />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={users}
            rowKey={(record) => record.id}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Total ${total} users`,
            }}
            onChange={handleTableChange}
            scroll={{ x: 1200 }}
            className="shadow-sm rounded"
          />
        )}
      </div>
      <CreateCoordinatorModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          // refresh table
          fetchUsersWithFilters(
            searchTerm,
            selectedRole,
            pagination.current,
            pagination.pageSize,
            loggedInUserId,
          );

          // refresh KPI cards
          fetchKpiCounts();

          setCreateOpen(false);
        }}
      />

      <EditUserModal
        open={editOpen}
        userDocumentId={selectedUserDocumentId}
        onClose={() => {
          setEditOpen(false);
          setSelectedUserDocumentId(null);
        }}
        onUpdated={() => {
          // refresh table
          fetchUsersWithFilters(
            searchTerm,
            selectedRole,
            pagination.current,
            pagination.pageSize,
            loggedInUserId,
          );

          // refresh KPIs
          fetchKpiCounts();
        }}
      />

      <ViewUserModal
        open={viewOpen}
        user={selectedViewUser}
        onClose={() => {
          setViewOpen(false);
          setSelectedViewUser(null);
        }}
      />
    </div>
  );
}
