"use client";

import { useEffect, useState } from "react";
import { Modal, Spin, message } from "antd";
import { User, Mail, Phone, MapPin, CreditCard } from "lucide-react";
import api from "@/lib/api";

interface Props {
  open: boolean;
  userDocumentId: string | null;
  onClose: () => void;
}

export default function UserDetailsModal({
  open,
  userDocumentId,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!open || !userDocumentId) return;
    fetchUser();
  }, [open, userDocumentId]);

  const fetchUser = async () => {
    try {
      setLoading(true);

      const res = await api.get(
        `/users?filters[documentId][$eq]=${userDocumentId}&populate[role]=true&populate[profile]=true`,
      );

      const data = res.data?.[0];
      if (!data) throw new Error("User not found");

      setUser(data);
    } catch (err) {
      console.error(err);
      message.error("Failed to load user details");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
      title="User Details"
      destroyOnHidden
    >
      {loading ? (
        <div className="flex justify-center py-12">
          <Spin size="large" />
        </div>
      ) : !user ? (
        <div className="text-center py-10 text-gray-500">
          User details not available
        </div>
      ) : (
        <div className="space-y-6">
          {/* HEADER */}
          <div className="flex items-center gap-4 border-b pb-4">
            {user.profile?.Photo?.url ? (
              <img
                src={user.profile.Photo.url}
                className="w-24 h-24 rounded-lg object-cover border"
              />
            ) : (
              <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center">
                <User className="w-10 h-10 text-gray-400" />
              </div>
            )}

            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                {user.profile?.Full_Name || "—"}
              </h2>
              <p className="text-sm text-gray-500">{user.role?.name || "—"}</p>
            </div>
          </div>

          {/* DETAILS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Detail label="Username" value={user.username} />
            <Detail label="Email" value={(user.email || "").toLowerCase()} icon={<Mail />} />
            <Detail
              label="Phone"
              value={user.profile?.Phone_Number}
              icon={<Phone />}
            />
            <Detail
              label="Aadhaar"
              value={user.profile?.Aadhar}
              icon={<CreditCard />}
            />
            <Detail label="Father Name" value={user.profile?.Father_Name} />
            <Detail label="Mother Name" value={user.profile?.Mother_Name} />
            <Detail label="Village" value={user.profile?.Village} />
            <Detail label="Pincode" value={user.profile?.Pincode} />
            <Detail label="State" value={user.profile?.State} />
            <Detail
              label="Address"
              value={user.profile?.address}
              full
              icon={<MapPin />}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------- Helper ---------- */
function Detail({
  label,
  value,
  icon,
  full,
}: {
  label: string;
  value?: string;
  icon?: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <div className="text-gray-500 flex items-center gap-1">
        {icon && <span className="w-4 h-4">{icon}</span>}
        {label}
      </div>
      <div className="font-medium text-gray-800">{value || "—"}</div>
    </div>
  );
}
