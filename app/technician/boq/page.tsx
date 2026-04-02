"use client";

import { useEffect, useState } from "react";
import { Table, Spin, Button, message } from "antd";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function BoqsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // ✅ Fetch logged-in user
  const fetchCurrentUser = async () => {
    try {
      const res = await api.get("/users/me?populate=*");
      setCurrentUser(res.data);
    } catch (err) {
      console.error("❌ Failed to fetch user:", err);
    }
  };

  // ✅ Fetch projects (after user is fetched)
  const fetchProjects = async (user: any) => {
    try {
      const res = await api.get(
        "/projects?populate=users_permissions_users&populate=boq_1s"
      );
      const allProjects = res.data.data || [];

      // 🔹 Filter only assigned projects
      const assignedProjects = allProjects.filter((proj: any) =>
        proj.users_permissions_users?.some(
          (u: any) => u.documentId === user.documentId
        )
      );

      // ✅ Optionally allow Admin to see all projects
      const visibleProjects =
        user.role?.name === "Admin" ? allProjects : assignedProjects;

      setProjects(visibleProjects);
    } catch (err) {
      console.error("❌ Failed to load projects:", err);
      message.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      await fetchCurrentUser();
    };
    load();
  }, []);

  // 🔹 When user is ready, load projects
  useEffect(() => {
    if (currentUser) fetchProjects(currentUser);
  }, [currentUser]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <Spin size="large" />
      </div>
    );

  // 🧩 If user has no assigned projects
  if (!projects.length)
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center">
        <h2 className="text-2xl font-semibold mb-3 text-gray-700">
          🚫 No Assigned Projects
        </h2>
        <p className="text-gray-500">
          You are not assigned to any projects currently.
        </p>
        <Button
          type="primary"
          className="mt-4 bg-blue-600"
          onClick={() => router.push("/technician/dashboard")}
        >
          Go to Dashboard
        </Button>
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
          onClick: () => router.push(`/technician/boq/${record.documentId}`),
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
            key: "boqs",
            render: (record) => record.boq_1s?.length || 0,
          },
        ]}
        className="cursor-pointer hover:shadow-lg rounded-lg"
      />
    </div>
  );
}
