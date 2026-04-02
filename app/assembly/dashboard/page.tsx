"use client";

import React, { useEffect, useState } from "react";
import { message, Spin, Table } from "antd";
import { MapPin, ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import api from "@/lib/api";

export default function AssemblyCoordinatorDashboardPage() {
  const [assembly, setAssembly] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState({
    totalBlocks: 0,
    totalLocations: 0,
    totalSurveys: 0,
    raisedSurveys: 0,
    completedSurveys: 0,
    totalBoqs: 0,
    totalInCameras: 0,
    installedInCameras: 0,
    totalOutCameras: 0,
    installedOutCameras: 0,
  });

  const [locationSummary, setLocationSummary] = useState<any[]>([]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");
      if (!token) {
        message.error("No auth token found.");
        return;
      }

      // ✅ 1️⃣ Fetch logged-in user
      const userRes = await api.get(`/users/me?populate=assemblies`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const user = userRes.data.user || userRes.data;
      const userAssembly = user?.assemblies?.[0];

      if (!userAssembly) {
        message.warning("No assembly assigned.");
        return;
      }

      setAssembly(userAssembly);
      const assemblyId = userAssembly.documentId;

      // ✅ 2️⃣ Fetch KPI from backend dashboard endpoint
      const dashboardRes = await api.get(`/dashboard/assembly/${assemblyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const dashboardData = dashboardRes.data?.data;

      setSummary({
        totalBlocks: dashboardData.totalBlocks,
        totalLocations: dashboardData.totalLocations,
        totalSurveys: dashboardData.totalSurveys,
        raisedSurveys: dashboardData.raisedSurveys,
        completedSurveys: dashboardData.completedSurveys,
        totalBoqs: dashboardData.totalBoqs,
        totalInCameras: dashboardData.totalInCameras,
        installedInCameras: dashboardData.installedInCameras,
        totalOutCameras: dashboardData.totalOutCameras,
        installedOutCameras: dashboardData.installedOutCameras,
      });

      // ✅ 3️⃣ Fetch ALL locations under this assembly (with pagination)
      let allLocations: any[] = [];
      let page = 1;

      while (true) {
        const res = await api.get(
          `/locations?filters[assembly][documentId][$eq]=${assemblyId}&pagination[page]=${page}&pagination[pageSize]=100`,
        );

        const pageData = res.data.data || [];
        allLocations = [...allLocations, ...pageData];

        const meta = res.data.meta?.pagination;
        if (!meta || page >= meta.pageCount) break;
        page++;
      }

      // ✅ 4️⃣ Fetch cameras under this assembly
      let allCameras: any[] = [];
      let camPage = 1;

      while (true) {
        const res = await api.get(
          `/cameras?filters[assigned_booth][assembly][documentId][$eq]=${assemblyId}&pagination[page]=${camPage}&pagination[pageSize]=100&populate=assigned_booth`,
        );

        const pageData = res.data.data || [];
        allCameras = [...allCameras, ...pageData];

        const meta = res.data.meta?.pagination;
        if (!meta || camPage >= meta.pageCount) break;
        camPage++;
      }

      const locationIds = new Set(
        allLocations.map((loc: any) => loc.documentId),
      );

      const assemblyCameras = allCameras.filter(
        (cam: any) =>
          cam.assigned_booth?.documentId &&
          locationIds.has(cam.assigned_booth.documentId),
      );

      // ✅ 5️⃣ Build location-wise table
      const locationData = allLocations.map((loc: any) => {
        const locId = loc.documentId;

        const locationCameras = assemblyCameras.filter(
          (c: any) => c.assigned_booth?.documentId === locId,
        );

        const installedIn = locationCameras.some(
          (c: any) => c.Position === "IN" && c.state === "Installed",
        );

        const installedOut = locationCameras.some(
          (c: any) => c.Position === "OUT" && c.state === "Installed",
        );

        return {
          id: locId,
          PS_No: loc.PS_No,
          PS_Name: loc.PS_Name,
          surveyStatus: loc.Survey_Status || "Pending",
          inCamera: installedIn ? "Installed" : "Pending",
          outCamera: installedOut ? "Installed" : "Pending",
        };
      });

      setLocationSummary(locationData);
    } catch (err) {
      console.error(err);
      message.error("Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin size="large" />
      </div>
    );

  return (
    <div className="py-10 px-6">
      <div className="w-full mx-auto">
        <h1 className="text-2xl font-semibold mb-6">
          Assembly Dashboard — {assembly?.Assembly_Name}
        </h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-10">
          <DashboardCard
            icon={<MapPin className="text-amber-500" />}
            label="Total"
            value={summary.totalLocations}
          />

          <DashboardCard
            icon={<ClipboardList className="text-green-500" />}
            label="Raised Surveys"
            value={`${summary.raisedSurveys} `}
          />

          <DashboardCard
            icon={<ClipboardList className="text-blue-500" />}
            label="Completed Surveys"
            value={`${summary.completedSurveys} `}
          />
        </div>

        {/* Location Table */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">
              Location-wise Summary
            </h2>

            <Table
              dataSource={locationSummary}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              columns={[
                { title: "PS No", dataIndex: "PS_No" },
                { title: "Polling Station", dataIndex: "PS_Name" },
                { title: "Survey Status", dataIndex: "surveyStatus" },
                { title: "IN Camera", dataIndex: "inCamera" },
                { title: "OUT Camera", dataIndex: "outCamera" },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const DashboardCard = ({ icon, label, value }: any) => (
  <Card className="shadow-md">
    <CardContent className="p-5 flex items-center gap-3">
      {icon}
      <div>
        <h3 className="text-gray-600 text-sm">{label}</h3>
        <p className="text-lg font-semibold">{value}</p>
      </div>
    </CardContent>
  </Card>
);
