"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@repo/ui";
import {
  getCookieConsent,
  setCookieConsent,
  type CookieConsentStatus,
} from "@/lib/cookie-consent";

type MessageState = "initial" | "confirmation";

export function CookieBanner() {
  const [mounted, setMounted] = useState(false);
  const [consentStatus, setConsentStatus] =
    useState<CookieConsentStatus>(null);
  const [messageState, setMessageState] = useState<MessageState>("initial");
  const confirmationRef = useRef<HTMLDivElement>(null);

  // Check localStorage on mount (client-side only)
  useEffect(() => {
    setMounted(true);
    const stored = getCookieConsent();
    if (stored !== null) {
      // If consent already exists, don't show banner at all
      setConsentStatus(stored);
      setMessageState("initial"); // Don't show confirmation on page load
    }
  }, []);

  // Don't render anything during SSR
  if (!mounted) {
    return null;
  }

  // If consent was given previously and user hasn't just made a choice, don't show banner
  if (consentStatus !== null && messageState !== "confirmation") {
    return null;
  }

  const handleAccept = () => {
    setCookieConsent("accepted");
    setConsentStatus("accepted");
    setMessageState("confirmation");
    // Move focus to confirmation message
    setTimeout(() => {
      confirmationRef.current?.focus();
    }, 100);
  };

  const handleReject = () => {
    setCookieConsent("rejected");
    setConsentStatus("rejected");
    setMessageState("confirmation");
    // Move focus to confirmation message
    setTimeout(() => {
      confirmationRef.current?.focus();
    }, 100);
  };

  const handleHide = () => {
    setMessageState("initial"); // Hide confirmation message
  };

  if (messageState === "confirmation") {
    return (
      <div
        className="fixed top-0 left-0 right-0 z-[9999] border-b border-white/20 bg-black px-4 py-3 shadow-lg"
        role="region"
        aria-label="Cookies on Areacodes"
        data-nosnippet
      >
        <div className="mx-auto w-full max-w-[1200px]">
          <div
            ref={confirmationRef}
            role="alert"
            tabIndex={-1}
            className="flex flex-col justify-between gap-3 md:flex-row md:items-center"
          >
            <p className="text-sm text-white">
              {consentStatus === "accepted"
                ? "You've accepted analytics cookies. You can change your cookie settings at any time."
                : "You've rejected analytics cookies. You can change your cookie settings at any time."}
            </p>
            <Button size="sm" variant="outline" onClick={handleHide} className="bg-white text-black border-white hover:bg-white/90">
              Hide cookie message
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] border-b border-white/20 bg-black px-4 py-3 shadow-lg"
      role="region"
      aria-label="Cookies on AreaCodes"
      data-nosnippet
    >
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <h2 className="text-base font-semibold text-white">Cookies on Areacodes</h2>
            <div className="flex flex-col gap-2">
              <p className="text-sm text-white">
                We use some essential cookies to make this service work.
              </p>
              <p className="text-sm text-white">
                We'd also like to use analytics cookies so we can understand how
                you use the service and make improvements.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleAccept} className="bg-white text-black hover:bg-white/90">
              Accept analytics cookies
            </Button>
            <Button size="sm" variant="outline" onClick={handleReject} className="bg-transparent text-white border-white hover:bg-white/10">
              Reject analytics cookies
            </Button>
            <a
              href="/cookies"
              className="inline-flex h-8 items-center justify-center px-3 text-sm font-medium text-white underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
            >
              View cookies
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
