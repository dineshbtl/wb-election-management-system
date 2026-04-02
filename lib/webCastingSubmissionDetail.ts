import type { StoredWebCastingDeclaration } from "@/lib/webCastingStoredDeclaration";

export async function fetchWebCastingSubmissionDetail(
  submissionId: string,
): Promise<StoredWebCastingDeclaration> {
  const res = await fetch(
    `/api/web-casting-declaration/${encodeURIComponent(submissionId)}`,
    { cache: "no-store" },
  );
  const data = (await res.json()) as {
    ok?: boolean;
    data?: StoredWebCastingDeclaration;
    error?: string;
  };
  if (!res.ok || !data.ok || !data.data) {
    throw new Error(data.error || "Failed to load declaration");
  }
  return data.data;
}
