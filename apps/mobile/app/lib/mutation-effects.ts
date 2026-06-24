import { Data, Effect } from "effect";
import { ConvexError } from "convex/values";
import type {
  ClaimErrorCode,
  ClaimErrorPayload,
  RevealErrorCode,
  RevealErrorPayload,
} from "@repo/convex";

export class AuthError extends Data.TaggedError("AuthError")<{
  readonly message: string;
}> {}

export const tryAuth = <T>(call: () => Promise<{ data: T | null; error: { message?: string } | null }>): Effect.Effect<T, AuthError> =>
  Effect.tryPromise({
    try: async () => {
      const { data, error } = await call();
      if (error) throw new AuthError({ message: error.message ?? "Something went wrong. Please try again." });
      return data as T;
    },
    catch: (e) =>
      e instanceof AuthError ? e : new AuthError({ message: "Something went wrong. Please try again." }),
  });

export class ClaimError extends Data.TaggedError("ClaimError")<{
  readonly code: ClaimErrorCode;
}> {
  get message() {
    switch (this.code) {
      case "VOUCHER_EXPIRED": return "This voucher has expired.";
      case "UNAUTHENTICATED": return "Please sign in to save vouchers.";
    }
  }
}

export class RevealError extends Data.TaggedError("RevealError")<{
  readonly code: RevealErrorCode;
}> {
  get message() {
    switch (this.code) {
      case "ALREADY_REVEALED": return "Could not load voucher code. Please try again.";
      case "CLAIM_NOT_FOUND": return "Voucher not found in your wallet.";
      case "VOUCHER_SUSPENDED": return "This business is currently unavailable.";
      case "UNAUTHENTICATED": return "Please sign in to reveal vouchers.";
    }
  }
}

export const tryClaim = <T>(call: () => Promise<T>): Effect.Effect<T, ClaimError> =>
  Effect.tryPromise({
    try: call,
    catch: (e) =>
      new ClaimError({
        code: e instanceof ConvexError
          ? (e.data as ClaimErrorPayload).code
          : "UNAUTHENTICATED",
      }),
  });

export const tryReveal = <T>(call: () => Promise<T>): Effect.Effect<T, RevealError> =>
  Effect.tryPromise({
    try: call,
    catch: (e) =>
      new RevealError({
        code: e instanceof ConvexError
          ? (e.data as RevealErrorPayload).code
          : "UNAUTHENTICATED",
      }),
  });
