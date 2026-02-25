"use client";

import { useEffect, useState } from "react";
import { Button } from "./button";
import {
  getCookieConsent,
  setCookieConsent,
  type CookieConsentStatus,
} from "../lib/cookie-consent";

interface CookieBannerProps {
  cookiesUrl?: string;
}

export function CookieBanner({
  cookiesUrl = "/cookies",
}: CookieBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getCookieConsent() === null) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const handleConsent = (status: "accepted" | "rejected") => {
    setCookieConsent(status);
    setVisible(false);
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] border-b border-white/20 bg-black px-4 py-3 shadow-lg"
      role="region"
      aria-label="Cookies on Areacodes"
      data-nosnippet
    >
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <h2 className="text-base font-semibold text-white">
              Cookies on Areacodes
            </h2>
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
            <Button
              size="sm"
              onClick={() => handleConsent("accepted")}
              className="bg-white text-black hover:bg-white/90"
            >
              Accept analytics cookies
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleConsent("rejected")}
              className="bg-transparent text-white border-white hover:bg-white/10"
            >
              Reject analytics cookies
            </Button>
            <a
              href={cookiesUrl}
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
