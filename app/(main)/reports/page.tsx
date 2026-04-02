"use client";

import { useState, useEffect } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { ModernSidebar } from "@/components/layout/modern-sidebar";
import { ModernHeader } from "@/components/layout/modern-header";
import { ModernCard } from "@/components/ui/modern-card";
import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/hooks/use-toast";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  BarChart3,
  PieChart,
  TrendingUp,
  Calendar,
  FileText,
  Camera,
} from "lucide-react";
import axios from "axios";
import api from "@/lib/api";

export default function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedDivision, setSelectedDivision] = useState("all");
  const [reportData, setReportData] = useState({
    totalSurveys: 0,
    completedSurveys: 0,
    pendingSurveys: 0,
    totalCameras: 0,
    divisionsData: [],
    monthlyProgress: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await api.get("/surveys?populate=*");

        const surveys = response.data.data;

        // Calculate totals
        const totalSurveys = surveys.length;
        const completedSurveys = surveys.filter(
          (s: any) => s.workStatus === "survey-completed"
        ).length;
        const pendingSurveys = surveys.filter(
          (s: any) => s.workStatus !== "survey-completed"
        ).length;
        const totalCameras = surveys.reduce(
          (sum: number, s: any) => sum + (s.cameraDetails?.length || 0),
          0
        );

        // Group by division
        const divisionsMap = new Map();
        surveys.forEach((s: any) => {
          const divisionName = s.division?.name || "Unassigned";
          if (!divisionsMap.has(divisionName)) {
            divisionsMap.set(divisionName, {
              surveys: 0,
              cameras: 0,
              completion: 0,
              count: 0,
            });
          }
          const divData = divisionsMap.get(divisionName);
          divData.surveys += 1;
          divData.cameras += s.cameraDetails?.length || 0;
          divData.count += 1;
          divData.completion += s.workStatus === "survey-completed" ? 100 : 0;
        });
        const divisionsData = Array.from(divisionsMap.entries()).map(
          ([name, data]) => ({
            name,
            surveys: data.surveys,
            cameras: data.cameras,
            completion: Math.round(data.completion / data.count) || 0,
          })
        );

        // Group by month (corrected to sum cameraDetails.length)
        const monthlyMap = new Map();
        surveys.forEach((s: any) => {
          const month = new Date(s.createdAt).toLocaleString("default", {
            month: "short",
          });
          if (!monthlyMap.has(month)) {
            monthlyMap.set(month, { surveys: 0, cameras: 0 });
          }
          const monthData = monthlyMap.get(month);
          monthData.surveys += 1;
          monthData.cameras += s.cameraDetails?.length || 0;
        });
        const monthlyProgress = Array.from(monthlyMap.entries()).map(
          ([month, data]) => ({
            month,
            surveys: data.surveys,
            cameras: data.cameras,
          })
        );

        setReportData({
          totalSurveys,
          completedSurveys,
          pendingSurveys,
          totalCameras,
          divisionsData,
          monthlyProgress,
        });
      } catch (err) {
        console.error("Failed to fetch reports:", err);
        setError("Failed to load report data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  if (loading) {
    return (
      <PageLayout>
        <div className="flex h-screen">
          {/* <ModernSidebar /> */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* <ModernHeader
              title="Survey Reports"
              subtitle="Loading analytics..."
              showGPS={false}
            /> */}
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading report data...</p>
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <div className="flex h-screen">
          {/* <ModernSidebar /> */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* <ModernHeader
              title="Survey Reports"
              subtitle="Error loading data"
              showGPS={false}
            /> */}
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-red-600">{error}</div>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <div>
      <main className="flex-1">
        {/* Header Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <PillButton variant="accent">
            <Download className="w-4 h-4 mr-2" />
            Export
          </PillButton>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <ModernCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Surveys
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {reportData.totalSurveys}
                </p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +12% from last month
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-3 rounded-2xl">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </ModernCard>

          <ModernCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {reportData.completedSurveys}
                </p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {Math.round(
                    (reportData.completedSurveys / reportData.totalSurveys) *
                      100
                  )}
                  % completion rate
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-400 to-emerald-500 p-3 rounded-2xl">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
          </ModernCard>

          <ModernCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-orange-600">
                  {reportData.pendingSurveys}
                </p>
                <p className="text-xs text-orange-600 flex items-center mt-1">
                  <Calendar className="w-3 h-3 mr-1" />
                  {Math.round(
                    (reportData.pendingSurveys / reportData.totalSurveys) * 100
                  )}
                  % remaining
                </p>
              </div>
              <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-3 rounded-2xl">
                <PieChart className="w-6 h-6 text-white" />
              </div>
            </div>
          </ModernCard>

          <ModernCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Cameras
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {reportData.totalCameras}
                </p>
                <p className="text-xs text-purple-600 flex items-center mt-1">
                  <Camera className="w-3 h-3 mr-1" />
                  Across all locations
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-400 to-purple-600 p-3 rounded-2xl">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
          </ModernCard>
        </div>

        {/* Division Performance */}
        <ModernCard className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Division Performance
          </h3>
          <p className="text-gray-600 mb-6">
            Survey completion status by division
          </p>

          <div className="space-y-4">
            {reportData.divisionsData.map((division) => (
              <div
                key={division.name}
                className="flex items-center justify-between p-4 bg-white/50 backdrop-blur-sm border border-white/30 rounded-2xl"
              >
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 p-2 rounded-xl">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {division.name}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {division.surveys} surveys • {division.cameras} cameras
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {division.completion}%
                    </p>
                    <p className="text-xs text-gray-500">Completion</p>
                  </div>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-amber-400 to-yellow-500 h-2 rounded-full"
                      style={{ width: `${division.completion}%` }}
                    ></div>
                  </div>
                  <Badge
                    variant={
                      division.completion > 85
                        ? "default"
                        : division.completion > 70
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {division.completion > 85
                      ? "Excellent"
                      : division.completion > 70
                      ? "Good"
                      : "Needs Attention"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </ModernCard>

        {/* Monthly Progress */}
        <ModernCard className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Monthly Progress
          </h3>
          <p className="text-gray-600 mb-6">
            Survey and camera installation trends
          </p>

          <div className="grid grid-cols-6 gap-4">
            {reportData.monthlyProgress.map((month) => (
              <div key={month.month} className="text-center">
                <div className="bg-blue-100 p-4 rounded-2xl mb-2">
                  <div className="text-lg font-bold text-blue-600">
                    {month.surveys}
                  </div>
                  <div className="text-xs text-blue-600">Surveys</div>
                </div>
                <div className="bg-green-100 p-4 rounded-2xl mb-2">
                  <div className="text-lg font-bold text-green-600">
                    {month.cameras}
                  </div>
                  <div className="text-xs text-green-600">Cameras</div>
                </div>
                <div className="text-sm font-medium text-gray-700">
                  {month.month}
                </div>
              </div>
            ))}
          </div>
        </ModernCard>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4">
          <PillButton variant="secondary">
            <Download className="w-4 h-4 mr-2" />
            Export Survey Data
          </PillButton>
          <PillButton variant="secondary">
            <FileText className="w-4 h-4 mr-2" />
            Generate Report
          </PillButton>
          <PillButton variant="secondary">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Report
          </PillButton>
        </div>
      </main>
    </div>
  );
}
