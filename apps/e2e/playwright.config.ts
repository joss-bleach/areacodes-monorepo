import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const BUSINESS_URL = process.env.BUSINESS_URL ?? "http://localhost:3000";
const MAP_URL = process.env.MAP_URL ?? "http://localhost:3001";
const ADMIN_URL = process.env.ADMIN_URL ?? "http://localhost:3002";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "business-chromium",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: BUSINESS_URL,
      },
      testMatch: ["**/auth.spec.ts", "**/business-crud.spec.ts", "**/magic-link.spec.ts"],
    },
    {
      name: "map-chromium",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: MAP_URL,
      },
      testMatch: ["**/voucher-discovery.spec.ts"],
    },
    {
      name: "admin-chromium",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: ADMIN_URL,
      },
      testMatch: ["**/admin-add-business.spec.ts"],
    },
  ],
});
