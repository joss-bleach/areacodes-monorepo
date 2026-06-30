import PostHog from "posthog-react-native";

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;

// Not initialised in test environments (no API key set)
export const posthog: PostHog | null = apiKey
  ? new PostHog(apiKey, {
      host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.posthog.com",
    })
  : null;

export const ANALYTICS_EVENTS = {
  APP_OPENED: "app_opened",
  SIGN_UP_COMPLETED: "sign_up_completed",
  SIGN_IN_COMPLETED: "sign_in_completed",
  BUSINESS_VIEWED: "business_viewed",
  VOUCHER_VIEWED: "voucher_viewed",
  VOUCHER_CLAIMED: "voucher_claimed",
  VOUCHER_REVEALED: "voucher_revealed",
  VOUCHER_REDEEMED: "voucher_redeemed",
  BUSINESS_FOLLOWED: "business_followed",
  PUSH_NOTIFICATION_TAPPED: "push_notification_tapped",
} as const;

function capture(event: string, properties?: Record<string, string>) {
  posthog?.capture(event, properties);
}

export function captureAppOpened() {
  capture(ANALYTICS_EVENTS.APP_OPENED);
}

export function captureSignUpCompleted(method: "email" | "google" | "apple") {
  capture(ANALYTICS_EVENTS.SIGN_UP_COMPLETED, { method });
}

export function captureSignInCompleted(method: "email" | "google" | "apple") {
  capture(ANALYTICS_EVENTS.SIGN_IN_COMPLETED, { method });
}

export function captureBusinessViewed(businessId: string) {
  capture(ANALYTICS_EVENTS.BUSINESS_VIEWED, { business_id: businessId });
}

export function captureVoucherViewed(voucherId: string, businessId: string) {
  capture(ANALYTICS_EVENTS.VOUCHER_VIEWED, {
    voucher_id: voucherId,
    business_id: businessId,
  });
}

export function captureVoucherClaimed(voucherId: string, businessId: string) {
  capture(ANALYTICS_EVENTS.VOUCHER_CLAIMED, {
    voucher_id: voucherId,
    business_id: businessId,
  });
}

export function captureVoucherRevealed(voucherId: string, businessId: string) {
  capture(ANALYTICS_EVENTS.VOUCHER_REVEALED, {
    voucher_id: voucherId,
    business_id: businessId,
  });
}

export function captureVoucherRedeemed(voucherId: string, businessId: string) {
  capture(ANALYTICS_EVENTS.VOUCHER_REDEEMED, {
    voucher_id: voucherId,
    business_id: businessId,
  });
}

export function captureBusinessFollowed(businessId: string) {
  capture(ANALYTICS_EVENTS.BUSINESS_FOLLOWED, { business_id: businessId });
}

export function capturePushNotificationTapped(voucherId: string) {
  capture(ANALYTICS_EVENTS.PUSH_NOTIFICATION_TAPPED, {
    voucher_id: voucherId,
  });
}
