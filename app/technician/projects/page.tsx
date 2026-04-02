"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { Button, Modal, Input, Select, DatePicker, message, Table } from "antd";
import dayjs from "dayjs";

const { Option } = Select;

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  const [name, setName] = useState("");
  const [state, setState] = useState("Ongoing");
  const [startDate, setStartDate] = useState<any>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchCurrentUser = async () => {
    try {
      const res = await api.get("/users/me?populate=*");
      setCurrentUser(res.data);
    } catch (err) {
      console.error("❌ Failed to fetch current user:", err);
      message.error("Session expired. Please log in again.");
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchProjects();
    }
  }, [currentUser]);

  // ✅ Fetch all projects
  const fetchProjects = async () => {
    if (!currentUser) return; // wait until user is loaded
    try {
      setLoading(true);
      const res = await api.get("/projects?populate=users_permissions_users");
      const allProjects = res.data.data || [];

      // ✅ Filter: only include projects where user is assigned
      const assignedProjects = allProjects.filter((proj: any) =>
        proj.users_permissions_users?.some(
          (u: any) => u.documentId === currentUser.documentId
        )
      );

      setProjects(assignedProjects);
    } catch (err) {
      console.error("❌ Failed to fetch projects:", err);
      message.error("Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // ✅ Handle new project creation

  // ✅ Columns for the table
  const columns = [
    {
      title: "Project Name",
      dataIndex: "project_name",
      key: "project_name",
      render: (text: string) => (
        <span className="font-medium">{text || "—"}</span>
      ),
    },
    {
      title: "State",
      dataIndex: "state",
      key: "state",
      render: (text: string) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            text === "Completed"
              ? "bg-green-100 text-green-700"
              : text === "On Hold"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {text || "—"}
        </span>
      ),
    },
    {
      title: "Start Date",
      dataIndex: "start_date",
      key: "start_date",
      render: (text: string) =>
        text
          ? new Date(text).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "—",
    },
    {
      title: "Actions",
      key: "actions",
      render: (record: any) => (
        <Link
          href={`/technician/projects/${record.documentId}`}
          className="text-blue-600 hover:underline"
        >
          View Details
        </Link>
      ),
    },
  ];

  return (
    <div className="">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-2xl font-semibold text-gray-800">📁 Projects</h1>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={projects}
        loading={loading}
        rowKey={(record) => record.id || record.documentId}
        pagination={false}
        bordered
        className="rounded-lg shadow-sm"
      />
    </div>
  );
}
