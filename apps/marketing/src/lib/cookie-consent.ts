export type CookieConsentStatus = "accepted" | "rejected" | null;

const STORAGE_KEY = "areacodes-cookie-consent";

/**
 * Get the current cookie consent status from localStorage
 * Returns null if no consent has been given
 */
export function getCookieConsent(): CookieConsentStatus {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "accepted" || stored === "rejected") {
      return stored;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Set the cookie consent status in localStorage
 */
export function setCookieConsent(status: "accepted" | "rejected"): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, status);
  } catch {
    // Silently fail if localStorage is not available
  }
}

