"use client";

import { useEffect, useState } from "react";
import { Button, Spin, message, Table, Select } from "antd";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import RaiseBoq from "@/components/ui/Raiseboq";

const { Option } = Select;

export default function ProjectBoqsPage() {
  const { projectId } = useParams();
  const router = useRouter();

  const [project, setProject] = useState<any>(null);
  const [boqs, setBoqs] = useState<any[]>([]);
  const [filteredBoqs, setFilteredBoqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [filterState, setFilterState] = useState<string>("All");

  // ✅ Fetch current user
  const fetchCurrentUser = async () => {
    try {
      const res = await api.get("/users/me?populate=*");
      setCurrentUser(res.data);
    } catch (err) {
      console.error("❌ Failed to fetch current user:", err);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // ✅ Fetch project and its BOQs
  // inside your component
  const fetchProject = async (user?: any) => {
    setLoading(true);
    try {
      // 1) fetch project (site list, assigned_groups etc.)
      const projRes = await api.get(`/projects/${projectId}?populate=site_1s`);
      const projectData = projRes.data.data;
      if (!projectData) {
        setProject(null);
        setBoqs([]);
        return;
      }

      // 2) fetch BOQs for this project, populate raised_by and site_1
      //    filter by project.documentId so it's stable across environments
      const projectDocId = projectData.documentId;
      const boqsRes = await api.get(
        `/boq1s?filters[project][documentId][$eq]=${encodeURIComponent(
          projectDocId
        )}&populate=raised_by&populate=site_1`
      );
      let boqList = boqsRes.data?.data || [];

      // 3) If user is not admin, only keep BOQs raised by them
      if (user?.role?.name !== "Admin") {
        boqList = boqList.filter(
          (b: any) => b.raised_by?.documentId === user?.documentId
        );
      }

      setProject(projectData);
      setBoqs(boqList);
    } catch (err) {
      console.error("❌ Failed to load project or boqs:", err);
      message.error("Failed to load project details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchProject(currentUser);
    }
  }, [currentUser, projectId]);

  // ✅ Filter BOQs by state
  useEffect(() => {
    if (filterState === "All") setFilteredBoqs(boqs);
    else setFilteredBoqs(boqs.filter((b) => b.state === filterState));
  }, [filterState, boqs]);

  const getLatestPrice = (productName: string, groupName: string) => {
    const group = project?.assigned_groups?.find(
      (g: any) => g.group === groupName
    );
    const product =
      group?.products?.find(
        (p: any) =>
          (typeof p === "string" && p === productName) ||
          (typeof p === "object" && p.name === productName)
      ) || null;
    return typeof product === "object" && product.price ? product.price : 0;
  };

  if (loading || !project)
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <Spin size="large" />
      </div>
    );

  if (filteredBoqs.length === 0)
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center flex-wrap gap-3">
          <h1 className="text-2xl font-semibold">
            📋 BOQs — {project.project_name}
          </h1>

          <div className="flex gap-3 items-center">
            <Select
              value={filterState}
              onChange={(val) => setFilterState(val)}
              style={{ width: 220 }}
            >
              <Option value="All">All States</Option>
              <Option value="Pending Purchase">Pending Purchase</Option>
              <Option value="Pending Approval">Pending Approval</Option>
              <Option value="Approved">Approved</Option>
            </Select>

            <Button onClick={() => router.push("/boqs1")}>⬅ Back</Button>
            <Button
              type="primary"
              className="bg-blue-600"
              onClick={() => setOpenModal(true)}
            >
              + Raise BOQ
            </Button>
          </div>
        </div>

        {/* Content */}
        {filteredBoqs.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-[60vh] text-center">
            <h2 className="text-2xl font-semibold mb-2">📭 No BOQs Found</h2>
            <p className="text-gray-600 mb-4">
              You haven’t raised any BOQs for this project yet.
            </p>
            <Button
              type="primary"
              className="bg-blue-600"
              onClick={() => setOpenModal(true)}
            >
              + Raise BOQ
            </Button>
          </div>
        ) : (
          <Table
            dataSource={filteredBoqs}
            rowKey="id"
            pagination={false}
            /* your existing columns + expandable config */
            columns={
              [
                /* ... your existing columns ... */
              ]
            }
          />
        )}

        {/* Always render modal here ✅ */}
        {openModal && (
          <RaiseBoq
            project={project}
            userDocId={currentUser.documentId}
            onClose={() => {
              setOpenModal(false);
              fetchProject(currentUser);
            }}
          />
        )}
      </div>
    );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">
          📋 BOQs — {project.project_name}
        </h1>

        <div className="flex gap-3 items-center">
          {/* Filter dropdown */}
          <Select
            value={filterState}
            onChange={(val) => setFilterState(val)}
            style={{ width: 220 }}
          >
            <Option value="All">All States</Option>
            <Option value="Pending Purchase">Pending Purchase</Option>
            <Option value="Pending Approval">Pending Approval</Option>
            <Option value="Approved">Approved</Option>
          </Select>

          <Button onClick={() => router.push("/boqs1")}>⬅ Back</Button>
          <Button
            type="primary"
            className="bg-blue-600"
            onClick={() => setOpenModal(true)}
          >
            + Raise BOQ
          </Button>
        </div>
      </div>

      {/* Table */}
      <Table
        dataSource={filteredBoqs}
        rowKey="id"
        pagination={false}
        expandable={{
          expandedRowRender: (record) => (
            <div className="p-4 bg-gray-50 rounded-md border mt-2">
              <h4 className="font-semibold mb-3">📦 BOQ Items</h4>
              {record.boq_items?.length ? (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-left text-sm">
                      <th className="border p-2">#</th>
                      <th className="border p-2">Name</th>
                      <th className="border p-2">Group</th>
                      <th className="border p-2 text-right">Qty</th>
                      <th className="border p-2 text-right">Price</th>
                      <th className="border p-2 text-right">Total</th>
                      <th className="border p-2">Currency</th>
                      <th className="border p-2">Locked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {record.boq_items.map((item: any, index: number) => (
                      <tr key={index} className="text-sm hover:bg-white">
                        <td className="border p-2">{index + 1}</td>
                        <td className="border p-2">{item.name}</td>
                        <td className="border p-2">{item.group}</td>
                        <td className="border p-2 text-right">{item.qty}</td>
                        <td className="border p-2 text-right">
                          ₹
                          {(record.state === "Pending Purchase" ||
                          record.state === "Pending"
                            ? getLatestPrice(item.name, item.group)
                            : item.price
                          )?.toLocaleString() || 0}
                        </td>
                        <td className="border p-2 text-right">
                          ₹
                          {(
                            (item.qty || 0) *
                            (record.state === "Pending Purchase" ||
                            record.state === "Pending"
                              ? getLatestPrice(item.name, item.group)
                              : item.price)
                          )?.toLocaleString() || 0}
                        </td>
                        <td className="border p-2">{item.currency || "INR"}</td>
                        <td className="border p-2">
                          {item.locked ? "🔒" : "🟢"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-500 italic">
                  No items available for this BOQ.
                </p>
              )}
            </div>
          ),
        }}
        columns={[
          { title: "ID", dataIndex: "id", key: "id" },
          {
            title: "Site Name",
            key: "siteName",
            render: (record) => record.site_1?.name || "—",
          },
          { title: "State", dataIndex: "state", key: "state" },
          {
            title: "Raised By",
            key: "raised_by",
            render: (record) => record.raised_by?.username || "—",
          },
          {
            title: "Total Cost",
            key: "total_cost",
            render: (record) => {
              const dynamicTotal =
                record.state === "Pending Purchase" ||
                record.state === "Pending"
                  ? record.boq_items?.reduce((sum: number, item: any) => {
                      const price = getLatestPrice(item.name, item.group);
                      return sum + (item.qty || 0) * (price || 0);
                    }, 0)
                  : record.total_cost || 0;
              return `₹${dynamicTotal?.toLocaleString() || 0}`;
            },
          },
          { title: "Remarks", dataIndex: "remarks", key: "remarks" },
        ]}
      />

      {/* Raise BOQ Modal */}
      {openModal && (
        <RaiseBoq
          project={project}
          userDocId={currentUser.documentId}
          onClose={() => {
            setOpenModal(false);
            fetchProject(currentUser);
          }}
        />
      )}
    </div>
  );
}
