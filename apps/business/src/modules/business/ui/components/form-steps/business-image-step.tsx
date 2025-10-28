"use client";

import { CircleUserRoundIcon, XIcon, UploadIcon } from "lucide-react";

import { useSupabaseFileUpload } from "@/modules/business/hooks/use-supabase-file-upload";
import { Button } from "@/components/ui/button";

export const BusinessImageStep = () => {
  const [
    { files, isUploading, uploadedUrls, errors },
    { removeFile, openFileDialog, getInputProps, uploadFiles },
  ] = useSupabaseFileUpload({
    bucket: "company-logos",
    folder: "logos",
    accept: "image/*",
    maxSize: 5 * 1024 * 1024, // 5MB
    onUploadComplete: (result) => {
      console.log("File uploaded successfully:", result.url);
    },
    onUploadError: (error) => {
      console.error("Upload error:", error);
    },
  });

  const previewUrl = uploadedUrls[0] || files[0]?.preview || null;
  const fileName = files[0]?.file.name || null;

  const handleRemoveFile = async () => {
    if (files[0]?.id) {
      await removeFile(files[0].id);
    }
  };

  const handleUpload = async () => {
    if (files.length > 0) {
      await uploadFiles();
    }
  };

  return (
    <div className="flex flex-col w-full items-center gap-4 py-6">
      <div className="relative inline-flex">
        <Button
          variant="outline"
          className="relative size-16 overflow-hidden p-0 shadow-none"
          onClick={openFileDialog}
          disabled={isUploading}
          aria-label={previewUrl ? "Change image" : "Upload image"}
        >
          {previewUrl ? (
            <img
              className="size-full object-cover"
              src={previewUrl}
              alt="Preview of uploaded image"
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
            aria-label="Remove image"
            disabled={isUploading}
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

      {fileName && <p className="text-xs text-muted-foreground">{fileName}</p>}

      {files.length > 0 && !uploadedUrls[0] && (
        <Button
          onClick={handleUpload}
          disabled={isUploading}
          className="flex items-center gap-2"
          size="sm"
        >
          <UploadIcon className="size-4" />
          {isUploading ? "Uploading..." : "Upload"}
        </Button>
      )}

      {uploadedUrls[0] && (
        <div className="text-xs text-green-600 text-center">
          ✓ Logo uploaded successfully
        </div>
      )}

      {errors.length > 0 && (
        <div className="text-xs text-red-600 text-center max-w-xs">
          {errors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </div>
      )}

      <p
        aria-live="polite"
        role="region"
        className="mt-2 text-xs text-muted-foreground text-center"
      >
        Upload your company logo (max 5MB)
      </p>
    </div>
  );
};
