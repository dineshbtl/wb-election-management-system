"use client";

import { useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Camera, FolderOpen, Images, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonVariant = "blue" | "amber" | "orange";

type Props = {
  /** Unique prefix for hidden input ids (per photo slot). */
  inputId: string;
  disabled?: boolean;
  compressing?: boolean;
  hasImage: boolean;
  onFileSelected: (file: File | null) => void;
  buttonVariant?: ButtonVariant;
};

function triggerInputClick(ref: React.RefObject<HTMLInputElement | null>) {
  window.setTimeout(() => ref.current?.click(), 0);
}

/**
 * “Choose Image” control with a dark popover: Photo Library, Take Photo, Choose File
 * (same pattern as Web Casting declaration photo slots).
 */
export function SurveyPhotoImagePicker({
  inputId,
  disabled,
  compressing,
  hasImage,
  onFileSelected,
  buttonVariant = "blue",
}: Props) {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (file) onFileSelected(file);
  };

  const isBusy = Boolean(disabled || compressing);

  const buttonClass =
    buttonVariant === "orange"
      ? "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
      : buttonVariant === "amber"
        ? "bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600"
        : "bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] hover:from-[#2E7AE6] hover:to-[#1A78D6]";

  return (
    <div className="flex items-center flex-wrap gap-x-3 gap-y-2">
      <input
        ref={galleryInputRef}
        id={`${inputId}-gallery`}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        disabled={isBusy}
        onChange={handleChange}
        aria-hidden
      />
      <input
        ref={cameraInputRef}
        id={`${inputId}-camera`}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        disabled={isBusy}
        onChange={handleChange}
        aria-hidden
      />

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild disabled={isBusy}>
          <button
            type="button"
            className={cn(
              "inline-flex items-center px-3 py-2 text-white text-sm font-medium rounded-lg transition-colors shadow-sm",
              isBusy ? "bg-gray-400 cursor-wait" : cn(buttonClass, "cursor-pointer"),
            )}
          >
            {compressing ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-1" />
            )}
            {compressing
              ? "Optimizing..."
              : hasImage
                ? "Change Image"
                : "Choose Image"}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className="min-w-[200px] rounded-xl border border-zinc-600/90 bg-zinc-800 p-1.5 shadow-xl text-zinc-100"
        >
          <DropdownMenuItem
            className="gap-2 rounded-lg cursor-pointer text-zinc-100 focus:bg-zinc-700 focus:text-white data-[highlighted]:bg-zinc-700 data-[highlighted]:text-white"
            onSelect={() => triggerInputClick(galleryInputRef)}
          >
            <Images className="h-4 w-4 shrink-0 opacity-90" />
            Photo Library
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2 rounded-lg cursor-pointer text-zinc-100 focus:bg-zinc-700 focus:text-white data-[highlighted]:bg-zinc-700 data-[highlighted]:text-white"
            onSelect={() => triggerInputClick(cameraInputRef)}
          >
            <Camera className="h-4 w-4 shrink-0 opacity-90" />
            Take Photo
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2 rounded-lg cursor-pointer text-zinc-100 focus:bg-zinc-700 focus:text-white data-[highlighted]:bg-zinc-700 data-[highlighted]:text-white"
            onSelect={() => triggerInputClick(galleryInputRef)}
          >
            <FolderOpen className="h-4 w-4 shrink-0 opacity-90" />
            Choose File
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
