"use client";

import type React from "react";
import { motion } from "framer-motion";
import { ModernCard } from "@/components/ui/modern-card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NotFoundPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      {/* Floating Background Elements */}
      <div className="absolute top-10 sm:top-20 left-10 sm:left-20 w-64 sm:w-96 h-64 sm:h-96 bg-gradient-to-br from-amber-200/30 to-yellow-200/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
      <div className="absolute top-20 sm:top-40 right-10 sm:right-20 w-64 sm:w-96 h-64 sm:h-96 bg-gradient-to-br from-orange-200/30 to-amber-200/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 sm:left-40 w-64 sm:w-96 h-64 sm:h-96 bg-gradient-to-br from-yellow-200/30 to-orange-200/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <ModernCard className="shadow-2xl p-4 sm:p-6" padding="xl">
            <div className="text-center mb-6 sm:mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg"
              >
                <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </motion.div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Page Not Found
              </h2>
              <p className="text-sm text-gray-600">
                Oops! The page you&apos;re looking for doesn&apos;t exist.
              </p>
            </div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.1 }}
            >
              <Button
                onClick={() => router.push("/")}
                className="w-full h-10 sm:h-12 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-white font-medium rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-2 text-sm sm:text-base"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Back to Home</span>
              </Button>
            </motion.div>

            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200/50">
              <div className="flex justify-center gap-3 sm:gap-4 text-xs sm:text-sm">
                <div className="flex items-center space-x-2 text-gray-500">
                  <span>MSRTC CCTV Survey Management System</span>
                </div>
              </div>
            </div>
          </ModernCard>

          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-xs text-gray-500">
              Protected by enterprise-grade security • Version 2.0
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
