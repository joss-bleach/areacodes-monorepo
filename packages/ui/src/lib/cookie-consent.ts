export type CookieConsentStatus = "accepted" | "rejected" | null;

const COOKIE_NAME = "areacodes-cookie-consent";

export function getCookieConsent(): CookieConsentStatus {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`)
  );
  const value = match?.[1];
  if (value === "accepted" || value === "rejected") return value;
  return null;
}

export function setCookieConsent(
  status: "accepted" | "rejected",
  cookieDomain?: string
): void {
  if (typeof document === "undefined") return;
  const maxAge = 365 * 24 * 60 * 60; // 1 year
  const isSecure = typeof location !== "undefined" && location.protocol === "https:";
  let cookie = `${COOKIE_NAME}=${status}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? "; Secure" : ""}`;
  if (cookieDomain && typeof location !== "undefined" && location.hostname.endsWith(cookieDomain.replace(/^\./, ""))) {
    cookie += `; domain=${cookieDomain}`;
  }
  document.cookie = cookie;
}
