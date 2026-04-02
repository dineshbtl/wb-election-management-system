// app/locations/page.tsx
import { cookies } from "next/headers";
import LocationsClient from "./LocationsClient";
import api from "@/lib/api-server";

export default async function LocationsPage() {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value; // or "jwt"
  if (!token) return <div>Unauthorized</div>;

  // 1️⃣ Get logged-in user + role
  const meRes = await api.get(
    "/users/me?populate[role]=true&populate[assemblies]=true",
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  const user = meRes.data;
  const role = user.role?.type;

  /**
   * Resolve scope ONCE
   */
  let scope: any = {};

  if (role === "admin") {
    scope.type = "ALL";
  }

  if (role === "district_coordinator") {
    const dist = await api.get("/districts", {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        "filters[district_coordinator][documentId][$eq]": user.documentId,
        "pagination[pageSize]": 1,
      },
    });
    scope.type = "DISTRICT";
    scope.districtId = dist.data.data?.[0]?.documentId;
  }

  if (role === "block_coordinator") {
    const block = await api.get("/blocks", {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        "filters[assigned_coordinator][documentId][$eq]": user.documentId,
        "pagination[pageSize]": 1,
      },
    });
    scope.type = "BLOCK";
    scope.blockId = block.data.data?.[0]?.documentId;
  }

  if (role === "assembly_coordinator") {
    scope.type = "ASSEMBLY";
    scope.assemblyId = user.assemblies?.[0]?.documentId;
  }

  /**
   * Base filters derived from scope
   */
  const baseFilters: any = {};

  if (scope.type === "DISTRICT") {
    baseFilters["filters[assembly][district][documentId][$eq]"] =
      scope.districtId;
  }

  if (scope.type === "BLOCK") {
    baseFilters["filters[blocks][documentId][$eq]"] = scope.blockId;
  }

  if (scope.type === "ASSEMBLY") {
    baseFilters["filters[assembly][documentId][$eq]"] = scope.assemblyId;
  }

  // 2️⃣ Fetch locations (SSR)
  const locationsRes = await api.get("/locations", {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      ...baseFilters,
      "pagination[pageSize]": 10,
      "pagination[page]": 1,
      "populate[survey]": true,
      "populate[assembly][populate][district]": true,
      "populate[booth_coordinator][populate][profile]": true,
      sort: "PS_No:asc",
    },
  });

  // 3️⃣ KPIs (SSR)
  const [total, raised, completed] = await Promise.all([
    api.get("/locations", {
      headers: { Authorization: `Bearer ${token}` },
      params: { ...baseFilters, "pagination[pageSize]": 1 },
    }),
    api.get("/locations", {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        ...baseFilters,
        "filters[survey][state][$eq]": "Raised",
        "pagination[pageSize]": 1,
      },
    }),
    api.get("/locations", {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        ...baseFilters,
        "filters[survey][state][$eq]": "Completed",
        "pagination[pageSize]": 1,
      },
    }),
  ]);

  return (
    <LocationsClient
      user={user}
      role={role}
      scope={scope}
      initialLocations={locationsRes.data.data}
      pagination={locationsRes.data.meta.pagination}
      kpis={{
        total: total.data.meta.pagination.total,
        raised: raised.data.meta.pagination.total,
        completed: completed.data.meta.pagination.total,
      }}
    />
  );
}
