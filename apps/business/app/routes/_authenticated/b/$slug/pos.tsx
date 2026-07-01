import { createFileRoute, useParams, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import {
  Card,
  CardTitle,
  CardHeader,
  CardDescription,
  CardContent,
  Badge,
  Skeleton,
  Button,
} from "@repo/ui";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { BusinessNavbar } from "~/components/business-navbar";
import { BoundaryAlert } from "~/components/boundary-alert";

export const Route = createFileRoute("/_authenticated/b/$slug/pos")({
  component: PosSettingsPage,
});

const CONVEX_SITE_URL = import.meta.env.VITE_CONVEX_SITE_URL as string;

function PosSettingsPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const routerState = useRouterState();
  const searchString = routerState.location.search;
  const searchParams = new URLSearchParams(searchString);
  const squareConnect = searchParams.get("square_connect");
  const squareError = searchParams.get("square_error");

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
    return (
      <BoundaryAlert title="Error" description="Business not found." />
    );
  }

  const isLoading = business === undefined || connections === undefined;

  const squareConnection = connections?.find((c) => c.provider === "square");
  const isConnected = squareConnection?.status === "connected";
  const needsReauth =
    squareConnection?.status === "expired" ||
    squareConnection?.status === "revoked";

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

  return (
    <>
      <BusinessNavbar />
      <main className="w-screen py-6">
        <div className="container-app">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-foreground">
              POS Integration
            </h1>
            <p className="text-muted-foreground mt-1">
              Connect your point-of-sale system to automatically track voucher
              redemptions via Square OAuth.
            </p>
          </div>

          {squareConnect === "success" && (
            <div className="mb-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              Square connected successfully.
            </div>
          )}

          {squareError && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {squareError === "connect_failed"
                ? "Square connection failed. Please try again."
                : "Square authorization was cancelled."}
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-36 w-full" />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        Square
                        {isConnected ? (
                          <Badge
                            variant="default"
                            className="bg-green-100 text-green-800 border-green-200"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Connected
                          </Badge>
                        ) : needsReauth ? (
                          <Badge
                            variant="default"
                            className="bg-amber-100 text-amber-800 border-amber-200"
                          >
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {squareConnection?.status === "expired"
                              ? "Expired"
                              : "Disconnected"}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="h-3 w-3 mr-1" />
                            Not connected
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Connect your Square account to sync redemptions via
                        OAuth.
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {isConnected ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDisconnect}
                        >
                          Disconnect
                        </Button>
                      ) : (
                        <Button size="sm" asChild>
                          <a href={buildSquareAuthUrl()}>
                            {needsReauth ? "Re-authorize" : "Connect Square"}
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {needsReauth && (
                  <CardContent>
                    <p className="text-sm text-amber-700">
                      Your Square connection needs to be re-authorized before
                      redemptions can be reconciled.
                    </p>
                  </CardContent>
                )}
              </Card>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
