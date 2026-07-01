import {
  createRootRoute,
  Outlet,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider, type AuthClient } from "@convex-dev/better-auth/react";
import { CookieBanner, Toaster } from "@repo/ui";
import { useState, useEffect } from "react";
import { authClient } from "~/lib/auth-client";
import appCss from "~/styles/globals.css?url";

const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL as string,
);

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Areacodes Admin" },
      {
        name: "description",
        content: "Admin dashboard for managing the Areacodes platform.",
      },
      { name: "theme-color", content: "#000000" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/areacodes-icon.svg" },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
    ],
  }),
  component: RootComponent,
});

function OttExchange({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(() => {
    if (typeof window === "undefined") return true;
    return !new URLSearchParams(window.location.search).has("ott");
  });

  useEffect(() => {
    if (ready) return;
    const ott = new URLSearchParams(window.location.search).get("ott");
    if (!ott) { setReady(true); return; }

    (authClient as any).crossDomain
      .verifyOneTimeToken({ token: ott })
      .finally(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete("ott");
        window.history.replaceState({}, "", url.toString());
        setReady(true);
      });
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}

function RootComponent() {
  return (
    <RootDocument>
      <OttExchange>
        <ConvexBetterAuthProvider client={convex} authClient={authClient as unknown as AuthClient}>
          <Outlet />
          <Toaster />
          <CookieBanner />
        </ConvexBetterAuthProvider>
      </OttExchange>
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
