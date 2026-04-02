import imageCompression from "browser-image-compression";

const COMPRESSION_OPTIONS: Parameters<typeof imageCompression>[1] = {
  maxSizeMB: 0.8,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: "image/jpeg",
  initialQuality: 0.7,
};

/**
 * Compress a single image file. Returns the compressed File ready for upload.
 * Falls back to the original file if compression fails or produces a larger result.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  try {
    const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
    // Only use compressed version if it's actually smaller
    if (compressed.size < file.size) {
      return new File([compressed], file.name, {
        type: compressed.type,
        lastModified: Date.now(),
      });
    }
    return file;
  } catch (err) {
    console.warn("[compressImage] Compression failed, using original:", err);
    return file;
  }
}

/**
 * Compress multiple image files in parallel.
 * Calls `onProgress(completed, total)` after each file finishes.
 */
export async function compressImages(
  files: File[],
  onProgress?: (completed: number, total: number) => void,
): Promise<File[]> {
  const total = files.length;
  let completed = 0;

  const results = await Promise.all(
    files.map(async (f) => {
      const result = await compressImage(f);
      completed++;
      onProgress?.(completed, total);
      return result;
    }),
  );

  return results;
}
