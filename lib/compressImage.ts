import imageCompression from "browser-image-compression";

const DEFAULT_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
};

/**
 * Compress images before upload/storage (JPG/PNG/WebP).
 * Non-image files are returned unchanged.
 */
export async function compressImageFile(
  file: File,
  options?: Partial<typeof DEFAULT_OPTIONS>,
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    return await imageCompression(file, {
      ...DEFAULT_OPTIONS,
      ...options,
    });
  } catch {
    return file;
  }
}
