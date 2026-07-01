import {
  query,
  mutation,
  internalAction,
  internalMutation,
} from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { encryptData, decryptData } from "../lib/aes";

const SQUARE_SCOPES = [
  "ITEMS_READ",
  "ITEMS_WRITE",
  "ORDERS_READ",
  "MERCHANT_PROFILE_READ",
];

async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity.subject;
}

// ── Public queries ─────────────────────────────────────────────────────────────

export const getPosConnections = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    await requireAuth(ctx);
    const connections = await ctx.db
      .query("posConnections")
      .withIndex("by_business", (q) => q.eq("businessId", businessId))
      .collect();
    // Strip token material — never expose ciphertext or key version to client
    return connections.map(
      ({ encryptedTokens: _et, encryptionKeyVersion: _ekv, ...rest }) => rest,
    );
  },
});

// ── Public mutations ───────────────────────────────────────────────────────────

export const disconnectSquare = mutation({
  args: {
    businessId: v.id("businesses"),
    connectionId: v.id("posConnections"),
  },
  handler: async (ctx, { businessId, connectionId }) => {
    await requireAuth(ctx);
    const conn = await ctx.db.get(connectionId);
    if (!conn || conn.businessId !== businessId) {
      throw new Error("Connection not found");
    }
    await ctx.db.patch(connectionId, {
      status: "revoked",
      encryptedTokens: undefined,
      encryptionKeyVersion: undefined,
    });
  },
});

// ── Internal mutations (called only from internalActions) ─────────────────────

export const upsertSquareConnection = internalMutation({
  args: {
    businessId: v.id("businesses"),
    externalMerchantId: v.string(),
    encryptedTokens: v.string(),
    encryptionKeyVersion: v.string(),
    scopes: v.array(v.string()),
    tokenExpiresAt: v.number(),
    connectedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("posConnections")
      .withIndex("by_external_merchant", (q) =>
        q.eq("externalMerchantId", args.externalMerchantId),
      )
      .filter((q) => q.eq(q.field("businessId"), args.businessId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "connected",
        encryptedTokens: args.encryptedTokens,
        encryptionKeyVersion: args.encryptionKeyVersion,
        scopes: args.scopes,
        tokenExpiresAt: args.tokenExpiresAt,
        connectedAt: args.connectedAt,
      });
      return existing._id;
    }

    return ctx.db.insert("posConnections", {
      businessId: args.businessId,
      provider: "square",
      status: "connected",
      externalMerchantId: args.externalMerchantId,
      scopes: args.scopes,
      encryptedTokens: args.encryptedTokens,
      encryptionKeyVersion: args.encryptionKeyVersion,
      tokenExpiresAt: args.tokenExpiresAt,
      connectedAt: args.connectedAt,
    });
  },
});

export const markConnectionExpiredOrRevoked = internalMutation({
  args: {
    connectionId: v.id("posConnections"),
    status: v.union(v.literal("expired"), v.literal("revoked")),
  },
  handler: async (ctx, { connectionId, status }) => {
    await ctx.db.patch(connectionId, {
      status,
      encryptedTokens: undefined,
      encryptionKeyVersion: undefined,
    });
  },
});

// ── Internal actions (called from HTTP callback) ───────────────────────────────

interface SquareTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_at: string;
  merchant_id: string;
  token_type: string;
}

export const completeSquareConnect = internalAction({
  args: {
    businessId: v.id("businesses"),
    code: v.string(),
  },
  handler: async (ctx, { businessId, code }) => {
    const appId = process.env.SQUARE_APP_ID;
    const appSecret = process.env.SQUARE_APP_SECRET;
    const redirectUri = process.env.SQUARE_OAUTH_REDIRECT_URI;
    const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;

    if (!appId || !appSecret || !redirectUri || !encryptionKey) {
      throw new Error("Square OAuth env vars not configured");
    }

    const squareBaseUrl =
      process.env.SQUARE_BASE_URL ?? "https://connect.squareupsandbox.com";

    const tokenRes = await fetch(`${squareBaseUrl}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Square-Version": "2024-01-17",
      },
      body: JSON.stringify({
        client_id: appId,
        client_secret: appSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      throw new Error(`Square token exchange failed (${tokenRes.status}): ${body}`);
    }

    const tokenData = (await tokenRes.json()) as SquareTokenResponse;

    const tokenPayload = JSON.stringify({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
    });

    const encryptedTokens = await encryptData(tokenPayload, encryptionKey);
    const tokenExpiresAt = new Date(tokenData.expires_at).getTime();
    const connectedAt = Date.now();

    await ctx.runMutation(internal.functions.posConnections.upsertSquareConnection, {
      businessId,
      externalMerchantId: tokenData.merchant_id,
      encryptedTokens,
      encryptionKeyVersion: "v1",
      scopes: SQUARE_SCOPES,
      tokenExpiresAt,
      connectedAt,
    });
  },
});

// ── Exported decrypt helper (internal use only) ────────────────────────────────
// Used by other internalActions that need to call Square API with a stored token.

export async function decryptConnectionTokens(
  encryptedTokens: string,
): Promise<{ accessToken: string; refreshToken: string | null }> {
  const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;
  if (!encryptionKey) throw new Error("TOKEN_ENCRYPTION_KEY not configured");
  const raw = await decryptData(encryptedTokens, encryptionKey);
  return JSON.parse(raw) as { accessToken: string; refreshToken: string | null };
}
