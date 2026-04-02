"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { Input, Select, Upload, Button, message, Spin } from "antd";
import { UploadOutlined, FileAddOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import axios from "axios";
import debounce from "lodash.debounce"; // install with: npm i lodash.debounce

export default function NewSurveyPage() {
  const router = useRouter();

  const [surveyName, setSurveyName] = useState("");
  const [surveyType, setSurveyType] = useState<"Project" | "Customer" | "">("");
  const [projects, setProjects] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedSite, setSelectedSite] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [surveyPurpose, setSurveyPurpose] = useState("");
  const [workStatus, setWorkStatus] = useState("");
  const [photoFiles, setPhotoFiles] = useState<any[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // 🔹 Fetch all projects (for selection)
  useEffect(() => {
    if (surveyType === "Project") {
      api
        .get("/projects?populate=site_1s")
        .then((res) => setProjects(res.data.data))
        .catch(() => message.error("Failed to load projects"));
    }
  }, [surveyType]);

  // 🔹 Fetch customers (ERP)
  useEffect(() => {
    if (surveyType === "Customer") {
      fetchCustomers();
      //  const res =  axios.get(`/api/customers`);
      // .then((res) => setCustomers(res.data.data));
      // .catch(() => message.error("Failed to load customers"));
    }
  }, [surveyType]);

  // 🔹 Fetch Customers (Dynamic with Search)
  const [customerLoading, setCustomerLoading] = useState(false);

  const fetchCustomers = useCallback(async (search: string = "") => {
    setCustomerLoading(true);
    try {
      const res = await axios.get(`/api/customers`, {
        params: { search }, // your backend should support search filtering
      });
      setCustomers(res.data.customers || []);
    } catch (err) {
      console.error("❌ Failed to load customers:", err);
      message.error("Failed to load customers");
    } finally {
      setCustomerLoading(false);
    }
  }, []);

  const debouncedSearch = useRef(
    debounce((value: string) => {
      fetchCustomers(value);
    }, 500)
  ).current;

  // 🔹 Fetch sites for selected project
  useEffect(() => {
    if (selectedProject) {
      api
        .get(
          `/site1s?filters[project][documentId][$eq]=${selectedProject.documentId}`
        )
        .then((res) => setSites(res.data.data))
        .catch(() => message.error("Failed to load sites"));
    } else {
      setSites([]);
    }
  }, [selectedProject]);

  const fetchCurrentUser = async () => {
    try {
      const res = await api.get("/users/me?populate=*");
      setCurrentUser(res.data);
    } catch (err) {
      console.error("❌ Failed to fetch current user:", err);
    }
  };

  // ✅ 3. UseEffect
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // 🔹 Submit
  const handleSubmit = async () => {
    if (!surveyName || !surveyType) {
      message.warning("Please fill all required fields.");
      return;
    }

    setLoading(true);
    try {
      const uploadedImages = await Promise.all(
        photoFiles.map(async (file) => {
          const formData = new FormData();
          formData.append("files", file.originFileObj);
          const res = await api.post("/upload", formData);
          return res.data[0];
        })
      );

      const payload = {
        data: {
          survey_name: surveyName,
          survey_type: surveyType,
          project:
            surveyType === "Project" && selectedProject
              ? { connect: [{ documentId: selectedProject.documentId }] }
              : undefined,
          site_1:
            surveyType === "Project" && selectedSite
              ? { connect: [{ documentId: selectedSite.documentId }] }
              : undefined,
          customer:
            surveyType === "Customer" && selectedCustomer
              ? {
                  name: selectedCustomer.name,
                  customer_name: selectedCustomer.customer_name,
                }
              : undefined,

          survey_purpose: surveyPurpose,
          work_status: workStatus,
          photo_documentation: uploadedImages.map((img) => img.id),
          additional_notes: additionalNotes,
          createdby: { connect: [{ documentId: currentUser?.documentId }] }, // ✅ explicit link
        },
      };

      await api.post("/survey1s", payload);
      message.success("✅ Survey created successfully!");
      router.push("/technician/surveys");
    } catch (err: any) {
      console.error("❌ Failed to create survey:", err);
      message.error(
        err.response?.data?.error?.message || "Failed to create survey"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <Spin size="large" />
      </div>
    );

  return (
    <div className="p-8">
      <div className="bg-white shadow-md rounded-xl p-8 border border-gray-200 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <FileAddOutlined className="text-blue-600 text-xl" />
          <h1 className="text-2xl font-semibold text-gray-800">New Survey</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            placeholder="Enter Survey Name"
            value={surveyName}
            onChange={(e) => setSurveyName(e.target.value)}
            size="large"
          />

          <Select
            placeholder="Select Survey Type"
            value={surveyType}
            onChange={(v) => {
              setSurveyType(v);
              setSelectedProject(null);
              setSelectedSite(null);
              setSelectedCustomer(null);
            }}
            size="large"
            options={[
              { label: "Project", value: "Project" },
              { label: "Customer", value: "Customer" },
            ]}
          />
        </div>

        {surveyType === "Project" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Select
              showSearch
              placeholder="Select Project"
              value={selectedProject?.documentId}
              onChange={(val) => {
                const proj = projects.find((p) => p.documentId === val);
                setSelectedProject(proj);
              }}
              options={projects.map((p) => ({
                label: p.project_name,
                value: p.documentId,
              }))}
              size="large"
            />

            <Select
              showSearch
              placeholder="Select Site"
              value={selectedSite?.documentId}
              onChange={(val) => {
                const site = sites.find((s) => s.documentId === val);
                setSelectedSite(site);
              }}
              options={sites.map((s) => ({
                label: s.name,
                value: s.documentId,
              }))}
              size="large"
            />
          </div>
        )}

        {surveyType === "Customer" && (
          <div className="mt-4">
            <Select
              showSearch
              placeholder="Search or Select Customer"
              value={selectedCustomer?.name} // ERP customer ID
              loading={customerLoading}
              onSearch={(val) => debouncedSearch(val)}
              onFocus={() => fetchCustomers("")} // initial fetch
              onChange={(val) => {
                const cust = customers.find((c) => c.name === val);
                setSelectedCustomer(cust);
              }}
              filterOption={false}
              options={customers.map((c) => ({
                label: `${c.customer_name} (${c.name})`,
                value: c.name, // ERP's unique ID
              }))}
              size="large"
              notFoundContent={
                customerLoading ? "Loading..." : "No customers found"
              }
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Select
            placeholder="Select Survey Purpose"
            value={surveyPurpose}
            onChange={(v) => setSurveyPurpose(v)}
            size="large"
            options={[
              { label: "Site Survey", value: "Site Survey" },
              { label: "Installation Check", value: "Installation Check" },
              { label: "Maintenance", value: "Maintenance" },
            ]}
          />

          <Select
            placeholder="Select Work Status"
            value={workStatus}
            onChange={(v) => setWorkStatus(v)}
            size="large"
            options={[
              { label: "Pending", value: "Pending" },
              { label: "In Progress", value: "In Progress" },
              { label: "Completed", value: "Completed" },
            ]}
          />
        </div>

        <div className="mt-4">
          <Upload
            multiple
            listType="picture"
            beforeUpload={() => false}
            onChange={({ fileList }) => setPhotoFiles(fileList)}
          >
            <Button icon={<UploadOutlined />}>Upload Photos</Button>
          </Upload>
        </div>

        <div className="mt-4">
          <Input.TextArea
            placeholder="Add additional notes..."
            rows={4}
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={() => router.back()}>Cancel</Button>
          <Button
            type="primary"
            className="bg-blue-600"
            size="large"
            loading={loading}
            onClick={handleSubmit}
          >
            Submit Survey
          </Button>
        </div>
      </div>
    </div>
  );
}
