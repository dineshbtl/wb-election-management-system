"use client";

import { useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { SurveyPhotoImagePicker } from "@/components/survey/SurveyPhotoImagePicker";
import { Loader2, X } from "lucide-react";

export type SurveyStylePhotoSlot = {
  file: File | null;
  compressing?: boolean;
};

type Props = {
  /** Prefix for hidden file input id (must be unique per card). */
  inputId: string;
  /** Card title (e.g. "Passport-size photo" or "Front"). */
  heading: string;
  slot: SurveyStylePhotoSlot;
  onFileChange: (file: File | null) => void;
  showRemove?: boolean;
  onRemove?: () => void;
};

/**
 * Photo card with heading + single Choose Image control (hidden native input).
 */
export function SurveyStylePhotoCard({
  inputId,
  heading,
  slot,
  onFileChange,
  showRemove,
  onRemove,
}: Props) {
  const previewUrl = useMemo(
    () => (slot.file ? URL.createObjectURL(slot.file) : null),
    [slot.file],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="border rounded-xl p-4 bg-gray-50 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium text-gray-800">{heading}</h4>
        </div>
        {showRemove && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-red-500 hover:text-red-700"
            aria-label="Remove photo"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div>
        <Label className="text-sm font-medium text-gray-700">Image *</Label>
        <div className="mt-1 flex items-center flex-wrap gap-x-3 gap-y-2">
          <SurveyPhotoImagePicker
            inputId={inputId}
            compressing={slot.compressing}
            hasImage={!!slot.file}
            onFileSelected={onFileChange}
            buttonVariant="orange"
          />

          {slot.file && !slot.compressing && (
            <span className="text-sm text-gray-600 truncate max-w-[min(100%,12rem)]">
              {slot.file.name}{" "}
              <span className="text-gray-400">
                ({(slot.file.size / 1024).toFixed(0)} KB)
              </span>
            </span>
          )}
        </div>
      </div>

      {slot.compressing && (
        <div className="mt-2 flex items-center justify-center h-32 rounded-lg border border-dashed border-blue-300 bg-blue-50">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
            <p className="text-sm text-blue-600 mt-2 font-medium">
              Optimizing image for upload...
            </p>
          </div>
        </div>
      )}

      {slot.file && !slot.compressing && previewUrl && (
        <div className="mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={heading}
            className="w-full h-32 object-cover rounded-lg border"
          />
        </div>
      )}
    </div>
  );
}
