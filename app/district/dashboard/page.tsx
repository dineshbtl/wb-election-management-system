"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton, Modal } from "antd";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  FileSpreadsheet,
  ClipboardList,
  MapPin,
  Trash2,
} from "lucide-react";

export default function DistrictCoordinatorDashboardPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [district, setDistrict] = useState<any>(null);
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalAssemblies: 0,
    totalLocations: 0,
    totalSurveys: 0,
    raisedSurveys: 0,
    completedSurveys: 0,
    totalBoqs: 0,
    raisedBoqs: 0,
    totalInCameras: 0,
    installedInCameras: 0,
    totalOutCameras: 0,
    installedOutCameras: 0,
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    assembly: { documentId: string; assemblyName: string } | null;
  }>({ open: false, assembly: null });

  // 🧩 1. Fetch Logged-in User
  const getUser = async () => {
    try {
      const res = await api.get("/users/me?populate=*");
      return res.data;
    } catch (err) {
      console.error("Failed to fetch user:", err);
      toast({
        variant: "destructive",
        title: "Error fetching user",
        description: "Unable to load user info.",
      });
      return null;
    }
  };

  // 🧩 2. Fetch Dashboard Data
  const fetchDashboardData = async (districts: any[]) => {
    try {
      setLoading(true);

      const allAssemblies: any[] = [];
      const aggregatedSummary = {
        totalAssemblies: 0,
        totalLocations: 0,
        totalSurveys: 0,
        raisedSurveys: 0,
        completedSurveys: 0,
        totalBoqs: 0,
        raisedBoqs: 0,
        totalInCameras: 0,
        installedInCameras: 0,
        totalOutCameras: 0,
        installedOutCameras: 0,
      };

      // ✅ Fetch all data for all districts concurrently
      await Promise.all(
        districts.map(async (dist) => {
          const districtId = dist.documentId;
          
          // Fetch district details
          const distRes = await api.get(`/districts/${districtId}`);
          
          // Fetch dashboard stats
          const dashRes = await api.get(`/dashboard/district/${districtId}`);
          const d = dashRes.data?.data || {};

          // Fetch assemblies for this district
          const asmRes = await api.get("/dashboard/assemblies");
          const filteredAssemblies =
            asmRes.data?.data?.filter(
              (a: any) => a.district === distRes.data.data.district_name,
            ) || [];

          // Merge documentId for delete: fetch district assemblies
          const asmIdsRes = await api.get(
            `/assemblies?filters[district][documentId][$eq]=${districtId}&pagination[pageSize]=200&fields[0]=documentId&fields[1]=Assembly_Name&fields[2]=Assembly_No`,
          );
          const asmIdMap = new Map<string, string>();
          (asmIdsRes.data?.data || []).forEach((b: any) => {
            const key = `${(b.Assembly_Name || b.assemblyName || "").trim()}_${b.Assembly_No ?? b.assemblyNo ?? ""}`;
            asmIdMap.set(key, b.documentId);
          });
          const merged = filteredAssemblies.map((a: any) => {
            const key = `${(a.assemblyName || a.Assembly_Name || "").trim()}_${a.assemblyNo ?? a.Assembly_No ?? ""}`;
            return { ...a, documentId: a.documentId ?? asmIdMap.get(key) };
          });
          
          allAssemblies.push(...merged);

          // Aggregate summary
          aggregatedSummary.totalAssemblies += d.totalAssemblies || filteredAssemblies.length;
          aggregatedSummary.totalLocations += d.totalLocations || 0;
          aggregatedSummary.totalSurveys += d.totalSurveys || 0;
          aggregatedSummary.raisedSurveys += d.raisedSurveys || 0;
          aggregatedSummary.completedSurveys += d.completedSurveys || 0;
          aggregatedSummary.totalBoqs += d.totalBoqs || 0;
          aggregatedSummary.raisedBoqs += d.raisedBoqs || 0;
          aggregatedSummary.totalInCameras += d.totalInCameras || 0;
          aggregatedSummary.installedInCameras += d.installedInCameras || 0;
          aggregatedSummary.totalOutCameras += d.totalOutCameras || 0;
          aggregatedSummary.installedOutCameras += d.installedOutCameras || 0;
        })
      );

      setAssemblies(allAssemblies);
      setSummary(aggregatedSummary);
      setDistrict(districts); // Store array of districts if needed for title

    } catch (err: any) {
      console.error("Error loading dashboard:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to load dashboard data.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (a: any) => {
    if (!a.documentId) {
      toast({
        variant: "destructive",
        title: "Cannot delete",
        description: "Assembly could not be identified for deletion.",
      });
      return;
    }
    setDeleteModal({ open: true, assembly: { documentId: a.documentId, assemblyName: a.assemblyName || a.Assembly_Name || "this assembly" } });
  };

  const handleDeleteConfirm = async () => {
    const { assembly } = deleteModal;
    if (!assembly) return;
    setDeletingId(assembly.documentId);
    try {
      await api.delete(`/assemblies/${assembly.documentId}`);
      setAssemblies((prev) => prev.filter((a: any) => a.documentId !== assembly.documentId));
      setSummary((s) => ({ ...s, totalAssemblies: Math.max(0, s.totalAssemblies - 1) }));
      toast({ title: "Deleted", description: `${assembly.assemblyName} has been removed.` });
      setDeleteModal({ open: false, assembly: null });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.response?.data?.error?.message || "Failed to delete assembly.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  // 🧩 3. Initialize
  useEffect(() => {
    (async () => {
      setLoadingInitial(true);
      const u = await getUser();
      if (u?.districts?.length) {
        // Filter out duplicate districts based on documentId
        const uniqueDistricts = Array.from(
          new Map(u.districts.map((d: any) => [d.documentId, d])).values()
        );
        await fetchDashboardData(uniqueDistricts);
      } else {
        setLoading(false);
        toast({
          variant: "destructive",
          title: "No District Assigned",
          description: "This coordinator is not linked to any district.",
        });
      }
      setLoadingInitial(false);
    })();
  }, []);

  // 🧩 4. Loader
  if (loadingInitial)
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <Skeleton active paragraph={{ rows: 1 }} className="mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-10">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} active paragraph={{ rows: 2 }} />
            ))}
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <Skeleton active paragraph={{ rows: 8 }} />
          </div>
        </div>
      </div>
    );

  // 🧩 5. UI
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      {/* <Modal
        title="Delete assembly"
        open={deleteModal.open}
        onOk={handleDeleteConfirm}
        onCancel={() => setDeleteModal({ open: false, assembly: null })}
        okText="Delete"
        okButtonProps={{ danger: true }}
        confirmLoading={deletingId !== null}
      >
        <p className="capitalize text-base">
          Are you sure you want to delete{" "}
          <strong className="capitalize">{deleteModal.assembly?.assemblyName}</strong>? This cannot be undone.
        </p>
      </Modal> */}
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-800 mb-6 capitalize">
          District Dashboard — {Array.isArray(district) ? district.map(d => d.district_name).join(", ") : (district?.district_name || "Multiple Districts")}
        </h1>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-10">
          <DashboardCard
            icon={<MapPin className="text-indigo-500" />}
            label="Total Assemblies"
            value={summary.totalAssemblies}
          />
          <DashboardCard
            icon={<FileSpreadsheet className="text-amber-500" />}
            label="Total"
            value={summary.totalLocations}
          />
          <DashboardCard
            icon={<ClipboardList className="text-green-500" />}
            label="Surveys (Raised / Total)"
            value={`${summary.raisedSurveys} / ${summary.totalLocations}`}
          />
          <DashboardCard
            icon={<ClipboardList className="text-green-500" />}
            label="Completed (Raised / Total)"
            value={`${summary.completedSurveys} / ${summary.totalLocations}`}
          />
          {/* <DashboardCard
            icon={<BarChart3 className="text-blue-500" />}
            label="BOQs (Raised / Total)"
            value={`${summary.raisedBoqs} / ${summary.totalBoqs}`}
          /> */}
          <DashboardCard
            icon={<ClipboardList className="text-indigo-500" />}
            label="IN Cameras (Installed / Total)"
            value={`${summary.installedInCameras} / ${summary.totalInCameras}`}
          />
          <DashboardCard
            icon={<ClipboardList className="text-orange-500" />}
            label="OUT Cameras (Installed / Total)"
            value={`${summary.installedOutCameras} / ${summary.totalOutCameras}`}
          />
        </div>

        {/* Assemblies List — PS No. hidden; capitalize + same font size */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-700 capitalize text-base">
            Assemblies Summary
          </h2>
          <ul className="space-y-3 list-none p-0 m-0">
            {assemblies.map((a: any) => (
              <li key={a.id ?? a.documentId ?? a.assemblyName}>
                <Card className="shadow-sm border border-gray-100 hover:border-indigo-200 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="font-medium text-gray-900 capitalize text-base">
                        {a.assemblyName}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-base text-gray-600">
                        <span className="capitalize">
                          <span className="text-gray-500">Locations</span>{" "}
                          <strong className="capitalize">{a.totalLocations}</strong>
                        </span>
                        <span className="capitalize">
                          <span className="text-gray-500">Surveys</span>{" "}
                          <strong className="capitalize">{a.raisedSurveys}</strong>
                        </span>
                        <span className="capitalize">
                          <span className="text-gray-500">BOQs</span>{" "}
                          <strong className="capitalize">{a.raisedBoqs}</strong>
                        </span>
                        <span className="capitalize">
                          <span className="text-gray-500">Cameras</span>{" "}
                          <strong className="capitalize">
                            IN {a.installedInCameras}/{a.totalInCameras} · OUT{" "}
                            {a.installedOutCameras}/{a.totalOutCameras}
                          </strong>
                        </span>
                        {/* {a.documentId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 capitalize text-base"
                            onClick={() => handleDeleteClick(a)}
                            disabled={deletingId === a.documentId}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        )} */}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
          {assemblies.length === 0 && (
            <p className="text-gray-500 text-base py-4 capitalize">No assemblies found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// 🧩 Reusable Dashboard Card Component — capitalize, same font size
const DashboardCard = ({ icon, label, value }: any) => (
  <Card className="shadow-md border-indigo-100">
    <CardContent className="p-5 flex items-center gap-3">
      {icon}
      <div>
        <h3 className="text-gray-600 text-base capitalize">{label}</h3>
        <p className="text-base font-semibold text-gray-900 capitalize">{value}</p>
      </div>
    </CardContent>
  </Card>
);



