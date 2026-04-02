export async function deleteWebCastingDeclaration(
  submissionId: string,
): Promise<void> {
  const res = await fetch(
    `/api/web-casting-declaration/${encodeURIComponent(submissionId)}`,
    { method: "DELETE" },
  );
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
  };
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `Delete failed (${res.status})`);
  }
}
