import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import { Skeleton } from "@repo/ui";
import { VoucherWizard } from "~/components/voucher-wizard/voucher-wizard";

export const Route = createFileRoute("/_authenticated/b/$slug/vouchers/new")({
  component: NewVoucherPage,
});

function NewVoucherPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };

  const business = useQuery(api.functions.businesses.getBusinessBySlug, { slug });
  const posConnections = useQuery(
    api.functions.posConnections.getPosConnections,
    business?._id ? { businessId: business._id as Id<"businesses"> } : "skip",
  );

  if (business === undefined || posConnections === undefined) {
    return (
      <main className="py-12">
        <div className="mx-auto flex w-full max-w-[980px] flex-col gap-8 px-4">
          <Skeleton className="h-9 w-52" />
          <Skeleton className="mx-auto h-6 w-full max-w-[720px]" />
          <Skeleton className="mx-auto h-48 w-full max-w-[720px]" />
        </div>
      </main>
    );
  }

  if (!business) {
    return (
      <main className="py-12">
        <div className="mx-auto w-full max-w-[980px] px-4 text-sm text-muted-foreground">
          Business not found.
        </div>
      </main>
    );
  }

  const hasSquareConnection = posConnections.some(
    (c) => c.provider === "square" && c.status === "connected",
  );

  return (
    <VoucherWizard
      businessId={business._id as Id<"businesses">}
      slug={slug}
      hasSquareConnection={hasSquareConnection}
    />
  );
}
