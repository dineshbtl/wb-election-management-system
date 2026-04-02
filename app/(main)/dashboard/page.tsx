"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { message, Skeleton } from "antd";
import { PageTitle } from "@/components/ui/page-title";
import { ModernCard } from "@/components/ui/modern-card";
import { StatCard } from "@/components/ui/stat-card";
import { MapPin, Camera, Clock, Users, Calendar, Building2 } from "lucide-react";
import bpi from "@/lib/api";

const UNIQUE_LOCATIONS_FALLBACK = 21016;

export default function BiharElectionDashboard() {
  const [loadingStats, setLoadingStats] = useState(true);
  const [stats, setStats] = useState({
    totalDistricts: 0,
    totalAssemblies: 0,
    totalLocations: 0,
    uniqueLocations: UNIQUE_LOCATIONS_FALLBACK,
    raisedSurveys: 0,
    completedSurveys: 0,
    totalBoqs: 0,
    totalInCameras: 0,
    installedInCameras: 0,
    totalOutCameras: 0,
    installedOutCameras: 0,
  });
  const [recentActivity, setRecentActivity] = useState<{ name: string; time: string; pct: number; dotClass: string }[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // 1) Load dashboard KPIs fast from Strapi summary endpoint
        setLoadingStats(true);
        const superRes = await bpi.get("/dashboard/superadmin");
        const superData = superRes.data?.data || {};
        setStats({
          ...superData,
          totalLocations: superData?.totalLocations || 0,
          uniqueLocations:
            typeof superData?.uniqueLocations === "number" &&
            superData.uniqueLocations > 0
              ? superData.uniqueLocations
              : UNIQUE_LOCATIONS_FALLBACK,
        });
        setLoadingStats(false);

        // 1b) Fetch unique-location KPIs in background without blocking first paint
        fetch("/api/unique-locations?kpisOnly=1")
          .then(async (res) => (res.ok ? res.json() : null))
          .then((fullKpis) => {
            if (!fullKpis) return;
            setStats((prev) => ({
              ...prev,
              totalLocations:
                typeof fullKpis.totalPollingStations === "number"
                  ? fullKpis.totalPollingStations
                  : prev.totalLocations,
              uniqueLocations:
                typeof fullKpis.uniqueLocations === "number" &&
                fullKpis.uniqueLocations > 0
                  ? fullKpis.uniqueLocations
                  : prev.uniqueLocations > 0
                    ? prev.uniqueLocations
                    : UNIQUE_LOCATIONS_FALLBACK,
            }));
          })
          .catch(() => {
            // Keep superadmin values if unique KPI endpoint is slow/unavailable
          });

        // 2) Fetch recent surveys for activity feed
        setLoadingRecent(true);
        try {
          const recentRes = await bpi.get(
            "/surveys?sort=updatedAt:desc&pagination[pageSize]=5&populate[booth][populate][assembly]=true"
          );
          const list = recentRes.data?.data || [];
          const now = Date.now();
          const formatTime = (dateStr: string) => {
            const d = new Date(dateStr).getTime();
            const diff = Math.floor((now - d) / 60000);
            if (diff < 60) return `${diff}m ago`;
            if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
            return `${Math.floor(diff / 1440)}d ago`;
          };
          setRecentActivity(
            list.map((s: any) => {
              const name = s.booth?.name || s.booth?.Location_Name || s.booth?.assembly?.assembly_name || `Survey #${s.documentId || s.id}`;
              const isCompleted = s.workStatus === "survey-completed";
              const pct = isCompleted ? 100 : s.workStatus === "survey-raised" ? 50 : 25;
              return {
                name,
                time: formatTime(s.updatedAt || s.createdAt || ""),
                pct,
                dotClass: isCompleted ? "bg-survey-green" : pct >= 50 ? "bg-survey-orange" : "bg-gray-400",
              };
            })
          );
        } catch {
          setRecentActivity([]);
        }
        setLoadingRecent(false);
      } catch (err) {
        console.error("❌ Error loading dashboard:", err);
        message.error("Failed to load dashboard data");
        setLoadingStats(false);
        setLoadingRecent(false);
      }
    };

    fetchAll();
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full min-w-0">
        <PageTitle
          title="Survey Dashboard"
          subtitle="Real-time overview of CCTV survey operations"
        >
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-900">Good morning, Survey Team!</p>
            <p className="mt-0.5">Here&apos;s what&apos;s happening with your surveys today.</p>
          </div>
        </PageTitle>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {loadingStats ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <Skeleton active paragraph={{ rows: 2 }} />
              </div>
            ))
          ) : (
            <>
              <StatCard
                title="Unique Locations"
                value={
                  (stats.uniqueLocations ?? 0) > 0
                    ? stats.uniqueLocations
                    : UNIQUE_LOCATIONS_FALLBACK
                }
                label="Assembly-wise buildings"
                color="amber"
                icon={<Building2 className="w-5 h-5" />}
                onClick={() => router.push("/surveys")}
              />
              <StatCard
                title="Completed"
                value={stats.completedSurveys ?? 0}
                label="Surveys done"
                color="green"
                icon={<Camera className="w-5 h-5" />}
              />
              <StatCard
                title="Total Cameras"
                value={(stats.totalInCameras || 0) + (stats.totalOutCameras || 0)}
                label="IN + OUT"
                color="blue"
                icon={<Clock className="w-5 h-5" />}
                onClick={() => router.push("/cameras")}
              />
              <StatCard
                title="Total Polling Stations"
                value={stats.totalLocations ?? 0}
                label="Full database count"
                color="purple"
                icon={<Users className="w-5 h-5" />}
                onClick={() => router.push("/locations")}
              />
            </>
          )}
        </div>

        {/* Survey Progress + Recent Activity row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Survey Progress card - donut + progress bars (all from real stats) */}
          <ModernCard className="p-6 bg-white shadow-sm border border-gray-200 rounded-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-0.5">Survey Progress</h3>
            <p className="text-sm text-gray-600 mb-4">Real-time progress tracking</p>
            {(() => {
              const totalSurveys = (stats.raisedSurveys || 0) + (stats.completedSurveys || 0);
              const completionPct = totalSurveys > 0 ? Math.round(((stats.completedSurveys || 0) / totalSurveys) * 1000) / 10 : 0;
              const totalCameras = (stats.totalInCameras || 0) + (stats.totalOutCameras || 0);
              const installedCameras = (stats.installedInCameras || 0) + (stats.installedOutCameras || 0);
              const camerasPct = totalCameras > 0 ? Math.round((installedCameras / totalCameras) * 100) : 0;
              const completedBarPct = totalSurveys > 0 ? Math.min(100, ((stats.completedSurveys || 0) / totalSurveys) * 100) : 0;
              const raisedBarPct = totalSurveys > 0 ? Math.min(100, ((stats.raisedSurveys || 0) / totalSurveys) * 100) : 0;
              return (
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative w-32 h-32 flex-shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        className="text-gray-200"
                        strokeWidth="3"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        className="text-survey-orange"
                        strokeWidth="3"
                        strokeDasharray={`${completionPct}, 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-gray-900">{completionPct}%</span>
                  </div>
                  <div className="flex-1 w-full space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Completed Surveys</span>
                        <span className="font-medium text-gray-900">{stats.completedSurveys}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-full rounded-full bg-survey-green" style={{ width: `${completedBarPct}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Pending Surveys</span>
                        <span className="font-medium text-gray-900">{stats.raisedSurveys}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-full rounded-full bg-survey-orange" style={{ width: `${raisedBarPct}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Cameras (Installed / Total)</span>
                        <span className="font-medium text-gray-900">{installedCameras} / {totalCameras}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-full rounded-full bg-survey-primary" style={{ width: `${camerasPct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>From dashboard data</span>
            </div>
          </ModernCard>

          {/* Recent Activity - from API */}
          <ModernCard className="p-6 bg-white shadow-sm border border-gray-200 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
            </div>
            {loadingRecent ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} active paragraph={{ rows: 1 }} />
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500">No recent survey activity.</p>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((item, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${item.dotClass}`} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                        <p className="text-xs text-gray-600">{item.time}</p>
                      </div>
                      <span className="text-xs font-medium text-gray-900">{item.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden ml-4">
                      <div className="h-full rounded-full bg-survey-orange" style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ModernCard>
        </div>

        {/* Project Info - compact */}
        <ModernCard className="mb-6 p-6 bg-white shadow-sm border border-gray-200 rounded-xl">
          <h3 className="text-lg font-semibold mb-3 text-gray-900">Project Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-gray-600">
            <div><span className="font-medium text-gray-900">Project Name:</span> Assam Election Monitoring</div>
            <div><span className="font-medium text-gray-900">Project Code:</span> AEM-2026</div>
            <div><span className="font-medium text-gray-900">State:</span> Assam</div>
            <div><span className="font-medium text-gray-900">Managed By:</span> Brihaspathi Technologies Pvt. Ltd.</div>
            <div><span className="font-medium text-gray-900">Phase:</span> Phase I – Setup & Monitoring</div>
            <div><span className="font-medium text-gray-900">Description:</span> Election data management and live booth monitoring.</div>
          </div>
        </ModernCard>

    </div>
  );
}
