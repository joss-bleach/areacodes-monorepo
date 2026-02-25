import {
  createRootRoute,
  Outlet,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
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
          <Outlet />
          <Toaster />
          <CookieBanner cookiesUrl="https://www.acbrighton.com/cookies" cookieDomain=".acbrighton.com" />
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
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
