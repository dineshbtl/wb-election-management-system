"use client";

import { useState, useEffect } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { ModernSidebar } from "@/components/layout/modern-sidebar";
import { ModernHeader } from "@/components/layout/modern-header";
import { ModernCard } from "@/components/ui/modern-card";
import { PillButton } from "@/components/ui/pill-button";
import { StatCard } from "@/components/ui/stat-card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, Activity, MapPin, Plus } from "lucide-react";
import api from "@/lib/api";

export default function TeamPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newMember, setNewMember] = useState({
    username: "",
    email: "",
    password: "",
    role: "superadmin", // default
  });

  // ✅ Fetch users from Strapi
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get("/users?populate=*");
        setTeamMembers(res.data);
      } catch (err: any) {
        console.error("Error fetching users:", err.message || err);
      }
    };

    fetchUsers();
  }, []);

  // ✅ Handle Add Member
  const handleAddMember = async () => {
    setIsSubmitting(true);
    try {
      // Create the new user
      const res = await api.post("/users", {
        username: newMember.username,
        email: newMember.email,
        password: newMember.password,
        role: newMember.role,
      });

      if (res.status !== 201) {
        alert("Error: Failed to add member");
        return;
      }

      // Refetch all users
      const usersRes = await api.get("/users?populate=*");
      setTeamMembers(usersRes.data);

      setShowAddModal(false);
      setNewMember({
        username: "",
        email: "",
        password: "",
        role: "superadmin",
      });
    } catch (err: any) {
      console.error(err);
      alert("Something went wrong: " + (err.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Filtering
  const filteredMembers = teamMembers.filter((member) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      member.username?.toLowerCase().includes(search) ||
      member.email?.toLowerCase().includes(search);

    const matchesRole =
      roleFilter === "all" ||
      member.role?.name?.toLowerCase() === roleFilter.toLowerCase();

    return matchesSearch && matchesRole;
  });

  const activeMembers = teamMembers.filter((m) => !m.blocked).length;

  return (
    <div>
      <main className="flex-1 ">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Members"
            value={teamMembers.length}
            subtitle="All roles"
            icon={<Users />}
            color="amber"
          />
          <StatCard
            title="Active Members"
            value={activeMembers}
            subtitle="Enabled"
            icon={<UserCheck />}
            color="green"
          />
          <StatCard
            title="Total Surveys"
            value={0}
            subtitle="Completed"
            icon={<Activity />}
            color="blue"
          />
          <StatCard
            title="Avg Performance"
            value={0}
            subtitle="Surveys per member"
            icon={<MapPin />}
            color="purple"
          />
        </div>

        {/* Filters + Add */}
        <ModernCard className="p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Left side: search + filter */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-3 w-full md:w-auto">
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full sm:w-64" // Full width on mobile, fixed width on sm+
              />
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-10 w-full sm:w-40">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="superadmin">Superadmin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="technitian">Technitian</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Right side: add member button */}
            <div className="flex justify-end md:justify-start">
              <PillButton
                variant="accent"
                size="sm"
                onClick={() => setShowAddModal(true)}
                className="h-10 px-4 w-full sm:w-auto" // Full width on mobile, auto on larger screens
              >
                <Plus className="w-4 h-4 mr-2" /> Add Member
              </PillButton>
            </div>
          </div>
        </ModernCard>

        {/* Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member) => (
            <ModernCard key={member.id}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">{member.username}</h3>
                  <p className="text-sm text-gray-500">{(member.email || "").toLowerCase()}</p>
                </div>
                <Badge>{member.role?.name || "No role"}</Badge>
              </div>
            </ModernCard>
          ))}
        </div>

        {/* Add Member Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="w-full max-w-2xl p-6 rounded-2xl shadow-2xl bg-white dark:bg-neutral-900 space-y-6 animate-in fade-in-50 slide-in-from-bottom-10">
              {/* Header */}
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                  Add New Member
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition"
                >
                  ✕
                </button>
              </div>

              {/* Form Fields - responsive grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Username */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Username
                  </label>
                  <Input
                    placeholder="Enter username"
                    value={newMember.username}
                    onChange={(e) =>
                      setNewMember({
                        ...newMember,
                        username: e.target.value,
                      })
                    }
                    className="h-11"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email
                  </label>
                  <Input
                    placeholder="Enter email address"
                    type="email"
                    value={newMember.email}
                    onChange={(e) =>
                      setNewMember({ ...newMember, email: e.target.value })
                    }
                    className="h-11"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password
                  </label>
                  <Input
                    placeholder="Enter password"
                    type="password"
                    value={newMember.password}
                    onChange={(e) =>
                      setNewMember({
                        ...newMember,
                        password: e.target.value,
                      })
                    }
                    className="h-11"
                  />
                </div>

                {/* Role */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Role
                  </label>
                  <Select
                    value={newMember.role}
                    onValueChange={(val) =>
                      setNewMember({ ...newMember, role: val })
                    }
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">Superadmin</SelectItem>
                      <SelectItem value="4">Admin</SelectItem>
                      <SelectItem value="5">Technitian</SelectItem>
                      <SelectItem value="6">Purchase department</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-5 border-t border-gray-200 dark:border-neutral-700">
                <PillButton
                  variant="secondary"
                  onClick={() => setShowAddModal(false)}
                  className="h-10 px-5"
                >
                  Cancel
                </PillButton>
                <PillButton
                  variant="accent"
                  onClick={handleAddMember}
                  disabled={isSubmitting}
                  className="h-10 px-5"
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </PillButton>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
