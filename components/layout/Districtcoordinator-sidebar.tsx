"use client";

import { useEffect, useState, useCallback, memo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Camera,
  MapPin,
  Map,
  TableProperties,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  X,
  User2Icon,
  FileText,
  Users,
  Truck,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";

const navigation = [
  { name: "Dashboard", href: "/district/dashboard", icon: LayoutDashboard },

  { name: "Surveys", href: "/district/surveys", icon: FileText },

  { name: "Assemblies", href: "/district/assemblies", icon: TableProperties },
  { name: "Polling Stations", href: "/district/booths", icon: MapPin },

  {
    name: "Users",
    href: "/district/team",
    icon: Users,
  },
  // { name: "Dispatch", href: "/district/dispatch", icon: Truck },

  {
    name: "Web Casting Declaration",
    href: "/web-casting-declarations",
    icon: ScrollText,
  },

  {
    name: "Account",
    href: "/district/account",
    icon: User2Icon,
  },
];

// ✅ Memoized navigation items (prevents re-render on user/animation updates)
const NavItems = memo(function NavItems({
  isCollapsed,
  pathname,
  onClose,
}: any) {
  return (
    <nav className="flex-1 p-4 space-y-2">
      {navigation.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link key={item.name} href={item.href} onClick={() => onClose?.()}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "flex items-center rounded-2xl transition-all duration-200",
                isCollapsed
                  ? "justify-center px-0 py-3"
                  : "px-4 py-3 space-x-3",
                isActive
                  ? "bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] text-white shadow-lg"
                  : "text-gray-700 hover:bg-white/50 hover:text-gray-900",
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 flex-shrink-0",
                  isCollapsed ? "mx-auto" : "",
                )}
              />
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 1 }}
                  animate={{ opacity: isCollapsed ? 0 : 1 }}
                  transition={{ duration: 0.2 }}
                  className="font-medium"
                >
                  {item.name}
                </motion.span>
              )}
            </motion.div>
          </Link>
        );
      })}
    </nav>
  );
});

export function District_coordinator_sidebar({
  isOpen = false,
  onClose,
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  // ✅ 1. Load collapsed state from localStorage (persistent UX)
  useEffect(() => {
    const saved = localStorage.getItem("district_sidebar_collapsed");
    if (saved) setIsCollapsed(saved === "true");
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("district_sidebar_collapsed", String(newState));
  };

  // ✅ 2. Cached user loader (fast)
  const fetchUser = useCallback(async () => {
    const cached = sessionStorage.getItem("district_user");
    if (cached) {
      setUser(JSON.parse(cached));
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await axios.get(`${BACKEND_URL}/api/users/me?populate=*`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data);
      sessionStorage.setItem("district_user", JSON.stringify(res.data));
    } catch (err) {
      console.error("Error fetching user:", err);
    }
  }, [BACKEND_URL]);

  // ✅ 3. Fetch user info (delayed to improve initial render)
  useEffect(() => {
    const timer = setTimeout(fetchUser, 100);
    return () => clearTimeout(timer);
  }, [fetchUser]);

  return (
    <motion.div
      initial={{ width: 280 }}
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn(
        "bg-white backdrop-blur-sm border-r border-gray-300/70 flex flex-col h-screen overflow-y-auto custom-scrollbar md:w-auto",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "md:translate-x-0 transition-transform duration-300 ease-in-out z-50",
      )}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: isCollapsed ? 0 : 1 }}
            transition={{ duration: 0.2 }}
            className="flex items-center space-x-3"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-[#3A8DFF] to-[#2196F3] rounded-2xl flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                Assam Election
              </h1>
              <p className="text-sm text-gray-600">Monitoring System</p>
            </div>
          </motion.div>
        )}
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-xl bg-white/50 hover:bg-white/70 transition-colors hidden md:block"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/50 hover:bg-white/70 transition-colors md:hidden"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <NavItems
        isCollapsed={isCollapsed}
        pathname={pathname}
        onClose={onClose}
      />

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-6 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user?.username ? user.username.charAt(0).toUpperCase() : "U"}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {user?.username || "Loading..."}
              </p>
              <p className="text-xs text-gray-600">
                {user?.role?.name || "District Coordinator"}
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
