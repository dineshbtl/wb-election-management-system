import type { AxiosInstance } from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/** Match list page default; large page sizes can stress Strapi. */
const PAGE_SIZE = 50;

export type ExportSurveyScope = {
  assemblyDocumentId?: string;
  districtDocumentId?: string;
  districtDocumentIds?: string[];
  surveyState?: "Raised" | "Completed";
};

function sanitizeFilenamePart(s: string): string {
  return String(s)
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80) || "export";
}

function assertScope(scope: ExportSurveyScope) {
  if (scope.assemblyDocumentId) return;
  if (scope.districtDocumentId) return;
  if (scope.districtDocumentIds && scope.districtDocumentIds.length > 0) return;
  throw new Error("Select a district or assembly before exporting.");
}

/**
 * Filters on `/locations` — same shape as `app/(main)/surveys/page.tsx`.
 */
function buildLocationFilterParams(
  scope: ExportSurveyScope,
): Record<string, string | number | boolean> {
  const p: Record<string, string | number | boolean> = {};

  if (scope.assemblyDocumentId) {
    p["filters[assembly][documentId][$eq]"] = scope.assemblyDocumentId;
  } else if (scope.districtDocumentIds && scope.districtDocumentIds.length > 1) {
    scope.districtDocumentIds.forEach((id, idx) => {
      p[`filters[assembly][district][documentId][$in][${idx}]`] = id;
    });
  } else if (
    scope.districtDocumentIds &&
    scope.districtDocumentIds.length === 1
  ) {
    p["filters[assembly][district][documentId][$eq]"] =
      scope.districtDocumentIds[0];
  } else if (scope.districtDocumentId) {
    p["filters[assembly][district][documentId][$eq]"] =
      scope.districtDocumentId;
  }

  if (scope.surveyState) {
    p["filters[survey][state][$eq]"] = scope.surveyState;
  }

  return p;
}

/** Byte-aligned with `fetchLocations` (surveys page) — proven not to 500. */
function locationPopulateParamsMinimal(): Record<string, string> {
  return {
    "populate[booth_coordinator][fields][0]": "documentId",
    "populate[booth_coordinator][fields][1]": "email",
    "populate[booth_coordinator][fields][2]": "username",
    "populate[booth_coordinator][populate][profile][fields][0]": "Full_Name",
    "populate[booth_coordinator][populate][profile][fields][1]": "Phone_Number",

    "populate[assembly][fields][0]": "documentId",
    "populate[assembly][fields][1]": "Assembly_Name",
    "populate[assembly][populate][district][fields][0]": "documentId",
    "populate[assembly][populate][district][fields][1]": "district_name",

    "populate[survey][fields][0]": "documentId",
    "populate[survey][fields][1]": "site_condition",
    "populate[survey][fields][2]": "survey_date",
    "populate[survey][fields][3]": "state",
  };
}

/** Extra survey scalars + sim_speeds (Sim1/Sim2). If Strapi 500s, we fall back to minimal. */
function locationPopulateParamsExtended(): Record<string, string> {
  return {
    ...locationPopulateParamsMinimal(),
    "populate[survey][fields][4]": "site_description",
    "populate[survey][fields][5]": "Power_Available",
    "populate[survey][fields][6]": "Socket_Working",
    "populate[survey][fields][7]": "Network_Available",
    "populate[survey][fields][8]": "GPS_Latitude",
    "populate[survey][fields][9]": "GPS_Longitude",
    "populate[survey][fields][10]": "Remarks",
    "populate[survey][fields][11]": "updatedAt",
    "populate[survey][fields][12]": "createdAt",
    "populate[survey][populate][sim_speeds]": "*",
  };
}

/** Minimal + sim_speeds only (if full extended fails but we still want Sim1/Sim2). */
function locationPopulateParamsMinimalPlusSims(): Record<string, string> {
  return {
    ...locationPopulateParamsMinimal(),
    "populate[survey][populate][sim_speeds]": "*",
  };
}

/** No booth_coordinator (in case that populate triggers Strapi errors). */
function locationPopulateParamsBare(): Record<string, string> {
  return {
    "populate[assembly][fields][0]": "documentId",
    "populate[assembly][fields][1]": "Assembly_Name",
    "populate[assembly][populate][district][fields][0]": "documentId",
    "populate[assembly][populate][district][fields][1]": "district_name",
    "populate[survey][fields][0]": "documentId",
    "populate[survey][fields][1]": "site_condition",
    "populate[survey][fields][2]": "survey_date",
    "populate[survey][fields][3]": "state",
  };
}

type SimSpeedEntry = {
  id?: number;
  download_speed?: number;
  upload_speed?: number;
  latency?: number;
  provider?: string;
};

/** Full SIM row as one cell (index 0 = Sim1, 1 = Sim2). Matches API shape with carrier in `provider`. */
function formatSimEntire(speeds: unknown, index: 0 | 1): string {
  if (!Array.isArray(speeds)) return "";
  const s = speeds[index] as SimSpeedEntry | undefined;
  if (!s || typeof s !== "object") return "";
  const id = s.id ?? "";
  const dl = s.download_speed ?? "";
  const ul = s.upload_speed ?? "";
  const lat = s.latency ?? "";
  const provider = String(s.provider ?? "").trim();
  return `id=${id}; download_speed=${dl}; upload_speed=${ul}; latency=${lat}; provider=${provider}`;
}

/**
 * Provider name only for the SIM with best combined download + upload.
 * Tie-break: higher download_speed, then higher upload_speed.
 */
