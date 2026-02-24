import { CircleUserRoundIcon, XIcon } from "lucide-react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { Button, Field, FieldError, FieldLabel } from "@repo/ui";
import { useFileUpload } from "~/hooks/use-file-upload";
import type { CreateBusinessProfileFormValues } from "~/schemas/create-business-profile-schema";

type FormValues = CreateBusinessProfileFormValues;

export const BusinessImageStep = ({
  form,
  logoFileRef,
}: {
  form: UseFormReturn<FormValues>;
  logoFileRef: React.MutableRefObject<File | null>;
}) => {
  const [{ files, errors }, { removeFile, openFileDialog, getInputProps }] =
    useFileUpload({
      accept: "image/*",
      maxSize: 5 * 1024 * 1024,
      multiple: false,
      onFilesChange: (newFiles) => {
        if (newFiles.length > 0 && newFiles[0].file instanceof File) {
          logoFileRef.current = newFiles[0].file;
        } else {
          logoFileRef.current = null;
        }
      },
    });

  const previewUrl = files[0]?.preview || null;
  const fileName = files[0]?.file.name || null;

  const handleRemoveFile = () => {
    if (files[0]?.id) {
      removeFile(files[0].id);
      logoFileRef.current = null;
      form.setValue("logoUrl", "");
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
                type="button"
                aria-label={previewUrl ? "Change image" : "Select image"}
              >
                {previewUrl ? (
                  <img
                    className="size-full object-cover"
                    src={previewUrl}
                    alt="Preview of uploaded image"
                    width={64}
                    height={64}
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

            {files.length > 0 && (
              <div className="text-xs text-muted-foreground text-center">
                Logo will be uploaded when you submit the form
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

            <p className="mt-2 text-xs text-muted-foreground text-center">
              Upload your company logo (max 5MB)
            </p>
          </div>
        </Field>
      )}
    />
  );
};
