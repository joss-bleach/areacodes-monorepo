import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Meta, Scripts } from "@tanstack/start";
import type { ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import "~/styles/globals.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

export const Route = createRootRoute({
  meta: () => [
    { charSet: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { title: "Areacodes" },
    { name: "description", content: "Support local. Spend less." },
  ],
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
        <Meta />
      </head>
      <body>
        <ConvexProvider client={convex}>
          <NuqsAdapter>{children}</NuqsAdapter>
        </ConvexProvider>
        <Scripts />
      </body>
    </html>
  );
}
