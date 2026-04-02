"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { ModernSidebar } from "@/components/layout/modern-sidebar";
import { ModernHeader } from "@/components/layout/modern-header";
import { ModernCard } from "@/components/ui/modern-card";
import { PillButton } from "@/components/ui/pill-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import {
  User,
  Bell,
  Shield,
  Database,
  Save,
  RefreshCw,
  Upload,
  Eye,
  EyeOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [showPassword, setShowPassword] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        setToken(storedToken);
      }
    }
  }, []);

  const [settings, setSettings] = useState({
    profile: {
      name: "Survey Team Admin",
      email: "admin@msrtc.gov.in",
      phone: "+91 98765 43210",
      division: "All",
      role: "Administrator",
    },
    notifications: {
      emailAlerts: true,
      smsAlerts: false,
      pushNotifications: true,
      surveyReminders: true,
      systemUpdates: false,
    },
    system: {
      autoBackup: true,
      backupFrequency: "daily",
      dataRetention: "1year",
      gpsAccuracy: "high",
      cameraQuality: "4k",
    },
    security: {
      twoFactorAuth: false,
      sessionTimeout: "30min",
      passwordExpiry: "90days",
      loginAttempts: "5",
    },
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const tabs = [
    { id: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
    {
      id: "notifications",
      label: "Notifications",
      icon: <Bell className="w-4 h-4" />,
    },
    { id: "system", label: "System", icon: <Database className="w-4 h-4" /> },
    { id: "security", label: "Security", icon: <Shield className="w-4 h-4" /> },
  ];

  // ✅ Save handler
  const handleSave = () => {
    console.log("Settings saved:", settings);
    toast({
      variant: "success",
      title: "Success",
      description: "Settings saved successfully!",
    });
  };

  // ✅ Change password handler
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (!passwordData.currentPassword || !passwordData.newPassword) {
      setError("All fields are required");
      return;
    }

    try {
      const res = await api.post("/auth/change-password", {
        currentPassword: passwordData.currentPassword,
        password: passwordData.newPassword,
        passwordConfirmation: passwordData.confirmPassword,
      });

      if (res.status !== 200) {
        throw new Error(
          res.data?.error?.message || "Failed to update password"
        );
      }

      toast({
        variant: "success",
        title: "Success",
        description: "Password updated successfully!",
      });

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setError(null);
    } catch (err: any) {
      setError(err.message || "An error occurred while updating the password");
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to update password",
      });
    }
  };

  // 🕒 Wait until token is verified
  if (!token)
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-500 text-lg">Checking session...</p>
      </div>
    );

  // ✅ Main UI
  return (
    <div className="min-h-screen">
      <main className="container mx-auto">
        <div className="max-w-full sm:max-w-3xl lg:max-w-4xl mx-auto">
          {/* 🔹 Tab Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 sm:mb-8"
          >
            <ModernCard className="p-2 sm:p-3">
              <div className="flex flex-wrap gap-2 sm:gap-3 bg-white/50 backdrop-blur-sm rounded-full p-1 sm:p-2 border border-white/30">
                {tabs.map((tab) => (
                  <PillButton
                    key={tab.id}
                    variant="primary"
                    size="sm"
                    active={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm py-2 sm:py-2.5 px-3 sm:px-4"
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </PillButton>
                ))}
              </div>
            </ModernCard>
          </motion.div>

          {/* 🔸 Profile Tab */}
          {activeTab === "profile" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-4 sm:space-y-6"
            >
              <ModernCard className="p-4 sm:p-6">
                <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                  <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl sm:rounded-2xl">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                      Profile Information
                    </h3>
                    <p className="text-sm text-gray-600">
                      Update your personal information and preferences
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <InputField
                    label="Full Name"
                    value={settings.profile.name}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        profile: { ...settings.profile, name: e.target.value },
                      })
                    }
                  />
                  <InputField
                    label="Email Address"
                    type="email"
                    value={(settings.profile.email || "").toLowerCase()}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        profile: { ...settings.profile, email: e.target.value },
                      })
                    }
                  />
                  <InputField
                    label="Phone Number"
                    value={settings.profile.phone}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        profile: { ...settings.profile, phone: e.target.value },
                      })
                    }
                  />

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Division</Label>
                    <Select
                      value={settings.profile.division}
                      onValueChange={(value) =>
                        setSettings({
                          ...settings,
                          profile: { ...settings.profile, division: value },
                        })
                      }
                    >
                      <SelectTrigger className="h-10 sm:h-12 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl sm:rounded-2xl text-sm sm:text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["All", "Pune", "Mumbai", "Nashik", "Nagpur", "Aurangabad"].map(
                          (division) => (
                            <SelectItem key={division} value={division}>
                              {division}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200/50">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 text-base sm:text-lg">
                        Profile Picture
                      </h4>
                      <p className="text-sm text-gray-600">
                        Upload a new profile picture
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                      </div>
                      <PillButton
                        variant="secondary"
                        size="sm"
                        className="px-3 sm:px-4"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                      </PillButton>
                    </div>
                  </div>
                </div>
              </ModernCard>
            </motion.div>
          )}

          {/* 🔹 Security Tab (Password Update) */}
          {activeTab === "security" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-4 sm:space-y-6"
            >
              <ModernCard className="p-4 sm:p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Security Settings
                </h3>

                <form
                  onSubmit={handlePasswordChange}
                  className="space-y-3 sm:space-y-4"
                >
                  {error && <p className="text-red-600 text-sm">{error}</p>}
                  <PasswordField
                    label="Current Password"
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        currentPassword: e.target.value,
                      })
                    }
                    showPassword={showPassword}
                    toggleShow={() => setShowPassword(!showPassword)}
                  />
                  <PasswordField
                    label="New Password"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        newPassword: e.target.value,
                      })
                    }
                  />
                  <PasswordField
                    label="Confirm Password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        confirmPassword: e.target.value,
                      })
                    }
                  />
                  <PillButton variant="accent" size="sm" type="submit">
                    Update Password
                  </PillButton>
                </form>
              </ModernCard>
            </motion.div>
          )}

          {/* 🔘 Save Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-4 sm:pt-6"
          >
            <PillButton
              variant="secondary"
              size="lg"
              className="h-10 sm:h-12 px-4 sm:px-6 w-full sm:w-auto"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </PillButton>
            <PillButton
              variant="accent"
              size="lg"
              onClick={handleSave}
              className="h-10 sm:h-12 px-4 sm:px-6 w-full sm:w-auto"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </PillButton>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

/* 🔧 Reusable Input Field Component */
function InputField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={onChange}
        className="h-10 sm:h-12 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl sm:rounded-2xl text-sm sm:text-base"
      />
    </div>
  );
}

/* 🔐 Reusable Password Field Component */
function PasswordField({
  label,
  value,
  onChange,
  showPassword = false,
  toggleShow,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showPassword?: boolean;
  toggleShow?: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={`Enter ${label.toLowerCase()}`}
          className="h-10 sm:h-12 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl sm:rounded-2xl pr-12 text-sm sm:text-base"
        />
        {toggleShow && (
          <button
            type="button"
            onClick={toggleShow}
            className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
