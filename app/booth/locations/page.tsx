"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Table, Tag, message, Spin, Button } from "antd";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { CheckCircle, Clock, AlertCircle, Plus } from "lucide-react";
import Link from "next/link";

export default function BoothLocationsPage() {
  const [user, setUser] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  // Helper function for survey status badge
  const getSurveyStatusBadge = (survey: any) => {
    if (!survey) return null; // We'll handle "no survey" case separately

    const state = survey.state || "Pending";
    const statusConfig: Record<string, { color: string; icon: JSX.Element }> = {
      Pending: { color: "orange", icon: <Clock className="w-3 h-3" /> },
      Completed: { color: "green", icon: <CheckCircle className="w-3 h-3" /> },
      Rejected: { color: "red", icon: <AlertCircle className="w-3 h-3" /> },
    };
    const config = statusConfig[state] || statusConfig.Pending;

    return (
      <Tag color={config.color} className="flex items-center gap-1 px-2 py-1">
        {config.icon}
        <span className="text-xs font-medium">{state}</span>
      </Tag>
    );
  };

  const fetchMyLocations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        message.error("No auth token found.");
        return;
      }

      // 1) Get logged-in user
      const authRes = await axios.get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const authUser = authRes.data;
      if (!authUser?.documentId) throw new Error("Auth user missing");

      // 2) Get full user with profile
      const profileRes = await axios.get(
        `${API_URL}/users/${authUser.id}?populate=profile`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const profile = profileRes.data.profile;
      if (!profile) {
        message.error("Profile not found.");
        return;
      }

      const currentUser = { ...authUser, profile };
      setUser(currentUser);

      // 3) Fetch locations with surveys
      const locRes = await api.get(
        `/locations?filters[booth_coordinator][documentId][$eq]=${authUser.documentId}&populate=*&pagination[pageSize]=1000`,
      );

      const rawLocations = locRes.data.data ?? [];

      // 4) Fetch surveys for all locations
      const locationWithSurveys = await Promise.all(
        rawLocations.map(async (loc: any) => {
          const attrs = loc.attributes ?? loc;
          const documentId = attrs.documentId ?? loc.documentId;

          try {
            const surveyRes = await api.get(
              `/surveys?filters[booth][documentId][$eq]=${documentId}&pagination[pageSize]=1&sort[0]=createdAt:desc`,
            );
            return {
              ...attrs,
              id: loc.id ?? attrs.id,
              documentId,
              survey: surveyRes.data.data?.[0] || null,
              raw: loc,
            };
          } catch (err) {
            console.error(`Error fetching survey for ${documentId}:`, err);
            return {
              ...attrs,
              id: loc.id ?? attrs.id,
              documentId,
              survey: null,
              raw: loc,
            };
          }
        }),
      );

      setLocations(locationWithSurveys);
    } catch (err: any) {
      console.error("Error fetching booth locations:", err);
      const errorMsg =
        err?.response?.data?.error?.message ||
        err?.message ||
        "Failed to fetch assigned locations.";
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyLocations();
  }, []);

  const columns = [
    {
      title: "PS No",
      dataIndex: "PS_No",
      key: "PS_No",
      width: 100,
      className: "font-mono",
    },
    {
      title: "Polling Station",
      dataIndex: "PS_Name",
      key: "PS_Name",
      render: (text: string) => (
        <span className="font-medium text-gray-800">{text}</span>
      ),
    },

    {
      title: "Location",
      dataIndex: "PS_Location",
      key: "PS_Location",
      ellipsis: true,
      className: "max-w-xs",
    },
    {
      title: "Survey Status",
      key: "survey_status",
      width: 180,
      render: (row: any) => {
        // ✅ Show "Raise Survey" button if no survey exists
        if (!row.survey) {
          return (
            <Button
              type="primary"
              size="small"
              icon={<Plus className="w-3 h-3" />}
              onClick={(e) => {
                e.stopPropagation();
                router.push(
                  `/booth/surveys/new?boothId=${encodeURIComponent(row.documentId)}`,
                );
              }}
              className="bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] hover:from-[#2d7ae8] hover:to-[#1976D2] text-white border-0"
            >
              Raise Survey
            </Button>
          );
        }

        // Show status badge if survey exists
        return (
          <div className="flex items-center gap-2">
            {getSurveyStatusBadge(row.survey)}
          </div>
        );
      },
    },
    // {
    //   title: "Action",
    //   key: "action",
    //   width: 100,
    //   render: (row: any) => (
    //     <Button
    //       type="default"
    //       size="small"
    //       onClick={() => router.push(`/booth/locations/${row.documentId}`)}
    //     >
    //       Details
    //     </Button>
    //   ),
    // },
    {
      title: "Action",
      key: "action",
      width: 100,
      render: (row: any) => (
        <Link href={`/booth/locations/${row.documentId}`}>
          <Button type="default" size="small">
            Details
          </Button>
        </Link>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spin size="large" tip="Loading your assigned locations..." />
          <p className="mt-4 text-gray-500">
            Fetching your booth locations and survey status...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              My Assigned Locations
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage surveys and monitor status for your assigned polling
              stations
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <div className="flex items-center gap-2 bg-blue-50 text-blue-800 px-3 py-1.5 rounded-full text-sm font-medium">
              <span>📍</span>
              <span>{locations.length} locations assigned</span>
            </div>
          </div>
        </div>

        {locations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100">
              <svg
                className="h-8 w-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No locations assigned yet
            </h3>
            <p className="mt-1 text-gray-500">
              Contact your district coordinator to get assigned polling stations
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full bg-red-500"></span>
                  <span className="text-xs text-gray-600">
                    Survey Not Raised
                  </span>
                  <span className="inline-block w-3 h-3 rounded-full bg-orange-400 ml-4"></span>
                  <span className="text-xs text-gray-600">Pending</span>
                  <span className="inline-block w-3 h-3 rounded-full bg-green-500 ml-4"></span>
                  <span className="text-xs text-gray-600">Completed</span>
                </div>
                <Button
                  type="default"
                  onClick={fetchMyLocations}
                  disabled={loading}
                  className="text-sm"
                >
                  {loading ? "Refreshing..." : "Refresh Data"}
                </Button>
              </div>
            </div>
            <Table
              dataSource={locations}
              columns={columns}
              rowKey={(row) => row.documentId ?? row.id}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                pageSizeOptions: ["10", "20", "50"],
                showTotal: (total) => `Total ${total} locations`,
                position: ["bottomCenter"],
              }}
              scroll={{ x: 900 }}
              className="custom-table"
            />
          </div>
        )}
      </div>
    </div>
  );
}
