"use client";

import React, { useEffect, useState } from "react";
import { message, Spin, Table, Skeleton } from "antd";
import { MapPin, ClipboardList, FileSpreadsheet } from "lucide-react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import api from "@/lib/api";

export default function BlockCoordinatorDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [block, setBlock] = useState<any>(null);
  const [summary, setSummary] = useState({
    totalLocations: 0,
    totalSurveys: 0,
    raisedSurveys: 0,
    totalBoqs: 0,
    raisedBoqs: 0,
    totalInCameras: 0,
    installedInCameras: 0,
    totalOutCameras: 0,
    installedOutCameras: 0,
  });
  const [locationSummary, setLocationSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Helper function to make authenticated requests

  const getAssignedBoothId = (cam: any): string | null => {
    return (
      cam.assigned_booth?.documentId ||
      cam.assigned_booth?.data?.attributes?.documentId ||
      cam.attributes?.assigned_booth?.data?.attributes?.documentId ||
      cam.attributes?.assigned_booth?.documentId ||
      null
    );
  };

  const fetchDashboard = async () => {
    try {
      setLoading(true);

      // 1️⃣ Logged-in user
      const userRes = await api.get(`/users/me?populate=*`);
      const u = userRes.data.user || userRes.data;
      setUser(u);

      if (!u) {
        message.error("Failed to fetch logged-in user.");
        setLoading(false);
        return;
      }

      // 2️⃣ Find their assigned block - ✅ ADD AUTH HEADER
      const blockRes = await api.get(
        `/blocks?filters[assigned_coordinator][documentId][$eq]=${u.documentId}&populate[Locations]=true&populate[Assembly]=true`,
      );
      console.log("blockRes", blockRes.data);
      const blockData = blockRes.data.data?.[0];
      if (!blockData) {
        message.warning("No block assigned to this user.");
        setLoading(false);
        return;
      }
      setBlock(blockData);

      const locations = blockData.Locations || [];
      const totalLocations = locations.length;
      const totalSurveys = totalLocations;
      const totalBoqs = totalLocations;

      // 3️⃣ Fetch surveys & boqs under this block - ✅ ADD AUTH HEADER
      // const surveysRes = await api.get(
      //   `/surveys?pagination[pageSize]=1000&populate=booth`,
      // );
      // const boqsRes = await api.get(
      //   `/boqs?pagination[pageSize]=1000&populate=location`,
      // );

      // 3️⃣ Fetch surveys, boqs, cameras IN PARALLEL
      const [surveysRes, boqsRes, camerasRes] = await Promise.all([
        api.get(`/surveys?pagination[pageSize]=1000&populate=booth`),
        api.get(`/boqs?pagination[pageSize]=1000&populate=location`),
        api.get(`/cameras?pagination[pageSize]=1000&populate=assigned_booth`),
      ]);

      const surveys = surveysRes.data.data || [];
      const boqs = boqsRes.data.data || [];

      const raisedSurveyIds = new Set(
        surveys.map((s: any) => s.booth?.documentId).filter(Boolean),
      );
      const raisedBoqIds = new Set(
        boqs.map((b: any) => b.location?.documentId).filter(Boolean),
      );

      const raisedSurveys = locations.filter((l: any) =>
        raisedSurveyIds.has(l.documentId),
      ).length;

      const raisedBoqs = locations.filter((l: any) =>
        raisedBoqIds.has(l.documentId),
      ).length;

      // 🧭 Fetch cameras - ✅ ADD AUTH HEADER
      // const camerasRes = await api.get(
      //   `/cameras?pagination[pageSize]=1000&populate=assigned_booth`,
      // );
      const cameras = camerasRes.data.data || [];

      // Filter cameras belonging to this block’s locations
      const locationIds = new Set(locations.map((l: any) => l.documentId));
      const blockCameras = cameras.filter((cam: any) => {
        const assignedBoothId = getAssignedBoothId(cam);
        return assignedBoothId && locationIds.has(assignedBoothId);
      });

      // Count by position and installation state
      const installedInCameras = blockCameras.filter(
        (cam: any) =>
          (cam.Position === "IN" || cam.Position === "in") &&
          (cam.state === "Installed" || cam.state === "installed"),
      ).length;

      const installedOutCameras = blockCameras.filter(
        (cam: any) =>
          (cam.Position === "OUT" || cam.Position === "out") &&
          (cam.state === "Installed" || cam.state === "installed"),
      ).length;

      const totalInCameras = totalLocations;
      const totalOutCameras = totalLocations;

      // Location-wise summary
      const locSummary = locations.map((loc: any) => ({
        id: loc.documentId,
        PS_Name: loc.PS_Name || "-",
        PS_No: loc.PS_No || "-",
        PS_Location: loc.PS_Location || loc.Village || "-",
        hasSurvey: raisedSurveyIds.has(loc.documentId),
        hasBoq: raisedBoqIds.has(loc.documentId),
      }));

      setSummary({
        totalLocations,
        totalSurveys,
        raisedSurveys,
        totalBoqs,
        raisedBoqs,
        totalInCameras,
        installedInCameras,
        totalOutCameras,
        installedOutCameras,
      });
      setLocationSummary(locSummary);
    } catch (err: any) {
      console.error("Error loading block dashboard:", err);
      const errorMsg =
        err?.response?.data?.error?.message ||
        err?.message ||
        "Failed to load block dashboard data";
      message.error(errorMsg);
    } finally {
      setLoading(false);
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    // Don't await - let it load in background
    setLoadingInitial(true);
    fetchDashboard();
  }, []);

  if (loadingInitial)
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <Skeleton active paragraph={{ rows: 1 }} className="mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} active paragraph={{ rows: 2 }} />
            ))}
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <Skeleton active paragraph={{ rows: 8 }} />
          </div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Block Dashboard — {block?.Block_Name || "N/A"}
        </h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <DashboardCard
            icon={<MapPin className="w-6 h-6 text-blue-500" />}
            label="Total Locations"
            value={summary.totalLocations}
          />
          <DashboardCard
            icon={<ClipboardList className="w-6 h-6 text-green-500" />}
            label="Surveys (Raised / Total)"
            value={`${summary.raisedSurveys} / ${summary.totalSurveys}`}
          />
          <DashboardCard
            icon={<FileSpreadsheet className="w-6 h-6 text-purple-500" />}
            label="BOQs (Raised / Total)"
            value={`${summary.raisedBoqs} / ${summary.totalBoqs}`}
          />
          <DashboardCard
            icon={<ClipboardList className="w-6 h-6 text-indigo-500" />}
            label="IN Cameras (Installed / Total)"
            value={`${summary.installedInCameras} / ${summary.totalInCameras}`}
          />
          <DashboardCard
            icon={<ClipboardList className="w-6 h-6 text-orange-500" />}
            label="OUT Cameras (Installed / Total)"
            value={`${summary.installedOutCameras} / ${summary.totalOutCameras}`}
          />
        </div>

        {/* Location-wise Summary Table */}
        <Card className="shadow-md border border-gray-200">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Location-wise Progress
            </h2>
            <Table
              dataSource={locationSummary}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              columns={[
                {
                  title: "Polling Station",
                  dataIndex: "PS_Name",
                  key: "PS_Name",
                },
                {
                  title: "PS No",
                  dataIndex: "PS_No",
                  key: "PS_No",
                },
                {
                  title: "Location",
                  dataIndex: "PS_Location",
                  key: "PS_Location",
                },
                {
                  title: "Survey Status",
                  key: "surveyStatus",
                  render: (_: any, record: any) => (
                    <span
                      className={
                        record.hasSurvey
                          ? "text-green-600 font-semibold"
                          : "text-red-500"
                      }
                    >
                      {record.hasSurvey ? "✔ Completed" : "✘ Pending"}
                    </span>
                  ),
                },
                {
                  title: "BOQ Status",
                  key: "boqStatus",
                  render: (_: any, record: any) => (
                    <span
                      className={
                        record.hasBoq
                          ? "text-green-600 font-semibold"
                          : "text-red-500"
                      }
                    >
                      {record.hasBoq ? "✔ Completed" : "✘ Pending"}
                    </span>
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Reusable Dashboard Card Component
const DashboardCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) => (
  <Card className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
    <CardContent className="p-5 flex items-center gap-4">
      <div className="p-2 bg-gray-100 rounded-lg">{icon}</div>
      <div>
        <h3 className="text-gray-600 text-sm font-medium">{label}</h3>
        <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
    </CardContent>
  </Card>
);
