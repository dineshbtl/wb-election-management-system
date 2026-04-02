import { NextRequest, NextResponse } from "next/server";
import {
  canonicalDisplayName,
  canonicalLocationKey,
  stripLeadingBoothPrefix,
} from "@/lib/canonicalLocationNormalize";
import {
  countCanonicalReferenceRows,
  loadCanonicalCsvRows,
} from "@/lib/canonicalCsvReference";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://183.82.117.36:1337/api";

type AssemblyRecord = {
  assemblyId?: string;
  assemblyName?: string;
  districtId?: string;
  districtName?: string;
  locations: Array<{
    documentId: string;
    PS_Name: string;
    PS_No: string;
    survey?: {
      documentId?: string;
      site_condition?: string | null;
      survey_date?: string | null;
      state?: string | null;
    } | null;
    booth_coordinator?: {
      documentId: string;
      email?: string;
      username?: string;
      profile?: {
        Full_Name?: string | null;
        Phone_Number?: string | null;
      } | null;
    } | null;
  }>;
};

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function extractAssemblyRecord(item: any): AssemblyRecord {
  const attrs = item?.attributes ?? item;
  const assemblyId =
    attrs?.documentId ?? item?.documentId ?? attrs?.id ?? item?.id;
  const assemblyName = attrs?.Assembly_Name ?? item?.Assembly_Name;

  const districtRaw = attrs?.district ?? item?.district;
  const districtData = districtRaw?.data ?? districtRaw;
  const districtAttrs = districtData?.attributes ?? districtData;
  const districtId =
    districtAttrs?.documentId ??
    districtData?.documentId ??
    districtAttrs?.id ??
    districtData?.id;
  const districtName = districtAttrs?.district_name ?? districtData?.district_name;

  const rawLocations = attrs?.locations ?? item?.locations;
  const locations = asArray(rawLocations)
    .map((loc) => {
      const locAttrs = loc?.attributes ?? loc;
      const surveyRaw = locAttrs?.survey ?? loc?.survey;
      const surveyData = surveyRaw?.data ?? surveyRaw;
      const surveyAttrs = surveyData?.attributes ?? surveyData;

      const coordinatorRaw =
        locAttrs?.booth_coordinator ?? loc?.booth_coordinator;
      const coordinatorData = coordinatorRaw?.data ?? coordinatorRaw;
      const coordinatorAttrs = coordinatorData?.attributes ?? coordinatorData;
      const profileRaw =
        coordinatorAttrs?.profile ?? coordinatorData?.profile;
      const profileData = profileRaw?.data ?? profileRaw;
      const profileAttrs = profileData?.attributes ?? profileData;

      return {
        documentId: String(
          locAttrs?.documentId ?? loc?.documentId ?? locAttrs?.id ?? loc?.id ?? "",
        ),
        PS_Name: String(locAttrs?.PS_Name ?? loc?.PS_Name ?? "").trim(),
        PS_No: String(locAttrs?.PS_No ?? loc?.PS_No ?? "").trim(),
        survey: surveyData
          ? {
              documentId:
                surveyAttrs?.documentId ?? surveyData?.documentId ?? undefined,
              site_condition:
                surveyAttrs?.site_condition ?? surveyData?.site_condition ?? null,
              survey_date:
                surveyAttrs?.survey_date ?? surveyData?.survey_date ?? null,
              state: surveyAttrs?.state ?? surveyData?.state ?? null,
            }
          : null,
        booth_coordinator: coordinatorData
          ? {
              documentId: String(
                coordinatorAttrs?.documentId ??
                  coordinatorData?.documentId ??
                  coordinatorAttrs?.id ??
                  coordinatorData?.id ??
                  "",
              ),
              email: coordinatorAttrs?.email ?? coordinatorData?.email ?? undefined,
              username:
                coordinatorAttrs?.username ?? coordinatorData?.username ?? undefined,
              profile: profileData
                ? {
                    Full_Name:
                      profileAttrs?.Full_Name ?? profileData?.Full_Name ?? null,
                    Phone_Number:
                      profileAttrs?.Phone_Number ??
                      profileData?.Phone_Number ??
                      null,
                  }
                : null,
            }
          : null,
      };
    })
    .filter((loc) => !!loc.PS_Name && !!loc.documentId);

  return {
    assemblyId: assemblyId != null ? String(assemblyId) : undefined,
    assemblyName:
      assemblyName != null && String(assemblyName).trim()
        ? String(assemblyName).trim()
        : undefined,
    districtId: districtId != null ? String(districtId) : undefined,
    districtName:
      districtName != null && String(districtName).trim()
        ? String(districtName).trim().toLowerCase()
        : undefined,
    locations,
  };
}

/** Same rules as scripts/build_canonical_locations.py + strip Strapi PS number prefix. */
function canonicalGroupKey(
  psName: string,
  assemblyName: string,
  districtName: string,
): string {
  const stripped = stripLeadingBoothPrefix(psName);
  return canonicalLocationKey(stripped, assemblyName, districtName);
}

function canonicalLabel(psName: string, assemblyName: string): string {
  const stripped = stripLeadingBoothPrefix(psName);
  return canonicalDisplayName(stripped, assemblyName);
}

