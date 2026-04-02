"use client";

import { useEffect, useState } from "react";
import { Modal, Select, Button, message, Spin } from "antd";
import api from "@/lib/api";

const { Option } = Select;

interface User {
  id: number;
  username: string;
  email: string;
}

interface AssignUsersModalProps {
  projectId: string | number;
  onClose: () => void;
}

export default function AssignUsersModal({
  projectId,
  onClose,
}: AssignUsersModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<number[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 1️⃣ Load all users from Strapi
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await api.get("/users"); // ✅ Strapi's default users
        setUsers(res.data || []);
      } catch (err) {
        message.error("❌ Failed to fetch users");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // 2️⃣ Load already assigned users for this project
  useEffect(() => {
    const fetchAssigned = async () => {
      try {
        const res = await api.get(
          `/projects?filters[documentId][$eq]=${projectId}&populate=*`
        );
        const projectData = res.data?.data?.[0];

        const assigned = projectData?.users_permissions_users || [];
        const assignedIds = assigned.map((u: any) => u.id);

        setAssignedUsers(assignedIds);
      } catch (err) {
        console.error("❌ Failed to load assigned users:", err);
      }
    };
    fetchAssigned();
  }, [projectId]);

  // 3️⃣ Filter out already assigned users
  const availableUsers = users.filter((u) => !assignedUsers.includes(u.id));

  // 4️⃣ Save newly assigned users
  const handleSave = async () => {
    if (selectedUsers.length === 0) {
      message.warning("Please select at least one user.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        data: {
          users_permissions_users: {
            connect: selectedUsers, // ✅ add only new users
          },
        },
      };

      await api.put(`/projects/${projectId}`, payload);
      message.success("✅ Users assigned successfully!");
      onClose();
    } catch (err: any) {
      console.error("❌ Save failed:", err);
      message.error(
        `Failed to assign users: ${
          err.response?.data?.error?.message || err.message
        }`
      );
    } finally {
      setSaving(false);
    }
  };

  // ------------------ UI ------------------
  return (
    <Modal
      open
      title="Assign Users to Project"
      onCancel={onClose}
      footer={null}
      width={600}
      centered
    >
      {loading ? (
        <div className="flex justify-center py-6">
          <Spin size="large" />
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-600">
            Select users to assign to this project:
          </p>

          {/* User Multi-Select */}
          <Select
            mode="multiple"
            placeholder={
              availableUsers.length > 0
                ? "Select users"
                : "✅ All users already assigned"
            }
            value={selectedUsers}
            onChange={(values) => setSelectedUsers(values)}
            style={{ width: "100%" }}
            optionFilterProp="children"
            filterOption={(input, option) =>
              (option?.children as string)
                .toLowerCase()
                .includes(input.toLowerCase())
            }
            disabled={availableUsers.length === 0}
          >
            {availableUsers.map((user) => (
              <Option key={user.id} value={user.id}>
                {user.username} ({(user.email || "").toLowerCase()})
              </Option>
            ))}
          </Select>

          {/* Buttons */}
          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={onClose}>Cancel</Button>
            <Button
              type="primary"
              onClick={handleSave}
              loading={saving}
              disabled={selectedUsers.length === 0}
            >
              Save Users
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
