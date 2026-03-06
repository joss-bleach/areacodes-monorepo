export type CookieConsentStatus = "accepted" | "rejected" | null;

const COOKIE_NAME = "cookieConsent";

function getCookieDomain(): string | null {
  if (typeof location === "undefined") return null;
  const hostname = location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") return null;
  // Set on root domain so it works across all subdomains
  const parts = hostname.split(".");
  if (parts.length >= 2) {
    return `.${parts.slice(-2).join(".")}`;
  }
  return null;
}

export function getCookieConsent(): CookieConsentStatus {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`)
  );
  const value = match?.[1];
  if (value === "true" || value === "accepted") return "accepted";
  if (value === "rejected") return "rejected";
  return null;
}

export function setCookieConsent(status: "accepted" | "rejected"): void {
  if (typeof document === "undefined") return;
  const maxAge = 365 * 24 * 60 * 60; // 1 year
  const isSecure = typeof location !== "undefined" && location.protocol === "https:";
  const domain = getCookieDomain();
  const domainPart = domain ? `; domain=${domain}` : "";
  const value = status === "accepted" ? "true" : "rejected";
  document.cookie = `${COOKIE_NAME}=${value}; path=/${domainPart}; max-age=${maxAge}; SameSite=Lax${isSecure ? "; Secure" : ""}`;
}
