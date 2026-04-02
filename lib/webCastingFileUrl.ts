/** URL for a stored image file under a submission folder. */
export function webCastingFileUrl(
  submissionId: string,
  filename: string,
): string {
  return `/api/web-casting-declaration/${encodeURIComponent(submissionId)}/file/${encodeURIComponent(filename)}`;
}
