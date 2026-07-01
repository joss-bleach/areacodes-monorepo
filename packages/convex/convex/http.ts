import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent, createAuth } from "./betterAuth/auth";
import { SQUARE_SCOPES } from "./lib/square";
import type { Id } from "./_generated/dataModel";

const http = httpRouter();

// Better Auth handles all /auth/* routes
// cors: true enables CORS headers and OPTIONS preflight for cross-origin admin/mobile clients
authComponent.registerRoutes(http, createAuth, { cors: true });

async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string,
): Promise<boolean> {
  const parts = sigHeader.split(",");
  const tPart = parts.find((p) => p.startsWith("t="));
  const v1Part = parts.find((p) => p.startsWith("v1="));
  if (!tPart || !v1Part) return false;

  const timestamp = tPart.slice(2);
  const signature = v1Part.slice(3);
  const signedPayload = `${timestamp}.${payload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedPayload),
  );

  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expected === signature;
}

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const payload = await request.text();
    const sigHeader = request.headers.get("stripe-signature") ?? "";

    const isValid = await verifyStripeSignature(payload, sigHeader, secret);
    if (!isValid) {
      return new Response("Invalid signature", { status: 400 });
    }

    let event: unknown;
    try {
      event = JSON.parse(payload);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const knownTypes = new Set([
      "checkout.session.completed",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "invoice.payment_failed",
    ]);

    const eventType = (event as { type?: string }).type;
    if (!eventType || !knownTypes.has(eventType)) {
      return new Response("OK", { status: 200 });
    }

    await ctx.runMutation(internal.functions.subscriptions.handleWebhookEvent, {
      event,
    });

    return new Response("OK", { status: 200 });
  }),
});

// Square OAuth: redirect the browser to Square's authorization page.
// Called from the business app via a direct link:
//   {CONVEX_SITE_URL}/square/auth?businessId=xxx&slug=yyy
http.route({
  path: "/square/auth",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const appId = process.env.SQUARE_APP_ID;
    const redirectUri = process.env.SQUARE_OAUTH_REDIRECT_URI;
    const squareBaseUrl =
      process.env.SQUARE_BASE_URL ?? "https://connect.squareupsandbox.com";

    if (!appId || !redirectUri) {
      return new Response("Square OAuth not configured", { status: 500 });
    }

    const url = new URL(request.url);
    const businessId = url.searchParams.get("businessId");
    const slug = url.searchParams.get("slug");

    if (!businessId || !slug) {
      return new Response("Missing businessId or slug", { status: 400 });
    }

    // State encodes the businessId + slug so we can route the callback
    const state = btoa(`${businessId}:${slug}`);

    const authorizeUrl = new URL(`${squareBaseUrl}/oauth2/authorize`);
    authorizeUrl.searchParams.set("client_id", appId);
    authorizeUrl.searchParams.set("scope", SQUARE_SCOPES.join(" "));
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("session", "false");

    return Response.redirect(authorizeUrl.toString(), 302);
  }),
});

// Square OAuth callback: exchange the code for tokens, store encrypted connection,
// then redirect the browser back to the business POS page.
http.route({
  path: "/square/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const businessAppUrl = process.env.BUSINESS_APP_URL ?? "";

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error || !code || !state) {
      return Response.redirect(
        `${businessAppUrl}?square_error=${error ?? "missing_params"}`,
        302,
      );
    }

    let businessId: string;
    let slug: string;
    try {
      const decoded = atob(state);
      const colonIdx = decoded.indexOf(":");
      businessId = decoded.slice(0, colonIdx);
      slug = decoded.slice(colonIdx + 1);
      if (!businessId || !slug) throw new Error("empty");
    } catch {
      return new Response("Invalid state parameter", { status: 400 });
    }

    try {
      await ctx.runAction(
        internal.functions.posConnections.completeSquareConnect,
        { businessId: businessId as Id<"businesses">, code },
      );
    } catch {
      return Response.redirect(
        `${businessAppUrl}/b/${slug}/pos?square_error=connect_failed`,
        302,
      );
    }

    return Response.redirect(
      `${businessAppUrl}/b/${slug}/pos?square_connect=success`,
      302,
    );
  }),
});

export default http;
