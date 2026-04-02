"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import api from "@/lib/api";
import {
  Collapse,
  Spin,
  Button,
  Popconfirm,
  message,
  Tag,
  Divider,
} from "antd";
import {
  ProjectOutlined,
  UserOutlined,
  ShopOutlined,
  AppstoreOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";

import AssignProductsModal from "@/components/ui/Assignproductsmodal";
import EditPricesModal from "@/components/ui/EditPricesModal";
import AssignUsersModal from "@/components/ui/AssignUsersModal";
import AddSiteModal from "@/components/ui/Assignsitemodal";
import AssignProjectManagerModal from "@/components/ui/AssignProjectManagerModal";

const { Panel } = Collapse;

// ------------------ COMPONENT ------------------
export default function ProjectDetailsPage() {
  const { id } = useParams();
  const docId = Array.isArray(id) ? id[0] : id;

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<Record<string, any>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);

  // Modals
  const [openProducts, setOpenProducts] = useState(false);
  const [openPrices, setOpenPrices] = useState(false);
  const [openUsers, setOpenUsers] = useState(false);
  const [openSiteModal, setOpenSiteModal] = useState(false);
  const [openManagerModal, setOpenManagerModal] = useState(false);

  // ------------------ FETCH PROJECT ------------------
  useEffect(() => {
    if (!docId) return;
    const fetchProject = async () => {
      try {
        const res = await api.get(
          `/projects?filters[documentId][$eq]=${docId}&populate=*`
        );
        const data = res.data?.data?.[0];
        setProject(data);
      } catch (error) {
        console.error("❌ Error fetching project:", error);
        message.error("Failed to fetch project details");
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [docId, openProducts, openPrices, openUsers, openSiteModal]);

  // ------------------ FETCH PRICES ------------------
  useEffect(() => {
    const fetchPrices = async () => {
      if (!project?.assigned_groups) return;
      const allProducts = project.assigned_groups.flatMap(
        (g: any) =>
          g.products?.map((p: any) => (typeof p === "string" ? p : p.name)) ||
          []
      );
      if (allProducts.length === 0) return;
      setLoadingPrices(true);
      try {
        const query = encodeURIComponent(allProducts.join(","));
        const res = await axios.get(`/api/erp-prices?item_codes=${query}`);
        const map: Record<string, any> = {};
        (res.data?.data || []).forEach((item: any) => {
          map[item.item_code] = item;
        });
        setPrices(map);
      } catch (err) {
        console.error("❌ Failed to fetch prices:", err);
      } finally {
        setLoadingPrices(false);
      }
    };
    fetchPrices();
  }, [project]);

  // ------------------ REMOVE USER ------------------
  const handleRemoveUser = async (userId: number) => {
    try {
      await api.put(`/projects/${docId}`, {
        data: {
          users_permissions_users: { disconnect: [userId] },
        },
      });
      message.success("✅ User removed successfully!");
      const res = await api.get(
        `/projects?filters[documentId][$eq]=${docId}&populate=*`
      );
      setProject(res.data.data[0]);
    } catch (err: any) {
      console.error("❌ Failed to remove user:", err);
      message.error("Failed to remove user");
    }
  };

  // ------------------ LOADING STATE ------------------
  if (loading)
    return (
      <div className="flex justify-center items-center h-[80vh] text-gray-600">
        <Spin size="large" />
      </div>
    );

  if (!project)
    return (
      <p className="p-6 text-red-500 font-medium">❌ Project not found.</p>
    );

  const assignedGroups = project?.assigned_groups || [];

  // ------------------ UI ------------------
  return (
    <div className=" space-y-6">
      {/* HEADER */}
      <div className="lg:flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-gray-800 flex items-center gap-2">
            <ProjectOutlined /> {project.project_name || "Unnamed Project"}
          </h1>
          <p className="text-gray-500 mt-1">
            Project Code: {project.project_code || "—"}
          </p>
        </div>
      </div>

      {/* COLLAPSIBLE SECTIONS */}
      <Collapse
        bordered={false}
        expandIconPosition="end"
        className="bg-white rounded-lg shadow-sm"
        defaultActiveKey={["1"]}
      >
        {/* PROJECT DETAILS */}
        <Panel
          header={
            <div className="flex items-center gap-2 font-medium text-gray-800">
              <ProjectOutlined /> Project Details
            </div>
          }
          key="1"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-700">
            <p>
              <strong>State:</strong>{" "}
              <Tag
                color={
                  project.state === "Completed"
                    ? "green"
                    : project.state === "On Hold"
                    ? "orange"
                    : "blue"
                }
              >
                {project.state || "—"}
              </Tag>
            </p>
            <p>
              <strong>Start Date:</strong> {project.start_date || "—"}
            </p>
            <p>
              <strong>Document ID:</strong> {project.documentId}
            </p>
            <p>
              <strong>Project Manager:</strong>{" "}
              {project.project_manager?.username ? (
                <span className="text-blue-600 font-medium">
                  {project.project_manager.username}
                </span>
              ) : (
                <span className="text-gray-500 italic">Not assigned</span>
              )}
            </p>
          </div>
        </Panel>

        {/* SITES */}
        <Panel
          header={
            <div className="flex items-center gap-2 font-medium text-gray-800">
              <ShopOutlined /> Project Sites
            </div>
          }
          key="3"
        >
          {!project.site_1s || project.site_1s.length === 0 ? (
            <p className="text-gray-500">No sites added yet.</p>
          ) : (
            <div className="space-y-3">
              {project.site_1s.map((site: any) => (
                <div
                  key={site.id}
                  className="border border-gray-100 rounded-lg p-3 hover:shadow-sm transition"
                >
                  <p className="font-medium text-gray-800">{site.name}</p>
                  <p className="text-gray-500 text-sm">{site.address || "—"}</p>
                  {site.extra_fields && (
                    <div className="text-sm text-gray-600 mt-1">
                      {Object.entries(site.extra_fields).map(([k, v]) => (
                        <p key={k}>
                          <strong>{k}:</strong> {String(v)}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* PRODUCT GROUPS */}
        <Panel
          header={
            <div className="flex items-center gap-2 font-medium text-gray-800">
              <AppstoreOutlined /> Assigned Product Groups
            </div>
          }
          key="4"
        >
          {assignedGroups.length === 0 ? (
            <p className="text-gray-500">No products assigned yet.</p>
          ) : (
            assignedGroups.map((group: any, i: number) => (
              <div key={i} className="mb-4">
                <Divider orientation="left">{group.group}</Divider>
                <ul className="space-y-1 text-sm text-gray-700">
                  {group.products?.length > 0 ? (
                    group.products.map((prod: any, j: number) => {
                      const name = typeof prod === "string" ? prod : prod.name;
                      const priceInfo = prices[name];
                      const lockedPrice =
                        prod.price ?? priceInfo?.price_list_rate;
                      const isLocked = prod.locked ?? false;
                      return (
                        <li
                          key={j}
                          className="flex justify-between items-center"
                        >
                          <span>{name}</span>
                          <span
                            className={`${
                              isLocked
                                ? "text-green-700 font-medium"
                                : "text-gray-600"
                            }`}
                          >
                            {loadingPrices
                              ? "Loading..."
                              : lockedPrice
                              ? `₹${lockedPrice.toLocaleString()}`
                              : "—"}{" "}
                            {isLocked && "(Locked)"}
                          </span>
                        </li>
                      );
                    })
                  ) : (
                    <p className="text-gray-500 italic">No products added</p>
                  )}
                </ul>
              </div>
            ))
          )}
        </Panel>
      </Collapse>

      {/* BACK BUTTON */}
      <Button
        onClick={() => history.back()}
        icon={<ArrowLeftOutlined />}
        className="mt-4"
      >
        Back
      </Button>

      {/* MODALS */}
      {openProducts && (
        <AssignProductsModal
          projectId={docId}
          onClose={() => setOpenProducts(false)}
        />
      )}
      {openPrices && (
        <EditPricesModal
          projectId={docId}
          onClose={() => setOpenPrices(false)}
        />
      )}
      {openUsers && (
        <AssignUsersModal
          projectId={docId}
          onClose={() => setOpenUsers(false)}
        />
      )}
      {openSiteModal && (
        <AddSiteModal
          projectId={docId}
          onClose={() => setOpenSiteModal(false)}
        />
      )}
      {openManagerModal && (
        <AssignProjectManagerModal
          projectId={docId}
          onClose={() => setOpenManagerModal(false)}
        />
      )}
    </div>
  );
}
