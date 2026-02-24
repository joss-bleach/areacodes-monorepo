import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("unauthenticated user is redirected to sign-in from root", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("unauthenticated user is redirected to sign-in from create page", async ({
    page,
  }) => {
    await page.goto("/b/create");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("sign-in page renders Clerk sign-in component", async ({ page }) => {
    await page.goto("/sign-in");
    // Clerk renders an iframe or its own shadow DOM; wait for the sign-in form
    await expect(page.locator("[data-clerk-component]").or(
      page.locator("input[name='identifier'], input[type='email']")
    )).toBeVisible({ timeout: 10000 });
  });
});
