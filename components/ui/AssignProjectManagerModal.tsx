"use client";

import { useState, useEffect } from "react";
import { Modal, Select, Button, Spin, message } from "antd";
import api from "@/lib/api";

const { Option } = Select;

export default function AssignProjectManagerModal({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 🔹 Fetch available users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await api.get("/users?populate=role");
        setUsers(res.data || []);
      } catch (err) {
        console.error("❌ Failed to load users:", err);
        message.error("Failed to load users");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // 🔹 Submit manager assignment
  const handleAssign = async () => {
    if (!selectedUser) {
      message.warning("Please select a user to assign as Project Manager");
      return;
    }

    setSaving(true);
    try {
      await api.put(`/projects/${projectId}`, {
        data: {
          project_manager: selectedUser,
        },
      });

      message.success("✅ Project Manager assigned successfully!");
      onClose();
    } catch (err) {
      console.error("❌ Failed to assign manager:", err);
      message.error("Failed to assign Project Manager");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={
        <span className="text-lg font-semibold">Assign Project Manager</span>
      }
      open={true}
      onCancel={onClose}
      footer={null}
      centered
    >
      {loading ? (
        <div className="flex justify-center items-center h-32">
          <Spin size="large" />
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-600">
            Select a user to assign as the manager for this project.
          </p>

          <Select
            showSearch
            placeholder="Select user"
            value={selectedUser}
            onChange={(value) => setSelectedUser(value)}
            optionFilterProp="children"
            className="w-full"
            size="large"
          >
            {users.map((user) => (
              <Option key={user.id} value={user.id}>
                {user.username}{" "}
                <span className="text-gray-500 text-xs">
                  ({user.role?.name || "User"})
                </span>
              </Option>
            ))}
          </Select>

          <div className="flex justify-end gap-2 pt-3">
            <Button onClick={onClose}>Cancel</Button>
            <Button
              type="primary"
              className="bg-cyan-600"
              onClick={handleAssign}
              loading={saving}
            >
              Assign Manager
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
