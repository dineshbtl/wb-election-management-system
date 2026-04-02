import type { SurveyStylePhotoSlot } from "@/components/web-casting/SurveyStylePhotoCard";

export const WEB_CASTING_SLOT_COUNT = 5;

export function emptyPhotoSlot(): SurveyStylePhotoSlot {
  return { file: null };
}

export function initialWebCastingPhotoDocs(): SurveyStylePhotoSlot[] {
  return Array.from({ length: WEB_CASTING_SLOT_COUNT }, () =>
    emptyPhotoSlot(),
  );
}
