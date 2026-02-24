import { useParams } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@repo/ui";
import { ClockIcon, Ticket } from "lucide-react";
import { BoundaryAlert } from "~/components/boundary-alert";

export const StatsSection = () => {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const business = useQuery(api.functions.businesses.getBusinessBySlug, { slug });

  const businessId = business?._id as Id<"businesses"> | undefined;

  const activeVouchers = useQuery(
    api.functions.vouchers.getActiveVouchersByBusiness,
    businessId ? { businessId } : "skip"
  );

  const expiringVouchers = useQuery(
    api.functions.vouchers.getExpiringVouchersByBusiness,
    businessId ? { businessId } : "skip"
  );

  if (business === null) {
    return (
      <BoundaryAlert title="Error" description="Error loading voucher statistics." />
    );
  }

  const isLoading =
    business === undefined ||
    activeVouchers === undefined ||
    expiringVouchers === undefined;

  if (isLoading) {
    return <StatsSectionLoading />;
  }

  const cards = [
    {
      title: "Active Vouchers",
      icon: Ticket,
      value: activeVouchers?.length ?? 0,
      description: "Currently available for use",
    },
    {
      title: "Expiring Soon",
      icon: ClockIcon,
      value: expiringVouchers?.length ?? 0,
      description: "Within 30 days",
    },
  ];

  return (
    <section className="my-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold font-mono text-foreground">
                  {card.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
};

const StatsSectionLoading = () => {
  return (
    <section className="my-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-16 mb-1" />
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};
