import {
  createRootRoute,
  Outlet,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { CookieBanner, Toaster } from "@repo/ui";
import appCss from "~/styles/globals.css?url";

const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL as string,
);

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Areacodes for Business" },
      {
        name: "description",
        content:
          "Manage your business on Areacodes. Create vouchers, track redemptions, and connect with local customers.",
      },
      { name: "theme-color", content: "#000000" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Areacodes for Business" },
      {
        property: "og:description",
        content:
          "Manage your business on Areacodes. Create vouchers, track redemptions, and connect with local customers.",
      },
      { property: "og:image", content: "/opengraph-image.png" },
      {
        property: "og:image:alt",
        content: "Areacodes — Support Local. Spend Less.",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Areacodes for Business" },
      {
        name: "twitter:description",
        content:
          "Manage your business on Areacodes. Create vouchers, track redemptions, and connect with local customers.",
      },
      { name: "twitter:image", content: "/opengraph-image.png" },
      {
        name: "twitter:image:alt",
        content: "Areacodes — Support Local. Spend Less.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <ClerkProvider>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <NuqsAdapter>
            <Outlet />
            <Toaster />
            <CookieBanner cookiesUrl="https://www.acbrighton.com/cookies" />
          </NuqsAdapter>
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen antialiased bg-background text-foreground">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
