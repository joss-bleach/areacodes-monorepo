"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import { Button } from "./button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./card";
import {
  getCookieConsent,
  setCookieConsent,
} from "../lib/cookie-consent";

interface CookieConsentProps extends React.HTMLAttributes<HTMLDivElement> {
  demo?: boolean;
  onAcceptCallback?: () => void;
  onDeclineCallback?: () => void;
  learnMoreHref?: string;
}

const CookieConsent = React.forwardRef<HTMLDivElement, CookieConsentProps>(
  (
    {
      demo = false,
      onAcceptCallback = () => {},
      onDeclineCallback = () => {},
      className,
      learnMoreHref = "https://www.acbrighton.com/cookies",
      ...props
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [hide, setHide] = React.useState(false);

    const handleAccept = React.useCallback(() => {
      setIsOpen(false);
      setCookieConsent("accepted");
      setTimeout(() => setHide(true), 700);
      onAcceptCallback();
    }, [onAcceptCallback]);

    const handleDecline = React.useCallback(() => {
      setIsOpen(false);
      setCookieConsent("rejected");
      setTimeout(() => setHide(true), 700);
      onDeclineCallback();
    }, [onDeclineCallback]);

    React.useEffect(() => {
      try {
        if (getCookieConsent() === null || demo) {
          setIsOpen(true);
        } else {
          setHide(true);
        }
      } catch {
        // SSR or cookie read failure
      }
    }, [demo]);

    if (hide) return null;

    return (
      <div
        ref={ref}
        className={cn(
          "fixed z-[200] bottom-0 left-0 right-0 sm:left-4 sm:bottom-4 w-full sm:max-w-md transition-all duration-700",
          !isOpen
            ? "translate-y-full opacity-0"
            : "translate-y-0 opacity-100",
          className,
        )}
        {...props}
      >
        <Card className="m-3 shadow-lg border-white/20 bg-black text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">We use cookies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-white/70">
              We use cookies across areacodes to keep you signed in, remember
              your preferences, and understand how you use our services.
            </p>
            <p className="text-xs text-white/50">
              This applies to all Areacodes apps including our map, business
              dashboard, and admin tools.
            </p>
            <a
              href={learnMoreHref}
              className="text-xs text-white underline underline-offset-4 hover:no-underline"
            >
              Learn more
            </a>
          </CardContent>
          <CardFooter className="flex gap-2 pt-2">
            <Button
              onClick={handleDecline}
              variant="outline"
              className="flex-1 bg-transparent text-white border-white/30 hover:bg-white/10"
            >
              Decline
            </Button>
            <Button
              onClick={handleAccept}
              className="flex-1 bg-white text-black hover:bg-white/90"
            >
              Accept
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  },
);

CookieConsent.displayName = "CookieConsent";
export { CookieConsent, CookieConsent as CookieBanner };
