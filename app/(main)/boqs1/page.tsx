"use client";

import { useEffect, useState } from "react";
import { Table, Spin, Button, message } from "antd";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function BoqsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        // ✅ Your API returns flattened data — no attributes needed
        const res = await api.get("/projects?populate=*");
        setProjects(res.data.data || []);
      } catch (err) {
        console.error("❌ Failed to load projects:", err);
        message.error("Failed to load projects");
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <Spin size="large" />
      </div>
    );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">📋 Select a Project</h1>
      <Table
        rowKey="id"
        dataSource={projects}
        pagination={false}
        onRow={(record) => ({
          onClick: () => router.push(`/boqs1/${record.documentId}`), // ✅ Use documentId for URL
        })}
        columns={[
          {
            title: "Project Name",
            dataIndex: "project_name",
            key: "project_name",
          },
          {
            title: "Project Code",
            dataIndex: "project_code",
            key: "project_code",
          },
          {
            title: "State",
            dataIndex: "state",
            key: "state",
          },
          {
            title: "BOQs",
            render: (r) => r.boq_1s?.length || 0,
          },
        ]}
      />
    </div>
  );
}
