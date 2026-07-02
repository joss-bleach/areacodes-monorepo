import { createFileRoute, useParams, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import { useState } from "react";
import {
  Card,
  Badge,
  Skeleton,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@repo/ui";
import { BoundaryAlert } from "~/components/boundary-alert";

export const Route = createFileRoute("/_authenticated/b/$slug/pos")({
  component: PosSettingsPage,
});

const CONVEX_SITE_URL = import.meta.env.VITE_CONVEX_SITE_URL as string;

type SquareStatus = "connected" | "expired" | "revoked";
type DisplayState = "connected" | "needs_reauth" | "not_connected" | "coming_soon";

const UPCOMING_PROVIDERS = [
  {
    key: "shopify",
    name: "Shopify",
    logo: "/pos/shopify.svg",
    description:
      "Connect your Shopify store to track in-store and online redemptions together.",
  },
  {
    key: "epos-now",
    name: "Epos Now",
    logo: "/pos/epos.svg",
    description: "Sync sales and voucher redemptions from Epos Now.",
  },
  {
    key: "sumup",
    name: "SumUp",
    logo: "/pos/sum-up.svg",
    description:
      "Sync card transactions and reconcile voucher redemptions automatically.",
  },
  {
    key: "zettle",
    name: "Zettle",
    logo: "/pos/zettle.svg",
    description: "PayPal Zettle integration for in-person voucher redemption.",
  },
  {
    key: "lightspeed",
    name: "Lightspeed",
    logo: "/pos/lightspeed.svg",
    description: "Sync sales and voucher redemptions from Lightspeed.",
  },
] as const;

const STATUS_STYLES: Record<DisplayState, string> = {
  connected: "bg-success-bg text-success-foreground border-success-border",
  needs_reauth: "bg-warning-bg text-warning-foreground border-warning-border",
  not_connected: "bg-neutral-bg text-neutral-foreground border-transparent",
  coming_soon: "bg-info-bg text-info-foreground border-transparent",
};

const STATUS_LABELS: Record<DisplayState, string> = {
  connected: "Connected",
  needs_reauth: "Needs reauth",
  not_connected: "Not connected",
  coming_soon: "Coming soon",
};

function StatusBadge({ state }: { state: DisplayState }) {
  return (
    <Badge
      variant="outline"
      className={`${STATUS_STYLES[state]} px-2 py-0.5 text-xs font-bold uppercase tracking-tight`}
    >
      {STATUS_LABELS[state]}
    </Badge>
  );
}

function ProviderCard({
  logo,
  name,
  description,
  state,
  action,
  note,
}: {
  logo: string;
  name: string;
  description: string;
  state: DisplayState;
  action: React.ReactNode;
  note?: string;
}) {
  return (
    <Card className="p-5 gap-3 bg-muted">
      <div className="flex items-center justify-between">
        <img
          src={logo}
          alt={`${name} logo`}
          className="h-8 max-w-16 w-auto shrink-0"
        />
        <StatusBadge state={state} />
      </div>
      <span className="font-bold mt-1">{name}</span>
      <p className="text-sm text-muted-foreground grow">{description}</p>
      {note && <p className="text-sm text-warning-foreground">{note}</p>}
      {action}
    </Card>
  );
}

function PosSettingsPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const routerState = useRouterState();
  const searchParams = new URLSearchParams(routerState.location.searchStr);
  const squareConnect = searchParams.get("square_connect");
  const squareError = searchParams.get("square_error");
  const [filter, setFilter] = useState<"all" | "connected">("all");

  const business = useQuery(api.functions.businesses.getBusinessBySlug, {
    slug,
  });
  const businessId = business?._id as Id<"businesses"> | undefined;

  const connections = useQuery(
    api.functions.posConnections.getPosConnections,
    businessId ? { businessId } : "skip",
  );

  const disconnectSquare = useMutation(
    api.functions.posConnections.disconnectSquare,
  );

  if (business === null) {
    return <BoundaryAlert title="Error" description="Business not found." />;
  }

  const isLoading = business === undefined || connections === undefined;

  const squareConnection = connections?.find((c) => c.provider === "square");
  const squareStatus = squareConnection?.status as SquareStatus | undefined;
  const isSquareConnected = squareStatus === "connected";
  const squareNeedsReauth =
    squareStatus === "expired" || squareStatus === "revoked";
  const squareState: DisplayState = isSquareConnected
    ? "connected"
    : squareNeedsReauth
      ? "needs_reauth"
      : "not_connected";

  function buildSquareAuthUrl() {
    if (!businessId) return "#";
    const url = new URL(`${CONVEX_SITE_URL}/square/auth`);
    url.searchParams.set("businessId", businessId);
    url.searchParams.set("slug", slug);
    return url.toString();
  }

  async function handleDisconnect() {
    if (!businessId || !squareConnection) return;
    await disconnectSquare({
      businessId,
      connectionId: squareConnection._id,
    });
  }

  const showSquare = filter === "all" || isSquareConnected;
  const showUpcoming = filter === "all";

  return (
    <main className="py-6">
      <div className="container-app">
        <div className="mb-6">
          <span className="inline-block bg-foreground text-background px-2 py-1 text-2xl font-bold uppercase tracking-tight leading-none">
            POS Integrations
          </span>
          <p className="text-xs text-muted-foreground mt-2">
            Connect your point-of-sale system to sync sales and voucher
            redemptions automatically.
          </p>
        </div>

        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as "all" | "connected")}
          className="mb-6"
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="connected">Connected</TabsTrigger>
          </TabsList>
        </Tabs>

        {squareConnect === "success" && (
          <div className="mb-4 border border-success-border bg-success-bg px-4 py-3 text-sm text-success-foreground">
            Square connected successfully.
          </div>
        )}

        {squareError && (
          <div className="mb-4 border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {squareError === "connect_failed"
              ? "Square connection failed. Please try again."
              : "Square authorization was cancelled."}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {showSquare && (
              <ProviderCard
                logo="/pos/square.svg"
                name="Square"
                description="Sync sales, items and customer data directly from your Square POS."
                state={squareState}
                note={
                  squareNeedsReauth
                    ? "Your Square connection needs to be re-authorized before redemptions can be reconciled."
                    : undefined
                }
                action={
                  isSquareConnected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={handleDisconnect}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button size="sm" className="w-full" asChild>
                      <a href={buildSquareAuthUrl()}>
                        {squareNeedsReauth ? "Re-authorize" : "Connect"}
                      </a>
                    </Button>
                  )
                }
              />
            )}

            {showUpcoming &&
              UPCOMING_PROVIDERS.map((provider) => (
                <ProviderCard
                  key={provider.key}
                  logo={provider.logo}
                  name={provider.name}
                  description={provider.description}
                  state="coming_soon"
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled
                    >
                      Connect
                    </Button>
                  }
                />
              ))}

            {filter === "connected" && !isSquareConnected && (
              <div className="col-span-full border border-border p-12 text-center">
                <p className="text-sm text-muted-foreground">
                  No connected POS providers yet.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
