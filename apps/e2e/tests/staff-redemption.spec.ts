import { test, expect } from "@playwright/test";

/**
 * Staff redemption page e2e tests.
 *
 * These tests verify the manual redemption flow:
 *   - Scanning a QR opens /redeem?v=&c= on the business portal
 *   - First use requires the Redemption PIN
 *   - After PIN entry, the Confirm page shows the voucher offer
 *   - Tapping Redeem burns the voucher and shows Redeemed state
 *
 * These tests are integration tests that require:
 *   - A running business portal at BUSINESS_URL
 *   - A Convex deployment with test data (set via env or pre-seeded)
 *   - E2E_VOUCHER_ID, E2E_CLAIM_ID, E2E_REDEMPTION_PIN to be set
 */

const VOUCHER_ID = process.env.E2E_VOUCHER_ID ?? "";
const CLAIM_ID = process.env.E2E_CLAIM_ID ?? "";
const PIN = process.env.E2E_REDEMPTION_PIN ?? "";

test.skip(!VOUCHER_ID || !CLAIM_ID || !PIN, "E2E redemption credentials not set");

test.describe("Staff redemption page — /redeem", () => {
  test("loads the PIN unlock page when visiting a redemption URL for the first time", async ({
    page,
    context,
  }) => {
    // Clear localStorage to simulate a fresh device
    await context.clearCookies();
    await page.goto(`/redeem?v=${VOUCHER_ID}&c=${CLAIM_ID}`);

    // Should show the PIN unlock form
    await expect(page.getByText(/device unlock/i)).toBeVisible();
    await expect(page.getByLabel(/redemption pin/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /unlock/i })).toBeVisible();
  });

  test("shows error on wrong PIN", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(`/redeem?v=${VOUCHER_ID}&c=${CLAIM_ID}`);

    await page.getByLabel(/redemption pin/i).fill("wrong-pin-1234");
    await page.getByRole("button", { name: /unlock/i }).click();

    await expect(page.getByText(/incorrect pin/i)).toBeVisible();
  });

  test("advances to Confirm page after correct PIN", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(`/redeem?v=${VOUCHER_ID}&c=${CLAIM_ID}`);

    await page.getByLabel(/redemption pin/i).fill(PIN);
    await page.getByRole("button", { name: /unlock/i }).click();

    // Should show the confirm page with Redeem button
    await expect(page.getByRole("button", { name: /^redeem$/i })).toBeVisible();
    await expect(page.getByText(/action required/i)).toBeVisible();
  });

  test("skips PIN on revisit (device stays unlocked)", async ({ page, context }) => {
    await context.clearCookies();

    // First visit: enter PIN
    await page.goto(`/redeem?v=${VOUCHER_ID}&c=${CLAIM_ID}`);
    await page.getByLabel(/redemption pin/i).fill(PIN);
    await page.getByRole("button", { name: /unlock/i }).click();
    await expect(page.getByRole("button", { name: /^redeem$/i })).toBeVisible();

    // Second visit: should skip PIN and go straight to Confirm
    await page.goto(`/redeem?v=${VOUCHER_ID}&c=${CLAIM_ID}`);
    await expect(page.getByRole("button", { name: /^redeem$/i })).toBeVisible();
    await expect(page.getByLabel(/redemption pin/i)).not.toBeVisible();
  });

  test("shows Redeemed state after burning", async ({ page, context }) => {
    await context.clearCookies();

    // Unlock + go to confirm
    await page.goto(`/redeem?v=${VOUCHER_ID}&c=${CLAIM_ID}`);
    await page.getByLabel(/redemption pin/i).fill(PIN);
    await page.getByRole("button", { name: /unlock/i }).click();
    await expect(page.getByRole("button", { name: /^redeem$/i })).toBeVisible();

    // Burn
    await page.getByRole("button", { name: /^redeem$/i }).click();

    // Should show redeemed state
    await expect(page.getByText(/redeemed/i)).toBeVisible({ timeout: 5000 });
  });

  test("shows invalid link page for missing params", async ({ page }) => {
    await page.goto("/redeem");
    await expect(page.getByText(/invalid redemption link/i)).toBeVisible();
  });
});
