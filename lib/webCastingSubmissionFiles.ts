import type { StoredWebCastingDeclaration } from "@/lib/webCastingStoredDeclaration";
import { webCastingFileUrl } from "@/lib/webCastingFileUrl";
import { fetchUrlAsFile } from "@/lib/webCastingFetchFile";

export type BuiltWebCastingFiles = {
  passportPhoto: File | null;
  aadharFront: File;
  aadharBack: File;
  voterFront: File | null;
  voterBack: File | null;
};

export async function buildWebCastingSubmissionFiles(
  d: StoredWebCastingDeclaration,
): Promise<BuiltWebCastingFiles> {
  const sid = d.submissionId;
  const im = d.images;
  const passportPhoto = im.passport
    ? await fetchUrlAsFile(webCastingFileUrl(sid, im.passport), im.passport)
    : null;
  const aadharFront = await fetchUrlAsFile(
    webCastingFileUrl(sid, im.aadhaar_front),
    im.aadhaar_front,
  );
  const aadharBack = await fetchUrlAsFile(
    webCastingFileUrl(sid, im.aadhaar_back),
    im.aadhaar_back,
  );
  let voterFront: File | null = null;
  let voterBack: File | null = null;
  if (im.voter_front && im.voter_back) {
    voterFront = await fetchUrlAsFile(
      webCastingFileUrl(sid, im.voter_front),
      im.voter_front,
    );
    voterBack = await fetchUrlAsFile(
      webCastingFileUrl(sid, im.voter_back),
      im.voter_back,
    );
  }
  return {
    passportPhoto,
    aadharFront,
    aadharBack,
    voterFront,
    voterBack,
  };
}
