"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Input, Pagination, Modal, Button, message, Select, Empty } from "antd";
import api from "@/lib/api";
import CreateCoordinatorModal from "@/components/coordinator/Createcoordinator";

const Page = () => {
  const [user, setUser] = useState<any>(null);
  const [assembly, setAssembly] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [camerasMap, setCamerasMap] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assigningLocation, setAssigningLocation] = useState<any | null>(null);
  const [eligibleCoordinators, setEligibleCoordinators] = useState<any[]>([]);
  const [selectedCoordinator, setSelectedCoordinator] = useState<any | null>(
    null,
  );
  const [createCoordinatorOpen, setCreateCoordinatorOpen] = useState(false);

  const baseurl = process.env.NEXT_PUBLIC_API_URL;

  // ===============================
  // Fetch User + Assembly
  // ===============================
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      const userRes = await axios.get(`${baseurl}/users/me?populate=*`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const currentUser = userRes.data;
      setUser(currentUser);

      const assemblyNo = currentUser?.assemblies?.[0]?.Assembly_No;

      const assemblyRes = await api.get("/assemblies", {
        params: {
          "filters[Assembly_No][$eq]": assemblyNo,
        },
      });

      setAssembly(assemblyRes.data.data?.[0]);
    };

    fetchUser();
  }, []);

  // ===============================
  // Fetch Locations
  // ===============================
  const fetchLocations = async () => {
    if (!assembly?.documentId) return;

    setLoading(true);

    const res = await api.get("/locations", {
      params: {
        "filters[assembly][documentId][$eq]": assembly.documentId,
        "pagination[page]": currentPage,
        "pagination[pageSize]": pageSize,
        "filters[$or][0][PS_No][$containsi]": search,
        "filters[$or][1][PS_Name][$containsi]": search,

        "populate[booth_coordinator][fields][0]": "username",
        "populate[booth_coordinator][fields][1]": "email",
        "populate[booth_coordinator][populate][profile][fields][0]":
          "Full_Name",
      },
    });

    setLocations(res.data.data || []);
    setTotalCount(res.data.meta.pagination.total);

    await fetchCameras(res.data.data);

    setLoading(false);
  };

  // ===============================
  // Fetch Cameras and Group by Booth
  // ===============================
  const fetchCameras = async (locationList: any[]) => {
    const res = await api.get("/cameras", {
      params: {
        "pagination[pageSize]": 1000,
        populate: "assigned_booth",
      },
    });

    const cameras = res.data.data || [];

    const grouped: any = {};

    cameras.forEach((cam: any) => {
      const boothId = cam.assigned_booth?.documentId;
      if (!boothId) return;

      if (!grouped[boothId]) {
        grouped[boothId] = {
          IN: [],
          OUT: [],
        };
      }

      if (cam.Position === "IN") {
        grouped[boothId].IN.push(cam);
      } else if (cam.Position === "OUT") {
        grouped[boothId].OUT.push(cam);
      }
    });

    setCamerasMap(grouped);
  };

  useEffect(() => {
    fetchLocations();
  }, [assembly, currentPage, pageSize, search]);

  // ===============================
  // Install Camera
  // ===============================
  const handleInstallCamera = async (locationId: string) => {
    await api.post("/cameras", {
      data: {
        assigned_booth: locationId,
        Position: "IN",
        state: "Installed",
      },
    });

    message.success("Camera Installed");
    fetchLocations();
  };

  // ===============================
  // Mark Out Camera
  // ===============================
  const handleMarkOut = async (locationId: string) => {
    await api.post("/cameras", {
      data: {
        assigned_booth: locationId,
        Position: "OUT",
        state: "Installed",
      },
    });

    message.success("Camera Marked Out");
    fetchLocations();
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Input
        placeholder="Search PS No or Name"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: 300, marginBottom: 20 }}
      />

      <div className="bg-white shadow rounded-xl overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">PS No</th>
              <th className="p-3">Polling Station</th>
              <th className="p-3">IN Camera</th>
              <th className="p-3">OUT Camera</th>
              <th className="p-3">Action</th>
              <th className="p-3">Coordinator</th>
            </tr>
          </thead>

          <tbody>
            {locations.map((loc: any) => {
              const boothCameras = camerasMap[loc.documentId] || {
                IN: [],
                OUT: [],
              };

              const inCount = boothCameras.IN.length;
              const outCount = boothCameras.OUT.length;

              return (
                <tr key={loc.documentId} className="border-b">
                  <td className="p-3">{loc.PS_No}</td>
                  <td className="p-3">{loc.PS_Name}</td>

                  <td className="p-3 text-green-600 font-semibold">
                    {inCount}
                  </td>

                  <td className="p-3 text-red-600 font-semibold">{outCount}</td>

                  <td className="p-3">
                    {inCount > 0 ? (
                      <Button
                        danger
                        size="small"
                        onClick={() => handleMarkOut(loc.documentId)}
                      >
                        Mark Out Camera
                      </Button>
                    ) : (
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => handleInstallCamera(loc.documentId)}
                      >
                        Install Camera
                      </Button>
                    )}
                  </td>

                  <td className="p-3">
                    {loc.booth_coordinator ? (
                      <div>
                        <div className="font-medium">
                          {loc.booth_coordinator.profile?.Full_Name ||
                            loc.booth_coordinator.username}
                        </div>
                        <div className="text-xs text-gray-500">
                          {(loc.booth_coordinator.email || "").toLowerCase()}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">Not Assigned</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="p-4 flex justify-end">
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={totalCount}
            onChange={(page, size) => {
              setCurrentPage(page);
              setPageSize(size || 10);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Page;
