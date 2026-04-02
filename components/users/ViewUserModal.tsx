"use client";

import React from "react";
import { Modal, Tag } from "antd";

interface Props {
  open: boolean;
  user: any;
  onClose: () => void;
}

export default function ViewUserModal({ open, user, onClose }: Props) {
  if (!user) return null;

  const role = user.role?.name?.toLowerCase();

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={750}
      title="User Details"
      destroyOnHidden
    >
      <div className="space-y-6">
        {/* BASIC INFO */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Detail label="Username" value={user.username} />
          <Detail label="Email" value={(user.email || "").toLowerCase()} />
          <Detail label="Full Name" value={user.profile?.Full_Name} />
          <Detail label="Phone" value={user.profile?.Phone_Number} />
          <Detail label="Aadhar" value={user.profile?.Aadhar} />
          <Detail label="State" value={user.profile?.State} />
          <Detail label="District" value={user.profile?.District} />
          <Detail label="Assembly" value={user.profile?.Assembly} />
          <Detail label="Village" value={user.profile?.Village} />
          <Detail label="Pincode" value={user.profile?.Pincode} />

          <div>
            <p className="text-gray-500 text-sm">Role</p>
            <Tag color="blue">{user.role?.name || "—"}</Tag>
          </div>

          <div>
            <p className="text-gray-500 text-sm">Status</p>
            <Tag color={user.confirmed ? "green" : "orange"}>
              {user.confirmed ? "Confirmed" : "Pending"}
            </Tag>
          </div>
        </div>

        {/* ASSIGNED AREAS */}
        <div>
          <p className="text-gray-600 text-sm mb-2 font-medium">
            Assigned Areas
          </p>

          {/* District */}
          {role === "district coordinator" &&
            (user.districts?.length ? (
              <div className="flex flex-wrap gap-2">
                {user.districts.map((d: any) => (
                  <Tag key={d.id} color="orange">
                    {d.district_name}
                  </Tag>
                ))}
              </div>
            ) : (
              <EmptyText text="No districts assigned" />
            ))}

          {/* Assembly */}
          {role === "assembly coordinator" &&
            (user.assemblies?.length ? (
              <div className="space-y-2">
                {user.assemblies.map((a: any) => (
                  <div key={a.id} className="border rounded p-2 bg-gray-50">
                    <div className="font-medium text-blue-600">
                      {a.Assembly_Name}
                    </div>
                    <div className="text-xs text-gray-500">
                      District: {a.district?.district_name || "—"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyText text="No assemblies assigned" />
            ))}

          {/* Block */}
          {role === "block coordinator" &&
            (user.blocks?.length ? (
              <div className="flex flex-wrap gap-2">
                {user.blocks.map((b: any) => (
                  <Tag key={b.id} color="green">
                    {b.Block_Name || b.name}
                  </Tag>
                ))}
              </div>
            ) : (
              <EmptyText text="No blocks assigned" />
            ))}

          {/* Booth */}
          {role === "booth coordinator" &&
            (user.locations?.length ? (
              <div className="space-y-2">
                {user.locations.map((l: any) => (
                  <div key={l.id} className="border rounded p-2 bg-gray-50">
                    <div className="font-medium text-cyan-600">{l.PS_Name}</div>
                    <div className="text-xs text-gray-500">
                      Assembly: {l.assembly?.Assembly_Name || "—"}
                    </div>
                    <div className="text-xs text-gray-500">
                      District: {l.assembly?.district?.district_name || "—"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyText text="No booths assigned" />
            ))}
        </div>

        {/* CREATED BY */}
        <Detail label="Created By" value={user.profile?.createdby?.username} />
      </div>
    </Modal>
  );
}

/* ---------- Small Reusable Helpers ---------- */

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-gray-500 text-sm">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <p className="text-gray-400">{text}</p>;
}
