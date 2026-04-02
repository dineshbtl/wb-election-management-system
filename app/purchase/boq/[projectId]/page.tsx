"use client";

import { useEffect, useState } from "react";
import { Button, Spin, message, Table, Select, Tag, Popconfirm } from "antd";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import RaiseBoq from "@/components/ui/Raiseboq";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

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
  const [filterStatus, setFilterStatus] = useState<string>("All");

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

  // ✅ Fetch project + BOQs
  const fetchProject = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `/projects/${projectId}?populate=boq_1s&populate=site_1s`
      );
      const projectData = res.data.data;
      if (!projectData) return;

      const boqsList = projectData.boq_1s || [];

      // Attach site details
      const boqsWithSites = await Promise.all(
        boqsList.map(async (boq: any) => {
          try {
            const siteRes = await api.get(
              `/boq1s/${boq.documentId}?populate=site_1`
            );
            const site = siteRes.data.data?.site_1;
            return { ...boq, site_1: site || null };
          } catch (err) {
            return boq;
          }
        })
      );

      setProject(projectData);
      setBoqs(boqsWithSites);
      setFilteredBoqs(boqsWithSites);
    } catch (err) {
      console.error("❌ Failed to load project:", err);
      message.error("Failed to load project details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  // ✅ Handle filter change
  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
    if (status === "All") {
      setFilteredBoqs(boqs);
    } else {
      setFilteredBoqs(boqs.filter((b) => b.state === status));
    }
  };

  // ✅ Approve a BOQ
  const handleApprove = async (boq: any) => {
    try {
      await api.put(`/boq1s/${boq.documentId}`, {
        data: {
          state: "Pending Approval",
          approved_by: {
            connect: [{ documentId: currentUser?.documentId }],
          },
        },
      });
      message.success(`✅ BOQ ${boq.id} moved to Pending Approval`);
      fetchProject();
    } catch (err) {
      console.error("❌ Failed to approve BOQ:", err);
      message.error("Failed to approve BOQ");
    }
  };

  // ✅ Get latest price for product
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

    if (!product) return 0;
    return typeof product === "object" && product.price ? product.price : 0;
  };

  if (loading || !project)
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <Spin size="large" />
      </div>
    );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">
          📋 BOQs - {project.project_name}
        </h1>
        <Button onClick={() => router.push("/purchase/boq")}>⬅ Back</Button>
      </div>

      {/* Filter */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <span className="font-medium">Filter by State:</span>
          <Select
            value={filterStatus}
            onChange={handleFilterChange}
            style={{ width: 220 }}
          >
            <Option value="All">All</Option>
            <Option value="Pending Purchase">Pending Purchase</Option>
            <Option value="Pending Approval">Pending Approval</Option>
            <Option value="Approved">Approved</Option>
          </Select>
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
                          {getLatestPrice(
                            item.name,
                            item.group
                          ).toLocaleString()}
                        </td>
                        <td className="border p-2 text-right">
                          ₹
                          {(
                            item.qty * getLatestPrice(item.name, item.group)
                          ).toLocaleString()}
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
          {
            title: "State",
            key: "state",
            render: (record) => {
              const colorMap: any = {
                "Pending Purchase": "orange",
                "Pending Approval": "blue",
                Approved: "green",
              };
              return <Tag color={colorMap[record.state]}>{record.state}</Tag>;
            },
          },
          {
            title: "Total Cost",
            key: "total_cost",
            render: (record) => {
              const total =
                record.boq_items?.reduce((sum: number, item: any) => {
                  const price = getLatestPrice(item.name, item.group);
                  return sum + (item.qty || 0) * (price || 0);
                }, 0) || 0;
              return `₹${total.toLocaleString()}`;
            },
          },
          {
            title: "Actions",
            key: "actions",
            render: (record) =>
              record.state === "Pending Purchase" ? (
                <Popconfirm
                  title="Approve this BOQ?"
                  onConfirm={() => handleApprove(record)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button type="primary" className="bg-blue-600">
                    Approve
                  </Button>
                </Popconfirm>
              ) : (
                <span className="text-gray-500 text-sm">—</span>
              ),
          },
        ]}
      />

      {/* Raise BOQ Modal */}
      {openModal && (
        <RaiseBoq
          project={project}
          userDocId={currentUser.documentId}
          onClose={() => {
            setOpenModal(false);
            fetchProject();
          }}
        />
      )}
    </div>
  );
}
