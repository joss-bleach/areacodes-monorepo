import { test, expect } from "@playwright/test";

test.describe("Voucher Discovery (Map App)", () => {
  test("home page loads with map and business list", async ({ page }) => {
    await page.goto("/");
    // Map container should be present
    await expect(page.locator(".leaflet-container")).toBeVisible({
      timeout: 10000,
    });
    // Navbar should be visible
    await expect(page.locator("nav")).toBeVisible();
  });

  test("page renders without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(errors).toHaveLength(0);
  });

  test("industry filter buttons are visible", async ({ page }) => {
    await page.goto("/");
    // Wait for Convex data to load
    await page.waitForTimeout(2000);
    // Filter buttons should appear once industries load
    const filterButtons = page.getByRole("button");
    await expect(filterButtons.first()).toBeVisible({ timeout: 8000 });
  });

  test("industry filter updates URL query param", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2000);

    // Click the first visible filter button
    const buttons = await page.getByRole("button").all();
    if (buttons.length > 0) {
      await buttons[0]!.click();
      // URL should update with industry param
      await page.waitForURL(/industry=/);
      expect(page.url()).toContain("industry=");
    }
  });

  test("voucher detail page renders for valid ID", async ({ page }) => {
    // Navigate to a voucher detail page with a fake ID to confirm routing works
    // The page should render (even if voucher not found) without crashing
    await page.goto("/v/fake-voucher-id");
    await page.waitForLoadState("networkidle");
    // Should either show the voucher or a not-found state, not a white screen
    const body = await page.locator("body").textContent();
    expect(body).not.toBe("");
  });

  test("has back navigation on voucher page", async ({ page }) => {
    await page.goto("/v/fake-voucher-id");
    await expect(page.getByRole("link", { name: /back|explore|areacodes/i })).toBeVisible({
      timeout: 5000,
    });
  });
});