export async function GET(req: NextRequest) {
  try {
    const selectedDistrict = req.nextUrl.searchParams.get("districtId");
    const selectedAssembly = req.nextUrl.searchParams.get("assemblyId");
    const search = req.nextUrl.searchParams.get("search")?.trim().toLowerCase();
    const surveyState = req.nextUrl.searchParams.get("surveyState")?.trim();
    const listMode = req.nextUrl.searchParams.get("list") === "1";
    const kpisOnly = req.nextUrl.searchParams.get("kpisOnly") === "1";
    /** Skip building grouped list rows when only KPI JSON is needed (faster). Ignored when list=1. */
    const skipUniqueItemBuild = kpisOnly && !listMode;
    const requestPage = Math.max(
      1,
      Number.parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10) || 1,
    );
    const requestPageSize = Math.max(
      1,
      Number.parseInt(req.nextUrl.searchParams.get("pageSize") ?? "10", 10) || 10,
    );
    const token =
      req.cookies.get("token")?.value ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const assemblies: AssemblyRecord[] = [];
    let fetchPage = 1;
    const fetchPageSize = 100;
    let hasMore = true;

    while (hasMore) {
      const url = new URL(`${API_URL}/assemblies`);
      url.searchParams.set("pagination[page]", String(fetchPage));
      url.searchParams.set("pagination[pageSize]", String(fetchPageSize));
      url.searchParams.set("fields[0]", "documentId");
      url.searchParams.set("fields[1]", "Assembly_Name");
      url.searchParams.set("populate[district][fields][0]", "documentId");
      url.searchParams.set("populate[district][fields][1]", "district_name");
      url.searchParams.set("populate[locations][fields][0]", "PS_Name");
      url.searchParams.set("populate[locations][fields][1]", "PS_No");
      url.searchParams.set("populate[locations][fields][2]", "documentId");
      url.searchParams.set("populate[locations][populate][survey][fields][0]", "documentId");
      url.searchParams.set("populate[locations][populate][survey][fields][1]", "site_condition");
      url.searchParams.set("populate[locations][populate][survey][fields][2]", "survey_date");
      url.searchParams.set("populate[locations][populate][survey][fields][3]", "state");
      url.searchParams.set(
        "populate[locations][populate][booth_coordinator][fields][0]",
        "documentId",
      );
      url.searchParams.set(
        "populate[locations][populate][booth_coordinator][fields][1]",
        "email",
      );
      url.searchParams.set(
        "populate[locations][populate][booth_coordinator][fields][2]",
        "username",
      );
      url.searchParams.set(
        "populate[locations][populate][booth_coordinator][populate][profile][fields][0]",
        "Full_Name",
      );
      url.searchParams.set(
        "populate[locations][populate][booth_coordinator][populate][profile][fields][1]",
        "Phone_Number",
      );

      if (selectedDistrict) {
        url.searchParams.set(
          "filters[district][documentId][$eq]",
          selectedDistrict,
        );
      }
      if (selectedAssembly) {
        url.searchParams.set("filters[documentId][$eq]", selectedAssembly);
      }

      const res = await fetch(url.toString(), { headers });
      if (!res.ok) {
        throw new Error(`Strapi responded with ${res.status}`);
      }

      const json = await res.json();
      const items = json.data ?? [];

      for (const item of items) {
        assemblies.push(extractAssemblyRecord(item));
      }

      const meta = json.meta?.pagination ?? json.pagination;
      const total = meta?.total ?? meta?.totalCount ?? 0;
      const fallbackPages = Math.ceil(total / fetchPageSize);
      const pageCount =
        meta?.pageCount != null ? meta.pageCount : (fallbackPages > 0 ? fallbackPages : 1);

      hasMore = items.length >= fetchPageSize && fetchPage < pageCount;
      fetchPage++;
    }

    let totalPollingStations = 0;
    let uniqueLocations = 0;
    let raisedPollingStations = 0;
    let completedPollingStations = 0;
    let pendingPollingStations = 0;
    const uniqueItems = new Map<string, any>();
    const uniqueRaised = new Set<string>();
    const uniqueCompleted = new Set<string>();
    const uniquePending = new Set<string>();

    for (const assembly of assemblies) {
      const matchingLocations = assembly.locations.filter((location) => {
        if (surveyState === "Unassigned") {
          if (location.survey?.documentId) return false;
        } else if (surveyState && location.survey?.state !== surveyState) {
          return false;
        }
        if (!search) return true;

        return (
          location.PS_Name.toLowerCase().includes(search) ||
          location.PS_No.toLowerCase().includes(search) ||
          (assembly.assemblyName ?? "").toLowerCase().includes(search) ||
          (assembly.districtName ?? "").toLowerCase().includes(search)
        );
      });

      totalPollingStations += matchingLocations.length;
      const uniqueNames = new Set<string>();
      const asmName = assembly.assemblyName ?? "";
      const distName = assembly.districtName ?? "";

      for (const location of matchingLocations) {
        const uniqueItemKey = canonicalGroupKey(
          location.PS_Name,
          asmName,
          distName,
        );
        const namePart = uniqueItemKey.split("||")[0]?.trim() ?? "";
        if (!namePart) continue;
        uniqueNames.add(uniqueItemKey);

        const hasSurvey = !!location.survey?.documentId;
        const state = location.survey?.state ?? null;
        if (!hasSurvey) {
          pendingPollingStations += 1;
          uniquePending.add(uniqueItemKey);
        } else if (state === "Completed") {
          completedPollingStations += 1;
          uniqueCompleted.add(uniqueItemKey);
        } else if (state === "Raised") {
          raisedPollingStations += 1;
          uniqueRaised.add(uniqueItemKey);
        }

        if (!skipUniqueItemBuild) {
          const label = canonicalLabel(location.PS_Name, asmName);
          const assemblyPayload = {
            documentId: assembly.assemblyId ?? "",
            Assembly_Name: assembly.assemblyName ?? "—",
            district: {
              documentId: assembly.districtId ?? "",
              district_name: assembly.districtName ?? "—",
            },
          };

          if (!uniqueItems.has(uniqueItemKey)) {
            uniqueItems.set(uniqueItemKey, {
              ...location,
              PS_Name: label,
              canonicalName: label,
              pollingStationCount: 1,
              groupKey: uniqueItemKey,
              children: [
                {
                  ...location,
                  assembly: assemblyPayload,
                },
              ],
              assembly: assemblyPayload,
            });
          } else {
            const existing = uniqueItems.get(uniqueItemKey);
            if (existing) {
              existing.pollingStationCount = (existing.pollingStationCount ?? 1) + 1;
              existing.children = existing.children ?? [];
              existing.children.push({
                ...location,
                assembly: assemblyPayload,
              });
            }
          }
        }
      }
      uniqueLocations += uniqueNames.size;
    }

    const csvHasData = loadCanonicalCsvRows().length > 0;
    const referenceCsvCount = (() => {
      if (!csvHasData) return 0;
      if (selectedAssembly && assemblies.length) {
        return countCanonicalReferenceRows({
          assemblyName: assemblies[0]!.assemblyName ?? null,
        });
      }
      if (selectedDistrict && assemblies.length) {
        return countCanonicalReferenceRows({
          districtName: assemblies[0]!.districtName,
        });
      }
      if (selectedDistrict || selectedAssembly) return 0;
      return countCanonicalReferenceRows({});
    })();

    /** Align Total KPI with unique_locations_list_canonical.csv when not filtering the list. */
    const useCsvForUniqueTotal =
      csvHasData && !search && !surveyState;
    const uniqueLocationsKpi = useCsvForUniqueTotal
      ? referenceCsvCount
      : uniqueLocations;

    if (listMode) {
      const allUniqueItems = Array.from(uniqueItems.values()).sort((a, b) => {
        const districtA = a.assembly?.district?.district_name ?? "";
        const districtB = b.assembly?.district?.district_name ?? "";
        if (districtA !== districtB) return districtA.localeCompare(districtB);

        const assemblyA = a.assembly?.Assembly_Name ?? "";
        const assemblyB = b.assembly?.Assembly_Name ?? "";
        if (assemblyA !== assemblyB) return assemblyA.localeCompare(assemblyB);

        const psA = Number.parseInt(a.PS_No ?? "", 10);
        const psB = Number.parseInt(b.PS_No ?? "", 10);
        if (Number.isFinite(psA) && Number.isFinite(psB) && psA !== psB) {
          return psA - psB;
        }

        return a.PS_Name.localeCompare(b.PS_Name);
      });

      const start = (requestPage - 1) * requestPageSize;
      const items = allUniqueItems.slice(start, start + requestPageSize);

      return NextResponse.json({
        data: items,
        meta: {
          pagination: {
            page: requestPage,
            pageSize: requestPageSize,
            total: allUniqueItems.length,
            pageCount: Math.max(
              1,
              Math.ceil(allUniqueItems.length / requestPageSize),
            ),
          },
        },
        uniqueLocations: uniqueLocationsKpi,
        totalPollingStations,
        kpis: {
          totalPollingStations,
          uniqueLocations: uniqueLocationsKpi,
          raisedPollingStations,
          completedPollingStations,
          pendingPollingStations,
          raisedUniqueLocations: uniqueRaised.size,
          completedUniqueLocations: uniqueCompleted.size,
          pendingUniqueLocations: uniquePending.size,
        },
        totalAssemblies: assemblies.length,
      }, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    }

    const payload = {
      uniqueLocations: uniqueLocationsKpi,
      totalPollingStations,
      kpis: {
        totalPollingStations,
        uniqueLocations: uniqueLocationsKpi,
        raisedPollingStations,
        completedPollingStations,
        pendingPollingStations,
        raisedUniqueLocations: uniqueRaised.size,
        completedUniqueLocations: uniqueCompleted.size,
        pendingUniqueLocations: uniquePending.size,
      },
      totalAssemblies: assemblies.length,
    };
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err: any) {
    console.error("unique-locations API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to compute unique locations" },
      { status: 500 },
    );
  }
}
