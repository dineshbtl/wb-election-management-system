"use client";

import { useEffect, useState } from "react";
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

import { PageLayout } from "@/components/layout/page-layout";
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
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

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
    { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
    { id: "system", label: "System", icon: <Database className="w-4 h-4" /> },
    { id: "security", label: "Security", icon: <Shield className="w-4 h-4" /> },
  ];

  const handleSave = () => {
    console.log("Settings saved:", settings);
    toast({
      variant: "success",
      title: "Success",
      description: "Settings saved successfully!",
    });
  };

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

      if (res.status !== 200) throw new Error(res.data?.error?.message || "Failed to update password");

      toast({
        variant: "success",
        title: "Success",
        description: "Password updated successfully!",
      });

      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
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

  // Toggle Switch Component
  const ToggleSwitch = ({
    value,
    onToggle,
  }: {
    value: boolean;
    onToggle: () => void;
  }) => (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        value ? "bg-gradient-to-r from-amber-400 to-yellow-500" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          value ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );

  return (
    <div className="min-h-screen">
      <main className="container mx-auto">
        <div className="max-w-full sm:max-w-3xl lg:max-w-4xl mx-auto">
          {/* Tabs */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6 sm:mb-8">
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

          {/* Render selected tab */}
          {activeTab === "profile" && (
            <ProfileSettings settings={settings} setSettings={setSettings} />
          )}
          {activeTab === "notifications" && (
            <NotificationSettings settings={settings} setSettings={setSettings} ToggleSwitch={ToggleSwitch} />
          )}
          {activeTab === "system" && <SystemSettings settings={settings} setSettings={setSettings} ToggleSwitch={ToggleSwitch} />}
          {activeTab === "security" && (
            <SecuritySettings
              settings={settings}
              setSettings={setSettings}
              passwordData={passwordData}
              setPasswordData={setPasswordData}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              handlePasswordChange={handlePasswordChange}
              error={error}
              ToggleSwitch={ToggleSwitch}
            />
          )}

          {/* Save Actions */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-4 sm:pt-6">
            <PillButton variant="secondary" size="lg" className="h-10 sm:h-12 px-4 sm:px-6 w-full sm:w-auto">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </PillButton>
            <PillButton variant="accent" size="lg" onClick={handleSave} className="h-10 sm:h-12 px-4 sm:px-6 w-full sm:w-auto">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </PillButton>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

// --- Tab Components ---
// You can separate these into different files if desired

function ProfileSettings({ settings, setSettings }: any) {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="space-y-4 sm:space-y-6">
      <ModernCard className="p-4 sm:p-6">
        {/* Profile form grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {[
            { label: "Full Name", value: settings.profile.name, key: "name" },
            { label: "Email Address", value: (settings.profile.email || "").toLowerCase(), key: "email", type: "email" },
            { label: "Phone Number", value: settings.profile.phone, key: "phone" },
          ].map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key} className="text-sm font-medium">
                {field.label}
              </Label>
              <Input
                id={field.key}
                type={field.type || "text"}
                value={field.value}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    profile: { ...settings.profile, [field.key]: e.target.value },
                  })
                }
                className="h-10 sm:h-12 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl sm:rounded-2xl text-sm sm:text-base"
              />
            </div>
          ))}

          <div className="space-y-2">
            <Label htmlFor="division" className="text-sm font-medium">
              Division
            </Label>
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
                {["All", "Pune", "Mumbai", "Nashik", "Nagpur", "Aurangabad"].map((div) => (
                  <SelectItem key={div} value={div}>
                    {div}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </ModernCard>
    </motion.div>
  );
}

// Similarly, NotificationSettings, SystemSettings, SecuritySettings can be broken out
// to reduce repetition and make this file cleaner.

