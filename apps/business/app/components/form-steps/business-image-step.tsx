import { CircleUserRoundIcon, XIcon } from "lucide-react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { Button, Field, FieldError } from "@repo/ui";
import { useFileUpload } from "~/hooks/use-file-upload";
import type { BusinessProfileFormValues } from "~/schemas/business-profile-schema";

type FormValues = BusinessProfileFormValues;

export const BusinessImageStep = ({
  form,
  logoFileRef,
  existingLogoUrl,
}: {
  form: UseFormReturn<FormValues>;
  logoFileRef: React.MutableRefObject<File | null>;
  existingLogoUrl?: string | null;
}) => {
  const [{ files, errors }, { removeFile, openFileDialog, getInputProps }] =
    useFileUpload({
      accept: "image/*",
      maxSize: 5 * 1024 * 1024,
      multiple: false,
      onFilesChange: (newFiles) => {
        const first = newFiles[0];
        if (first && first.file instanceof File) {
          logoFileRef.current = first.file;
        } else {
          logoFileRef.current = null;
        }
      },
    });

  const previewUrl = files[0]?.preview || null;
  const fileName = files[0]?.file.name || null;
  const displayImageUrl = previewUrl || existingLogoUrl || null;
  const isNewFile = !!previewUrl;

  const handleRemoveFile = () => {
    if (files[0]?.id) {
      removeFile(files[0].id);
      logoFileRef.current = null;
      if (!existingLogoUrl) form.setValue("logoUrl", "");
    }
  };

  return (
    <Controller
      name="logoUrl"
      control={form.control}
      render={({ fieldState }) => (
        <Field data-invalid={fieldState.invalid} className="w-full">
          <div className="flex flex-col w-full items-center gap-4 py-8">
            <div className="relative inline-flex">
              <button
                type="button"
                onClick={openFileDialog}
                aria-label={displayImageUrl ? "Change image" : "Select image"}
                className="relative size-24 border-2 border-dashed border-input bg-muted/30 flex items-center justify-center overflow-hidden transition-colors hover:border-foreground/40 hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
              >
                {displayImageUrl ? (
                  <img
                    className="size-full object-cover"
                    src={displayImageUrl}
                    alt={isNewFile ? "Preview of uploaded image" : "Current business logo"}
                    width={96}
                    height={96}
                  />
                ) : (
                  <CircleUserRoundIcon className="size-8 text-muted-foreground" />
                )}
              </button>
              {previewUrl && (
                <Button
                  onClick={handleRemoveFile}
                  type="button"
                  size="icon"
                  className="absolute -top-2 -right-2 size-6 rounded-full border-2 border-background shadow-none"
                  aria-label="Remove image"
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

            {previewUrl && existingLogoUrl && (
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
              <div className="text-sm text-destructive text-center max-w-xs">
                {errors.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            )}

            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}

            <p className="text-xs text-muted-foreground text-center">
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
