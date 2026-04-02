"use client";

import { useEffect, useState } from "react";
import { Button, Spin, message } from "antd";
import api from "@/lib/api";
import AddSiteModal from "@/components/ui/AddSiteModal";
import DownloadTemplateModal from "@/components/ui/DownloadTemplateModal";
import BulkUploadModal from "@/components/ui/BulkUploadModal";
import { useRouter } from "next/navigation";
import CustomersPage from "@/components/ui/Customerslist";

export default function SitesPage() {
  const [view, setView] = useState<"projects" | "customers" | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [openAddSite, setOpenAddSite] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [openDownloadTemplate, setOpenDownloadTemplate] = useState(false);
  const [openBulkUpload, setOpenBulkUpload] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const router = useRouter();

  // 🔹 Fetch Projects
  useEffect(() => {
    if (view === "projects" && currentUser) {
      setLoading(true);
      api
        .get("/projects?populate=users_permissions_users&populate=site_1s")
        .then((res) => {
          const allProjects = res.data.data || [];

          // ✅ Filter only projects assigned to current user
          const assignedProjects = allProjects.filter((proj: any) =>
            proj.users_permissions_users?.some(
              (u: any) => u.documentId === currentUser.documentId
            )
          );

          setProjects(assignedProjects);
        })
        .catch((err) => {
          console.error("❌ Failed to load projects:", err);
          message.error("Failed to load projects");
        })
        .finally(() => setLoading(false));
    }
  }, [view, refresh, currentUser]);

  // 🔹 Refresh handler after adding site
  const handleCloseAddSite = () => {
    setOpenAddSite(false);
    setRefresh(!refresh);
  };

  const handleViewSite = (site: any) => {
    router.push(`/technician/sites/${site.documentId}`);
  };

  // ✅ Get current logged-in user
  const fetchCurrentUser = async () => {
    try {
      const res = await api.get("/users/me?populate=*");
      setCurrentUser(res.data);
    } catch (err) {
      console.error("❌ Failed to fetch user:", err);
      message.error("Session expired. Please log in again.");
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // 🔹 Initial View (Projects or Customers)
  if (!view) {
    return (
      <div className="flex flex-col justify-center items-center h-[80vh] gap-6">
        <h1 className="text-2xl font-semibold">🏗️ Manage Sites</h1>
        <p className="text-gray-500">Choose what you want to manage:</p>

        <div className="flex gap-6">
          <Button
            type="primary"
            className="bg-blue-600 px-6 py-2 text-lg"
            onClick={() => setView("projects")}
          >
            📁 Projects
          </Button>
          <Button
            className="bg-green-600 text-white px-6 py-2 text-lg"
            onClick={() => setView("customers")}
          >
            👥 Customers
          </Button>
        </div>
      </div>
    );
  }

  // 🔹 Projects View
  if (view === "projects") {
    if (loading)
      return (
        <div className="flex justify-center items-center h-[80vh]">
          <Spin size="large" />
        </div>
      );

    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold mb-4">🏗️ Project Sites</h1>
          <Button onClick={() => setView(null)}>⬅ Back</Button>
        </div>

        {!selectedProject ? (
          <>
            <h2 className="text-lg font-medium mb-2 text-gray-800">
              Select a project to view sites
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project: any) => (
                <div
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className="border rounded-lg p-4 cursor-pointer transition hover:shadow-lg hover:border-blue-600"
                >
                  <h3 className="text-lg font-medium text-gray-800">
                    {project.project_name}
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Code: {project.project_code || "—"}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    {project.site_1s?.length || 0} site(s)
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <ProjectSitesPaginatedView
            selectedProject={selectedProject}
            onBack={() => setSelectedProject(null)}
            onViewSite={handleViewSite}
            openAddSite={openAddSite}
            setOpenAddSite={setOpenAddSite}
            openBulkUpload={openBulkUpload}
            setOpenBulkUpload={setOpenBulkUpload}
            openDownloadTemplate={openDownloadTemplate}
            setOpenDownloadTemplate={setOpenDownloadTemplate}
            handleCloseAddSite={handleCloseAddSite}
          />
        )}

        {openAddSite && (
          <AddSiteModal
            projectId={selectedProject.documentId}
            onClose={handleCloseAddSite}
          />
        )}

        {openDownloadTemplate && (
          <DownloadTemplateModal
            projectId={selectedProject.documentId}
            onClose={() => setOpenDownloadTemplate(false)}
          />
        )}

        {openBulkUpload && (
          <BulkUploadModal
            projectId={selectedProject.documentId}
            onClose={() => setOpenBulkUpload(false)}
          />
        )}
      </div>
    );
  }

  // 🔹 Customers View (placeholder for future)
  if (view === "customers") {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold mb-4">👥 Customer Sites</h1>
          <Button onClick={() => setView(null)}>⬅ Back</Button>
        </div>

        {/* <p className="text-gray-500 italic">
          (Customer view will be implemented later)
        </p> */}
        <CustomersPage />
      </div>
    );
  }
}

