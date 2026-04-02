export type WebCastingListItem = {
  submissionId: string;
  savedAt: string;
  fullName: string;
  district: string;
  /** Strapi district `documentId` when present on saved form. */
  districtDocumentId?: string;
  /** Display strings from form (same as declaration.json `form`). */
  assembly: string;
  /** Strapi assembly `documentId` when present on saved form. */
  assemblyDocumentId?: string;
  pollingStation: string;
  village: string;
  phone: string;
  /** Last 4 digits only */
  aadhaarLast4: string;
};

export async function fetchWebCastingSubmissionList(): Promise<
  WebCastingListItem[]
> {
  const res = await fetch("/api/web-casting-declaration", {
    cache: "no-store",
  });
  const data = (await res.json()) as {
    ok?: boolean;
    items?: WebCastingListItem[];
    error?: string;
  };
  if (!res.ok || !data.ok || !Array.isArray(data.items)) {
    throw new Error(data.error || "Failed to load saved list");
  }
  return data.items;
}
