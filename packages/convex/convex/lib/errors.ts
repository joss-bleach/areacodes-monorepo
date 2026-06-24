// Typed error payloads sent over the wire via ConvexError.
// Imported by Convex functions (server) and mutation-effects.ts (mobile client).

export type ClaimErrorCode = "VOUCHER_EXPIRED" | "UNAUTHENTICATED"
export interface ClaimErrorPayload { readonly code: ClaimErrorCode }

export type RevealErrorCode =
  | "ALREADY_REVEALED"
  | "CLAIM_NOT_FOUND"
  | "VOUCHER_SUSPENDED"
  | "UNAUTHENTICATED"
export interface RevealErrorPayload { readonly code: RevealErrorCode }

export type GetWalletErrorCode = "UNAUTHENTICATED"
