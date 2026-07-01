import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import { Skeleton } from "@repo/ui";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DashboardTop } from "~/sections/dashboard-top";
import { VoucherTable } from "~/sections/voucher-table";
import { NewVoucherModal } from "~/components/new-voucher-modal";
import { OnboardingWalkthrough } from "~/components/onboarding-walkthrough";

export const Route = createFileRoute("/_authenticated/b/$slug/")({
  component: DashboardPage,
});

function ActivityChart({ businessId }: { businessId: Id<"businesses"> }) {
  const data = useQuery(api.functions.pilotAnalytics.getRedemptionsByDay, {
    businessId,
  });

  if (data === undefined) {
    return <Skeleton className="w-full h-48" />;
  }

  const totalThisMonth = data.reduce((sum, d) => sum + d.count, 0);

  const tickIndices = new Set(
    data
      .map((_, i) => i)
      .filter((i) => i === 0 || i === 29 || i % 6 === 0),
  );

  return (
    <section className="mb-8">
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-3">
          <span className="inline-block bg-foreground text-background px-2 py-1 text-sm font-bold uppercase tracking-tight leading-none">
            Activity
          </span>
          <span className="text-xs text-muted-foreground">
            Voucher reveals · last 30 days
          </span>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold">{totalThisMonth}</span>
          <span className="text-xs text-muted-foreground ml-1">this month</span>
        </div>
      </div>

      <div className="border border-border">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart
            data={data}
            margin={{ top: 16, right: 16, bottom: 0, left: -20 }}
          >
            <defs>
              <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f9f9f9" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#f9f9f9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#2d2d2d"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "#a3a3a3", fontSize: 10, fontFamily: "Poppins" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              tickFormatter={(val, i) => (tickIndices.has(i) ? val : "")}
            />
            <YAxis
              tick={{ fill: "#a3a3a3", fontSize: 10, fontFamily: "Poppins" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "#111111",
                border: "1px solid #2d2d2d",
                borderRadius: 0,
                padding: "6px 10px",
              }}
              labelStyle={{
                color: "#a3a3a3",
                fontSize: 11,
                fontFamily: "Poppins",
              }}
              itemStyle={{
                color: "#f9f9f9",
                fontSize: 12,
                fontFamily: "Poppins",
                fontWeight: 700,
              }}
              formatter={(val) => [val, "reveals"]}
              cursor={{ stroke: "#2d2d2d", strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#f9f9f9"
              strokeWidth={1.5}
              fill="url(#activityFill)"
              dot={false}
              activeDot={{ r: 3, fill: "#f9f9f9", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function QuickInsights({ businessId }: { businessId: Id<"businesses"> }) {
  const activeVouchers = useQuery(
    api.functions.vouchers.getActiveVouchersByBusiness,
    { businessId },
  );
  const expiringVouchers = useQuery(
    api.functions.vouchers.getExpiringVouchersByBusiness,
    { businessId },
  );
  const totalRedemptions = useQuery(
    api.functions.pilotAnalytics.getTotalRedemptions,
    { businessId },
  );
  const newCustomerCount = useQuery(
    api.functions.pilotAnalytics.getNewCustomerCount,
    { businessId },
  );
  const returnCustomerCount = useQuery(
    api.functions.pilotAnalytics.getReturnCustomerCount,
    { businessId },
  );
  const voucherStats = useQuery(api.functions.pilotAnalytics.getVoucherStats, {
    businessId,
  });

  const isLoading =
    activeVouchers === undefined ||
    expiringVouchers === undefined ||
    totalRedemptions === undefined ||
    newCustomerCount === undefined ||
    returnCustomerCount === undefined ||
    voucherStats === undefined;

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-px bg-border mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface-raised p-5">
            <Skeleton className="h-3 w-20 mb-4" />
            <Skeleton className="h-9 w-12 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    );
  }

  const topVoucher = voucherStats?.[0] ?? null;
  const expiringCount = expiringVouchers?.length ?? 0;

  return (
    <div className="grid grid-cols-3 gap-px bg-border mb-8 border border-border">
      {/* Vouchers */}
      <div className="bg-surface-raised p-5">
        <p className="text-xs font-bold uppercase tracking-tight text-muted-foreground mb-3">
          Vouchers
        </p>
        <div className="text-4xl font-bold leading-none mb-1">
          {activeVouchers?.length ?? 0}
        </div>
        <p className="text-xs text-muted-foreground mb-3">active</p>
        {expiringCount > 0 && (
          <span className="inline-flex items-center border border-border px-2 py-0.5 text-xs font-bold uppercase tracking-tight text-muted-foreground leading-none">
            {expiringCount} expiring soon
          </span>
        )}
      </div>

      {/* Customers */}
      <div className="bg-surface-raised p-5">
        <p className="text-xs font-bold uppercase tracking-tight text-muted-foreground mb-3">
          Customers
        </p>
        <div className="text-4xl font-bold leading-none mb-1">
          {totalRedemptions ?? 0}
        </div>
        <p className="text-xs text-muted-foreground mb-3">total redemptions</p>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>
            <span className="font-bold text-foreground">
              {newCustomerCount ?? 0}
            </span>{" "}
            new
          </span>
          <span>
            <span className="font-bold text-foreground">
              {returnCustomerCount ?? 0}
            </span>{" "}
            returned
          </span>
        </div>
      </div>

      {/* Top Voucher */}
      <div className="bg-surface-raised p-5">
        <p className="text-xs font-bold uppercase tracking-tight text-muted-foreground mb-3">
          Top Voucher
        </p>
        {topVoucher ? (
          <>
            <p className="text-sm font-bold truncate mb-2 leading-tight">
              {topVoucher.title}
            </p>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>
                <span className="font-bold text-foreground">
                  {topVoucher.claimCount}
                </span>{" "}
                claims
              </span>
              <span>
                <span className="font-bold text-foreground">
                  {topVoucher.revealCount}
                </span>{" "}
                reveals
              </span>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">No voucher activity yet</p>
        )}
      </div>
    </div>
  );
}

function DashboardContent({ businessId }: { businessId: Id<"businesses"> }) {
  return (
    <>
      <ActivityChart businessId={businessId} />
      <QuickInsights businessId={businessId} />
      <VoucherTable />
      <NewVoucherModal />
    </>
  );
}

function DashboardPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const business = useQuery(api.functions.businesses.getBusinessBySlug, {
    slug,
  });
  const businessId = business?._id as Id<"businesses"> | undefined;

  return (
    <main className="py-6">
      <div className="container-app">
        <DashboardTop />
        <OnboardingWalkthrough />
        {businessId ? (
          <DashboardContent businessId={businessId} />
        ) : (
          <div className="space-y-8">
            <Skeleton className="w-full h-56" />
            <div className="grid grid-cols-3 gap-px bg-border border border-border">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-surface-raised p-5">
                  <Skeleton className="h-3 w-20 mb-4" />
                  <Skeleton className="h-9 w-12 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
