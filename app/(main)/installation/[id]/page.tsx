"use client";

import InstallationdetailsPage from "@/components/installation/Installationdetails";
import { useParams } from "next/navigation";
import React from "react";

const page = () => {
  const { id } = useParams();

  return (
    <div>
      <InstallationdetailsPage id={id as string} />
    </div>
  );
};

export default page;
