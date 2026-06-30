import { useParams } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@repo/ui";
import { Users, UserPlus, Repeat2, BarChart3 } from "lucide-react";
import { BoundaryAlert } from "~/components/boundary-alert";

const AnalyticsSectionLoading = () => (
  <section className="my-8">
    <Skeleton className="h-7 w-48 mb-4" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
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
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40 mb-2" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-32 w-full" />
      </CardContent>
    </Card>
  </section>
);

export const AnalyticsSection = () => {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const business = useQuery(api.functions.businesses.getBusinessBySlug, { slug });
  const businessId = business?._id as Id<"businesses"> | undefined;

  const totalRedemptions = useQuery(
    api.functions.pilotAnalytics.getTotalRedemptions,
    businessId ? { businessId } : "skip",
  );
  const newCustomerCount = useQuery(
    api.functions.pilotAnalytics.getNewCustomerCount,
    businessId ? { businessId } : "skip",
  );
  const returnCustomerCount = useQuery(
    api.functions.pilotAnalytics.getReturnCustomerCount,
    businessId ? { businessId } : "skip",
  );
  const voucherStats = useQuery(
    api.functions.pilotAnalytics.getVoucherStats,
    businessId ? { businessId } : "skip",
  );

  if (business === null) {
    return <BoundaryAlert title="Error" description="Error loading analytics." />;
  }

  const isLoading =
    business === undefined ||
    totalRedemptions === undefined ||
    newCustomerCount === undefined ||
    returnCustomerCount === undefined ||
    voucherStats === undefined;

  if (isLoading) {
    return <AnalyticsSectionLoading />;
  }

  const headlineStats = [
    {
      title: "Redeemed",
      icon: Users,
      value: totalRedemptions,
      description: "Total voucher redemptions",
    },
    {
      title: "New Customers",
      icon: UserPlus,
      value: newCustomerCount,
      description: "Customers acquired during the pilot",
    },
    {
      title: "Returned",
      icon: Repeat2,
      value: returnCustomerCount,
      description: "Customers who claimed more than once",
    },
  ];

  return (
    <section className="my-8">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <BarChart3 className="h-5 w-5" />
        Analytics
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {headlineStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold font-mono text-foreground">
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold leading-none">
            Voucher Performance
          </CardTitle>
          <CardDescription>
            Claims, reveals, and redemptions per voucher
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voucher</TableHead>
                <TableHead className="text-right">Claims</TableHead>
                <TableHead className="text-right">Reveals</TableHead>
                <TableHead className="text-right">Redemptions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {voucherStats.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No voucher activity yet.
                  </TableCell>
                </TableRow>
              ) : (
                voucherStats.map((stat) => (
                  <TableRow key={stat.voucherId}>
                    <TableCell className="text-sm font-medium">
                      {stat.title}
                    </TableCell>
                    <TableCell className="text-sm text-right text-muted-foreground">
                      {stat.claimCount}
                    </TableCell>
                    <TableCell className="text-sm text-right text-muted-foreground">
                      {stat.revealCount}
                    </TableCell>
                    <TableCell className="text-sm text-right text-muted-foreground">
                      {stat.redemptionCount}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
};
