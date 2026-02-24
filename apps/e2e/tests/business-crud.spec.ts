import { test, expect } from "@playwright/test";

/**
 * Business CRUD e2e tests.
 *
 * These tests require a Clerk test user configured in the environment:
 *   E2E_TEST_EMAIL    — Clerk user email
 *   E2E_TEST_PASSWORD — Clerk user password
 *
 * The test user must NOT have an existing business in Convex
 * (or the Convex test deployment must be reset between runs).
 */

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? "";
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? "";

test.skip(!TEST_EMAIL || !TEST_PASSWORD, "Clerk test credentials not set");

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.fill("input[name='identifier']", TEST_EMAIL);
  await page.getByRole("button", { name: /continue/i }).click();
  await page.fill("input[name='password']", TEST_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  // Wait for redirect away from sign-in
  await page.waitForURL(/\/b\//);
}

test.describe("Business CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("new user is redirected to create business page", async ({ page }) => {
    await expect(page).toHaveURL(/\/b\/create/);
    await expect(page.getByRole("heading", { name: /create your business/i })).toBeVisible();
  });

  test("create business flow completes all three steps", async ({ page }) => {
    await page.goto("/b/create");

    // Step 1 — Business information
    await page.fill("input[name='name']", "Playwright Test Cafe");
    await page.fill("textarea[name='description']", "A test business created by Playwright");
    // Select industry via combobox
    await page.getByRole("combobox", { name: /industry/i }).click();
    await page.locator("[cmdk-item]").first().click();
    await page.getByRole("button", { name: /next/i }).click();

    // Step 2 — Location
    await page.fill("input[name='addressLine1']", "1 Test Street");
    await page.fill("input[name='townOrCity']", "Brighton");
    // County is a Select dropdown, not a text input
    await page.locator("#create-business-form-county").click();
    await page.getByRole("option", { name: "East Sussex" }).click();
    await page.fill("input[name='postcode']", "BN1 1AA");
    await page.getByRole("button", { name: /next/i }).click();

    // Step 3 — Image (optional, skip)
    await page.getByRole("button", { name: /^create$/i }).click();

    // Should redirect to dashboard
    await page.waitForURL(/\/b\/[a-z0-9-]+$/);
    await expect(page.getByRole("heading", { name: "Playwright Test Cafe" })).toBeVisible();
  });

  test("dashboard shows active voucher count", async ({ page }) => {
    // Assumes already on dashboard after create
    await expect(page.getByText(/active vouchers/i)).toBeVisible();
  });

  test("can navigate to edit business page", async ({ page }) => {
    // Find and click the edit link
    await page.getByRole("link", { name: /edit/i }).click();
    await expect(page).toHaveURL(/\/edit$/);
    await expect(page.getByRole("heading", { name: /edit/i })).toBeVisible();
  });
});
