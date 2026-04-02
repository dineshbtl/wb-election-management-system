"use client";

import { useLogout } from "@/app/logout";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { Tooltip } from "antd";
import axios from "axios";
import {
  Search,
  Bell,
  Settings,
  User,
  Wifi,
  WifiOff,
  Menu,
  ArrowBigRightIcon,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface ModernHeaderProps {
  title: string;
  subtitle?: string;
  showSearch?: boolean;
  showGPS?: boolean;
  gpsStatus?: "connected" | "disconnected";
  className?: string;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export function AssemblyHeader({
  title,
  subtitle,
  showSearch = true,
  showGPS = true,
  gpsStatus = "connected",
  className,
  onToggleSidebar,
  isSidebarOpen,
}: ModernHeaderProps) {
  const [user, setUser] = useState({
    email: "",
    id: 0,
    username: "",
    documentId: "",
    role: {
      name: "",
      type: "",
    },
  });

  //   const getuser = async () => {
  //     const token = localStorage.getItem("token");
  //     if (!token) return;

  //     try {
  //       // First try: default Strapi user
  //       const res = await api.get("/users/me?populate=*");
  //       setUser(res.data);
  //       console.log("✅ Default Strapi user data:", res.data);
  //     } catch (err: any) {
  //       console.warn("⚠️ Default user fetch failed, trying App User API...");

  //       try {
  //         // Second try: App User endpoint
  //         const res2 = await api.get("/app-user/me"); // 👈 your backend should support this
  //         setUser(res2.data.user || res2.data);
  //         console.log("✅ App User data:", res2.data);
  //       } catch (appErr: any) {
  //         console.error("❌ Failed to fetch user data:", appErr);
  //       }
  //     }
  //   };

  //   useEffect(() => {
  //     getuser();
  //   }, []);

  const logout = useLogout();

  return (
    <header
      className={`bg-white/30 backdrop-blur-sm border-b border-gray-300/70 px-6 py-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          {/* Hamburger menu for mobile */}
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-xl bg-white/50 hover:bg-white/70 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Assembly Dashboard
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {/* 
            <button className="relative p-2 bg-white/50 backdrop-blur-sm rounded-full border border-gray-200 hover:bg-white/70 transition-colors">
              <Bell className="w-5 h-5 text-gray-600" />
              <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs bg-gradient-to-r from-amber-400 to-yellow-500 text-white border-0">
                3
              </Badge>
              
            </button>
             */}

            <Tooltip title="Logout" placement="bottom">
              <button
                onClick={logout}
                className="relative p-2 bg-white/50 backdrop-blur-sm rounded-full border border-gray-200 hover:bg-white/70 transition-colors"
              >
                <LogOut className="w-5 h-5 text-gray-600" />
              </button>
            </Tooltip>

            <div className="w-px h-6 bg-gray-300" />

            <div className="flex items-center space-x-3 bg-white/50 backdrop-blur-sm rounded-full px-4 py-2 border border-gray-200">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">
                  {user.username}
                </p>
                <p className="text-xs text-gray-600">Online</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
