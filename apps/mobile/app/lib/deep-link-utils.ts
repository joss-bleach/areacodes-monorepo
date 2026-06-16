export const DEEP_LINK_HOST = "map.acbrighton.com";

export function buildVoucherDeepLinkUrl(voucherId: string): string {
  return `https://${DEEP_LINK_HOST}/v/${voucherId}`;
}

export function parseVoucherDeepLink(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== DEEP_LINK_HOST) return null;
    const match = parsed.pathname.match(/^\/v\/([^/]+)$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}
