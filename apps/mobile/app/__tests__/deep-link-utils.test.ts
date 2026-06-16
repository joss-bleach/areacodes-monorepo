import { describe, it, expect } from "vitest";
import {
  DEEP_LINK_HOST,
  buildVoucherDeepLinkUrl,
  parseVoucherDeepLink,
} from "../lib/deep-link-utils";

describe("DEEP_LINK_HOST", () => {
  it("is the map domain", () => {
    expect(DEEP_LINK_HOST).toBe("map.acbrighton.com");
  });
});

describe("buildVoucherDeepLinkUrl", () => {
  it("builds a https URL with the host and voucher id", () => {
    expect(buildVoucherDeepLinkUrl("abc123")).toBe(
      "https://map.acbrighton.com/v/abc123",
    );
  });

  it("preserves the full opaque voucher id", () => {
    const id = "jh779j5x4xhxn61p34png2sf8988bz58";
    expect(buildVoucherDeepLinkUrl(id)).toBe(
      `https://map.acbrighton.com/v/${id}`,
    );
  });
});

describe("parseVoucherDeepLink", () => {
  it("returns the voucher id for a valid deep link URL", () => {
    expect(
      parseVoucherDeepLink("https://map.acbrighton.com/v/abc123"),
    ).toBe("abc123");
  });

  it("returns the voucher id for a full Convex id", () => {
    const id = "jh779j5x4xhxn61p34png2sf8988bz58";
    expect(
      parseVoucherDeepLink(`https://map.acbrighton.com/v/${id}`),
    ).toBe(id);
  });

  it("returns null for a URL with the wrong host", () => {
    expect(
      parseVoucherDeepLink("https://other.example.com/v/abc123"),
    ).toBeNull();
  });

  it("returns null for a URL without a voucher id segment", () => {
    expect(parseVoucherDeepLink("https://map.acbrighton.com/v/")).toBeNull();
  });

  it("returns null for a URL with a different path prefix", () => {
    expect(
      parseVoucherDeepLink("https://map.acbrighton.com/b/abc123"),
    ).toBeNull();
  });

  it("returns null for a malformed string", () => {
    expect(parseVoucherDeepLink("not-a-url")).toBeNull();
  });

  it("is the inverse of buildVoucherDeepLinkUrl", () => {
    const id = "abc123";
    expect(parseVoucherDeepLink(buildVoucherDeepLinkUrl(id))).toBe(id);
  });
});
