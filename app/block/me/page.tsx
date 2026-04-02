"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Calendar,
  Badge,
  Award,
  Download,
  AlertCircle,
} from "lucide-react";
import { displayEmail } from "@/lib/utils";

const Page = () => {
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"personal" | "documents">(
    "personal",
  );

  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("No token found. Please log in again.");
          return;
        }

        // Step 1: Get auth user
        const authRes = await axios.get(`${API_URL}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const authUser = authRes.data;
        if (!authUser?.documentId) {
          throw new Error("Auth user missing");
        }

        // Step 2: Get full user with profile populated
        const profileRes = await axios.get(
          `${API_URL}/api/users/${authUser.id}?populate=profile`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const profile = profileRes.data.profile;
        if (!profile) {
          throw new Error("Profile not found");
        }

        const fullUser = {
          ...authUser,
          profile: {
            ...profile,
            // Add role name from auth user for display
            role: authUser.role?.name || "Coordinator",
          },
        };

        setUser(fullUser);
      } catch (err: any) {
        console.error("❌ Error fetching user:", err);
        setError("Failed to fetch user. Token might be invalid or expired.");
      }
    };

    fetchUser();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full border-l-4 border-red-500">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <h3 className="text-lg font-bold text-gray-900">Error</h3>
          </div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!user?.profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin mb-4">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full" />
          </div>
          <p className="text-gray-600 font-medium">Loading user profile...</p>
        </div>
      </div>
    );
  }

  // Safely access profile
  const profile = user.profile;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const downloadFile = (url: string, name: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
  };

  const infoCard = (
    icon: React.ReactNode,
    label: string,
    value: string | null | undefined,
  ) => (
    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
      <div className="text-blue-600 mt-1">{icon}</div>
      <div className="flex-1">
        <p className="text-sm text-gray-600 font-medium">{label}</p>
        <p className="text-base text-black font-semibold">
          {value || "Not provided"}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header Card */}
        <div className="bg-white/10 rounded-2xl shadow-xl overflow-hidden mb-6">
          <div className="h-32 bg-gradient-to-r from-blue-500 to-green-500" />
          <div className="px-6 sm:px-8 pb-6">
            <div className="flex flex-col sm:flex-row gap-6 -mt-16 mb-6">
              {/* Profile Image */}
              <div className="relative flex-shrink-0">
                {profile.Photo && profile.Photo.length > 0 ? (
                  <img
                    src={`${API_URL}${profile.Photo[0].url}`}
                    alt={profile.Full_Name}
                    className="w-32 h-32 rounded-2xl border-4 border-white shadow-lg object-cover"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-2xl border-4 border-white shadow-lg bg-gradient-to-br from-blue-400 to-green-400 flex items-center justify-center">
                    <User className="w-16 h-16 text-white" />
                  </div>
                )}
              </div>

              {/* Header Info */}
              <div className="flex-1 flex flex-col justify-center gap-2">
                <h1 className="text-3xl font-bold text-black">
                  {profile.Full_Name}
                </h1>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800 border-0">
                    {profile.role}
                  </Badge>
                  {profile.aadhar_verified && (
                    <Badge className="bg-blue-100 text-blue-800 border-0 flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      Verified
                    </Badge>
                  )}
                </div>
                <p className="text-gray-600 font-medium lowercase normal-case">
                  {displayEmail(user.email, "Not provided")}
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
                <p className="text-sm text-gray-600">District</p>
                <p className="text-base font-bold text-black">
                  {profile.District}
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
                <p className="text-sm text-gray-600">Assembly</p>
                <p className="text-base font-bold text-black">
                  {profile.Assembly}
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
                <p className="text-sm text-gray-600">State</p>
                <p className="text-base font-bold text-black">
                  {profile.State}
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
                <p className="text-sm text-gray-600">Member ID</p>
                <p className="text-base font-bold text-black">{user.id}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("personal")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === "personal"
                ? "bg-blue-500 text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            Personal Details
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
              activeTab === "documents"
                ? "bg-blue-500 text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            <FileText className="w-5 h-5" />
            Documents ({profile.verified_certificate?.length || 0})
          </button>
        </div>

        {/* Personal Details Tab */}
        {activeTab === "personal" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Contact Information */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-black mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-500" />
                Contact Information
              </h2>
              <div className="space-y-3">
                {infoCard(
                  <Mail className="w-5 h-5" />,
                  "Email",
                  displayEmail(user.email, "Not provided"),
                )}
                {infoCard(
                  <Phone className="w-5 h-5" />,
                  "Phone Number",
                  profile.Phone_Number,
                )}
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-black mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-500" />
                Address Information
              </h2>
              <div className="space-y-3">
                {infoCard(
                  <MapPin className="w-5 h-5" />,
                  "Address",
                  profile.address,
                )}
                {infoCard(null, "Village", profile.Village)}
                {infoCard(null, "Pincode", profile.Pincode)}
              </div>
            </div>

            {/* Identification Details */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-black mb-4 flex items-center gap-2">
                <Badge className="w-5 h-5 text-blue-500" />
                Identification Details
              </h2>
              <div className="space-y-3">
                {infoCard(
                  <Badge className="w-5 h-5" />,
                  "Aadhar Number",
                  profile.Aadhar,
                )}
                {infoCard(null, "Father's Name", profile.Father_Name)}
                {infoCard(null, "Mother's Name", profile.Mother_Name)}
              </div>
            </div>

            {/* Administrative Details */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-black mb-4 flex items-center gap-2">
                <Badge className="w-5 h-5 text-blue-500" />
                Administrative Details
              </h2>
              <div className="space-y-3">
                {infoCard(
                  <MapPin className="w-5 h-5" />,
                  "District",
                  profile.District,
                )}
                {infoCard(null, "Assembly", profile.Assembly)}
                {infoCard(null, "Bank/UPI", profile.Bank_or_UPI)}
                {infoCard(
                  <Calendar className="w-5 h-5" />,
                  "Registered Date",
                  formatDate(user.createdAt),
                )}
              </div>
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === "documents" && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-black mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Verified Certificates
            </h2>

            {profile.verified_certificate &&
            profile.verified_certificate.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {profile.verified_certificate.map((doc: any, index: number) => (
                  <div
                    key={doc.id}
                    className="border-2 border-blue-200 rounded-xl p-4 hover:shadow-lg transition-all hover:border-blue-400 group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-black truncate">
                            {doc.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(doc.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600">
                        {formatDate(doc.createdAt)}
                      </p>
                      <button
                        onClick={() =>
                          downloadFile(`${API_URL}${doc.url}`, doc.name)
                        }
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors group-hover:shadow-lg text-sm font-medium"
                      >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Download</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">
                  No documents uploaded yet
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Page;
