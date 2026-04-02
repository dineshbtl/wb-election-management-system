"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Bell, Settings, User, Wifi, WifiOff } from "lucide-react"
import { StatusIndicator } from "@/components/ui/status-indicator"

interface AdvancedHeaderProps {
  title: string
  subtitle?: string
  showSearch?: boolean
  showGPS?: boolean
  gpsStatus?: "connected" | "disconnected"
  className?: string
}

export function AdvancedHeader({
  title,
  subtitle,
  showSearch = true,
  showGPS = true,
  gpsStatus = "connected",
  className,
}: AdvancedHeaderProps) {
  return (
    <header className="bg-white/30 backdrop-blur-sm border-b border-gray-300/70 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            {subtitle && <p className="text-sm text-slate-600 mt-1">{subtitle}</p>}
          </div>

          {showGPS && (
            <div className="flex items-center space-x-2 px-3 py-2 bg-slate-50 rounded-lg">
              {gpsStatus === "connected" ? (
                <Wifi className="w-4 h-4 text-green-600" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm font-medium text-slate-700">
                GPS {gpsStatus === "connected" ? "Connected" : "Disconnected"}
              </span>
              <StatusIndicator status={gpsStatus === "connected" ? "online" : "offline"} size="sm" />
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {showSearch && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <Input placeholder="Search surveys, locations..." className="pl-10 w-80 h-10" />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-5 h-5" />
              <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs">3</Badge>
            </Button>

            <Button variant="ghost" size="sm">
              <Settings className="w-5 h-5" />
            </Button>

            <div className="w-px h-6 bg-slate-300" />

            <Button variant="ghost" size="sm" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-900">Survey Team</p>
                <p className="text-xs text-slate-500">Online</p>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
