"use client";

import React, { useEffect, useState } from "react";
import { Input, Select, Upload, message, Spin } from "antd";
import { Button } from "@/components/ui/button";
import { UploadOutlined } from "@ant-design/icons";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import axios from "axios";

const { Option } = Select;

export default function BlockCoordinatorPage() {
  const [form, setForm] = useState({
    Full_Name: "",
    email: "",
    password: "",
    phone_Number: "",
    State: "",
    District: "",
    Assembly: "",
    Aadhar: "",
    Father_Name: "",
    Mother_Name: "",
    Bank_or_UPI: "",
    Village: "",
    Pincode: "",
    address: "",
    Photo: null as File | null,
    role: "", // Add role field
  });

  const [token1, setToken] = useState<string | null>(null);

  const [districts, setDistricts] = useState<any[]>([]);
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]); // Add roles state
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const url = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("token");
      console.log("Stored Token from localStorage:", storedToken);
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (token1) {
      fetchUser();
      // fetchDistricts();
      fetchRoles(); // Fetch roles
    }
  }, [token1]);

  // Fetch roles
  const fetchRoles = async () => {
    try {
      const res = await api.get(
        `/users-permissions/roles?pagination[pageSize]=1000`,
      );
      console.log("Fetched roles:", res.data);
      setRoles(res.data.roles || []);
    } catch (err) {
      console.error("Error fetching roles:", err);
    }
  };

  // Fetch logged-in user (for created_by)
  const fetchUser = async () => {
    console.log("token1:", token1);
    try {
      // First get current user ID
      const meRes = await api.get(`/users/me?populate=*`);
      const userId = meRes.data?.id;
      console.log("User ID from /me:", userId);

      // Then fetch full user data with all details
      const res = await api.get(`/users/${userId}?populate=*`);
      setUser(res.data);
      console.log("✅ Fetched user data:", res.data);
    } catch (err) {
      console.error("Error fetching user:", err);
      message.error("Failed to fetch user details.");
    }
  };

  // Fetch districts
  // const fetchDistricts = async () => {
  //   try {
  //     const res = await api.get(`/districts?pagination[pageSize]=1000`);
  //     setDistricts(res.data.data);
  //   } catch (err) {
  //     console.error("Error fetching districts:", err);
  //   }
  // };

  // Fetch assemblies by selected district documentId
  // const fetchAssemblies = async (districtDocId: string) => {
  //   try {
  //     const res = await axios.get(
  //       `${url}/assemblies?filters[district][documentId][$eq]=${districtDocId}&pagination[pageSize]=1000`,
  //       { headers: { Authorization: `Bearer ${token1}` } },
  //     );
  //     setAssemblies(res.data.data);
  //   } catch (err) {
  //     console.error("Error fetching assemblies:", err);
  //   }
  // };

  // Handle Submit
  const handleSubmit = async () => {
    if (
      !form.Full_Name ||
      !form.email ||
      !form.password ||
      !form.phone_Number ||
      !form.District ||
      !form.role
    ) {
      message.warning("Please fill all required fields.");
      return;
    }

    setLoading(true);
    try {
      if (!user?.documentId) {
        message.error("Unable to identify current user. Please re-login.");
        return;
      }

      // Find selected District and Assembly names
      const selectedDistrict = districts.find(
        (d) => d.documentId === form.District,
      );
      const selectedAssembly = assemblies.find(
        (a) => a.documentId === form.Assembly,
      );

      // STEP 1️⃣: Register user via /auth/local/register
      console.log("Step 1: Registering user with /auth/local/register");
      const registerRes = await axios.post(
        `${url}/auth/local/register`,
        {
          username: form.email,
          email: form.email,
          password: form.password,
        },
        { headers: { Authorization: `Bearer ${token1}` } },
      );

      const newUserId = registerRes.data?.user?.id;
      if (!newUserId) {
        throw new Error("User not created via auth/local/register");
      }
      console.log("✅ User registered:", newUserId);

      // STEP 2️⃣: Create app-user profile with additional fields
      console.log("Step 2: Creating app-user profile");
      const appUserPayload = {
        data: {
          Full_Name: form.Full_Name,
          email: form.email,
          Phone_Number: form.phone_Number,
          State: form.State,
          Aadhar: form.Aadhar,
          Father_Name: form.Father_Name,
          Mother_Name: form.Mother_Name,
          Bank_or_UPI: form.Bank_or_UPI,
          Village: form.Village,
          Pincode: form.Pincode,
          address: form.address,
          District: selectedDistrict?.district_name || "",
          Assembly: selectedAssembly?.Assembly_Name || "",
          createdby: user.documentId,
          // createdby_appuser: user.documentId,
        },
      };

      const appUserRes = await axios.post(`${url}/app-users`, appUserPayload, {
        headers: { Authorization: `Bearer ${token1}` },
      });
      console.log("✅ App-user created:", appUserRes.data);

      const appUserId = appUserRes.data?.data?.id;
      if (!appUserId) {
        throw new Error("App-user not created");
      }

      // STEP 3️⃣: Link app-user to user via profile field
      console.log("Step 3: Linking app-user to user via profile field");
      await axios.put(
        `${url}/users/${newUserId}`,
        {
          role: parseInt(form.role), // Convert role ID to number
          profile: appUserId, // Link app-user to user
        },
        { headers: { Authorization: `Bearer ${token1}` } },
      );
      console.log("✅ User role updated and app-user linked");

      // STEP 4️⃣: Upload photo if selected
      if (form.Photo) {
        const formData = new FormData();
        // Use Strapi v4+ format: files.fieldName
        formData.append("files.Photo", form.Photo);
        // Add empty data object (required by Strapi)
        formData.append("data", JSON.stringify({}));

        await axios.put(
          `${url}/app-users/${appUserRes.data?.data?.id || appUserRes.data?.id}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token1}`,
              // Don't set Content-Type - let browser set it with boundary
            },
          },
        );
        console.log("✅ Photo uploaded");
      }

      message.success(
        "User created successfully with role assigned and linked to profile!",
      );
      // Reset form
      setForm({
        Full_Name: "",
        email: "",
        password: "",
        phone_Number: "",
        State: "",
        District: "",
        Assembly: "",
        Aadhar: "",
        Father_Name: "",
        Mother_Name: "",
        Bank_or_UPI: "",
        Village: "",
        Pincode: "",
        address: "",
        Photo: null,
        role: "",
      });
      router.push("/assembly/coordinators");
    } catch (err: any) {
      console.error("Error creating user:", err);
      message.error(
        err.response?.data?.error?.message || "Failed to create user.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!user)
    return (
      <div className="flex justify-center items-center h-screen">
        <Spin size="large" />
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full mx-auto bg-white  rounded-2xl p-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          Add Block Level Coordinator
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input
            placeholder="Full Name"
            value={form.Full_Name}
            onChange={(e) => setForm({ ...form, Full_Name: e.target.value })}
          />
          <Input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input.Password
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <Input
            placeholder="Phone Number"
            value={form.phone_Number}
            onChange={(e) => setForm({ ...form, phone_Number: e.target.value })}
          />

          {/* 👤 Select Role */}
          <Select
            placeholder="Select Role *"
            value={form.role || undefined}
            onChange={(value) => setForm({ ...form, role: value })}
          >
            {roles.map((r: any) => (
              <Option key={r.id} value={r.id.toString()}>
                {r.name}
              </Option>
            ))}
          </Select>

          <Input
            placeholder="Aadhar"
            value={form.Aadhar}
            onChange={(e) => setForm({ ...form, Aadhar: e.target.value })}
          />
          <Input
            placeholder="Father's Name"
            value={form.Father_Name}
            onChange={(e) => setForm({ ...form, Father_Name: e.target.value })}
          />
          <Input
            placeholder="Mother's Name"
            value={form.Mother_Name}
            onChange={(e) => setForm({ ...form, Mother_Name: e.target.value })}
          />
          <Input
            placeholder="Bank / UPI ID"
            value={form.Bank_or_UPI}
            onChange={(e) => setForm({ ...form, Bank_or_UPI: e.target.value })}
          />
          <Input
            placeholder="Village"
            value={form.Village}
            onChange={(e) => setForm({ ...form, Village: e.target.value })}
          />
          <Input
            placeholder="Pincode"
            value={form.Pincode}
            onChange={(e) => setForm({ ...form, Pincode: e.target.value })}
          />
          <Input
            placeholder="State"
            value={form.State}
            onChange={(e) => setForm({ ...form, State: e.target.value })}
          />
          <Input
            placeholder="District"
            value={form.District}
            onChange={(e) => setForm({ ...form, District: e.target.value })}
          />
          <Input
            placeholder="Assembly"
            value={form.Assembly}
            onChange={(e) => setForm({ ...form, Assembly: e.target.value })}
          />

          {/* 🏛️ Select District */}
          {/* <Select
            placeholder="Select District"
            value={form.District || undefined}
            onChange={(value) => {
              setForm({ ...form, District: value, Assembly: "" });
              // fetchAssemblies(value);
            }}
          >
            {districts.map((d) => (
              <Option key={d.documentId} value={d.documentId}>
                {d.district_name}
              </Option>
            ))}
          </Select> */}

          {/* 🗳️ Select Assembly */}
          {/* <Select
            placeholder="Select Assembly"
            value={form.Assembly || undefined}
            onChange={(value) => setForm({ ...form, Assembly: value })}
            disabled={!form.District}
          >
            {assemblies.map((a) => (
              <Option key={a.documentId} value={a.documentId}>
                {a.Assembly_Name}
              </Option>
            ))}
          </Select> */}

          {/* 📸 Photo Upload */}
          <Upload
            beforeUpload={(file) => {
              setForm({ ...form, Photo: file });
              return false;
            }}
            maxCount={1}
            accept="image/*"
          >
            <Button className="bg-green-500 text-white hover:bg-green-600">
              <UploadOutlined /> Upload Photo
            </Button>
          </Upload>

          {/* 🏠 Address */}
          <div className="col-span-2">
            <Input.TextArea
              placeholder="Address"
              rows={3}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button
            onClick={handleSubmit}
            className="bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] hover:from-[#2d7ae8] hover:to-[#1976D2] text-white border-0"
            disabled={loading}
          >
            {loading ? <Spin size="small" /> : "Create Coordinator"}
          </Button>
        </div>
      </div>
    </div>
  );
}
