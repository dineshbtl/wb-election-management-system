"use client";

import { useEffect, useState } from "react";
import { Button, Spin, message, Table } from "antd";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import RaiseBoq from "@/components/ui/Raiseboq";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function ProjectBoqsPage() {
  const { projectId } = useParams();
  const router = useRouter();

  const [project, setProject] = useState<any>(null);
  const [boqs, setBoqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(null);

  // const currentUser = { documentId: "auptpj0o0jxtqmt7dnykxac8" };

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

  // ✅ Fetch project and BOQs with site info
  const fetchProject = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `/projects/${projectId}?populate=boq_1s&populate=site_1s`
      );
      const projectData = res.data.data;

      if (!projectData) {
        setProject(null);
        setBoqs([]);
        return;
      }

      const boqsList = projectData.boq_1s || [];

      // Fetch site details for each BOQ
      const boqsWithSites = await Promise.all(
        boqsList.map(async (boq: any) => {
          try {
            const siteRes = await api.get(
              `/boq1s/${boq.documentId}?populate=site_1`
            );
            const site = siteRes.data.data?.site_1;
            return { ...boq, site_1: site || null };
          } catch (err) {
            console.error(`⚠️ Failed to fetch site for BOQ ${boq.id}`, err);
            return boq;
          }
        })
      );

      setProject(projectData);
      setBoqs(boqsWithSites);
    } catch (err) {
      console.error("❌ Failed to load project:", err);
      message.error("Failed to load project details");
    } finally {
      setLoading(false);
    }
  };

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

  const handleDownloadTemplate = () => {
    if (!project) return message.warning("Project not loaded yet.");

    console.log("project", project);

    // 🧭 Get all sites under this project
    const sites = project.site_1s || project.sites || [];

    // 🧭 Get all products under this project (grouped)
    const allProducts =
      project?.assigned_groups?.flatMap((groupItem: any) =>
        (groupItem.products || []).map((product: any) => {
          const productName =
            typeof product === "string"
              ? product
              : product?.name || JSON.stringify(product);
          return {
            name: productName,
            group: groupItem.group,
          };
        })
      ) || [];

    if (sites.length === 0) {
      return message.warning("No sites available for this project.");
    }

    if (allProducts.length === 0) {
      return message.warning("No products found in this project.");
    }

    // 🧾 Create Excel data header
    const headerRow = ["Site Name", ...allProducts.map((p) => p.name)];

    // 🧾 Each site = one row
    const rows = sites.map((site: any) => {
      const row: any = {};
      row["Site Name"] = site.name;
      allProducts.forEach((p) => {
        row[p.name] = ""; // empty quantity to fill later
      });
      return row;
    });

    // 🧾 Convert to worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: headerRow });

    // 🧾 Workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BOQ Template");

    // 🧾 Save file
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });

    saveAs(blob, `${project.project_name || "project"}_BOQ_Template.xlsx`);
  };

  const handleUploadExcel = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      // Get products for reference
      const allProducts =
        project?.assigned_groups?.flatMap((groupItem: any) =>
          (groupItem.products || []).map((product: any) => {
            const productName =
              typeof product === "string"
                ? product
                : product?.name || JSON.stringify(product);
            return { name: productName, group: groupItem.group };
          })
        ) || [];

      const sites = project.site_1s || [];

      // 🧾 Loop through each row and create BOQ if needed
      for (const row of rows) {
        const siteName = row["Site Name"];
        if (!siteName) continue;

        const siteMatch = sites.find(
          (s: any) =>
            s.name?.trim().toLowerCase() === siteName.trim().toLowerCase()
        );

        if (!siteMatch) {
          console.warn(`⚠️ No site found for ${siteName}, skipping.`);
          continue;
        }

        const boqItems = [];
        for (const product of allProducts) {
          const qty = Number(row[product.name]) || 0;
          if (qty > 0) {
            boqItems.push({
              name: product.name,
              group: product.group,
              qty,
              price: 0,
              total: 0,
              currency: "INR",
              locked: false,
            });
          }
        }

        if (boqItems.length === 0) continue;

        const payload = {
          data: {
            project: { connect: [{ documentId: project.documentId }] },
            site_1: { connect: [{ documentId: siteMatch.documentId }] },
            raised_by: { connect: [{ documentId: currentUser?.documentId }] },
            boq_items: boqItems,
            total_cost: 0,
            state: "Pending Purchase",
            remarks: "Bulk Upload",
          },
        };

        await api.post("/boq1s", payload);
      }

      message.success("✅ BOQs uploaded successfully!");
      fetchProject(); // Refresh list
    } catch (err) {
      console.error("❌ Upload failed:", err);
      message.error("Failed to upload Excel. Check file format.");
    } finally {
      e.target.value = ""; // reset file input
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

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
        <div className="flex gap-3">
          <Button onClick={() => router.push("/boqs1")}>⬅ Back</Button>
          <Button
            type="primary"
            className="bg-blue-600"
            onClick={() => setOpenModal(true)}
          >
            + Raise BOQ
          </Button>
          <Button type="default" onClick={() => handleDownloadTemplate()}>
            📥 Download Template
          </Button>
          <Button
            type="default"
            onClick={() => document.getElementById("excelInput")?.click()}
          >
            📤 Upload Excel
          </Button>
          <input
            id="excelInput"
            type="file"
            accept=".xlsx, .xls"
            style={{ display: "none" }}
            onChange={handleUploadExcel}
          />
        </div>
      </div>

      {/* Table of Existing BOQs */}
      <Table
        dataSource={boqs}
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
                          {(() => {
                            const currentPrice =
                              record.state === "Pending Purchase" ||
                              record.state === "Pending"
                                ? getLatestPrice(item.name, item.group)
                                : item.price;
                            return `₹${currentPrice?.toLocaleString() || 0}`;
                          })()}
                        </td>

                        <td className="border p-2 text-right">
                          {(() => {
                            const currentPrice =
                              record.state === "Pending Purchase" ||
                              record.state === "Pending"
                                ? getLatestPrice(item.name, item.group)
                                : item.price;
                            const total = (item.qty || 0) * (currentPrice || 0);
                            return `₹${total?.toLocaleString() || 0}`;
                          })()}
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
          rowExpandable: (record) => record.boq_items?.length > 0,
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
            fetchProject();
          }}
        />
      )}
    </div>
  );
}
