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
  Skeleton,
} from "antd";
import { EyeOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

const { Option } = Select;

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [roles, setRoles] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [total, setTotal] = useState(0);
  const router = useRouter();

  const [loggedInUserId, setLoggedInUserId] = useState<number | null>(null);

  useEffect(() => {
    const initializeData = async () => {
      setLoadingInitial(true);
      try {
        const [meRes, rolesRes] = await Promise.all([
          api.get("/users/me"),
          api.get("/users-permissions/roles"),
        ]);
        setLoggedInUserId(meRes.data.documentId);
        setRoles(rolesRes.data.roles || []);
      } catch (err) {
        console.error("Error initializing data:", err);
      } finally {
        setLoadingInitial(false);
      }
    };
    initializeData();
  }, []);

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
      let url = `/app-users?populate[createdby]=true&populate[Photo]=true&populate[verified_certificate]=true&pagination[page]=${page}&pagination[pageSize]=${pageSize}`;

      // ✅ FIXED FILTER
      url += `&filters[createdby][documentId][$eq]=${userId}`;

      if (search.trim()) {
        url += `&filters[email][$contains]=${encodeURIComponent(search.trim())}`;
      }

      if (role !== "all") {
        url += `&filters[role][id][$eq]=${Number(role)}`;
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
      width: 150,
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
        </Space>
      ),
    },
  ];

  // View user details
  const handleViewUser = (record: any) => {
    const baseurl = process.env.NEXT_PUBLIC_BACKEND_URL;

    Modal.info({
      title: "User Details",
      width: 900,
      content: (
        <div className="space-y-6">
          {/* Profile Photo */}
          {record.Photo && record.Photo.length > 0 && (
            <div>
              <p className="text-gray-600 text-sm font-semibold mb-2">
                Profile Photo
              </p>
              <div className="flex gap-3 flex-wrap">
                {record.Photo.map((photo: any, idx: number) => (
                  <div
                    key={idx}
                    className="border rounded-lg overflow-hidden shadow-sm"
                  >
                    <img
                      src={`${baseurl}${photo.url}`}
                      alt={`Profile ${idx + 1}`}
                      className="w-32 h-32 object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verified Certificate */}
          {record.verified_certificate &&
            record.verified_certificate.length > 0 && (
              <div>
                <p className="text-gray-600 text-sm font-semibold mb-2">
                  Verified Certificate
                </p>
                <div className="flex gap-3 flex-wrap">
                  {record.verified_certificate.map((cert: any, idx: number) => (
                    <div
                      key={idx}
                      className="border rounded-lg overflow-hidden shadow-sm bg-blue-50"
                    >
                      <img
                        src={`${baseurl}${cert.url}`}
                        alt={`Certificate ${idx + 1}`}
                        className="w-40 h-auto object-cover"
                      />
                      <p className="text-xs text-gray-600 p-2 text-center">
                        {cert.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* User Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600 text-sm">Email</p>
              <p className="font-semibold">{(record.email || "").toLowerCase()}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Full Name</p>
              <p className="font-semibold">{record.Full_Name || "—"}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Phone</p>
              <p className="font-semibold">{record.Phone_Number || "—"}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Aadhar</p>
              <p className="font-semibold">{record.Aadhar || "—"}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">State</p>
              <p className="font-semibold">{record.State || "—"}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">District</p>
              <p className="font-semibold">{record.District || "—"}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Assembly</p>
              <p className="font-semibold">{record.Assembly || "—"}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Village</p>
              <p className="font-semibold">{record.Village || "—"}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Pincode</p>
              <p className="font-semibold">{record.Pincode || "—"}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Status</p>
              <Tag color={record.status === "active" ? "green" : "orange"}>
                {record.status || "—"}
              </Tag>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Created By</p>
              <p className="font-semibold">
                {record.createdby?.username || "—"}
              </p>
            </div>
          </div>
        </div>
      ),
      okText: "Close",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Users Management</h1>
          <Button
            type="primary"
            size="large"
            onClick={() => router.push("/district/assembly-coordinators/add")}
            className="bg-blue-500 hover:bg-blue-600"
          >
            + Add New User
          </Button>
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
        {loadingInitial ? (
          <div className="space-y-4">
            <Skeleton active paragraph={{ rows: 5 }} />
          </div>
        ) : loading ? (
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
            loading={true}
          />
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
    </div>
  );
}
