"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Tag,
  Spin,
  message,
  Button,
  Modal,
  Select,
  Skeleton,
} from "antd";
import api from "@/lib/api";

const { Option } = Select;

export default function BlockLocationsPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [boothCoordinators, setBoothCoordinators] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [selectedBoothCoordinator, setSelectedBoothCoordinator] = useState<
    string | null
  >(null);

  /* ----------------------------------------
     Normalize booth coordinator (CRITICAL)
  ---------------------------------------- */
  const normalizeCoordinator = (bc: any) => {
    if (!bc) return null;

    // handle array or object
    const coord = Array.isArray(bc) ? bc[0] : bc;
    if (!coord) return null;

    return {
      documentId: coord.documentId,
      name: coord.Full_Name || coord.username || (coord.email || "").toLowerCase() || "N/A",
      email: (coord.email || "—").toLowerCase(),
    };
  };

  /* ----------------------------------------
     Fetch logged-in user
  ---------------------------------------- */
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/users/me");
        setUser(res.data);
      } catch {
        message.error("Failed to fetch user");
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchUser();
  }, []);

  /* ----------------------------------------
     Fetch locations + coordinators
  ---------------------------------------- */
  useEffect(() => {
    if (!user?.documentId) return;
    fetchData(user.documentId);
  }, [user]);

  const fetchData = async (userId: string) => {
    try {
      setLoading(true);

      // 1️⃣ block
      const blockRes = await api.get("/blocks", {
        params: {
          "filters[assigned_coordinator][documentId][$eq]": userId,
        },
      });

      const block = blockRes.data.data?.[0];
      if (!block) {
        setLocations([]);
        return;
      }

      // 2️⃣ locations
      const locationsRes = await api.get("/locations", {
        params: {
          "filters[blocks][documentId][$eq]": block.documentId,
          "populate[booth_coordinator]": true,
          "pagination[pageSize]": 1000,
          sort: "PS_No:asc",
        },
      });

      setLocations(locationsRes.data.data || []);

      // 3️⃣ booth coordinators created by this block coordinator
      const coordinatorsRes = await api.get("/app-users", {
        params: {
          "filters[createdby][documentId][$eq]": userId,
          "populate[user]": true,
          "pagination[pageSize]": 1000,
        },
      });

      setBoothCoordinators(coordinatorsRes.data.data || []);
    } catch (err) {
      console.error(err);
      message.error("Failed to load locations");
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------
     Assign coordinator
  ---------------------------------------- */
  const handleAssign = async () => {
    if (!selectedBoothCoordinator || !selectedLocation) {
      message.warning("Select a coordinator");
      return;
    }

    try {
      const appUser = boothCoordinators.find(
        (b) => b.documentId === selectedBoothCoordinator,
      );

      const userDocId = appUser?.user?.documentId;
      if (!userDocId) {
        message.error("Invalid coordinator");
        return;
      }

      await api.put(`/locations/${selectedLocation.documentId}`, {
        data: { booth_coordinator: userDocId },
      });

      message.success("Coordinator assigned");

      setAssignModalOpen(false);
      setSelectedLocation(null);
      setSelectedBoothCoordinator(null);

      fetchData(user.documentId);
    } catch (err) {
      console.error(err);
      message.error("Assignment failed");
    }
  };

  /* ----------------------------------------
     Table columns
  ---------------------------------------- */
  const columns = [
    { title: "Polling Station", dataIndex: "PS_Name" },
    { title: "PS No", dataIndex: "PS_No" },
    { title: "Location", dataIndex: "PS_Location" },
    {
      title: "Booth Coordinator",
      render: (loc: any) => {
        const info = normalizeCoordinator(loc.booth_coordinator);

        if (!info) {
          return (
            <Button
              type="primary"
              onClick={() => {
                setSelectedLocation(loc);
                setAssignModalOpen(true);
              }}
            >
              Assign
            </Button>
          );
        }

        return (
          <div>
            <Tag color="green">{info.name}</Tag>
            <div className="text-xs text-gray-500">{info.email}</div>
            <Button
              size="small"
              className="mt-1"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedLocation(loc);
                setSelectedBoothCoordinator(info.documentId);
                setAssignModalOpen(true);
              }}
            >
              Change
            </Button>
          </div>
        );
      },
    },
  ];

  /* ----------------------------------------
     UI
  ---------------------------------------- */
  if (loadingInitial) {
    return (
      <div className="p-8">
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-xl p-8">
        <h2 className="text-2xl font-semibold mb-2">My Assigned Locations</h2>
        <p className="text-gray-500 mb-6">{(user?.email || "").toLowerCase()}</p>

        <Table
          rowKey="documentId"
          dataSource={locations}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 10 }}
          onRow={(record) => ({
            onClick: () => router.push(`/block/locations/${record.documentId}`),
          })}
          locale={{
            emptyText: loading ? <Spin /> : "No locations found",
          }}
        />
      </div>

      <Modal
        open={assignModalOpen}
        title="Assign Booth Coordinator"
        onCancel={() => {
          setAssignModalOpen(false);
          setSelectedLocation(null);
          setSelectedBoothCoordinator(null);
        }}
        onOk={handleAssign}
        okButtonProps={{ disabled: boothCoordinators.length === 0 }}
      >
        {boothCoordinators.length === 0 ? (
          <div className="py-4 text-center text-gray-600">
            <p className="font-medium">No booth coordinators yet.</p>
            <p className="text-sm mt-1">Create one to assign polling stations.</p>
            <Button
              type="primary"
              className="mt-3"
              onClick={() => window.open("/block/coordinators/add", "_self")}
            >
              Create coordinator
            </Button>
          </div>
        ) : (
          <Select
            showSearch
            style={{ width: "100%" }}
            placeholder="Select Booth Coordinator"
            value={selectedBoothCoordinator || undefined}
            onChange={setSelectedBoothCoordinator}
          >
            {boothCoordinators.map((coord) => (
              <Option key={coord.documentId} value={coord.documentId}>
                {coord.Full_Name || (coord.email || "").toLowerCase()}
              </Option>
            ))}
          </Select>
        )}
      </Modal>
    </div>
  );
}
