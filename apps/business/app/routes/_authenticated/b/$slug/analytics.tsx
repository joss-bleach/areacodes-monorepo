import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import {
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@repo/ui";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { BoundaryAlert } from "~/components/boundary-alert";

export const Route = createFileRoute("/_authenticated/b/$slug/analytics")({
  component: AnalyticsPage,
});

const CHART_COLORS = {
  claims: "#f9f9f9",
  reveals: "#a3a3a3",
  redemptions: "#2d2d2d",
} as const;

function VoucherBarChart({
  data,
}: {
  data: {
    voucherId: string;
    title: string;
    claimCount: number;
    revealCount: number;
    redemptionCount: number;
  }[];
}) {
  const chartData = data.map((d) => ({
    name:
      d.title.length > 18 ? `${d.title.slice(0, 17)}…` : d.title,
    Claims: d.claimCount,
    Reveals: d.revealCount,
    Redemptions: d.redemptionCount,
  }));

  return (
    <div className="border border-border mb-8">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 16, bottom: 8, left: -20 }}
          barGap={2}
          barCategoryGap="30%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#2d2d2d"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={{ fill: "#a3a3a3", fontSize: 10, fontFamily: "Poppins" }}
            tickLine={false}
            axisLine={false}
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
              padding: "8px 12px",
            }}
            labelStyle={{
              color: "#a3a3a3",
              fontSize: 11,
              fontFamily: "Poppins",
              marginBottom: 4,
            }}
            itemStyle={{
              color: "#f9f9f9",
              fontSize: 12,
              fontFamily: "Poppins",
            }}
            cursor={{ fill: "#f9f9f9", fillOpacity: 0.03 }}
          />
          <Legend
            wrapperStyle={{
              fontSize: 10,
              fontFamily: "Poppins",
              color: "#a3a3a3",
              paddingTop: 8,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          />
          <Bar
            dataKey="Claims"
            fill={CHART_COLORS.claims}
            fillOpacity={0.9}
            radius={0}
          />
          <Bar
            dataKey="Reveals"
            fill={CHART_COLORS.reveals}
            fillOpacity={0.9}
            radius={0}
          />
          <Bar
            dataKey="Redemptions"
            fill={CHART_COLORS.redemptions}
            stroke="#a3a3a3"
            strokeWidth={1}
            fillOpacity={1}
            radius={0}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatPanel({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="bg-surface-raised p-5">
      <p className="text-xs font-bold uppercase tracking-tight text-muted-foreground mb-3">
        {label}
      </p>
      <div className="text-4xl font-bold leading-none mb-1">{value}</div>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function AnalyticsContent({ businessId }: { businessId: Id<"businesses"> }) {
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
    totalRedemptions === undefined ||
    newCustomerCount === undefined ||
    returnCustomerCount === undefined ||
    voucherStats === undefined;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="w-full h-60" />
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
    );
  }

  const sorted = [...(voucherStats ?? [])].sort(
    (a, b) => b.claimCount - a.claimCount,
  );

  return (
    <>
      {sorted.length === 0 ? (
        <div className="border border-border p-12 text-center mb-8">
          <p className="text-sm text-muted-foreground">
            No voucher activity yet. Once customers start claiming your vouchers,
            performance data will appear here.
          </p>
        </div>
      ) : (
        <VoucherBarChart data={sorted} />
      )}

      <div className="grid grid-cols-3 gap-px bg-border border border-border mb-8">
        <StatPanel
          label="Redeemed"
          value={totalRedemptions ?? 0}
          sub="Total voucher redemptions"
        />
        <StatPanel
          label="New Customers"
          value={newCustomerCount ?? 0}
          sub="Acquired during pilot"
        />
        <StatPanel
          label="Returned"
          value={returnCustomerCount ?? 0}
          sub="Claimed more than once"
        />
      </div>

      <div>
        <span className="inline-block bg-foreground text-background px-2 py-1 text-sm font-bold uppercase tracking-tight leading-none mb-4">
          Voucher Performance
        </span>
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
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No voucher activity yet.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((stat) => (
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
      </div>
    </>
  );
}

function AnalyticsPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const business = useQuery(api.functions.businesses.getBusinessBySlug, {
    slug,
  });
  const businessId = business?._id as Id<"businesses"> | undefined;

  if (business === null) {
    return (
      <main className="py-6">
        <div className="container-app">
          <BoundaryAlert title="Error" description="Business not found." />
        </div>
      </main>
    );
  }

  return (
    <main className="py-6">
      <div className="container-app">
        <div className="mb-6">
          <span className="inline-block bg-foreground text-background px-2 py-1 text-2xl font-bold uppercase tracking-tight leading-none">
            Analytics
          </span>
          <p className="text-xs text-muted-foreground mt-2">
            Claims, reveals, and redemptions per voucher
          </p>
        </div>

        {businessId ? (
          <AnalyticsContent businessId={businessId} />
        ) : (
          <Skeleton className="w-full h-96" />
        )}
      </div>
    </main>
  );
}
