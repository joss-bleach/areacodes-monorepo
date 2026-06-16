import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from "@repo/ui";
import { Plug } from "lucide-react";
import { BusinessNavbar } from "~/components/business-navbar";
import { DashboardTop } from "~/sections/dashboard-top";
import { StatsSection } from "~/sections/stats-section";
import { VoucherTable } from "~/sections/voucher-table";
import { NewVoucherModal } from "~/components/new-voucher-modal";

export const Route = createFileRoute("/_authenticated/b/$slug/")({
  component: DashboardPage,
});

function PosStatusCard() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const business = useQuery(api.functions.businesses.getBusinessBySlug, { slug });
  const businessId = business?._id as Id<"businesses"> | undefined;
  const connections = useQuery(
    api.functions.posConnections.getPosConnections,
    businessId ? { businessId } : "skip",
  );

  const connectedProviders = connections?.map((c) => c.provider) ?? [];

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Plug className="h-4 w-4" />
          POS Integration
        </CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link to="/b/$slug/pos" params={{ slug }}>
            Manage
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {connectedProviders.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No POS provider connected. Connect Square or Zettle to track redemptions automatically.
          </p>
        ) : (
          <div className="flex items-center gap-2">
            {connectedProviders.includes("square") && (
              <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                Square connected
              </Badge>
            )}
            {connectedProviders.includes("zettle") && (
              <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                Zettle connected
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  return (
    <>
      <BusinessNavbar />
      <main className="w-screen py-6">
        <div className="container-app">
          <DashboardTop />
          <StatsSection />
          <PosStatusCard />
          <VoucherTable />
          <NewVoucherModal />
        </div>
      </main>
    </>
  );
}
