import { Effect } from "effect";
import { useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";

export function useConvexUpload() {
  const generateUploadUrl = useMutation(api.functions.businesses.generateUploadUrl);

  const upload = (file: File): Promise<Id<"_storage">> =>
    Effect.runPromise(
      Effect.gen(function* () {
        const uploadUrl = yield* Effect.tryPromise({
          try: () => generateUploadUrl(),
          catch: () => new Error("Failed to get upload URL"),
        });
        const response = yield* Effect.tryPromise({
          try: () =>
            fetch(uploadUrl, {
              method: "POST",
              headers: { "Content-Type": file.type },
              body: file,
            }),
          catch: () => new Error("Upload request failed"),
        });
        if (!response.ok) return yield* Effect.fail(new Error("Upload failed"));
        const { storageId } = yield* Effect.tryPromise({
          try: () => response.json(),
          catch: () => new Error("Failed to parse upload response"),
        });
        return storageId as Id<"_storage">;
      })
    );

  return { upload };
}
