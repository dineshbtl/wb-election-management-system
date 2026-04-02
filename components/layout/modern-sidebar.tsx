"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  Camera,
  MapPin,
  Map,
  BarChart3,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  TableProperties,
  ShoppingCart,
  User2Icon,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PillButton } from "@/components/ui/pill-button";
import api from "@/lib/api";

type SidebarUser = {
  role?: { name?: string; type?: string | null } | null;
};

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** If set, item is shown only when this returns true */
  showWhen?: (user: SidebarUser) => boolean;
};

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Surveys", href: "/surveys", icon: FileText },
  // { name: "Projects", href: "/projects", icon: FileText },
  // { name: "Cameras", href: "/cameras", icon: Camera },
  { name: "Districts", href: "/districts", icon: Map },
  { name: "Assemblies", href: "/assemblies", icon: TableProperties },
  // { name: "Polling Stations", href: "/locations", icon: MapPin }, // hidden per request

  // { name: "BOQ", href: "/boqs1", icon: TableProperties },
  // { name: "BOQ", href: "/test", icon: TableProperties },
  // { name: "Products", href: "/products", icon: ShoppingCart },
  // { name: "Analytics", href: "/analytics", icon: BarChart3 },
  // { name: "Reports", href: "/reports", icon: FileText },
  // Upload Data — hidden for all users (per product request)
  {
    name: "Web Casting Declaration",
    href: "/web-casting-declarations",
    icon: ScrollText,
  },
  { name: "Users", href: "/users", icon: Users },
  // { name: "Settings", href: "/settings", icon: Settings },
  { name: "Account", href: "/account", icon: User2Icon },
];

interface ModernSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function ModernSidebar({ isOpen = false, onClose }: ModernSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const router = useRouter();

  const [user, setUser] = useState<SidebarUser & Record<string, unknown>>({
    email: "",
    id: 0,
    username: "",
    documentId: "",
    role: {
      name: "",
      type: "",
    },
  });

  const visibleNavigation = React.useMemo(
    () =>
      navigation.filter((item) => !item.showWhen || item.showWhen(user)),
    [user],
  );

  const getUser = async () => {
    if (typeof window === "undefined") return;

    // ✅ Try cache first
    const cachedUser = sessionStorage.getItem("user");
    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
      } catch {
        sessionStorage.removeItem("user");
      }
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      // Valid state: user not logged in or on unprotected route
      return;
    }

    try {
      const res = await api.get("/users/me?populate=*");
      const userData = res.data?.user ?? res.data;
      setUser(userData);
      sessionStorage.setItem("user", JSON.stringify(userData));
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    if (saved) setIsCollapsed(saved === "true");
  }, []);

  const toggleSidebar = () => {
    const newValue = !isCollapsed;
    setIsCollapsed(newValue);
    localStorage.setItem("sidebarCollapsed", String(newValue));
  };

  useEffect(() => {
    const timer = setTimeout(() => getUser(), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    visibleNavigation.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [router, visibleNavigation]);

  const NavItems = React.memo(
    ({
      isCollapsed,
      pathname,
      onClose,
      items,
    }: {
      isCollapsed: boolean;
      pathname: string;
      onClose?: () => void;
      items: NavItem[];
    }) => (
    <>
      {items.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.name}
            // onClick={() => {
            //   // navigate immediately and close sidebar
            //   router.push(item.href);
            //   onClose && onClose();
            // }}
            href={item.href}
            prefetch={true}
            onClick={() => onClose && onClose()}
            className="w-full text-left"
            aria-current={isActive ? "page" : undefined}
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "flex items-center rounded-2xl transition-all duration-200 w-full",
                isCollapsed
                  ? "justify-center px-0 py-3"
                  : "px-4 py-3 space-x-3",
                isActive
                  ? "bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] text-white shadow-lg"
                  : "text-[#666666] hover:bg-[#F0F0F0] hover:text-[#333333]",
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
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
    </>
    ),
  );

  return (
    <motion.div
      initial={{ width: 280 }}
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn(
        "bg-white backdrop-blur-sm border-r border-gray-300/70 flex flex-col h-screen overflow-y-auto custom-scrollbar w-[280px] max-w-[85vw] md:max-w-none md:w-auto",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "md:translate-x-0 transition-transform duration-300 ease-in-out z-50 flex-shrink-0",
      )}
      style={{ scrollbarGutter: "stable", minWidth: 0 }}
    >
      {/* Header */}
      <div className="p-6 border-b border-[#E0E0E0] flex items-center justify-between">
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
              <h1 className="text-lg font-bold text-[#333333]">Assam Election</h1>
              <p className="text-sm text-[#666666]">Monitoring System</p>
            </div>
          </motion.div>
        )}
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-xl bg-[#F5F5F5] hover:bg-[#E0E0E0] transition-colors hidden md:block"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-[#666666]" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-[#666666]" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#F5F5F5] hover:bg-[#E0E0E0] transition-colors md:hidden"
          >
            <X className="w-4 h-4 text-[#666666]" />
          </button>
        </div>
      </div>

      {/* Quick Action */}
      {/* {!isCollapsed && (
        <div className="p-6 border-b border-white/30">
          <Link href="/surveys/new">
            <PillButton className="w-full bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Survey
            </PillButton>
          </Link>
        </div>
      )} */}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <NavItems
          isCollapsed={isCollapsed}
          pathname={pathname}
          onClose={onClose}
          items={visibleNavigation}
        />
      </nav>

      {/* Quick Action Button — Standalone & Highlighted */}
      {/* {!isCollapsed && (
        <div className="px-4 pb-4">
          <Link href="/surveys/new" passHref>
            <motion.div
              whileHover={{
                scale: 1.03,
                boxShadow: "0 4px 12px rgba(0,173,231,0.3)",
              }}
              whileTap={{ scale: 0.98 }}
              className="group"
            >
              <PillButton className="w-full bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] text-white font-medium shadow-md hover:shadow-lg transition-shadow duration-200">
                <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" />
                New Survey
              </PillButton>
            </motion.div>
          </Link>
        </div>
      )} */}

      {/* Footer */}
        {!isCollapsed && (
        <div className="p-6 border-t border-[#E0E0E0]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#3A8DFF] to-[#2196F3] rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">TT</span>
            </div>
            <div>
              <p className="text-sm font-medium text-[#333333]">{user.username}</p>
              <p className="text-xs text-[#666666]">Administrator</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
