"use client";
import { CircleUserRoundIcon, XIcon } from "lucide-react";
import { Controller, UseFormReturn } from "react-hook-form";
import { z } from "zod";

import { useFileUpload } from "@/modules/business/hooks/use-file-upload";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { updateBusinessProfileFormSchema } from "@/modules/business/schemas/update-business-profile-schema";

type FormValues = z.infer<typeof updateBusinessProfileFormSchema>;

export const EditBusinessImageStep = ({
  form,
  logoFileRef,
  existingLogoUrl,
}: {
  form: UseFormReturn<FormValues>;
  logoFileRef: React.MutableRefObject<File | null>;
  existingLogoUrl?: string;
}) => {
  const [{ files, errors }, { removeFile, openFileDialog, getInputProps }] =
    useFileUpload({
      accept: "image/*",
      maxSize: 5 * 1024 * 1024, // 5MB
      multiple: false,
      onFilesChange: (newFiles) => {
        // Store the File object in a ref
        if (newFiles.length > 0 && newFiles[0].file instanceof File) {
          logoFileRef.current = newFiles[0].file;
        } else {
          logoFileRef.current = null;
        }
      },
    });

  const previewUrl = files[0]?.preview || null;
  const fileName = files[0]?.file.name || null;
  
  // Use preview if new file selected, otherwise use existing logo
  const displayImageUrl = previewUrl || existingLogoUrl || null;
  const isNewFile = !!previewUrl;

  const handleRemoveFile = () => {
    if (files[0]?.id) {
      removeFile(files[0].id);
      logoFileRef.current = null;
      // Don't clear logoUrl - keep existing logo URL
    }
  };

  return (
    <Controller
      name="logoUrl"
      control={form.control}
      render={({ fieldState }) => (
        <Field data-invalid={fieldState.invalid} className="w-full">
          <div className="flex flex-col w-full items-center gap-4 py-6">
            <div className="relative inline-flex">
              <Button
                variant="outline"
                className="relative size-16 overflow-hidden p-0 shadow-none"
                onClick={openFileDialog}
                aria-label={displayImageUrl ? "Change image" : "Select image"}
              >
                {displayImageUrl ? (
                  <img
                    className="size-full object-cover"
                    src={displayImageUrl}
                    alt={
                      isNewFile
                        ? "Preview of uploaded image"
                        : "Current business logo"
                    }
                    width={64}
                    height={64}
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <div aria-hidden="true">
                    <CircleUserRoundIcon className="size-4 opacity-60" />
                  </div>
                )}
              </Button>
              {previewUrl && (
                <Button
                  onClick={handleRemoveFile}
                  size="icon"
                  className="absolute -top-2 -right-2 size-6 rounded-full border-2 border-background shadow-none focus-visible:border-background"
                  aria-label="Remove new image"
                >
                  <XIcon className="size-3.5" />
                </Button>
              )}
              <input
                {...getInputProps()}
                className="sr-only"
                aria-label="Upload image file"
                tabIndex={-1}
              />
            </div>

            {fileName && (
              <p className="text-xs text-muted-foreground">{fileName}</p>
            )}

            {previewUrl && (
              <div className="text-xs text-muted-foreground text-center">
                New logo will be uploaded when you submit the form
              </div>
            )}

            {!previewUrl && existingLogoUrl && (
              <div className="text-xs text-muted-foreground text-center">
                Current logo will be kept if no new file is selected
              </div>
            )}

            {errors.length > 0 && (
              <div className="text-xs text-red-600 text-center max-w-xs">
                {errors.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            )}

            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}

            <p
              aria-live="polite"
              role="region"
              className="mt-2 text-xs text-muted-foreground text-center"
            >
              {existingLogoUrl
                ? "Upload a new company logo (max 5MB) or keep the current one"
                : "Upload your company logo (max 5MB)"}
            </p>
          </div>
        </Field>
      )}
    />
  );
};

