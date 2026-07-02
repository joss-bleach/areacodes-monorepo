import { createFileRoute, Link } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@repo/convex";
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@repo/ui";
import { Building2, Ticket, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndexPage,
});

function DashboardIndexPage() {
  return (
    <main className="px-6 py-8">
      <div className="mb-8">
        <h1 className="inline-block bg-foreground text-background px-2 py-1 text-2xl font-bold uppercase tracking-tight leading-none">Overview</h1>
        <p className="text-muted-foreground mt-3">
          Manage your Areacodes platform
        </p>
      </div>
      <DashboardStats />
    </main>
  );
}

function DashboardStats() {
  const { isAuthenticated } = useConvexAuth();
  const businesses = useQuery(api.functions.admin.getAllBusinesses, isAuthenticated ? {} : "skip");
  const vouchers = useQuery(api.functions.admin.getAllVouchers, isAuthenticated ? {} : "skip");
  const auditLog = useQuery(api.functions.admin.getAuditLog, isAuthenticated ? {} : "skip");

  const activeBusinesses =
    businesses?.filter((b) => b.deletedAt === undefined).length ?? 0;
  const activeVouchers =
    vouchers?.filter((v) => v.deletedAt === undefined).length ?? 0;
  const auditCount = auditLog?.length ?? 0;

  const isLoading =
    businesses === undefined ||
    vouchers === undefined ||
    auditLog === undefined;

  const stats = [
    {
      title: "Active Businesses",
      value: activeBusinesses,
      icon: Building2,
      description: "Registered businesses",
      href: "/dashboard/businesses",
    },
    {
      title: "Active Vouchers",
      value: activeVouchers,
      icon: Ticket,
      description: "Live voucher codes",
      href: "/dashboard/vouchers",
    },
    {
      title: "Admin Actions",
      value: auditCount,
      icon: ShieldAlert,
      description: "Total audit log entries",
      href: "/dashboard/audit-log",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="rounded-none border-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-9 w-16 mb-1" />
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Link key={stat.title} to={stat.href} className="block group">
            <Card className="rounded-none border-none transition-colors group-hover:bg-muted/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
