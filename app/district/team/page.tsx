"use client";

import React, { useEffect, useState } from "react";
import {
  Input,
  Select,
  Spin,
  Table,
  Tag,
  Button,
  Modal,
  Space,
  Card,
} from "antd";
import {
  EyeOutlined,
  DeleteOutlined,
  EditOutlined,
  TeamOutlined,
} from "@ant-design/icons";
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
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [selectedUserDocumentId, setSelectedUserDocumentId] = useState<
    string | null
  >(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [selectedViewUser, setSelectedViewUser] = useState<any>(null);

  // KPI state for coordinator counts
  const [assemblyCoordinators, setAssemblyCoordinators] = useState(0);
  const [blockCoordinators, setBlockCoordinators] = useState(0);
  const [boothCoordinators, setBoothCoordinators] = useState(0);
  const [kpiLoading, setKpiLoading] = useState(false);

  const router = useRouter();

  const [loggedInUserId, setLoggedInUserId] = useState<number | null>(null);

  useEffect(() => {
    api.get("/users/me").then((res) => {
      setLoggedInUserId(res.data.documentId);
    });
    fetchRoles();
  }, []);

  // Fetch roles
  const fetchRoles = async () => {
    try {
      const res = await api.get("/users-permissions/roles");
      setRoles(res.data.roles || []);
    } catch (err) {
      console.error("Error fetching roles:", err);
    }
  };

  // Fetch coordinator counts for KPI cards
  const fetchCoordinatorCounts = async () => {
    if (!loggedInUserId) return;

    setKpiLoading(true);
    try {
      const res = await api.get(
        `/app-users?populate[user][populate][role]=true&pagination[pageSize]=1000&filters[createdby][documentId][$eq]=${loggedInUserId}`,
      );

      let appUsersData: any[] = [];

      if (Array.isArray(res.data)) {
        appUsersData = res.data;
      } else if (res.data.data && Array.isArray(res.data.data)) {
        appUsersData = res.data.data;
      }

      // Count by role
      const assembly = appUsersData.filter((u: any) =>
        u.user?.role?.name?.toLowerCase().includes("assembly"),
      ).length;

      const block = appUsersData.filter((u: any) =>
        u.user?.role?.name?.toLowerCase().includes("block"),
      ).length;

      const booth = appUsersData.filter((u: any) =>
        u.user?.role?.name?.toLowerCase().includes("booth"),
      ).length;

      setAssemblyCoordinators(assembly);
      setBlockCoordinators(block);
      setBoothCoordinators(booth);
    } catch (err) {
      console.error("Error fetching coordinator counts:", err);
    } finally {
      setKpiLoading(false);
    }
  };

  useEffect(() => {
    if (!loggedInUserId) return;

    fetchCoordinatorCounts();

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
    setSelectedRowKeys([]); // Clear selection on search
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
    setSelectedRowKeys([]); // Clear selection on filter change
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
      let url = `/app-users?populate[createdby][populate][role]=true&populate[user][populate][role]=true&populate[Photo]=true&populate[verified_certificate]=true&pagination[page]=${page}&pagination[pageSize]=${pageSize}`;

      // ✅ FIXED FILTER
      url += `&filters[createdby][documentId][$eq]=${userId}`;

      if (search.trim()) {
        url += `&filters[email][$contains]=${encodeURIComponent(search.trim())}`;
      }

      // Filter by user's role (since role is linked through user)
      if (role !== "all") {
        url += `&filters[user][role][id][$eq]=${Number(role)}`;
      }

      console.log("Fetching app-users with URL:", url);

      const res = await api.get(url);

      setUsers(res.data.data || []);
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
    setSelectedRowKeys([]); // Clear selection on pagination change
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
      title: "Role",
      key: "role",
      width: 150,
      render: (_: any, record: any) => {
        const roleName = record.user?.role?.name || "—";
        return <Tag color={getRoleColor(roleName)}>{roleName}</Tag>;
      },
    },
    {
      title: "Created By",
      key: "createdBy",
      width: 150,
      render: (_: any, record: any) => (
        <span>{record.createdby?.username || "—"}</span>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 100,
      render: (_: any, record: any) => (
        <Tag color={record.status === "active" ? "green" : "orange"}>
          {record.status || "—"}
        </Tag>
      ),
    },
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

  const handleViewUser = async (record: any) => {
    try {
      const documentId = record.user?.documentId;
      if (!documentId) return;

      // 1️⃣ Get auth user WITH ALL RELATIONS
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

      // 2️⃣ Get app-user (profile) with createdby
      const appUserRes = await api.get(
        `/app-users?filters[user][documentId][$eq]=${documentId}` +
          `&populate[createdby][fields][0]=id` +
          `&populate[createdby][fields][1]=username`,
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

  // View user details

  return (
    <div className="min-h-screen bg-gray-50 px-3 sm:px-4 md:px-6 py-4">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
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

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Card loading={kpiLoading} className="text-center" hoverable>
            <div className="flex items-center justify-center gap-2 mb-2">
              <TeamOutlined className="text-2xl text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {assemblyCoordinators}
            </div>
            <div className="text-gray-600 text-sm font-medium mt-1">
              Assembly Coordinators
            </div>
          </Card>

          {/* <Card loading={kpiLoading} className="text-center" hoverable>
            <div className="flex items-center justify-center gap-2 mb-2">
              <TeamOutlined className="text-2xl text-green-500" />
            </div>
            <div className="text-3xl font-bold text-green-600">
              {blockCoordinators}
            </div>
            <div className="text-gray-600 text-sm font-medium mt-1">
              Block Coordinators
            </div>
          </Card> */}

          <Card loading={kpiLoading} className="text-center" hoverable>
            <div className="flex items-center justify-center gap-2 mb-2">
              <TeamOutlined className="text-2xl text-cyan-500" />
            </div>
            <div className="text-3xl font-bold text-cyan-600">
              {boothCoordinators}
            </div>
            <div className="text-gray-600 text-sm font-medium mt-1">
              Booth Coordinators
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input
            placeholder="Search by email or username..."
            size="large"
            className="w-full"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            allowClear
          />
          <Select
            placeholder="Filter by Role"
            size="large"
            className="w-full"
            value={selectedRole}
            onChange={handleRoleFilter}
          >
            <Option value="all">All Roles</Option>
            {roles
              .filter((role: any) => {
                const roleName = role.name?.toLowerCase() || "";
                return (
                  roleName.includes("assembly") ||
                  roleName.includes("block") ||
                  roleName.includes("booth")
                );
              })
              .map((role: any) => (
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
          <div className="overflow-x-auto">
            <Table
              columns={columns}
              dataSource={users}
              rowKey={(record) => record.id}
              rowSelection={{
                selectedRowKeys,
                onChange: setSelectedRowKeys,
              }}
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
          </div>
        )}
      </div>
      <CreateCoordinatorModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          // Refresh table
          fetchUsersWithFilters(
            searchTerm,
            selectedRole,
            pagination.current,
            pagination.pageSize,
            loggedInUserId,
          );

          // Refresh KPI cards
          fetchCoordinatorCounts();

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
          fetchUsersWithFilters(
            searchTerm,
            selectedRole,
            pagination.current,
            pagination.pageSize,
            loggedInUserId,
          );

          fetchCoordinatorCounts();
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
