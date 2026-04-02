import type { WebCastingFormValues } from "@/lib/webCastingDeclarationTypes";

/** Shape of `declaration.json` on disk (see API route). */
export type StoredWebCastingDeclaration = {
  version: 1;
  submissionId: string;
  savedAt: string;
  form: WebCastingFormValues;
  images: {
    passport: string | null;
    aadhaar_front: string;
    aadhaar_back: string;
    voter_front: string | null;
    voter_back: string | null;
  };
};
