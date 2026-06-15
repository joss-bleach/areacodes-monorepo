import { useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";

export function useConvexUpload() {
  const generateUploadUrl = useMutation(api.functions.businesses.generateUploadUrl);

  const upload = async (file: File): Promise<Id<"_storage">> => {
    const uploadUrl = await generateUploadUrl();
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!response.ok) throw new Error("Upload failed");
    const { storageId } = await response.json();
    return storageId as Id<"_storage">;
  };

  return { upload };
}
