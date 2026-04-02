"use client";

import dynamic from "next/dynamic";

const LoggedInUserCertificate = dynamic(
  () => import("@/components/certificate/page"),
  { ssr: false }
);

export default function CertificatePageClient() {
  return <LoggedInUserCertificate />;
}
