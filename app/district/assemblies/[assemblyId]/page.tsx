"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Spin, message, Select, Input, Pagination, Skeleton } from "antd";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import bpi from "@/lib/bpi";
import Link from "next/link";
import { displayEmail } from "@/lib/utils";

export default function AssemblyDetailsPage() {
  const { assemblyId } = useParams<{ assemblyId: string }>();
  const router = useRouter();

  // 🔹 States
  const [user, setUser] = useState<any>(null);
  const [assembly, setAssembly] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [selectedCoordinators, setSelectedCoordinators] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [editingCoordinators, setEditingCoordinators] = useState(false);
  const [searchPSNo, setSearchPSNo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [raisedCount, setRaisedCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  // ⚡ Filtered & paginated locations
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) =>
      searchPSNo ? loc.PS_No?.toString() === searchPSNo : true,
    );
  }, [locations, searchPSNo]);

  const paginatedLocations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLocations.slice(start, start + pageSize);
  }, [filteredLocations, currentPage, pageSize]);

  // ✅ Fetch logged-in user — LIVE ONLY (no localStorage)
  const fetchUser = async () => {
    try {
      const res = await api.get("/users/me");
      setUser(res.data);
      return res.data;
    } catch (err) {
      console.error("Error fetching user:", err);
      return null;
    }
  };

  const fetchSurveyStats = async () => {
    try {
      // Raised
      const raisedRes = await api.get("/surveys", {
        params: {
          "filters[booth][assembly][documentId][$eq]": assemblyId,
          "filters[state][$eq]": "Raised",
          "pagination[pageSize]": 1,
        },
      });

      // Completed
      const completedRes = await api.get("/surveys", {
        params: {
          "filters[booth][assembly][documentId][$eq]": assemblyId,
          "filters[state][$eq]": "Completed",
          "pagination[pageSize]": 1,
        },
      });

      setRaisedCount(raisedRes.data.meta.pagination.total || 0);
      setCompletedCount(completedRes.data.meta.pagination.total || 0);
    } catch (err) {
      console.error("Error fetching survey stats:", err);
    }
  };

  // ✅ Fetch assembly with locations and coordinator
  const fetchAssemblyDetails = async () => {
    try {
      const res = await api.get(
        `/assemblies/${assemblyId}?populate[0]=locations.survey&populate[1]=assembly_coordinator&populate[2]=assembly_coordinator.profile`,
      );
      const data = res.data.data;

      if (!data) {
        message.error("Assembly not found");
        router.back();
        return;
      }

      setAssembly(data);
      setLocations(data.locations || []);
      const coordinatorId = data.assembly_coordinator?.documentId || null;
      setSelectedCoordinators(coordinatorId);
      setEditingCoordinators(false);
    } catch (err) {
      console.error("Failed to fetch assembly details:", err);
      message.error("Failed to load assembly details.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch coordinators (users with assembly_coordinator role)
  const fetchCoordinators = async (userDocId: string) => {
    try {
      const url = `/users?populate[0]=profile&populate[1]=role&pagination[pageSize]=100`;
      const res = await api.get(url);

      // Filter client-side for assembly_coordinator role
      const coordinatorsList = (res.data || [])
        .filter((user: any) => user.role?.type === "assembly_coordinator")
        .map((user: any) => ({
          id: user.profile?.id,
          documentId: user.documentId,
          email: user.email,
          Full_Name: user.profile?.Full_Name,
          Phone_Number: user.profile?.Phone_Number,
          username: user.username,
        }));

      setCoordinators(coordinatorsList || []);
    } catch (err) {
      console.error("Error fetching coordinators:", err);
      message.error("Failed to fetch coordinators.");
    }
  };

  // ✅ Assign coordinator
  const handleAssignCoordinators = async (selectedAppUserId: string) => {
    try {
      const selectedAppUser = coordinators.find(
        (c: any) =>
          c.documentId === selectedAppUserId || c.id === selectedAppUserId,
      );

      if (!selectedAppUser) {
        message.error("Selected coordinator not found");
        return;
      }

      // Use documentId directly since we're fetching from users table
      const userDocId = selectedAppUser.documentId;

      // Update assembly with coordinator
      const res = await api.put(`/assemblies/${assemblyId}`, {
        data: {
          assembly_coordinator: userDocId,
        },
      });

      console.log("Coordinator assigned response:", res.data);

      message.success("Coordinator updated successfully!");
      setEditingCoordinators(false);
      fetchAssemblyDetails(); // refresh to show updated coordinator details
    } catch (err) {
      console.error("Error assigning coordinator:", err);
      message.error("Failed to update coordinator.");
    }
  };

  // ✅ Initial load: fetch user → assembly → coordinators (LIVE ONLY)
  useEffect(() => {
    const loadData = async () => {
      setLoadingInitial(true);

      // 1. Fetch user
      const userData = await fetchUser();
      if (!userData?.documentId) {
        setLoadingInitial(false);
        return;
      }

      // 2. Fetch assembly
      await fetchAssemblyDetails();

      // 3. Fetch coordinators
      await fetchCoordinators(userData.documentId);

      await fetchAssemblyDetails();
      await fetchSurveyStats();
      await fetchCoordinators(userData.documentId);

      setLoadingInitial(false);
    };

    if (assemblyId) {
      loadData();
    }
  }, [assemblyId]);

  // ✅ Loading state
  if (loadingInitial) {
    return (
      <div className="bg-gray-50 min-h-screen p-6">
        <div className=" mx-auto bg-white shadow-md rounded-2xl p-8">
          <Skeleton active paragraph={{ rows: 1 }} className="mb-6" />
          <Skeleton active paragraph={{ rows: 2 }} className="mb-6" />
          <Skeleton active paragraph={{ rows: 1 }} className="mb-4" />
          <div className="overflow-x-auto border rounded-lg">
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} active paragraph={{ rows: 1 }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Main Render
  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className=" mx-auto bg-white shadow-md rounded-2xl p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            Locations under{" "}
            <span className="text-blue-600">
              {assembly?.Assembly_Name || "—"}
            </span>
          </h2>
          <Button
            className="bg-gray-200 hover:bg-gray-300 text-gray-800"
            onClick={() => router.back()}
          >
            ← Back
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 shadow-sm">
            <div className="text-3xl font-bold text-blue-600">
              {locations.length}
            </div>
            <div className="text-gray-700 font-medium">Total Locations</div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 shadow-sm">
            <div className="text-3xl font-bold text-orange-600">
              {raisedCount}
            </div>
            <div className="text-gray-700 font-medium">Raised Surveys</div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-6 shadow-sm">
            <div className="text-3xl font-bold text-green-600">
              {completedCount}
            </div>
            <div className="text-gray-700 font-medium">Completed Surveys</div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <Input
            placeholder="Search by PS Number"
            value={searchPSNo}
            onChange={(e) => {
              setSearchPSNo(e.target.value);
              setCurrentPage(1);
            }}
            style={{ width: 250 }}
          />
        </div>

        {/* Locations Table */}
        {locations.length === 0 ? (
          <p className="text-gray-500 italic">No locations found.</p>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="bg-blue-100 text-gray-800 font-semibold text-left">
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">PS No</th>
                  <th className="px-4 py-2">PS Name</th>
                  <th className="px-4 py-2">Survey Status</th>
                  <th className="px-4 py-2">Installation Status</th>
                  <th className="px-4 py-2">Lat</th>
                  <th className="px-4 py-2">Lng</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginatedLocations.map((loc, index) => {
                  const surveyState = loc.survey?.state;

                  return (
                    <tr
                      key={loc.documentId}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="px-4 py-2">
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>

                      <td className="px-4 py-2">{loc.PS_No || "—"}</td>

                      <td className="px-4 py-2 font-medium">
                        {loc.PS_Name || "—"}
                      </td>

                      {/* Survey Status */}
                      <td className="px-4 py-2">
                        <span
                          className={`flex items-center gap-2 text-sm
              ${
                surveyState === "Completed"
                  ? "text-green-600"
                  : surveyState === "Raised"
                    ? "text-orange-600"
                    : "text-gray-500"
              }`}
                        >
                          ● {surveyState || "Not Raised"}
                        </span>
                      </td>

                      {/* Installation Status */}
                      <td className="px-4 py-2">
                        <span className="flex items-center gap-2 text-sm text-orange-600">
                          ● {loc.Installation_Status || "Pending"}
                        </span>
                      </td>

                      <td className="px-4 py-2">{loc.Latitude || "—"}</td>
                      <td className="px-4 py-2">{loc.Longitude || "—"}</td>

                      <td className="px-4 py-2">
                        <Link href={`/district/booths/${loc.documentId}`}>
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] hover:from-[#2d7ae8] hover:to-[#1976D2] text-white border-0"
                            // onClick={() =>
                            //   router.push(
                            //     `/district/locations/${loc.documentId}`,
                            //   )
                            // }
                          >
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filteredLocations.length > 0 && (
          <div className="mt-4 flex justify-end">
            <Pagination
              current={currentPage}
              total={filteredLocations.length}
              pageSize={pageSize}
              onChange={setCurrentPage}
              onShowSizeChange={(current, size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              showSizeChanger
              showQuickJumper
            />
          </div>
        )}
      </div>

      {/* Coordinator Section */}
      <div className="mb-6">
        <p className="font-semibold mb-3 text-gray-700">
          Assigned Coordinator:
        </p>
        {selectedCoordinators && !editingCoordinators ? (
          (() => {
            const coordinator = assembly?.assembly_coordinator;

            if (!coordinator) {
              return (
                <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                  <p className="text-yellow-700">No coordinator assigned yet</p>
                  <Button
                    className="mt-2 bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] hover:from-[#2d7ae8] hover:to-[#1976D2] text-white border-0"
                    onClick={() => setEditingCoordinators(true)}
                  >
                    Assign Coordinator
                  </Button>
                </div>
              );
            }

            const profile = coordinator.profile;
            const name = profile?.Full_Name ?? coordinator?.username ?? "—";
            const phone = profile?.Phone_Number ?? "—";
            const email = displayEmail(coordinator?.email);
            const district = profile?.District ?? "—";
            const state = profile?.State ?? "—";
            const aadhar = profile?.Aadhar ?? "—";
            const fatherName = profile?.Father_Name ?? "—";
            const motherName = profile?.Mother_Name ?? "—";
            const village = profile?.Village ?? "—";
            const address = profile?.address ?? "—";
            const bankOrUPI = profile?.Bank_or_UPI ?? "—";
            const pincode = profile?.Pincode ?? "—";
            const designation = profile?.Designation ?? "—";

            return (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200 shadow-md">
                {/* Header with Name and Avatar */}
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-blue-300">
                  <div className="w-16 h-16 bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] rounded-full flex items-center justify-center text-white font-bold text-2xl">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-800">
                      {name}
                    </div>
                    <div className="text-sm text-gray-600">
                      Assembly Coordinator{" "}
                      {designation !== "—" ? `(${designation})` : ""}
                    </div>
                    {email !== "—" && (
                      <div className="text-sm text-blue-600 lowercase normal-case">✉️ {email}</div>
                    )}
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">
                      Contact Information
                    </h3>
                    <div className="text-sm">
                      <span className="font-semibold text-gray-700">
                        Phone:
                      </span>
                      <span className="ml-2 text-gray-600">📞 {phone}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold text-gray-700">
                        District:
                      </span>
                      <span className="ml-2 text-gray-600">{district}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold text-gray-700">
                        State:
                      </span>
                      <span className="ml-2 text-gray-600">{state}</span>
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">
                      Personal Information
                    </h3>
                    <div className="text-sm">
                      <span className="font-semibold text-gray-700">
                        Aadhar:
                      </span>
                      <span className="ml-2 text-gray-600">{aadhar}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold text-gray-700">
                        Father's Name:
                      </span>
                      <span className="ml-2 text-gray-600">{fatherName}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold text-gray-700">
                        Mother's Name:
                      </span>
                      <span className="ml-2 text-gray-600">{motherName}</span>
                    </div>
                  </div>
                </div>

                {/* Address and Location Information */}
                <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b border-blue-300">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">
                      Address
                    </h3>
                    <div className="text-sm">
                      <span className="font-semibold text-gray-700">
                        Address:
                      </span>
                      <span className="ml-2 text-gray-600">{address}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold text-gray-700">
                        Village:
                      </span>
                      <span className="ml-2 text-gray-600">{village}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold text-gray-700">
                        Pincode:
                      </span>
                      <span className="ml-2 text-gray-600">{pincode}</span>
                    </div>
                  </div>

                  {/* Financial Information */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">
                      Financial Details
                    </h3>
                    <div className="text-sm">
                      <span className="font-semibold text-gray-700">
                        Bank/UPI:
                      </span>
                      <span className="ml-2 text-gray-600">{bankOrUPI}</span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div>
                  <Button
                    className="bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] hover:from-[#2d7ae8] hover:to-[#1976D2] text-white border-0"
                    onClick={() => setEditingCoordinators(true)}
                  >
                    Change Coordinator
                  </Button>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="mb-3 text-sm text-gray-600">
              Select a new coordinator:
            </p>
            <Select
              style={{ width: "100%", maxWidth: 500 }}
              placeholder="Select a coordinator"
              value={selectedCoordinators || undefined}
              onChange={handleAssignCoordinators}
              optionFilterProp="children"
            >
              {coordinators.map((coord: any) => {
                const name = coord.Full_Name ?? coord.email ?? "Unnamed";
                const value = coord.documentId ?? coord.id;
                return (
                  <Select.Option key={value} value={value}>
                    <div>
                      <div className="font-medium">{name}</div>
                      <div className="text-xs text-gray-500">{(coord.email || "").toLowerCase()}</div>
                      {coord.Phone_Number && (
                        <div className="text-xs text-gray-500">
                          📞 {coord.Phone_Number}
                        </div>
                      )}
                    </div>
                  </Select.Option>
                );
              })}
            </Select>
            <Button
              className="mt-3 ms-3 bg-gray-400 hover:bg-gray-500 text-white"
              onClick={() => setEditingCoordinators(false)}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
