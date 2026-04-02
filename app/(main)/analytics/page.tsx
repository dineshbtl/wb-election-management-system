"use client";

import { useState, useEffect } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { ModernSidebar } from "@/components/layout/modern-sidebar";
import { ModernHeader } from "@/components/layout/modern-header";
import { ModernCard } from "@/components/ui/modern-card";
import { PillButton } from "@/components/ui/pill-button";
import { StatCard } from "@/components/ui/stat-card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { useToast } from "@/hooks/use-toast";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Filter,
  MapPin,
  Clock,
  Target,
  Zap,
} from "lucide-react";
import axios from "axios";
import api from "@/lib/api";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30d");
  const [division, setDivision] = useState("all");
  const { toast } = useToast();

  const [analyticsData, setAnalyticsData] = useState({
    overview: {
      totalSurveys: 0,
      completionRate: 0,
      avgSurveyTime: 0,
      efficiency: 0,
    },
    trends: {
      surveysThisMonth: 0,
      surveysLastMonth: 0,
      camerasInstalled: 0,
      camerasLastMonth: 0,
    },
    performance: [],
    timeline: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await api.get("/surveys?populate=*");

        const surveys = response.data.data;

        // Current date for time-based calculations
        const now = new Date();
        const thisMonth = now.getMonth();
        const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
        const thisYear = now.getFullYear();
        const lastYear = thisMonth === 0 ? thisYear - 1 : thisYear;

        // Overview
        const totalSurveys = surveys.length;
        const completedSurveys = surveys.filter(
          (s: any) => s.workStatus === "survey-completed"
        ).length;
        const completionRate =
          totalSurveys > 0 ? (completedSurveys / totalSurveys) * 100 : 0;
        const avgSurveyTime =
          surveys.reduce(
            (sum: number, s: any) => sum + (s.avgSurveyTime || 2.4),
            0
          ) / totalSurveys || 0; // Assuming avgSurveyTime if available
        const efficiency =
          surveys.reduce(
            (sum: number, s: any) => sum + (s.efficiency || 85.2),
            0
          ) / totalSurveys || 0; // Assuming efficiency if available

        // Trends
        const surveysThisMonth = surveys.filter(
          (s: any) =>
            new Date(s.createdAt).getMonth() === thisMonth &&
            new Date(s.createdAt).getFullYear() === thisYear
        ).length;
        const surveysLastMonth = surveys.filter(
          (s: any) =>
            new Date(s.createdAt).getMonth() === lastMonth &&
            new Date(s.createdAt).getFullYear() ===
              (thisMonth === 0 ? lastYear : thisYear)
        ).length;
        const camerasInstalled = surveys.reduce(
          (sum: number, s: any) => sum + (s.cameraDetails?.length || 0),
          0
        );
        const camerasLastMonth = surveys
          .filter(
            (s: any) =>
              new Date(s.createdAt).getMonth() === lastMonth &&
              new Date(s.createdAt).getFullYear() ===
                (thisMonth === 0 ? lastYear : thisYear)
          )
          .reduce(
            (sum: number, s: any) => sum + (s.cameraDetails?.length || 0),
            0
          );

        // Performance by Division
        const performanceMap = new Map();
        surveys.forEach((s: any) => {
          const divName = s.division?.name || "Unassigned";
          if (!performanceMap.has(divName)) {
            performanceMap.set(divName, {
              surveys: 0,
              completion: 0,
              efficiency: 0,
              count: 0,
            });
          }
          const divData = performanceMap.get(divName);
          divData.surveys += 1;
          divData.count += 1;
          divData.completion += s.workStatus === "survey-completed" ? 100 : 0;
          divData.efficiency += s.efficiency || 85.2; // Default efficiency if not provided
        });
        const performance = Array.from(performanceMap.entries()).map(
          ([division, data]) => ({
            division,
            surveys: data.surveys,
            completion: Math.round(data.completion / data.count) || 0,
            efficiency: Math.round(data.efficiency / data.count) || 0,
          })
        );

        // Timeline (last 6 months)
        const timelineMap = new Map();
        const months = Array.from({ length: 6 }, (_, i) => {
          const month = new Date(now.setMonth(now.getMonth() - i));
          return month.toLocaleString("default", { month: "short" });
        }).reverse();
        surveys.forEach((s: any) => {
          const month = new Date(s.createdAt).toLocaleString("default", {
            month: "short",
          });
          if (months.includes(month)) {
            if (!timelineMap.has(month)) {
              timelineMap.set(month, { surveys: 0, cameras: 0, completion: 0 });
            }
            const monthData = timelineMap.get(month);
            monthData.surveys += 1;
            monthData.cameras += s.cameraDetails?.length || 0;
            monthData.completion +=
              s.workStatus === "survey-completed" ? 100 : 0;
          }
        });
        const timeline = months.map((month) => ({
          month,
          surveys: timelineMap.get(month)?.surveys || 0,
          cameras: timelineMap.get(month)?.cameras || 0,
          completion:
            Math.round(
              (timelineMap.get(month)?.completion || 0) /
                (timelineMap.get(month)?.surveys || 1)
            ) || 0,
        }));

        setAnalyticsData({
          overview: { totalSurveys, completionRate, avgSurveyTime, efficiency },
          trends: {
            surveysThisMonth,
            surveysLastMonth,
            camerasInstalled,
            camerasLastMonth,
          },
          performance,
          timeline,
        });
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
        setError("Failed to load analytics data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <PageLayout>
        <div className="flex h-screen">
          {/* <ModernSidebar /> */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* <ModernHeader
              title="Analytics Dashboard"
              subtitle="Loading insights..."
              showGPS={false}
            /> */}
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading analytics...</p>
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
              title="Analytics Dashboard"
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

  const surveyGrowth = (
    ((analyticsData.trends.surveysThisMonth -
      analyticsData.trends.surveysLastMonth) /
      (analyticsData.trends.surveysLastMonth || 1)) *
    100
  ).toFixed(1);
  const cameraGrowth = (
    ((analyticsData.trends.camerasInstalled -
      analyticsData.trends.camerasLastMonth) /
      (analyticsData.trends.camerasLastMonth || 1)) *
    100
  ).toFixed(1);

  return (
    <div>
      <main className="flex-1  ">
        {/* Controls */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>

            <Select value={division} onValueChange={setDivision}>
              <SelectTrigger className="w-40 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl">
                <SelectValue placeholder="Division" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Divisions</SelectItem>
                <SelectItem value="pune">Pune</SelectItem>
                <SelectItem value="mumbai">Mumbai</SelectItem>
                <SelectItem value="nashik">Nashik</SelectItem>
                <SelectItem value="nagpur">Nagpur</SelectItem>
                <SelectItem value="aurangabad">Aurangabad</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-3">
            <PillButton variant="secondary" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Advanced Filters
            </PillButton>
            <PillButton variant="accent" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </PillButton>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <StatCard
              title="Total Surveys"
              value={analyticsData.overview.totalSurveys}
              subtitle="All time"
              trend={{
                value:
                  surveyGrowth >= 0 ? `+${surveyGrowth}%` : `${surveyGrowth}%`,
                direction: surveyGrowth >= 0 ? "up" : "down",
              }}
              icon={<BarChart3 className="w-6 h-6" />}
              color="amber"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <StatCard
              title="Completion Rate"
              value={`${Math.round(analyticsData.overview.completionRate)}%`}
              subtitle="This month"
              trend={{ value: "+5.2%", direction: "up" }} // Placeholder trend, replace with real data if available
              icon={<Target className="w-6 h-6" />}
              color="green"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <StatCard
              title="Avg Survey Time"
              value={`${analyticsData.overview.avgSurveyTime.toFixed(1)}h`}
              subtitle="Per survey"
              trend={{ value: "-0.3h", direction: "down" }} // Placeholder trend, replace with real data if available
              icon={<Clock className="w-6 h-6" />}
              color="blue"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <StatCard
              title="Efficiency Score"
              value={`${Math.round(analyticsData.overview.efficiency)}%`}
              subtitle="Team performance"
              trend={{ value: "+2.1%", direction: "up" }} // Placeholder trend, replace with real data if available
              icon={<Zap className="w-6 h-6" />}
              color="purple"
            />
          </motion.div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Completion Rate Circle */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <ModernCard className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Overall Progress
              </h3>
              <ProgressRing
                progress={analyticsData.overview.completionRate}
                size={160}
              >
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    {Math.round(analyticsData.overview.completionRate)}%
                  </div>
                  <div className="text-sm text-gray-600">Completion Rate</div>
                </div>
              </ProgressRing>
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {analyticsData.trends.surveysThisMonth}
                  </div>
                  <div className="text-gray-600">This Month</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {analyticsData.trends.camerasInstalled}
                  </div>
                  <div className="text-gray-600">Cameras</div>
                </div>
              </div>
            </ModernCard>
          </motion.div>

          {/* Monthly Trends */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="lg:col-span-2"
          >
            <ModernCard>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Monthly Trends
                </h3>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full"></div>
                    <span>Surveys</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"></div>
                    <span>Cameras</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {analyticsData.timeline.map((month, index) => (
                  <div
                    key={month.month}
                    className="flex items-center space-x-4"
                  >
                    <div className="w-12 text-sm font-medium text-gray-600">
                      {month.month}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          Surveys: {month.surveys}
                        </span>
                        <span className="text-sm font-medium">
                          {month.completion}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-amber-400 to-yellow-500 h-2 rounded-full"
                          style={{
                            width: `${
                              (month.surveys /
                                Math.max(
                                  ...analyticsData.timeline.map(
                                    (t) => t.surveys
                                  )
                                )) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          Cameras: {month.cameras}
                        </span>
                        <span className="text-sm font-medium">
                          {Math.round(
                            (month.cameras /
                              Math.max(
                                ...analyticsData.timeline.map((t) => t.cameras)
                              )) *
                              100
                          )}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full"
                          style={{
                            width: `${
                              (month.cameras /
                                Math.max(
                                  ...analyticsData.timeline.map(
                                    (t) => t.cameras
                                  )
                                )) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ModernCard>
          </motion.div>
        </div>

        {/* Division Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <ModernCard>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Division Performance
              </h3>
              <PillButton variant="secondary" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                Last 30 days
              </PillButton>
            </div>

            <div className="space-y-4">
              {analyticsData.performance.map((division, index) => (
                <motion.div
                  key={division.division}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-white/50 backdrop-blur-sm border border-white/30 rounded-2xl"
                >
                  <div className="flex items-center space-x-4">
                    <div className="bg-gradient-to-br from-purple-400 to-purple-600 p-3 rounded-2xl">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">
                        {division.division}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {division.surveys} surveys completed
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">
                        {division.completion}%
                      </div>
                      <div className="text-xs text-gray-600">Completion</div>
                    </div>

                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">
                        {division.efficiency}%
                      </div>
                      <div className="text-xs text-gray-600">Efficiency</div>
                    </div>

                    <div className="w-24">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-green-400 to-emerald-500 h-2 rounded-full"
                          style={{ width: `${division.completion}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      {division.completion > 85 ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                      <span
                        className={`text-sm font-medium ${
                          division.completion > 85
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {division.completion > 85
                          ? "Excellent"
                          : "Needs Improvement"}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </ModernCard>
        </motion.div>
      </main>
    </div>
  );
}
