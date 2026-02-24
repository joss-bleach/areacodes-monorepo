import { createRootRouteWithContext } from "@tanstack/react-router";
import { Outlet, ScrollRestoration } from "@tanstack/react-router";
import { Meta, Scripts } from "@tanstack/start";
import { ClerkProvider, useAuth } from "@clerk/tanstack-start";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { Toaster } from "@repo/ui";
import appCss from "~/styles/globals.css?url";

const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL as string,
);

interface RouterContext {
  auth: {
    userId: string | null;
  };
}

export const Route = createRootRouteWithContext<RouterContext>()({
  meta: () => [
    { charSet: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
  ],
  links: () => [{ rel: "stylesheet", href: appCss }],
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
        <Meta />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