import { Table, Input } from "antd";
const { Search } = Input;

function ProjectSitesPaginatedView({
  selectedProject,
  onBack,
  onViewSite,
  openAddSite,
  setOpenAddSite,
  openBulkUpload,
  setOpenBulkUpload,
  openDownloadTemplate,
  setOpenDownloadTemplate,
  handleCloseAddSite,
}: any) {
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchText, setSearchText] = useState("");

  // 🔹 Fetch paginated sites from Strapi
  useEffect(() => {
    const fetchSites = async () => {
      setLoading(true);
      try {
        const filters = searchText
          ? `&filters[$or][0][name][$containsi]=${encodeURIComponent(
              searchText
            )}&filters[$or][1][address][$containsi]=${encodeURIComponent(
              searchText
            )}`
          : "";

        const res = await api.get(
          `/site1s?filters[project][documentId][$eq]=${selectedProject.documentId}&pagination[page]=${page}&pagination[pageSize]=20&populate=*&sort[0]=createdAt:desc${filters}`
        );

        setSites(res.data.data || []);
        setTotal(res.data.meta.pagination.total || 0);
      } catch (err) {
        console.error("❌ Failed to load sites:", err);
        message.error("Failed to load sites.");
      } finally {
        setLoading(false);
      }
    };

    fetchSites();
  }, [selectedProject, page, searchText]);

  const columns = [
    {
      title: "Site Name",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: any) => (
        <div>
          <p className="font-medium text-gray-800">{text}</p>
          <p className="text-xs text-gray-500">
            {record.address || "No address"}
          </p>
        </div>
      ),
    },
    {
      title: "Coordinates",
      key: "coords",
      render: (record: any) => (
        <span className="text-gray-500 text-sm">
          📍 {record.latitude || "—"}, {record.longitude || "—"}
        </span>
      ),
    },
    {
      title: "Extra Fields",
      key: "extra",
      render: (record: any) =>
        record.extra_fields ? (
          <div className="text-xs text-gray-600">
            {Object.entries(record.extra_fields).map(([k, v]: any) => (
              <p key={k}>
                <strong>{k}:</strong> {String(v)}
              </p>
            ))}
          </div>
        ) : (
          "—"
        ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (record: any) => (
        <Button
          size="small"
          className="border-blue-600 text-blue-600"
          onClick={() => onViewSite(record)}
        >
          View Details
        </Button>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-5 mt-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-semibold text-gray-800">
          {selectedProject.project_name} — Sites
        </h2>
        <div className="flex gap-2">
          <Button onClick={onBack}>⬅ Back</Button>
          <Button
            type="default"
            className="border-blue-600 text-blue-600"
            onClick={() => setOpenDownloadTemplate(true)}
          >
            ⬇ Download Template
          </Button>
          <Button
            type="default"
            className="border-green-600 text-green-600"
            onClick={() => setOpenBulkUpload(true)}
          >
            ⬆ Bulk Upload
          </Button>
          <Button
            type="primary"
            className="bg-blue-600"
            onClick={() => setOpenAddSite(true)}
          >
            + Add Site
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex justify-between items-center mb-4">
        <Search
          placeholder="Search by site name or address..."
          allowClear
          enterButton
          onSearch={(val) => {
            setSearchText(val);
            setPage(1);
          }}
          style={{ width: 350 }}
        />
      </div>

      {/* Table */}
      <Table
        dataSource={sites}
        columns={columns}
        loading={loading}
        rowKey={(record) => record.id || record.documentId}
        pagination={{
          current: page,
          total,
          pageSize: 20,
          showSizeChanger: false,
          onChange: (p) => setPage(p),
          showTotal: (t) => `Total ${t} sites`,
        }}
        bordered
        className="rounded-lg"
      />

      {/* Modals */}
      {openAddSite && (
        <AddSiteModal
          projectId={selectedProject.documentId}
          onClose={handleCloseAddSite}
        />
      )}
      {openDownloadTemplate && (
        <DownloadTemplateModal
          projectId={selectedProject.documentId}
          onClose={() => setOpenDownloadTemplate(false)}
        />
      )}
      {openBulkUpload && (
        <BulkUploadModal
          projectId={selectedProject.documentId}
          onClose={() => setOpenBulkUpload(false)}
        />
      )}
    </div>
  );
}
