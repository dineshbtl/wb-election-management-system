"use client";

import { useState, useEffect } from "react";
import {
  Table,
  Button,
  Input,
  message,
  Spin,
  Modal,
  Descriptions,
  Tag,
  Image,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

const { Search } = Input;

export default function SurveysPage() {
  const router = useRouter();

  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // For modal
  const [selectedSurvey, setSelectedSurvey] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // 🔹 Fetch surveys
  const fetchSurveys = async (search = "") => {
    setLoading(true);
    try {
      const filterQuery = search
        ? `&filters[$or][0][survey_name][$containsi]=${encodeURIComponent(
            search
          )}&filters[$or][1][survey_purpose][$containsi]=${encodeURIComponent(
            search
          )}`
        : "";

      const res = await api.get(
        `/survey1s?populate=*&pagination[page]=${page}&pagination[pageSize]=${pageSize}${filterQuery}`
      );

      const data = res.data?.data || [];

      const filteredData = currentUser
        ? data.filter(
            (survey: any) =>
              survey.createdBy?.id === currentUser.id || // default Strapi field
              survey.createdby?.documentId === currentUser.documentId // if you use a custom relation field
          )
        : data;

      setSurveys(filteredData);
      setTotal(filteredData.length);
    } catch (err) {
      console.error("❌ Failed to load surveys:", err);
      message.error("Failed to load surveys. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await api.get("/users/me?populate=*");
      setCurrentUser(res.data);
    } catch (err) {
      console.error("❌ Failed to fetch current user:", err);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchSurveys(searchText);
    }
  }, [currentUser, page, pageSize, refreshKey]);

  useEffect(() => {
    fetchSurveys(searchText);
  }, [page, pageSize, refreshKey]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
    fetchSurveys(value);
  };

  const handleReload = () => setRefreshKey((prev) => prev + 1);

  // 📊 Table columns
  const columns = [
    {
      title: "Survey Name",
      dataIndex: "survey_name",
      key: "survey_name",
      render: (text: string) => (
        <span className="font-medium text-gray-800">{text || "—"}</span>
      ),
    },
    {
      title: "Type",
      dataIndex: "survey_type",
      key: "survey_type",
      render: (type: string) => (
        <Tag color={type === "Project" ? "blue" : "green"}>{type || "—"}</Tag>
      ),
    },
    {
      title: "Related To",
      key: "related",
      render: (record: any) =>
        record.survey_type === "Project" ? (
          <div>
            <p>{record.project?.project_name || "—"}</p>
            <p className="text-xs text-gray-500">
              {record.site_1?.name || "—"}
            </p>
          </div>
        ) : (
          <p>
            {record.customer?.customer_name || record.customer?.name || "—"}
          </p>
        ),
    },
    {
      title: "Purpose",
      dataIndex: "survey_purpose",
      key: "survey_purpose",
    },
    {
      title: "Work Status",
      dataIndex: "work_status",
      key: "work_status",
      render: (text: string) => {
        const color =
          text === "Completed"
            ? "green"
            : text === "In Progress"
            ? "blue"
            : "orange";
        return <Tag color={color}>{text || "—"}</Tag>;
      },
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) =>
        date
          ? new Date(date).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "—",
    },
  ];

  // 📋 Handle row click
  const handleRowClick = (record: any) => {
    setSelectedSurvey(record);
    setModalOpen(true);
  };

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">📋 Surveys</h1>
        <div className="flex gap-2">
          <Button
            type="primary"
            className="bg-blue-600"
            icon={<PlusOutlined />}
            onClick={() => router.push("/technician/surveys/new")}
          >
            Add Survey
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReload} />
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 flex justify-between items-center">
        <Search
          placeholder="Search by survey name or purpose..."
          allowClear
          enterButton={<SearchOutlined />}
          onSearch={handleSearch}
          style={{ width: 350 }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center h-[60vh]">
          <Spin size="large" />
        </div>
      ) : (
        <Table
          dataSource={surveys}
          columns={columns}
          rowKey={(record) => record.id || record.documentId}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
            showTotal: (t) => `Total ${t} surveys`,
          }}
          bordered
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
          })}
          className="cursor-pointer"
        />
      )}

      {/* 🧾 Modal for Survey Details */}
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={800}
        title={
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">
              📝 {selectedSurvey?.survey_name || "Survey Details"}
            </h3>
            <Tag color="blue">{selectedSurvey?.survey_type}</Tag>
          </div>
        }
        centered
      >
        {selectedSurvey ? (
          <div className="space-y-4">
            <Descriptions
              bordered
              size="small"
              column={2}
              labelStyle={{ width: "30%", fontWeight: 600 }}
            >
              <Descriptions.Item label="Survey Name">
                {selectedSurvey.survey_name || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Purpose">
                {selectedSurvey.survey_purpose || "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Work Status">
                <Tag
                  color={
                    selectedSurvey.work_status === "Completed"
                      ? "green"
                      : selectedSurvey.work_status === "In Progress"
                      ? "blue"
                      : "orange"
                  }
                >
                  {selectedSurvey.work_status || "—"}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Created At">
                {selectedSurvey.createdAt
                  ? new Date(selectedSurvey.createdAt).toLocaleString("en-IN")
                  : "—"}
              </Descriptions.Item>

              {selectedSurvey.survey_type === "Project" ? (
                <>
                  <Descriptions.Item label="Project Name">
                    {selectedSurvey.project?.project_name || "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Site Name">
                    {selectedSurvey.site_1?.name || "—"}
                  </Descriptions.Item>
                </>
              ) : (
                <Descriptions.Item label="Customer">
                  {selectedSurvey.customer?.customer_name ||
                    selectedSurvey.customer?.name ||
                    "—"}
                </Descriptions.Item>
              )}

              <Descriptions.Item label="Notes" span={2}>
                {selectedSurvey.additional_notes || "—"}
              </Descriptions.Item>
            </Descriptions>

            {/* 📸 Uploaded Images */}
            {selectedSurvey.photo_documentation?.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2 text-gray-700">
                  📸 Photo Documentation
                </h4>
                <div className="flex flex-wrap gap-3">
                  {selectedSurvey.photo_documentation.map(
                    (img: any, i: number) => (
                      <Image
                        key={i}
                        width={120}
                        height={120}
                        src={
                          img.url?.startsWith("http")
                            ? img.url
                            : `http://183.82.117.36:1337${img.url}`
                        }
                        alt="Survey Image"
                        className="rounded-md border object-cover"
                      />
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center items-center h-[200px]">
            <Spin size="large" />
          </div>
        )}
      </Modal>
    </main>
  );
}
