"use client";

import React, { useEffect, useState } from "react";
import { Spin, message, Skeleton, Modal, Select } from "antd";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import CreateCoordinatorModal from "@/components/coordinator/Createcoordinator";
import Link from "next/link";

export default function AssembliesPage() {
  const [user, setUser] = useState<any>(null);
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [district, setDistrict] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [createCoordinatorOpen, setCreateCoordinatorOpen] = useState(false);

  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(
    null,
  );
  const [selectedCoordinator, setSelectedCoordinator] = useState<string | null>(
    null,
  );
  const [assigningLoading, setAssigningLoading] = useState(false);
  const router = useRouter();

  // 🔹 1️⃣ Get logged-in user info
  const getUser = async () => {
    try {
      const res = await api.get("/users/me?populate=*");
      setUser(res.data);
      return res.data;
    } catch (err) {
      console.error("Failed to fetch user:", err);
      message.error("Unable to fetch user details.");
      return null;
    }
  };

  // 🔹 2️⃣ Find district assigned to this coordinator
  // 🔹 2️⃣ Find district assigned to this coordinator
  const getDistrictForCoordinator = async (userData: any) => {
    try {
      const res = await api.get(
        `/districts?filters[district_coordinator][documentId][$eq]=${userData.documentId}&populate[assemblies][populate][0]=assembly_coordinator&populate[assemblies][populate][1]=assembly_coordinator.profile&pagination[pageSize]=1000`,
      );

      if (res.data.data.length > 0) {
        const districtData = res.data.data[0];
        setDistrict(districtData);
        setAssemblies(districtData.assemblies || []);

        console.log("Fetched District Data:", districtData.assemblies);

        // ✅ Cache the data
        sessionStorage.setItem("user", JSON.stringify(userData));
        sessionStorage.setItem("district", JSON.stringify(districtData));
        sessionStorage.setItem(
          "assemblies",
          JSON.stringify(districtData.assemblies || []),
        );
      } else {
        message.warning("No district assigned to this coordinator.");
      }
    } catch (err) {
      console.error("Error fetching district:", err);
      message.error("Failed to fetch district details.");
    } finally {
      setLoading(false);
    }
  };

  console.log("District Data:", district);

  // ✅ Fetch coordinators (users with assembly_coordinator role)
  // const fetchCoordinators = async (userDocId: string) => {
  //   try {
  //     const url = `/users?populate[0]=profile&populate[1]=role&pagination[pageSize]=100`;
  //     const res = await api.get(url);

  //     const coordinatorsList = (res.data || [])
  //       .filter((user: any) => user.role?.type === "assembly_coordinator")
  //       .map((user: any) => ({
  //         id: user.profile?.id,
  //         documentId: user.documentId,
  //         email: user.email,
  //         Full_Name: user.profile?.Full_Name,
  //         Phone_Number: user.profile?.Phone_Number,
  //         username: user.username,
  //       }));

  //     setCoordinators(coordinatorsList || []);
  //   } catch (err) {
  //     console.error("Error fetching coordinators:", err);
  //     message.error("Failed to fetch coordinators.");
  //   }
  // };

  const fetchCoordinators = async (userDocId: string) => {
    try {
      const res = await api.get("/app-users", {
        params: {
          "filters[createdby][documentId][$eq]": userDocId,

          // ✅ populate linked users-permissions user
          "populate[user][populate][role]": true,
          "populate[user][populate][profile]": true,

          // optional but safe
          "pagination[pageSize]": 200,
        },
      });

      const appUsers = res.data?.data || [];

      const assemblyCoordinators = appUsers.filter(
        (a: any) => a.user?.role?.type === "assembly_coordinator",
      );

      const mapped = assemblyCoordinators.map((a: any) => ({
        documentId: a.user.documentId, // users-permissions user
        email: a.user.email,
        username: a.user.username,
        Full_Name: a.user.profile?.Full_Name || a.Full_Name,
        Phone_Number: a.user.profile?.Phone_Number || null,
        profileId: a.id, // app-user id
      }));

      setCoordinators(mapped);
    } catch (err) {
      console.error("Failed to fetch coordinators", err);
      message.error("Failed to fetch coordinators");
    }
  };

  // ✅ Assign coordinator to assembly
  const handleAssignCoordinator = async () => {
    if (!selectedCoordinator || !selectedAssemblyId) {
      message.error("Please select a coordinator");
      return;
    }

    try {
      setAssigningLoading(true);

      const selectedAppUser = coordinators.find(
        (c: any) =>
          c.documentId === selectedCoordinator || c.id === selectedCoordinator,
      );

      if (!selectedAppUser) {
        message.error("Selected coordinator not found");
        return;
      }

      // Use documentId directly since we're fetching from users table
      const userDocId = selectedAppUser.documentId;

      // Update assembly with coordinator
      const updateRes = await api.put(`/assemblies/${selectedAssemblyId}`, {
        data: {
          assembly_coordinator: userDocId,
        },
      });

      console.log("Coordinator assigned response:", updateRes.data);

      message.success("Coordinator assigned successfully!");
      setAssignModalVisible(false);
      setSelectedCoordinator(null);
      setSelectedAssemblyId(null);

      // Refresh assemblies
      const userData = await getUser();
      if (userData) {
        await getDistrictForCoordinator(userData);
      }
    } catch (err) {
      console.error("Error assigning coordinator:", err);
      message.error("Failed to assign coordinator.");
    } finally {
      setAssigningLoading(false);
    }
  };

  console.log("District Data:", district);

  // normalize coordinator info from several possible shapes
  const getCoordinatorInfo = React.useCallback((assembly: any) => {
    const coordinator = assembly?.assembly_coordinator;

    if (!coordinator) {
      return {
        name: "—",
        phone: "—",
        email: "—",
      };
    }

    // Get email from coordinator user object
    const email = (coordinator.email ?? "—").toLowerCase();

    // Get profile data - it could be nested as profile or in the coordinator directly
    const profile = coordinator.profile ?? coordinator;

    const name =
      profile?.Full_Name ??
      profile?.full_name ??
      profile?.name ??
      coordinator?.username ??
      "—";
    const phone = profile?.Phone_Number ?? profile?.phone ?? "—";

    return {
      name,
      phone,
      email,
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingInitial(true);

        // 🔹 Check for cached data (makes reloads instant)
        const cachedUser = sessionStorage.getItem("user");
        const cachedDistrict = sessionStorage.getItem("district");
        const cachedAssemblies = sessionStorage.getItem("assemblies");

        // if (cachedUser && cachedDistrict && cachedAssemblies) {
        //   setUser(JSON.parse(cachedUser));
        //   setDistrict(JSON.parse(cachedDistrict));
        //   setAssemblies(JSON.parse(cachedAssemblies));
        //   setLoadingInitial(false);
        //   return;
        // }

        // 🔹 Fetch user first
        const userRes = await api.get("/users/me?populate=*");
        const userData = userRes.data;
        setUser(userData);

        // ✅ Fetch district using the helper function
        await getDistrictForCoordinator(userData);

        // ✅ Fetch coordinators
        if (userData?.documentId) {
          await fetchCoordinators(userData.documentId);
        }
      } catch (err) {
        console.error("Error loading data:", err);
        message.error("Failed to fetch assemblies or district.");
      } finally {
        setLoadingInitial(false);
      }
    };

    // Small delay to allow UI paint first
    const timer = setTimeout(() => loadData(), 150);
    return () => clearTimeout(timer);
  }, []);

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="w-full mx-auto bg-white rounded-2xl shadow-md p-8">
          <Skeleton active paragraph={{ rows: 1 }} className="mb-6" />
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 transition-all duration-300">
      <div className="w-full mx-auto bg-white rounded-2xl shadow-md p-8 hover:shadow-lg transition-all">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            Assemblies under{" "}
            <span className="text-blue-600">
              {district?.district_name || "—"}
            </span>
          </h2>
        </div>

        {assemblies.length === 0 ? (
          <p className="text-gray-500 italic">No assemblies found.</p>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gradient-to-b from-blue-50 to-blue-50 text-gray-800 font-semibold text-left">
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">Assembly No</th>
                  <th className="px-4 py-2">Assembly Name</th>
                  <th className="px-4 py-2">Coordinator</th>
                  <th className="px-4 py-2">State</th>
                  <th className="px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {assemblies.map((assembly: any, index: number) => {
                  const coord = getCoordinatorInfo(assembly);
                  return (
                    <tr
                      key={assembly.documentId}
                      className={`border-b hover:bg-gray-50 cursor-pointer ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      }`}
                    >
                      <td className="px-4 py-2">{index + 1}</td>
                      <td className="px-4 py-2">{assembly.Assembly_No}</td>
                      <td className="px-4 py-2 font-medium">
                        {assembly.Assembly_Name}
                      </td>
                      <td className="px-4 py-2">
                        {!assembly.assembly_coordinator ? (
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-gray-400">
                              Not Assigned
                            </div>
                            <Button
                              className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAssemblyId(assembly.documentId);
                                setAssignModalVisible(true);
                              }}
                            >
                              Assign Coordinator
                            </Button>
                          </div>
                        ) : (
                          <div>
                            <div className="text-sm font-medium">
                              {coord.name}
                            </div>
                            <div className="text-xs text-gray-600">
                              📞 {coord.phone}
                            </div>
                            <div className="text-xs text-gray-600">
                              ✉️ {(coord.email || "").toLowerCase()}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2">Assam</td>
                      <td className="px-4 py-2">
                        <Link
                          href={`/district/assemblies/${assembly.documentId}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            className="bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] hover:from-[#2d7ae8] hover:to-[#1976D2] text-white border-0"
                            onMouseEnter={() =>
                              router.prefetch(
                                `/district/assemblies/${assembly.documentId}`,
                              )
                            }
                            // onClick={() =>
                            //   router.push(
                            //     `/district/assemblies/${assembly.documentId}`,
                            //   )
                            // }
                          >
                            View Details
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
      </div>

      {/* Assign Coordinator Modal */}
      <Modal
        title="Assign Coordinator"
        visible={assignModalVisible}
        onCancel={() => {
          setAssignModalVisible(false);
          setSelectedCoordinator(null);
          setSelectedAssemblyId(null);
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setAssignModalVisible(false);
              setSelectedCoordinator(null);
              setSelectedAssemblyId(null);
            }}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800"
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            onClick={handleAssignCoordinator}
            loading={assigningLoading}
            className=" ms-2 bg-blue-500 hover:bg-blue-600 text-white"
          >
            Assign
          </Button>,
        ]}
      >
        <div>
          <p className="mb-4 text-gray-700">
            Select a coordinator to assign to this assembly:
          </p>
          <Select
            style={{ width: "100%" }}
            placeholder="Select a coordinator"
            value={selectedCoordinator || undefined}
            onChange={setSelectedCoordinator}
            optionFilterProp="children"
            showSearch
          >
            {coordinators.map((coord: any) => (
              <Select.Option key={coord.documentId} value={coord.documentId}>
                <div>
                  <div className="font-medium">
                    {coord.Full_Name || (coord.email || "").toLowerCase()}
                  </div>
                  <div className="text-xs text-gray-500">{(coord.email || "").toLowerCase()}</div>
                  {coord.Phone_Number && (
                    <div className="text-xs text-gray-500">
                      📞 {coord.Phone_Number}
                    </div>
                  )}
                </div>
              </Select.Option>
            ))}
          </Select>

          <Button
            type="dashed"
            className="mt-3 w-full"
            onClick={() => setCreateCoordinatorOpen(true)}
          >
            + Create New Coordinator
          </Button>
        </div>
      </Modal>

      <CreateCoordinatorModal
        open={createCoordinatorOpen}
        onClose={() => setCreateCoordinatorOpen(false)}
        role="assembly" // 👈 enforce assembly coordinator
        onCreated={(coord) => {
          // coord.documentId = users-permissions documentId
          setCoordinators((prev) => [...prev, coord]);
          setSelectedCoordinator(coord.documentId);
          setCreateCoordinatorOpen(false);
        }}
      />
    </div>
  );
}



