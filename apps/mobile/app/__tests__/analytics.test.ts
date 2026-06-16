import { describe, it, expect } from "vitest";
import {
  ANALYTICS_EVENTS,
  captureAppOpened,
  captureSignUpCompleted,
  captureSignInCompleted,
  captureVoucherViewed,
  captureVoucherClaimed,
  captureVoucherRevealed,
  captureVoucherRedeemed,
  captureBusinessFollowed,
  capturePushNotificationTapped,
} from "../lib/analytics";

describe("ANALYTICS_EVENTS", () => {
  it("has the correct event name for app_opened", () => {
    expect(ANALYTICS_EVENTS.APP_OPENED).toBe("app_opened");
  });

  it("has the correct event name for sign_up_completed", () => {
    expect(ANALYTICS_EVENTS.SIGN_UP_COMPLETED).toBe("sign_up_completed");
  });

  it("has the correct event name for sign_in_completed", () => {
    expect(ANALYTICS_EVENTS.SIGN_IN_COMPLETED).toBe("sign_in_completed");
  });

  it("has the correct event name for voucher_viewed", () => {
    expect(ANALYTICS_EVENTS.VOUCHER_VIEWED).toBe("voucher_viewed");
  });

  it("has the correct event name for voucher_claimed", () => {
    expect(ANALYTICS_EVENTS.VOUCHER_CLAIMED).toBe("voucher_claimed");
  });

  it("has the correct event name for voucher_revealed", () => {
    expect(ANALYTICS_EVENTS.VOUCHER_REVEALED).toBe("voucher_revealed");
  });

  it("has the correct event name for voucher_redeemed", () => {
    expect(ANALYTICS_EVENTS.VOUCHER_REDEEMED).toBe("voucher_redeemed");
  });

  it("has the correct event name for business_followed", () => {
    expect(ANALYTICS_EVENTS.BUSINESS_FOLLOWED).toBe("business_followed");
  });

  it("has the correct event name for push_notification_tapped", () => {
    expect(ANALYTICS_EVENTS.PUSH_NOTIFICATION_TAPPED).toBe(
      "push_notification_tapped",
    );
  });
});

describe("capture helpers", () => {
  it("captureAppOpened does not throw when PostHog is not initialised", () => {
    expect(() => captureAppOpened()).not.toThrow();
  });

  it("captureSignUpCompleted does not throw for each auth method", () => {
    expect(() => captureSignUpCompleted("email")).not.toThrow();
    expect(() => captureSignUpCompleted("google")).not.toThrow();
    expect(() => captureSignUpCompleted("apple")).not.toThrow();
  });

  it("captureSignInCompleted does not throw for each auth method", () => {
    expect(() => captureSignInCompleted("email")).not.toThrow();
    expect(() => captureSignInCompleted("google")).not.toThrow();
    expect(() => captureSignInCompleted("apple")).not.toThrow();
  });

  it("captureVoucherViewed does not throw", () => {
    expect(() =>
      captureVoucherViewed("voucher-1", "business-1"),
    ).not.toThrow();
  });

  it("captureVoucherClaimed does not throw", () => {
    expect(() =>
      captureVoucherClaimed("voucher-1", "business-1"),
    ).not.toThrow();
  });

  it("captureVoucherRevealed does not throw", () => {
    expect(() =>
      captureVoucherRevealed("voucher-1", "business-1"),
    ).not.toThrow();
  });

  it("captureVoucherRedeemed does not throw", () => {
    expect(() =>
      captureVoucherRedeemed("voucher-1", "business-1"),
    ).not.toThrow();
  });

  it("captureBusinessFollowed does not throw", () => {
    expect(() => captureBusinessFollowed("business-1")).not.toThrow();
  });

  it("capturePushNotificationTapped does not throw", () => {
    expect(() => capturePushNotificationTapped("voucher-1")).not.toThrow();
  });
});
