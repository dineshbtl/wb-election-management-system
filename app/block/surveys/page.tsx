"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Tag,
  Spin,
  message,
  Skeleton,
  Button,
  Modal,
  Select,
} from "antd";
import api from "@/lib/api";

const { Option } = Select;

export default function BlockBoothLocationsPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [boothCoordinators, setBoothCoordinators] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Assign modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningLocation, setAssigningLocation] = useState<any>(null);
  const [selectedCoordinator, setSelectedCoordinator] = useState<string | null>(
    null,
  );
  const [assignLoading, setAssignLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  // KPI
  const [totalCount, setTotalCount] = useState(0);
  const [raisedCount, setRaisedCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  // Filter
  const [surveyFilter, setSurveyFilter] = useState<
    "all" | "Raised" | "Completed"
  >("all");

  const [searchText, setSearchText] = useState("");

  /* ---------------------------------------------------
     1️⃣ Fetch logged-in block coordinator
  --------------------------------------------------- */
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

  /* ---------------------------------------------------
     2️⃣ Fetch locations under block
  --------------------------------------------------- */
  useEffect(() => {
    if (!user?.documentId) return;
    fetchLocations(user.documentId);
  }, [user, surveyFilter]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (user?.documentId) {
        fetchLocations(user.documentId);
      }
    }, 400);

    return () => clearTimeout(t);
  }, [searchText]);

  const fetchLocations = async (userId: string) => {
    try {
      setLoading(true);

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

      // 🔥 KPI call
      await fetchKpis(block.documentId);

      const params: any = {
        "filters[blocks][documentId][$eq]": block.documentId,
        "populate[survey]": true,
        "populate[assembly][populate][district]": true,
        "populate[booth_coordinator]": true,
        sort: "PS_No:asc",
        "pagination[pageSize]": 1000,
      };

      if (searchText) {
        params["filters[$or][0][PS_No][$containsi]"] = searchText;
        params["filters[$or][1][PS_Name][$containsi]"] = searchText;
      }

      // 🔥 survey filter
      if (surveyFilter !== "all") {
        params["filters[survey][state][$eq]"] = surveyFilter;
      }

      const res = await api.get("/locations", { params });
      setLocations(res.data.data || []);
    } catch (err) {
      console.error(err);
      message.error("Failed to load locations");
    } finally {
      setLoading(false);
    }
  };

  const fetchKpis = async (blockId: string) => {
    const baseParams = {
      "filters[blocks][documentId][$eq]": blockId,
      "pagination[pageSize]": 1,
    };

    const [total, raised, completed] = await Promise.all([
      api.get("/locations", { params: baseParams }),
      api.get("/locations", {
        params: {
          ...baseParams,
          "filters[survey][state][$eq]": "Raised",
        },
      }),
      api.get("/locations", {
        params: {
          ...baseParams,
          "filters[survey][state][$eq]": "Completed",
        },
      }),
    ]);

    setTotalCount(total.data.meta.pagination.total);
    setRaisedCount(raised.data.meta.pagination.total);
    setCompletedCount(completed.data.meta.pagination.total);
  };

  /* ---------------------------------------------------
     3️⃣ Fetch booth coordinators (same logic as UsersPage)
  --------------------------------------------------- */
  const fetchBoothCoordinators = async (userId: string) => {
    try {
      // app-users created by this block coordinator
      const appUsersRes = await api.get("/app-users", {
        params: {
          "filters[createdby][documentId][$eq]": userId,
          "populate[user]": true,
          "pagination[pageSize]": 1000,
        },
      });

      const appUsers = appUsersRes.data.data || [];

      // fetch users-permissions users to check role
      const usersRes = await api.get("/users", {
        params: {
          populate: "role",
          "pagination[pageSize]": 1000,
        },
      });

      const users = usersRes.data || [];

      const boothUsers = users.filter(
        (u: any) => u.role?.type === "booth_coordinator",
      );

      const eligible = appUsers.filter((au: any) =>
        boothUsers.some((u: any) => u.id === au.user?.id),
      );

      setBoothCoordinators(eligible);
    } catch (err) {
      console.error("Failed to load booth coordinators", err);
      setBoothCoordinators([]);
    }
  };

  /* ---------------------------------------------------
     4️⃣ Assign coordinator
  --------------------------------------------------- */
  const handleAssignCoordinator = async () => {
    if (!selectedCoordinator) {
      message.warning("Select a coordinator");
      return;
    }

    try {
      setAssignLoading(true);

      const selectedAppUser = boothCoordinators.find(
        (c) => c.documentId === selectedCoordinator,
      );

      const userDocId = selectedAppUser?.user?.documentId;
      if (!userDocId) {
        message.error("Invalid coordinator");
        return;
      }

      // 🔹 Determine targets
      const targetLocationIds = assigningLocation
        ? [assigningLocation.documentId] // single
        : selectedRowKeys; // bulk

      if (targetLocationIds.length === 0) {
        message.warning("No locations selected");
        return;
      }

      // 🔹 Assign coordinator to each location
      for (const locId of targetLocationIds) {
        await api.put(`/locations/${locId}`, {
          data: {
            booth_coordinator: userDocId,
          },
        });
      }

      message.success(
        assigningLocation
          ? "Coordinator assigned"
          : `Coordinator assigned to ${targetLocationIds.length} locations`,
      );

      setAssignModalOpen(false);
      setAssigningLocation(null);
      setSelectedCoordinator(null);
      setSelectedRowKeys([]);

      fetchLocations(user.documentId);
    } catch (err) {
      console.error(err);
      message.error("Assignment failed");
    } finally {
      setAssignLoading(false);
    }
  };

  /* ---------------------------------------------------
     5️⃣ Table columns
  --------------------------------------------------- */
  const columns = [
    {
      title: "Booth",
      dataIndex: "PS_Name",
      render: (v: string) => <strong>{v}</strong>,
    },
    {
      title: "PS No",
      dataIndex: "PS_No",
    },
    {
      title: "Assembly",
      render: (l: any) => l.assembly?.Assembly_Name || "—",
    },
    {
      title: "District",
      render: (l: any) => l.assembly?.district?.district_name || "—",
    },
    {
      title: "Status",
      render: (l: any) =>
        l.survey ? (
          <Tag color="green">Raised</Tag>
        ) : (
          <Tag>Survey Not Raised</Tag>
        ),
    },
    {
      title: "Coordinator",
      render: (l: any) => {
        const bc = Array.isArray(l.booth_coordinator)
          ? l.booth_coordinator[0]
          : l.booth_coordinator;

        // ✅ If coordinator already assigned → SHOW IT
        if (bc) {
          return (
            <div>
              <div className="font-semibold text-gray-900">
                {bc.profile?.Full_Name || bc.username || (bc.email || "").toLowerCase()}
              </div>
              <div className="text-sm text-gray-500">{(bc.email || "").toLowerCase()}</div>

              <Button
                size="small"
                className="mt-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setAssigningLocation(l);
                  setSelectedCoordinator(bc.documentId); // 👈 preselect
                  setAssignModalOpen(true);
                }}
              >
                Change
              </Button>
            </div>
          );
        }

        // ❌ No coordinator → show Assign button
        return (
          <Button
            type="primary"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setAssigningLocation(l);
              setSelectedCoordinator(null);
              setAssignModalOpen(true);
            }}
          >
            Assign Coordinator
          </Button>
        );
      },
    },
  ];

  /* ---------------------------------------------------
     6️⃣ UI
  --------------------------------------------------- */
  if (loadingInitial)
    return (
      <div className="p-8">
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => {
      setSelectedRowKeys(keys as string[]);
    },
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-xl p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-sm text-gray-500">Total Booths</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalCount}</p>
          </div>
          <div className="bg-white rounded-xl border-2 border-[#2196F3] p-4 shadow-sm">
            <p className="text-sm text-gray-500">Raised</p>
            <p className="text-2xl font-bold text-[#2196F3] mt-1">{raisedCount}</p>
          </div>
          <div className="bg-white rounded-xl border-2 border-[#4CAF50] p-4 shadow-sm">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-[#4CAF50] mt-1">{completedCount}</p>
          </div>
        </div>

        <h2 className="text-2xl font-semibold mb-1">Booth Locations</h2>
        <p className="text-gray-500 mb-6">
          Manage booth locations, survey status, and coordinator assignments
        </p>

        <div className="flex gap-3 pb-4 items-center">
          <input
            type="text"
            placeholder="Search PS No / Booth Name"
            className="border rounded px-3 py-1 w-64"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />

          <Select
            placeholder="Survey Status"
            value={surveyFilter === "all" ? undefined : surveyFilter}
            onChange={(val) => setSurveyFilter(val ?? "all")}
            allowClear
            style={{ width: 200 }}
          >
            <Option value="Raised">Raised</Option>
            <Option value="Completed">Completed</Option>
          </Select>

          <Button
            type="primary"
            disabled={selectedRowKeys.length === 0}
            onClick={() => {
              setAssigningLocation(null);
              setAssignModalOpen(true);
            }}
          >
            Bulk Assign ({selectedRowKeys.length})
          </Button>
        </div>

        <Table
          rowKey="documentId"
          rowSelection={rowSelection}
          dataSource={locations}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 10 }}
          onRow={(record) => ({
            style: { cursor: "pointer" },
            onClick: () =>
              router.push(`/block/surveys/${record.documentId}`),
            // onClick: () => alert(record.survey.documentId),
          })}
        />

        {/* Assign Modal */}
        <Modal
          open={assignModalOpen}
          title={
            assigningLocation
              ? `Assign Coordinator — ${assigningLocation.PS_Name}`
              : `Assign Coordinator to ${selectedRowKeys.length} Locations`
          }
          onCancel={() => {
            setAssignModalOpen(false);
            setAssigningLocation(null);
            setSelectedCoordinator(null);
          }}
          onOk={handleAssignCoordinator}
          confirmLoading={assignLoading}
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
              placeholder="Select Booth Coordinator"
              style={{ width: "100%" }}
              value={selectedCoordinator || undefined}
              onChange={(val) => setSelectedCoordinator(val)}
            >
              {boothCoordinators.map((coord: any) => (
                <Option key={coord.documentId} value={coord.documentId}>
                  {coord.Full_Name || (coord.email || "").toLowerCase()} ({(coord.user?.email || "").toLowerCase()})
                </Option>
              ))}
            </Select>
          )}
        </Modal>
      </div>
    </div>
  );
}