function fastestProviderByDlUl(speeds: unknown): string {
  if (!Array.isArray(speeds) || speeds.length === 0) return "";
  const rows = speeds
    .filter((x): x is SimSpeedEntry => x != null && typeof x === "object")
    .map((x) => ({
      provider: String((x as SimSpeedEntry).provider ?? "").trim(),
      dl: Number((x as SimSpeedEntry).download_speed) || 0,
      ul: Number((x as SimSpeedEntry).upload_speed) || 0,
    }))
    .filter((x) => x.provider.length > 0);
  if (rows.length === 0) return "";
  if (rows.length === 1) return rows[0].provider;
  const best = rows.reduce((a, b) => {
    const scoreA = a.dl + a.ul;
    const scoreB = b.dl + b.ul;
    if (scoreB > scoreA) return b;
    if (scoreB < scoreA) return a;
    if (b.dl > a.dl) return b;
    if (b.dl < a.dl) return a;
    return b.ul > a.ul ? b : a;
  });
  return best.provider;
}

function yn(v: unknown): string {
  if (v === true || v === "true") return "Yes";
  if (v === false || v === "false") return "No";
  return v == null ? "" : String(v);
}

/** One row per location. Relations not loaded on survey (SIM/photos/raised_by) stay empty. */
function locationToRow(loc: any): Record<string, string | number> {
  const survey = loc?.survey;
  const asm = loc?.assembly;
  const dist = asm?.district;
  const coord = loc?.booth_coordinator;
  const profile = coord?.profile;

  return {
    District: dist?.district_name ?? "",
    Assembly: asm?.Assembly_Name ?? "",
    "PS No": loc?.PS_No ?? "",
    "PS Name": loc?.PS_Name ?? "",
    "Booth documentId": loc?.documentId ?? "",
    "Coordinator email": coord?.email ?? "",
    "Coordinator username": coord?.username ?? "",
    "Coordinator name": profile?.Full_Name ?? "",
    "Coordinator phone": profile?.Phone_Number ?? "",
    "Survey documentId": survey?.documentId ?? "",
    "Survey state": survey?.state ?? "",
    "Site condition": survey?.site_condition ?? "",
    "Survey date": survey?.survey_date ?? "",
    "Site description": survey?.site_description ?? "",
    "Power available": yn(survey?.Power_Available),
    "Socket working": yn(survey?.Socket_Working),
    "Network available": yn(survey?.Network_Available),
    "Faster provider (best DL+UL)": fastestProviderByDlUl(survey?.sim_speeds),
    "GPS latitude": survey?.GPS_Latitude ?? "",
    "GPS longitude": survey?.GPS_Longitude ?? "",
    Remarks: survey?.Remarks ?? "",
    Sim1: formatSimEntire(survey?.sim_speeds, 0),
    Sim2: formatSimEntire(survey?.sim_speeds, 1),
    "Photo count": Array.isArray(survey?.survey_photo)
      ? survey.survey_photo.length
      : "",
    "Raised by (username)": survey?.raised_by?.username ?? "",
    "Raised by (email)": survey?.raised_by?.email ?? "",
    "Updated at": survey?.updatedAt ?? "",
    "Created at": survey?.createdAt ?? "",
  };
}

function isServerError(err: unknown): boolean {
  const ax = err as { response?: { status?: number } };
  return ax?.response?.status === 500;
}

async function fetchLocationsPage(
  api: AxiosInstance,
  filterParams: Record<string, string | number | boolean>,
  pop: Record<string, string>,
  page: number,
) {
  const params: Record<string, string | number | boolean> = {
    ...filterParams,
    ...pop,
    "pagination[page]": page,
    "pagination[pageSize]": PAGE_SIZE,
    sort: "updatedAt:desc",
  };
  return api.get("/locations", { params });
}

async function fetchAllLocationsForExport(
  api: AxiosInstance,
  scope: ExportSurveyScope,
): Promise<any[]> {
  const filterParams = buildLocationFilterParams(scope);

  const fetchAllPages = async (populateBlock: Record<string, string>) => {
    const all: any[] = [];
    let page = 1;
    while (true) {
      const res = await fetchLocationsPage(api, filterParams, populateBlock, page);
      const batch = Array.isArray(res.data?.data) ? res.data.data : [];
      all.push(...batch);
      const meta = res.data?.meta?.pagination;
      const pageCount = meta?.pageCount ?? 1;
      if (page >= pageCount || batch.length === 0) break;
      page += 1;
    }
    return all;
  };

  try {
    return await fetchAllPages(locationPopulateParamsExtended());
  } catch (err) {
    if (!isServerError(err)) throw err;
    try {
      return await fetchAllPages(locationPopulateParamsMinimalPlusSims());
    } catch (err2) {
      if (!isServerError(err2)) throw err2;
      try {
        return await fetchAllPages(locationPopulateParamsMinimal());
      } catch (err3) {
        if (!isServerError(err3)) throw err3;
        return await fetchAllPages(locationPopulateParamsBare());
      }
    }
  }
}

export type ExportSurveyMeta = {
  fileLabel?: string;
};

/**
 * Excel export using `/locations` filters + populate (includes `sim_speeds` for Sim1/Sim2 columns).
 * Falls back to lighter populate if Strapi returns 500.
 */
export async function exportElectionSurveysToExcel(
  api: AxiosInstance,
  scope: ExportSurveyScope,
  meta?: ExportSurveyMeta,
): Promise<void> {
  assertScope(scope);
  const locations = await fetchAllLocationsForExport(api, scope);
  const rows = locations.map(locationToRow);
  const sheet = XLSX.utils.json_to_sheet(
    rows.length > 0 ? rows : [locationToRow({})],
  );
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Surveys");

  const buf = XLSX.write(book, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  const label = meta?.fileLabel
    ? sanitizeFilenamePart(meta.fileLabel)
    : scope.assemblyDocumentId
      ? "Assembly"
      : "District";
  const name = `Survey_details_${label}_${stamp}.xlsx`;
  saveAs(blob, name);
}
