import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent, createAuth } from "./betterAuth/auth";

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

export default http;
