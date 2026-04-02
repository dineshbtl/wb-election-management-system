"use client";

import { useLogout } from "@/app/logout";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { Popover, Drawer, Tooltip } from "antd"; // ✅ instead of Tooltip
import { useMediaQuery } from "react-responsive";
import { io } from "socket.io-client";
import {
  Search,
  Bell,
  Settings,
  User,
  Wifi,
  WifiOff,
  Menu,
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

export function ModernHeader({
  title,
  subtitle,
  showSearch = true,
  showGPS = true,
  gpsStatus = "connected",
  className,
  onToggleSidebar,
}: ModernHeaderProps) {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [openDrawer, setOpenDrawer] = useState(false);
  const isMobile = useMediaQuery({ maxWidth: 767 });

  const getUser = async () => {
    try {
      const res = await api.get("/users/me?populate=*");
      setUser(res.data);
    } catch (err) {
      console.error("Failed to fetch user:", err);
    }
  };

  const notificationList = (
    <div className="w-[min(18rem,100vw-2rem)] sm:w-72 md:w-96 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl shadow-lg overflow-hidden">
      <div className="max-h-96 overflow-y-auto">
        {notifications.length > 0 ? (
          notifications.map((n: any, i: number) => (
            <div
              key={i}
              className={`flex justify-between items-start px-3 py-2 border-b ${
                n.read ? "bg-gray-50" : "bg-amber-50"
              }`}
            >
              <div className="pr-2">
                <p className="text-sm text-gray-800">{n.message}</p>
                <span className="text-xs text-gray-500">
                  {new Date(n.createdAt).toLocaleTimeString()}
                </span>
              </div>
              {/* {!n.read && (
                <button
                  onClick={async () => {
                    await api.put(`/notifications/${n.id}`, {
                      data: { read: true },
                    });
                    setNotifications((prev) =>
                      prev.map((item) =>
                        item.id === n.id ? { ...item, read: true } : item
                      )
                    );
                  }}
                  className="ml-2 text-xs px-2 py-1 rounded bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] text-white border-0"
                >
                  Seen
                </button>
              )} */}
            </div>
          ))
        ) : (
          <div className="px-3 py-6 text-center text-gray-500 text-sm">
            No notifications
          </div>
        )}
      </div>

      {/* {notifications.length > 0 && (
        <div className="px-3 py-2 bg-gray-100 flex justify-end">
          <button
            onClick={async () => {
              await Promise.all(
                notifications.map((n) =>
                  api.put(`/notifications/${n.documentId}`, {
                    data: { read: true },
                  })
                )
              );
              setNotifications((prev) =>
                prev.map((n) => ({ ...n, read: true }))
              );
            }}
            className="text-xs px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear All
          </button>
        </div>
      )} */}
    </div>
  );

  // const getNotifications = async () => {
  //   try {
  //     const res = await api.get(
  //       "/notifications?populate=users_permissions_user&sort=createdAt:desc&pagination[pageSize]=5"
  //     );
  //     if (user?.id) {
  //       const filteredNotifications = res.data.data.filter(
  //         (notification: any) =>
  //           notification.users_permissions_user.id === user.id
  //       );
  //       setNotifications(filteredNotifications);
  //     } else {
  //       setNotifications(res.data.data);
  //     }
  //   } catch (err) {
  //     console.error("Failed to fetch notifications:", err);
  //   }
  // };

  // useEffect(() => {
  //   getUser();
  // }, []);

  // useEffect(() => {
  // getNotifications();

  // const socket = io(
  //   process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
  //     "http://192.168.1.137:1337",
  //   {
  //     transports: ["websocket"],
  //   }
  // );

  //   socket.on("new_boq", (data) => {
  //     console.log("🔔 Live notification:", data);
  //     if (user?.id && data.users_permissions_user?.id === user.id) {
  //       setNotifications((prev) => [
  //         {
  //           id: Date.now(),
  //           message: data.message,
  //           createdAt: new Date().toISOString(),
  //           users_permissions_user: data.users_permissions_user,
  //           read: false,
  //         },
  //         ...prev,
  //       ]);
  //     }
  //   });

  //   return () => {
  //     socket.disconnect();
  //   };
  // }, [user]);

  const logout = useLogout();

  return (
    <header
      className={`bg-white/30 backdrop-blur-sm border-b border-gray-300/70 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0 ${className}`}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-xl bg-[#F5F5F5] hover:bg-[#E0E0E0] transition-colors flex-shrink-0"
          >
            <Menu className="w-5 h-5 text-[#666666]" />
          </button>

          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
              {title}
            </h1>
            {/* {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )} */}
          </div>

          {/* {showGPS && (
            <div className=" hidden md-block lg:flex items-center space-x-2 px-3 py-2 bg-white/50 backdrop-blur-sm rounded-full border border-white/30">
              {gpsStatus === "connected" ? (
                <Wifi className="w-4 h-4 text-green-600" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm font-medium text-gray-700">
                GPS {gpsStatus === "connected" ? "Connected" : "Disconnected"}
              </span>
              <div
                className={`w-2 h-2 rounded-full ${
                  gpsStatus === "connected" ? "bg-green-500" : "bg-red-500"
                } animate-pulse`}
              />
            </div>
          )} */}
        </div>

        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          {/* {showSearch && (
            <div className="hidden md:block relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search surveys, locations..."
                className="pl-10 pr-4 py-2 w-80 h-10 bg-white/50 border rounded-full text-sm"
              />
            </div>
          )} */}

          {/* <Link href="/settings">
            <button className="hidden md:block p-2 bg-white/50 rounded-full border hover:bg-white/70">
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          </Link> */}

          <Tooltip title="Logout" placement="bottom">
            <button
              onClick={logout}
              className="p-2 bg-[#F5F5F5] rounded-full border border-[#E0E0E0] hover:bg-[#E0E0E0]"
            >
              <LogOut className="w-5 h-5 text-[#666666]" />
            </button>
          </Tooltip>

          <div className="w-px h-6 bg-[#E0E0E0] hidden md:block" />
          {user && (
            <div className="hidden md:flex items-center space-x-3 bg-[#F8F9FA] rounded-full px-4 py-2 border border-[#E0E0E0]">
              <div className="w-8 h-8 bg-gradient-to-br from-[#3A8DFF] to-[#2196F3] rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-[#333333]">{user.username}</p>
                <p className="text-xs text-[#666666]">Online</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
