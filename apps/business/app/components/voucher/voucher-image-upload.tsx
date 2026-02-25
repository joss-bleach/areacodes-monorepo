import { forwardRef, useImperativeHandle } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@repo/ui";
import { useFileUpload } from "~/hooks/use-file-upload";

export interface VoucherImageUploadHandle {
  getFile: () => File | null;
}

interface VoucherImageUploadProps {
  type: "qr-code" | "barcode";
  existingImageUrl: string | null;
  onExistingImageClear: () => void;
}

export const VoucherImageUpload = forwardRef<
  VoucherImageUploadHandle,
  VoucherImageUploadProps
>(({ type, existingImageUrl, onExistingImageClear }, ref) => {
  const [{ files, errors }, { removeFile, openFileDialog, getInputProps }] =
    useFileUpload({
      accept: "image/*",
      maxSize: 5 * 1024 * 1024,
      multiple: false,
    });

  useImperativeHandle(ref, () => ({
    getFile: () => (files[0]?.file instanceof File ? files[0].file : null),
  }));

  const previewUrl = files[0]?.preview || existingImageUrl || null;
  const isQr = type === "qr-code";
  const label = isQr ? "QR code" : "barcode";

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (files[0]?.id) {
      removeFile(files[0].id);
    } else {
      onExistingImageClear();
    }
  };

  return (
    <div className="space-y-4">
      <div
        onClick={openFileDialog}
        className={`relative w-full cursor-pointer border-2 border-dashed border-border bg-muted hover:bg-muted/80 transition-colors flex items-center justify-center ${isQr ? "min-h-[160px]" : "min-h-[80px]"}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openFileDialog();
          }
        }}
        aria-label={`Upload ${label} image`}
      >
        {previewUrl ? (
          <div className="relative w-full flex flex-col items-center justify-center p-2">
            <div
              className={`bg-muted relative flex items-center justify-center ${isQr ? "w-24 h-24" : "w-full max-w-xs h-12 mx-auto"}`}
            >
              <img
                src={previewUrl}
                alt={`${label} preview`}
                className="w-full h-full object-contain"
              />
            </div>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleRemove}
              aria-label={`Remove ${label}`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center justify-center p-2">
            <Upload
              className={`opacity-50 ${isQr ? "h-4 w-4 mt-2" : "h-5 w-5 mt-3"}`}
              aria-hidden="true"
            />
            <p
              className={`text-xs text-muted-foreground text-center ${isQr ? "mt-1.5" : "mt-2"}`}
            >
              Click to upload {label}
            </p>
          </div>
        )}
        <input
          {...getInputProps()}
          className="sr-only"
          aria-label={`Upload ${label} file`}
          tabIndex={-1}
        />
      </div>
      {errors.length > 0 && (
        <div className="text-xs text-red-600 text-center">
          {errors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </div>
      )}
      {files[0] && (
        <p className="text-xs text-muted-foreground text-center">
          {files[0].file.name}
        </p>
      )}
    </div>
  );
});

VoucherImageUpload.displayName = "VoucherImageUpload";
