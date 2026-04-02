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

  // ✅ Fetch all projects
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get("/projects");
      setProjects(res.data.data || []);
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
  const handleSubmit = async () => {
    if (!name || !startDate) {
      message.warning("Please fill all fields");
      return;
    }

    try {
      await api.post("/projects", {
        data: {
          project_name: name,
          state,
          start_date: startDate.format("YYYY-MM-DD"),
        },
      });
      message.success("✅ Project created successfully!");
      setOpenModal(false);
      setName("");
      setState("Ongoing");
      setStartDate(null);
      fetchProjects(); // refresh list
    } catch (error) {
      console.error("❌ Error creating project:", error);
      message.error("Failed to create project");
    }
  };

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
          href={`/projects/${record.documentId}`}
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
        <Button
          type="primary"
          className="bg-blue-600"
          onClick={() => setOpenModal(true)}
        >
          + New Project
        </Button>
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

      {/* ➕ Create Project Modal */}
      <Modal
        title={
          <span className="text-xl font-semibold">Create New Project</span>
        }
        open={openModal}
        onCancel={() => setOpenModal(false)}
        footer={null}
        centered
      >
        <div className="space-y-4 mt-2">
          {/* Project Name */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Project Name
            </label>
            <Input
              placeholder="Enter project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              size="large"
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Start Date
            </label>
            <DatePicker
              className="w-full"
              size="large"
              value={startDate}
              onChange={(date) => setStartDate(date)}
              format="YYYY-MM-DD"
            />
          </div>

          {/* State */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Project State
            </label>
            <Select
              className="w-full"
              size="large"
              value={state}
              onChange={(value) => setState(value)}
            >
              <Option value="Ongoing">Ongoing</Option>
              <Option value="Completed">Completed</Option>
              <Option value="On Hold">On Hold</Option>
            </Select>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-3">
            <Button onClick={() => setOpenModal(false)}>Cancel</Button>
            <Button
              type="primary"
              className="bg-blue-600"
              onClick={handleSubmit}
            >
              Create Project
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
