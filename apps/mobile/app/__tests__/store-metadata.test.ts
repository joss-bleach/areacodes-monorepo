import { describe, it, expect } from "vitest";
import {
  APP_NAME,
  APP_SUBTITLE,
  SHORT_DESCRIPTION,
  FULL_DESCRIPTION,
  KEYWORDS,
  PRIVACY_POLICY_URL,
} from "../lib/store-metadata";

describe("App Store metadata", () => {
  it("app name is 'Areacodes'", () => {
    expect(APP_NAME).toBe("Areacodes");
  });

  it("app name is within App Store 30-character limit", () => {
    expect(APP_NAME.length).toBeLessThanOrEqual(30);
  });

  it("subtitle is within App Store 30-character limit", () => {
    expect(APP_SUBTITLE.length).toBeLessThanOrEqual(30);
  });

  it("short description is within Google Play 80-character limit", () => {
    expect(SHORT_DESCRIPTION.length).toBeLessThanOrEqual(80);
  });

  it("full description is non-empty", () => {
    expect(FULL_DESCRIPTION.trim().length).toBeGreaterThan(0);
  });

  it("full description is within App Store 4000-character limit", () => {
    expect(FULL_DESCRIPTION.length).toBeLessThanOrEqual(4000);
  });

  it("full description is within Google Play 4000-character limit", () => {
    expect(FULL_DESCRIPTION.length).toBeLessThanOrEqual(4000);
  });

  it("keywords are within App Store 100-character limit (comma-separated, no spaces)", () => {
    expect(KEYWORDS.length).toBeLessThanOrEqual(100);
  });

  it("keywords do not contain spaces (App Store requirement)", () => {
    expect(KEYWORDS).not.toMatch(/ /);
  });

  it("privacy policy URL is a valid https URL", () => {
    expect(PRIVACY_POLICY_URL).toMatch(/^https:\/\/.+/);
  });
});
