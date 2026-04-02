"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageTitle } from "@/components/ui/page-title";
import { EmptyState } from "@/components/ui/empty-state";
import { Spin, Select, message, Modal, Skeleton } from "antd";
import { useRouter } from "next/navigation";
import bpi from "@/lib/api";
import { Eye, Search, UserPlus, Plus, MapPin, Users, User } from "lucide-react";
import Link from "next/link";
import AddDistrictModal from "@/components/locations/AddDistrictModal";
import AddHierarchyModal from "@/components/locations/AddHierarchyModal";

const { Option } = Select;

export default function DistrictsPage() {
  const [districts, setDistricts] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]); // All eligible district coordinators
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingTable, setLoadingTable] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const router = useRouter();

  // Modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newDistrictName, setNewDistrictName] = useState("");
  const [newStateName, setNewStateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [addDistrictOpen, setAddDistrictOpen] = useState(false);
  const [smartModalOpen, setSmartModalOpen] = useState(false);

  // 🔹 Fetch districts and users
  const fetchData = async () => {
    try {
      setLoadingTable(true);
      // const [districtRes, userRes] = await Promise.all([
      //   bpi.get(
      //     "/districts?populate[district_coordinator][populate][profile]=true",
      //   ),
      //   bpi.get(
      //     "/users?filters[role][name][$eq]=District Coordinator&populate[profile]=true",
      //   ),
      // ]);

      const [districtRes, userRes] = await Promise.all([
        bpi.get(
          "/districts?populate[district_coordinator][populate][profile]=true&sort=updatedAt:desc",
        ),
        bpi.get(
          "/users?filters[role][name][$eq]=District Coordinator&populate[profile]=true&sort=updatedAt:desc",
        ),
      ]);

      // Normalize districts to a flat shape: ensure district_coordinator is an object with id, email, profile
      const rawDistricts = districtRes.data.data || [];
      const normalizedDistricts = rawDistricts.map((d: any) => {
        const attrs = d?.attributes ?? d;
        const rawCoord =
          attrs?.district_coordinator?.data ??
          attrs?.district_coordinator ??
          null;
        const coordAttrs = rawCoord?.attributes ?? rawCoord ?? null;
        const coordProfile =
          coordAttrs?.profile?.data?.attributes ??
          coordAttrs?.profile ??
          coordAttrs?.profile?.attributes ??
          null;
        const coordinator = rawCoord
          ? {
              id: rawCoord.id ?? coordAttrs?.id,
              documentId: coordAttrs?.documentId ?? rawCoord?.documentId,
              email: coordAttrs?.email ?? rawCoord?.email,
              username: coordAttrs?.username ?? rawCoord?.username,
              profile: coordProfile ?? null,
              ...coordAttrs,
            }
          : null;

        return {
          id: d.id ?? attrs.id,
          documentId: attrs.documentId ?? attrs.document_id ?? attrs.documentId,
          district_name:
            attrs.district_name ?? attrs.name ?? attrs.district_name,
          state: attrs.state ?? attrs.State,
          district_coordinator: coordinator,
          ...attrs,
        };
      });

      // Normalize users to a flat shape: ensure profile is at .profile
      // Normalize users to a flat shape: ensure profile is at .profile
      const rawUsers = Array.isArray(userRes.data)
        ? userRes.data
        : userRes.data?.data || [];

      const normalizedUsers = rawUsers.map((u: any) => {
        const attrs = u?.attributes ?? u;

        const profile =
          attrs?.profile?.data?.attributes ??
          attrs?.profile ??
          attrs?.profile?.attributes ??
          null;

        return {
          id: u.id ?? attrs?.id,
          username: attrs?.username,
          email: attrs?.email,
          profile,
        };
      });

      setAllUsers(normalizedUsers);

      setDistricts(normalizedDistricts);
    } catch (err) {
      console.error("Error fetching data:", err);
      message.error("Failed to load data");
    } finally {
      setLoadingTable(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoadingInitial(true);
      await fetchData();
      setLoadingInitial(false);
    };
    loadData();
  }, []);

  // 🔹 Filter districts based on search
  const filteredDistricts = districts.filter((d) =>
    d.district_name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // 🔹 Get available users for a given district (exclude already assigned to any district)
  // const getAvailableUsers = (currentCoordinatorId: number | null) => {
  //   return allUsers.filter((u) => {
  //     const assignedDistricts = u.districts || [];

  //     // user not assigned anywhere → allow
  //     if (assignedDistricts.length === 0) return true;

  //     // user is already assigned to THIS district → allow (edit case)
  //     if (currentCoordinatorId && u.id === currentCoordinatorId) {
  //       return true;
  //     }

  //     // otherwise user is assigned somewhere else → block
  //     return false;
  //   });
  // };

  const getAvailableUsers = () => {
    return allUsers;
  };

  // 🔹 Assign or Change Coordinator
  const handleAssignCoordinator = async () => {
    if (!selectedDistrict || selectedUser === null) {
      message.warning("Please select a coordinator");
      return;
    }

    try {
      await bpi.put(`/districts/${selectedDistrict.documentId}`, {
        data: {
          district_coordinator: selectedUser,
        },
      });

      message.success("Coordinator assigned successfully");
      setAssignModalOpen(false);
      setSelectedDistrict(null);
      setSelectedUser(null);
      fetchData(); // refresh
    } catch (err) {
      console.error(err);
      message.error("Failed to assign coordinator");
    }
  };

  // 🔹 Remove Coordinator
  const handleRemoveCoordinator = async (districtId: string) => {
    try {
      await bpi.put(`/districts/${districtId}`, {
        data: {
          district_coordinator: null,
        },
      });
      message.success("Coordinator removed");
      fetchData();
    } catch (err) {
      console.error(err);
      message.error("Failed to remove coordinator");
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spin size="large" />
      </div>
    );
  }

  const withCoordinator = filteredDistricts.filter((d) => d.district_coordinator?.profile?.Full_Name).length;
  const withoutCoordinator = filteredDistricts.length - withCoordinator;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full min-w-0">
      <PageTitle
        title="Districts"
        subtitle="Manage districts and assign coordinators"
      >
        <Button
          variant="gradient"
          className="rounded-xl px-5 py-2.5 font-medium"
          onClick={() => setSmartModalOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add District
        </Button>
      </PageTitle>

      {/* KPI cards - same style as Survey page */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm relative border border-gray-100">
          <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-[#2196F3] flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{filteredDistricts.length}</p>
          <p className="text-xs text-gray-500 mt-1">Districts</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm relative border border-gray-100">
          <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-[#4CAF50] flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm text-gray-500">With Coordinator</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{withCoordinator}</p>
          <p className="text-xs text-gray-500 mt-1">Assigned</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm relative border border-gray-100">
          <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-[#FFC107] flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm text-gray-500">Without Coordinator</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{withoutCoordinator}</p>
          <p className="text-xs text-gray-500 mt-1">Unassigned</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm relative border border-gray-100">
          <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-[#7B61FF] flex items-center justify-center">
            <Eye className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm text-gray-500">All</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{districts.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total in system</p>
        </div>
      </div>

      {/* Toolbar - same style as Survey page */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
        <div className="relative flex-grow min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search districts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl border-gray-200 h-10"
          />
        </div>
      </div>

      {/* List - same card and table style as Survey page */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[320px]">
        <div className="overflow-x-auto w-full">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600 tracking-wider" style={{ width: "8%" }}>#</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600 tracking-wider" style={{ width: "24%" }}>District Name</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600 tracking-wider" style={{ width: "14%" }}>State</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600 tracking-wider" style={{ width: "34%" }}>Coordinator</th>
                <th className="px-3 py-3.5 text-left w-14">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loadingTable ? (
                [...Array(5)].map((_, i) => (
                  <tr key={`skeleton-${i}`} className="border-b border-gray-100">
                    <td className="px-3 py-3"><Skeleton className="h-5 w-8 rounded" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-5 w-32" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-5 w-20" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-5 w-40" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-8 w-24 rounded-lg" /></td>
                  </tr>
                ))
              ) : filteredDistricts.length === 0 ? null : (
                filteredDistricts.map((d, index) => (
                  <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 py-3 text-sm text-gray-700">{index + 1}</td>
                    <td className="px-3 py-3">
                      <Link href={`/districts/${d.documentId}`} className="font-medium text-gray-900 hover:underline">
                        {d.district_name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700">{d.state || "—"}</td>
                    <td className="px-3 py-3 text-sm">
                      {d.district_coordinator?.profile?.Full_Name ? (
                        <div className="space-y-0.5">
                          <div className="font-medium text-gray-900">{d.district_coordinator.profile.Full_Name}</div>
                          <div className="text-gray-600">{(d.district_coordinator.email || "").toLowerCase()}</div>
                          {(d.district_coordinator.profile.Phone_Number) && (
                            <div className="text-gray-500 text-xs">{d.district_coordinator.profile.Phone_Number}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Not assigned</span>
                      )}
                    </td>
                    <td className="px-3 py-3 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedDistrict(d);
                          setSelectedUser(d.district_coordinator?.id || null);
                          setAssignModalOpen(true);
                        }}
                        className="rounded-lg gap-1"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        {d.district_coordinator ? "Change" : "Assign"}
                      </Button>
                      <Link href={`/districts/${d.documentId}`}>
                        <Button variant="outline" size="sm" className="rounded-lg gap-1">
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loadingTable && filteredDistricts.length === 0 && (
          <EmptyState
            icon={MapPin}
            title="No districts found"
            description="Try adjusting your search or add a new district."
            action={searchTerm ? { label: "Clear search", onClick: () => setSearchTerm("") } : { label: "Add District", onClick: () => setSmartModalOpen(true) }}
          />
        )}
      </div>

      {/* Assign Coordinator Modal */}
      <Modal
        title={
          <span>
            {selectedDistrict?.district_coordinator
              ? "Change Coordinator"
              : "Assign Coordinator"}{" "}
            — {selectedDistrict?.district_name}
          </span>
        }
        open={assignModalOpen}
        onCancel={() => {
          setAssignModalOpen(false);
          setSelectedDistrict(null);
          setSelectedUser(null);
        }}
        onOk={handleAssignCoordinator}
        okText={selectedDistrict?.district_coordinator ? "Update" : "Assign"}
        cancelText="Cancel"
        okButtonProps={{ disabled: selectedUser === null }}
      >
        <Select
          className="h-12"
          style={{ width: "100%" }}
          placeholder="Select a District Coordinator"
          value={selectedUser}
          onChange={(val) => setSelectedUser(val)}
          showSearch
          allowClear
          filterOption={(input, option) => {
            const user = allUsers.find((u) => u.id === option?.value);
            if (!user) return false;

            const name = user.profile?.Full_Name || user.username || "";
            const email = user.email || "";

            return (
              name.toLowerCase().includes(input.toLowerCase()) ||
              email.toLowerCase().includes(input.toLowerCase())
            );
          }}
        >
          {getAvailableUsers().map((u) => (
            <Option key={u.id} value={u.id}>
              <div className="flex flex-col">
                <span className="font-medium">
                  {u.profile?.Full_Name || u.username}
                </span>
                <span className="text-xs text-gray-500">{(u.email || "").toLowerCase()}</span>
              </div>
            </Option>
          ))}
        </Select>
        {selectedDistrict?.district_coordinator && (
          <p className="mt-2 text-sm text-gray-500">
            Current coordinator will be replaced.
          </p>
        )}
      </Modal>

      <AddDistrictModal
        open={addDistrictOpen}
        onClose={() => setAddDistrictOpen(false)}
        onSuccess={() => {
          fetchData(); // 🔥 Refresh district table automatically
        }}
      />

      <AddHierarchyModal
        open={smartModalOpen}
        onClose={() => setSmartModalOpen(false)}
        onSuccess={() => fetchData()}
      />
    </div>
  );
}
