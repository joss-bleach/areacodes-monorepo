import {
  createRootRoute,
  Outlet,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { CookieBanner } from "@repo/ui";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import appCss from "~/styles/globals.css?url";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Areacodes" },
      { name: "description", content: "Support local. Spend less." },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        <ConvexProvider client={convex}>
          <NuqsAdapter>{children}</NuqsAdapter>
          <CookieBanner cookiesUrl="https://www.acbrighton.com/cookies" cookieDomain=".acbrighton.com" />
        </ConvexProvider>
        <Scripts />
      </body>
    </html>
  );
}
