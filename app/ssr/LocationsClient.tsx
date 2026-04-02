"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Tag,
  Button,
  Modal,
  Select,
  Input,
  Pagination,
  message,
  Empty,
  Spin,
} from "antd";
import api from "@/lib/api";

const { Option } = Select;

interface Props {
  user: any;
  role: string;
  scope: {
    type: "ALL" | "DISTRICT" | "BLOCK" | "ASSEMBLY";
    districtId?: string;
    blockId?: string;
    assemblyId?: string;
  };
  initialLocations: any[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  kpis: {
    total: number;
    raised: number;
    completed: number;
  };
}

export default function LocationsClient({
  user,
  role,
  scope,
  initialLocations,
  pagination,
  kpis,
}: Props) {
  const router = useRouter();

  /* ----------------------- STATE ----------------------- */
  const [locations, setLocations] = useState<any[]>(initialLocations);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [surveyFilter, setSurveyFilter] = useState<
    "all" | "Raised" | "Completed"
  >("all");

  const [page, setPage] = useState(pagination.page);
  const [pageSize, setPageSize] = useState(pagination.pageSize);
  const [total, setTotal] = useState(pagination.total);

  // selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // assign modal
  const [assignOpen, setAssignOpen] = useState(false);
  const [assigningLocation, setAssigningLocation] = useState<any | null>(null);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [selectedCoordinator, setSelectedCoordinator] = useState<string | null>(
    null,
  );
  const [assigning, setAssigning] = useState(false);

  const canAssign =
    role === "superadmin" ||
    role === "district_coordinator" ||
    role === "block_coordinator";

  /* ----------------------- HELPERS ----------------------- */
  const baseFilters = useMemo(() => {
    const f: any = {};
    if (scope.type === "DISTRICT")
      f["filters[assembly][district][documentId][$eq]"] = scope.districtId;
    if (scope.type === "BLOCK")
      f["filters[blocks][documentId][$eq]"] = scope.blockId;
    if (scope.type === "ASSEMBLY")
      f["filters[assembly][documentId][$eq]"] = scope.assemblyId;
    return f;
  }, [scope]);

  /* ----------------------- FETCH LOCATIONS ----------------------- */
  const fetchLocations = async (
    p = page,
    ps = pageSize,
    searchText = search,
    survey = surveyFilter,
  ) => {
    setLoading(true);
    try {
      const params: any = {
        ...baseFilters,
        "pagination[page]": p,
        "pagination[pageSize]": ps,
        "populate[survey]": true,
        "populate[assembly][populate][district]": true,
        "populate[booth_coordinator][populate][profile]": true,
        sort: "PS_No:asc",
      };

      if (searchText) {
        params["filters[$or][0][PS_No][$containsi]"] = searchText;
        params["filters[$or][1][PS_Name][$containsi]"] = searchText;
      }

      if (survey !== "all") {
        params["filters[survey][state][$eq]"] = survey;
      }

      const res = await api.get("/locations", { params });

      setLocations(res.data.data || []);
      setTotal(res.data.meta.pagination.total);
      setPage(res.data.meta.pagination.page);
    } catch (err) {
      console.error(err);
      message.error("Failed to load locations");
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------- FETCH COORDINATORS ----------------------- */
  useEffect(() => {
    if (!canAssign) return;

    const loadCoordinators = async () => {
      try {
        const res = await api.get("/users", {
          params: {
            populate: ["role", "profile"],
            "filters[role][type][$eq]": "booth_coordinator",
            "pagination[pageSize]": 1000,
          },
        });
        setCoordinators(res.data || []);
      } catch {
        setCoordinators([]);
      }
    };

    loadCoordinators();
  }, [canAssign]);

  /* ----------------------- ASSIGN ----------------------- */
  const handleAssign = async () => {
    if (!selectedCoordinator) {
      message.warning("Select a coordinator");
      return;
    }

    const targets = assigningLocation
      ? [assigningLocation.documentId]
      : selectedIds;

    if (targets.length === 0) {
      message.warning("No locations selected");
      return;
    }

    setAssigning(true);
    try {
      for (const id of targets) {
        await api.put(`/locations/${id}`, {
          data: { booth_coordinator: selectedCoordinator },
        });
      }

      message.success("Coordinator assigned");
      setAssignOpen(false);
      setAssigningLocation(null);
      setSelectedCoordinator(null);
      setSelectedIds([]);

      fetchLocations();
    } catch (err) {
      console.error(err);
      message.error("Assignment failed");
    } finally {
      setAssigning(false);
    }
  };

  /* ----------------------- TABLE ----------------------- */
  const columns: any[] = [
    {
      title: "Booth",
      render: (l: any) => <strong>{l.PS_Name}</strong>,
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
          <Tag color="green">{l.survey.state || "Raised"}</Tag>
        ) : (
          <Tag>Not Raised</Tag>
        ),
    },
    {
      title: "Coordinator",
      render: (l: any) => {
        const bc = l.booth_coordinator;
        if (!canAssign) {
          return bc ? bc.profile?.Full_Name || bc.username || (bc.email || "").toLowerCase() : "—";
        }

        return bc ? (
          <div>
            <div className="font-medium">
              {bc.profile?.Full_Name || bc.username}
            </div>
            <Button
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setAssigningLocation(l);
                setAssignOpen(true);
              }}
            >
              Change
            </Button>
          </div>
        ) : (
          <Button
            type="primary"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setAssigningLocation(l);
              setAssignOpen(true);
            }}
          >
            Assign
          </Button>
        );
      },
    },
  ];

  /* ----------------------- RENDER ----------------------- */
  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Stat label="Total Booths" value={total} />
        <Stat label="Raised" value={kpis.raised} color="blue" />
        <Stat label="Completed" value={kpis.completed} color="green" />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          placeholder="Search PS No / Booth"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
            fetchLocations(1, pageSize, e.target.value);
          }}
          style={{ width: 260 }}
          allowClear
        />

        <Select
          placeholder="Survey Status"
          value={surveyFilter === "all" ? undefined : surveyFilter}
          onChange={(v) => {
            setSurveyFilter(v ?? "all");
            setPage(1);
            fetchLocations(1, pageSize, search, v ?? "all");
          }}
          allowClear
          style={{ width: 180 }}
        >
          <Option value="Raised">Raised</Option>
          <Option value="Completed">Completed</Option>
        </Select>

        {canAssign && (
          <Button
            type="primary"
            disabled={selectedIds.length === 0}
            onClick={() => {
              setAssigningLocation(null);
              setAssignOpen(true);
            }}
          >
            Bulk Assign ({selectedIds.length})
          </Button>
        )}
      </div>

      {/* Table */}
      <Spin spinning={loading}>
        <Table
          rowKey="documentId"
          rowSelection={
            canAssign
              ? {
                  selectedRowKeys: selectedIds,
                  onChange: (keys) => setSelectedIds(keys as string[]),
                }
              : undefined
          }
          dataSource={locations}
          columns={columns}
          pagination={false}
          locale={{
            emptyText: (
              <Empty
                description={
                  surveyFilter !== "all"
                    ? "No records match filter"
                    : "No locations"
                }
              />
            ),
          }}
          onRow={(r) => ({
            onClick: () => {
              if (!r.survey?.documentId) {
                message.warning("Survey not raised yet");
                return;
              }
              router.push(`/surveys/${r.documentId}`);
            },
          })}
        />
      </Spin>

      {/* Pagination */}
      <div className="flex justify-end mt-4">
        <Pagination
          current={page}
          pageSize={pageSize}
          total={total}
          showSizeChanger
          onChange={(p, ps) => {
            setPage(p);
            setPageSize(ps);
            fetchLocations(p, ps);
          }}
        />
      </div>

      {/* Assign Modal */}
      <Modal
        open={assignOpen}
        title={
          assigningLocation
            ? `Assign Coordinator — ${assigningLocation.PS_Name}`
            : `Assign Coordinator (${selectedIds.length})`
        }
        onCancel={() => {
          setAssignOpen(false);
          setAssigningLocation(null);
          setSelectedCoordinator(null);
        }}
        onOk={handleAssign}
        confirmLoading={assigning}
      >
        <Select
          showSearch
          placeholder="Select coordinator"
          style={{ width: "100%" }}
          value={selectedCoordinator || undefined}
          onChange={setSelectedCoordinator}
        >
          {coordinators.map((c: any) => (
            <Option key={c.documentId} value={c.documentId}>
              {c.profile?.Full_Name || c.username} ({(c.email || "").toLowerCase()})
            </Option>
          ))}
        </Select>
      </Modal>
    </div>
  );
}

/* ----------------------- SMALL STAT ----------------------- */
function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="border rounded-xl p-5 shadow-sm">
      <div className="text-sm text-gray-500">{label}</div>
      <div
        className={`text-3xl font-bold ${
          color === "blue"
            ? "text-blue-600"
            : color === "green"
              ? "text-green-600"
              : "text-gray-800"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
