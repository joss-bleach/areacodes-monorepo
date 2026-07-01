import { test, expect } from "@playwright/test";

/**
 * Voucher creation wizard e2e tests — Manual provider path.
 *
 * These tests require a Clerk test user configured in the environment:
 *   E2E_TEST_EMAIL    — Clerk user email
 *   E2E_TEST_PASSWORD — Clerk user password
 *
 * The test user must have an existing business in the Convex test deployment.
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
  await page.waitForURL(/\/b\//);
}

test.describe("Voucher creation wizard — Manual path", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("Add Voucher button opens the wizard", async ({ page }) => {
    await page.getByRole("button", { name: /add voucher/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/create voucher/i)).toBeVisible();
  });

  test("wizard shows Discount step first", async ({ page }) => {
    await page.getByRole("button", { name: /add voucher/i }).click();
    await expect(page.getByText(/discount type/i)).toBeVisible();
    // All five discount kinds shown for Manual provider
    await expect(page.getByText(/percentage off/i)).toBeVisible();
    await expect(page.getByText(/fixed amount off/i)).toBeVisible();
    await expect(page.getByText(/free item/i)).toBeVisible();
    await expect(page.getByText(/buy one, get one free/i)).toBeVisible();
    await expect(page.getByText(/custom offer/i)).toBeVisible();
  });

  test("happy path: creates a percentage-off voucher through all steps", async ({ page }) => {
    await page.getByRole("button", { name: /add voucher/i }).click();

    // Step 1: Discount Kind
    await page.getByText(/percentage off/i).click();
    await page.fill("input[id='discount-pct']", "20");
    await page.getByRole("button", { name: /next/i }).click();

    // Step 2: Details — title/desc should be auto-derived
    await expect(page.getByDisplayValue(/20% off/i)).toBeVisible({ timeout: 3000 });
    // Set validity window
    await page.getByRole("button", { name: /select date/i }).first().click();
    await page.getByRole("gridcell", { name: /today|1/i }).first().click();
    await page.getByRole("button", { name: /select date/i }).first().click();
    // Pick end date a month away — click the next month nav and pick a date
    const nextMonthButton = page.getByRole("button", { name: /next month/i });
    if (await nextMonthButton.isVisible()) await nextMonthButton.click();
    await page.getByRole("gridcell").first().click();
    await page.getByRole("button", { name: /next/i }).click();

    // Step 3: Review
    await expect(page.getByText(/review your voucher/i)).toBeVisible();
    await expect(page.getByText(/20% off/i)).toBeVisible();
    await expect(page.getByText(/manual/i)).toBeVisible();
    await page.getByRole("button", { name: /create voucher/i }).click();

    // Dialog closes and voucher appears in list
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/20% off/i)).toBeVisible();
  });

  test("happy path: creates a free-item voucher", async ({ page }) => {
    await page.getByRole("button", { name: /add voucher/i }).click();

    // Step 1: Discount Kind — free item
    await page.getByText(/free item/i).click();
    await page.fill("input[id='discount-item']", "flat white");
    await page.getByRole("button", { name: /next/i }).click();

    // Step 2: Details
    await expect(page.getByDisplayValue(/free flat white/i)).toBeVisible({ timeout: 3000 });
    await page.getByRole("button", { name: /next/i }).click();

    // Step 3: Review
    await expect(page.getByText(/free item/i)).toBeVisible();
    await expect(page.getByText(/flat white/i)).toBeVisible();
  });

  test("validation: cannot advance from discount step without required value", async ({ page }) => {
    await page.getByRole("button", { name: /add voucher/i }).click();
    // percentage is default — do NOT fill in value
    await page.getByRole("button", { name: /next/i }).click();
    // Should stay on discount step (error shown)
    await expect(page.getByText(/percentage must be between/i)).toBeVisible();
  });

  test("Back button returns to previous step", async ({ page }) => {
    await page.getByRole("button", { name: /add voucher/i }).click();
    // Fill discount step
    await page.getByText(/buy one, get one free/i).click();
    await page.getByRole("button", { name: /next/i }).click();
    // Now on details step
    await expect(page.getByText(/details & validity window/i)).toBeVisible();
    await page.getByRole("button", { name: /back/i }).click();
    // Back on discount step
    await expect(page.getByText(/discount type/i)).toBeVisible();
  });
});
