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
      { title: "Areacodes — Support Local. Spend Less." },
      {
        name: "description",
        content:
          "Discover independent businesses near you and grab exclusive vouchers. Support local, spend less.",
      },
      { name: "theme-color", content: "#000000" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Areacodes — Support Local. Spend Less." },
      {
        property: "og:description",
        content:
          "Discover independent businesses near you and grab exclusive vouchers. Support local, spend less.",
      },
      { property: "og:image", content: "/opengraph-image.png" },
      {
        property: "og:image:alt",
        content: "Areacodes — Support Local. Spend Less.",
      },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "Areacodes — Support Local. Spend Less.",
      },
      {
        name: "twitter:description",
        content:
          "Discover independent businesses near you and grab exclusive vouchers. Support local, spend less.",
      },
      { name: "twitter:image", content: "/opengraph-image.png" },
      {
        name: "twitter:image:alt",
        content: "Areacodes — Support Local. Spend Less.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
    ],
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
