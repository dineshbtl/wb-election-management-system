"use client";

import React, { useEffect, useState } from "react";
import { Input, Select, Table, Skeleton } from "antd";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/page-title";
import { StatCard } from "@/components/ui/stat-card";
import { ModernCard } from "@/components/ui/modern-card";
import CreateCoordinatorModal from "@/components/coordinator/Createcoordinator";
import {
  Plus,
  Search,
  Users,
  MapPin,
  Layers,
  Vote,
  Eye,
  Pencil,
  FilterX,
} from "lucide-react";
import EditUserModal from "@/components/users/Editusermodal";
import ViewUserModal from "@/components/users/ViewUserModal";

const { Option } = Select;

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingTable, setLoadingTable] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [roles, setRoles] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [total, setTotal] = useState(0);
  const [loggedInUserId, setLoggedInUserId] = useState<number | null>(null);

  // KPI state: total users, assigned, not assigned + role-based
  const [totalUsers, setTotalUsers] = useState(0);
  const [assignedCount, setAssignedCount] = useState(0);
  const [notAssignedCount, setNotAssignedCount] = useState(0);
  const [districtCoordinators, setDistrictCoordinators] = useState(0);
  const [assemblyCoordinators, setAssemblyCoordinators] = useState(0);
  const [blockCoordinators, setBlockCoordinators] = useState(0);
  const [boothCoordinators, setBoothCoordinators] = useState(0);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [districtAssigned, setDistrictAssigned] = useState(0);
  const [assemblyAssigned, setAssemblyAssigned] = useState(0);
  const [blockAssigned, setBlockAssigned] = useState(0);
  const [boothAssigned, setBoothAssigned] = useState(0);

  const [viewOpen, setViewOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // List mode: "all" (paginated from API), "assigned" or "unassigned" (client-side filtered list)
  const [assignmentFilter, setAssignmentFilter] = useState<
    "all" | "assigned" | "unassigned"
  >("all");

  useEffect(() => {
    const initializeData = async () => {
      try {
        // Get logged-in user ID from localStorage
        const userData = localStorage.getItem("userData");
        if (userData) {
          const user = JSON.parse(userData);
          setLoggedInUserId(user.id);
        }

        // Fetch users on initial load
        setLoadingInitial(true);
        await fetchUsersWithFilters("", "all", 1, 10, null);
        setLoadingInitial(false);
      } catch (err) {
        console.error("Error initializing data:", err);
        setLoadingInitial(false);
      }
    };

    initializeData();
    fetchRoles();
    fetchCoordinatorCounts();
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

  // Get role name from user object (handles Strapi relation: role.name, role.attributes?.name, or role.data?.attributes?.name)
  const getRoleNameFromUser = (u: any): string => {
    const role = u.role;
    if (!role) return "";
    const name =
      role.name ?? role.attributes?.name ?? role.data?.attributes?.name ?? "";
    return String(name).trim().toLowerCase();
  };

  const isUserAssigned = (u: any): boolean => {
    const roleName = getRoleNameFromUser(u);

    const districts = u.districts?.data ?? u.districts ?? [];
    const assemblies = u.assemblies?.data ?? u.assemblies ?? [];
    const blocks = u.blocks?.data ?? u.blocks ?? [];
    const locations = u.locations?.data ?? u.locations ?? [];

    if (roleName === "district coordinator") {
      return Array.isArray(districts) && districts.length > 0;
    }

    if (roleName === "assembly coordinator") {
      return Array.isArray(assemblies) && assemblies.length > 0;
    }

    if (roleName === "block coordinator") {
      return Array.isArray(blocks) && blocks.length > 0;
    }

    if (roleName === "booth coordinator") {
      return Array.isArray(locations) && locations.length > 0;
    }

    // Other roles (superadmin etc.) → consider assigned
    return true;
  };

  // Fetch user counts for KPI cards: total, assigned, not assigned + role-based
  const fetchCoordinatorCounts = async () => {
    setKpiLoading(true);
    try {
      const res = await api.get(
        "/users?" +
          "populate[role]=true&" +
          "populate[districts]=true&" +
          "populate[assemblies]=true&" +
          "populate[blocks]=true&" +
          "populate[locations]=true&" +
          "pagination[pageSize]=1000",
      );

      let usersData: any[] = [];
      if (Array.isArray(res.data)) {
        usersData = res.data;
      } else if (res.data?.data && Array.isArray(res.data.data)) {
        usersData = res.data.data;
      }

      const total = usersData.length;
      const assigned = usersData.filter(isUserAssigned).length;
      const notAssigned = total - assigned;

      setTotalUsers(total);
      setAssignedCount(assigned);
      setNotAssignedCount(notAssigned);

      // Role-based total counts
      const districtUsers = usersData.filter(
        (u: any) => getRoleNameFromUser(u) === "district coordinator",
      );

      const assemblyUsers = usersData.filter(
        (u: any) => getRoleNameFromUser(u) === "assembly coordinator",
      );

      const blockUsers = usersData.filter(
        (u: any) => getRoleNameFromUser(u) === "block coordinator",
      );

      const boothUsers = usersData.filter(
        (u: any) => getRoleNameFromUser(u) === "booth coordinator",
      );

      // Total
      setDistrictCoordinators(districtUsers.length);
      setAssemblyCoordinators(assemblyUsers.length);
      setBlockCoordinators(blockUsers.length);
      setBoothCoordinators(boothUsers.length);

      // Assigned per role
      setDistrictAssigned(districtUsers.filter(isUserAssigned).length);
      setAssemblyAssigned(assemblyUsers.filter(isUserAssigned).length);
      setBlockAssigned(blockUsers.filter(isUserAssigned).length);
      setBoothAssigned(boothUsers.filter(isUserAssigned).length);
    } catch (err) {
      console.error("Error fetching user counts:", err);
    } finally {
      setKpiLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setAssignmentFilter("all");
    setSearchTerm(value);
    setPagination((p) => ({ ...p, current: 1 }));
    fetchUsersWithFilters(
      value,
      selectedRole,
      1,
      pagination.pageSize,
      loggedInUserId,
    );
  };

  const handleRoleFilter = (value: string) => {
    setAssignmentFilter("all");
    setSelectedRole(value);
    setPagination((p) => ({ ...p, current: 1 }));
    fetchUsersWithFilters(
      searchTerm,
      value,
      1,
      pagination.pageSize,
      loggedInUserId,
    );
  };

  const clearFilters = () => {
    setAssignmentFilter("all");
    setSearchTerm("");
    setSelectedRole("all");
    setPagination((p) => ({ ...p, current: 1 }));
    fetchUsersWithFilters("", "all", 1, pagination.pageSize, loggedInUserId);
  };

  const fetchAssignedOrUnassigned = async (
    filter: "assigned" | "unassigned",
  ) => {
    setLoadingTable(true);
    setAssignmentFilter(filter);

    try {
      let url =
        "/users?" +
        "populate[role]=true&" +
        "populate[districts]=true&" +
        "populate[assemblies]=true&" +
        "populate[blocks]=true&" +
        "populate[locations]=true&" +
        "pagination[pageSize]=1000";

      // ✅ ADD ROLE FILTER HERE
      if (selectedRole !== "all") {
        url += `&filters[role][id][$eq]=${Number(selectedRole)}`;
      }

      const res = await api.get(url);

      let usersData: any[] = [];
      if (Array.isArray(res.data)) usersData = res.data;
      else if (res.data?.data && Array.isArray(res.data.data))
        usersData = res.data.data;

      const filtered =
        filter === "assigned"
          ? usersData.filter(isUserAssigned)
          : usersData.filter((u: any) => !isUserAssigned(u));

      setUsers(filtered);
      setTotal(filtered.length);
      setPagination((p) => ({ ...p, current: 1 }));
    } catch (err) {
      console.error("Error fetching assigned/unassigned users:", err);
      setUsers([]);
      setTotal(0);
    } finally {
      setLoadingTable(false);
    }
  };

  const hasActiveFilters =
    searchTerm !== "" || selectedRole !== "all" || assignmentFilter !== "all";

  const getRoleIdByName = (roleName: string): string | null => {
    const role = roles.find(
      (r) => r.name?.toLowerCase() === roleName.toLowerCase(),
    );
    return role ? role.id.toString() : null;
  };

  const getAssignedArea = (record: any) => {
    const role = record.role?.name?.toLowerCase();

    // DISTRICT COORDINATOR
    if (role === "district coordinator") {
      if (!record.districts?.length) return "—";
      return record.districts.map((d: any) => d.district_name).join(", ");
    }

    // ASSEMBLY COORDINATOR
    if (role === "assembly coordinator") {
      if (!record.assemblies?.length) return "—";
      return record.assemblies
        .map((a: any) => a.Assembly_Name || a.name)
        .join(", ");
    }

    // BLOCK COORDINATOR
    if (role === "block coordinator") {
      if (!record.blocks?.length) return "—";
      return record.blocks.map((b: any) => b.Block_Name || b.name).join(", ");
    }

    // BOOTH COORDINATOR
    if (role === "booth coordinator") {
      if (!record.locations?.length) return "—";
      return record.locations.map((l: any) => l.PS_Name || l.name).join(", ");
    }

    return "—";
  };

  // Fetch users with explicit filter parameters
  const fetchUsersWithFilters = async (
    search: string,
    role: string,
    page = 1,
    pageSize = 10,
    userId: number | null = null,
  ): Promise<void> => {
    setLoadingTable(true);
    try {
      // Nested populate to get profile with createdby user details
      // let url = `/users?populate[role]=*&populate[profile][populate][createdby]=*&populate[districts]=*&populate[assemblies][populate][district]=*&populate[blocks][populate][assembly][populate][district]=*&populate[locations][populate][assembly][populate][district]=*&pagination[page]=${page}&pagination[pageSize]=${pageSize}`;

      // let url = `/users?populate=*&pagination[page]=${page}&pagination[pageSize]=${pageSize}`;

      let url =
        `/users?` +
        `populate[role]=*&` +
        `populate[profile][populate][createdby]=*&` +
        `populate[districts]=*&` +
        `populate[assemblies][populate][district]=*&` +
        `populate[blocks]=*&` +
        `populate[locations][populate][assembly][populate][district]=*&` +
        `pagination[page]=${page}&pagination[pageSize]=${pageSize}`;

      if (search && search.trim()) {
        url += `&filters[email][$contains]=${encodeURIComponent(search.trim())}`;
      }

      if (role !== "all") {
        url += `&filters[role][id][$eq]=${Number(role)}`;
      }

      if (role === "all" && !(search && search.trim())) {
        url += `&sort[0]=createdAt:desc`;
      }

      console.log("Fetching users with URL:", url);
      const res = await api.get(url);
      console.log("Raw API response:", res.data);

      // Handle different response structures
      let usersData: any[] = [];
      let totalCount = 0;

      if (Array.isArray(res.data)) {
        // Response is direct array
        usersData = res.data;
        totalCount = res.data.length;
      } else if (res.data.data && Array.isArray(res.data.data)) {
        // Response has data property
        usersData = res.data.data;
        totalCount = res.data.meta?.pagination?.total || res.data.data.length;
      }

      console.log("Processed users data:", usersData, "Total:", totalCount);

      setUsers(usersData);

      console.log("Setting total count to:", usersData);
      setTotal(totalCount);
      setPagination({ current: page, pageSize });
    } catch (err) {
      console.error("Error fetching users:", err);
      setUsers([]);
      setTotal(0);
    } finally {
      setLoadingTable(false);
    }
  };

  // Get role name by ID
  const getRoleName = (roleId: number) => {
    const role = roles.find((r) => r.id === roleId);
    return role?.name || "N/A";
  };

  // Get role color and pill class
  const getRoleColor = (roleName: string) => {
    const colorMap: Record<string, string> = {
      superadmin: "red",
      "district coordinator": "orange",
      "assembly coordinator": "blue",
      "block coordinator": "green",
      "booth coordinator": "purple",
      authenticated: "default",
    };
    return colorMap[roleName?.toLowerCase()] || "default";
  };

  const roleTagClass: Record<string, string> = {
    red: "bg-red-100 text-red-800 border-red-200",
    orange: "bg-amber-50 text-amber-800 border-amber-200",
    blue: "bg-blue-50 text-blue-800 border-blue-200",
    green: "bg-emerald-50 text-emerald-800 border-emerald-200",
    purple: "bg-violet-50 text-violet-800 border-violet-200",
    default: "bg-gray-100 text-gray-700 border-gray-200",
  };

  const handleTableChange = (newPagination: any) => {
    if (assignmentFilter !== "all") {
      setPagination({
        current: newPagination.current,
        pageSize: newPagination.pageSize || pagination.pageSize,
      });
      return;
    }
    fetchUsersWithFilters(
      searchTerm,
      selectedRole,
      newPagination.current,
      newPagination.pageSize,
      loggedInUserId,
    );
  };

  // Table columns: Fullname, email, Phone, Role, Status, Actions (capitalize except email lowercase)
  const columns = [
    {
      title: "Fullname",
      key: "fullName",
      width: 180,
      render: (_: any, record: any) => (
        <span className="font-medium text-[#333333]">
          {record.profile?.Full_Name || record.username || "—"}
        </span>
      ),
    },
    {
      title: "email",
      key: "email",
      width: 200,
      render: (_: any, record: any) => (
        <span className="text-sm text-[#666666]">{(record.email || "").toLowerCase() || "—"}</span>
      ),
    },
    {
      title: "Phone",
      key: "phone",
      width: 130,
      render: (_: any, record: any) => record.profile?.Phone_Number || "—",
    },
    {
      title: "Role",
      key: "role",
      width: 150,
      render: (_: any, record: any) => {
        const roleName = record.role?.name || "N/A";
        const color = getRoleColor(roleName);
        const tagCls =
          color === "red"
            ? "bg-red-100 text-red-800 border-red-200"
            : color === "orange"
              ? "bg-amber-50 text-amber-800 border-amber-200"
              : color === "blue"
                ? "bg-blue-50 text-blue-800 border-blue-200"
                : color === "green"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : color === "purple"
                    ? "bg-violet-50 text-violet-800 border-violet-200"
                    : "bg-gray-100 text-gray-700 border-gray-200";
        return (
          <span
            className={
              "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium " +
              tagCls
            }
          >
            {roleName}
          </span>
        );
      },
    },
    {
      title: "Status",
      key: "confirmed",
      width: 110,
      render: (_: any, record: any) => (
        <span
          className={
            record.confirmed
              ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800"
              : "inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800"
          }
        >
          {record.confirmed ? "Confirmed" : "Pending"}
        </span>
      ),
    },
    {
      title: "Assignment",
      key: "assignment",
      width: 140,
      render: (_: any, record: any) => {
        const assigned = isUserAssigned(record);

        return (
          <span
            className={
              assigned
                ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800"
                : "inline-flex rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700"
            }
          >
            {assigned ? "Assigned" : "Unassigned"}
          </span>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      fixed: "right" as const,
      render: (_: any, record: any) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-[#666666] hover:text-[#2196F3]"
            onClick={() => {
              setSelectedUser(record);
              setViewOpen(true);
            }}
            title="View"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-[#666666] hover:text-[#2196F3]"
            onClick={() => {
              setEditUserId(record.documentId);
              setIsEditOpen(true);
            }}
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const getCurrentRoleStats = () => {
    const roleName = roles
      .find((r) => r.id.toString() === selectedRole)
      ?.name?.toLowerCase();

    if (!roleName || selectedRole === "all") {
      return {
        total: totalUsers,
        assigned: assignedCount,
      };
    }

    if (roleName === "district coordinator") {
      return { total: districtCoordinators, assigned: districtAssigned };
    }

    if (roleName === "assembly coordinator") {
      return { total: assemblyCoordinators, assigned: assemblyAssigned };
    }

    if (roleName === "block coordinator") {
      return { total: blockCoordinators, assigned: blockAssigned };
    }

    if (roleName === "booth coordinator") {
      return { total: boothCoordinators, assigned: boothAssigned };
    }

    return { total: totalUsers, assigned: assignedCount };
  };

  const { total: currentTotal, assigned: currentAssigned } =
    getCurrentRoleStats();

  return (
    <div className="space-y-6 max-w-full min-w-0">
      <PageTitle
        title="User management"
        subtitle="Manage coordinators and team members across districts and assemblies"
      >
        <Button
          variant="gradient"
          className="rounded-xl px-5 py-2.5 font-medium shadow-sm"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add user
        </Button>
      </PageTitle>

      {/* KPI cards: total / assigned / not assigned + role-based */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiLoading ? (
          [...Array(7)].map((_, i) => (
            <ModernCard key={i} padding="lg" hover={false}>
              <Skeleton active paragraph={{ rows: 2 }} />
            </ModernCard>
          ))
        ) : (
          <>
            <StatCard
              title="Total users"
              value={totalUsers}
              label="Registered"
              color="blue"
              icon={<Users className="h-5 w-5" />}
              onClick={() => {
                clearFilters();
              }}
              className="cursor-pointer hover:opacity-90 transition-opacity"
            />
            <StatCard
              title="Assigned"
              value={assignedCount}
              label="Members with role"
              color="green"
              icon={<MapPin className="h-5 w-5" />}
              onClick={() => fetchAssignedOrUnassigned("assigned")}
              className="cursor-pointer hover:opacity-90 transition-opacity"
            />
            <StatCard
              title="Not assigned"
              value={notAssignedCount}
              label="Available to assign"
              color="amber"
              icon={<Layers className="h-5 w-5" />}
              onClick={() => fetchAssignedOrUnassigned("unassigned")}
              className="cursor-pointer hover:opacity-90 transition-opacity"
            />
            <StatCard
              title="District coordinators"
              value={`${districtAssigned} / ${districtCoordinators}`}
              label="Assigned / Total"
              color="orange"
              icon={<MapPin className="h-5 w-5" />}
              onClick={() => {
                const id = getRoleIdByName("District Coordinator");
                if (id) {
                  setAssignmentFilter("all"); // reset assignment filter
                  handleRoleFilter(id);
                }
              }}
              className="cursor-pointer hover:opacity-90 transition-opacity"
            />
            <StatCard
              title="Assembly coordinators"
              value={`${assemblyAssigned} / ${assemblyCoordinators}`}
              color="blue"
              icon={<Layers className="h-5 w-5" />}
              onClick={() => {
                const id = getRoleIdByName("Assembly Coordinator");
                if (id) handleRoleFilter(id);
              }}
              className="cursor-pointer hover:opacity-90 transition-opacity"
            />
            <StatCard
              title="Block coordinators"
              value={`${blockAssigned} / ${blockCoordinators}`}
              color="green"
              icon={<Users className="h-5 w-5" />}
              onClick={() => {
                const id = getRoleIdByName("Block Coordinator");
                if (id) handleRoleFilter(id);
              }}
              className="cursor-pointer hover:opacity-90 transition-opacity"
            />
            <StatCard
              title="Booth coordinators"
              value={`${boothAssigned} / ${boothCoordinators}`}
              color="purple"
              icon={<Vote className="h-5 w-5" />}
              onClick={() => {
                const id = getRoleIdByName("Booth Coordinator");
                if (id) handleRoleFilter(id);
              }}
              className="cursor-pointer hover:opacity-90 transition-opacity"
            />
          </>
        )}
      </div>

      {/* Filters and table */}
      <ModernCard padding="lg" className="overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999999]" />
            <Input
              placeholder="Search by email or username..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              allowClear
              className="pl-9 h-10 rounded-xl border-[#E0E0E0] focus:border-[#2196F3]"
            />
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant={assignmentFilter === "all" ? "default" : "outline"}
              onClick={() => {
                setAssignmentFilter("all");
                fetchUsersWithFilters(
                  searchTerm,
                  selectedRole,
                  1,
                  pagination.pageSize,
                  loggedInUserId,
                );
              }}
            >
              All ({currentTotal})
            </Button>

            <Button
              size="sm"
              variant={assignmentFilter === "assigned" ? "default" : "outline"}
              onClick={() => fetchAssignedOrUnassigned("assigned")}
            >
              Assigned ({currentAssigned})
            </Button>

            <Button
              size="sm"
              variant={
                assignmentFilter === "unassigned" ? "default" : "outline"
              }
              onClick={() => fetchAssignedOrUnassigned("unassigned")}
            >
              Unassigned ({currentTotal - currentAssigned}){" "}
            </Button>
          </div>
          <Select
            placeholder="Filter by role"
            value={selectedRole === "all" ? undefined : selectedRole}
            onChange={handleRoleFilter}
            className="w-full sm:w-48"
            style={{ height: 40, borderRadius: 12 }}
            allowClear
            onClear={() => handleRoleFilter("all")}
          >
            {roles
              .filter(
                (role: any) =>
                  ![
                    "authenticated",
                    "public",
                    "Authenticated",
                    "Public",
                  ].includes(role.name),
              )
              .map((role: any) => (
                <Option key={role.id} value={role.id.toString()}>
                  {role.name}
                </Option>
              ))}
          </Select>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="text-[#666666] hover:text-[#2196F3]"
              onClick={clearFilters}
            >
              <FilterX className="h-4 w-4 mr-1" />
              Clear filters
            </Button>
          )}
        </div>

        {loadingInitial ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton
                key={i}
                active
                paragraph={{ rows: 0 }}
                className="h-14 rounded-xl"
              />
            ))}
          </div>
        ) : users.length === 0 && !loadingTable ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-[#F0F0F0] p-4 mb-4">
              <Users className="h-10 w-10 text-[#999999]" />
            </div>
            <h3 className="text-lg font-semibold text-[#333333] mb-1">
              No users yet
            </h3>
            <p className="text-sm text-[#666666] max-w-sm mb-6">
              Add your first user to start managing coordinators and team
              members.
            </p>
            <Button
              variant="gradient"
              className="rounded-xl"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add user
            </Button>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={
              assignmentFilter === "all"
                ? users
                : users.slice(
                    (pagination.current - 1) * pagination.pageSize,
                    pagination.current * pagination.pageSize,
                  )
            }
            rowKey={(record) => record.id}
            loading={loadingTable}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: total,
              showSizeChanger: true,
              showQuickJumper: assignmentFilter === "all",
              showTotal: (t) => (
                <span className="text-sm text-[#666666]">
                  {t} user{t !== 1 ? "s" : ""} total
                </span>
              ),
              pageSizeOptions: ["10", "20", "50"],
            }}
            onChange={handleTableChange}
            scroll={{ x: 900 }}
          />
        )}
      </ModernCard>

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

      <ViewUserModal
        open={viewOpen}
        user={selectedUser}
        onClose={() => {
          setViewOpen(false);
          setSelectedUser(null);
        }}
      />

      <EditUserModal
        open={isEditOpen}
        userDocumentId={editUserId}
        onClose={() => setIsEditOpen(false)}
        onUpdated={() => {
          fetchUsersWithFilters(
            searchTerm,
            selectedRole,
            pagination.current,
            pagination.pageSize,
            loggedInUserId,
          );
          setIsEditOpen(false);
        }}
      />
    </div>
  );
}
