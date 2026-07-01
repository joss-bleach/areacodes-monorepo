import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "convex/react";
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
} from "@repo/ui";
import { CheckCircle, XCircle } from "lucide-react";
import { BusinessNavbar } from "~/components/business-navbar";
import { BoundaryAlert } from "~/components/boundary-alert";

export const Route = createFileRoute("/_authenticated/b/$slug/pos")({
  component: PosSettingsPage,
});

function PosSettingsPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const business = useQuery(api.functions.businesses.getBusinessBySlug, {
    slug,
  });
  const businessId = business?._id as Id<"businesses"> | undefined;

  const connections = useQuery(
    api.functions.posConnections.getPosConnections,
    businessId ? { businessId } : "skip",
  );

  if (business === null) {
    return (
      <BoundaryAlert title="Error" description="Business not found." />
    );
  }

  const isLoading = business === undefined || connections === undefined;

  const isSquareConnected =
    connections?.some((c) => c.provider === "square" && c.status === "connected") ?? false;

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
                        {isSquareConnected ? (
                          <Badge
                            variant="default"
                            className="bg-green-100 text-green-800 border-green-200"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Connected
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="h-3 w-3 mr-1" />
                            Not connected
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Connect your Square account to sync redemptions via OAuth.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Square OAuth connection coming soon.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
