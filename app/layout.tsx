import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import "lucide-react";
import "framer-motion";
import { AuthProvider } from "@/context/AuthContext";
import NextTopLoader from "nextjs-toploader";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Assam Election Management System",
  description: "Comprehensive Bihar Election managemen",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <NextTopLoader color="#00ADE7" />

        <AuthProvider>{children}</AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
