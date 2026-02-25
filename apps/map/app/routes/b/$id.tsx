import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import { VoucherNavbar } from "~/components/voucher-navbar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Skeleton,
} from "@repo/ui";
import { BoundaryAlert } from "~/components/boundary-alert";
import { TicketIcon, ClockIcon, GlobeIcon } from "lucide-react";
import type { Id } from "@repo/convex";

export const Route = createFileRoute("/b/$id")({
  component: BusinessProfile,
});

function BusinessProfile() {
  const { id } = Route.useParams();
  const business = useQuery(
    api.functions.explore.getBusinessByIdWithVouchers,
    { businessId: id as Id<"businesses"> }
  );

  if (business === undefined) {
    return (
      <div className="relative min-h-screen w-full">
        <VoucherNavbar />
        <main className="w-screen py-6 pt-20">
          <div className="w-[87.5%] md:w-[692px] lg:w-[980px] mx-auto mb-6">
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="mx-auto max-w-[480px] w-full px-4 min-w-0">
            <div className="flex items-start gap-4 mb-6">
              <Skeleton className="size-16 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-8" />
            <Skeleton className="h-5 w-32 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (business === null) {
    return (
      <div className="relative min-h-screen w-full">
        <VoucherNavbar />
        <main className="w-screen py-6 pt-20">
          <div className="mx-auto max-w-[480px] w-full px-4 min-w-0">
            <BoundaryAlert
              title="Business not found"
              description="The business you're looking for doesn't exist or has been removed."
            />
          </div>
        </main>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="relative min-h-screen w-full">
      <VoucherNavbar />
      <main id="main-content" className="w-screen py-6 pt-20">
        <div className="w-[87.5%] md:w-[692px] lg:w-[980px] mx-auto mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Explore</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{business.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="mx-auto max-w-[480px] w-full px-4 min-w-0">
          {/* Business header */}
          <div className="flex items-start gap-4 mb-6">
            {business.logoUrl ? (
              <img
                src={business.logoUrl}
                alt={business.name}
                width={64}
                height={64}
                className="size-16 shrink-0 object-cover border border-border"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="size-16 shrink-0 bg-muted border border-border flex items-center justify-center">
                <span className="text-xl font-semibold text-muted-foreground">
                  {business.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-foreground leading-tight">
                {business.name}
              </h1>
              {business.industry && (
                <p className="text-sm text-muted-foreground mt-1">
                  {business.industry.name}
                </p>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            {business.description}
          </p>

          {/* Meta */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-8">
            {business.websiteUrl && (
              <a
                href={business.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <GlobeIcon className="size-3" />
                <span>Website</span>
              </a>
            )}
            <span className="inline-flex items-center gap-1">
              <TicketIcon className="size-3" />
              <span>
                {business.vouchers.length} active{" "}
                {business.vouchers.length === 1 ? "voucher" : "vouchers"}
              </span>
            </span>
          </div>

          {/* Vouchers */}
          {business.vouchers.length > 0 ? (
            <div>
              <h2 className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4">
                Active vouchers
              </h2>
              <div className="space-y-3">
                {business.vouchers.map((voucher) => (
                  <Link
                    key={voucher._id}
                    to="/v/$id"
                    params={{ id: voucher._id }}
                    className="block bg-background border border-border p-4 hover:border-foreground/25 transition-colors group"
                  >
                    <p className="text-sm font-medium text-foreground group-hover:text-foreground/90">
                      {voucher.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {voucher.description}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-3">
                      <ClockIcon className="size-3" />
                      <span>
                        Until {formatDate(voucher.voucherValidTo)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No active vouchers right now.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
