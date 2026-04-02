import type { WebCastingFormValues } from "@/lib/webCastingDeclarationTypes";

export type SaveWebCastingFiles = {
  passportPhoto: File | null;
  aadharFront: File;
  aadharBack: File;
  voterFront: File | null;
  voterBack: File | null;
};

/**
 * Saves declaration as JSON + compressed image files under `webcasting/submissions/<id>/`
 * via the Next.js API route (no Strapi / DB schema for this collection).
 */
export async function saveWebCastingDeclaration(
  values: WebCastingFormValues,
  files: SaveWebCastingFiles,
): Promise<{ submissionId: string }> {
  const fd = new FormData();
  fd.append("declaration", JSON.stringify(values));

  if (files.passportPhoto) {
    fd.append("passport", files.passportPhoto, files.passportPhoto.name || "passport.jpg");
  }
  fd.append("aadhaar_front", files.aadharFront, files.aadharFront.name || "aadhaar_front.jpg");
  fd.append("aadhaar_back", files.aadharBack, files.aadharBack.name || "aadhaar_back.jpg");
  if (files.voterFront && files.voterBack) {
    fd.append("voter_front", files.voterFront, files.voterFront.name || "voter_front.jpg");
    fd.append("voter_back", files.voterBack, files.voterBack.name || "voter_back.jpg");
  }

  const res = await fetch("/api/web-casting-declaration", {
    method: "POST",
    body: fd,
  });

  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    submissionId?: string;
  };

  if (!res.ok || !data.ok || !data.submissionId) {
    throw new Error(data.error || `Save failed (${res.status})`);
  }

  return { submissionId: data.submissionId };
}

/** Overwrites an existing submission folder (same `submissionId`, new `savedAt`). */
export async function putWebCastingDeclaration(
  submissionId: string,
  values: WebCastingFormValues,
  files: SaveWebCastingFiles,
): Promise<void> {
  const fd = new FormData();
  fd.append("declaration", JSON.stringify(values));

  if (files.passportPhoto) {
    fd.append(
      "passport",
      files.passportPhoto,
      files.passportPhoto.name || "passport.jpg",
    );
  }
  fd.append(
    "aadhaar_front",
    files.aadharFront,
    files.aadharFront.name || "aadhaar_front.jpg",
  );
  fd.append(
    "aadhaar_back",
    files.aadharBack,
    files.aadharBack.name || "aadhaar_back.jpg",
  );
  if (files.voterFront && files.voterBack) {
    fd.append(
      "voter_front",
      files.voterFront,
      files.voterFront.name || "voter_front.jpg",
    );
    fd.append(
      "voter_back",
      files.voterBack,
      files.voterBack.name || "voter_back.jpg",
    );
  }

  const res = await fetch(
    `/api/web-casting-declaration/${encodeURIComponent(submissionId)}`,
    {
      method: "PUT",
      body: fd,
    },
  );

  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
  };

  if (!res.ok || !data.ok) {
    throw new Error(data.error || `Update failed (${res.status})`);
  }
}
