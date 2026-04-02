/** Fetch a same-origin URL (e.g. stored submission image) as a File. */
export async function fetchUrlAsFile(
  url: string,
  filename: string,
): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Could not load ${filename}`);
  }
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/jpeg" });
}
