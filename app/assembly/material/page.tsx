"use client";

import React, { useEffect, useState } from "react";
import { Table, Modal, message, Spin, Tag } from "antd";
import { Button } from "@/components/ui/button";
import axios from "axios";
import dayjs from "dayjs";
import bpi from "@/lib/bpi";

export default function AssemblyDispatchPage() {
  const [user, setUser] = useState<any>(null);
  const [assembly, setAssembly] = useState<any>(null);
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState<any>(null);

  const baseurl = process.env.NEXT_PUBLIC_API_URL;
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL;

  // 🔹 Fetch logged-in user and assigned assembly
  const fetchUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token)
        return message.error("No auth token found. Please login again.");

      const res = await axios.get(`${baseurl}/users/me?populate=*`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const currentUser = res.data.user || res.data;
      setUser(currentUser);

      if (!currentUser) {
        message.error("Failed to fetch logged-in user.");
        setLoading(false);
        return;
      }

      const userAssembly = currentUser?.assemblies?.[0];
      if (!userAssembly) {
        message.warning("No assembly assigned to this user.");
        setLoading(false);
        return;
      }
      setAssembly(userAssembly);

      fetchDispatches(userAssembly.documentId);
    } catch (err) {
      console.error("Error fetching user:", err);
      message.error("Failed to fetch user details.");
      setLoading(false);
    }
  };

  // 🔹 Fetch dispatches sent to this assembly
  const fetchDispatches = async (assemblyDocId: string) => {
    try {
      // populate=* ensures we receive related entities consistently (from_district, to_assembly, Photo, etc.)
      const res = await bpi.get(
        `/dispatches?filters[to_assembly][documentId][$eq]=${assemblyDocId}&populate=*`,
      );
      setDispatches(res.data.data || []);
    } catch (err) {
      console.error("Error fetching dispatches:", err);
      message.error("Failed to fetch dispatches.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Confirm Receipt
  const handleConfirmReceived = async () => {
    if (!selectedDispatch) return;

    try {
      await bpi.put(`/dispatches/${selectedDispatch.documentId}`, {
        data: {
          State: "Delivered",
          Received_By:
            user?.Full_Name || user?.username || "Assembly Coordinator",
          Received_On: new Date(),
        },
      });

      message.success("Dispatch marked as received successfully!");
      setConfirmModalOpen(false);
      fetchDispatches(assembly.documentId);
    } catch (err) {
      console.error("Error confirming receipt:", err);
      message.error("Failed to update dispatch status.");
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        <Spin size="large" />
      </div>
    );

  return (
    <div className="py-10 px-6">
      <div className="w-full mx-auto bg-white rounded-2xl shadow-md p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            Material Dispatches to{" "}
            <span className="text-blue-600">
              {assembly?.Assembly_Name || "—"}
            </span>
          </h2>
        </div>

        {dispatches.length === 0 ? (
          <p className="text-gray-500 italic">
            No dispatches found for this assembly.
          </p>
        ) : (
          <Table
            dataSource={dispatches}
            rowKey="documentId"
            pagination={{ pageSize: 5 }}
            columns={[
              {
                title: "From District",
                render: (_: any, record: any) =>
                  // from_district is returned as an array in this API -> show first item's name
                  record.from_district?.[0]?.district_name ||
                  record.from_district?.district_name ||
                  "—",
              },
              {
                title: "Material",
                dataIndex: "Material_Name",
                render: (val) => val || "—",
              },
              //   {
              //     title: "To Assembly",
              //     render: (_: any, record: any) =>
              //       record.to_assembly?.[0]?.Assembly_Name ||
              //       record.to_assembly?.Assembly_Name ||
              //       "—",
              //   },
              {
                title: "Quantity",
                dataIndex: "Quantity",
                render: (val) => val || "—",
              },
              {
                title: "Dispatched By",
                dataIndex: "Dispatched_By",
                render: (val) => val || "—",
              },
              {
                title: "Remarks",
                dataIndex: "Remarks",
                render: (val) => val || "—",
              },
              {
                title: "Status",
                dataIndex: "State",
                render: (val) => (
                  <Tag
                    color={
                      val === "Delivered"
                        ? "green"
                        : val === "Pending"
                          ? "gold"
                          : "default"
                    }
                  >
                    {val}
                  </Tag>
                ),
              },
              {
                title: "Dispatched On",
                dataIndex: "Dispatched_On",
                render: (date) =>
                  date ? dayjs(date).format("DD MMM YYYY") : "—",
              },
              {
                title: "Received On",
                dataIndex: "Received_On",
                render: (date) =>
                  date ? dayjs(date).format("DD MMM YYYY") : "—",
              },
              {
                title: "Photo",
                dataIndex: "Photo",
                render: (_: any, record: any) => {
                  // support multiple shapes: direct url, nested attributes, or array
                  const raw = record.Photo;
                  const url =
                    raw?.url ||
                    raw?.data?.attributes?.url ||
                    (Array.isArray(raw) ? raw[0]?.url : undefined) ||
                    raw?.data?.attributes?.photo?.data?.attributes?.url;

                  if (!url) return "—";
                  const src = url.startsWith("http") ? url : `${backend}${url}`;
                  return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt="Dispatch"
                      className="w-16 h-16 object-cover rounded-md border"
                    />
                  );
                },
              },
              {
                title: "Action",
                render: (record: any) =>
                  record.State === "Pending" ? (
                    <Button
                      className="bg-green-500 hover:bg-green-600 text-white"
                      onClick={() => {
                        setSelectedDispatch(record);
                        setConfirmModalOpen(true);
                      }}
                    >
                      Confirm Received
                    </Button>
                  ) : (
                    <span className="text-green-600 font-semibold">
                      ✔ Received
                    </span>
                  ),
              },
            ]}
          />
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal
        title="Confirm Material Receipt"
        open={confirmModalOpen}
        onCancel={() => setConfirmModalOpen(false)}
        footer={null}
        centered
      >
        <div className="space-y-4 text-center">
          <p className="text-gray-700">
            Are you sure you want to confirm receipt of this material?
          </p>
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => setConfirmModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-500 hover:bg-green-600 text-white"
              onClick={handleConfirmReceived}
            >
              Yes, Confirm Received
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
