import { CircleUserRoundIcon, XIcon } from "lucide-react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { Button, Field, FieldError, FieldGroup, FieldLabel, Input, Textarea } from "@repo/ui";
import { useFileUpload } from "~/hooks/use-file-upload";
import type { AddBusinessFormValues } from "~/schemas/add-business-form-schema";

export const AddBusinessExtrasStep = ({
  form,
  logoFileRef,
}: {
  form: UseFormReturn<AddBusinessFormValues>;
  logoFileRef: React.MutableRefObject<File | null>;
}) => {
  const [{ files, errors }, { removeFile, openFileDialog, getInputProps }] =
    useFileUpload({
      accept: "image/*",
      maxSize: 5 * 1024 * 1024,
      multiple: false,
      onFilesChange: (newFiles) => {
        const first = newFiles[0];
        logoFileRef.current = first && first.file instanceof File ? first.file : null;
      },
    });

  const previewUrl = files[0]?.preview || null;
  const fileName = files[0]?.file.name || null;

  const handleRemoveFile = () => {
    if (files[0]?.id) {
      removeFile(files[0].id);
      logoFileRef.current = null;
    }
  };

  return (
    <div className="w-full flex flex-col space-y-6">
      <FieldGroup>
        <Controller
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="add-business-description">Description</FieldLabel>
              <Textarea
                {...field}
                value={field.value ?? ""}
                id="add-business-description"
                className="w-full rounded-none"
                placeholder="A short description of the business"
                rows={3}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="websiteUrl"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="add-business-website">Website URL</FieldLabel>
              <Input
                {...field}
                value={field.value ?? ""}
                id="add-business-website"
                className="w-full rounded-none"
                placeholder="https://thebusiness.com"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Field>
          <FieldLabel>Logo</FieldLabel>
          <div className="flex items-center gap-4">
            <div className="relative inline-flex">
              <button
                type="button"
                onClick={openFileDialog}
                aria-label={previewUrl ? "Change image" : "Select image"}
                className="relative size-16 border-2 border-dashed border-input bg-muted/30 flex items-center justify-center overflow-hidden transition-colors hover:border-foreground/40 hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
              >
                {previewUrl ? (
                  <img
                    className="size-full object-cover"
                    src={previewUrl}
                    alt="Logo preview"
                    width={64}
                    height={64}
                  />
                ) : (
                  <CircleUserRoundIcon className="size-6 text-muted-foreground" />
                )}
              </button>
              {previewUrl && (
                <Button
                  onClick={handleRemoveFile}
                  type="button"
                  size="icon"
                  className="absolute -top-2 -right-2 size-5 rounded-full border-2 border-background shadow-none"
                  aria-label="Remove image"
                >
                  <XIcon className="size-3" />
                </Button>
              )}
              <input
                {...getInputProps()}
                className="sr-only"
                aria-label="Upload logo file"
                tabIndex={-1}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {fileName ?? "Optional — max 5MB"}
            </div>
          </div>
          {errors.length > 0 && (
            <div className="text-sm text-destructive">
              {errors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </div>
          )}
        </Field>
      </FieldGroup>
    </div>
  );
};
