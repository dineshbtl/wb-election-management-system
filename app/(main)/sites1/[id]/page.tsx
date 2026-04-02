"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { Button, Spin, message } from "antd";
import RaiseBoqModal from "@/components/ui/RaiseBoqModal";
import useCurrentUser from "@/components/layout/GetcurrentUser";
import AddProductInstallationModal from "@/components/ui/AddInstallationModal";

export default function SiteDetailsPage() {
  const { id } = useParams();
  const docId = Array.isArray(id) ? id[0] : id;

  const [site, setSite] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [boqs, setBoqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openBoq, setOpenBoq] = useState(false);
  const [expandedBoq, setExpandedBoq] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(false);
  const [activeBoqForInstall, setActiveBoqForInstall] = useState<any | null>(
    null
  );
  const [activeInstallProduct, setActiveInstallProduct] = useState<any | null>(
    null
  );

  const [installedProducts, setInstalledProducts] = useState<any[]>([]);

  const { user } = useCurrentUser();

  // 🔹 Fetch site + project + boqs
  useEffect(() => {
    if (!docId) return;

    const fetchSiteDetails = async () => {
      try {
        setLoading(true);
        const siteRes = await api.get(
          `/site1s?filters[documentId][$eq]=${docId}&populate=project`
        );
        const siteData = siteRes.data?.data?.[0];
        setSite(siteData);

        if (siteData?.project?.documentId) {
          const projectRes = await api.get(
            `/projects?filters[documentId][$eq]=${siteData.project.documentId}&populate=*`
          );
          setProject(projectRes.data?.data?.[0]);
        }

        // 🧾 Fetch all BOQs for this site
        const boqRes = await api.get(
          `/boq1s?filters[site_1][documentId][$eq]=${docId}` +
            `&populate[raised_by][fields][0]=username&populate[raised_by][fields][1]=email` +
            `&populate[approved_by][fields][0]=username&populate[approved_by][fields][1]=email` +
            `&populate[confirmed_by][fields][0]=username&populate[confirmed_by][fields][1]=email`
        );

        // ⚙️ Fetch all installed products for this site
        const installedRes = await api.get(
          `/installed-products?filters[site][documentId][$eq]=${docId}&populate=installed_by&populate=installation_images`
        );
        setInstalledProducts(installedRes.data?.data || []);

        setBoqs(boqRes.data?.data || []);
      } catch (err) {
        console.error("❌ Failed to load site:", err);
        message.error("Failed to load site details");
      } finally {
        setLoading(false);
      }
    };

    fetchSiteDetails();
  }, [docId, openBoq, refresh]);

  // 🔹 Handle Approve BOQ
  const handleApprove = async (boqDocId: string) => {
    try {
      await api.put(`/boq1s/${boqDocId}`, {
        data: {
          state: "Approved",
          approved_by: user?.id ? user.id : undefined,
        },
      });
      message.success("✅ BOQ Approved!");
      setRefresh(!refresh);
    } catch (err) {
      console.error("❌ Approve failed:", err);
      message.error("Failed to approve BOQ");
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <Spin size="large" />
      </div>
    );

  if (!site)
    return <p className="text-center text-red-500 mt-10">❌ Site not found.</p>;

  const allProducts =
    project?.assigned_groups?.flatMap((groupItem: any) =>
      (groupItem.products || []).map((product: any) => {
        const productName =
          typeof product === "string"
            ? product
            : product?.name || JSON.stringify(product); // safely extract

        return {
          name: productName,
          group: groupItem.group,
          qty: 1,
          price:
            typeof product === "object" && product?.price ? product.price : 0,
          currency:
            typeof product === "object" && product?.currency
              ? product.currency
              : "INR",
          locked: typeof product === "object" && !!product?.locked,
        };
      })
    ) || [];

  const handleUpdateStatus = async (item: any, newStatus: string) => {
    const reason = prompt(`Enter reason for marking this as ${newStatus}:`);
    if (!reason) return;

    try {
      await api.put(`/installed-products/${item.documentId}`, {
        data: {
          state: newStatus,
          remarks: reason,
        },
      });

      message.success(`✅ Marked as ${newStatus}`);
      setRefresh(!refresh); // reload site data
    } catch (err) {
      console.error("❌ Failed to update status:", err);
      message.error("Failed to update status");
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 🔙 Back & Title */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">
          {site.name || "Unnamed Site"}
        </h1>
        <Button onClick={() => history.back()}>⬅ Back</Button>
      </div>

      {/* 📍 Site Info */}
      <div className="bg-white p-4 rounded-lg shadow space-y-2">
        <h2 className="font-semibold text-lg mb-2 text-gray-700">
          Site Information
        </h2>
        <p>
          <strong>Address:</strong> {site.address || "—"}
        </p>
        <p>
          <strong>Latitude:</strong> {site.latitude || "—"}
        </p>
        <p>
          <strong>Longitude:</strong> {site.longitude || "—"}
        </p>
        {site.extra_fields && (
          <div className="mt-3">
            <h4 className="font-medium text-gray-700">Extra Fields</h4>
            <ul className="text-sm text-gray-600 mt-1">
              {Object.entries(site.extra_fields).map(([k, v]: any) => (
                <li key={k}>
                  <strong>{k}:</strong> {String(v)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 🏗 Project Info */}
      {project && (
        <div className="bg-gray-100 p-4 rounded-lg space-y-1">
          <h3 className="font-semibold text-lg">Project Info</h3>
          <p>
            <strong>Name:</strong> {project.project_name}
          </p>
          <p>
            <strong>Code:</strong> {project.project_code}
          </p>
        </div>
      )}

      {/* 🧰 Installed Products */}
      <div className="bg-white p-4 rounded-lg shadow space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">
          Installed Products
        </h2>

        {installedProducts.length === 0 ? (
          <p className="text-gray-500 text-sm italic">
            No products have been installed yet.
          </p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {installedProducts.map((item: any) => (
              <li key={item.id} className="py-3 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-800">
                      {item.product_name || "Unnamed Product"}
                    </p>
                    <p className="text-gray-500 text-sm">
                      Serial No:{" "}
                      <span className="font-mono">
                        {item.serial_number || "—"}
                      </span>
                    </p>
                    <p className="text-gray-500 text-sm">
                      Installed On:{" "}
                      {new Date(item.installation_date).toLocaleDateString()}
                    </p>
                    <p className="text-gray-500 text-sm">
                      Installed By: {item.installed_by?.username || "Unknown"}
                    </p>
                    <p
                      className={`text-sm font-medium mt-1 ${
                        item.status === "Faulty"
                          ? "text-red-600"
                          : item.status === "Replaced"
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      Status: {item.state || "Installed"}
                    </p>

                    {/* Optional remarks */}
                    {item.remarks && (
                      <p className="text-gray-500 text-xs mt-1 italic">
                        Remarks: {item.remarks}
                      </p>
                    )}
                  </div>

                  {/* Images */}
                  {item.installation_images?.length > 0 && (
                    <div className="flex gap-2">
                      {item.installation_images.map((img: any) => (
                        <img
                          key={img.id}
                          src={
                            img.url.startsWith("http")
                              ? img.url
                              : `http://183.82.117.36:1337${img.url}`
                          }
                          alt="Installation"
                          className="w-16 h-16 object-cover rounded border"
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* 🧭 Action buttons for admin */}
                {item.state === "Installed" && (
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="small"
                      danger
                      onClick={() => handleUpdateStatus(item, "Faulty")}
                    >
                      ⚠️ Mark Faulty
                    </Button>
                    <Button
                      size="small"
                      type="default"
                      onClick={() => handleUpdateStatus(item, "Replaced")}
                    >
                      🔁 Mark Replaced
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 🧾 Surveys Raised for This Site */}
      <div className="bg-white p-4 rounded-lg shadow space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">Surveys Raised</h2>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Spin size="large" />
          </div>
        ) : (
          site?.documentId && <SiteSurveys siteDocId={site.documentId} />
        )}
      </div>

      {/* 💰 Products & Raise BOQ */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Products</h2>
          {allProducts.length > 0 && (
            <Button
              type="primary"
              className="bg-blue-600"
              onClick={() => setOpenBoq(true)}
            >
              🧾 Raise BOQ
            </Button>
          )}
        </div>

        {allProducts.length === 0 ? (
          <p className="text-gray-500 text-sm italic">
            No products available for this project.
          </p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {allProducts.map((p: any, i: number) => (
              <li key={i} className="py-2 flex justify-between">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.group}</p>
                </div>
                <span className="text-gray-700 text-sm">
                  ₹{p.price?.toLocaleString() || "—"} {p.currency || "INR"}
                  {p.locked && " 🔒"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 🧾 Raised BOQs */}
      <div className="bg-white p-4 rounded-lg shadow space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">Raised BOQs</h2>

        {boqs.length === 0 ? (
          <p className="text-gray-500 text-sm italic">No BOQs raised yet.</p>
        ) : (
          boqs.map((boq: any) => (
            <BoqCard
              key={boq.documentId}
              boq={boq}
              project={project} // ✅ pass project here
              expandedBoq={expandedBoq}
              setExpandedBoq={setExpandedBoq}
              handleApprove={handleApprove}
              setActiveInstallProduct={setActiveInstallProduct}
            />
          ))
        )}
      </div>

      {/* Raise BOQ Modal */}
      {openBoq && (
        <RaiseBoqModal
          siteId={docId}
          projectId={project.documentId}
          products={allProducts}
          userDocId={user?.documentId}
          onClose={() => setOpenBoq(false)}
        />
      )}

      {activeInstallProduct && (
        <AddProductInstallationModal
          boqDocId={activeInstallProduct.boqDocId}
          product={activeInstallProduct.product}
          userDocId={user?.documentId}
          siteDocId={docId}
          projectDocId={project?.documentId}
          onClose={() => setActiveInstallProduct(null)}
        />
      )}
    </div>
  );
}

function BoqCard({
  boq,
  project,
  expandedBoq,
  setExpandedBoq,
  handleApprove,
  setActiveInstallProduct,
}: any) {
  const [installedCounts, setInstalledCounts] = useState<
    Record<string, number>
  >({});
  const [loadingInstallations, setLoadingInstallations] = useState(false);

  useEffect(() => {
    const fetchInstallations = async () => {
      setLoadingInstallations(true);
      try {
        const res = await api.get(
          `/installed-products?filters[boq][documentId][$eq]=${boq.documentId}`
        );
        const data = res.data?.data || [];

        // Count how many times each product is installed
        const counts: Record<string, number> = {};
        data.forEach((inst: any) => {
          const name = inst.product_name;
          counts[name] = (counts[name] || 0) + 1;
        });

        setInstalledCounts(counts);
      } catch (err) {
        console.error("❌ Failed to load installed products:", err);
      } finally {
        setLoadingInstallations(false);
      }
    };

    fetchInstallations();
  }, [boq.documentId]);

  // 🔹 Get latest price from the project structure
  const getLatestPrice = (productName: string, groupName: string) => {
    const group = project?.assigned_groups?.find(
      (g: any) => g.group === groupName
    );
    const product =
      group?.products?.find(
        (p: any) =>
          (typeof p === "string" && p === productName) ||
          (typeof p === "object" && p.name === productName)
      ) || null;

    if (!product) return 0;
    return typeof product === "object" && product.price ? product.price : 0;
  };

  // 🔹 Calculate dynamic total for pending BOQs
  const dynamicTotal =
    boq.state === "Pending Purchase" || boq.state === "Pending"
      ? boq.boq_items?.reduce((sum: number, item: any) => {
          const latestPrice = getLatestPrice(item.name, item.group);
          return sum + (item.qty || 0) * (latestPrice || 0);
        }, 0)
      : boq.total_cost || 0;

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        onClick={() =>
          setExpandedBoq(expandedBoq === boq.documentId ? null : boq.documentId)
        }
        className="flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer"
      >
        <div>
          <p className="font-medium text-gray-800">
            BOQ #{boq.id} — {boq.state || "Pending"}
          </p>
          <p className="text-sm text-gray-500">
            Raised by: {boq.raised_by?.username || "Unknown"}
          </p>
        </div>
        <span className="text-gray-600 text-sm">
          ₹{dynamicTotal?.toLocaleString() || "—"}
        </span>
      </div>

      {expandedBoq === boq.documentId && (
        <div className="p-4 border-t bg-white">
          <h4 className="font-medium mb-2">BOQ Items</h4>

          {loadingInstallations ? (
            <p className="text-sm text-gray-500 italic">
              Loading installations...
            </p>
          ) : (
            <ul className="text-sm text-gray-700 divide-y">
              {boq.boq_items?.map((item: any, idx: number) => {
                const installedCount = installedCounts[item.name] || 0;
                const fullyInstalled = installedCount >= item.qty;

                return (
                  <li
                    key={idx}
                    className="flex justify-between items-center py-1"
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.group}</p>
                      <p className="text-xs text-gray-400">
                        Installed: {installedCount} / {item.qty}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">
                        {(() => {
                          // Use project price if pending, else locked price
                          const currentPrice =
                            boq.state === "Pending Purchase" ||
                            boq.state === "Pending"
                              ? getLatestPrice(item.name, item.group)
                              : item.price;

                          const total = (currentPrice || 0) * (item.qty || 0);

                          return `${item.qty} × ₹${currentPrice} = ₹${total}`;
                        })()}
                      </span>

                      {boq.state === "Approved" && !fullyInstalled && (
                        <Button
                          size="small"
                          className="border-blue-600 text-blue-600"
                          onClick={() =>
                            setActiveInstallProduct({
                              boqDocId: boq.documentId,
                              product: item,
                            })
                          }
                        >
                          ➕ Add Installation
                        </Button>
                      )}

                      {fullyInstalled && (
                        <span className="text-green-600 text-xs font-medium">
                          ✅ Fully Installed
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {boq.remarks && (
            <p className="text-gray-600 mt-2">
              <strong>Remarks:</strong> {boq.remarks}
            </p>
          )}

          {/* Approve Button for Super Admin */}
          {boq.state === "Pending Approval" && (
            <div className="flex justify-end mt-4">
              <Button
                type="primary"
                className="bg-green-600"
                onClick={() => handleApprove(boq.documentId)}
              >
                ✅ Approve
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SiteSurveys({ siteDocId }: { siteDocId: string }) {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSurveys = async () => {
      setLoading(true);
      try {
        const res = await api.get(
          `/survey1s?filters[site_1][documentId][$eq]=${siteDocId}&populate=*`
        );
        setSurveys(res.data?.data || []);
      } catch (err) {
        console.error("❌ Failed to load surveys:", err);
        message.error("Failed to load surveys");
      } finally {
        setLoading(false);
      }
    };

    fetchSurveys();
  }, [siteDocId]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-32">
        <Spin />
      </div>
    );

  if (surveys.length === 0)
    return (
      <p className="text-gray-500 text-sm italic">
        No surveys raised for this site yet.
      </p>
    );

  return (
    <div className="space-y-3">
      {surveys.map((survey) => (
        <div
          key={survey.documentId}
          className="border rounded-lg p-4 hover:bg-gray-50 transition"
        >
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="font-semibold text-gray-800 text-lg">
                {survey.survey_name || "Unnamed Survey"}
              </h3>
              <p className="text-sm text-gray-500">
                Purpose: {survey.survey_purpose || "—"}
              </p>
            </div>
            <span
              className={`text-sm font-medium px-2 py-1 rounded ${
                survey.work_status === "Completed"
                  ? "bg-green-100 text-green-700"
                  : survey.work_status === "In Progress"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {survey.work_status || "—"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
            <p>
              <strong>Type:</strong> {survey.survey_type || "—"}
            </p>
            <p>
              <strong>Created On:</strong>{" "}
              {new Date(survey.createdAt).toLocaleString("en-IN")}
            </p>
            {survey.customer && (
              <p>
                <strong>Customer:</strong>{" "}
                {survey.customer?.customer_name || survey.customer?.name || "—"}
              </p>
            )}
            {survey.project && (
              <p>
                <strong>Project:</strong> {survey.project.project_name || "—"}
              </p>
            )}
          </div>

          {survey.additional_notes && (
            <p className="mt-2 text-gray-600 text-sm italic">
              📝 {survey.additional_notes}
            </p>
          )}

          {/* 📸 Photos */}
          {survey.photo_documentation?.length > 0 && (
            <div className="mt-3">
              <p className="font-medium text-gray-700 mb-1">
                📸 Photo Documentation:
              </p>
              <div className="flex flex-wrap gap-2">
                {survey.photo_documentation.map((img: any) => (
                  <img
                    key={img.id}
                    src={
                      img.url.startsWith("http")
                        ? img.url
                        : `http://183.82.117.36:1337${img.url}`
                    }
                    alt="Survey"
                    className="w-24 h-24 object-cover rounded-md border"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
