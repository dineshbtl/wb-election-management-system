"use client";

import { useEffect, useState } from "react";
import { Modal, Spin, Input, message, Button, Tag, Select } from "antd";
import api from "@/lib/api";

interface Props {
  open: boolean;
  userDocumentId: string | null;
  onClose: () => void;
  onUpdated?: () => void; // refresh parent
}

export default function EditUserModal({
  open,
  userDocumentId,
  onClose,
  onUpdated,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [assignedDistricts, setAssignedDistricts] = useState<string[]>([]);
  const [assignedAssemblies, setAssignedAssemblies] = useState<string[]>([]);
  const [assignedBlocks, setAssignedBlocks] = useState<string[]>([]);
  const [assignedLocations, setAssignedLocations] = useState<string[]>([]);

  const [districts, setDistricts] = useState<any[]>([]);
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedAssembly, setSelectedAssembly] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const res = await api.get(
        `/users/me?populate[role]=*&populate[assemblies]=*`,
      );
      setCurrentUser(res.data);
    };

    fetchCurrentUser();
  }, []);

  const [form, setForm] = useState<any>({
    username: "",
    email: "",
    Full_Name: "",
    Phone_Number: "",
    Father_Name: "",
    Mother_Name: "",
    Village: "",
    Pincode: "",
    State: "",
    address: "",
    Aadhar: "",
  });

  useEffect(() => {
    if (!open || !userDocumentId) return;
    fetchUser();
  }, [open, userDocumentId]);

  useEffect(() => {
    if (
      user?.role?.type === "booth_coordinator" &&
      currentUser?.role?.type === "assembly_coordinator" &&
      currentUser.assemblies?.length
    ) {
      const assemblyDocId = currentUser.assemblies[0].documentId;
      fetchLocations(assemblyDocId);
    }
  }, [currentUser, user]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      //   const res = await api.get(
      //     `/users?filters[documentId][$eq]=${userDocumentId}&populate[role]=true&populate[profile]=true&populate[districts]=true`,
      //   );

      // const res = await api.get(
      //   `/users?` +
      //     `filters[documentId][$eq]=${userDocumentId}&` +
      //     `populate[role]=*&` +
      //     `populate[profile]=*&` +
      //     `populate[districts]=*&` +
      //     `populate[assemblies]=*&` +
      //     `populate[blocks]=*&` +
      //     `populate[locations]=*`,

      // );

      const res = await api.get(
        `/users?` +
          `filters[documentId][$eq]=${userDocumentId}&` +
          `populate[role]=*&` +
          `populate[profile]=*&` +
          `populate[districts]=*&` +
          `populate[assemblies][populate][district]=*&` +
          `populate[locations][populate][assembly][populate][district]=*`,
      );

      const data = res.data?.[0];
      if (!data) throw new Error("User not found");

      setUser(data);
      const distRes = await api.get("/districts?pagination[pageSize]=1000");

      setDistricts(distRes.data.data || []);

      setAssignedDistricts(
        Array.from(
          new Map(
            (data.districts || []).map((d: any) => [d.documentId, d]),
          ).keys(),
        ),
      );

      setAssignedAssemblies(
        data.assemblies?.map((a: any) => a.documentId) || [],
      );

      setAssignedBlocks(data.blocks?.map((b: any) => b.documentId) || []);

      setAssignedLocations([
        ...new Set(data.locations?.map((l: any) => l.documentId) || []),
      ]);

      setAssignedDistricts(
        Array.from(
          new Map(
            (data.districts || []).map((d: any) => [d.documentId, d]),
          ).keys(),
        ),
      );

      setAssignedAssemblies(
        data.assemblies?.map((a: any) => a.documentId) || [],
      );

      setAssignedBlocks(data.blocks?.map((b: any) => b.documentId) || []);

      setAssignedLocations([
        ...new Set(data.locations?.map((l: any) => l.documentId) || []),
      ]);

      /* =====================================================
   🔥 ADD THIS BLOCK RIGHT HERE
===================================================== */

      if (
        data.role?.type === "assembly_coordinator" &&
        data.assemblies?.length
      ) {
        const firstAssembly = data.assemblies[0];

        if (firstAssembly?.district?.documentId) {
          setSelectedDistrict(firstAssembly.district.documentId);
          await fetchAssemblies(firstAssembly.district.documentId);
        }
      }

      if (data.role?.type === "block_coordinator" && data.blocks?.length) {
        const firstBlock = data.blocks[0];

        const assemblyDocId = firstBlock?.assembly?.documentId;
        const districtDocId = firstBlock?.assembly?.district?.documentId;

        if (districtDocId) {
          setSelectedDistrict(districtDocId);
          await fetchAssemblies(districtDocId);
        }

        if (assemblyDocId) {
          setSelectedAssembly(assemblyDocId);
          await fetchBlocks(assemblyDocId);
        }
      }

      if (data.role?.type === "booth_coordinator" && data.locations?.length) {
        const firstLocation = data.locations[0];

        const assemblyDocId = firstLocation?.assembly?.documentId;
        const districtDocId = firstLocation?.assembly?.district?.documentId;

        if (districtDocId) {
          setSelectedDistrict(districtDocId);
          await fetchAssemblies(districtDocId);
        }

        if (assemblyDocId) {
          setSelectedAssembly(assemblyDocId);
          await fetchLocations(assemblyDocId);
        }
      }

      /* ===================================================== */

      setForm({
        username: data.username || "",
        email: data.email || "",
        Full_Name: data.profile?.Full_Name || "",
        Phone_Number: data.profile?.Phone_Number || "",
        Father_Name: data.profile?.Father_Name || "",
        Mother_Name: data.profile?.Mother_Name || "",
        Village: data.profile?.Village || "",
        Pincode: data.profile?.Pincode || "",
        State: data.profile?.State || "",
        address: data.profile?.address || "",
        Aadhar: data.profile?.Aadhar || "",
      });

      // setForm({
      //   username: data.username || "",
      //   email: data.email || "",
      //   Full_Name: data.profile?.Full_Name || "",
      //   Phone_Number: data.profile?.Phone_Number || "",
      //   Father_Name: data.profile?.Father_Name || "",
      //   Mother_Name: data.profile?.Mother_Name || "",
      //   Village: data.profile?.Village || "",
      //   Pincode: data.profile?.Pincode || "",
      //   State: data.profile?.State || "",
      //   address: data.profile?.address || "",
      //   Aadhar: data.profile?.Aadhar || "",
      // });
    } catch (err) {
      console.error(err);
      message.error("Failed to load user");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssemblies = async (districtDocId: string) => {
    const res = await api.get(
      `/assemblies?filters[district][documentId][$eq]=${districtDocId}&pagination[pageSize]=1000`,
    );
    setAssemblies(res.data.data || []);
  };

  const fetchBlocks = async (assemblyDocId: string) => {
    const res = await api.get(
      `/blocks?filters[assembly][documentId][$eq]=${assemblyDocId}&pagination[pageSize]=1000`,
    );
    setBlocks(res.data.data || []);
  };

  const fetchLocations = async (assemblyDocId: string) => {
    const res = await api.get(
      `/locations?filters[assembly][documentId][$eq]=${assemblyDocId}&pagination[pageSize]=1000`,
    );
    setLocations(res.data.data || []);
  };

  //   const handleUpdate = async () => {
  //     if (!user) return;

  //     console.log("Assigned Districts:", assignedDistricts);

  //     try {
  //       setSubmitting(true);

  //       // 1️⃣ Update User (username + email)
  //       await api.put(`/users/${user.id}`, {
  //         username: form.username,
  //         email: form.email,
  //         // districts: assignedDistricts,
  //         // assemblies: assignedAssemblies,
  //         // blocks: assignedBlocks,
  //         // locations: assignedLocations,
  //       });

  //       // 2️⃣ Update Profile (separate collection)
  //       if (user.profile?.documentId) {
  //         await api.put(`/app-users/${user.profile.documentId}`, {
  //           data: {
  //             Full_Name: form.Full_Name,
  //             Phone_Number: form.Phone_Number,
  //             Father_Name: form.Father_Name,
  //             Mother_Name: form.Mother_Name,
  //             Village: form.Village,
  //             Pincode: form.Pincode,
  //             State: form.State,
  //             address: form.address,
  //             Aadhar: form.Aadhar,
  //           },
  //         });
  //       }

  //       message.success("User updated successfully");

  //       onClose();
  //       onUpdated?.();
  //     } catch (err) {
  //       console.error(err);
  //       message.error("Failed to update user");
  //     } finally {
  //       setSubmitting(false);
  //     }
  //   };

  const handleUpdate = async () => {
    if (!user) return;

    try {
      setSubmitting(true);

      /* 1️⃣ Update user basic info */
      await api.put(`/users/${user.id}`, {
        username: form.username,
        email: form.email,
      });

      /* 2️⃣ Update profile */
      if (user.profile?.documentId) {
        await api.put(`/app-users/${user.profile.documentId}`, {
          data: {
            Full_Name: form.Full_Name,
            Phone_Number: form.Phone_Number,
            Father_Name: form.Father_Name,
            Mother_Name: form.Mother_Name,
            Village: form.Village,
            Pincode: form.Pincode,
            State: form.State,
            address: form.address,
            Aadhar: form.Aadhar,
          },
        });
      }

      /* 3️⃣ ROLE-BASED ASSIGNMENT UPDATE */

      const roleType = user.role?.type?.toLowerCase();

      /* ---------- DISTRICT COORDINATOR ---------- */
      if (roleType === "district_coordinator") {
        // Remove old assignments
        for (const district of user.districts || []) {
          await api.put(`/districts/${district.documentId}`, {
            data: { district_coordinator: null },
          });
        }

        // Assign new ones
        for (const districtDocId of assignedDistricts) {
          await api.put(`/districts/${districtDocId}`, {
            data: { district_coordinator: user.id },
          });
        }
      }

      /* ---------- ASSEMBLY COORDINATOR ---------- */
      if (roleType === "assembly_coordinator") {
        for (const assembly of user.assemblies || []) {
          await api.put(`/assemblies/${assembly.documentId}`, {
            data: { assembly_coordinator: null },
          });
        }

        for (const assemblyDocId of assignedAssemblies) {
          await api.put(`/assemblies/${assemblyDocId}`, {
            data: { assembly_coordinator: user.id },
          });
        }
      }

      /* ---------- BLOCK COORDINATOR ---------- */
      if (roleType === "block_coordinator") {
        for (const block of user.blocks || []) {
          await api.put(`/blocks/${block.documentId}`, {
            data: { block_coordinator: null },
          });
        }

        for (const blockDocId of assignedBlocks) {
          await api.put(`/blocks/${blockDocId}`, {
            data: { block_coordinator: user.id },
          });
        }
      }

      /* ---------- BOOTH COORDINATOR ---------- */
      if (roleType === "booth_coordinator") {
        for (const location of user.locations || []) {
          await api.put(`/locations/${location.documentId}`, {
            data: { booth_coordinator: null },
          });
        }

        for (const locationDocId of assignedLocations) {
          await api.put(`/locations/${locationDocId}`, {
            data: { booth_coordinator: user.id },
          });
        }
      }

      message.success("User updated successfully");
      onClose();
      onUpdated?.();
    } catch (err) {
      console.error(err);
      message.error("Failed to update user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
      title="Edit User"
      destroyOnHidden
    >
      {loading ? (
        <div className="flex justify-center py-12">
          <Spin size="large" />
        </div>
      ) : !user ? (
        <div className="text-center py-10 text-gray-500">User not found</div>
      ) : (
        <div className="space-y-4">
          {/* Basic Info */}
          <Section title="Account Information">
            <Field
              label="Username"
              value={form.username}
              onChange={(val) => setForm({ ...form, username: val })}
            />
            <Field
              label="Email"
              value={form.email}
              onChange={(val) => setForm({ ...form, email: val })}
            />
          </Section>

          {/* Profile Info */}
          <Section title="Profile Information">
            <Field
              label="Full Name"
              value={form.Full_Name}
              onChange={(val) => setForm({ ...form, Full_Name: val })}
            />
            <Field
              label="Phone Number"
              value={form.Phone_Number}
              onChange={(val) => setForm({ ...form, Phone_Number: val })}
            />
            <Field
              label="Father Name"
              value={form.Father_Name}
              onChange={(val) => setForm({ ...form, Father_Name: val })}
            />
            <Field
              label="Mother Name"
              value={form.Mother_Name}
              onChange={(val) => setForm({ ...form, Mother_Name: val })}
            />
            <Field
              label="Village"
              value={form.Village}
              onChange={(val) => setForm({ ...form, Village: val })}
            />
            <Field
              label="Pincode"
              value={form.Pincode}
              onChange={(val) => setForm({ ...form, Pincode: val })}
            />
            <Field
              label="State"
              value={form.State}
              onChange={(val) => setForm({ ...form, State: val })}
            />
            <Field
              label="Aadhar"
              value={form.Aadhar}
              onChange={(val) => setForm({ ...form, Aadhar: val })}
            />
            <Field
              label="Address"
              value={form.address}
              onChange={(val) => setForm({ ...form, address: val })}
              textarea
            />
          </Section>

          <div className="mt-4">
            <div className="text-gray-600 text-sm mb-2 font-medium">
              Assigned Areas
            </div>

            {/* District Coordinator */}
            {user.role?.type === "district_coordinator" && (
              <Select
                mode="multiple"
                value={assignedDistricts}
                onChange={setAssignedDistricts}
                className="w-full"
                placeholder="Select Districts"
                options={districts.map((d: any) => ({
                  label: d.district_name,
                  value: d.documentId,
                }))}
              />
            )}

            {/* Assembly Coordinator */}
            {user.role?.type === "assembly_coordinator" && (
              <>
                <Select
                  placeholder="Select District"
                  className="w-full mb-2"
                  value={selectedDistrict || undefined}
                  onChange={(val) => {
                    setSelectedDistrict(val);
                    setSelectedAssembly(null);

                    setAssemblies([]);
                    setAssignedAssemblies([]);

                    fetchAssemblies(val);
                  }}
                  options={districts.map((d: any) => ({
                    label: d.district_name,
                    value: d.documentId,
                  }))}
                />

                <Select
                  mode="multiple"
                  placeholder="Select Assemblies"
                  value={assignedAssemblies}
                  onChange={setAssignedAssemblies}
                  disabled={!selectedDistrict}
                  className="w-full"
                  options={assemblies.map((a: any) => ({
                    label: a.Assembly_Name,
                    value: a.documentId,
                  }))}
                />
              </>
            )}

            {/* Block Coordinator */}
            {user.role?.type === "block_coordinator" && (
              <>
                <Select
                  placeholder="Select District"
                  className="w-full mb-2"
                  value={selectedDistrict || undefined}
                  onChange={(val) => {
                    setSelectedDistrict(val);
                    setSelectedAssembly(null);

                    setAssemblies([]);
                    setLocations([]);
                    setAssignedLocations([]);

                    fetchAssemblies(val);
                  }}
                  options={districts.map((d: any) => ({
                    label: d.district_name,
                    value: d.documentId,
                  }))}
                />

                <Select
                  placeholder="Select Assembly"
                  className="w-full mb-2"
                  disabled={!selectedDistrict}
                  onChange={(val) => {
                    setSelectedAssembly(val);
                    fetchBlocks(val);
                  }}
                  options={assemblies.map((a: any) => ({
                    label: a.Assembly_Name,
                    value: a.documentId,
                  }))}
                />

                <Select
                  mode="multiple"
                  value={assignedBlocks}
                  onChange={setAssignedBlocks}
                  disabled={!selectedAssembly}
                  className="w-full"
                  placeholder="Select Blocks"
                  options={blocks.map((b: any) => ({
                    label: b.Block_Name,
                    value: b.documentId,
                  }))}
                />
              </>
            )}

            {/* Booth Coordinator */}
            {user.role?.type === "booth_coordinator" && (
              <>
                {/* If logged-in user is Assembly Coordinator */}
                {currentUser?.role?.type === "assembly_coordinator" ? (
                  <Select
                    mode="multiple"
                    value={assignedLocations}
                    onChange={setAssignedLocations}
                    className="w-full"
                    placeholder="Select Booth Locations"
                    options={locations.map((l: any) => ({
                      label: l.PS_Name,
                      value: l.documentId,
                    }))}
                  />
                ) : (
                  <>
                    {/* NORMAL FLOW (Superadmin / District Coordinator) */}

                    <Select
                      placeholder="Select District"
                      className="w-full mb-2"
                      value={selectedDistrict || undefined}
                      onChange={async (val) => {
                        setSelectedDistrict(val);
                        await fetchAssemblies(val);
                      }}
                      options={districts.map((d: any) => ({
                        label: d.district_name,
                        value: d.documentId,
                      }))}
                    />

                    <Select
                      placeholder="Select Assembly"
                      className="w-full mb-2"
                      disabled={!selectedDistrict}
                      onChange={async (val) => {
                        setSelectedAssembly(val);
                        await fetchLocations(val);
                      }}
                      options={assemblies.map((a: any) => ({
                        label: a.Assembly_Name,
                        value: a.documentId,
                      }))}
                    />

                    <Select
                      mode="multiple"
                      value={assignedLocations}
                      onChange={setAssignedLocations}
                      className="w-full"
                      placeholder="Select Booth Locations"
                      options={locations.map((l: any) => ({
                        label: l.PS_Name,
                        value: l.documentId,
                      }))}
                    />
                  </>
                )}
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" onClick={handleUpdate} loading={submitting}>
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------- UI Components ---------- */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-md font-semibold text-gray-700 mb-2 mt-4">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  textarea?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-gray-500 text-sm">{label}</div>
      {textarea ? (
        <Input.TextArea
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}
