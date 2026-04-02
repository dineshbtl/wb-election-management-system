"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MapPin,
  Camera,
  BarChart3,
  Settings,
  Users,
  FileText,
  Bell,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";

interface SidebarProps {
  className?: string;
}

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    badge: null,
  },
  {
    name: "Site Surveys",
    href: "/surveys",
    icon: MapPin,
    badge: "12",
  },
  {
    name: "Camera Management",
    href: "/cameras",
    icon: Camera,
    badge: null,
  },
  {
    name: "Interactive Map",
    href: "/map",
    icon: MapPin,
    badge: null,
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    badge: null,
  },
  {
    name: "Reports",
    href: "/reports",
    icon: FileText,
    badge: null,
  },
  {
    name: "Team Management",
    href: "/team",
    icon: Users,
    badge: null,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    badge: null,
  },
];

export function AdvancedSidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-white border-r border-slate-200 transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                MSRTC CCTV
              </h1>
              <p className="text-xs text-slate-500">Survey System</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="p-2"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start h-12 transition-all duration-200",
                  collapsed ? "px-3" : "px-4",
                  isActive &&
                    "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg",
                  !isActive && "hover:bg-slate-100"
                )}
              >
                <item.icon className={cn("w-5 h-5", collapsed ? "" : "mr-3")} />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.name}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-200">
        {!collapsed ? (
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-slate-50">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                Survey Team
              </p>
              <p className="text-xs text-slate-500 truncate">Pune Division</p>
            </div>
            <Button variant="ghost" size="sm" className="p-1">
              <Bell className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="w-full p-3">
            <Users className="w-5 h-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
