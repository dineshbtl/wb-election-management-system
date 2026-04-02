"use client";

import { useParams } from "next/navigation";
import WebCastingDeclarationClient from "@/components/web-casting/WebCastingDeclarationClient";

export default function EditWebCastingDeclarationPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  if (!id) {
    return null;
  }
  return (
    <div className="min-h-0 bg-white -m-3 sm:-m-6 p-3 sm:p-6">
      <WebCastingDeclarationClient editSubmissionId={id} />
    </div>
  );
}
