import {
  createRootRouteWithContext,
  Outlet,
  ScrollRestoration,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
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

// Client-side auth state kept in sync with Clerk.
// Written during render so it's available before the next navigation.
let _clientAuth: { userId: string | null } | undefined;

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: ({ context }) => {
    const auth =
      typeof window !== "undefined" && _clientAuth
        ? _clientAuth
        : context.auth;
    return { auth };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <ClerkProvider>
        <AuthGate>
          <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            <NuqsAdapter>
              <Outlet />
              <Toaster />
            </NuqsAdapter>
          </ConvexProviderWithClerk>
        </AuthGate>
      </ClerkProvider>
    </RootDocument>
  );
}

// Keeps the router context in sync with Clerk's client-side auth state so
// that beforeLoad guards stay current after client-side navigations (e.g.
// Clerk's post-sign-in redirect). Written during render so the value is
// available before the next router.navigate() call.
// Ref: https://tanstack.com/router/latest/docs/guide/authenticated-routes#authentication-using-react-contexthooks
function AuthGate({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  _clientAuth = { userId: userId ?? null };
  return <>{children}</>;
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
