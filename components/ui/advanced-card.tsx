"use client"

import type React from "react"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"

interface AdvancedCardProps {
  title: string
  subtitle?: string
  value: string | number
  change?: {
    value: string
    type: "increase" | "decrease" | "neutral"
  }
  icon: React.ReactNode
  gradient?: string
  className?: string
  onClick?: () => void
}

export function AdvancedCard({
  title,
  subtitle,
  value,
  change,
  icon,
  gradient = "from-blue-500 to-blue-600",
  className,
  onClick,
}: AdvancedCardProps) {
  return (
    <motion.div whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }}>
      <Card
        className={cn(
          "relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer",
          className,
        )}
        onClick={onClick}
      >
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-5", gradient)} />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-600">{title}</p>
              {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
            <div className={cn("p-3 rounded-xl bg-gradient-to-br", gradient)}>
              <div className="text-white">{icon}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-slate-900">{value}</p>
              {change && (
                <div className="flex items-center mt-2">
                  <Badge
                    variant={
                      change.type === "increase" ? "default" : change.type === "decrease" ? "destructive" : "secondary"
                    }
                    className="text-xs"
                  >
                    {change.value}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
