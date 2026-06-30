import { test, expect } from "@playwright/test";

/**
 * Admin "Add Business" e2e tests.
 *
 * These tests require an admin account configured in the environment:
 *   E2E_ADMIN_EMAIL    — Better Auth admin user email
 *   E2E_ADMIN_PASSWORD — Better Auth admin user password
 *
 * The tests run against the admin app (default: http://localhost:3002).
 * A Convex deployment with at least one industry seeded is required.
 */

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "";

test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "Admin test credentials not set");

async function signInAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.fill("input[type='email']", ADMIN_EMAIL);
  await page.fill("input[type='password']", ADMIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}

test.describe("Admin Add Business", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test("staff can create a new business and it appears in the businesses list", async ({ page }) => {
    const businessName = `Playwright Test Pub ${Date.now()}`;

    await page.goto("/dashboard/businesses");

    // Open the "Add Business" dialog
    await page.getByRole("button", { name: /add business/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Fill in business details
    await page.fill("#add-name", businessName);
    await page.fill("#add-email", `playwright-${Date.now()}@example.com`);
    await page.fill("#add-description", "A pub created by Playwright for testing");
    await page.fill("#add-website", "https://playwright-test.example.com");

    // Select the first available industry
    await page.locator("#add-industry").click();
    await page.getByRole("option").first().click();

    await page.fill("#add-address", "1 Playwright Street, Brighton, BN1 1AA");
    await page.fill("#add-lat", "50.8225");
    await page.fill("#add-lng", "-0.1372");

    // Submit the form
    await page.getByRole("button", { name: /create business/i }).click();

    // Dialog closes on success
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 15000 });

    // New business appears in the admin businesses list
    await expect(page.getByText(businessName)).toBeVisible({ timeout: 10000 });

    // "Awaiting login" indicator is shown (business owner hasn't logged in yet)
    const businessRow = page.locator("tr", { hasText: businessName });
    await expect(businessRow.getByText(/awaiting login/i)).toBeVisible();
  });
});
