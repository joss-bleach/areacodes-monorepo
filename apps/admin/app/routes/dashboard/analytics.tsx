import { createFileRoute } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@repo/convex";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Skeleton,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/dashboard/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8">
        <h1 className="inline-block bg-foreground text-background px-2 py-1 text-2xl font-bold uppercase tracking-tight leading-none">Pilot Analytics</h1>
        <p className="text-muted-foreground mt-3">
          Week-by-week performance across all Pilot Businesses
        </p>
      </div>
      <div className="space-y-8">
        <CrossBusinessDiscovery />
        <RedemptionSourceSplit />
        <CoreFunnelTable />
        <BusinessLeaderboard />
      </div>
    </main>
  );
}

const SOURCE_COLORS = {
  square: "var(--color-chart-1)",
  manual: "var(--color-chart-2)",
} as const;

function RedemptionSourceSplit() {
  const { isAuthenticated } = useConvexAuth();
  const split = useQuery(
    api.functions.adminAnalytics.getRedemptionSourceSplit,
    isAuthenticated ? {} : "skip",
  );

  function renderBody() {
    if (split === undefined) return <Skeleton className="h-8 w-full" />;
    const total = split.square + split.manual;
    if (total === 0) {
      return (
        <p className="text-muted-foreground text-sm">
          No redemptions recorded yet.
        </p>
      );
    }

    const squarePct = (split.square / total) * 100;
    const manualPct = (split.manual / total) * 100;
    const segments = [
      { key: "square", label: "POS (Square)", count: split.square, pct: squarePct },
      { key: "manual", label: "Manual", count: split.manual, pct: manualPct },
    ] as const;

    return (
      <div>
        <div className="flex h-8 w-full gap-0.5" role="img" aria-label={`${squarePct.toFixed(0)}% POS, ${manualPct.toFixed(0)}% manual`}>
          {segments
            .filter((s) => s.count > 0)
            .map((s) => (
              <div
                key={s.key}
                className="flex items-center justify-center overflow-hidden text-xs font-medium text-background"
                style={{
                  width: `${s.pct}%`,
                  backgroundColor: SOURCE_COLORS[s.key],
                }}
              >
                {s.pct >= 12 ? `${s.pct.toFixed(0)}%` : null}
              </div>
            ))}
        </div>
        <div className="mt-3 flex gap-6">
          {segments.map((s) => (
            <div key={s.key} className="flex items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0"
                style={{ backgroundColor: SOURCE_COLORS[s.key] }}
              />
              <span className="text-muted-foreground">{s.label}</span>
              <span className="font-medium">{s.count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Redemption Source Split</CardTitle>
        <CardDescription>
          Share of redemptions completed via POS (Square) vs. approved manually,
          across all Pilot Businesses.
        </CardDescription>
      </CardHeader>
      <CardContent>{renderBody()}</CardContent>
    </Card>
  );
}

function CrossBusinessDiscovery() {
  const { isAuthenticated } = useConvexAuth();
  const count = useQuery(
    api.functions.adminAnalytics.getCrossBusinessDiscoveryCount,
    isAuthenticated ? {} : "skip",
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cross-Business Discovery</CardTitle>
        <CardDescription>
          Customers who have claimed from 2 or more distinct Pilot Businesses
        </CardDescription>
      </CardHeader>
      <CardContent>
        {count === undefined ? (
          <Skeleton className="h-10 w-24" />
        ) : (
          <p className="text-4xl font-bold">{count}</p>
        )}
      </CardContent>
    </Card>
  );
}

function CoreFunnelTable() {
  const { isAuthenticated } = useConvexAuth();
  const funnelRows = useQuery(
    api.functions.adminAnalytics.getWeeklyFunnel,
    isAuthenticated ? {} : "skip",
  );
  const posthogRows = useQuery(
    api.functions.adminAnalytics.getPosthogWeeklyViews,
    isAuthenticated ? {} : "skip",
  );

  const isLoading = funnelRows === undefined || posthogRows === undefined;

  // Merge weeks from both sources so a week with PostHog views but no Convex
  // activity (or vice versa) still gets its own row.
  const funnelByWeek = new Map((funnelRows ?? []).map((r) => [r.weekStart, r]));
  const posthogByWeek = new Map(
    (posthogRows ?? []).map((r) => [r.weekStart, r.viewCount]),
  );
  const weekStarts = [
    ...new Set([...funnelByWeek.keys(), ...posthogByWeek.keys()]),
  ].sort((a, b) => a - b);

  function renderBody() {
    if (isLoading) return <SkeletonRows rows={3} />;
    if (weekStarts.length === 0) {
      return <p className="text-muted-foreground text-sm">No activity recorded yet.</p>;
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Week of</TableHead>
            <TableHead className="text-right">Business Views</TableHead>
            <TableHead className="text-right">Claims</TableHead>
            <TableHead className="text-right">Reveals</TableHead>
            <TableHead className="text-right">Redemptions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {weekStarts.map((weekStart) => {
            const row = funnelByWeek.get(weekStart);
            return (
              <TableRow key={weekStart}>
                <TableCell className="font-medium">
                  {formatWeekStart(weekStart)}
                </TableCell>
                <TableCell className="text-right">
                  {posthogByWeek.get(weekStart) ?? "—"}
                </TableCell>
                <TableCell className="text-right">{row?.claimCount ?? 0}</TableCell>
                <TableCell className="text-right">{row?.revealCount ?? 0}</TableCell>
                <TableCell className="text-right">{row?.redemptionCount ?? 0}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Core Funnel</CardTitle>
        <CardDescription>
          Aggregate weekly totals across all Pilot Businesses. Business views sourced from PostHog cache.
        </CardDescription>
      </CardHeader>
      <CardContent>{renderBody()}</CardContent>
    </Card>
  );
}

function BusinessLeaderboard() {
  const { isAuthenticated } = useConvexAuth();
  const entries = useQuery(
    api.functions.adminAnalytics.getBusinessLeaderboard,
    isAuthenticated ? {} : "skip",
  );

  function renderBody() {
    if (entries === undefined) return <SkeletonRows rows={4} />;
    if (entries.length === 0) {
      return <p className="text-muted-foreground text-sm">No businesses found.</p>;
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Business</TableHead>
            <TableHead className="text-right">Claims</TableHead>
            <TableHead className="text-right">Reveals</TableHead>
            <TableHead className="text-right">Redemptions</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow
              key={entry.businessId}
              className={entry.hasZeroActivity ? "bg-destructive/5" : undefined}
            >
              <TableCell className="font-medium">
                <span className="flex items-center gap-2">
                  {entry.hasZeroActivity && (
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                  )}
                  {entry.businessName}
                </span>
              </TableCell>
              <TableCell className="text-right">{entry.claimCount}</TableCell>
              <TableCell className="text-right">{entry.revealCount}</TableCell>
              <TableCell className="text-right">{entry.redemptionCount}</TableCell>
              <TableCell className="text-right">
                {entry.hasZeroActivity ? (
                  <Badge variant="destructive">Zero activity</Badge>
                ) : (
                  <Badge variant="secondary">Active</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Leaderboard</CardTitle>
        <CardDescription>
          All Pilot Businesses ranked by total redemption count.
          Businesses with zero claims or no active vouchers are flagged.
        </CardDescription>
      </CardHeader>
      <CardContent>{renderBody()}</CardContent>
    </Card>
  );
}

function SkeletonRows({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}

function formatWeekStart(ts: number): string {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
