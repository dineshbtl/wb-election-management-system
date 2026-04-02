/**
 * Shared survey API helper — unifies upload, duplicate check, and create flows
 * onto the api client with generous timeout for mobile networks.
 */
import api from "./api";

/** Normalize Strapi upload response (array or { data: [...] }) to array of { id } */
function normalizeUploadResponse(raw: unknown): { id: number }[] {
  if (Array.isArray(raw)) {
    return raw.map((img: { id?: number }) => ({ id: img.id ?? 0 }));
  }
  const data = (raw as { data?: unknown })?.data;
  if (data == null) return [];
  if (Array.isArray(data)) {
    return data.map((img: { id?: number }) => ({ id: img.id ?? 0 }));
  }
  const single = data as { id?: number };
  return single.id != null ? [{ id: single.id }] : [];
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 2000): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 400 || status === 401 || status === 403 || status === 422) throw err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

/**
 * Upload survey photo files with retry for flaky mobile networks.
 * Uses a generous 3-minute timeout per attempt.
 */
export async function uploadSurveyPhotos(formData: FormData): Promise<number[]> {
  const res = await withRetry(() =>
    api.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 180_000,
    }),
  );
  const uploaded = normalizeUploadResponse(res.data);
  return uploaded.map((img) => img.id).filter((id) => id > 0);
}

/**
 * Check if a survey already exists for the given booth.
 */
export async function checkExistingSurvey(
  boothId: string
): Promise<{ id: number; survey_date: string } | null> {
  const res = await api.get(
    `/surveys?filters[booth][documentId][$eq]=${encodeURIComponent(boothId)}&pagination[pageSize]=1`
  );
  const data = res.data?.data ?? res.data;
  const list = Array.isArray(data) ? data : data ? [data] : [];
  if (list.length === 0) return null;
  const first = list[0];
  return {
    id: first.id ?? first.documentId,
    survey_date: first.survey_date ?? first.createdAt ?? "",
  };
}

export interface CreateSurveyPayload {
  booth: string;
  Power_Available?: boolean;
  Socket_Working?: boolean;
  Network_Available?: boolean;
  site_condition?: string;
  site_description?: string;
  GPS_Latitude?: number | null;
  GPS_Longitude?: number | null;
  survey_date: string;
  Remarks?: string;
  /** Required on create; optional on update if backend merges partial payloads. */
  raised_by?: string;
  survey_photo: { title: string; description?: string; image: number }[];
  sim_speeds?: {
    provider: string;
    download_speed: number;
    upload_speed: number;
    latency: number;
    carrier_info?: string;
  }[];
  airtel_signal?: number;
  jio_signal?: number;
  state?: string;
  locationName?: string;
  [key: string]: unknown;
}

/**
 * Strapi component `sim_speeds` may not include `carrier_info` in the schema.
 * Sending it causes 400 / "Invalid key carrier_info" on some backends.
 */
export function sanitizeSurveyPayloadForStrapi(
  data: CreateSurveyPayload,
): CreateSurveyPayload {
  if (!data.sim_speeds?.length) return data;
  return {
    ...data,
    sim_speeds: data.sim_speeds.map(
      ({ provider, download_speed, upload_speed, latency }) => ({
        provider,
        download_speed,
        upload_speed,
        latency,
      }),
    ),
  };
}

/**
 * Create a new survey with retry for mobile networks.
 */
export async function createSurvey(data: CreateSurveyPayload): Promise<void> {
  const payload = sanitizeSurveyPayloadForStrapi(data);
  await withRetry(() => api.post("/surveys", { data: payload }));
}

/**
 * Update an existing survey with retry for mobile networks.
 */
export async function updateSurvey(
  surveyId: string,
  data: CreateSurveyPayload
): Promise<void> {
  const payload = sanitizeSurveyPayloadForStrapi(data);
  await withRetry(() => api.put(`/surveys/${surveyId}`, { data: payload }));
}

/**
 * Update location's Survey_Status (e.g. after raising survey).
 */
export async function updateLocationSurveyStatus(
  boothDocumentId: string,
  status: string
): Promise<void> {
  await api.put(`/locations/${boothDocumentId}`, {
    data: { Survey_Status: status },
  });
}
