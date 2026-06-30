import { test, expect } from "@playwright/test";

test.describe("Magic Link sign-in", () => {
  test("shows email input and no password field on sign-in page", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await expect(page.locator("input[type='email']")).toBeVisible();
    await expect(page.locator("input[type='password']")).not.toBeVisible();
  });

  test("does not show sign-up link on sign-in page", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("link", { name: /sign up/i })).not.toBeVisible();
  });

  test("submitting email shows confirmation state", async ({ page }) => {
    await page.goto("/sign-in");
    await page.fill("input[type='email']", "pilot@example.com");
    await page.getByRole("button", { name: /send sign-in link/i }).click();
    await expect(
      page.getByText(/check your email/i)
    ).toBeVisible({ timeout: 10000 });
  });
});
